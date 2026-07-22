import { Route, Routes } from "react-router";
import { createPortal } from "react-dom";
import { Navigate, useParams } from "@tryghost/admin-x-framework";

import { AboutDialog } from "./about-dialog";
import { resolveSettingsArea } from "./nav";
import { SettingsSearchProvider } from "./search-provider";
import { SettingsShell } from "./settings-shell";
import { ConfirmationProvider } from "./shared/confirmation";
import { SettingsDirtyProvider } from "./shared/dirty";
import { InviteUserDialog } from "@/settings/general/invite-user-dialog";
import { UserDetailDialog } from "@/settings/general/user-detail-dialog";
import { PortalDialog } from "@/settings/membership/portal-dialog";
import { StripeConnectDialog } from "@/settings/membership/stripe-connect-dialog";
import { TierDetailDialog } from "@/settings/membership/tier-detail-dialog";
import { AddNewsletterDialog } from "@/settings/email/add-newsletter-dialog";
import { NewsletterDetailDialog } from "@/settings/email/newsletter-detail-dialog";
import { AddOfferDialog } from "@/settings/growth/add-offer-dialog";
import { AddRecommendationDialog } from "@/settings/growth/add-recommendation-dialog";
import { EditOfferDialog } from "@/settings/growth/edit-offer-dialog";
import { EditRetentionOfferDialog } from "@/settings/growth/edit-retention-offer-dialog";
import { EmbedSignupDialog } from "@/settings/growth/embed-signup-dialog";
import { OfferSuccessDialog } from "@/settings/growth/offer-success-dialog";
import { OffersIndexDialog } from "@/settings/growth/offers-index-dialog";
import { TestimonialsDialog } from "@/settings/growth/testimonials-dialog";
import { AnnouncementBarDialog } from "@/settings/site/announcement-bar-dialog";
import { ChangeThemeDialog } from "@/settings/site/change-theme-dialog";
import { DesignDialog } from "@/settings/site/design-dialog";
import { NavigationDialog } from "@/settings/site/navigation-dialog";
import { ThemeCodeEditorDialog } from "@/settings/site/theme-code-editor-dialog";
import { AddIntegrationDialog } from "@/settings/advanced/add-integration-dialog";
import { ContentApiDialog } from "@/settings/advanced/content-api-dialog";
import { CustomIntegrationDialog } from "@/settings/advanced/custom-integration-dialog";
import { FirstPromoterDialog } from "@/settings/advanced/firstpromoter-dialog";
import { HistoryDialog } from "@/settings/advanced/history-dialog";
import { PinturaDialog } from "@/settings/advanced/pintura-dialog";
import { SlackDialog } from "@/settings/advanced/slack-dialog";
import { TransistorDialog } from "@/settings/advanced/transistor-dialog";
import { UnsplashDialog } from "@/settings/advanced/unsplash-dialog";
import { ZapierDialog } from "@/settings/advanced/zapier-dialog";

/**
 * Flag-on entry for `/settings/*` (see settings-gate.tsx): the native Shade
 * settings app. Route scaffolding under the splat:
 *
 * - `/settings` — the shell, scrolled to the top
 * - `/settings/:area` — the shell, scrolled to the routed area; `:area`
 *   accepts area ids and every legacy nav segment (e.g. `design`)
 * - `/settings/staff/invite` — the staff invite dialog over the shell
 * - `/settings/staff/:slug(/:tab)` — the staff user detail dialog
 * - site-area dialogs: `design/edit`, `design/change-theme`,
 *   `theme/install`, `theme/edit/:themeName`, `navigation/edit`,
 *   `announcement-bar/edit`
 * - membership-area dialogs: `portal/edit`, `tiers/add`, `tiers/:tierId`,
 *   `stripe-connect`
 * - email-area dialogs: `newsletters/new`, `newsletters/:newsletterId`
 * - growth-area dialogs: `recommendations/add`, `explore/testimonial`,
 *   `embed-signup-form/show`, `offers/new`, `offers/edit`,
 *   `offers/edit/:offerId`, `offers/edit/retention(/:cadence)`,
 *   `offers/success/:offerId`
 * - advanced-area dialogs: `integrations/new`, the built-in integration
 *   configs (`integrations/zapier|slack|unsplash|firstpromoter|pintura|
 *   transistor|contentapi`), `integrations/:integrationId`,
 *   `history/view(/:userId)`
 * - anything deeper or unknown redirects to `/settings`
 *
 * Rendered through a portal with the same wrapper as the legacy settings
 * app (src/settings/settings.tsx) so the full-screen takeover stacks
 * identically over the admin chrome.
 */

