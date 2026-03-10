import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import MainApp from "./App";
import Overlay from "./Overlay";

import SavedRelics from "./SavedRelics";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Router>
			<Routes>
				<Route path="/" element={<MainApp />} />
				<Route path="/overlay" element={<Overlay />} />
				<Route path="/saved-relics" element={<SavedRelics />} />
			</Routes>
		</Router>
	</StrictMode>
);
