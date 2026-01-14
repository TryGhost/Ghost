import { App } from "@tryghost/admin-x-settings/src/app";
import { createPortal } from "react-dom";
import { fetchKoenigLexical } from "@/utils/fetch-koenig-lexical";

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
                    fetchKoenigLexical,
                }}
            />
        </div>,
        document.body,
    );
}
