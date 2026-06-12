import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapAdminAfterAuth, reloadAdmin, reloadAdminToSignin } from "./reload";
import { SIGNIN_REDIRECT_KEY } from "./signin-redirect";

const originalLocation = window.location;

function stubLocation({ pathname = "/ghost/", search = "", hash = "" } = {}) {
    const replace = vi.fn();
    const reload = vi.fn();

    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            ...originalLocation,
            origin: "http://localhost",
            pathname,
            search,
            hash,
            replace,
            reload,
        },
    });

    return { replace, reload };
}

afterEach(() => {
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
    window.sessionStorage.clear();
});

describe("reloadAdmin", () => {
    it("replaces the URL with the admin route and forces a reload for hash-only changes", () => {
        const { replace, reload } = stubLocation({ hash: "#/tags" });

        reloadAdmin("/signin");

        expect(replace).toHaveBeenCalledWith("/ghost/#/signin");
        expect(reload).toHaveBeenCalled();
    });

    it("only reloads when already at the target URL", () => {
        const { replace, reload } = stubLocation({ hash: "#/signin" });

        reloadAdmin("/signin");

        expect(replace).not.toHaveBeenCalled();
        expect(reload).toHaveBeenCalled();
    });

    it("defaults to the root route", () => {
        const { replace, reload } = stubLocation({ hash: "#/tags" });

        reloadAdmin();

        expect(replace).toHaveBeenCalledWith("/ghost/#/");
        expect(reload).toHaveBeenCalled();
    });
});

describe("bootstrapAdminAfterAuth", () => {
    it("reloads in place without consuming the stored deep link", () => {
        const { replace, reload } = stubLocation({ hash: "#/signin" });
        window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, "/settings/newsletters");

        bootstrapAdminAfterAuth();

        // the auth gate consumes the deep link client-side after the reload;
        // navigating and reloading in one synchronous sequence raced the two
        // navigations and could drop the hash entirely
        expect(replace).not.toHaveBeenCalled();
        expect(reload).toHaveBeenCalled();
        expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBe("/settings/newsletters");
    });
});

describe("reloadAdminToSignin", () => {
    it("clears the stored deep link and reloads at the signin screen", () => {
        const { replace, reload } = stubLocation({ hash: "#/tags" });
        window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, "/settings/newsletters");

        reloadAdminToSignin();

        expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBeNull();
        expect(replace).toHaveBeenCalledWith("/ghost/#/signin");
        expect(reload).toHaveBeenCalled();
    });
});
