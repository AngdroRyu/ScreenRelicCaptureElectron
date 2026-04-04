export {};
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
			openSavedRelics: () => Promise<void>; // opens the window
			getSavedRelics: () => Promise<Relic[]>;
			removeSavedRelic: (index: number) => Promise<boolean>;
			sendRelicsFile: () => Promise<string>;
		};
	}
}
