import { useEffect, useRef } from "react";
import { useDeleteSession } from "@tryghost/admin-x-framework/api/session";
import { clearSigninRedirect } from "./signin-redirect";
import { reloadAdmin } from "./reload";

export default function Signout() {
    const { mutateAsync: deleteSession } = useDeleteSession();
    const hasRun = useRef(false);

    useEffect(() => {
        // Guard against StrictMode double-mounting firing two signouts
        if (hasRun.current) {
            return;
        }
        hasRun.current = true;

        const signout = async () => {
            try {
                await deleteSession();
            } catch (error) {
                // Reload regardless: a failed DELETE most likely means the
                // session is already gone
                console.error(error);
            }

            clearSigninRedirect();
            reloadAdmin("/signin");
        };

        void signout();
    }, [deleteSession]);

    return null;
}
