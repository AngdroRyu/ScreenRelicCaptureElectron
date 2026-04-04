import fs from "fs";
import path from "path";
import { app } from "electron";
import type { Relic } from "./relicParser.js";

// Save in the user's Documents folder
const relicsJsonPath = path.join(app.getPath("documents"), "parsedRelics.json");

export function saveParsedRelic(relic: Relic) {
	let relics: Relic[] = [];

	// Load existing relics if the file exists
	if (fs.existsSync(relicsJsonPath)) {
		try {
			const raw = fs.readFileSync(relicsJsonPath, "utf-8");
			relics = JSON.parse(raw);
		} catch (err) {
			console.error("Failed to load existing parsedRelics.json:", err);
		}
	}

	// Add a timestamp to the relic before saving
	relic.timestamp = new Date().toISOString();

	// Append the new relic
	relics.push(relic);

	// Save back
	try {
		fs.writeFileSync(relicsJsonPath, JSON.stringify(relics, null, 2), "utf-8");
		console.log("Saved parsed relic to parsedRelics.json at:", relicsJsonPath);
	} catch (err) {
		console.error("Failed to save parsed relic:", err);
	}
}
