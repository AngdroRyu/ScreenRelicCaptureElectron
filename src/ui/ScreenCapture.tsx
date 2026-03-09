import React, { useState } from "react";
import { handleCapture } from "./CaptureScreenAction"; // import your capture handler

const ScreenCapture: React.FC = () => {
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	// typed callback for screenshot
	const handleScreenshot = (file: string) => {
		setImageSrc(file);
	};

	const captureScreenshot = () => {
		handleCapture({ onCallback: handleScreenshot });
	};

	return (
		<div>
			<h1>Screen Capture with Electron</h1>
			<button onClick={captureScreenshot}>Capture Screen</button>

			{imageSrc && (
				<img
					src={imageSrc}
					alt="Screenshot"
					style={{ width: "100%", display: "block", marginTop: 16 }}
				/>
			)}
		</div>
	);
};

export default ScreenCapture;
