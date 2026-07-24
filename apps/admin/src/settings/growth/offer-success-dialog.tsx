import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Input } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type Offer, useBrowseOffersById } from "@tryghost/admin-x-framework/api/offers";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";
import { currencyToDecimal } from "@tryghost/admin-x-settings/src/utils/currency";
import { numberWithCommas } from "@tryghost/admin-x-settings/src/utils/helpers";

import { OffersBreadcrumbs } from "./offers-breadcrumbs";

/**
 * The routed offer-success screen (`/settings/offers/success/:offerId`),
 * ported from the legacy offers/offer-success.tsx: the shareable offer link
 * with copy + social share shortcuts.
 */
export function OfferSuccessDialog() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { data: { offers: offerById = [] } = {} } = useBrowseOffersById(offerId || "");

    const [offer, setOffer] = useState<Offer>();
    const [offerLink, setOfferLink] = useState<string>("");

    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site ?? null;

    useEffect(() => {
        if (offerById.length > 0 && siteData) {
            const currentOffer = offerById[0];
            const offerUrl = `${getHomepageUrl(siteData)}${currentOffer?.code}`;
            setOfferLink(offerUrl);
            setOffer(currentOffer);
        }
    }, [offerById, siteData]);

    const [isCopied, setIsCopied] = useState(false);

    const getShareText = () => {
        let discount = "";

        switch (offer?.type) {
            case "percent":
                discount = offer?.amount + "% discount";
                break;
            case "fixed":
                discount = numberWithCommas(currencyToDecimal(offer?.amount)) + " " + offer?.currency + " discount";
                break;
            case "trial":
                discount = offer?.amount + " days free trial";
                break;
            default:
                break;
        }

        return `${encodeURIComponent(offer?.name || "")} — Check out ${encodeURIComponent(discount)} on:`;
    };

    const handleCopyClick = async () => {
        await navigator.clipboard.writeText(offerLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURI(offerLink)}&text=${getShareText()}`, "_blank");
    };

    const handleFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(offerLink)}`, "_blank");
    };

    const handleLinkedIn = () => {
        window.open(`http://www.linkedin.com/shareArticle?mini=true&url=${encodeURI(offerLink)}&title=${getShareText()}`, "_blank");
    };

    const close = () => navigate("/settings/offers");

    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 gap-0 rounded-none sm:rounded-none"
                data-testid="offer-success-modal"
            >
                <DialogTitle className="sr-only">Offer created</DialogTitle>
                <div className="absolute top-5 left-6">
                    <OffersBreadcrumbs current={offer?.name || ""} onBack={() => navigate("/settings/offers/edit")} />
                </div>
                <button aria-label="Close" className="absolute top-5 right-6 cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground" type="button" onClick={close}>
                    <LucideIcon.X className="size-5" />
                </button>
                <div className="flex h-full flex-col items-center justify-center text-center">
                    <LucideIcon.Tags className="-mt-4 size-12 text-muted-foreground" strokeWidth={1.25} />
                    <h1 className="mt-6 text-4xl font-bold tracking-tight">Your new offer is live!</h1>
                    <p className="mt-3 max-w-[510px] text-lg">You can share the link anywhere. In your newsletter, social media, a podcast, or in-person. It all just works.</p>
                    <div className="mt-8 flex w-full max-w-md flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            <Input name="offer-url" type="url" value={offerLink} disabled readOnly />
                            <Button onClick={() => void handleCopyClick()}>{isCopied ? "Copied!" : "Copy link"}</Button>
                        </div>
                        <div className='flex items-center gap-4 text-sm font-medium before:h-px before:grow before:bg-border before:content-[""] after:h-px after:grow after:bg-border after:content-[""]'>OR</div>
                        <div className="flex gap-2">
                            <Button aria-label="Share on X" className="h-8 grow" size="sm" variant="outline" onClick={handleTwitter}>
                                <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </Button>
                            <Button aria-label="Share on Facebook" className="h-8 grow" size="sm" variant="outline" onClick={handleFacebook}>
                                <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                            </Button>
                            <Button aria-label="Share on LinkedIn" className="h-8 grow" size="sm" variant="outline" onClick={handleLinkedIn}>
                                <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" /></svg>
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
