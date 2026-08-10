import {describe, expect, it} from "vitest";
import {activeThemeResponse, configResponse, settingsResponse} from "../src/index";

function getSetting(response: ReturnType<typeof settingsResponse>, key: string) {
    return response.settings.find(setting => setting.key === key)?.value;
}

function getLabs(response: ReturnType<typeof settingsResponse>): Record<string, boolean> {
    return JSON.parse(getSetting(response, "labs") as string) as Record<string, boolean>;
}

describe("boot fixtures", () => {
    it("defaults labs flags to off in settings and config", () => {
        expect(getLabs(settingsResponse())).toEqual({
            superEditors: false,
            editorExcerpt: false,
            additionalPaymentMethods: false
        });
        expect(configResponse().config.labs).toEqual({
            superEditors: false,
            editorExcerpt: false,
            additionalPaymentMethods: false
        });
    });

    it("merges labs overrides without mutating the canned data", () => {
        const overridden = settingsResponse({labs: {superEditors: true}});

        expect(getLabs(overridden)).toMatchObject({superEditors: true, editorExcerpt: false});
        expect(getLabs(settingsResponse())).toMatchObject({superEditors: false});
        expect(configResponse({labs: {superEditors: true}}).config.labs).toMatchObject({superEditors: true});
    });

    it("merges per-key settings overrides over the defaults", () => {
        const overridden = settingsResponse({settings: {title: "My Site"}});

        expect(getSetting(overridden, "title")).toBe("My Site");
        expect(getSetting(overridden, "description")).toBe("Thoughts, stories and ideas.");
        expect(getSetting(settingsResponse(), "title")).toBe("Test Site");
    });

    it("returns a fresh copy per call", () => {
        const first = settingsResponse();
        first.settings.length = 0;

        expect(settingsResponse().settings.length).toBeGreaterThan(0);
    });

    it("serves one active casper theme with declarable gscan problems", () => {
        const errors = [{code: "GS001", details: "boom"}];
        const response = activeThemeResponse({errors});
        const theme = response.themes[0];

        expect(theme).toMatchObject({name: "casper", active: true, errors, warnings: []});
        expect(activeThemeResponse().themes[0].errors).toEqual([]);
        expect(settingsResponse().settings).toContainEqual({key: "active_theme", value: "casper"});
    });
});
