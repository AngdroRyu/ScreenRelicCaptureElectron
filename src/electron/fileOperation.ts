import fs from "fs";
import path from "path";
import { app } from "electron";

const userDataPath = app.getPath("appData");

const projectDir = path.join(userDataPath, "Project_Name");
const screenshotsDir = path.join(projectDir, "Screenshots");

function ensureDirectory(directoryPath: string) {
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}
}

function convertTimestampToDateTime(timestamp: number) {
	const date = new Date(timestamp);

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function saveScreenshot(dataURL: string) {
	ensureDirectory(screenshotsDir);

	const filename = `Screenshot_${convertTimestampToDateTime(Date.now())}.png`;

	const filePath = path.join(screenshotsDir, filename);

	const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");

	fs.writeFileSync(filePath, base64Data, "base64");

	return filePath;
}
