//main.ts

import { app, BrowserWindow, desktopCapturer, ipcMain } from "electron";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { screen } from "electron";

import { saveScreenshot } from "./fileOperation.js"; // CommonJS require
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let mainWindow: BrowserWindow | null;
const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
			sandbox: false
		}
	});

	mainWindow.loadFile(path.join(app.getAppPath(), "dist-react", "index.html"));

	mainWindow.on("closed", () => (mainWindow = null));
};

app.on("ready", createWindow);
// --------------------
// SCREEN CAPTURE
// --------------------

ipcMain.handle("SCREENSHOT", async () => {
	const sources = await desktopCapturer.getSources({
		types: ["screen"],
		thumbnailSize: { width: 1920, height: 1080 }
	});

	const screen = sources[0];

	return screen.thumbnail.toDataURL();
});

// --------------------
// SAVE SCREENSHOT
// --------------------
ipcMain.handle("save-screenshot", async (_, dataURL: string) => {
	saveScreenshot(dataURL);
});
let overlayWindow: BrowserWindow | null = null;

function createOverlay() {
	const { width, height } = screen.getPrimaryDisplay().bounds;

	overlayWindow = new BrowserWindow({
		x: 0,
		y: 0,
		width,
		height,
		transparent: true,
		frame: true,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		focusable: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: true
		}
	});

	overlayWindow.loadFile(
		path.join(app.getAppPath(), "dist-react", "index.html"),
		{ hash: "/overlay" } // ensures correct route
	);

	overlayWindow.once("ready-to-show", () => {
		overlayWindow!.show();
		overlayWindow!.focus();
		overlayWindow!.setIgnoreMouseEvents(false);
		overlayWindow!.webContents.openDevTools({ mode: "detach" });

		// Debug: check if preload ran
		overlayWindow!.webContents.executeJavaScript(
			"console.log('Overlay window electron:', window.electron)"
		);
	});
}
// main.ts
ipcMain.handle("OPEN_OVERLAY", () => {
	createOverlay();
});

ipcMain.handle("CLOSE_OVERLAY", () => {
	overlayWindow?.close();
	overlayWindow = null;
});
