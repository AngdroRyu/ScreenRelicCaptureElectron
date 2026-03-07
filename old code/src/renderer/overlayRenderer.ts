const canvas = document.getElementById("overlay-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let startX = 0,
	startY = 0,
	isDragging = false;
let region = { x: 0, y: 0, width: 0, height: 0 };

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	if (isDragging) {
		ctx.clearRect(region.x, region.y, region.width, region.height);
		ctx.strokeStyle = "lime";
		ctx.lineWidth = 2;
		ctx.strokeRect(region.x, region.y, region.width, region.height);
	}
}

canvas.addEventListener("mousedown", (e) => {
	startX = e.clientX;
	startY = e.clientY;
	isDragging = true;
});

canvas.addEventListener("mousemove", (e) => {
	if (!isDragging) return;

	const x = Math.min(e.clientX, startX);
	const y = Math.min(e.clientY, startY);
	const width = Math.abs(e.clientX - startX);
	const height = Math.abs(e.clientY - startY);

	region = { x, y, width, height };
	draw();
});

canvas.addEventListener("mouseup", () => {
	isDragging = false;
	if (region.width > 0 && region.height > 0) {
		(window as any).overlayApi.selectRegion(region);
	} else {
		(window as any).overlayApi.cancel();
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		(window as any).overlayApi.cancel();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
});

window.addEventListener("resize", () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw(); // redraw overlay
});
if (isDragging) {
	ctx.clearRect(region.x, region.y, region.width, region.height);
	ctx.fillStyle = "rgba(0,255,0,0.2)"; // semi-transparent green fill
	ctx.fillRect(region.x, region.y, region.width, region.height);

	ctx.strokeStyle = "lime";
	ctx.lineWidth = 2;
	ctx.strokeRect(region.x, region.y, region.width, region.height);
}

draw();
