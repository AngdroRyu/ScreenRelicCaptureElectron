// CaptureScreenAction.tsx
type ScreenshotData = string; // base64 string

type CaptureProps = {
	onCallback?: (file: ScreenshotData) => void;
};

export const handleCapture = async ({ onCallback }: CaptureProps) => {
	try {
		const screenshot: ScreenshotData | null =
			await window.electron.captureScreen();

		if (!screenshot) {
			alert("Capture Failed");
			return;
		}

		await window.electron.saveScreenshot(screenshot);

		onCallback?.(screenshot);
	} catch (error) {
		alert(`Error saving screenshot: ${JSON.stringify(error)}`);
	}
};
