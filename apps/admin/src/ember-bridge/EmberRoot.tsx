import React, { useLayoutEffect, useRef } from "react";
import { useEmberContext } from "./EmberContext";

export const EmberRoot = React.memo(function EmberRoot() {
    const ref = useRef<HTMLDivElement>(null);
    const { isFallbackPresent } = useEmberContext();

    useLayoutEffect(() => {
        if (ref.current) {
            const app = document.getElementById("ember-app");
            if (app) {
                ref.current.appendChild(app);
            } else {
                throw new Error("Ember app not found");
            }
        }
        return () => {
            const app = document.getElementById("ember-app");
            if (app) {
                document.body.appendChild(app);
            } else {
                throw new Error("Ember app not found");
            }
        };
    }, []);

    return <div ref={ref} hidden={!isFallbackPresent} className="w-full h-screen overflow-auto"></div>;
});
