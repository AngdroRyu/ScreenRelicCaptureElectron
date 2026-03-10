// relicParser.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mainStatsBySlot from "./data/mainStat.js";
import substatNames from "./data/substatNames.js";

// Convert ESM URL to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load relics.json
const relicsFilePath = path.join(__dirname, "data", "relics.json");
let relicData: { domains: RelicDomain[] };

try {
	const raw = fs.readFileSync(relicsFilePath, "utf-8");
	relicData = JSON.parse(raw);
} catch (err) {
	console.error("Failed to read relics.json:", err);
	relicData = { domains: [] };
}

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

interface RelicSet {
	name: string;
	imagePath: string;
	pieces: Record<string, string>;
}

interface RelicDomain {
	name: string;
	sets: RelicSet[];
}

const domains = relicData.domains as RelicDomain[];

// --- Parser Function ---
export function parseRelicFromText(text: string): Relic | null {
	const cleanText = text.toLowerCase();
	const setInfo = findRelicSet(cleanText);
	if (!setInfo) return null;

	const { set, slot, piece } = setInfo;
	const mainStatData = detectMainStat(cleanText, slot);
	const substats = detectSubstats(mainStatData?.remainingText || cleanText);
	let imagePath: string | undefined;

	if (relicLookup[piece]) {
		imagePath = relicLookup[piece].imagePath;
	}

	return {
		set: set.name,
		piece,
		slot,
		mainStat: mainStatData?.name || null,
		mainValue: mainStatData?.value || null,
		substats,
		imagePath
	};
}

// --- Helper: find relic set ---
function findRelicSet(text: string) {
	//console.log("Searching relic set in text:", text);
	for (const domain of domains) {
		for (const set of domain.sets) {
			for (const slot in set.pieces) {
				const pieceName = set.pieces[slot];
				if (!pieceName) continue;

				if (text.includes(pieceName.toLowerCase())) {
					return { set, slot, piece: pieceName };
				}
			}
		}
	}
	return null;
}

// --- Detect main stat ---
function detectMainStat(text: string, slot: string) {
	const possibleStats = mainStatsBySlot[slot] || [];
	const lines = text.split(/\r?\n/);

	function sanitizeLine(line: string) {
		return line
			.replace(/[^\w\d.+% ]/g, "") // remove OCR junk
			.trim()
			.toLowerCase();
	}

	let remainingText = text;

	for (const rawLine of lines) {
		const line = sanitizeLine(rawLine);
		if (!line) continue;

		for (const stat of possibleStats) {
			const statLower = stat.toLowerCase();
			if (line.includes(statLower)) {
				// Match number after stat name
				const regex = new RegExp(`${statLower}\\s*([\\d.]+%?)`);
				const match = line.match(regex);
				if (match) {
					// Remove this line from remaining text
					const escapedLine = rawLine.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"); // ESLint-friendly
					const removeRegex = new RegExp(escapedLine, "g");
					remainingText = remainingText.replace(removeRegex, "").trim();

					return {
						name: stat,
						value: match[1],
						remainingText // ← this is the text without the main stat line
					};
				}
			}
		}
	}

	return { name: null, value: null, remainingText: text };
}

// --- Detect substats ---
function detectSubstats(text: string) {
	if (text.includes("(+3 to activate)")) {
		console.log("Removing (+3 to activate) text");
		text = text.replace(/\(\+3 to activate\)/g, "").trim();
	}

	const found: { name: string; value: string }[] = [];
	const lines = text.split(/\r?\n/);
	console.log("Lines to process:", lines);

	function sanitizeOCRLine(line: string) {
		const sanitized = line.replace(/^[^\w\d.+%]+/, "").trim();
		console.log("Sanitized line:", sanitized);
		return sanitized;
	}

	for (const rawLine of lines) {
		const line = sanitizeOCRLine(rawLine).toLowerCase();
		if (!line) continue;

		for (const stat of substatNames) {
			const regex = new RegExp(`${stat.toLowerCase()}[^\\d]*([\\d\\.]+%?)`);
			const match = line.match(regex);

			if (match) {
				console.log(`Found substat match: ${stat} => ${match[1]}`);
				found.push({ name: stat, value: match[1] });
			}
		}
	}

	console.log("Substats found so far:", found);

	// Ensure 4 substats
	while (found.length < 4) {
		found.push({ name: "", value: "" });
		console.log("Adding empty substat to reach 4 slots");
	}

	console.log("Final substats:", found);
	return found;
}
const relicLookupPath = path.join(__dirname, "data", "relicLookup.json");

interface RelicLookupEntry {
	imagePath: string;
}

let relicLookup: Record<string, RelicLookupEntry> = {};

try {
	const raw = fs.readFileSync(relicLookupPath, "utf-8");
	relicLookup = JSON.parse(raw);
} catch (err) {
	console.error("Failed to load relicLookup.json:", err);
}
