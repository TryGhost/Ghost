import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {POSTS_ANALYTICS_ROUTES, useLocation, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {post, postId} = useGlobalData();
    
    // In the Ember app, a post has been emailed if:
    // 1. It has an email object with non-failed status, or
    // 2. It has email_only flag set
    const hasBeenEmailed = Boolean(
        (post?.email && post.email.status !== 'failed') || 
        post?.email_only
    );

    return (
        <div className='grow py-8 pr-0'>
            <RightSidebarMenu>
                <RightSidebarMenuLink active={location.pathname === POSTS_ANALYTICS_ROUTES.OVERVIEW(postId!)} onClick={() => {
                    navigate(POSTS_ANALYTICS_ROUTES.OVERVIEW(postId!));
                }}>
                    <LucideIcon.LayoutTemplate size={16} strokeWidth={1.25} />
                    Overview
                </RightSidebarMenuLink>
                {!post?.email_only && (
                    <RightSidebarMenuLink active={location.pathname === POSTS_ANALYTICS_ROUTES.WEB(postId!)} onClick={() => {
                        navigate(POSTS_ANALYTICS_ROUTES.WEB(postId!));
                    }}>
                        <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                        Web
                    </RightSidebarMenuLink>
                )}

                {hasBeenEmailed && (
                    <RightSidebarMenuLink active={location.pathname === POSTS_ANALYTICS_ROUTES.NEWSLETTER(postId!)} onClick={() => {
                        navigate(POSTS_ANALYTICS_ROUTES.NEWSLETTER(postId!));
                    }}>
                        <LucideIcon.Mail size={16} strokeWidth={1.25} />
                        Newsletter
                    </RightSidebarMenuLink>
                )}

                <RightSidebarMenuLink active={location.pathname === POSTS_ANALYTICS_ROUTES.GROWTH(postId!)} onClick={() => {
                    navigate(POSTS_ANALYTICS_ROUTES.GROWTH(postId!));
                }}>
                    <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                Growth
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;
