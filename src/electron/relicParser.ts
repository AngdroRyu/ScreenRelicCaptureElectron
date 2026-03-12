// relicParser.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mainStatsBySlot from "./data/mainStat.js";
import substatNames from "./data/substatNames.js";

// Convert ESM URL to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Types ---
export interface Relic {
	set: string;
	piece: string;
	slot: string;
	mainStat: string | null;
	mainValue: string | null;
	substats: { name: string; value: string }[];
	imagePath?: string;
}

interface RelicLookupEntry {
	name: string;
	set: string;
	slot: string;
	domain: string;
	imagePath: string;
}

// --- Load relic lookup ---
const relicLookupPath = path.join(__dirname, "data", "relicLookup.json");

let relicLookup: Record<string, RelicLookupEntry> = {};

try {
	console.log("Loading relicLookup.json from:", relicLookupPath);
	const raw = fs.readFileSync(relicLookupPath, "utf-8");
	relicLookup = JSON.parse(raw);
	console.log("Loaded relic lookup entries:", Object.keys(relicLookup).length);
} catch (err) {
	console.error("Failed to load relicLookup.json:", err);
}

// --- Text normalization for OCR reliability ---
function normalize(text: string) {
	const normalized = text
		.toLowerCase()
		.replace(/[']/g, "")
		.replace(/[^\w\s]/g, "")
		.trim();

	console.log("Normalized OCR text:", normalized);

	return normalized;
}

// --- Find relic from OCR text ---
function findRelicFromLookup(
	text: string
): { key: string; relic: RelicLookupEntry } | null {
	console.log("Searching relic in OCR text...");
	const normalizedText = normalize(text);
	console.log(normalizedText);
	for (const key in relicLookup) {
		const normalizedKey = normalize(key);

		console.log("Checking relic key:", normalizedKey);

		if (normalizedText.includes(normalizedKey)) {
			console.log("MATCHED RELIC:", key);
			return { key, relic: relicLookup[key] };
		}
	}

	console.warn("No relic match found in OCR text.");
	return null;
}

// --- Parser Function ---
export function parseRelicFromText(text: string): Relic | null {
	console.log("========== PARSE RELIC START ==========");
	console.log("OCR TEXT RECEIVED:\n", text);

	const relicMatch = findRelicFromLookup(text);
	console.log(relicMatch);
	if (!relicMatch) {
		console.warn("Parser could not find relic.");
		return null;
	}

	const { key, relic } = relicMatch;

	console.log("Relic detected:", key);
	console.log("Relic slot:", relic.slot);

	const mainStatData = detectMainStat(text, relic.slot);
	console.log("Main stat detected:", mainStatData);

	const substats = detectSubstats(mainStatData?.remainingText || text);
	console.log("Substats detected:", substats);

	// --- Build parsed relic ---
	const parsedRelic: Relic = {
		set: relic.set,
		piece: relic.name || key || "Unknown",
		slot: relic.slot,
		mainStat: mainStatData?.name || null,
		mainValue: mainStatData?.value || null,
		substats,
		// Use relic.imagePath if present; otherwise fallback to set-based image
		imagePath: relic.imagePath
			? `/${relic.imagePath}`
			: `/Item_${relic.set.replace(/[^a-zA-Z0-9]/g, "_")}.webp`
	};

	console.log("FINAL PARSED RELIC:", parsedRelic);
	console.log("========== PARSE RELIC END ==========");

	return parsedRelic;
}

// --- Detect main stat ---
function detectMainStat(text: string, slot: string) {
	console.log("Detecting main stat for slot:", slot);

	const possibleStats = mainStatsBySlot[slot] || [];
	const lines = text.split(/\r?\n/);

	let remainingText = text;

	for (const rawLine of lines) {
		const line = rawLine
			.replace(/[^\w\d.+% ]/g, "")
			.trim()
			.toLowerCase();

		if (!line) continue;

		console.log("Checking line for main stat:", line);

		for (const stat of possibleStats) {
			const statLower = stat.toLowerCase();

			if (line.includes(statLower)) {
				console.log("Potential main stat match:", stat);

				const regex = new RegExp(`${statLower}\\s*([\\d.]+%?)`);
				const match = line.match(regex);

				if (match) {
					console.log("Main stat value detected:", match[1]);

					const escapedLine = rawLine.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

					const removeRegex = new RegExp(escapedLine, "g");

					remainingText = remainingText.replace(removeRegex, "").trim();

					console.log("Remaining text after removing main stat:");
					console.log(remainingText);

					return {
						name: stat,
						value: match[1],
						remainingText
					};
				}
			}
		}
	}

	console.warn("No main stat detected.");

	return { name: null, value: null, remainingText: text };
}

// --- Detect substats ---
function detectSubstats(text: string) {
	console.log("Detecting substats...");

	if (text.includes("(+3 to activate)")) {
		console.log("Removing (+3 to activate)");
		text = text.replace(/\(\+3 to activate\)/g, "").trim();
	}

	const found: { name: string; value: string }[] = [];
	const lines = text.split(/\r?\n/);

	console.log("Lines for substat scan:", lines);

	for (const rawLine of lines) {
		const line = rawLine
			.replace(/^[^\w\d.+%]+/, "")
			.trim()
			.toLowerCase();

		if (!line) continue;

		console.log("Checking line:", line);

		for (const stat of substatNames) {
			const regex = new RegExp(`${stat.toLowerCase()}[^\\d]*([\\d\\.]+%?)`);
			const match = line.match(regex);

			if (match) {
				console.log(`Substat found: ${stat} ${match[1]}`);

				found.push({
					name: stat,
					value: match[1]
				});
			}
		}
	}

	console.log("Substats before padding:", found);

	while (found.length < 4) {
		found.push({ name: "", value: "" });
	}

	console.log("Final substats:", found);

	return found;
}
