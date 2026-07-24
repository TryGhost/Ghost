import { useEffect, useState } from "react";
import { Avatar, Button, NoValueLabel, NoValueLabelIcon, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger, TabsTriggerCount } from "@tryghost/shade/components";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { type User, hasAdminAccess, isContributorUser, isEditorUser } from "@tryghost/admin-x-framework/api/users";
import { type UserInvite, useAddInvite, useDeleteInvite } from "@tryghost/admin-x-framework/api/invites";
import { getSettingValue, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup } from "@/settings/app/shared/setting-group";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useStaffUsers } from "@/settings/app/shared/use-staff-users";

function Owner({ user, currentUser }: { user: User | undefined; currentUser: User | null }) {
    const navigate = useNavigate();
    const canEdit = currentUser !== null && hasAdminAccess(currentUser);

    if (!user) {
        return null;
    }

    const showDetail = () => {
        if (canEdit) {
            navigate(`/settings/staff/${user.slug}`);
        }
    };

    return (
        <div className={cn("group flex gap-3", canEdit && "cursor-pointer")} data-testid="owner-user" onClick={showDetail}>
            <Avatar className="size-12" email={user.email} name={user.name} src={user.profile_image} />
            <div className="flex flex-col">
                <span>{user.name} &mdash; <strong>Owner</strong> {canEdit && <button className="ml-2 inline-block cursor-pointer font-semibold text-primary group-hover:visible md:invisible" type="button">View profile</button>}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
        </div>
    );
}

