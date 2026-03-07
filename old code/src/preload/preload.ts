// src/preload/preload.ts
import { contextBridge, ipcRenderer } from "electron";
import type { MainApi, Relic } from "../electron"; // points to the d.ts

const mainApi: MainApi = {
	requestOverlay: () => ipcRenderer.send("show-overlay"),
	onNewCapture: (cb) =>
		ipcRenderer.on("new-capture", (_e, path: string) => cb(path)),
	onOCRResult: (cb) =>
		ipcRenderer.on("ocr-result", (_e, text: string) => cb(text)),
	onRelicParsed: (cb) =>
		ipcRenderer.on(
			"relic-parsed",
			(_e, relic: Relic & { imagePath?: string; imageDataUrl?: string }) =>
				cb(relic)
		),
	sendOCR: (dataUrl) => ipcRenderer.send("ocr-image", dataUrl),
	openRelicsWindow: () => ipcRenderer.send("open-relics-window")
};

contextBridge.exposeInMainWorld("mainApi", mainApi);
