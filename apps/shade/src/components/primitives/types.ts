export type SpaceStep = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export const GAP_CLASSES: Record<SpaceStep, string> = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-8'
};

export const PADDING_CLASSES: Record<SpaceStep, string> = {
    none: 'p-0',
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
    xl: 'p-6',
    '2xl': 'p-8'
};

export const PADDING_X_CLASSES: Record<SpaceStep, string> = {
    none: 'px-0',
    xs: 'px-1',
    sm: 'px-2',
    md: 'px-3',
    lg: 'px-4',
    xl: 'px-6',
    '2xl': 'px-8'
};

export const PADDING_Y_CLASSES: Record<SpaceStep, string> = {
    none: 'py-0',
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-3',
    lg: 'py-4',
    xl: 'py-6',
    '2xl': 'py-8'
};

export const ALIGN_ITEMS_CLASSES: Record<Align, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
};

export const JUSTIFY_CONTENT_CLASSES: Record<Justify, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
};
