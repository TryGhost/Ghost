import {beforeEach, describe, expect, it} from "vitest";
import {find, findAll} from "./local-revisions";

describe("local revisions", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("returns an empty list when there are no local revisions", () => {
        expect(findAll()).toEqual([]);
    });

    it("returns local revisions newest-first", () => {
        const olderRevision = {
            id: "older",
            revisionTimestamp: 1000,
            title: "Older revision",
            type: "post"
        };
        const newerRevision = {
            id: "newer",
            revisionTimestamp: 2000,
            title: "Newer revision",
            type: "post"
        };

        window.localStorage.setItem("post-revision-older-1000", JSON.stringify(olderRevision));
        window.localStorage.setItem("post-revision-newer-2000", JSON.stringify(newerRevision));

        expect(findAll()).toEqual([
            {
                key: "post-revision-newer-2000",
                ...newerRevision
            },
            {
                key: "post-revision-older-1000",
                ...olderRevision
            }
        ]);
    });

    it("ignores non-revision keys and non-object revision values", () => {
        const revision = {
            id: "draft",
            revisionTimestamp: 1000,
            title: "Draft revision",
            type: "post"
        };

        window.localStorage.setItem("ghost-revisions", JSON.stringify(["post-revision-draft-1000"]));
        window.localStorage.setItem("not-post-revision-draft-1000", JSON.stringify(revision));
        window.localStorage.setItem("post-revision-null-1000", "null");
        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify(revision));

        expect(findAll()).toEqual([
            {
                key: "post-revision-draft-1000",
                ...revision
            }
        ]);
    });

    it("finds a revision by key", () => {
        const revision = {
            authors: [{id: "author-1"}],
            excerpt: "Excerpt",
            id: "draft",
            lexical: "{\"root\":{}}",
            revisionTimestamp: 1000,
            slug: "draft-post",
            status: "draft",
            tags: [],
            title: "Draft post",
            type: "post"
        };

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify(revision));

        expect(find("post-revision-draft-1000")).toEqual({
            key: "post-revision-draft-1000",
            ...revision
        });
    });
});
