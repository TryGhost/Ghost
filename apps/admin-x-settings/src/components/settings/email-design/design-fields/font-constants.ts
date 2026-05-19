export const FONT_OPTIONS = [
    {value: 'serif', label: 'Elegant serif'},
    {value: 'sans_serif', label: 'Clean sans-serif'}
];

export const FONT_WEIGHT_OPTIONS: Record<string, {options: {value: string; label: string}[]; map?: Record<string, string>}> = {
    sans_serif: {
        options: [
            {value: 'normal', label: 'Regular'},
            {value: 'medium', label: 'Medium'},
            {value: 'semibold', label: 'Semi-bold'},
            {value: 'bold', label: 'Bold'}
        ]
    },
    serif: {
        options: [
            {value: 'normal', label: 'Regular'},
            {value: 'bold', label: 'Bold'}
        ],
        map: {
            medium: 'normal',
            semibold: 'bold'
        }
    }
};

export function getValidWeight(fontCategory: string, currentWeight: string): string {
    const config = FONT_WEIGHT_OPTIONS[fontCategory] || FONT_WEIGHT_OPTIONS.sans_serif;
    if (config.options.find(o => o.value === currentWeight)) {
        return currentWeight;
    }
    return config.map?.[currentWeight] || 'bold';
}
