import { useMemo } from "react";
import { hasSendingDomain, isManagedEmail, sendingDomain, useBrowseConfig, type Config } from "@tryghost/admin-x-framework/api/config";
import { type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { getPostEmailPreview } from "@tryghost/admin-x-framework/api/email-previews";
import { type Newsletter } from "@tryghost/admin-x-framework/api/newsletters";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";

// Ember parity: editor/modals/preview/email.js injects this CSS into the
// returned email HTML to hide scrollbars inside the preview iframe
const INJECTED_CSS = `
html::-webkit-scrollbar {
    display: none;
    width: 0;
    background: transparent
}
html {
    scrollbar-width: none;
}
`;

export type EmailPreviewSegment = "free" | "paid";

/** Segment NQL filters the email-preview endpoint accepts (Ember's SEGMENT_OPTIONS). */
const EMAIL_PREVIEW_SEGMENTS: Record<EmailPreviewSegment, string> = {
    free: "status:free",
    paid: "status:-free",
};

/**
 * Appends the scrollbar-hiding CSS to the email's first <style> tag
 * (Ember's _fetchEmailData post-processing).
 */
function prepareEmailHtml(html: string): string {
    try {
        const htmlDoc = new DOMParser().parseFromString(html, "text/html");
        const stylesheet = htmlDoc.querySelector("style");
        if (stylesheet) {
            stylesheet.innerHTML = `${stylesheet.innerHTML}\n\n${INJECTED_CSS}`;
        }
        const doctype = htmlDoc.doctype
            ? new XMLSerializer().serializeToString(htmlDoc.doctype)
            : "<!DOCTYPE html>";
        return doctype + htmlDoc.documentElement.outerHTML;
    } catch {
        return html;
    }
}

/**
 * The address a newsletter actually sends from (Ember's sender-email-address
 * helper): managed-email hosts ignore sender_email unless it matches the
 * verified sending domain.
 */
function senderEmailAddress(senderEmail: string | null | undefined, config: Config | undefined, defaultEmailAddress: string | undefined): string | undefined {
    if (config && isManagedEmail(config) && !hasSendingDomain(config)) {
        return defaultEmailAddress;
    }
    if (config && isManagedEmail(config) && hasSendingDomain(config)) {
        return senderEmail?.split("@")[1] === sendingDomain(config) ? (senderEmail ?? undefined) : defaultEmailAddress;
    }
    return senderEmail || defaultEmailAddress;
}

/**
 * Email preview pane (Ember's editor/modals/preview/email): fetches the
 * rendered email for the post from the Admin API email-preview endpoint and
 * renders it in a sandboxed iframe under a From/Subject mockup header.
 */
export function EmailPreview({ post, segment, mobile, newsletters, selectedNewsletterSlug, onChangeNewsletter }: {
    post: FullPost;
    segment: EmailPreviewSegment;
    mobile: boolean;
    /** Active newsletters, sorted; an empty list lets the API pick the default. */
    newsletters: Newsletter[];
    selectedNewsletterSlug: string | null;
    onChangeNewsletter: (slug: string) => void;
}) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();

    const selectedNewsletter = newsletters.find(newsletter => newsletter.slug === selectedNewsletterSlug) ?? newsletters[0] ?? null;

    const { data: previewData, isLoading } = getPostEmailPreview(post.id, {
        searchParams: {
            memberSegment: EMAIL_PREVIEW_SEGMENTS[segment],
            ...(selectedNewsletter ? { newsletter: selectedNewsletter.slug } : {}),
        },
    });

    const preview = previewData?.email_previews?.[0];
    const html = useMemo(() => (preview?.html ? prepareEmailHtml(preview.html) : null), [preview?.html]);

    const config = configData?.config;
    const defaultEmailAddress = getSettingValue<string>(settingsData?.settings, "default_email_address") ?? undefined;
    const fromAddress = senderEmailAddress(selectedNewsletter?.sender_email, config, defaultEmailAddress);

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center px-[30px]">
            <div className={`mb-8 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_9px_rgba(0,0,0,0.05)] ${mobile ? "max-w-[360px]" : "max-w-[740px]"}`}>
                <div className="flex shrink-0 flex-col gap-2 border-b border-[#EBEEF0] bg-white px-7 py-4 text-[1.4rem]">
                    <div className="flex items-center gap-5" data-test-email-preview-newsletter-select-section>
                        <span className="w-[52px] shrink-0 text-[#7C8B9A]">From</span>
                        {newsletters.length > 1 ? (
                            <select
                                aria-label="Newsletter"
                                className="h-[34px] max-w-full truncate rounded-md bg-[#F4F5F6] px-3 text-[1.4rem] text-[#15171A]"
                                data-test-email-preview-newsletter-select
                                value={selectedNewsletter?.slug ?? ""}
                                onChange={event => onChangeNewsletter(event.target.value)}
                            >
                                {newsletters.map(newsletter => (
                                    <option key={newsletter.id} value={newsletter.slug}>
                                        {newsletter.name} {`<${senderEmailAddress(newsletter.sender_email, config, defaultEmailAddress) ?? ""}>`}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="m-0 truncate text-[#15171A]" data-test-text="newsletter-from">
                                {selectedNewsletter?.name}
                                {" "}
                                <span className="text-[#7C8B9A]">&lt;{fromAddress}&gt;</span>
                            </p>
                        )}
                    </div>
                    <hr className="m-0 border-[#EBEEF0]" />
                    <div className="flex items-center gap-5">
                        <span className="w-[52px] shrink-0 text-[#7C8B9A]">Subject</span>
                        <p className="m-0 truncate font-semibold text-[#15171A]" data-test-email-preview-subject>{preview?.subject ?? ""}</p>
                    </div>
                </div>
                {html ? (
                    <iframe
                        className="w-full flex-1 border-none bg-white"
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={html}
                        title="Email preview"
                    />
                ) : (
                    <div className="m-auto text-[1.4rem] text-[#54666D]">
                        {isLoading ? "Generating email preview..." : "Email preview unavailable."}
                    </div>
                )}
            </div>
        </div>
    );
}
