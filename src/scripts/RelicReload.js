// src/scripts/RelicReload.js
import fs from "fs";
import path from "path";

// --- Paths ---
const domainsPath = path.resolve("./src/electron/data/relics.json");
const outputPath = path.resolve("./src/electron/data/relicLookup.json");

// --- Load and parse relics JSON ---
const rawData = fs.readFileSync(domainsPath, "utf-8");
const domainsData = JSON.parse(rawData);

// --- Flatten domains → sets → pieces into relicLookup ---
const relicLookup = {};

for (const domain of domainsData.domains) {
	for (const set of domain.sets) {
		const pieces = set.pieces || {};

		for (const [slot, relicName] of Object.entries(pieces)) {
			relicLookup[relicName] = {
				name: relicName,
				set: set.name,
				slot,
				domain: domain.name,
				imagePath: set.imagePath || "" // fallback if missing
			};
		}
	}
}

// --- Write flattened relicLookup JSON ---
fs.writeFileSync(outputPath, JSON.stringify(relicLookup, null, 2), "utf-8");
console.log(
	`✅ relicLookup.json created with ${Object.keys(relicLookup).length} relics`
);
