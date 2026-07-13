import React from 'react';

export interface SegmentedOption {
    value: string;
    label: string;
}

// Full-width segmented control (equal-width buttons).
export const SegmentedControl: React.FC<{
    options: SegmentedOption[];
    value: string;
    onChange: (value: string) => void;
}> = ({options, value, onChange}) => (
    <div className='flex w-full rounded-lg bg-grey-100 p-1 dark:bg-grey-900'>
        {options.map(option => (
            <button
                key={option.value}
                className={`flex-1 rounded-md px-3 py-1 text-sm font-medium transition-all ${value === option.value ? 'bg-white text-black shadow-sm dark:bg-grey-800 dark:text-white' : 'text-grey-700 hover:text-black dark:hover:text-white'}`}
                type='button'
                onClick={() => onChange(option.value)}
                onMouseDown={e => e.preventDefault()}
            >
                {option.label}
            </button>
        ))}
    </div>
);

export interface ColorOption {
    value: string;
    label: string;
    color: string;
    none?: boolean;
    border?: boolean;
}

const Dot: React.FC<{option: Pick<ColorOption, 'color' | 'none' | 'border'>; size?: number}> = ({option, size = 20}) => (
    <span
        className='relative inline-block rounded-full'
        style={{
            width: size,
            height: size,
            backgroundColor: option.none ? 'transparent' : option.color,
            boxShadow: option.border || option.color === '#ffffff' ? 'inset 0 0 0 1px rgba(124, 139, 154, 0.35)' : undefined
        }}
    >
        {option.none &&
            <span className='absolute inset-0 flex items-center justify-center'>
                <span className='h-px w-[72%] rotate-45 bg-red' />
            </span>
        }
    </span>
);

// Koenig-style swatch picker: a trigger showing the current color that opens a
// self-contained popover of swatches (no external Popover dependency).
export const ColorPopover: React.FC<{
    value: string;
    options: ColorOption[];
    onChange: (value: string) => void;
}> = ({value, options, onChange}) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const current = options.find(option => option.value === value) || options[0];

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <div ref={containerRef} className='relative'>
            <button
                className='flex items-center gap-1.5 rounded-md border border-grey-300 p-1 pr-2 transition-all hover:bg-grey-100 dark:border-grey-800 dark:hover:bg-grey-900'
                type='button'
                onClick={() => setOpen(o => !o)}
                onMouseDown={e => e.preventDefault()}
            >
                <Dot option={current} />
                <span className='text-sm text-grey-800 dark:text-grey-400'>{current.label}</span>
            </button>
            {open &&
                <div className='absolute right-0 top-[calc(100%+4px)] z-10 rounded-lg border border-grey-200 bg-white shadow-md dark:border-grey-900 dark:bg-grey-950'>
                    <div className='flex max-w-[180px] flex-wrap gap-2.5 p-3'>
                        {options.map(option => (
                            <button
                                key={option.value}
                                aria-label={option.label}
                                className={`rounded-full transition-all ${value === option.value ? 'ring-2 ring-green ring-offset-1 dark:ring-offset-grey-900' : ''}`}
                                title={option.label}
                                type='button'
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                onMouseDown={e => e.preventDefault()}
                            >
                                <Dot option={option} size={22} />
                            </button>
                        ))}
                    </div>
                </div>
            }
        </div>
    );
};
