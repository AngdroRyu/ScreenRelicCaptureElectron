/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
export interface Rect {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

export default function Overlay() {
	// Current drag
	const [start, setStart] = useState<{ x: number; y: number } | null>(null);
	const [end, setEnd] = useState<{ x: number; y: number } | null>(null);

	// Last saved rectangle (for display)
	const [lastRect, setLastRect] = useState<Rect | null>(null);

	// Load last rectangle when overlay mounts
	useEffect(() => {
		const fetchLastRect = async () => {
			if (window.electron.getLastRect) {
				const rect = await window.electron.getLastRect();
				if (rect) {
					setLastRect(rect);
					console.log("Loaded last rectangle:", rect);
				}
			}
		};
		fetchLastRect();
	}, []);

	// Drag handlers
	const handleMouseDown = (e: React.MouseEvent) => {
		setStart({ x: e.clientX, y: e.clientY });
		setEnd(null);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (start) setEnd({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = useCallback(async () => {
		if (!start || !end) {
			await window.electron.closeOverlay();
			return;
		}

		const rect: Rect = { start, end };

		if (window.electron.setLastRect) {
			await window.electron.setLastRect(rect); // save for next session
		}
		setLastRect(rect); // update display
		await window.electron.closeOverlay();
	}, [start, end]);

	// ESC cancels overlay
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") window.electron.closeOverlay();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, []);

	// Global mouseup fallback
	useEffect(() => {
		const handleGlobalMouseUp = (_: MouseEvent) => {
			if (start && end) handleMouseUp();
		};
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, [start, end, handleMouseUp]);

	// Determine which rectangle to display
	const displayRect =
		start && end
			? {
					left: Math.min(start.x, end.x),
					top: Math.min(start.y, end.y),
					width: Math.abs(start.x - end.x),
					height: Math.abs(start.y - end.y)
				}
			: lastRect
				? {
						left: Math.min(lastRect.start.x, lastRect.end.x),
						top: Math.min(lastRect.start.y, lastRect.end.y),
						width: Math.abs(lastRect.start.x - lastRect.end.x),
						height: Math.abs(lastRect.start.y - lastRect.end.y)
					}
				: null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				cursor: "crosshair",
				backgroundColor: "rgba(0,0,0,0.3)",
				zIndex: 9999
			}}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{displayRect && (
				<div
					style={{
						position: "absolute",
						left: displayRect.left,
						top: displayRect.top,
						width: displayRect.width,
						height: displayRect.height,
						border: "2px solid red",
						backgroundColor: "rgba(255,255,255,0.0)"
					}}
				/>
			)}
		</div>
	);
}
