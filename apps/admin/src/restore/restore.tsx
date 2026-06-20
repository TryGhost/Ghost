import {useEffect, useState} from "react";
import {findAll} from "./local-revisions";

export default function RestoreRoute() {
    const [revisions] = useState(() => findAll());

    useEffect(() => {
        // Temporary probe for Ember -> React restore parity. Remove when the UI renders these fields.
        console.table(revisions.map(({
            key,
            id,
            type,
            revisionTimestamp,
            title,
            excerpt,
            slug,
            status,
            authors,
            tags,
            lexical
        }) => ({
            key,
            id,
            type,
            revisionTimestamp,
            created: typeof revisionTimestamp === "number" ? new Date(revisionTimestamp).toLocaleString() : "",
            title,
            excerpt,
            slug,
            status,
            authors,
            tags,
            lexical
        })));
    }, [revisions]);

    return (
        <main className="flex h-full items-center justify-center">
            <h1 className="text-2xl font-semibold">Restore Posts</h1>
        </main>
    );
}
