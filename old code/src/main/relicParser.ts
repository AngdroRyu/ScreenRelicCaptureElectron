// relicParser.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mainStatsBySlot from "../data/mainStat.js";
import substatNames from "../data/substatNames.js";

// Convert ESM URL to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load relics.json
const relicsFilePath = path.join(__dirname, "data", "relics.json");
let relicData: any;

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
	const substats = detectSubstats(cleanText, mainStatData?.name);
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
			.replace(/[^\w\d\.+% ]/g, "")
			.trim()
			.toLowerCase();
	}

	for (const rawLine of lines) {
		const line = sanitizeLine(rawLine);
		if (!line) continue;

		for (const stat of possibleStats) {
			if (line.includes(stat.toLowerCase())) {
				const match = line.match(/([\d\.]+%?)/);
				if (match) return { name: stat, value: match[1] };
			}
		}
	}
	return null;
}

// --- Detect substats ---
function detectSubstats(text: string, mainStatName?: string) {
	if (text.includes("(+3 to activate)")) {
		text = text.replace(/\(\+3 to activate\)/g, "").trim();
	}

	const found: { name: string; value: string }[] = [];
	const lines = text.split(/\r?\n/);

	function sanitizeOCRLine(line: string) {
		return line.replace(/^[^\w\d\.+%]+/, "").trim();
	}

	for (const rawLine of lines) {
		const line = sanitizeOCRLine(rawLine).toLowerCase();
		if (!line) continue;

		for (const stat of substatNames) {
			if (mainStatName && stat.toLowerCase() === mainStatName.toLowerCase())
				continue;

			const match = line.match(
				new RegExp(`${stat.toLowerCase()}[^\\d]*([\\d\\.]+%?)`)
			);
			if (match) {
				found.push({ name: stat, value: match[1] });
			}
		}
	}

	// Ensure 4 substats
	while (found.length < 4) found.push({ name: "", value: "" });
	return found;
}
const relicLookupPath = path.join(__dirname, "data", "relicLookup.json");

let relicLookup: any = {};

try {
	const raw = fs.readFileSync(relicLookupPath, "utf-8");
	relicLookup = JSON.parse(raw);
} catch (err) {
	console.error("Failed to load relicLookup.json:", err);
}
