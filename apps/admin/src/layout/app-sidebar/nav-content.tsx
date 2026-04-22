import React from "react"

import {SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge} from "@tryghost/shade/components"
import {formatNumber, LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import { useMemberCount } from "./hooks/use-member-count";
import { useNavigationExpanded } from "./hooks/use-navigation-preferences";
import { NavCustomViews } from "./nav-custom-views";
import { NavMemberViews } from "./nav-member-views";
import { useMemberSidebarViews } from "./member-sidebar-views";
import { useCustomSidebarViews } from "./use-custom-sidebar-views";
import { useIsActiveLink } from "./use-is-active-link";
import { useEmberRouting } from "@/ember-bridge";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

const LEGACY_MEMBERS_ACTIVE_ROUTES = ['member', 'member.new', 'members-activity'];

function PostsNavItemContent({isActive, to}: {isActive: boolean; to: string}) {
    return (
        <>
            <NavMenuItem.Link
                to={to}
                isActive={isActive}
            >
                <LucideIcon.PenLine className="pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0" />
                <NavMenuItem.Label>Posts</NavMenuItem.Label>
            </NavMenuItem.Link>
            <a href="#/editor/post"
                aria-label="Create new post"
                className="absolute top-0 right-0 flex size-8 items-center justify-center rounded-full p-0 text-gray-700 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
                <LucideIcon.Plus
                    size={20}
                    className="mt-px stroke-[1.5px]!"
                />
            </a>
        </>
    );
}

function MembersNavItemContent({
    collapsible,
    count,
    isActive,
    to
}: {
    collapsible: boolean;
    count: number | null | undefined;
    isActive: boolean;
    to: string;
}) {
    return (
        <>
            <NavMenuItem.Link
                to={to}
                isActive={isActive}
            >
                <LucideIcon.Users className={collapsible ? "pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0" : ""} />
                <NavMenuItem.Label>Members</NavMenuItem.Label>
            </NavMenuItem.Link>
            {count != null && (
                <SidebarMenuBadge>{(formatNumber as (value: number) => string)(count)}</SidebarMenuBadge>
            )}
        </>
    );
}

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const [savedPostsExpanded, setPostsExpanded] = useNavigationExpanded('posts');
    const [savedMembersExpanded, setMembersExpanded] = useNavigationExpanded('members');
    const postCustomViews = useCustomSidebarViews('posts');
    const memberViews = useMemberSidebarViews();
    const hasMemberViews = memberViews.length > 0;
    const memberCount = useMemberCount();
    const routing = useEmberRouting();
    const commentModerationEnabled = useFeatureFlag('commentModeration');
    const isMembersRouteActive = useIsActiveLink({path: 'members', activeOnSubpath: true});

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);
    const isDraftPostsRouteActive = routing.isRouteActive('posts', {type: 'draft'});
    const isScheduledPostsRouteActive = routing.isRouteActive('posts', {type: 'scheduled'});
    const isPublishedPostsRouteActive = routing.isRouteActive('posts', {type: 'published'});
    const hasActivePostChild = isDraftPostsRouteActive || isScheduledPostsRouteActive || isPublishedPostsRouteActive || postCustomViews.some(view => view.isActive);
    const postsExpanded = savedPostsExpanded;
    const hasActiveMemberView = hasMemberViews && memberViews.some(view => view.isActive);
    const membersExpanded = savedMembersExpanded;
    const membersNavActive = isMembersRouteActive
        ? (!hasActiveMemberView || !membersExpanded)
        : routing.isRouteActive(LEGACY_MEMBERS_ACTIVE_ROUTES);
    const postsRoute = routing.getRouteUrl('posts');
    const isPostsRouteActive = routing.isRouteActive('posts');
    const postsNavActive = isPostsRouteActive || (!postsExpanded && hasActivePostChild);
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem.Collapsible
                        expanded={postsExpanded}
                        id="posts-submenu"
                        onExpandedChange={setPostsExpanded}
                    >
                        <NavMenuItem.CollapsibleItem ariaLabel="Toggle post views">
                            <PostsNavItemContent
                                isActive={postsNavActive}
                                to={postsRoute}
                            />
                        </NavMenuItem.CollapsibleItem>

                        <NavMenuItem.CollapsibleMenu>
                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=draft"
                                    isActive={isDraftPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=scheduled"
                                    isActive={isScheduledPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=published"
                                    isActive={isPublishedPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Published</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavCustomViews />
                        </NavMenuItem.CollapsibleMenu>
                    </NavMenuItem.Collapsible>

                    <NavMenuItem>
                        <NavMenuItem.Link
                            to={routing.getRouteUrl('pages')}
                            isActive={routing.isRouteActive('pages')}
                        >
                            <LucideIcon.File />
                            <NavMenuItem.Label>Pages</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>

                    {showTags && (
                        <NavMenuItem>
                            <NavMenuItem.Link
                                to="tags"
                                activeOnSubpath
                            >
                                <LucideIcon.Tag />
                                <NavMenuItem.Label>Tags</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}

                    {showMembers && (
                        <>
                            {hasMemberViews ? (
                                <NavMenuItem.Collapsible
                                    expanded={membersExpanded}
                                    id="members-submenu"
                                    onExpandedChange={setMembersExpanded}
                                >
                                    <NavMenuItem.CollapsibleItem ariaLabel="Toggle member views">
                                        <MembersNavItemContent
                                            collapsible={true}
                                            count={memberCount}
                                            isActive={membersNavActive}
                                            to="members"
                                        />
                                    </NavMenuItem.CollapsibleItem>

                                    <NavMenuItem.CollapsibleMenu>
                                        <NavMemberViews />
                                    </NavMenuItem.CollapsibleMenu>
                                </NavMenuItem.Collapsible>
                            ) : (
                                <NavMenuItem>
                                    <MembersNavItemContent
                                        collapsible={false}
                                        count={memberCount}
                                        isActive={membersNavActive}
                                        to="members"
                                    />
                                </NavMenuItem>
                            )}
                        </>
                    )}

                    {showMembers && commentModerationEnabled && (
                        <NavMenuItem>
                            <NavMenuItem.Link
                                to="comments"
                                activeOnSubpath
                            >
                                <LucideIcon.MessagesSquare />
                                <NavMenuItem.Label>Comments</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
