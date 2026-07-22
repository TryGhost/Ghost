import { useEffect, useRef, useState } from "react";
import validator from "validator";
import { Button, FieldError, Input, PopoverContent } from "@tryghost/shade/components";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useSendTestWelcomeEmail } from "@tryghost/admin-x-framework/api/automated-emails";

/**
 * The "Test" popover of the welcome email modal, ported from the legacy
 * member-emails/test-email-dropdown.tsx: sends the current draft to an
 * arbitrary address after validating it.
 */
export function WelcomeEmailTestDropdown({ automatedEmailId, subject, lexical, validateForm }: {
    automatedEmailId: string;
    subject: string;
    lexical: string;
    validateForm: () => boolean;
}) {
    const { data: currentUser } = useCurrentUser();
    const { mutateAsync: sendTestEmail } = useSendTestWelcomeEmail();

    const [testEmail, setTestEmail] = useState(currentUser?.email || "");
    const [testEmailError, setTestEmailError] = useState("");
    const [sendState, setSendState] = useState<"idle" | "sending" | "sent">("idle");
    const sendStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (sendStateTimeoutRef.current) {
                clearTimeout(sendStateTimeoutRef.current);
            }
        };
    }, []);

    // Update test email when current user data loads
    useEffect(() => {
        if (currentUser?.email) {
            setTestEmail(currentUser.email);
        }
    }, [currentUser?.email]);

    const handleSendTestEmail = async () => {
        setTestEmailError("");

        if (!validator.isEmail(testEmail)) {
            setTestEmailError("Please enter a valid email address");
            return;
        }

        // check that subject and lexical are valid
        if (!validateForm()) {
            setTestEmailError("Please complete the required fields");
            return;
        }

        setSendState("sending");

        try {
            await sendTestEmail({
                id: automatedEmailId,
                email: testEmail,
                subject,
                lexical,
            });
            setSendState("sent");
            if (sendStateTimeoutRef.current) {
                clearTimeout(sendStateTimeoutRef.current);
            }
            sendStateTimeoutRef.current = setTimeout(() => setSendState("idle"), 2000);
        } catch (error) {
            setSendState("idle");
            let message;
            if (error instanceof JSONError && error.data && error.data.errors[0]) {
                message = error.data.errors[0].context || error.data.errors[0].message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            setTestEmailError(message || "Failed to send test email");
        }
    };

    return (
        <PopoverContent align="end" className="w-[260px] p-4" data-testid="test-email-dropdown" sideOffset={8}>
            <div className="mb-3">
                <label className="mb-2 block font-semibold" htmlFor="test-email-input">Send test email</label>
                <Input
                    id="test-email-input"
                    placeholder="you@yoursite.com"
                    value={testEmail}
                    onChange={(e) => {
                        setTestEmail(e.target.value);
                    }}
                />
            </div>
            <Button
                className="w-full"
                disabled={sendState === "sending"}
                onClick={() => void handleSendTestEmail()}
            >
                {sendState === "sent" ? "Sent" : sendState === "sending" ? "Sending..." : "Send"}
            </Button>
            {testEmailError && <FieldError className="mt-2">{testEmailError}</FieldError>}
        </PopoverContent>
    );
}
