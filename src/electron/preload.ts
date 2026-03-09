// preload.ts
import { contextBridge, ipcRenderer } from "electron";

// Expose APIs to renderer
contextBridge.exposeInMainWorld("electron", {
	captureScreen: (): Promise<string> => ipcRenderer.invoke("SCREENSHOT"),
	saveScreenshot: (data: string): Promise<void> =>
		ipcRenderer.invoke("save-screenshot", data),
	openOverlay: (): Promise<void> => ipcRenderer.invoke("OPEN_OVERLAY"),
	closeOverlay: (): Promise<void> => ipcRenderer.invoke("CLOSE_OVERLAY")
});

// TypeScript types for renderer
declare global {
	interface Window {
		electron: {
			captureScreen: () => Promise<string>;
			saveScreenshot: (data: string) => Promise<void>;
			openOverlay: () => Promise<void>;
			closeOverlay: () => Promise<void>;
		};
	}
}
