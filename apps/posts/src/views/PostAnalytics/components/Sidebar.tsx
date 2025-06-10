import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
// import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
// import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';

// Extended Email type to include status field
interface ExtendedEmail {
    opened_count: number;
    email_count: number;
    status?: string;
}

// Extended Post type with the ExtendedEmail and additional fields
interface PostWithEmail extends Post {
    email?: ExtendedEmail;
    newsletter_id?: string;
    newsletter?: object;
    status?: string;
    email_only?: boolean;
    email_segment?: string;
    email_recipient_filter?: string;
    send_email_when_published?: boolean;
    email_stats?: object;
}

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {postId} = useParams();
    // const {settings} = useGlobalData();
    // const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    const {data: {posts: [post]} = {posts: []}} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'email,status,email_only,email_segment,newsletter,newsletter_id'
        }
    });

    const typedPost = post as PostWithEmail;
    
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
