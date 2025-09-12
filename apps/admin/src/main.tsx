import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

window.__ghost_admin_bridge__ = {};
console.log('window.__ghost_admin_bridge__', window.__ghost_admin_bridge__);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
