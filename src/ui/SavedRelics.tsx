"use client";
import React, { useEffect, useState } from "react";
import type { Relic } from "../electron/relicParser.js";

const MAX_SUBSTATS = 4;

const SavedRelics: React.FC = () => {
	const [relics, setRelics] = useState<Relic[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			const data = await window.electron.getSavedRelics();
			setRelics(data);
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
							{Array.from({ length: MAX_SUBSTATS }).map((_, i) => (
								<th key={i} className="px-4 py-2">{`Substat ${i + 1}`}</th>
							))}
							<th className="px-4 py-2">Image</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-700">
						{relics.map((r, idx) => {
							console.log("Relic image path:", r.imagePath);

							return (
								<tr key={idx}>
									<td className="px-4 py-2">{r.set}</td>
									<td className="px-4 py-2">{r.piece}</td>
									<td className="px-4 py-2">{r.slot}</td>
									<td className="px-4 py-2">{r.mainStat || "-"}</td>
									<td className="px-4 py-2">{r.mainValue || "-"}</td>
									{Array.from({ length: MAX_SUBSTATS }).map((_, i) => {
										const sub = r.substats[i];
										return (
											<td key={i} className="px-4 py-2">
												{sub ? `${sub.name} ${sub.value}` : "-"}
											</td>
										);
									})}
									<td className="px-4 py-2">
										{r.imagePath ? (
											<img
												src={`images/${r.imagePath}`}
												alt={r.piece}
												className="w-24 h-24 object-contain"
											/>
										) : (
											"-"
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default SavedRelics;
