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
	substats: RelicSubstat[];
	imagePath?: string;
}

interface RelicLookupEntry {
	name: string;
	set: string;
	slot: string;
	domain: string;
	imagePath: string;
}

// --- Extend Relic type to include rolls ---
export interface RelicSubstat {
	name: string;
	value: string;
	rolls?: {
		totalRolls: number;
		breakdown: { low: number; med: number; high: number };
	};
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

// --- Text normalization ---
function normalize(text: string) {
	const normalized = text
		.toLowerCase()
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
	for (const key in relicLookup) {
		const normalizedKey = normalize(key);
		//console.log("Checking relic key:", normalizedKey);
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
	if (!relicMatch) {
		console.warn("Parser could not find relic.");
		return null;
	}

	const { key, relic } = relicMatch;
	console.log("Relic detected:", key, relic);

	const mainStatData = detectMainStat(text, relic.slot);
	console.log("Main stat detected:", mainStatData);

	const substats = detectSubstats(mainStatData?.remainingText || text);
	console.log("Substats detected:", substats);

	const parsedRelic: Relic = {
		set: relic.set,
		piece: relic.name || key || "Unknown",
		slot: relic.slot,
		mainStat: mainStatData?.name || null,
		mainValue: mainStatData?.value || null,
		substats,
		imagePath: relic.imagePath
			? `/${relic.imagePath}`
			: `/Item_${relic.set.replace(/[^a-zA-Z0-9]/g, "_")}.webp`
	};

	// --- Detect rolls for each substat ---
	parsedRelic.substats.forEach((s) => {
		if (s.name && s.value) {
			let numericValue = parseFloat(s.value.replace("%", ""));
			let tableKey = s.name;

			if (s.value.includes("%")) {
				// Only append % for DEF, ATK, HP
				if (["DEF", "ATK", "HP"].includes(s.name)) {
					tableKey = s.name + "%";
					numericValue /= 100; // convert to fraction
				}
			}

			// Convert special fractional stats if >1
			if (
				[
					"Break Effect",
					"Effect Hit Rate",
					"Effect RES",
					"CRIT Rate",
					"CRIT DMG"
				].includes(s.name) &&
				numericValue > 1
			) {
				numericValue /= 100;
			}

			const rolls = detectSubstatRolls(tableKey, numericValue);
			s.rolls = rolls || undefined;

			console.log(
				`Substat ${s.name} value ${s.value} → tableKey ${tableKey} → numeric ${numericValue} → rolls:`,
				rolls
			);
		}
	});

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
				const regex = new RegExp(`${statLower}\\s*([\\d.]+%?)`);
				const match = line.match(regex);
				if (match) {
					console.log("Main stat value detected:", match[1]);
					const escapedLine = rawLine.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
					const removeRegex = new RegExp(escapedLine, "g");
					remainingText = remainingText.replace(removeRegex, "").trim();
					return { name: stat, value: match[1], remainingText };
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
		text = text.replace(/\(\+3 to activate\)/g, "").trim();
		console.log("Removed (+3 to activate)");
	}

	const found: RelicSubstat[] = [];
	const lines = text.split(/\r?\n/);
	for (const rawLine of lines) {
		const line = rawLine
			.replace(/^[^\w\d.+%]+/, "")
			.trim()
			.toLowerCase();
		if (!line) continue;

		for (const stat of substatNames) {
			const regex = new RegExp(`${stat.toLowerCase()}[^\\d]*([\\d\\.]+%?)`);
			const match = line.match(regex);
			if (match) {
				console.log(`Substat found: ${stat} ${match[1]}`);
				found.push({ name: stat, value: match[1] });
			}
		}
	}

	while (found.length < 4) found.push({ name: "", value: "" });
	console.log("Final substats:", found);
	return found;
}

// --- Substat growth table ---
interface SubstatGrowth {
	stat: string;
	values: { low: number; med: number; high: number };
}

const SubstatGrowthValues: SubstatGrowth[] = [
	{ stat: "SPD", values: { low: 2, med: 2.3, high: 2.6 } },
	{ stat: "HP", values: { low: 33.87, med: 38.103755, high: 42.33751 } },
	{ stat: "ATK", values: { low: 16.935, med: 19.051877, high: 21.168754 } },
	{ stat: "DEF", values: { low: 16.935, med: 19.051877, high: 21.168754 } },
	{ stat: "HP%", values: { low: 0.03456, med: 0.03888, high: 0.0432 } },
	{ stat: "ATK%", values: { low: 0.03456, med: 0.03888, high: 0.0432 } },
	{ stat: "DEF%", values: { low: 0.0432, med: 0.0486, high: 0.054 } },
	{
		stat: "Break Effect",
		values: { low: 0.05184, med: 0.05832, high: 0.0648 }
	},
	{
		stat: "Effect Hit Rate",
		values: { low: 0.03456, med: 0.03888, high: 0.0432 }
	},
	{ stat: "Effect RES", values: { low: 0.03456, med: 0.03888, high: 0.0432 } },
	{ stat: "CRIT Rate", values: { low: 0.02592, med: 0.02916, high: 0.0324 } },
	{ stat: "CRIT DMG", values: { low: 0.05184, med: 0.05832, high: 0.0648 } }
];

// --- Build lookup table ---
const rollTable: Record<string, [number, number, number]> = Object.fromEntries(
	SubstatGrowthValues.map((r) => [
		r.stat,
		[r.values.low, r.values.med, r.values.high] as [number, number, number]
	])
);

// --- Substat roll calculator ---
export function detectSubstatRolls(
	stat: string,
	observedValue: number,
	maxRolls = 5
) {
	const tableStat = stat;
	const values = rollTable[tableStat];
	if (!values) {
		console.warn(`No roll table entry for ${stat}`);
		return null;
	}

	const [low, med, high] = values;
	const tolerance =
		tableStat.endsWith("%") || tableStat.includes("Effect") ? 0.001 : 1;

	let best: {
		totalRolls: number;
		breakdown: { low: number; med: number; high: number };
	} | null = null;
	let bestDiff = Infinity;

	for (let a = 0; a <= maxRolls; a++) {
		for (let b = 0; b <= maxRolls - a; b++) {
			for (let c = 0; c <= maxRolls - a - b; c++) {
				const rolls = a + b + c;
				if (!rolls) continue;

				const sum = a * low + b * med + c * high;
				const diff = Math.abs(sum - observedValue);

				if (diff < bestDiff && diff <= tolerance) {
					bestDiff = diff;
					best = { totalRolls: rolls, breakdown: { low: a, med: b, high: c } };
				}
			}
		}
	}

	console.log(`detectSubstatRolls(${stat}, ${observedValue}) →`, best);
	return best;
}