function AreaRoute() {
    const { area } = useParams();

    if (area && !resolveSettingsArea(area)) {
        return <Navigate to="/settings" replace />;
    }

    return null;
}

export default function ShadeSettingsApp() {
    return createPortal(
        <div
            className="shade shade-admin"
            data-testid="shade-settings"
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
            }}
        >
            <SettingsDirtyProvider>
                <ConfirmationProvider>
                    <SettingsSearchProvider>
                        <Routes>
                            <Route element={<SettingsShell />}>
                                <Route index element={null} />
                                <Route element={<InviteUserDialog />} path="staff/invite" />
                                <Route element={<UserDetailDialog />} path="staff/:slug" />
                                <Route element={<UserDetailDialog />} path="staff/:slug/:tab" />
                                <Route element={<DesignDialog />} path="design/edit" />
                                <Route element={<ChangeThemeDialog />} path="design/change-theme" />
                                <Route element={<ChangeThemeDialog install />} path="theme/install" />
                                <Route element={<ThemeCodeEditorDialog />} path="theme/edit/:themeName" />
                                <Route element={<Navigate to="/settings/theme" replace />} path="theme/edit/*" />
                                <Route element={<NavigationDialog />} path="navigation/edit" />
                                <Route element={<AnnouncementBarDialog />} path="announcement-bar/edit" />
                                <Route element={<PortalDialog />} path="portal/edit" />
                                <Route element={<TierDetailDialog />} path="tiers/add" />
                                <Route element={<TierDetailDialog />} path="tiers/:tierId" />
                                <Route element={<StripeConnectDialog />} path="stripe-connect" />
                                <Route element={<AddNewsletterDialog />} path="newsletters/new" />
                                <Route element={<NewsletterDetailDialog />} path="newsletters/:newsletterId" />
                                <Route element={<AddRecommendationDialog />} path="recommendations/add" />
                                <Route element={<TestimonialsDialog />} path="explore/testimonial" />
                                <Route element={<EmbedSignupDialog />} path="embed-signup-form/show" />
                                <Route element={<AddOfferDialog />} path="offers/new" />
                                <Route element={<OffersIndexDialog />} path="offers/edit" />
                                <Route element={<OffersIndexDialog />} path="offers/edit/retention" />
                                <Route element={<EditRetentionOfferDialog />} path="offers/edit/retention/:cadence" />
                                <Route element={<EditOfferDialog />} path="offers/edit/:offerId" />
                                <Route element={<OfferSuccessDialog />} path="offers/success/:offerId" />
                                <Route element={<AddIntegrationDialog />} path="integrations/new" />
                                <Route element={<ZapierDialog />} path="integrations/zapier" />
                                <Route element={<SlackDialog />} path="integrations/slack" />
                                <Route element={<UnsplashDialog />} path="integrations/unsplash" />
                                <Route element={<FirstPromoterDialog />} path="integrations/firstpromoter" />
                                <Route element={<PinturaDialog />} path="integrations/pintura" />
                                <Route element={<TransistorDialog />} path="integrations/transistor" />
                                <Route element={<ContentApiDialog />} path="integrations/contentapi" />
                                <Route element={<CustomIntegrationDialog />} path="integrations/:integrationId" />
                                <Route element={<HistoryDialog />} path="history/view" />
                                <Route element={<HistoryDialog />} path="history/view/:userId" />
                                <Route element={<AboutDialog />} path="about" />
                                {/* The retired lock-site screen redirects to Access, like the legacy app. */}
                                <Route element={<Navigate to="/settings/members" replace />} path="locksite" />
                                <Route element={<AreaRoute />} path=":area" />
                                <Route element={<Navigate to="/settings" replace />} path="*" />
                            </Route>
                        </Routes>
                    </SettingsSearchProvider>
                </ConfirmationProvider>
            </SettingsDirtyProvider>
        </div>,
        document.body,
    );
}
