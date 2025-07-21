import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, LucideIcon} from '@tryghost/shade';
import {POSTS_ANALYTICS_ROUTES, buildCrossAppPostsRoute, useNavigate} from '@tryghost/admin-x-framework';

interface PostMenuProps {
    postId?: string;
    pathName?: string;
}

const PostMenu:React.FC<PostMenuProps> = ({
    postId,
    pathName
}) => {
    const navigate = useNavigate();

    if (!postId && !pathName) {
        return <></>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className='h-6 px-2 hover:bg-gray-200' variant='ghost'>
                    <LucideIcon.Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                {postId && (
                    <DropdownMenuItem onClick={() => {
                        navigate(buildCrossAppPostsRoute(POSTS_ANALYTICS_ROUTES.OVERVIEW(postId)), {crossApp: true});
                    }}>
                        <LucideIcon.BarChart2 />
                        Post analytics
                    </DropdownMenuItem>
                )}
                {pathName && (

                    <DropdownMenuItem asChild>
                        <a href={`${pathName}`} rel="noreferrer" target='_blank'>
                            <LucideIcon.SquareArrowOutUpRight />
                            Open in browser
                        </a>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default PostMenu;