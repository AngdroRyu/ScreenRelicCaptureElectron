/* eslint-disable @typescript-eslint/no-explicit-any */
export {};
declare global {
	interface Window {
		electronAPI: {
			captureScreen: () => Promise<string | null>;
			saveScreenshot: (file: any) => Promise<void>;
			openOverlay: () => Promise<void>;
		};
	}
}
