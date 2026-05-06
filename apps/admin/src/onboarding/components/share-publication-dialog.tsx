import {Button} from "@tryghost/shade/components";
import {ShareModal, type ShareModalSocialLink} from "@tryghost/shade/patterns";

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
        <ShareModal
            actionsLayout="footer"
            closeButtonId="ob-close-share-modal"
            contentProps={{
                className: "dark:bg-surface-elevated",
                "data-testid": "onboarding-share-modal",
            }}
            copyButtonId="ob-copy-publication-link"
            copyButtonTestId="onboarding-copy-link"
            copyLabel="Copy link"
            copyURL={siteUrl}
            guidance={(
                <p className="text-sm text-muted-foreground">
                    Set your publication&apos;s cover image and description in{" "}
                    <Button asChild className="h-auto p-0 align-baseline text-sm text-green hover:text-green/90" variant="link">
                        <a href="#/settings/design/edit?ref=setup" id="ob-share-modal-design-settings">Design settings</a>
                    </Button>.
                </p>
            )}
            open={open}
            preview={{
                description,
                imageURL: imageUrl,
                title: siteTitle,
                url: siteUrl,
            }}
            socialLinks={socialLinks}
            title="Share your publication"
            variant="publication"
            onClose={() => onOpenChange(false)}
            onOpenChange={onOpenChange}
        />
    );
}
