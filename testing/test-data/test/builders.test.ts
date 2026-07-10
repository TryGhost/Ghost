import {describe, expect, it} from "vitest";
import {defaultThemesResponse, label, member, post, tag, theme} from "../src/index";

describe("builders", () => {
    it("builds fully-populated entities with overrides winning", () => {
        const built = tag({name: "News", visibility: "internal"});

        expect(built.name).toBe("News");
        expect(built.visibility).toBe("internal");
        expect(built.id).toMatch(/^[0-9a-f]{24}$/);
        expect(built.slug).toBeTruthy();
    });

    it("builds posts in the API response shape", () => {
        const built = post({status: "published", published_at: "2026-01-02T03:04:05.000Z"});

        expect(built.status).toBe("published");
        expect(built.published_at).toBe("2026-01-02T03:04:05.000Z");
        expect(built.id).toMatch(/^[0-9a-f]{24}$/);
        expect(built.slug).toContain(built.title.split(" ")[0].toLowerCase());
        expect(built.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(built.mobiledoc).toBeNull();
        expect(built.email_segment).toBe("all");

        const lexical = JSON.parse(built.lexical as string) as {root: {children: Array<{type: string}>}};
        expect(lexical.root.children[0].type).toBe("paragraph");
        expect(built.html).toMatch(/^<p>/);
        expect(built.plaintext).toBeTruthy();
    });

    it("attaches label entities to members", () => {
        const vip = label({name: "VIP"});
        const built = member({name: "Alice Alpha", labels: [vip]});

        expect(built.labels).toEqual([vip]);
        expect(built.email).toContain("@");
        expect(member.many([{name: "A"}, {name: "B"}]).map(m => m.name)).toEqual(["A", "B"]);
    });

    it("builds themes and the canned casper+edition list", () => {
        expect(theme()).toMatchObject({name: "casper", active: false, errors: [], warnings: []});
        expect(theme({active: true}).active).toBe(true);

        const {themes} = defaultThemesResponse();

        expect(themes.map(({name, active}) => ({name, active}))).toEqual([
            {name: "casper", active: false},
            {name: "edition", active: true}
        ]);
        expect(themes[1].package).toMatchObject({version: "1.0.0", author: {name: "Ghost Foundation"}});
    });
});
