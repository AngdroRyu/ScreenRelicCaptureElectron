// electron-sender.ts
export { sendRelicsFile };

async function sendRelicsFile() {
	try {
		// Call the IPC handler in main.ts
		const result = await window.electron.sendRelicsFile();
		console.log("Relics sent successfully:", result);
		return result;
	} catch (err) {
		console.error("Failed to send relics file:", err);
		throw err;
	}
}
