import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("overlayApi", {
	selectRegion: (region: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) => ipcRenderer.send("region-selected", region),
	cancel: () => ipcRenderer.send("region-cancelled")
});
