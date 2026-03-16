import clsx from 'clsx';

export interface ButtonProps {
    color?: 'white' | 'grey' | 'black' | 'accent';
    dataTestId?: string;
    href?: string;
    size?: 'small' | 'medium' | 'large';
    width?: 'regular' | 'full';
    rounded?: boolean;
    shrink?: boolean;
    value?: string;
    placeholder?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    target?: string;
    [key: string]: unknown;
}

export function Button({
    color = 'accent',
    dataTestId,
    href,
    size = 'small',
    width = 'regular',
    rounded = true,
    shrink = false,
    value = '',
    placeholder = 'Add button text',
    type = 'button',
    disabled = false,
    target,
    ...other
}: ButtonProps) {
    const Tag = href ? 'a' : 'button';
    const props: Record<string, unknown> = {
        type: href ? null : type,
        href: href || null,
        rel: target === '_blank' ? 'noopener noreferrer' : null,
        target: target || null,
        ...other
    };

    return (
        <Tag
            className={clsx(
                'not-kg-prose inline-block cursor-pointer text-center font-sans font-medium',
                (!shrink && 'shrink-0'), // This is for dynamic buttons that need to wrap onto a new line if width exceeds editor width, such as the ButtonCard
                width === 'regular' || 'w-full',
                rounded && 'rounded-md',
                value ? 'opacity-100' : 'opacity-50',
                color === 'white' && 'bg-white text-black',
                color === 'grey' && 'bg-grey-200 text-black',
                color === 'black' && 'bg-black text-white',
                color === 'accent' && 'bg-accent text-white',
                !['white', 'grey', 'black', 'accent'].includes(color) && 'bg-green text-white')}
            data-testid={`${dataTestId}`}
            disabled={disabled}
            {...props}
        >
            <span
                className={clsx(
                    'block',
                    size === 'small' && 'px-5 py-[1rem] text-md leading-[1.4]',
                    size === 'medium' && 'px-5 py-2 text-[1.6rem]',
                    size === 'large' && 'px-6 py-3 text-lg leading-[1.35]'
                )}
                data-testid={`${dataTestId}-span`}
            >
                {value || placeholder}
            </span>
        </Tag>
    );
}
