export {};
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
					event: IpcRendererEvent,
					data: { image: string; rect: Rect }
				) => void
			) => void;
			removeListener: (
				channel: "CROP_AND_SAVE",
				listener: (
					event: IpcRendererEvent,
					data: { image: string; rect: Rect }
				) => void
			) => void;
		};
	}
}
