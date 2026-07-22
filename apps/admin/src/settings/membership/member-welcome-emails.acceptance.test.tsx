import {describe, expect, it, onTestFinished, vi} from "vitest";
import {page, userEvent} from "vitest/browser";

import {
    configResponse,
    currentRoute,
    fakeAdminEndpoint,
    fakeNewsletters,
    fakeSettingsScreens,
    fakeTiers,
    newsletter,
    renderAdminApp,
    settingsResponse,
    tier,
    type RenderAdminAppOptions,
} from "@test-utils/acceptance";
import {settingsScreen} from "@/settings/settings.screen";

const lexical = (text: string) => JSON.stringify({
    root: {
        children: [{
            children: [{detail: 0, format: 0, mode: "normal", style: "", text, type: "extended-text", version: 1}],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
        }],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
    },
});

const freeWelcomeEmail = {
    id: "free-welcome-email-id",
    status: "active",
    name: "Free member welcome flow",
    slug: "member-welcome-email-free",
    subject: "Welcome to Test Site",
    lexical: lexical("Welcome {name} to our site!"),
    sender_name: null,
    sender_email: null,
    sender_reply_to: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: null,
};

const paidWelcomeEmail = {
    ...freeWelcomeEmail,
    id: "paid-welcome-email-id",
    status: "inactive",
    name: "Paid member welcome flow",
    slug: "member-welcome-email-paid",
    subject: "Welcome to your paid subscription",
};

type AutomatedEmailFixture = Omit<typeof freeWelcomeEmail, "sender_name" | "sender_email" | "sender_reply_to"> & {
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string | null;
};

const automatedEmailDesign = {
    id: "default-automated-email-design",
    slug: "default-automated-email",
    background_color: "light",
    header_background_color: "transparent",
    header_image: null,
    show_header_icon: true,
    show_header_title: true,
    footer_content: null,
    button_color: null,
    button_corners: "square",
    button_style: "fill",
    link_color: null,
    link_style: "accent",
    body_font_category: "sans_serif",
    title_font_category: "sans_serif",
    title_font_weight: "bold",
    image_corners: "square",
    divider_color: null,
    section_title_color: null,
    show_badge: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: null,
};

const previewResponse = (subject = "Preview Subject", html = "<!doctype html><html><body><p>Preview content</p></body></html>") => ({
    automated_emails: [{html, plaintext: "Preview content", subject}],
});

function fakeAutomatedEmails(emails: AutomatedEmailFixture[] = [freeWelcomeEmail]) {
    return fakeAdminEndpoint("GET", "/automated_emails/", {automated_emails: emails});
}

function fakeRecentPosts() {
    fakeAdminEndpoint("GET", /^\/posts\/\?filter=status%3Apublished&fields=/, {posts: [], meta: {pagination: {page: 1, limit: 5, pages: 0, total: 0, next: null, prev: null}}});
}

function fakeDefaultNewsletter(overrides: Record<string, unknown> = {}) {
    fakeNewsletters([newsletter({
        sender_name: "Sender",
        sender_email: "default@example.com",
        sender_reply_to: "support",
        ...overrides,
    })]);
}

async function renderWelcomeEmails(emails: AutomatedEmailFixture[] = [freeWelcomeEmail], options?: RenderAdminAppOptions) {
    fakeSettingsScreens();
    fakeDefaultNewsletter();
    fakeAutomatedEmails(emails);
    fakeRecentPosts();
    await renderAdminApp("/settings/memberemails", options);
    return settingsScreen.memberEmails();
}

async function openWelcomeEmailModal(emails: AutomatedEmailFixture[] = [freeWelcomeEmail], options?: RenderAdminAppOptions) {
    await renderWelcomeEmails(emails, options);
    await settingsScreen.freeWelcomeEmailPreview().click();
    const modal = settingsScreen.welcomeEmailModal();
    await expect.element(modal).toBeVisible();
    await expect.element(modal.getByRole("textbox").first()).toBeVisible();
    return modal;
}

async function editorElement(modal: ReturnType<typeof page.getByTestId>) {
    const editor = modal.getByRole("textbox").first();
    await expect.element(editor).toBeVisible();
    return editor;
}

