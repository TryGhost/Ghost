import {Toaster as Sonner} from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({...props}: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            style={
                {
                    '--normal-bg': 'hsl(var(--background))',
                    '--normal-text': 'hsl(var(--foreground))',
                    '--normal-border': 'hsl(var(--border))'
                } as React.CSSProperties
            }
            theme="light" // Always force light to prevent browser override
            {...props}
        />
    );
};

export {Toaster};
