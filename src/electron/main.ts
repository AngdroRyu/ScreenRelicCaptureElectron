// main.ts
import {
	app,
	BrowserWindow,
	desktopCapturer,
	ipcMain,
	screen,
	globalShortcut
} from "electron";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { parseRelicFromText } from "./relicParser.js";
import { saveParsedRelic } from "./saveRelic.js";
import type { Relic } from "./relicParser.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null;
let overlayWindow: BrowserWindow | null;

// --------------------
// RECT MEMORY
// --------------------
export interface Rect {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

let lastRect: Rect | null = null;
const lastRectPath = path.join(app.getPath("userData"), "lastRect.json");

function loadLastRect(): Rect | null {
	if (fs.existsSync(lastRectPath)) {
		try {
			return JSON.parse(fs.readFileSync(lastRectPath, "utf-8"));
		} catch {
			return null;
		}
	}
	return null;
}

function saveLastRect(rect: Rect) {
	lastRect = rect;
	fs.writeFileSync(lastRectPath, JSON.stringify(rect));
}

// --------------------
// MAIN WINDOW
// --------------------
const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
			sandbox: false
		}
	});

	mainWindow.loadFile(path.join(app.getAppPath(), "dist-react", "index.html"));
	mainWindow.on("closed", () => (mainWindow = null));
};

// --------------------
// OVERLAY WINDOW
// --------------------
function createOverlay() {
	if (overlayWindow) {
		overlayWindow.focus();
		return;
	}
	const { width, height } = screen.getPrimaryDisplay().bounds;

	overlayWindow = new BrowserWindow({
		x: 0,
		y: 0,
		width,
		height,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		focusable: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});

	overlayWindow.loadFile(
		path.join(app.getAppPath(), "dist-react", "index.html"),
		{ hash: "/overlay" }
	);

	overlayWindow.once("ready-to-show", () => {
		overlayWindow!.show();
		overlayWindow!.focus();
		overlayWindow!.setIgnoreMouseEvents(false);
	});
}

// --------------------
// IPC HANDLERS
// --------------------
ipcMain.handle("GET_LAST_RECT", () => lastRect || loadLastRect());
ipcMain.handle("SET_LAST_RECT", (_event, rect: Rect) => saveLastRect(rect));
ipcMain.handle("OPEN_OVERLAY", () => createOverlay());
ipcMain.handle("CLOSE_OVERLAY", () => {
	overlayWindow?.close();
	overlayWindow = null;
});
ipcMain.handle("SCREENSHOT", async () => {
	const sources = await desktopCapturer.getSources({
		types: ["screen"],
		thumbnailSize: { width: 1920, height: 1080 }
	});
	const screen = sources[0];
	return screen.thumbnail.toDataURL();
});

ipcMain.handle("save-screenshot", async (_event, dataUrl: string) => {
	try {
		const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
		const filePath = path.join(
			app.getPath("pictures"),
			`screenshot-${Date.now()}.png`
		);
		fs.writeFileSync(filePath, base64Data, "base64");
		return filePath;
	} catch (err) {
		console.error("Failed to save screenshot:", err);
		throw err;
	}
});

// --------------------
// GLOBAL HOTKEY
// --------------------
app.whenReady().then(() => {
	createWindow();

	// Load last rectangle on startup
	lastRect = loadLastRect();

	// Ctrl+Shift+C: capture at lastRect
	globalShortcut.register("Control+Shift+C", async () => {
		if (!lastRect) {
			console.log("No rectangle selected!");
			return;
		}
		console.log("Ctrl+Shift+C pressed, using rectangle:", lastRect);

		const sources = await desktopCapturer.getSources({
			types: ["screen"],
			thumbnailSize: { width: 1920, height: 1080 }
		});
		const screenShot = sources[0].thumbnail.toDataURL();

		mainWindow?.webContents.send("CROP_AND_SAVE", {
			image: screenShot,
			rect: lastRect
		});
	});
});
ipcMain.handle("PARSE_RELIC_TEXT", (_event, text: string) => {
	const relic = parseRelicFromText(text);

	if (relic) {
		saveParsedRelic(relic);
	}

	return relic;
});
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});
let savedRelicsWindow: BrowserWindow | null = null;

function openSavedRelicsWindow() {
	if (savedRelicsWindow) {
		savedRelicsWindow.focus();
		return;
	}

	savedRelicsWindow = new BrowserWindow({
		width: 600,
		height: 800,
		title: "Saved Relics",
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
			sandbox: false
		}
	});

	savedRelicsWindow.loadFile(
		path.join(app.getAppPath(), "dist-react", "index.html"),
		{ hash: "/saved-relics" }
	);

	savedRelicsWindow.on("closed", () => {
		savedRelicsWindow = null;
	});
}

// Expose via IPC
ipcMain.handle("OPEN_SAVED_RELICS", () => openSavedRelicsWindow());
ipcMain.handle("GET_SAVED_RELICS", () => {
	const relicsPath = path.join(app.getPath("documents"), "parsedRelics.json");
	if (!fs.existsSync(relicsPath)) return [];

	try {
		const raw = fs.readFileSync(relicsPath, "utf-8");
		return JSON.parse(raw);
	} catch (err) {
		console.error("Failed to load parsedRelics.json:", err);
		return [];
	}
});
const relicsJsonPath = path.join(app.getPath("documents"), "parsedRelics.json");

ipcMain.handle("REMOVE_RELIC", (_event, index: number) => {
	if (!fs.existsSync(relicsJsonPath)) return false;

	try {
		const raw = fs.readFileSync(relicsJsonPath, "utf-8");
		const relics: Relic[] = JSON.parse(raw);
		if (index < 0 || index >= relics.length) return false;

		relics.splice(index, 1);
		fs.writeFileSync(relicsJsonPath, JSON.stringify(relics, null, 2));
		return true;
	} catch (err) {
		console.error("Failed to remove relic:", err);
		return false;
	}
});
