import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {post, postId} = useGlobalData();
    const typedPost = post as Post;
    
    // In the Ember app, a post has been emailed if:
    // 1. It has an email object with non-failed status, or
    // 2. It has email_only flag set
    const hasBeenEmailed = Boolean(
        (typedPost?.email && typedPost.email.status !== 'failed') || 
        typedPost?.email_only
    );

    return (
        <div className='grow py-8 pr-0'>
            <RightSidebarMenu>
                <RightSidebarMenuLink active={location.pathname === `/analytics/beta/${postId}`} onClick={() => {
                    navigate(`/analytics/beta/${postId}`);
                }}>
                    <LucideIcon.LayoutTemplate size={16} strokeWidth={1.25} />
                    Overview
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === `/analytics/beta/${postId}/web`} onClick={() => {
                    navigate(`/analytics/beta/${postId}/web`);
                }}>
                    <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                    Web
                </RightSidebarMenuLink>

                {hasBeenEmailed && (
                    <RightSidebarMenuLink active={location.pathname === `/analytics/beta/${postId}/newsletter`} onClick={() => {
                        navigate(`/analytics/beta/${postId}/newsletter`);
                    }}>
                        <LucideIcon.Mail size={16} strokeWidth={1.25} />
                        Newsletter
                    </RightSidebarMenuLink>
                )}

                <RightSidebarMenuLink active={location.pathname === `/analytics/beta/${postId}/growth`} onClick={() => {
                    navigate(`/analytics/beta/${postId}/growth`);
                }}>
                    <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                Growth
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;
