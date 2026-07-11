import {automation, buildLexical, buildLexicalParagraph, defaultThemesResponse, label, member, post, tag, theme, tier} from "../src/index";
import {describe, expect, it} from "vitest";

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

    it("builds lexical documents from paragraphs and card specs", () => {
        const paragraphDoc = JSON.parse(buildLexicalParagraph("Hello")) as {
            root: {type: string; children: Array<{type: string; children: Array<{text: string}>}>};
        };
        expect(paragraphDoc.root.type).toBe("root");
        expect(paragraphDoc.root.children[0].type).toBe("paragraph");
        expect(paragraphDoc.root.children[0].children[0].text).toBe("Hello");

        const cardDoc = JSON.parse(buildLexical({transistor: {accentColor: "#FF0000"}})) as {
            root: {children: Array<{type: string; accentColor?: string}>};
        };
        expect(cardDoc.root.children.map(child => child.type)).toEqual(["paragraph", "transistor", "paragraph"]);
        expect(cardDoc.root.children[1].accentColor).toBe("#FF0000");

        expect(() => buildLexical("no-such-card")).toThrow(/Unknown card type/);
    });

    it("attaches label entities to members", () => {
        const vip = label({name: "VIP"});
        const built = member({name: "Alice Alpha", labels: [vip]});

        expect(built.labels).toEqual([vip]);
        expect(built.email).toContain("@");
        expect(member.many([{name: "A"}, {name: "B"}]).map(m => m.name)).toEqual(["A", "B"]);
    });

    it("builds paid tiers", () => {
        const built = tier({name: "Silver Tier"});

        expect(built).toMatchObject({name: "Silver Tier", type: "paid", active: true});
        expect(built.slug).toBeTruthy();
    });

    it("builds automations", () => {
        expect(automation({status: "active"}).status).toBe("active");
        expect(automation().slug).toBeTruthy();
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
