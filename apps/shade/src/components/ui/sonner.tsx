import {Toaster as Sonner} from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({...props}: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            style={
                {
                    '--normal-bg': 'var(--background)',
                    '--normal-text': 'var(--foreground)',
                    '--normal-border': 'var(--border)'
                } as React.CSSProperties
            }
            theme="light" // Always force light to prevent browser override
            {...props}
        />
    );
};

export {Toaster};
