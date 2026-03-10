// App.tsx
import React, { useState, useEffect } from "react";
import type { IpcRendererEvent } from "electron";

export interface Rect {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

const ScreenCapture: React.FC = () => {
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	// Full screen capture
	const handleCapture = async () => {
		const screenshot = await window.electron.captureScreen();
		if (!screenshot) {
			alert("Capture failed");
			return;
		}
		setImageSrc(screenshot);
		await window.electron.saveScreenshot(screenshot);
	};

	// Listen for cropped capture from main process (hotkey or overlay)
	useEffect(() => {
		const handleCropAndSave = async (
			_event: IpcRendererEvent,
			data: { image: string; rect: Rect }
		) => {
			console.log("CROP_AND_SAVE received:", data);

			// Crop the image in the renderer
			const cropped = await cropImage(data.image, data.rect);

			// Show it immediately
			setImageSrc(cropped);

			// Save it
			await window.electron.saveScreenshot(cropped);
		};

		window.electron.on("CROP_AND_SAVE", handleCropAndSave);

		return () => {
			window.electron.removeListener("CROP_AND_SAVE", handleCropAndSave);
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-6 p-8 min-h-screen bg-gray-900 text-white">
			<h1 className="text-3xl font-bold text-center">
				Screen Capture with Electron
			</h1>

			<div className="flex gap-4 flex-wrap">
				<button
					onClick={handleCapture}
					className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition"
				>
					Capture Screen
				</button>

				<button
					onClick={() => window.electron.openOverlay()}
					className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-md font-medium transition"
				>
					Capture Area
				</button>
			</div>

			{imageSrc && (
				<div className="mt-8 border-2 border-gray-600 rounded-lg overflow-hidden max-w-[90%] max-h-[70vh]">
					<img
						src={imageSrc}
						alt="Screenshot"
						className="block w-full h-auto"
					/>
				</div>
			)}
		</div>
	);
};

// Crop a base64 image (data URL) to the given rectangle
function cropImage(dataUrl: string, rect: Rect): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image();
		img.src = dataUrl;
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = Math.abs(rect.end.x - rect.start.x);
			canvas.height = Math.abs(rect.end.y - rect.start.y);
			const ctx = canvas.getContext("2d")!;

			ctx.drawImage(
				img,
				Math.min(rect.start.x, rect.end.x),
				Math.min(rect.start.y, rect.end.y),
				canvas.width,
				canvas.height,
				0,
				0,
				canvas.width,
				canvas.height
			);

			resolve(canvas.toDataURL("image/png"));
		};
	});
}

export default ScreenCapture;
