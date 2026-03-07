// src/renderer/app.tsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Relic } from "../electron"; // your existing type

// Mock for Vite dev
if (!window.mainApi) {
	console.log("Using mock Electron API (Vite dev mode)");
	window.mainApi = {
		requestOverlay: () => console.log("mock requestOverlay"),
		onNewCapture: (cb: (imgPath: string) => void) => {},
		onOCRResult: (cb: (text: string) => void) => {},
		onRelicParsed: (cb: (relic: any) => void) => {},
		sendOCR: (dataUrl: string) => console.log("mock sendOCR"),
		openRelicsWindow: () => console.log("mock openRelicsWindow")
	} as unknown as typeof window.mainApi;
}

// --- React App ---
const App = () => {
	const [lastCapture, setLastCapture] = useState<string>("");
	const [relic, setRelic] = useState<Relic | null>(null);

	useEffect(() => {
		// Listen to new captures from main process
		window.mainApi?.onNewCapture((imgPath) => {
			console.log("New capture received:", imgPath);
			setLastCapture(imgPath);
		});

		// Listen for parsed relics from main process
		window.mainApi?.onRelicParsed((relicData) => {
			console.log("Relic parsed:", relicData);
			setRelic(relicData);
		});
	}, []);

	return (
		<div style={{ padding: 20, color: "white", background: "#1e1e1e" }}>
			<button onClick={() => window.mainApi?.requestOverlay()}>
				Change Capture Region
			</button>

			<button onClick={() => window.mainApi?.openRelicsWindow()}>
				View All Relics
			</button>

			<h2>Last Capture:</h2>
			{lastCapture ? (
				<img
					src={lastCapture}
					style={{
						width: 400,
						height: 300,
						objectFit: "contain",
						border: "1px solid #555",
						marginBottom: 10
					}}
				/>
			) : (
				<p>No capture yet.</p>
			)}

			<h2>Relic Info:</h2>
			{relic ? (
				<div>
					<p>
						Main Stat: {relic.mainStat || "Not detected"}{" "}
						{relic.mainValue || ""}
					</p>
					{relic.substats.map((s, i) => (
						<p key={i}>
							Substat {i + 1}: {s.name} = {s.value}
						</p>
					))}
				</div>
			) : (
				<p>No relic detected yet.</p>
			)}

			<h2>Relic Image:</h2>
			{relic?.imagePath ? (
				<img src={`./images/${relic.imagePath}`} width={120} alt="Relic" />
			) : (
				<p>No image available</p>
			)}
		</div>
	);
};

// --- Render to DOM ---
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
