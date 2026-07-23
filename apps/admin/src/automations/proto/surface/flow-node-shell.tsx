import React from 'react';

interface StepNodeHeaderProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
}

// Icon chip + title/subtitle column shared by both canvases' step nodes.
export const StepNodeHeader: React.FC<StepNodeHeaderProps> = ({icon: Icon, title, subtitle}) => (
    <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">{title}</span>
            <span className="truncate font-medium">{subtitle}</span>
        </div>
    </div>
);
