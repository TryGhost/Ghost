import {Toaster as Sonner} from 'sonner';
import {cn} from '@/lib/utils';

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({className, style, theme = 'light', toastOptions, ...props}: ToasterProps) => {
    const {classNames, ...toastOptionProps} = toastOptions ?? {};

    return (
        <Sonner
            className={cn('toaster group', className)}
            style={
                {
                    '--normal-bg': 'var(--background)',
                    '--normal-text': 'var(--foreground)',
                    '--normal-border': 'var(--border)',
                    ...style
                } as React.CSSProperties
            }
            theme={theme}
            toastOptions={{
                ...toastOptionProps,
                classNames: {
                    ...classNames,
                    closeButton: cn(
                        'border-control-border! bg-background! text-foreground! hover:bg-interactive-hover! focus-visible:ring-2! focus-visible:ring-focus-ring! focus-visible:ring-offset-2! focus-visible:ring-offset-background! data-[disabled=true]:opacity-50!',
                        classNames?.closeButton
                    )
                }
            }}
            {...props}
        />
    );
};

export {Toaster};
