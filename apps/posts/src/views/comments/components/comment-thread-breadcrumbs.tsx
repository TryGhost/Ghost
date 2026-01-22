import React from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@tryghost/shade';
import {useNavigate, useLocation} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

interface CommentThreadBreadcrumbsProps {
    commentSnippet: string;
}

const CommentThreadBreadcrumbs: React.FC<CommentThreadBreadcrumbsProps> = ({commentSnippet}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const truncatedSnippet = commentSnippet.length > 30
        ? `${commentSnippet.substring(0, 30)}...`
        : commentSnippet;

    const handleBackClick = () => {
        const state = (location.state as {filters?: Filter[]}) || {};
        navigate('/comments', {
            state: state
        });
    };

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink
                        className="cursor-pointer"
                        onClick={handleBackClick}
                    >
                        Comments
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>{truncatedSnippet}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default CommentThreadBreadcrumbs;
