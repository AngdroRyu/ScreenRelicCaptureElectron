// CaptureScreenAction.tsx
type ScreenshotData = string; // base64 string

type CaptureProps = {
	onCallback?: (file: ScreenshotData) => void;
};

export const handleCapture = async ({ onCallback }: CaptureProps) => {
	try {
		const screenshot: ScreenshotData | null =
			await window.electronAPI.captureScreen();

		if (!screenshot) {
			alert("Capture Failed");
			return;
		}

		await window.electronAPI.saveScreenshot(screenshot);

		onCallback?.(screenshot);
	} catch (error) {
		alert(`Error saving screenshot: ${JSON.stringify(error)}`);
	}
};
