import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CryptoPulse from "./CryptoLoom.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<CryptoPulse />
	</StrictMode>
);
