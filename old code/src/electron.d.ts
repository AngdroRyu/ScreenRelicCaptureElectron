// src/electron.d.ts
export interface Relic {
	set: string;
	piece: string;
	slot: string;
	mainStat: string | null;
	mainValue: string | null;
	substats: { name: string; value: string }[];
	imagePath: string;
}

export interface MainApi {
	requestOverlay: () => void;
	onNewCapture: (cb: (imgPath: string) => void) => void;
	onOCRResult: (cb: (text: string) => void) => void;
	onRelicParsed: (
		cb: (relic: Relic & { imagePath?: string; imageDataUrl?: string }) => void
	) => void;
	sendOCR: (dataUrl: string) => void;
	openRelicsWindow: () => void;
}

// Merge into the Window global
declare global {
	interface Window {
		mainApi: MainApi;
	}
}
