import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import {
    currentRoute,
    fakeAdminEndpoint,
    fakeOffers,
    fakeSettingsScreens,
    fakeTiers,
    offer,
    renderAdminApp,
    retentionOffer,
    settingsResponse,
    tier,
    type Offer,
    type RenderAdminAppOptions,
    type Tier,
} from "@test-utils/acceptance";
import { offersScreen } from "./offers.screen";

// Offers only exist with Stripe connected; the Growth section's button is
// disabled otherwise.
function withStripe(): RenderAdminAppOptions {
    return {
        boot: {
            browseSettings: {
                response: settingsResponse({
                    settings: {
                        stripe_connect_publishable_key: "pk_test_123",
                        stripe_connect_secret_key: "sk_test_123",
                        stripe_connect_display_name: "Dummy",
                        stripe_connect_account_id: "acct_123",
                    },
                }),
            },
        },
    };
}

function supporterTier(): Tier {
    return tier({ name: "Supporter", monthly_price: 500, yearly_price: 5000 });
}

/** The legacy fixture's world: two active signup offers, one archived. */
function signupOffers(supporter: Tier): Offer[] {
    const tierRef = { id: supporter.id, name: supporter.name };
    return [
        offer({ name: "First offer", code: "first-offer", display_title: "First offer", amount: 10, duration: "once", tier: tierRef }),
        offer({ name: "Second offer", code: "second-offer", display_title: "Second offer", amount: 12, duration: "repeating", duration_in_months: 3, tier: tierRef }),
        offer({ name: "Third offer", code: "third-offer", display_title: "Third offer", amount: 12, status: "archived", tier: tierRef }),
    ];
}

