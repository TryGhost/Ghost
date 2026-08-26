export const navigationRowClasses = 'flex w-full items-start gap-3 [--control-height:38px]';

export const navigationColumnClasses = {
    icon: 'w-[38px] shrink-0',
    label: 'min-w-0 flex-[0.75]',
    url: 'min-w-0 flex-[1.25]',
    visibility: 'w-[190px] shrink-0',
    action: 'w-10 shrink-0'
} as const;

export const navigationDragHandleSpacerClasses = 'h-7 w-4 shrink-0';
export const navigationFieldOffsetClass = 'pt-1';
