import { App } from "./app/app";
import { createPortal } from "react-dom";

export default function Settings() {
    return createPortal(
        <div
            className="shade shade-admin"
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
            }}
        >
            <App />
        </div>,
        document.body,
    );
}
