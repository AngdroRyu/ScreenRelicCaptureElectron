import {
	app,
	BrowserWindow,
	ipcMain,
	globalShortcut,
	desktopCapturer,
	screen
} from "electron";
import path from "path";
import fs from "fs";
import Tesseract from "tesseract.js";
import { parseRelicFromText, type Relic } from "./relicParser.js"; // using Vite alias
import { fileURLToPath } from "url";

// __dirname in ESModule
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const relicsFile = path.join(__dirname, "../data/relicsCaptured.json");
const regionFile = path.join(app.getPath("userData"), "selectedRegion.json");

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let selectedRegion: {
	x: number;
	y: number;
	width: number;
	height: number;
} | null = null;

// --- Create Main Window ---
function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 600,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "../preload/preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});

	mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

// --- Create Overlay Window ---
function createOverlayWindow() {
	const { width, height } = screen.getPrimaryDisplay().bounds;
	overlayWindow = new BrowserWindow({
		width,
		height,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		fullscreen: true,
		focusable: true,
		webPreferences: {
			preload: path.join(__dirname, "../preload/overlayPreload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});

	overlayWindow.loadFile(path.join(__dirname, "../renderer/overlay.html"));
	overlayWindow.hide();
}

// --- Capture Screen ---
async function captureScreen(): Promise<string> {
	if (!selectedRegion) return "";
	const { x, y, width, height } = selectedRegion;

	const displays = screen.getAllDisplays();
	const display =
		displays.find(
			(d) =>
				x >= d.bounds.x &&
				x < d.bounds.x + d.bounds.width &&
				y >= d.bounds.y &&
				y < d.bounds.y + d.bounds.height
		) || screen.getPrimaryDisplay();

	const scaleFactor = display.scaleFactor;

	const sources = await desktopCapturer.getSources({
		types: ["screen"],
		thumbnailSize: {
			width: Math.floor(display.size.width * scaleFactor),
			height: Math.floor(display.size.height * scaleFactor)
		}
	});

	const image = sources[0].thumbnail.crop({
		x: Math.floor((x - display.bounds.x) * scaleFactor),
		y: Math.floor((y - display.bounds.y) * scaleFactor),
		width: Math.floor(width * scaleFactor),
		height: Math.floor(height * scaleFactor)
	});

	const filePath = path.join(
		app.getPath("documents"),
		`Capture_${Date.now()}.png`
	);
	fs.writeFileSync(filePath, image.toPNG());
	return filePath;
}

// --- IPC Handlers ---
ipcMain.on("region-selected", async (_, region) => {
	selectedRegion = region;
	saveRegion(region);
	overlayWindow?.hide();
	const imgPath = await captureScreen();
});

ipcMain.on("region-cancelled", () => overlayWindow?.hide());
ipcMain.on(
	"show-overlay",
	() => overlayWindow?.show() && overlayWindow?.focus()
);

ipcMain.on("ocr-image", async (_, dataUrl: string) => {
	const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
	try {
		const {
			data: { text }
		} = await Tesseract.recognize(buffer, "eng");

		mainWindow?.webContents.send("ocr-result", text);

		const relic = parseRelicFromText(text);
		if (relic) {
			// lookup imagePath in your relicLookup JSON
			const lookupPath = path.join(__dirname, "../data/relicLookup.json");
			let relicLookup: Record<string, { imagePath: string }> = {};
			if (fs.existsSync(lookupPath)) {
				relicLookup = JSON.parse(fs.readFileSync(lookupPath, "utf-8"));
			}

			const imageFile = relicLookup[relic.piece]?.imagePath
				? path.join(__dirname, "../images", relicLookup[relic.piece].imagePath)
				: null;

			mainWindow?.webContents.send("relic-parsed", {
				...relic,
				imagePath: imageFile, // send path to renderer
				imageDataUrl: dataUrl
			});

			// Save relic
			let existing: Relic[] = [];
			if (fs.existsSync(relicsFile)) {
				try {
					existing = JSON.parse(fs.readFileSync(relicsFile, "utf-8"));
				} catch {}
			}
			existing.push(relic);
			fs.writeFileSync(relicsFile, JSON.stringify(existing, null, 2), "utf-8");
		}
	} catch (err) {
		console.error("Tesseract error:", err);
	}
});

// --- Open relics window ---
ipcMain.on("open-relics-window", () => {
	const relicsWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "../preload/relicsPreload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	relicsWindow.loadFile(path.join(__dirname, "../renderer/relics.html"));
});

// --- Save/Load region ---
function saveRegion(region: typeof selectedRegion) {
	fs.writeFileSync(regionFile, JSON.stringify(region));
}
if (fs.existsSync(regionFile)) {
	selectedRegion = JSON.parse(fs.readFileSync(regionFile, "utf-8"));
}

// --- App Ready ---
app.whenReady().then(() => {
	createMainWindow();
	createOverlayWindow();

	globalShortcut.register("CommandOrControl+Shift+C", async () => {
		if (selectedRegion) {
			const imgPath = await captureScreen();
			mainWindow?.webContents.send("new-capture", imgPath);
		} else {
			overlayWindow?.show();
			overlayWindow?.focus();
		}
	});
});

// --- Cleanup ---
app.on("will-quit", () => globalShortcut.unregisterAll());
