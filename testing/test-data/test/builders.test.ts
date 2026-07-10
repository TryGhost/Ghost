import {describe, expect, it} from "vitest";
import {defaultThemesResponse, label, member, tag, theme} from "../src/index";

describe("builders", () => {
    it("builds fully-populated entities with overrides winning", () => {
        const built = tag({name: "News", visibility: "internal"});

        expect(built.name).toBe("News");
        expect(built.visibility).toBe("internal");
        expect(built.id).toMatch(/^[0-9a-f]{24}$/);
        expect(built.slug).toBeTruthy();
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