async function clearEditor(modal: ReturnType<typeof page.getByTestId>) {
    const editor = await editorElement(modal);
    await editor.fill("");
    await editor.click();
    return editor;
}

async function chooseSlashMenuItem(modal: ReturnType<typeof page.getByTestId>, command: string, label: string) {
    await clearEditor(modal);
    await userEvent.keyboard(`/${command}`);
    await expect.element(page.getByText(label, {exact: true})).toBeVisible();
    await userEvent.keyboard("{Enter}");
}

function pasteText(content: string) {
    const activeElement = document.activeElement;
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", content);
    activeElement?.dispatchEvent(new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
    }));
}

describe("Member welcome emails", () => {
    it("previews the unsaved draft only after Preview is selected", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails();
        fakeRecentPosts();
        const previewApi = fakeAdminEndpoint("POST", `/automated_emails/${freeWelcomeEmail.id}/preview/`, previewResponse());
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();
        const modal = page.getByTestId("welcome-email-modal");
        const editor = await editorElement(modal);
        await editor.click();
        await userEvent.keyboard(" Draft note");
        expect(previewApi.requests).toHaveLength(0);

        await modal.getByTestId("welcome-email-mode-preview").click();

        await expect.element(modal.getByTestId("welcome-email-preview-iframe")).toBeVisible();
        const previewBody = previewApi.lastRequest?.body as {subject?: string; lexical?: string} | undefined;
        expect(previewApi.requests).toHaveLength(1);
        expect(previewBody?.subject).toBe(freeWelcomeEmail.subject);
        expect(previewBody?.lexical).toContain("Draft note");
        await expect.element(modal.getByTestId("welcome-email-preview-iframe")).toHaveAttribute("sandbox", "allow-same-origin allow-popups allow-popups-to-escape-sandbox");

        await modal.getByTestId("welcome-email-mode-edit").click();
        await expect.element(editor).toHaveTextContent("Draft note");
    });

    it("keeps a raw subject template editable and saves it without rendered replacements", async () => {
        const templatedEmail = {...freeWelcomeEmail, subject: "Welcome {first_name}"};
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails([templatedEmail]);
        fakeRecentPosts();
        fakeAdminEndpoint("POST", `/automated_emails/${templatedEmail.id}/preview/`, previewResponse("Welcome Jamie"));
        const editApi = fakeAdminEndpoint("PUT", `/automated_emails/${templatedEmail.id}/`, {automated_emails: [templatedEmail]});
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();
        const modal = page.getByTestId("welcome-email-modal");
        await modal.getByTestId("welcome-email-mode-preview").click();
        const subject = modal.getByTestId("welcome-email-preview-subject");
        await expect.element(subject).toHaveValue("Welcome {first_name}");
        await subject.fill("Welcome {first_name}!");
        await modal.getByRole("button", {name: "Save"}).click();

        await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({automated_emails: [{subject: "Welcome {first_name}!"}]});
    });

    it("shows invalid draft preview errors inline without issuing another request", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails();
        fakeRecentPosts();
        const previewApi = fakeAdminEndpoint("POST", `/automated_emails/${freeWelcomeEmail.id}/preview/`, previewResponse());
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();
        const modal = page.getByTestId("welcome-email-modal");
        await modal.getByTestId("welcome-email-mode-preview").click();
        await expect.element(modal.getByTestId("welcome-email-preview-iframe")).toBeVisible();
        expect(previewApi.requests).toHaveLength(1);

        await modal.getByTestId("welcome-email-preview-subject").fill("   ");
        await modal.getByTestId("welcome-email-mode-edit").click();
        await modal.getByTestId("welcome-email-mode-preview").click();

        await expect.element(modal.getByTestId("welcome-email-preview-error")).toHaveTextContent("A subject is required");
        expect(previewApi.requests).toHaveLength(1);
    });

    it("refetches the current draft whenever Preview is re-entered", async () => {
        const modal = await openWelcomeEmailModal();
        const previewApi = fakeAdminEndpoint("POST", `/automated_emails/${freeWelcomeEmail.id}/preview/`, previewResponse());

        await modal.getByTestId("welcome-email-mode-preview").click();
        await expect.element(modal.getByTestId("welcome-email-preview-iframe")).toBeVisible();
        await modal.getByTestId("welcome-email-mode-edit").click();
        await modal.getByTestId("welcome-email-mode-preview").click();
        await expect.element(modal.getByTestId("welcome-email-preview-iframe")).toBeVisible();

        expect(previewApi.requests).toHaveLength(2);
    });

    it("sizes a long preview iframe to its document height", async () => {
        const modal = await openWelcomeEmailModal();
        fakeAdminEndpoint("POST", `/automated_emails/${freeWelcomeEmail.id}/preview/`, previewResponse(
            "Long preview",
            `<!doctype html><html><body>${"<p>Long preview paragraph.</p>".repeat(80)}</body></html>`,
        ));

        await modal.getByTestId("welcome-email-mode-preview").click();
        const previewFrame = modal.getByTestId("welcome-email-preview-iframe");
        await expect.element(previewFrame).toBeVisible();
        await expect(modal.getByTestId("welcome-email-preview-loading")).toHaveCount(0);

        const iframe = previewFrame.element() as HTMLIFrameElement;
        const documentHeight = Math.max(
            iframe.contentDocument?.documentElement.scrollHeight || 0,
            iframe.contentDocument?.body.scrollHeight || 0,
        );
        expect(documentHeight).toBeGreaterThan(600);
        expect(iframe.clientHeight).toBe(documentHeight);
    });

    it("closes the test dropdown before closing the welcome-email modal", async () => {
        fakeAdminEndpoint("POST", `/automated_emails/${freeWelcomeEmail.id}/preview/`, previewResponse());
        const modal = await openWelcomeEmailModal();
        await modal.getByTestId("welcome-email-mode-preview").click();
        await modal.getByRole("button", {name: "Test"}).click();
        const dropdown = page.getByTestId("test-email-dropdown");
        await expect.element(dropdown).toBeVisible();

        await userEvent.keyboard("{Escape}");
        await expect(dropdown).toHaveCount(0);
        await expect.element(modal).toBeVisible();
    });

    it("only asks for close confirmation after the draft becomes dirty", async () => {
        const modal = await openWelcomeEmailModal();
        (modal.getByRole("button", {name: "Close"}).element() as HTMLElement).focus();
        await userEvent.keyboard("{Escape}");
        await expect(modal).toHaveCount(0);
        await expect(settingsScreen.confirmationModal()).toHaveCount(0);

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();
        const reopened = page.getByTestId("welcome-email-modal");
        const editor = await editorElement(reopened);
        await editor.click();
        await userEvent.keyboard(" Updated");
        await reopened.getByRole("button", {name: "Close"}).click();

        await expect.element(settingsScreen.confirmationModal()).toBeVisible();
        await settingsScreen.confirmationAction("Stay").click();
        await expect.element(reopened).toBeVisible();
    });

    it("keeps the modal open when Escape is pressed from a Koenig link input", async () => {
        const modal = await openWelcomeEmailModal();
        const linkInput = document.createElement("input");
        linkInput.dataset.kgLinkInput = "";
        document.body.appendChild(linkInput);
        linkInput.focus();

        await userEvent.keyboard("{Escape}");

        await expect.element(modal).toBeVisible();
        expect(window.location.hash).toContain("/settings/memberemails");
        linkInput.remove();
    });

    it("pastes a URL and renders the fetched embed metadata", async () => {
        const modal = await openWelcomeEmailModal();
        const oembedApi = fakeAdminEndpoint("GET", /^\/oembed\/\?/, {
            type: "video",
            html: '<iframe src="https://www.youtube.com/embed/example"></iframe>',
        });
        await clearEditor(modal);

        pasteText("https://ghost.org/");

        await expect.element(modal.getByTestId("embed-iframe")).toBeVisible();
        expect(oembedApi.lastRequest?.url).toContain("url=https%3A%2F%2Fghost.org%2F");
    });

    it("inserts a bookmark and renders the fetched metadata", async () => {
        const modal = await openWelcomeEmailModal();
        const oembedApi = fakeAdminEndpoint("GET", /^\/oembed\/\?/, {
            url: "https://ghost.org/",
            metadata: {
                title: "Ghost: The Creator Economy Platform",
                description: "Build independent publishing businesses and memberships.",
                publisher: "Ghost.org",
                author: "Ghost",
            },
        });
        await chooseSlashMenuItem(modal, "bookmark", "Bookmark");
        const bookmarkUrl = modal.getByTestId("bookmark-url");
        await expect.element(bookmarkUrl).toBeVisible();
        await bookmarkUrl.fill("https://ghost.org/");
        await userEvent.keyboard("{Enter}");

        await expect.element(modal.getByTestId("bookmark-title")).toHaveTextContent("Ghost: The Creator Economy Platform");
        expect(oembedApi.lastRequest?.url).toContain("type=bookmark");
    });

    it.each([
        ["call-to-action", "Call to action", "call-to-action"],
        ["product", "Product", "product"],
    ])("inserts the %s card from the slash menu", async (command, label, card) => {
        const modal = await openWelcomeEmailModal();

        await chooseSlashMenuItem(modal, command, label);

        const cardElement = document.querySelector(`[data-kg-card="${card}"]`);
        expect(cardElement).not.toBeNull();
        await expect.element(page.elementLocator(cardElement!)).toBeVisible();
    });

    it.each([
        [false, undefined],
        [true, {apiKey: "test-klipy-key", contentFilter: "off"}],
    ])("shows GIF in the slash menu only when Klipy configured is %s", async (configured, klipy) => {
        const config = configResponse();
        config.config.klipy = klipy;
        const modal = await openWelcomeEmailModal([freeWelcomeEmail], {boot: {browseConfig: {response: config}}});
        await clearEditor(modal);
        await userEvent.keyboard("/");
        await expect.element(page.getByText("Image", {exact: true})).toBeVisible();

        if (configured) {
            await expect.element(page.getByText("GIF", {exact: true})).toBeVisible();
        } else {
            await expect(page.getByText("GIF", {exact: true})).toHaveCount(0);
        }
    });

    it("uses automated sender overrides instead of newsletter sender details", async () => {
        const email = {
            ...freeWelcomeEmail,
            sender_name: "Automated Sender",
            sender_email: "automated@example.com",
            sender_reply_to: "reply-automated@example.com",
        };
        fakeSettingsScreens();
        fakeDefaultNewsletter({sender_name: "Newsletter Sender", sender_email: "newsletter@example.com"});
        fakeAutomatedEmails([email]);
        fakeRecentPosts();
        fakeAdminEndpoint("POST", `/automated_emails/${email.id}/preview/`, previewResponse());
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();
        const modal = page.getByTestId("welcome-email-modal");
        await modal.getByTestId("welcome-email-mode-preview").click();

        await expect.element(modal).toHaveTextContent("Automated Sender");
        await expect.element(modal).toHaveTextContent("automated@example.com");
        await expect.element(modal).toHaveTextContent("reply-automated@example.com");
        await expect(modal.getByText("newsletter@example.com")).toHaveCount(0);
    });

    it("falls back to newsletter sender details when automated overrides are blank", async () => {
        const email = {...freeWelcomeEmail, sender_name: "   ", sender_email: "   ", sender_reply_to: "   "};
        fakeSettingsScreens();
        fakeDefaultNewsletter({sender_name: "Newsletter Sender", sender_email: "newsletter@example.com", sender_reply_to: "support"});
        fakeAutomatedEmails([email]);
        fakeRecentPosts();
        fakeAdminEndpoint("POST", `/automated_emails/${email.id}/preview/`, previewResponse());
        await renderAdminApp("/settings/memberemails");

        const section = settingsScreen.memberEmails();
        await expect.element(section.getByTestId("free-welcome-email-title")).toHaveTextContent("Free members welcome email");
        await section.getByTestId("free-welcome-email-preview").click();
        const modal = page.getByTestId("welcome-email-modal");
        await modal.getByTestId("welcome-email-mode-preview").click();

        await expect.element(modal).toHaveTextContent("Newsletter Sender");
        await expect.element(modal).toHaveTextContent("newsletter@example.com");
        await expect.element(modal).toHaveTextContent("support@example.com");
    });

    it("creates an inactive row before editing a welcome email that does not exist", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails([]);
        fakeRecentPosts();
        const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: [{...freeWelcomeEmail, status: "inactive"}]});
        await renderAdminApp("/settings/memberemails");

        const section = settingsScreen.memberEmails();
        await expect.element(section.getByTestId("free-welcome-email-preview")).toHaveTextContent("Welcome to");
        await section.getByTestId("free-welcome-email-preview").click();

        await expect.element(page.getByTestId("welcome-email-modal")).toBeVisible();
        expect(addApi.lastRequest?.body).toMatchObject({automated_emails: [{slug: "member-welcome-email-free", status: "inactive"}]});
    });

    it("opens an existing welcome email without creating another row", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails();
        fakeRecentPosts();
        const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: []});
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByTestId("free-welcome-email-preview").click();

        await expect.element(page.getByTestId("welcome-email-modal")).toBeVisible();
        expect(addApi.requests).toHaveLength(0);
    });

    it("creates a missing welcome-email row as active when enabled", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails([]);
        const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: [freeWelcomeEmail]});
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByRole("switch").first().click();
        await expect.element(page.getByText("Free members welcome email enabled")).toBeVisible();
        expect(addApi.lastRequest?.body).toMatchObject({automated_emails: [{slug: "member-welcome-email-free", status: "active"}]});
    });

    it("updates an inactive row to active", async () => {
        const inactive = {...freeWelcomeEmail, status: "inactive"};
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails([inactive]);
        const editApi = fakeAdminEndpoint("PUT", `/automated_emails/${inactive.id}/`, {automated_emails: [freeWelcomeEmail]});
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByRole("switch").first().click();
        await expect.element(page.getByText("Free members welcome email enabled")).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({automated_emails: [{id: inactive.id, status: "active"}]});
    });

    it("updates an active row to inactive", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails();
        const editApi = fakeAdminEndpoint("PUT", `/automated_emails/${freeWelcomeEmail.id}/`, {automated_emails: [{...freeWelcomeEmail, status: "inactive"}]});
        await renderAdminApp("/settings/memberemails");

        await settingsScreen.memberEmails().getByRole("switch").first().click();
        await expect.element(page.getByText("Free members welcome email disabled")).toBeVisible();
        expect(editApi.lastRequest?.body).toMatchObject({automated_emails: [{id: freeWelcomeEmail.id, status: "inactive"}]});
    });

    it("shows the paid welcome email row when Stripe is connected", async () => {
        fakeSettingsScreens();
        fakeDefaultNewsletter();
        fakeAutomatedEmails();
        fakeRecentPosts();
        fakeTiers([tier({name: "Supporter"})]);
        const stripe = settingsResponse({settings: {
            stripe_connect_publishable_key: "pk_test_123",
            stripe_connect_secret_key: "sk_test_123",
            stripe_connect_display_name: "Dummy",
            stripe_connect_account_id: "acct_123",
        }});
        await renderAdminApp("/settings/memberemails", {boot: {browseSettings: {response: stripe}}});

        const paidRow = settingsScreen.paidWelcomeEmailRow();
        await expect.element(paidRow).toBeVisible();
        await expect.element(paidRow).toHaveTextContent("Paid members welcome email");
        await expect.element(paidRow.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("keeps the newest draft's preview when a stale preview response arrives late", async () => {
        const namedPreview = (text: string) => previewResponse("Preview Subject", `<!doctype html><html><body><p>${text}</p></body></html>`);
        const modal = await openWelcomeEmailModal();
        const heldResponses = new Map<string, (response: ReturnType<typeof previewResponse>) => void>();
        const previewPath = `/automated_emails/${freeWelcomeEmail.id}/preview/`;
        const previewApi = fakeAdminEndpoint("POST", previewPath, ({body}) => {
            const {subject} = body as {subject: string};
            return new Promise((resolve) => {
                heldResponses.set(subject, resolve);
            });
        });
        // Tap fetch so the test can await full delivery of a released preview
        // response before asserting the app ignored it.
        const deliveredPreviews: Array<Promise<string>> = [];
        const originalFetch = window.fetch.bind(window);
        const fetchSpy = vi.spyOn(window, "fetch").mockImplementation(async (...args: Parameters<typeof fetch>) => {
            const response = await originalFetch(...args);
            const url = String(args[0] instanceof Request ? args[0].url : args[0]);
            if (url.includes(previewPath)) {
                deliveredPreviews.push(response.clone().text());
            }
            return response;
        });
        // Cleanup registered up front so a mid-test failure can't leave fetch
        // wrapped for later tests or held responses starving settleRequests().
        onTestFinished(() => fetchSpy.mockRestore());
        onTestFinished(() => {
            heldResponses.forEach(resolve => resolve(namedPreview("drained")));
        });
        const frameText = () => {
            const iframe = settingsScreen.welcomeEmailPreviewIframe().query() as HTMLIFrameElement | null;
            return iframe?.contentDocument?.body?.textContent ?? "";
        };

        await settingsScreen.welcomeEmailModePreview().click();
        await expect.poll(() => heldResponses.has(freeWelcomeEmail.subject)).toBe(true);
        heldResponses.get(freeWelcomeEmail.subject)!(namedPreview("Initial preview"));
        await expect.poll(frameText).toContain("Initial preview");

        await settingsScreen.welcomeEmailPreviewSubject().fill("Stale draft");
        await settingsScreen.welcomeEmailModeEdit().click();
        await settingsScreen.welcomeEmailModePreview().click();
        await expect.poll(() => heldResponses.has("Stale draft")).toBe(true);

        await settingsScreen.welcomeEmailPreviewSubject().fill("Newest draft");
        await settingsScreen.welcomeEmailModeEdit().click();
        await settingsScreen.welcomeEmailModePreview().click();
        await expect.poll(() => heldResponses.has("Newest draft")).toBe(true);
        heldResponses.get("Newest draft")!(namedPreview("Newest preview"));
        await expect.poll(frameText).toContain("Newest preview");

        // Release the stale response and wait for its full delivery before
        // asserting it did not clobber the newest draft's preview.
        heldResponses.get("Stale draft")!(namedPreview("Stale preview"));
        // Deliveries are recorded in arrival order: initial, newest, then stale.
        await expect.poll(() => deliveredPreviews.length).toBe(3);
        expect(await deliveredPreviews[2]).toContain("Stale preview");
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        expect(frameText()).toContain("Newest preview");
        expect(frameText()).not.toContain("Stale preview");
        // The iframe navigates srcdoc asynchronously, so also assert on state
        // synchronous with the React commit: the srcdoc attribute itself, and
        // the loading overlay a stale clobber would re-show.
        const srcdoc = (settingsScreen.welcomeEmailPreviewIframe().query() as HTMLIFrameElement | null)?.getAttribute("srcdoc") ?? "";
        expect(srcdoc).toContain("Newest preview");
        expect(srcdoc).not.toContain("Stale preview");
        await expect.element(page.getByTestId("welcome-email-preview-loading")).not.toBeInTheDocument();
        expect(previewApi.requests.map(request => (request.body as {subject: string}).subject)).toEqual([
            freeWelcomeEmail.subject,
            "Stale draft",
            "Newest draft",
        ]);
        await expect.element(modal).toBeVisible();
    });

    describe("customization", () => {
        async function openCustomizeModal({icon}: {icon?: string} = {}) {
            fakeSettingsScreens();
            fakeDefaultNewsletter();
            fakeAutomatedEmails();
            fakeAdminEndpoint("GET", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            const settings = icon ? settingsResponse({settings: {icon}}) : undefined;
            await renderAdminApp("/settings/memberemails", settings ? {boot: {browseSettings: {response: settings}}} : undefined);
            await settingsScreen.memberEmails().getByRole("button", {name: "Customize"}).click();
            const modal = page.getByTestId("welcome-email-customize-modal");
            await expect.element(modal).toBeVisible();
            await expect.element(modal.getByRole("button", {name: "Save"})).toBeVisible();
            return modal;
        }

        it("shows and saves the publication icon choice only when an icon exists", async () => {
            const modal = await openCustomizeModal({icon: "https://example.com/icon.png"});
            const editDesignApi = fakeAdminEndpoint("PUT", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: [paidWelcomeEmail]});
            const senderApi = fakeAdminEndpoint("PUT", "/automated_emails/senders/", {automated_emails: [freeWelcomeEmail, paidWelcomeEmail]});
            const iconLabel = modal.getByText("Publication icon", {exact: true});
            await expect.element(iconLabel).toBeVisible();
            const previewIcon = modal.getByRole("img", {name: "Test Site"});
            await expect.element(previewIcon).toBeVisible();
            const iconSwitch = iconLabel.element().parentElement?.querySelector<HTMLElement>('[role="switch"]');
            expect(iconSwitch).not.toBeNull();
            await userEvent.click(iconSwitch!);
            await expect(previewIcon).toHaveCount(0);
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
            expect(editDesignApi.lastRequest?.body).toMatchObject({automated_email_design: [{show_header_icon: false}]});
            expect(addApi.requests).toHaveLength(1);
            expect(senderApi.requests).toHaveLength(1);
        });

        it("hides the publication icon choice when no icon exists", async () => {
            const modal = await openCustomizeModal();
            await expect(modal.getByText("Publication icon", {exact: true})).toHaveCount(0);
        });

        it("uses newsletter-derived placeholders and hides unavailable managed sender email", async () => {
            fakeSettingsScreens();
            fakeNewsletters([newsletter({sender_name: "Sender", sender_email: "test@example.com", sender_reply_to: "newsletter"})]);
            fakeAutomatedEmails();
            fakeAdminEndpoint("GET", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            const config = configResponse();
            config.config.hostSettings = {managedEmail: {enabled: true}};
            const settings = settingsResponse({settings: {default_email_address: "test@example.com"}});
            await renderAdminApp("/settings/memberemails", {boot: {browseConfig: {response: config}, browseSettings: {response: settings}}});
            await settingsScreen.memberEmails().getByRole("button", {name: "Customize"}).click();
            const modal = page.getByTestId("welcome-email-customize-modal");

            await expect.element(modal.getByLabelText("Sender name")).toHaveAttribute("placeholder", "Sender");
            await expect(modal.getByLabelText("Sender email")).toHaveCount(0);
            await expect.element(modal.getByLabelText("Reply-to email")).toHaveAttribute("placeholder", "test@example.com");
        });

        it("saves shared sender settings and creates the missing paid row", async () => {
            const modal = await openCustomizeModal();
            const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: [paidWelcomeEmail]});
            fakeAdminEndpoint("PUT", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            const senderApi = fakeAdminEndpoint("PUT", "/automated_emails/senders/", {automated_emails: [freeWelcomeEmail, paidWelcomeEmail]});
            await modal.getByLabelText("Sender name").fill("Shared sender");
            await modal.getByLabelText("Sender email").fill("shared@example.com");
            await modal.getByLabelText("Reply-to email").fill("shared-reply@example.com");
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
            expect(addApi.lastRequest?.body).toMatchObject({automated_emails: [{slug: "member-welcome-email-paid", status: "inactive"}]});
            expect(senderApi.lastRequest?.body).toEqual({
                sender_name: "Shared sender",
                sender_email: "shared@example.com",
                sender_reply_to: "shared-reply@example.com",
            });
        });

        it("saves shared sender settings without creating rows when automations owns them", async () => {
            fakeSettingsScreens();
            fakeDefaultNewsletter();
            fakeAutomatedEmails([]);
            fakeAdminEndpoint("GET", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            await renderAdminApp("/settings/emails", {labs: {automations: true}});
            const emails = settingsScreen.emails();
            await emails.getByRole("tab", {name: "Automation emails"}).click();
            await emails.getByTestId("automations-transactional-row").getByRole("button", {name: "Edit"}).click();
            const modal = page.getByTestId("welcome-email-customize-modal");
            await expect.element(modal).toBeVisible();
            const addApi = fakeAdminEndpoint("POST", "/automated_emails/", {automated_emails: []});
            fakeAdminEndpoint("PUT", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            const senderApi = fakeAdminEndpoint("PUT", "/automated_emails/senders/", {automated_emails: []});

            await modal.getByLabelText("Sender name").fill("Shared sender");
            await modal.getByLabelText("Sender email").fill("shared@example.com");
            await modal.getByLabelText("Reply-to email").fill("shared-reply@example.com");
            await modal.getByRole("button", {name: "Save"}).click();

            await expect.element(modal.getByRole("button", {name: "Saved"})).toBeVisible();
            expect(senderApi.lastRequest?.body).toEqual({
                sender_name: "Shared sender",
                sender_email: "shared@example.com",
                sender_reply_to: "shared-reply@example.com",
            });
            expect(addApi.requests).toHaveLength(0);
        });

        it("uses an explicit newsletter reply-to address as the reply-to placeholder", async () => {
            fakeSettingsScreens();
            fakeDefaultNewsletter({sender_email: "test@example.com", sender_reply_to: "custom-reply@example.com"});
            fakeAutomatedEmails();
            fakeAdminEndpoint("GET", "/automated_emails/design/", {automated_email_design: [automatedEmailDesign]});
            await renderAdminApp("/settings/memberemails");
            await settingsScreen.memberEmails().getByRole("button", {name: "Customize"}).click();
            const modal = settingsScreen.welcomeEmailCustomizeModal();

            await expect.element(modal.getByLabelText("Reply-to email")).toHaveAttribute("placeholder", "custom-reply@example.com");
            await expect.element(modal.getByText(/Reply-to:\s*custom-reply@example\.com/)).toBeVisible();
        });

        it("closes a pristine customize modal on Escape without confirmation", async () => {
            const modal = await openCustomizeModal();

            await userEvent.keyboard("{Escape}");

            await expect(modal).toHaveCount(0);
            await expect(settingsScreen.welcomeEmailDirtyConfirmModal()).toHaveCount(0);
            await expect.poll(currentRoute).toBe("/settings/memberemails");
        });

        it("prompts for confirmation on Escape once the customize modal is dirty", async () => {
            const modal = await openCustomizeModal();
            await modal.getByLabelText("Email footer").fill("Unsaved footer change");

            await userEvent.keyboard("{Escape}");

            const confirmation = settingsScreen.welcomeEmailDirtyConfirmModal();
            await expect.element(confirmation).toBeVisible();
            await expect.element(modal).toBeVisible();
            await expect.poll(currentRoute).toBe("/settings/memberemails");

            await userEvent.keyboard("{Escape}");

            await expect(confirmation).toHaveCount(0);
            await expect.element(modal).toBeVisible();
        });

        it("keeps unsaved customize changes behind the Stay action", async () => {
            const modal = await openCustomizeModal();
            const footer = modal.getByLabelText("Email footer");
            await footer.fill("Unsaved footer change");

            await modal.getByRole("button", {name: "Close"}).click();
            const confirmation = settingsScreen.welcomeEmailDirtyConfirmModal();
            await expect.element(confirmation).toBeVisible();
            await confirmation.getByRole("button", {name: "Stay"}).click();

            await expect(confirmation).toHaveCount(0);
            await expect.element(modal).toBeVisible();
            await expect.element(footer).toHaveValue("Unsaved footer change");
        });

        it("discards unsaved customize changes behind the Leave action", async () => {
            const modal = await openCustomizeModal();
            await modal.getByLabelText("Email footer").fill("Unsaved footer change");

            await modal.getByRole("button", {name: "Close"}).click();
            await settingsScreen.welcomeEmailDirtyConfirmModal().getByRole("button", {name: "Leave"}).click();

            await expect(modal).toHaveCount(0);
            await expect(settingsScreen.welcomeEmailDirtyConfirmModal()).toHaveCount(0);
        });
    });
});