function UsersList({ users, groupname, currentUser }: { users: User[]; groupname: string; currentUser: User | null }) {
    const navigate = useNavigate();

    if (!users.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.UserRoundX /></NoValueLabelIcon>
                No {groupname} found.
            </NoValueLabel>
        );
    }

    return (
        <div className="flex flex-col">
            {users.map((user) => {
                let title = user.name || "";
                if (user.status === "inactive") {
                    title = `${title} (Suspended)`;
                }

                const canEdit = currentUser !== null && (
                    hasAdminAccess(currentUser) ||
                    (isEditorUser(currentUser) && isContributorUser(user)) ||
                    currentUser.id === user.id
                );

                return (
                    <div
                        key={user.id}
                        className={cn("group flex min-h-[64px] items-center gap-3 py-3", canEdit && "cursor-pointer hover:bg-muted/50")}
                        data-testid="user-list-item"
                        onClick={() => canEdit && navigate(`/settings/staff/${user.slug}`)}
                    >
                        <Avatar className="size-10" email={user.email} name={user.name} src={user.profile_image} />
                        <div className="flex min-w-0 grow flex-col">
                            <span className="truncate font-medium">{title}</span>
                            <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                        </div>
                        {canEdit && (
                            <Button className="text-primary group-hover:visible md:invisible" size="sm" variant="ghost">Edit</Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function UserInviteActions({ invite }: { invite: UserInvite }) {
    const [revokeState, setRevokeState] = useState<"progress" | "">("");
    const [resendState, setResendState] = useState<"progress" | "">("");

    const { mutateAsync: deleteInvite } = useDeleteInvite();
    const { mutateAsync: addInvite } = useAddInvite();
    const handleError = useSettingsHandleError();

    return (
        <div className="flex gap-2">
            <Button
                className="text-destructive"
                size="sm"
                variant="ghost"
                onClick={(event) => void (async () => {
                    event.stopPropagation();
                    try {
                        setRevokeState("progress");
                        await deleteInvite(invite.id);
                        showToast({ title: "Invitation revoked", message: invite.email, type: "success" });
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setRevokeState("");
                    }
                })()}
            >
                {revokeState === "progress" ? "Revoking..." : "Revoke"}
            </Button>
            <Button
                className="ml-2 text-primary"
                size="sm"
                variant="ghost"
                onClick={(event) => void (async () => {
                    event.stopPropagation();
                    try {
                        setResendState("progress");
                        await deleteInvite(invite.id);
                        await addInvite({ email: invite.email, roleId: invite.role_id });
                        showToast({ title: "Invitation resent", message: invite.email, type: "success" });
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setResendState("");
                    }
                })()}
            >
                {resendState === "progress" ? "Resending..." : "Resend"}
            </Button>
        </div>
    );
}

function InvitesUserList({ invites }: { invites: Array<UserInvite & { role?: string }> }) {
    if (!invites.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.UserRoundX /></NoValueLabelIcon>
                No invitations found.
            </NoValueLabel>
        );
    }

    return (
        <div className="flex flex-col">
            {invites.map((invite) => (
                <div key={invite.id} className="group flex min-h-[64px] items-center gap-3 py-3" data-testid="user-invite">
                    <Avatar className="size-10" email={invite.email} />
                    <div className="flex min-w-0 grow flex-col">
                        <span className="truncate font-medium">{invite.email}</span>
                        <span className="truncate text-sm text-muted-foreground">{invite.role}</span>
                    </div>
                    <div className="group-hover:visible md:invisible">
                        <UserInviteActions invite={invite} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function Users({ keywords }: { keywords: string[] }) {
    const {
        totalUsers,
        totalInvites,
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        invites,
        currentUser,
        hasNextPage,
        fetchNextPage,
        invitesHasNextPage,
        fetchNextInvitePage,
    } = useStaffUsers();
    const navigate = useNavigate();
    const location = useLocation();
    const { data: configData } = useBrowseConfig();
    const config = configData?.config;
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];

    const tabParam = new URLSearchParams(location.search).get("tab");
    const [selectedTab, setSelectedTab] = useState(tabParam || "administrators");

    useEffect(() => {
        if (tabParam) {
            setSelectedTab(tabParam);
        }
    }, [tabParam]);

    const updateSelectedTab = (newTab: string) => {
        navigate(`/settings/staff?tab=${newTab}`);
        setSelectedTab(newTab);
    };

    const require2fa = getSettingValue<boolean>(settings, "require_email_mfa") || false;
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();

    return (
        <SettingGroup
            customButtons={(
                <Button size="sm" variant="ghost" onClick={() => navigate("/settings/staff/invite")}>Invite people</Button>
            )}
            keywords={keywords}
            navid="staff"
            testId="users"
            title="Staff"
        >
            <Owner currentUser={currentUser} user={ownerUser} />
            {(users.length > 1 || invites.length > 0) && (
                <Tabs data-testid="user-tabview" value={selectedTab} variant="underline" onValueChange={updateSelectedTab}>
                    <TabsList>
                        <TabsTrigger value="administrators">Administrators{adminUsers.length > 0 && <TabsTriggerCount>{formatNumber(adminUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value="editors">Editors{editorUsers.length > 0 && <TabsTriggerCount>{formatNumber(editorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value="authors">Authors{authorUsers.length > 0 && <TabsTriggerCount>{formatNumber(authorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value="contributors">Contributors{contributorUsers.length > 0 && <TabsTriggerCount>{formatNumber(contributorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value="invited">Invited{totalInvites > 0 && <TabsTriggerCount>{formatNumber(totalInvites)}</TabsTriggerCount>}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="administrators"><UsersList currentUser={currentUser} groupname="administrators" users={adminUsers} /></TabsContent>
                    <TabsContent value="editors"><UsersList currentUser={currentUser} groupname="editors" users={editorUsers} /></TabsContent>
                    <TabsContent value="authors"><UsersList currentUser={currentUser} groupname="authors" users={authorUsers} /></TabsContent>
                    <TabsContent value="contributors"><UsersList currentUser={currentUser} groupname="contributors" users={contributorUsers} /></TabsContent>
                    <TabsContent value="invited"><InvitesUserList invites={invites} /></TabsContent>
                </Tabs>
            )}

            {hasNextPage && selectedTab !== "invited" && (
                <Button className="self-start text-primary" size="sm" variant="ghost" onClick={() => fetchNextPage()}>
                    {`Load more (showing ${formatNumber(users.length)}/${formatNumber(totalUsers)} users)`}
                </Button>
            )}
            {invitesHasNextPage && selectedTab === "invited" && (
                <Button className="self-start text-primary" size="sm" variant="ghost" onClick={() => fetchNextInvitePage()}>
                    {`Load more (showing ${formatNumber(invites.length)}/${formatNumber(totalInvites)} invites)`}
                </Button>
            )}

            {config?.security?.staffDeviceVerification && currentUser && hasAdminAccess(currentUser) && (
                <div className={cn("flex flex-col gap-6", (users.length > 1 || invites.length > 0) && "-mt-6")}>
                    <Separator />
                    <div className="flex items-baseline justify-between">
                        <div className="flex flex-col">
                            <span className="text-[1.5rem] font-semibold tracking-tight">Security settings</span>
                            <span>Require email 2FA codes to be used on all staff logins</span>
                        </div>
                        <Switch
                            aria-label="Require email 2FA codes on staff logins"
                            checked={require2fa}
                            onCheckedChange={(newValue) => void (async () => {
                                try {
                                    await editSettings([{ key: "require_email_mfa", value: newValue }]);
                                } catch (error) {
                                    handleError(error);
                                }
                            })()}
                        />
                    </div>
                </div>
            )}
        </SettingGroup>
    );
}
