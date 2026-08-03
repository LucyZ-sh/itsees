const isEnglish = new URLSearchParams(window.location.search).get("locale") === "en";

if (isEnglish) {
  document.documentElement.lang = "en";
  document.title = "Itsees is setting out";
  const splashArt = document.querySelector("#splash-art");
  splashArt.src = "./assets/brand/splash-pawprints-final-en.gif?v=20260804-1";
  splashArt.alt = "Itsees pawprints heading into the distance, preparing your journey";
}
