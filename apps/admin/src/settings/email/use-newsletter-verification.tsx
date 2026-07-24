import { useEffect, useRef } from "react";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { useVerifyNewsletterEmail } from "@tryghost/admin-x-framework/api/newsletters";

import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * Redeems a `?verifyEmail=` newsletter verification token, ported from the
 * legacy newsletters-tab-content.tsx: runs on the newsletters/emails routes,
 * verifies once per token and reports the result through the shared
 * confirmation dialog (single Close button, legacy contract).
 */

export function useNewsletterVerification() {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const verifyEmailToken = new URLSearchParams(search).get("verifyEmail");
    const { mutateAsync: verifyEmail } = useVerifyNewsletterEmail();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();
    const submittedTokenRef = useRef<string | null>(null);

    const isVerificationRoute = pathname.startsWith("/settings/emails") || pathname.startsWith("/settings/newsletters");

    useEffect(() => {
        if (!verifyEmailToken || !isVerificationRoute) {
            return;
        }

        if (submittedTokenRef.current === verifyEmailToken) {
            return;
        }
        submittedTokenRef.current = verifyEmailToken;

        const verify = async () => {
            try {
                const { newsletters: [updatedNewsletter], meta: { email_verified: emailVerified } = {} } = await verifyEmail({ token: verifyEmailToken });
                const newsletterLink = (
                    <button className="text-primary underline" type="button" onClick={() => navigate(`/settings/newsletters/${updatedNewsletter.id}`)}>
                        {updatedNewsletter.name}
                    </button>
                );
                let title;
                let prompt;

                if (emailVerified && emailVerified === "sender_email") {
                    title = "Newsletter email verified";
                    prompt = <>Newsletter {newsletterLink} will now be sent from <strong>{updatedNewsletter.sender_email}</strong>.</>;
                } else if (emailVerified && emailVerified === "sender_reply_to") {
                    title = "Reply-to address verified";
                    prompt = <>Newsletter {newsletterLink} will now use <strong>{updatedNewsletter.sender_reply_to}</strong> as the reply-to address.</>;
                } else {
                    title = "Email address verified";
                    prompt = <>Email address for newsletter {newsletterLink} has been changed.</>;
                }

                confirm({ title, prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
            } catch (e) {
                let prompt = "There was an error verifying your email address. Try again later.";

                if (e instanceof APIError && e.message === "Token expired") {
                    prompt = "Verification link has expired.";
                }
                confirm({ title: "Error verifying email address", prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
                handleError(e, { withToast: false });
            }
        };
        void verify();
    }, [confirm, handleError, isVerificationRoute, navigate, verifyEmail, verifyEmailToken]);
}
