"use client";
import React, { useEffect, useState } from "react";
import type { Relic } from "../electron/relicParser.js";

const SavedRelics: React.FC = () => {
	const [relics, setRelics] = useState<Relic[]>([]);
	const [loading, setLoading] = useState(true);

	// Load saved relics
	useEffect(() => {
		(async () => {
			const data = await window.electron.getSavedRelics();
			setRelics(Array.isArray(data) ? data : []);
			setLoading(false);
		})();
	}, []);

	if (loading) {
		return <div className="p-8 text-white">Loading saved relics...</div>;
	}

	if (!relics.length) {
		return <div className="p-8 text-white">No saved relics yet.</div>;
	}

	return (
		<div className="p-4 bg-gray-900 min-h-screen text-white">
			<h1 className="text-2xl font-bold mb-4">Saved Relics</h1>

			<div className="overflow-auto max-h-[80vh] border border-gray-700 rounded-lg">
				<table className="min-w-full text-left divide-y divide-gray-700">
					<thead className="bg-gray-800 sticky top-0">
						<tr>
							<th className="px-4 py-2">Set</th>
							<th className="px-4 py-2">Piece</th>
							<th className="px-4 py-2">Slot</th>
							<th className="px-4 py-2">Main Stat</th>
							<th className="px-4 py-2">Main Value</th>
							<th className="px-4 py-2">Substat 1</th>
							<th className="px-4 py-2">Substat 2</th>
							<th className="px-4 py-2">Substat 3</th>
							<th className="px-4 py-2">Substat 4</th>
							<th className="px-4 py-2">Image</th>
							<th className="px-4 py-2">Actions</th>
						</tr>
					</thead>

					<tbody className="divide-y divide-gray-700">
						{relics.map((r, idx) => (
							<tr key={idx}>
								<td className="px-4 py-2">{r.set}</td>
								<td className="px-4 py-2">{r.piece}</td>
								<td className="px-4 py-2">{r.slot}</td>
								<td className="px-4 py-2">{r.mainStat || "-"}</td>
								<td className="px-4 py-2">{r.mainValue || "-"}</td>
								<td className="px-4 py-2">
									{r.substats[0]?.name} {r.substats[0]?.value}
								</td>
								<td className="px-4 py-2">
									{r.substats[1]?.name} {r.substats[1]?.value}
								</td>
								<td className="px-4 py-2">
									{r.substats[2]?.name} {r.substats[2]?.value}
								</td>
								<td className="px-4 py-2">
									{r.substats[3]?.name} {r.substats[3]?.value}
								</td>
								<td className="px-4 py-2">
									{r.imagePath ? (
										<img
											src={`images/${r.imagePath}`}
											alt={r.piece}
											className="w-12 h-12 object-contain"
										/>
									) : (
										"-"
									)}
								</td>
								<td className="px-4 py-2">
									<button
										className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
										onClick={async () => {
											const success =
												await window.electron.removeSavedRelic(idx);
											if (success) {
												setRelics((prev) => prev.filter((_, i) => i !== idx));
											} else {
												alert("Failed to remove relic.");
											}
										}}
									>
										Remove
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default SavedRelics;
