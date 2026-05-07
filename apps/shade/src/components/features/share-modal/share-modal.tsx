import * as DialogPrimitive from '@radix-ui/react-dialog';
import {Check, Copy, Link, X} from 'lucide-react';
import React, {useState} from 'react';
import {Button, type ButtonProps} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';

type ShareService = 'x' | 'threads' | 'facebook' | 'linkedin';

export type ShareModalSocialLink = {
    href: string;
    id?: string;
    label: string;
    service: ShareService;
    title?: string;
};

export type ShareModalPreviewProps = {
    href: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall back for browser contexts where the async clipboard API is blocked.
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function Root(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
    return <Dialog {...props} />;
}

const Trigger = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({asChild = true, className, ...props}, ref) => (
    <DialogTrigger
        ref={ref}
        asChild={asChild}
        className={cn('cursor-pointer', className)}
        {...props}
    />
));
Trigger.displayName = 'ShareModal.Trigger';

const Content = React.forwardRef<
    React.ElementRef<typeof DialogContent>,
    React.ComponentPropsWithoutRef<typeof DialogContent>
>(({className, ...props}, ref) => (
    <DialogContent
        ref={ref}
        className={cn('max-h-[calc(100vh-16vmin)] max-w-[540px] overflow-y-auto p-8', className)}
        {...props}
    />
));
Content.displayName = 'ShareModal.Content';

function Header({className, ...props}: React.ComponentPropsWithoutRef<typeof DialogHeader>) {
    return <DialogHeader className={className} {...props} />;
}

function Title({className, ...props}: React.ComponentPropsWithoutRef<typeof DialogTitle>) {
    return <DialogTitle className={className} {...props} />;
}

function Description({className, ...props}: React.ComponentPropsWithoutRef<typeof DialogDescription>) {
    return <DialogDescription className={className} {...props} />;
}

type CloseButtonProps = ButtonProps;

const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(({
    children,
    className,
    size = 'lg',
    title = 'Close',
    variant = 'link',
    ...props
}, ref) => (
    <Button
        ref={ref}
        className={cn(
            '-mr-2 cursor-pointer p-2 text-muted-foreground hover:text-foreground [&_svg]:size-6!',
            className
        )}
        size={size}
        title={title}
        variant={variant}
        {...props}
    >
        {children || (
            <>
                <X size={24} strokeWidth={1} />
                <span className="sr-only">Close</span>
            </>
        )}
    </Button>
));
CloseButton.displayName = 'ShareModal.CloseButton';

const Preview = React.forwardRef<HTMLAnchorElement, ShareModalPreviewProps>(({
    className,
    href,
    rel = 'noopener noreferrer',
    target = '_blank',
    ...props
}, ref) => {
    return (
        <a
            ref={ref}
            className={cn('flex flex-col items-stretch overflow-hidden border transition-all hover:border-muted-foreground/40', className)}
            href={href}
            rel={rel}
            target={target}
            {...props}
        />
    );
});
Preview.displayName = 'ShareModal.Preview';

