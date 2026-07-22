import { useState } from "react";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, Switch, Textarea } from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { type User, hasAdminAccess } from "@tryghost/admin-x-framework/api/users";
import { checkStripeEnabled, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { type Config, useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { SOCIAL_PLATFORM_CONFIGS, normalizeSocialInput } from "@tryghost/admin-x-settings/src/utils/social-urls";
import type { SocialPlatformKey } from "@tryghost/admin-x-settings/src/utils/social-urls";

import { ChangePasswordForm } from "./change-password-form";
import { RoleSelector } from "./role-selector";
import { StaffToken } from "./staff-token";
import { SettingGroupContent } from "@/settings/app/shared/setting-group";
import { TextField } from "@/settings/app/shared/text-field";

export interface UserDetailProps {
    user: User;
    setUserData: (user: User) => void;
    errors: { [key in keyof User]?: string };
    validateField: <K extends keyof User>(key: K, value: User[K]) => boolean;
    clearError: (key: keyof User) => void;
}

export function ProfileTab({ errors, clearError, user, setUserData }: UserDetailProps) {
    const { data: currentUser } = useCurrentUser();
    const { data: siteResponse } = useBrowseSite();
    const homepageUrl = siteResponse ? getHomepageUrl(siteResponse.site) : "";

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.email}
                hint={errors?.email || "Used for notifications"}
                maxLength={191}
                title="Email"
                value={user.email}
                onChange={(e) => setUserData({ ...user, email: e.target.value })}
                onKeyDown={() => clearError("email")}
            />
            <ChangePasswordForm user={user} />
            {currentUser && hasAdminAccess(currentUser) && <RoleSelector setUserData={setUserData} user={user} />}
            <TextField
                error={!!errors?.name}
                hint={errors?.name || "Use your real name so people can recognize you"}
                maxLength={191}
                title="Full name"
                value={user.name}
                onChange={(e) => setUserData({ ...user, name: e.target.value })}
                onKeyDown={() => clearError("name")}
            />
            <TextField
                hint={`${homepageUrl}author/${user.slug}`}
                maxLength={191}
                title="Slug"
                value={user.slug}
                onChange={(e) => setUserData({ ...user, slug: e.target.value })}
            />
            <TextField
                error={!!errors?.location}
                hint={errors?.location || "Where in the world do you live?"}
                maxLength={65535}
                title="Location"
                value={user.location || ""}
                onChange={(e) => setUserData({ ...user, location: e.target.value })}
                onKeyDown={() => clearError("location")}
            />
            <Field data-invalid={Boolean(errors?.bio) || undefined}>
                <FieldLabel htmlFor="staff-bio">Bio</FieldLabel>
                <Textarea
                    aria-invalid={Boolean(errors?.bio) || undefined}
                    id="staff-bio"
                    maxLength={65535}
                    value={user.bio || ""}
                    onChange={(e) => setUserData({ ...user, bio: e.target.value })}
                    onKeyDown={() => clearError("bio")}
                />
                {errors?.bio ? <FieldError>{errors.bio}</FieldError> : <FieldDescription>Recommended: {formatNumber(250)} characters. You&lsquo;ve used <span className="font-bold">{formatNumber(user.bio?.length || 0)}</span></FieldDescription>}
            </Field>
            {user.id === currentUser?.id && <StaffToken />}
        </SettingGroupContent>
    );
}

export function SocialLinksTab({ errors, clearError, validateField, user, setUserData }: UserDetailProps) {
    const [urls, setUrls] = useState<Record<SocialPlatformKey, string>>(() => {
        return Object.fromEntries(SOCIAL_PLATFORM_CONFIGS.map((config) => {
            const value = user[config.key];
            return [config.key, config.toDisplayValue(value)];
        })) as Record<SocialPlatformKey, string>;
    });

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.website}
                hint={errors?.website}
                maxLength={2000}
                placeholder="https://example.com"
                testId="website-input"
                title="Website"
                value={user.website || ""}
                onChange={(event) => setUserData({ ...user, website: event.target.value })}
                onKeyDown={() => clearError("website")}
            />
            {SOCIAL_PLATFORM_CONFIGS.map((config) => (
                <TextField
                    key={config.key}
                    error={!!errors?.[config.key]}
                    hint={errors?.[config.key]}
                    maxLength={2000}
                    placeholder={config.placeholder}
                    testId={config.testId}
                    title={config.staffTitle}
                    value={urls[config.key]}
                    onBlur={(event) => {
                        if (validateField(config.key, event.target.value)) {
                            const { displayValue, storedValue } = normalizeSocialInput(config.key, event.target.value);
                            setUrls((current) => ({ ...current, [config.key]: displayValue }));
                            setUserData({ ...user, [config.key]: storedValue });
                        }
                    }}
                    onChange={(event) => {
                        setUrls((current) => ({ ...current, [config.key]: event.target.value }));
                    }}
                    onKeyDown={() => clearError(config.key)}
                />
            ))}
        </SettingGroupContent>
    );
}