describe("Offers", () => {
    it("opens the offers modal from the growth settings section", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings", withStripe());

        await offersScreen.openListModal();
        await expect.element(offersScreen.listModal()).toBeVisible();
    });

    it("opens the add-offer modal from the offers list", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings/offers/edit", withStripe());

        await offersScreen.newOfferButton().click();
        await expect.element(offersScreen.addModal()).toBeVisible();
    });

    it("can add a new offer", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        const created = offer({
            id: "6487ea6464fca78ec2fff5fe",
            name: "Coffee Tuesdays",
            code: "coffee-tuesdays",
            display_title: "Coffee Tuesdays",
            amount: 5,
            tier: { id: supporter.id, name: supporter.name },
        });
        const addApi = fakeAdminEndpoint("POST", "/offers/", { offers: [created] });
        fakeAdminEndpoint("GET", `/offers/${created.id}/`, { offers: [created] });
        await renderAdminApp("/settings/offers/new", withStripe());

        const sidebar = offersScreen.addSidebar();
        await expect.element(sidebar).toBeVisible();
        await sidebar.getByPlaceholder("Black Friday", { exact: true }).fill("Coffee Tuesdays");
        await sidebar.getByLabelText("Amount off").fill("5");
        await offersScreen.publishButton().click();

        await expect.poll(() => addApi.lastRequest?.body).toMatchObject({
            offers: [{ name: "Coffee Tuesdays", code: "coffee-tuesdays" }],
        });
        await expect.element(offersScreen.successModal()).toBeVisible();
    });

    it("errors if required fields are missing", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings/offers/new", withStripe());

        const addModal = offersScreen.addModal();
        await addModal.getByText("First-payment", { exact: true }).first().click();
        await offersScreen.selectOption("Multiple-months").click();
        await offersScreen.durationMonthsInput().fill("0");
        await offersScreen.publishButton().click();

        const sidebar = offersScreen.addSidebar();
        await expect.element(sidebar).toHaveTextContent(/Name is required/);
        await expect.element(sidebar).toHaveTextContent(/Code is required/);
        await expect.element(sidebar).toHaveTextContent(/Enter an amount between 1 and 100%./);
        await expect.element(sidebar).toHaveTextContent(/Display title is required/);
        await expect.element(sidebar).toHaveTextContent(/Enter a whole number of months \(1 or more\)./);
    });

    it("errors if the offer code is already taken", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        fakeAdminEndpoint(
            "POST",
            "/offers/",
            {
                errors: [
                    {
                        message: "Validation error, cannot edit offer.",
                        context: "Offer `code` must be unique. Please change and try again.",
                    },
                ],
            },
            { status: 400 },
        );
        await renderAdminApp("/settings/offers/new", withStripe());

        const sidebar = offersScreen.addSidebar();
        await expect.element(sidebar).toBeVisible();
        await sidebar.getByPlaceholder("Black Friday", { exact: true }).fill("Coffee Tuesdays");
        await sidebar.getByLabelText("Amount off").fill("10");
        await offersScreen.publishButton().click();

        await expect.element(offersScreen.errorToast()).toHaveTextContent(/Offer `code` must be unique. Please change and try again./);
    });

    it("shows validation errors when publishing an empty offer", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings/offers/new", withStripe());

        await offersScreen.publishButton().click();

        const sidebar = offersScreen.addSidebar();
        await expect.element(sidebar).toHaveTextContent(/Name is required/);
        await expect.element(sidebar).toHaveTextContent(/Code is required/);
        await expect.element(sidebar).toHaveTextContent(/Enter an amount between 1 and 100%./);
        await expect.element(sidebar).toHaveTextContent(/Display title is required/);
    });

    it("can view active offers", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings/offers/edit", withStripe());

        const modal = offersScreen.listModal();
        await expect.element(modal).toHaveTextContent("First offer");
        await expect.element(modal).toHaveTextContent("Second offer");
        await expect.element(modal).not.toHaveTextContent("Third offer");
    });

    it("can view archived offers", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        fakeOffers(signupOffers(supporter));
        await renderAdminApp("/settings/offers/edit", withStripe());

        await expect.element(offersScreen.listModal()).toHaveTextContent("First offer");
        await offersScreen.showArchivedOffers();
        await expect.element(offersScreen.listModal()).toHaveTextContent("Third offer");
    });

    it("sorts signup and retention offers by date, name and redemptions", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        const tierRef = { id: supporter.id, name: supporter.name };
        fakeTiers([supporter]);
        fakeOffers([
            offer({ name: "Alpha signup", created_at: "2026-01-04T12:00:00.000Z", redemption_count: 5, tier: tierRef }),
            offer({ name: "Zulu signup", created_at: "2026-01-01T12:00:00.000Z", redemption_count: 1, tier: tierRef }),
            retentionOffer({ name: "Monthly retention offer", created_at: "2026-01-03T12:00:00.000Z", redemption_count: 7 }),
            retentionOffer({ name: "Yearly retention offer", cadence: "year", created_at: "2026-01-02T12:00:00.000Z", redemption_count: 3 }),
        ]);
        await renderAdminApp("/settings/offers/edit", withStripe());

        const rows = offersScreen.tableRows();
        await expect(rows).toHaveCount(4);

        const expectOrder = async (names: string[]) => {
            for (const [index, name] of names.entries()) {
                await expect.element(rows.nth(index)).toHaveTextContent(name);
            }
        };

        await expectOrder(["Alpha signup", "Monthly retention", "Yearly retention", "Zulu signup"]);

        await offersScreen.sortOffersBy("Name");
        await expectOrder(["Zulu signup", "Yearly retention", "Monthly retention", "Alpha signup"]);

        await offersScreen.toggleSortDirection("Descending");
        await expectOrder(["Alpha signup", "Monthly retention", "Yearly retention", "Zulu signup"]);

        await offersScreen.sortOffersBy("Redemptions");
        await expectOrder(["Zulu signup", "Yearly retention", "Alpha signup", "Monthly retention"]);

        await offersScreen.toggleSortDirection("Ascending");
        await expectOrder(["Monthly retention", "Alpha signup", "Yearly retention", "Zulu signup"]);

        await offersScreen.sortOffersBy("Date added");
        await expectOrder(["Alpha signup", "Monthly retention", "Yearly retention", "Zulu signup"]);
    });

    it("supports updating an offer", async () => {
        fakeSettingsScreens();
        const supporter = supporterTier();
        fakeTiers([supporter]);
        const offers = signupOffers(supporter);
        const firstOffer = offers[0];
        fakeOffers(offers);
        fakeAdminEndpoint("GET", `/offers/${firstOffer.id}/`, { offers: [firstOffer] });
        const editApi = fakeAdminEndpoint("PUT", `/offers/${firstOffer.id}/`, {
            offers: [{ ...firstOffer, code: "black-friday-offer" }],
        });
        await renderAdminApp("/settings/offers/edit", withStripe());

        await offersScreen.listModal().getByText("First offer").click();
        const updateModal = offersScreen.updateModal();
        await expect.element(updateModal).toBeVisible();

        const codeInput = updateModal.getByPlaceholder("black-friday");
        await expect.element(codeInput).toHaveValue(firstOffer.code);
        await codeInput.fill("");
        await updateModal.getByRole("button", { name: "Save" }).click();
        await expect.element(updateModal).toHaveTextContent(/Please enter a code/);

        await codeInput.fill("black-friday-offer");
        await updateModal.getByRole("button", { name: "Save" }).click();

        await expect.poll(() => editApi.lastRequest?.body).toMatchObject({
            offers: [{ id: firstOffer.id, name: "First offer", code: "black-friday-offer" }],
        });
    });

    describe("Retention offers", () => {
        function retentionWorld(retentionOffers: Offer[]): { supporter: Tier } {
            fakeSettingsScreens();
            const supporter = supporterTier();
            fakeTiers([supporter]);
            fakeOffers([...signupOffers(supporter), ...retentionOffers]);
            return { supporter };
        }

        function formatOfferDate(timestamp: string): string {
            return new Date(timestamp).toLocaleDateString("default", { year: "numeric", month: "short", day: "2-digit" });
        }

        it("lists monthly and yearly retention offers", async () => {
            retentionWorld([
                retentionOffer({
                    id: "retention-month-active",
                    name: "Monthly retention active",
                    code: "monthly-retention-active",
                    display_title: "Before you go",
                    amount: 25,
                    duration: "once",
                    redemption_count: 7,
                }),
                retentionOffer({
                    id: "retention-year-archived",
                    name: "Yearly retention archived",
                    code: "yearly-retention-archived",
                    display_title: "Stay with us",
                    cadence: "year",
                    amount: 100,
                    duration: "repeating",
                    duration_in_months: 2,
                    status: "archived",
                    redemption_count: 9,
                }),
                retentionOffer({
                    id: "retention-month-archived",
                    name: "Monthly retention archived",
                    code: "monthly-retention-archived",
                    amount: 30,
                    status: "archived",
                    redemption_count: 3,
                }),
            ]);
            await renderAdminApp("/settings/offers/edit", withStripe());

            const rows = offersScreen.retentionRows();
            await expect(rows).toHaveCount(2);

            const monthlyRow = rows.filter({ hasText: "Monthly retention" });
            await expect.element(monthlyRow).toHaveTextContent("Monthly retention");
            await expect.element(monthlyRow).toHaveTextContent("25% OFF");
            await expect.element(monthlyRow).toHaveTextContent("First payment");
            await expect.element(monthlyRow).toHaveTextContent("10");
            await expect.element(monthlyRow).toHaveTextContent("Active");
            await expect
                .element(offersScreen.retentionRedemptionsLink("monthly"))
                .toHaveAttribute("href", "/ghost/#/members?filter=offer_redemptions%3A%5Bretention-month-active%2Cretention-month-archived%5D");

            const yearlyRow = rows.filter({ hasText: "Yearly retention" });
            await expect.element(yearlyRow).toHaveTextContent("Yearly retention");
            await expect.element(yearlyRow).toHaveTextContent("Inactive");
            await expect.element(yearlyRow).toHaveTextContent("9");
            await expect
                .element(offersScreen.retentionRedemptionsLink("yearly"))
                .toHaveAttribute("href", "/ghost/#/members?filter=offer_redemptions%3A%5Bretention-year-archived%5D");
            await expect.element(yearlyRow).not.toHaveTextContent(/months free/i);
        });

        it("renders existing retention offers in edit mode", async () => {
            retentionWorld([
                retentionOffer({
                    id: "retention-month-active",
                    name: "Monthly retention active",
                    code: "monthly-retention-active",
                    display_title: "Stay monthly",
                    display_description: "Monthly description",
                    amount: 100,
                    duration: "repeating",
                    duration_in_months: 2,
                    redemption_count: 7,
                    created_at: "2026-02-17T12:00:00.000Z",
                    last_redeemed: "2026-02-18T12:00:00.000Z",
                }),
                retentionOffer({
                    id: "retention-year-active",
                    name: "Yearly retention active",
                    code: "yearly-retention-active",
                    display_title: "Stay yearly",
                    display_description: "Yearly description",
                    cadence: "year",
                    amount: 30,
                    duration: "once",
                    redemption_count: 4,
                    created_at: "2026-02-16T12:00:00.000Z",
                    last_redeemed: "2026-02-17T12:00:00.000Z",
                }),
                retentionOffer({
                    id: "retention-month-archived",
                    name: "Monthly retention archived",
                    code: "monthly-retention-archived",
                    display_title: "Older monthly retention",
                    amount: 30,
                    duration: "once",
                    status: "archived",
                    redemption_count: 4,
                    created_at: "2026-01-19T12:00:00.000Z",
                    last_redeemed: "2026-02-19T12:00:00.000Z",
                }),
                retentionOffer({
                    id: "retention-year-archived",
                    name: "Yearly retention archived",
                    code: "yearly-retention-archived",
                    display_title: "Older yearly retention",
                    cadence: "year",
                    amount: 100,
                    duration: "repeating",
                    duration_in_months: 1,
                    status: "archived",
                    redemption_count: 5,
                    created_at: "2026-01-25T12:00:00.000Z",
                    last_redeemed: "2026-02-18T12:00:00.000Z",
                }),
            ]);
            await renderAdminApp("/settings/offers/edit", withStripe());

            await offersScreen.listModal().getByText("Monthly retention", { exact: true }).click();
            const monthlyModal = offersScreen.retentionModal();
            await expect.element(monthlyModal).toBeVisible();
            await expect.element(monthlyModal).toHaveTextContent("11 redemptions");
            await expect.element(monthlyModal).toHaveTextContent("Last redemption");
            await expect.element(monthlyModal).toHaveTextContent(formatOfferDate("2026-02-19T12:00:00.000Z"));
            await expect
                .element(monthlyModal.getByRole("link", { name: "See members →" }))
                .toHaveAttribute("href", expect.stringContaining("offer_redemptions%3A%5Bretention-month-active%2Cretention-month-archived%5D"));
            await expect.element(monthlyModal.getByLabelText("Enable monthly retention")).toBeChecked();
            await expect.element(monthlyModal.getByLabelText("Display title")).toHaveValue("Stay monthly");
            await expect.element(monthlyModal.getByLabelText("Display description")).toHaveValue("Monthly description");
            await expect.element(monthlyModal.getByLabelText("Free months")).toHaveValue(2);

            await monthlyModal.getByRole("button", { name: "Cancel" }).click();
            await offersScreen.listModal().getByText("Yearly retention", { exact: true }).click();

            const yearlyModal = offersScreen.retentionModal();
            await expect.element(yearlyModal).toBeVisible();
            await expect.element(yearlyModal).toHaveTextContent("9 redemptions");
            await expect.element(yearlyModal).toHaveTextContent("Last redemption");
            await expect.element(yearlyModal).toHaveTextContent(formatOfferDate("2026-02-18T12:00:00.000Z"));
            await expect
                .element(yearlyModal.getByRole("link", { name: "See members →" }))
                .toHaveAttribute("href", expect.stringContaining("offer_redemptions%3A%5Bretention-year-active%2Cretention-year-archived%5D"));
            await expect.element(yearlyModal.getByLabelText("Enable yearly retention")).toBeChecked();
            await expect.element(yearlyModal.getByLabelText("Display title")).toHaveValue("Stay yearly");
            await expect.element(yearlyModal.getByLabelText("Display description")).toHaveValue("Yearly description");
            await expect.element(yearlyModal.getByLabelText("Amount off")).toHaveValue(30);
        });

        it("shows validation errors for invalid retention values on save", async () => {
            retentionWorld([retentionOffer({ id: "retention-month-active" })]);
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            const saveButton = retentionModal.getByRole("button", { name: /Save|Retry/ });
            await expect.element(saveButton).toBeEnabled();

            await retentionModal.getByLabelText("Amount off").fill("0");
            await saveButton.click();
            await expect.element(retentionModal.getByText("Enter an amount between 1 and 100%.")).toBeVisible();
            await expect.element(saveButton).toBeEnabled();

            await retentionModal.getByLabelText("Amount off").fill("150");
            await saveButton.click();
            await expect.element(retentionModal.getByText("Enter an amount between 1 and 100%.")).toBeVisible();
            await expect.element(saveButton).toBeEnabled();

            await retentionModal.getByText("Forever", { exact: true }).first().click();
            await offersScreen.selectOption("Multiple-months").click();

            await offersScreen.durationMonthsInput().fill("1.5");
            await saveButton.click();
            await expect.element(retentionModal.getByText("Enter a whole number of months between 1 and 99.")).toBeVisible();

            await offersScreen.durationMonthsInput().fill("1000");
            await expect.element(retentionModal.getByText("Enter a whole number of months between 1 and 99.")).toBeVisible();

            await retentionModal.getByRole("radio", { name: /Free month\(s\)/ }).click();
            await retentionModal.getByLabelText("Free months").fill("0");
            await saveButton.click();
            await expect.element(retentionModal.getByText("Enter a whole number of months between 1 and 99.")).toBeVisible();

            await retentionModal.getByLabelText("Free months").fill("1000");
            await expect.element(retentionModal.getByText("Enter a whole number of months between 1 and 99.")).toBeVisible();
            await expect.element(saveButton).toBeEnabled();
        });

        it("shows a save error toast when a retention save fails", async () => {
            retentionWorld([retentionOffer({ id: "retention-month-active" })]);
            fakeAdminEndpoint(
                "POST",
                "/offers/",
                {
                    errors: [
                        {
                            message: "Validation error, cannot create offer.",
                            context: "Offer `code` must be unique. Please change and try again.",
                        },
                    ],
                },
                { status: 400 },
            );
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByLabelText("Amount off").fill("35");
            await retentionModal.getByRole("button", { name: "Save" }).click();

            await expect.element(offersScreen.errorToast()).toHaveTextContent(/Offer `code` must be unique. Please change and try again./);
        });

        it("hides the repeating duration option for yearly retention offers", async () => {
            retentionWorld([
                retentionOffer({
                    id: "retention-year-active",
                    name: "Yearly retention",
                    code: "yearly-retention",
                    display_title: "Stay yearly",
                    cadence: "year",
                    duration: "once",
                }),
            ]);
            await renderAdminApp("/settings/offers/edit/retention/yearly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByText("First-payment", { exact: true }).first().click();

            await expect.element(offersScreen.selectOption("First-payment")).toBeVisible();
            await expect.element(offersScreen.selectOption("Forever")).toBeVisible();
            await expect(offersScreen.selectOption("Multiple-months")).toHaveCount(0);
            await userEvent.keyboard("{Escape}");
        });

        it("renders the portal preview for retention offers", async () => {
            retentionWorld([retentionOffer({ id: "retention-month-active" })]);
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByLabelText("Display title").fill("Before you go");
            await retentionModal.getByLabelText("Display description").fill("Please stay <script>alert(1)</script>");
            await retentionModal.getByRole("radio", { name: /Free month\(s\)/ }).click();
            await retentionModal.getByLabelText("Free months").fill("2");

            // The preview src double-encodes display fields (params are
            // encodeURIComponent'd before URLSearchParams encodes them again).
            const previewParams = () => {
                const src = offersScreen.portalPreview().query()?.getAttribute("src");
                if (!src) {
                    return new URLSearchParams();
                }
                return new URLSearchParams(new URL(src).hash.split("?")[1] ?? "");
            };

            await expect.poll(() => decodeURIComponent(previewParams().get("display_title") ?? "")).toBe("Before you go");
            let params = previewParams();
            expect(decodeURIComponent(params.get("display_description") ?? "")).toBe("Please stay <script>alert(1)</script>");
            expect(params.get("redemption_type")).toBe("retention");
            expect(params.get("type")).toBe("percent");
            expect(params.get("amount")).toBe("100");
            expect(params.get("duration")).toBe("repeating");
            expect(params.get("duration_in_months")).toBe("2");
            expect(params.get("cadence")).toBe("month");
            expect(params.get("tier_id")).toBeTruthy();

            // Clearing the field keeps the last non-zero months in the preview.
            await retentionModal.getByLabelText("Free months").fill("");
            await expect.poll(() => previewParams().get("duration_in_months")).toBe("2");
            params = previewParams();
            expect(params.get("type")).toBe("percent");
            expect(params.get("amount")).toBe("100");

            await retentionModal.getByRole("radio", { name: /Percentage discount/ }).click();
            await retentionModal.getByLabelText("Amount off").fill("35");
            await expect.poll(() => previewParams().get("amount")).toBe("35");
            expect(previewParams().get("type")).toBe("percent");
        });

        it("creates a new retention offer when terms change", async () => {
            retentionWorld([retentionOffer({ id: "retention-month-active" })]);
            const addApi = fakeAdminEndpoint("POST", "/offers/", {
                offers: [{ id: "retention-offer-monthly", name: "Monthly retention", code: "monthly-retention" }],
            });
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByLabelText("Display title").fill("Before you go");
            await retentionModal.getByLabelText("Display description").fill("Stay for a little longer");
            await retentionModal.getByRole("radio", { name: /Percentage discount/ }).click();
            await retentionModal.getByLabelText("Amount off").fill("35");
            await retentionModal.getByRole("button", { name: "Save" }).click();

            await expect.poll(() => addApi.lastRequest?.body).toBeTruthy();
            expect(addApi.lastRequest?.body).toMatchObject({
                offers: [
                    {
                        display_title: "Before you go",
                        display_description: "Stay for a little longer",
                        cadence: "month",
                        amount: 35,
                        duration: "forever",
                        duration_in_months: null,
                        currency: null,
                        status: "active",
                        redemption_type: "retention",
                        tier: null,
                        type: "percent",
                        currency_restriction: false,
                    },
                ],
            });

            const createdOffer = (addApi.lastRequest?.body as { offers: Array<{ name: string; code: string }> }).offers[0];
            expect(createdOffer.name).toMatch(/^Retention 35% off forever \([a-f0-9]{8}\)$/);
            expect(createdOffer.code).toMatch(/^[a-f0-9]{8}$/);

            // The post-save goBack is deferred by useForm's savingDelay; it
            // must land inside this test or it renavigates the next one.
            await expect.poll(currentRoute).toBe("/settings/offers/edit");
        });

        it("edits the existing retention offer when only display fields change", async () => {
            retentionWorld([
                retentionOffer({
                    id: "retention-month-active",
                    display_title: "Old title",
                    display_description: "Old description",
                }),
            ]);
            const addApi = fakeAdminEndpoint("POST", "/offers/", { offers: [] });
            const editApi = fakeAdminEndpoint("PUT", "/offers/retention-month-active/", {
                offers: [{ id: "retention-month-active", name: "Monthly retention", code: "monthly-retention" }],
            });
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByLabelText("Display title").fill("New title");
            await retentionModal.getByLabelText("Display description").fill("New description");
            await retentionModal.getByRole("button", { name: "Save" }).click();

            await expect.poll(() => editApi.lastRequest?.body).toBeTruthy();
            expect(editApi.lastRequest?.body).toMatchObject({
                offers: [
                    {
                        id: "retention-month-active",
                        display_title: "New title",
                        display_description: "New description",
                        status: "active",
                    },
                ],
            });
            expect(addApi.requests).toHaveLength(0);

            // The post-save goBack is deferred by useForm's savingDelay; it
            // must land inside this test or it renavigates the next one.
            await expect.poll(currentRoute).toBe("/settings/offers/edit");
        });

        it("creates an archived retention draft and archives the active offer when disabled", async () => {
            retentionWorld([
                retentionOffer({
                    id: "retention-month-active",
                    display_title: "Before you go",
                    duration: "repeating",
                    duration_in_months: 3,
                }),
            ]);
            const addApi = fakeAdminEndpoint("POST", "/offers/", {
                offers: [{ id: "retention-offer-monthly-archived", name: "Monthly retention", code: "monthly-retention" }],
            });
            const editApi = fakeAdminEndpoint("PUT", "/offers/retention-month-active/", {
                offers: [{ id: "retention-month-active", status: "archived" }],
            });
            await renderAdminApp("/settings/offers/edit/retention/monthly", withStripe());

            const retentionModal = offersScreen.retentionModal();
            await retentionModal.getByLabelText("Amount off").fill("35");
            await offersScreen.durationMonthsInput().fill("0");
            await retentionModal.getByRole("switch", { name: "Enable monthly retention" }).click();
            await retentionModal.getByRole("button", { name: "Save" }).click();

            await expect.poll(() => editApi.lastRequest?.body).toBeTruthy();
            await expect.poll(() => addApi.lastRequest?.body).toBeTruthy();

            expect(editApi.lastRequest?.body).toMatchObject({
                offers: [{ id: "retention-month-active", status: "archived" }],
            });
            expect(addApi.lastRequest?.body).toMatchObject({
                offers: [
                    {
                        cadence: "month",
                        amount: 35,
                        duration: "repeating",
                        duration_in_months: 1,
                        status: "archived",
                        redemption_type: "retention",
                        tier: null,
                        type: "percent",
                        currency_restriction: false,
                    },
                ],
            });

            // The post-save goBack is deferred by useForm's savingDelay; it
            // must land inside this test or it renavigates the next one.
            await expect.poll(currentRoute).toBe("/settings/offers/edit");
        });
    });
});
