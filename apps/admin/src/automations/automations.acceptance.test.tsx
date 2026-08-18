import { describe, expect, it } from "vitest";

import { automation, fakeAutomations, renderAdminApp } from "@test-utils/acceptance";
import { automationsScreen } from "./automations.screen";

// Automations ships behind the `automations` beta labs flag.
const AUTOMATIONS_ENABLED = { labs: { automations: true } };
const RUN_ANALYTICS_ENABLED = { labs: { automations: true, automationRunAnalytics: true } };

describe("Automations list", () => {
    it("renders the automations page", async () => {
        fakeAutomations([]);
        await renderAdminApp("/automations", AUTOMATIONS_ENABLED);

        await expect.element(automationsScreen.heading()).toBeVisible();
        await expect.element(automationsScreen.columnHeader("Last entry")).not.toBeInTheDocument();
    });

    it("lists the welcome automations", async () => {
        fakeAutomations([
            automation({
                name: "Free member welcome flow",
                slug: "member-welcome-email-free",
                status: "active",
                stats: {
                    last_run_created_at: "2026-07-21T07:12:00.000Z",
                    total_run_count: 1432,
                    in_progress_run_count: 118,
                },
            }),
            automation({
                name: "Paid member welcome flow",
                slug: "member-welcome-email-paid",
                status: "inactive",
                stats: {
                    last_run_created_at: null,
                    total_run_count: 0,
                    in_progress_run_count: 0,
                },
            }),
        ]);
        await renderAdminApp("/automations", RUN_ANALYTICS_ENABLED);

        await expect.element(automationsScreen.link("Free member welcome flow")).toBeVisible();
        await expect.element(automationsScreen.columnHeader("Last entry")).toBeVisible();
        await expect.element(automationsScreen.columnHeader("Total entries")).toBeVisible();
        await expect.element(automationsScreen.columnHeader("In progress")).toBeVisible();
        const row = automationsScreen.rows();
        await expect.element(row).toHaveTextContent("Welcome new free members after they sign up.");
        await expect.element(row).toHaveTextContent("1,432");
        await expect.element(row).toHaveTextContent("118");
        await expect.element(row).toHaveTextContent("Live");
        // Stripe is disconnected in the default boot, which hides the paid welcome flow.
        await expect(automationsScreen.rows()).toHaveCount(1);
    });
});
