import { App } from "@tryghost/admin-x-settings/src/app";
import { createPortal } from "react-dom";
import { fetchKoenigLexical } from "@/utils/fetch-koenig-lexical";
import { useColorMode } from "@/hooks/use-color-mode";

export default function Settings() {
    const {effectiveDark} = useColorMode();

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
                    darkMode: effectiveDark,
                    fetchKoenigLexical,
                }}
            />
        </div>,
        document.body,
    );
}
