import assert from "node:assert/strict";

const port = Number(process.argv[2] ?? 9333);
const inspectOnly = process.argv[3] === "inspect";
const baseUrl = `http://127.0.0.1:${port}`;

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocket = new WebSocket(webSocketUrl);
    this.sequence = 0;
    this.pending = new Map();
    this.webSocket.onmessage = event => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }

  async connect() {
    if (this.webSocket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.webSocket.onopen = resolve;
      this.webSocket.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.webSocket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result.value;
  }

  close() {
    this.webSocket.close();
  }
}

async function listTargets() {
  const response = await fetch(`${baseUrl}/json/list`);
  if (!response.ok) throw new Error(`DevTools target list returned ${response.status}`);
  return response.json();
}

async function waitForTarget(predicate, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const target = (await listTargets()).find(predicate);
    if (target) return target;
    await wait(100);
  }
  throw new Error("Timed out waiting for Electron target");
}

async function connectTarget(target) {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Runtime.enable");
  return client;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function dragPagePet(client, deltaX, deltaY) {
  const rect = await client.evaluate(`(() => {
    const rect = document.querySelector("[data-pet]").getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const end = { x: start.x + deltaX, y: start.y + deltaY };
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...start, screenX: start.x, screenY: start.y, button: "left", buttons: 1, clickCount: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...end, screenX: end.x, screenY: end.y, button: "left", buttons: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...end, screenX: end.x, screenY: end.y, button: "left", buttons: 0, clickCount: 1 });
  await wait(150);
}

async function doubleClickPagePet(client) {
  const rect = await client.evaluate(`(() => {
    const rect = document.querySelector("[data-pet]").getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  for (const clickCount of [1, 2]) {
    await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", buttons: 1, clickCount });
    await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", buttons: 0, clickCount });
  }
}

async function clickAction(client, action) {
  const result = await client.evaluate(`(() => {
    const element = document.querySelector('[data-action="${action}"]');
    if (!element) {
      return {
        clicked: false,
        actions: Array.from(document.querySelectorAll('[data-action]')).map(item => item.dataset.action)
      };
    }
    element.click();
    return { clicked: true };
  })()`);
  if (!result.clicked) throw new Error(`Missing ${action}; available actions: ${result.actions.join(", ")}`);
}

async function waitForElement(client, selector, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await client.evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

const mainTarget = await waitForTarget(target => target.type === "page" && !target.url.includes("mode=pet"));
const main = await connectTarget(mainTarget);
await waitForElement(main, "[data-action]");

const onboardingState = await main.evaluate(`(() => {
  const settings = JSON.parse(localStorage.getItem("shimejis-random-travel-mvp-state-v1"))?.settings ?? {};
  return {
    hasChosenPet: settings.hasChosenPet === true,
    hasCompletedOnboarding: settings.hasCompletedOnboarding === true
  };
})()`);
if (!onboardingState.hasCompletedOnboarding) {
  if (!onboardingState.hasChosenPet) {
    await waitForElement(main, '[data-action="onboarding-choose-pet"]');
    await clickAction(main, "onboarding-choose-pet");
  }
  await waitForElement(main, '[data-action="onboarding-weather-disable"]');
  await clickAction(main, "onboarding-weather-disable");
}

const initial = await main.evaluate(`(async () => ({
  desktop: await window.desktopBridge.getState(),
  title: document.title,
  petText: document.querySelector("[data-pet]")?.innerText?.trim(),
  stateVersion: JSON.parse(localStorage.getItem("shimejis-random-travel-mvp-state-v1"))?.version,
  savedPosition: JSON.parse(localStorage.getItem("shimejis-random-travel-mvp-state-v1"))?.settings?.petPosition,
  petStyle: {
    left: document.querySelector("[data-pet]")?.style.left,
    top: document.querySelector("[data-pet]")?.style.top
  }
}))()`);

if (inspectOnly) {
  console.log(JSON.stringify({ initial }, null, 2));
  main.close();
  process.exit(0);
}

await clickAction(main, "toggle-settings-menu");
await waitForElement(main, '[data-action="toggle-hide"]');
await clickAction(main, "toggle-hide");
const hidden = await main.evaluate(`({
  hasPet: Boolean(document.querySelector("[data-pet]")),
  hasRestoreButton: Boolean(document.querySelector(".pet-restore"))
})`);
await clickAction(main, "toggle-hide");

const alwaysOnTopOff = await main.evaluate(`window.desktopBridge.toggleAlwaysOnTop().then(() => window.desktopBridge.getState())`);
const alwaysOnTopOn = await main.evaluate(`window.desktopBridge.toggleAlwaysOnTop().then(() => window.desktopBridge.getState())`);

await clickAction(main, "open-map-phase1");
await waitForElement(main, '[data-action="enter-theme"]');
await clickAction(main, "enter-theme");
await waitForElement(main, '[data-action="start"]');
await clickAction(main, "start");
await wait(2500);

await main.evaluate(`window.desktopBridge.toggleWindow()`);
const petTarget = await waitForTarget(target => target.type === "page" && target.url.includes("mode=pet"));
const pet = await connectTarget(petTarget);
await waitForElement(pet, "[data-pet]");
await wait(3000);
const compactWindowBeforeDrag = await pet.evaluate(`({ left: window.screenX, top: window.screenY })`);
await dragPagePet(pet, 96, 72);
const compactWindowAfterDrag = await pet.evaluate(`({ left: window.screenX, top: window.screenY })`);
const compactDrag = {
  before: compactWindowBeforeDrag,
  after: compactWindowAfterDrag,
  moved: compactWindowBeforeDrag.left !== compactWindowAfterDrag.left
    || compactWindowBeforeDrag.top !== compactWindowAfterDrag.top
};
const compactInitial = await pet.evaluate(`(async () => ({
  desktop: await window.desktopBridge.getState(),
  petText: document.querySelector("[data-pet]")?.innerText?.trim(),
  dragRegion: getComputedStyle(document.querySelector("[data-pet]")).webkitAppRegion,
  restoreButtonAbsent: !document.querySelector(".pet-mode-restore"),
  restoreHint: document.querySelector("[data-pet]")?.getAttribute("title"),
  animatedImageSrc: document.querySelector(".desk-pet-image")?.getAttribute("src")
}))()`);
await pet.evaluate(`window.__qaAnimatedPetImage = document.querySelector(".desk-pet-image")`);
await wait(2200);
const compactAfterTicks = await pet.evaluate(`({
  imageNodePreserved: window.__qaAnimatedPetImage === document.querySelector(".desk-pet-image"),
  animatedImageSrc: document.querySelector(".desk-pet-image")?.getAttribute("src")
})`);
const compact = {
  ...compactInitial,
  imageNodePreservedOverTwoTicks: compactAfterTicks.imageNodePreserved,
  animatedImageSrcAfterTwoTicks: compactAfterTicks.animatedImageSrc
};

await doubleClickPagePet(pet);
await wait(200);
const restored = await main.evaluate(`(async () => ({
  desktop: await window.desktopBridge.getState(),
  petPosition: JSON.parse(localStorage.getItem("shimejis-random-travel-mvp-state-v1")).settings.petPosition,
  petStyle: {
    left: document.querySelector("[data-pet]")?.style.left,
    top: document.querySelector("[data-pet]")?.style.top
  }
}))()`);

assert.equal(initial.desktop.isDesktop, true);
assert.equal(initial.desktop.isTrayReady, true);
assert.equal(initial.desktop.windowMode, "full");
assert.equal(initial.title, "Itsees");
assert.deepEqual(hidden, { hasPet: false, hasRestoreButton: true });
assert.equal(alwaysOnTopOff.isAlwaysOnTop, false);
assert.equal(alwaysOnTopOn.isAlwaysOnTop, true);
assert.equal(compact.desktop.windowMode, "pet");
assert.equal(compact.desktop.isPetVisible, true);
assert.equal(compact.restoreButtonAbsent, true);
assert.equal(compact.restoreHint, "双击打开完整窗口");
assert.equal(compactDrag.moved, true);
assert.equal(compact.imageNodePreservedOverTwoTicks, true);
assert.equal(restored.desktop.windowMode, "full");
assert.equal(restored.desktop.isWindowVisible, true);

console.log(JSON.stringify({ initial, hidden, alwaysOnTopOff, alwaysOnTopOn, compactDrag, compact, restored }, null, 2));

pet.close();
main.close();
