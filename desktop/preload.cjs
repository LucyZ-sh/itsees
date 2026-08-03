const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  getTravelState: () => ipcRenderer.invoke("desktop:get-travel-state"),
  saveTravelState: state => ipcRenderer.invoke("desktop:save-travel-state", state),
  applyTravelAction: action => ipcRenderer.invoke("desktop:apply-travel-action", action),
  openPrivacy: () => ipcRenderer.invoke("desktop:open-privacy"),
  toggleWindow: () => ipcRenderer.invoke("desktop:toggle-window"),
  restoreWindow: () => ipcRenderer.invoke("desktop:restore-window"),
  movePetWindowBy: (deltaX, deltaY) => ipcRenderer.send("desktop:move-pet-window-by", { deltaX, deltaY }),
  finishPetWindowDrag: () => ipcRenderer.send("desktop:finish-pet-window-drag"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("desktop:toggle-always-on-top"),
  setPaused: paused => ipcRenderer.invoke("desktop:set-paused", paused),
  fetchLiveWeatherJson: url => ipcRenderer.invoke("desktop:fetch-live-weather-json", url),
  ensureMusicPack: (destinationId, preferredWeatherId) => ipcRenderer.invoke("desktop:ensure-music-pack", destinationId, preferredWeatherId),
  getMusicCacheStatus: () => ipcRenderer.invoke("desktop:get-music-cache-status"),
  clearMusicCache: () => ipcRenderer.invoke("desktop:clear-music-cache"),
  setLocale: locale => ipcRenderer.invoke("desktop:set-locale", locale),
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("desktop:state", listener);
    return () => ipcRenderer.removeListener("desktop:state", listener);
  },
  onSetPaused: callback => {
    const listener = (_event, paused) => callback(paused);
    ipcRenderer.on("desktop:set-paused", listener);
    return () => ipcRenderer.removeListener("desktop:set-paused", listener);
  },
  onTravelState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("desktop:travel-state", listener);
    return () => ipcRenderer.removeListener("desktop:travel-state", listener);
  },
  onMusicPackStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("desktop:music-pack-status", listener);
    return () => ipcRenderer.removeListener("desktop:music-pack-status", listener);
  }
});
