import { contextBridge, ipcRenderer } from "electron";
import type { Rect } from "./main.js";
import type { IpcRendererEvent } from "electron";
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
		};
	}
}

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
	}
});
