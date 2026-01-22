import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { navigateTo } from "./navigation";

describe("navigateTo", () => {
    let locationMock: { href: string; hash: string };

    beforeEach(() => {
        locationMock = { href: "", hash: "" };
        vi.stubGlobal("location", locationMock as unknown as Location);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("safe external URLs", () => {
        it("should navigate to https URLs", () => {
            const result = navigateTo("https://example.com");
            expect(result).toBe(true);
            expect(locationMock.href).toBe("https://example.com");
        });

        it("should navigate to mailto URLs", () => {
            const result = navigateTo("mailto:test@example.com");
            expect(result).toBe(true);
            expect(locationMock.href).toBe("mailto:test@example.com");
        });
    });

    describe("dangerous URL schemes (XSS prevention)", () => {
        it("should reject javascript: URLs", () => {
            const result = navigateTo('javascript:alert("XSS")');
            expect(result).toBe(false);
            expect(locationMock.href).toBe("");
        });

        it("should reject data: URLs", () => {
            const result = navigateTo(
                'data:text/html,<script>alert("XSS")</script>'
            );
            expect(result).toBe(false);
            expect(locationMock.href).toBe("");
        });
    });

    describe("internal navigation", () => {
        it("should use hash routing for paths starting with /", () => {
            const result = navigateTo("/settings");
            expect(result).toBe(true);
            expect(locationMock.hash).toBe("/settings");
        });

        it("should add leading slash to paths without one", () => {
            const result = navigateTo("settings");
            expect(result).toBe(true);
            expect(locationMock.hash).toBe("/settings");
        });

        it("should handle empty paths", () => {
            const result = navigateTo("");
            expect(result).toBe(true);
            expect(locationMock.hash).toBe("/");
        });
    });

    describe("edge cases", () => {
        it("should handle case-insensitive URL schemes", () => {
            const result = navigateTo("HTTPS://example.com");
            expect(result).toBe(true);
            expect(locationMock.href).toBe("HTTPS://example.com");
        });

        it("should handle complex internal routes with query params", () => {
            const result = navigateTo("/settings/general?tab=advanced");
            expect(result).toBe(true);
            expect(locationMock.hash).toBe("/settings/general?tab=advanced");
        });
    });
});
