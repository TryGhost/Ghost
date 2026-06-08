import {Button} from "@tryghost/shade/components";
import {ShareModal, type ShareModalSocialLink} from "@tryghost/shade/patterns";
import {LucideIcon} from "@tryghost/shade/utils";

interface SharePublicationDialogProps {
    description: string;
    imageUrl: string;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    siteTitle: string;
    siteUrl: string;
}

export function SharePublicationDialog({
    description,
    imageUrl,
    onOpenChange,
    open,
    siteTitle,
    siteUrl,
}: SharePublicationDialogProps) {
    const encodedUrl = encodeURIComponent(siteUrl);
    const socialLinks: ShareModalSocialLink[] = [
        {
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
            id: "ob-share-on-x",
            label: "Share your publication on X",
            service: "x",
        },
        {
            href: `https://threads.net/intent/post?text=${encodedUrl}`,
            id: "ob-share-on-threads",
            label: "Share your publication on Threads",
            service: "threads",
        },
        {
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            id: "ob-share-on-fb",
            label: "Share your publication on Facebook",
            service: "facebook",
        },
        {
            href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodedUrl}`,
            id: "ob-share-on-li",
            label: "Share your publication on LinkedIn",
            service: "linkedin",
        },
    ];

    return (
        <ShareModal.Root
            open={open}
            onOpenChange={onOpenChange}
        >
            <ShareModal.Content
                className="dark:bg-surface-elevated"
                data-test-modal="onboarding-share"
                data-testid="onboarding-share-modal"
            >
                <ShareModal.Header className="flex-row items-center justify-between gap-4 space-y-0 text-left">
                    <ShareModal.Title className="text-2xl">Share your publication</ShareModal.Title>
                    <ShareModal.CloseButton id="ob-close-share-modal" onClick={() => onOpenChange(false)} />
                </ShareModal.Header>
                <ShareModal.Preview className="rounded-lg bg-card" href={siteUrl}>
                    {imageUrl ?
                        <div className="aspect-video bg-cover bg-center" style={{backgroundImage: `url(${imageUrl})`}}></div>
                        :
                        <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                            <LucideIcon.Image className="size-8" />
                        </div>
                    }
                    <div className="p-5">
                        <div className="text-lg font-semibold">{siteTitle}</div>
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                </ShareModal.Preview>
                <p className="text-sm text-muted-foreground">
                    Set your publication&apos;s cover image and description in{" "}
                    <Button asChild className="h-auto p-0 align-baseline text-sm text-green hover:text-green/90" variant="link">
                        <a href="#/settings/design/edit?ref=setup" id="ob-share-modal-design-settings">Design settings</a>
                    </Button>.
                </p>
                <ShareModal.Footer>
                    <ShareModal.SocialLinks links={socialLinks} />
                    <ShareModal.CopyButton
                        className="ml-0! grow cursor-pointer"
                        copyURL={siteUrl}
                        data-testid="onboarding-copy-link"
                        icon="link"
                        id="ob-copy-publication-link"
                        label="Copy link"
                    />
                </ShareModal.Footer>
            </ShareModal.Content>
        </ShareModal.Root>
    );
}
