import { contextBridge, ipcRenderer } from "electron";
import type { Rect } from "./main.js";
import type { IpcRendererEvent } from "electron";
import type { Relic } from "./relicParser.js";
declare global {
	interface Window {
		electron: {
			captureScreen: () => Promise<string>;
			saveScreenshot: (data: string) => Promise<void>;
			openOverlay: () => Promise<void>;
			closeOverlay: () => Promise<void>;
			getLastRect: () => Promise<Rect | null>;
			setLastRect: (rect: Rect) => Promise<void>;
			on: (
				channel: "CROP_AND_SAVE",
				listener: (
					event: Electron.IpcRendererEvent,
					data: { image: string; rect: Rect }
				) => void
			) => void;
			removeListener: (
				channel: "CROP_AND_SAVE",
				listener: (
					event: Electron.IpcRendererEvent,
					data: { image: string; rect: Rect }
				) => void
			) => void;
			parseRelicText: (text: string) => Promise<Relic>;
			openSavedRelics: () => Promise<void>;
			getSavedRelics: () => Promise<Relic[]>;
			removeSavedRelic: (index: number) => Promise<boolean>;
			sendRelicsFile: () => Promise<string>;
			saveTrainingImage: (data: string, fileName: string) => Promise<string>;
			runOcr: (image: string) => Promise<string>;
		};
	}
}
console.log("Hello from preload");
contextBridge.exposeInMainWorld("electron", {
	captureScreen: () => ipcRenderer.invoke("SCREENSHOT"),
	saveScreenshot: (data: string) => ipcRenderer.invoke("save-screenshot", data),
	openOverlay: () => ipcRenderer.invoke("OPEN_OVERLAY"),
	closeOverlay: () => ipcRenderer.invoke("CLOSE_OVERLAY"),
	getLastRect: () => ipcRenderer.invoke("GET_LAST_RECT"),
	setLastRect: (rect: Rect) => ipcRenderer.invoke("SET_LAST_RECT", rect),
	on: (
		channel: "CROP_AND_SAVE",
		listener: (
			event: IpcRendererEvent,
			data: { image: string; rect: Rect }
		) => void
	) => {
		ipcRenderer.on(channel, listener);
	},
	removeListener: (
		channel: "CROP_AND_SAVE",
		listener: (
			event: IpcRendererEvent,
			data: { image: string; rect: Rect }
		) => void
	) => {
		ipcRenderer.removeListener(channel, listener);
	},
	parseRelicText: (text: string) =>
		ipcRenderer.invoke("PARSE_RELIC_TEXT", text),
	openSavedRelics: () => ipcRenderer.invoke("OPEN_SAVED_RELICS"),
	getSavedRelics: () => ipcRenderer.invoke("GET_SAVED_RELICS"),
	removeSavedRelic: (index: number) =>
		ipcRenderer.invoke("REMOVE_RELIC", index),
	sendRelicsFile: (): Promise<string> => ipcRenderer.invoke("sendRelicsFile"),
	saveTrainingImage: (data: string, fileName: string) =>
		ipcRenderer.invoke("SAVE_TRAINING_IMAGE", data, fileName),
	runOcr: (image: string) => ipcRenderer.invoke("RUN_OCR", image)
});
