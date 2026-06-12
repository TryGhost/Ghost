import { type ReactNode } from "react";

/**
 * Shared centered-card layout for the auth screens (signin, verify, reset,
 * signup, setup).
 */
export function AuthLayout({ heading, children }: {
    heading?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
            <section className="flex w-full max-w-[440px] flex-col gap-6">
                {heading && (
                    <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
                        {heading}
                    </h1>
                )}
                {children}
            </section>
        </div>
    );
}

/**
 * Single element that shows both flow errors and success notifications,
 * mirroring the Ember auth screens' `main-error` / `main-notification`
 * paragraph (and keeping the e2e flow-notification testids stable).
 */
export function FlowNotification({ testId, isError, children }: {
    testId: string;
    isError: boolean;
    children?: ReactNode;
}) {
    return (
        <p
            className={`min-h-5 text-center text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
            data-testid={testId}
        >
            {children}&nbsp;
        </p>
    );
}
