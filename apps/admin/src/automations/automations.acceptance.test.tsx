import { describe, expect, it } from "vitest";

import { automation, fakeAutomations, renderAdminApp } from "@test-utils/acceptance";
import { automationsScreen } from "./automations.screen";

// Automations ships behind the `automations` beta labs flag.
const AUTOMATIONS_ENABLED = { labs: { automations: true } };

describe("Automations list", () => {
    it("renders the automations page", async () => {
        fakeAutomations([]);
        await renderAdminApp("/automations", AUTOMATIONS_ENABLED);

        await expect.element(automationsScreen.heading()).toBeVisible();
    });

    it("lists the welcome automations", async () => {
        fakeAutomations([
            automation({ name: "Free member welcome flow", slug: "member-welcome-email-free", status: "active" }),
            automation({ name: "Paid member welcome flow", slug: "member-welcome-email-paid", status: "inactive" }),
        ]);
        await renderAdminApp("/automations", AUTOMATIONS_ENABLED);

        await expect.element(automationsScreen.link("Free member welcome flow")).toBeVisible();
        const row = automationsScreen.rows();
        await expect.element(row).toHaveTextContent("Welcome new free members after they sign up.");
        await expect.element(row).toHaveTextContent("Live");
        // Stripe is disconnected in the default boot, which hides the paid welcome flow.
        await expect(automationsScreen.rows()).toHaveCount(1);
    });
});
