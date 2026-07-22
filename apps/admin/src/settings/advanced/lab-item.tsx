import { type ReactNode } from "react";

/** One Labs row: title/detail on the left, the action (toggle/buttons) on the right — the legacy LabItem layout. */
export function LabItem({ title, detail, action, testId }: {
    title?: ReactNode;
    detail?: ReactNode;
    action?: ReactNode;
    testId?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-3" data-testid={testId}>
            <div className="min-w-0">
                <div className="text-sm font-medium">{title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
            </div>
            <div className="shrink-0">{action}</div>
        </div>
    );
}
