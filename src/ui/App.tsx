// App.tsx
import React, { useState } from "react";

export {};

declare global {
	interface Window {
		electron: {
			captureScreen: () => Promise<string>;
			saveScreenshot: (data: string) => Promise<void>;
			openOverlay: () => Promise<void>;
			closeOverlay: () => Promise<void>;
		};
	}
}

const ScreenCapture: React.FC = () => {
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	const handleCapture = async () => {
		const screenshot = await window.electron.captureScreen();

		if (!screenshot) {
			alert("Capture failed");
			return;
		}

		setImageSrc(screenshot);
		await window.electron.saveScreenshot(screenshot);
	};

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

export default ScreenCapture;
