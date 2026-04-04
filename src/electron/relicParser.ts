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
	timestamp: string;
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
		// remove parentheses and contents, e.g., (0)
		.replace(/\([^)]*\)/g, "")
		// replace non-word characters (punctuation) with space
		.replace(/[^\w\s]+/g, " ")
		// collapse multiple spaces/newlines into single space
		.replace(/\s+/g, " ")
		.trim();
	return normalized;
}

// --- Find relic from OCR text ---
function findRelicFromLookup(
	text: string
): { key: string; relic: RelicLookupEntry } | null {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	let bestMatch: { key: string; relic: RelicLookupEntry; dist: number } | null =
		null;

	for (const key in relicLookup) {
		const normalizedKey = normalize(key);

		for (const line of lines) {
			const normalizedLine = normalize(line);
			const dist = levenshteinDistance(normalizedLine, normalizedKey);
			if (!bestMatch || dist < bestMatch.dist) {
				bestMatch = { key, relic: relicLookup[key], dist };
			}
		}
	}

	if (bestMatch && bestMatch.dist <= 5) {
		// adjust threshold for OCR errors
		console.log("FUZZY MATCHED RELIC:", bestMatch.key);
		return { key: bestMatch.key, relic: bestMatch.relic };
	}

	console.warn("No relic match found in OCR text.");
	return null;
}

// --- Parser Function ---
export function parseRelicFromText(text: string): Relic | null {
	console.log("========== PARSE RELIC START ==========");
	console.log("OCR TEXT RECEIVED:\n", text);

	// 1️⃣ Find relic
	const relicMatch = findRelicFromLookup(text);
	if (!relicMatch) {
		console.warn("Parser could not find relic.");
		return null;
	}

	const { key, relic } = relicMatch;
	console.log("Relic detected:", key, relic);

	// 2️⃣ Remove relic name from text before main stat detection
	// Use regex to remove the first occurrence of relic name (case-insensitive)
	const cleanedText = text.replace(new RegExp(key, "i"), "").trim();

	// 3️⃣ Detect main stat from the text after removing relic name
	const mainStatData = detectMainStat(cleanedText, relic.slot);
	console.log("Main stat detected:", mainStatData);

	// 4️⃣ Detect substats using remaining text
	const substats = detectSubstats(mainStatData?.remainingText || cleanedText);
	console.log("Substats detected:", substats);

	// 5️⃣ Build parsed relic object
	const parsedRelic: Relic = {
		set: relic.set,
		piece: relic.name || key || "Unknown",
		slot: relic.slot,
		mainStat: mainStatData?.name || null,
		mainValue: mainStatData?.value || null,
		substats,
		imagePath: relic.imagePath
			? `/${relic.imagePath}`
			: `/Item_${relic.set.replace(/[^a-zA-Z0-9]/g, "_")}.webp`,
		timestamp: "" // will be set when saving
	};

	// 6️⃣ Detect rolls for each substat
	parsedRelic.substats.forEach((s) => {
		if (s.name && s.value) {
			let numericValue = parseFloat(s.value.replace("%", ""));
			let tableKey = s.name;

			if (s.value.includes("%") && ["DEF", "ATK", "HP"].includes(s.name)) {
				tableKey = s.name + "%";
				numericValue /= 100; // convert to fraction
			}

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
		}
	});

	console.log("FINAL PARSED RELIC:", parsedRelic);
	console.log("========== PARSE RELIC END ==========");
	return parsedRelic;
}
// --- Detect main stat ---
function detectMainStat(text: string, slot: string) {
	const possibleStats = mainStatsBySlot[slot] || [];
	let remainingText = text;

	// Remove relic name if present
	const relicMatch = findRelicFromLookup(text);
	if (relicMatch) {
		const relicName = relicMatch.relic.name;
		const escapedRelic = relicName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
		const relicRegex = new RegExp(escapedRelic, "i");
		remainingText = remainingText.replace(relicRegex, "").trim();
	}

	// Split lines and normalize OCR artifacts
	const lines = remainingText.split(/\r?\n/).map((line) =>
		line
			.replace(/^[^\p{L}]+/u, "") // remove leading non-letter characters (Unicode safe)
			.replace(/[^\w\d.+% ]/gu, "") // remove other stray symbols
			.trim()
	);

	for (const line of lines) {
		if (!line) continue;

		const valueMatch = line.match(/([0-9]+(\.[0-9]+)?%?)/);
		if (!valueMatch) continue;

		const rawStatName = line.replace(valueMatch[0], "").trim();
		const candidateName = fuzzyMatchStat(rawStatName, possibleStats);

		if (candidateName) {
			// Remove this line from remaining text
			const escapedLine = line.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
			remainingText = remainingText
				.replace(new RegExp(escapedLine, "g"), "")
				.trim();

			return { name: candidateName, value: valueMatch[1], remainingText };
		}
	}

	return { name: null, value: null, remainingText };
}

// --- Detect substats ---
function detectSubstats(text: string) {
	console.log("Detecting substats...");

	// Remove activation notes
	text = text.replace(/\(\+3 to activate\)/g, "").trim();

	const found: RelicSubstat[] = [];
	const lines = text.split(/\r?\n/);

	for (const rawLine of lines) {
		const line = rawLine
			.replace(/^[^\w\d]+/, "")
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

	if (found.length !== 4) {
		console.warn(
			`Expected 4 substats, but found ${found.length}. Check OCR or main stat detection.`
		);
	}

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
		throw new Error(`No roll table entry for ${stat}`);
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

	if (!best) {
		throw new Error(
			`Unable to detect substat rolls for ${stat} with observed value ${observedValue}`
		);
	}

	console.log(`detectSubstatRolls(${stat}, ${observedValue}) →`, best);
	return best;
}
function fuzzyMatchStat(line: string, stats: string[]): string | null {
	const threshold = 2; // allow up to 2 character differences
	line = line.toLowerCase();

	for (const stat of stats) {
		const statNorm = stat.toLowerCase();
		const dist = levenshteinDistance(line, statNorm);
		if (dist <= threshold) return stat;
	}
	return null;
}

// Simple Levenshtein distance helper
function levenshteinDistance(a: string, b: string) {
	const dp = Array.from({ length: a.length + 1 }, () =>
		Array(b.length + 1).fill(0)
	);
	for (let i = 0; i <= a.length; i++) dp[i][0] = i;
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
			else
				dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[a.length][b.length];
}
