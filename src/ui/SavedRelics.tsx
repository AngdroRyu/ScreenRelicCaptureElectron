"use client";
import React, { useEffect, useState } from "react";
import type { Relic } from "../electron/relicParser.js";

const SavedRelics: React.FC = () => {
	const [relics, setRelics] = useState<Relic[]>([]);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);

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

	const handleSendRelics = async () => {
		setSending(true);
		try {
			// Use the preload-exposed API
			await window.electron.sendRelicsFile();
			alert("Relics sent successfully!");
		} catch (err) {
			console.error("Failed to send relics:", err);
			alert("Failed to send relics. Check console for details.");
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="p-4 bg-gray-900 min-h-screen text-white flex flex-col">
			<h1 className="text-2xl font-bold mb-4">Saved Relics</h1>

			<div className="overflow-auto max-h-[70vh] border border-gray-700 rounded-lg mb-4">
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

								{r.substats.map((s, i) => (
									<td key={i} className="px-4 py-2">
										{s.name && s.value ? (
											<div className="flex flex-col">
												<div>
													{s.name}: {s.value}
												</div>
												{s.rolls && (
													<div className="flex mt-1">
														{Object.entries(s.rolls.breakdown).map(
															([tier, count]) =>
																Array.from({ length: count }).map((_, j) => {
																	let color = "bg-gray-500";
																	if (tier === "med") color = "bg-yellow-400";
																	if (tier === "high") color = "bg-green-400";

																	return (
																		<span
																			key={`${tier}-${j}`}
																			className={`${color} w-2 h-2 rounded-full mr-1 inline-block`}
																		/>
																	);
																})
														)}
													</div>
												)}
											</div>
										) : (
											"-"
										)}
									</td>
								))}

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
											if (success)
												setRelics((prev) => prev.filter((_, i) => i !== idx));
											else alert("Failed to remove relic.");
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

			{/* Send button */}
			<div className="mt-auto p-4">
				<button
					className={`w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded ${
						sending ? "opacity-50 cursor-not-allowed" : ""
					}`}
					disabled={sending}
					onClick={handleSendRelics}
				>
					{sending ? "Sending..." : "Send Relics to Server"}
				</button>
			</div>
		</div>
	);
};

export default SavedRelics;