function SocialIcon({service}: {service: ShareService}) {
    if (service === 'threads') {
        return (
            <svg fill="none" viewBox="0 0 18 18"><g clipPath="url(#social-threads_svg__clip0_351_18008)"><path d="M13.033 8.38a5.924 5.924 0 00-.223-.102c-.13-2.418-1.452-3.802-3.67-3.816h-.03c-1.327 0-2.43.566-3.11 1.597l1.22.837c.507-.77 1.304-.934 1.89-.934h.02c.73.004 1.282.217 1.639.63.26.302.433.72.519 1.245a9.334 9.334 0 00-2.097-.101c-2.109.121-3.465 1.351-3.374 3.06.047.868.478 1.614 1.216 2.1.624.413 1.428.614 2.263.568 1.103-.06 1.969-.48 2.572-1.25.459-.585.749-1.342.877-2.296.526.317.915.735 1.13 1.236.366.854.387 2.255-.756 3.398-1.003 1.002-2.207 1.435-4.028 1.448-2.02-.015-3.547-.663-4.54-1.925-.93-1.182-1.41-2.89-1.428-5.075.018-2.185.498-3.893 1.428-5.075.993-1.262 2.52-1.91 4.54-1.925 2.034.015 3.588.666 4.62 1.934.505.622.886 1.405 1.137 2.317l1.43-.382c-.305-1.122-.784-2.09-1.436-2.892C13.52 1.35 11.587.517 9.096.5h-.01C6.6.517 4.689 1.354 3.404 2.986 2.262 4.44 1.672 6.46 1.652 8.994v.012c.02 2.534.61 4.555 1.752 6.008C4.69 16.646 6.6 17.483 9.086 17.5h.01c2.21-.015 3.768-.594 5.051-1.876 1.68-1.678 1.629-3.78 1.075-5.07-.397-.927-1.154-1.678-2.189-2.175zm-3.816 3.587c-.924.052-1.884-.363-1.932-1.252-.035-.659.47-1.394 1.99-1.482a8.9 8.9 0 01.512-.014c.552 0 1.068.053 1.538.156-.175 2.187-1.203 2.542-2.108 2.592z" fill="currentColor"></path></g><defs><clipPath id="social-threads_svg__clip0_351_18008"><path d="M0 0h17v17H0z" fill="#fff" transform="translate(.5 .5)"></path></clipPath></defs></svg>
        );
    }

    if (service === 'facebook') {
        return (
            <svg fill="none" viewBox="0 0 40 40"><path d="M20 40.004c11.046 0 20-8.955 20-20 0-11.046-8.954-20-20-20s-20 8.954-20 20c0 11.045 8.954 20 20 20z" fill="#1977f3"></path><path d="M27.785 25.785l.886-5.782h-5.546V16.25c0-1.58.773-3.125 3.26-3.125h2.522V8.204s-2.29-.39-4.477-.39c-4.568 0-7.555 2.767-7.555 7.781v4.408h-5.08v5.782h5.08v13.976a20.08 20.08 0 003.125.242c1.063 0 2.107-.085 3.125-.242V25.785h4.66z" fill="#fff"></path></svg>
        );
    }

    if (service === 'linkedin') {
        return (
            <svg fill="none" viewBox="0 0 16 16"><g clipPath="url(#social-linkedin_svg__clip0_537_833)"><path clipRule="evenodd" d="M1.778 16h12.444c.982 0 1.778-.796 1.778-1.778V1.778C16 .796 15.204 0 14.222 0H1.778C.796 0 0 .796 0 1.778v12.444C0 15.204.796 16 1.778 16z" fill="#007ebb" fillRule="evenodd"></path><path clipRule="evenodd" d="M13.778 13.778h-2.374V9.734c0-1.109-.421-1.729-1.299-1.729-.955 0-1.453.645-1.453 1.729v4.044H6.363V6.074h2.289v1.038s.688-1.273 2.322-1.273c1.634 0 2.804.997 2.804 3.061v4.878zM3.634 5.065c-.78 0-1.411-.636-1.411-1.421s.631-1.422 1.41-1.422c.78 0 1.411.637 1.411 1.422 0 .785-.631 1.421-1.41 1.421zm-1.182 8.713h2.386V6.074H2.452v7.704z" fill="#fff" fillRule="evenodd"></path></g><defs><clipPath id="social-linkedin_svg__clip0_537_833"><path d="M0 0h16v16H0z" fill="#fff"></path></clipPath></defs></svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"></path></svg>
    );
}

interface SocialLinksProps extends React.HTMLAttributes<HTMLDivElement> {
    layout?: 'footer' | 'stacked';
    links: ShareModalSocialLink[];
}

function SocialLinks({className, layout = 'footer', links, ...props}: SocialLinksProps) {
    if (layout === 'stacked') {
        return (
            <div className={cn('flex gap-2', className)} {...props}>
                {links.map(link => (
                    <Button key={link.id ?? link.href} className="flex-1" id={link.id} variant="outline" asChild>
                        <a aria-label={link.label} href={link.href} rel="noreferrer" target="_blank" title={link.title || link.label}>
                            <SocialIcon service={link.service} />
                            <span className="sr-only">{link.label}</span>
                        </a>
                    </Button>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('flex items-center gap-2', className)} {...props}>
            {links.map(link => (
                <a key={link.id ?? link.href} aria-label={link.label} className="flex h-(--control-height) w-14 items-center justify-center rounded-xs bg-muted px-3 hover:bg-muted-foreground/20 [&_svg]:h-4" href={link.href} rel="noopener noreferrer" target="_blank" title={link.title || link.label}>
                    <SocialIcon service={link.service} />
                </a>
            ))}
        </div>
    );
}

interface CopyButtonProps extends ButtonProps {
    copyURL: string;
    icon?: 'copy' | 'link';
    label?: string;
    successLabel?: string;
}

function CopyButton({
    children,
    copyURL,
    disabled,
    icon = 'link',
    label = 'Copy link',
    onClick,
    successLabel = 'Copied!',
    ...props
}: CopyButtonProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);

        if (event.defaultPrevented) {
            return;
        }

        await copyTextToClipboard(copyURL);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const Icon = icon === 'copy' ? Copy : Link;

    return (
        <Button
            disabled={disabled || !copyURL}
            type="button"
            onClick={(event) => {
                void handleCopyLink(event);
            }}
            {...props}
        >
            {children || (
                <>
                    {isCopied ? <Check /> : <Icon />}
                    {isCopied ? successLabel : label}
                </>
            )}
        </Button>
    );
}

interface CopyURLBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    copyURL: string;
}

function CopyURLBox({children, className, copyURL, ...props}: CopyURLBoxProps) {
    return (
        <div className={cn('flex items-center gap-2 rounded-md border bg-muted p-2', className)} {...props}>
            <span className="min-w-0 flex-1 truncate px-2 text-sm">{copyURL}</span>
            {children}
        </div>
    );
}

function Footer({className, ...props}: React.ComponentPropsWithoutRef<typeof DialogFooter>) {
    return (
        <DialogFooter
            className={cn('justify-between gap-6', className)}
            {...props}
        />
    );
}

const ShareModal = {
    CloseButton,
    Content,
    CopyButton,
    CopyURLBox,
    Description,
    Footer,
    Header,
    Preview,
    Root,
    SocialLinks,
    Title,
    Trigger
};

export default ShareModal;
