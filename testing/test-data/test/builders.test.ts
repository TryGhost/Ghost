import {describe, expect, it} from "vitest";
import {label, member, tag} from "../src/index";

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
});
