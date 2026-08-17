import {describe, expect, it} from "vitest";
import {browseResponse, tag} from "../src/index";

describe("envelopes", () => {
    it("wraps a full result set with single-page pagination meta", () => {
        const tags = tag.many([{name: "A"}, {name: "B"}]);
        const response = browseResponse("tags", tags, {limit: 100});

        expect(response.tags).toHaveLength(2);
        expect(response.meta.pagination).toEqual({
            page: 1,
            limit: 100,
            pages: 1,
            total: 2,
            next: null,
            prev: null
        });
    });

    it("slices the requested page and derives total/pages/next/prev", () => {
        const entities = Array.from({length: 25}, (_, i) => ({n: i}));
        const response = browseResponse("members", entities, {page: 2, limit: 10});

        expect(response.members).toEqual(entities.slice(10, 20));
        expect(response.meta.pagination).toEqual({
            page: 2,
            limit: 10,
            pages: 3,
            total: 25,
            next: 3,
            prev: 1
        });
    });

    it("serves everything on one page for limit 'all'", () => {
        const entities = Array.from({length: 25}, (_, i) => ({n: i}));
        const response = browseResponse("members", entities, {limit: "all"});

        expect(response.members).toHaveLength(25);
        expect(response.meta.pagination).toEqual({
            page: 1,
            limit: "all",
            pages: 1,
            total: 25,
            next: null,
            prev: null
        });
    });
});
