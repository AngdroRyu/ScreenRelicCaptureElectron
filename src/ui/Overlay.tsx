/* eslint-disable @typescript-eslint/no-unused-vars */
// Overlay.tsx
import React, { useState, useEffect, useCallback } from "react";

export default function Overlay() {
	const [start, setStart] = useState<{ x: number; y: number } | null>(null);
	const [end, setEnd] = useState<{ x: number; y: number } | null>(null);

	// Start dragging
	const handleMouseDown = (e: React.MouseEvent) => {
		setStart({ x: e.clientX, y: e.clientY });
		setEnd(null);
	};

	// Dragging
	const handleMouseMove = (e: React.MouseEvent) => {
		if (start) setEnd({ x: e.clientX, y: e.clientY });
	};

	// Mouse up: crop & save screenshot, then close overlay

	const handleMouseUp = useCallback(async () => {
		if (!start || !end) return;

		const rect: Rect = {
			left: Math.min(start.x, end.x),
			top: Math.min(start.y, end.y),
			width: Math.abs(start.x - end.x),
			height: Math.abs(start.y - end.y)
		};
		console.log(rect);
		const screenshot = await window.electron.captureScreen();
		const cropped = await cropImage(screenshot, rect);
		await window.electron.saveScreenshot(cropped);
		await window.electron.closeOverlay();
	}, [start, end]); // dependencies

	const rect =
		start && end
			? {
					left: Math.min(start.x, end.x),
					top: Math.min(start.y, end.y),
					width: Math.abs(start.x - end.x),
					height: Math.abs(start.y - end.y)
				}
			: null;

	// ESC key cancels overlay
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") window.electron.closeOverlay();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, []);

	// Global mouseup fallback (in case mouseup occurs outside div)
	useEffect(() => {
		const handleGlobalMouseUp = (_: MouseEvent) => {
			if (start && end) handleMouseUp();
		};
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, [start, end, handleMouseUp]);

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				cursor: "crosshair",
				backgroundColor: "rgba(0,0,0,0.3)", // dark overlay
				zIndex: 9999
			}}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{rect && (
				<div
					style={{
						position: "absolute",
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height,
						border: "2px solid red",
						backgroundColor: "rgba(255,255,255,0.0)" // transparent inside rectangle
					}}
				/>
			)}
		</div>
	);
}

interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

// Crop screenshot to selection rectangle
function cropImage(dataUrl: string, rect: Rect) {
	const img = new Image();
	img.src = dataUrl;

	return new Promise<string>((resolve) => {
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = rect.width;
			canvas.height = rect.height;
			const ctx = canvas.getContext("2d")!;

			ctx.drawImage(
				img,
				rect.left,
				rect.top,
				rect.width,
				rect.height,
				0,
				0,
				rect.width,
				rect.height
			);

			resolve(canvas.toDataURL("image/png"));
		};
	});
}