export function EmailNotificationsTab({ user, setUserData }: { user: User; setUserData: (user: User) => void }) {
    const { data: configData } = useBrowseConfig();
    const { data: settingsData } = useBrowseSettings();
    const hasStripeEnabled = checkStripeEnabled(settingsData?.settings || [], configData?.config || ({} as Config));

    return (
        <SettingGroupContent>
            <div>
                <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Engagement</span>
                <div className="mt-3 flex flex-col gap-4">
                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor="comment-notifications">Comments</FieldLabel>
                            <FieldDescription>Every time a member comments on one of your posts</FieldDescription>
                        </FieldContent>
                        <Switch checked={Boolean(user.comment_notifications)} id="comment-notifications" onCheckedChange={(checked) => setUserData({ ...user, comment_notifications: checked })} />
                    </Field>
                    {hasAdminAccess(user) &&
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="recommendation-notifications">Recommendations</FieldLabel>
                                <FieldDescription>Every time another publisher recommends you to their audience</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.recommendation_notifications)} id="recommendation-notifications" onCheckedChange={(checked) => setUserData({ ...user, recommendation_notifications: checked })} />
                        </Field>
                    }
                </div>
            </div>
            {hasAdminAccess(user) && <>
                <div>
                    <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Members</span>
                    <div className="mt-3 flex flex-col gap-4">
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="free-member-signup-notifications">New signups</FieldLabel>
                                <FieldDescription>Every time a new free member signs up</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.free_member_signup_notification)} id="free-member-signup-notifications" onCheckedChange={(checked) => setUserData({ ...user, free_member_signup_notification: checked })} />
                        </Field>
                        {hasStripeEnabled && <>
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="paid-subscription-started-notifications">New paid members</FieldLabel>
                                    <FieldDescription>Every time a member starts a new paid subscription</FieldDescription>
                                </FieldContent>
                                <Switch checked={Boolean(user.paid_subscription_started_notification)} id="paid-subscription-started-notifications" onCheckedChange={(checked) => setUserData({ ...user, paid_subscription_started_notification: checked })} />
                            </Field>
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="paid-subscription-canceled-notifications">Paid member cancellations</FieldLabel>
                                    <FieldDescription>Every time a member cancels their paid subscription</FieldDescription>
                                </FieldContent>
                                <Switch checked={Boolean(user.paid_subscription_canceled_notification)} id="paid-subscription-canceled-notifications" onCheckedChange={(checked) => setUserData({ ...user, paid_subscription_canceled_notification: checked })} />
                            </Field>
                        </>}
                    </div>
                </div>
                <div>
                    <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Revenue</span>
                    <div className="mt-3 flex flex-col gap-4">
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="milestone-notifications">Milestones</FieldLabel>
                                <FieldDescription>{hasStripeEnabled ? "Occasional summaries of your audience & revenue growth" : "Occasional summaries of your audience growth"}</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.milestone_notifications)} id="milestone-notifications" onCheckedChange={(checked) => setUserData({ ...user, milestone_notifications: checked })} />
                        </Field>
                        {hasStripeEnabled && <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="donation-notifications">Tips & donations</FieldLabel>
                                <FieldDescription>Every time you receive a one-time payment</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.donation_notifications)} id="donation-notifications" onCheckedChange={(checked) => setUserData({ ...user, donation_notifications: checked })} />
                        </Field>}
                        {hasStripeEnabled && <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="gift-subscription-notifications">Gift subscriptions</FieldLabel>
                                <FieldDescription>Every time someone purchases or redeems a gift subscription</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.gift_subscription_notifications)} id="gift-subscription-notifications" onCheckedChange={(checked) => setUserData({ ...user, gift_subscription_notifications: checked })} />
                        </Field>}
                    </div>
                </div>
            </>}
        </SettingGroupContent>
    );
}
