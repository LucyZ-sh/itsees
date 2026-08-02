export const MAP_CHAPTERS = Object.freeze([
  Object.freeze({
    id: "phase1",
    phase: 1,
    label: "第一期",
    title: "远方路线",
    description: "15 条主题旅行路线",
    route: "#/map/phase1",
    featurePackId: "phase1-backpack",
    status: "current"
  }),
  Object.freeze({
    id: "phase2",
    phase: 2,
    label: "第二期",
    title: "真实世界",
    description: "15 个真实景点",
    route: "#/map/phase2",
    featurePackId: "phase2-atlas",
    status: "current"
  })
]);

export function listCurrentMapChapters() {
  return MAP_CHAPTERS.filter(chapter => chapter.status === "current");
}

export function getMapChapter(phase) {
  return MAP_CHAPTERS.find(chapter => chapter.phase === Number(phase)) ?? MAP_CHAPTERS[0];
}
