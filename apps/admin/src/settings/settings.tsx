import { App } from "@tryghost/admin-x-settings/src/app";
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
            <App
                designSystem={{
                    darkMode: false,
                    fetchKoenigLexical: async () => {},
                }}
            />
        </div>,
        document.body,
    );
}
