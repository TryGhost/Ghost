import {AddComment, Comment, Member} from '../app-context';
import {AdminApi} from '../utils/admin-api';
import {GhostApi} from '../utils/api';

type BaseCommentApi = {
    browse(params: {page: number; postId: string; order?: string}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    replies(params: {commentId: string; afterReplyId?: string; limit?: number | 'all'}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    read(commentId: string): Promise<{comments: Comment[]}>;
    count(params: {postId: string | null}): Promise<any>;

    add(params: {comment: AddComment}): Promise<{comments: Comment[]}>;
    edit(params: {comment: Partial<Comment> & {id: string}}): Promise<{comments: Comment[]}>;
    like(params: {comment: {id: string}}): Promise<string>;
    unlike(params: {comment: {id: string}}): Promise<string>;
    report(params: {comment: {id: string}}): Promise<string>;

    updateMember(data: {name?: string; expertise?: string}): Promise<Member | null>;
};

export type MemberCommentApi = BaseCommentApi & {isAdmin: false};

export type AdminCommentApi = BaseCommentApi & {
    isAdmin: true;
    hideComment(id: string): Promise<any>;
    showComment(params: {id: string}): Promise<any>;
};

export type CommentApi = MemberCommentApi | AdminCommentApi;

export function createCommentApi(api: GhostApi, adminApi: AdminApi | null, memberUuid?: string): CommentApi {
    if (adminApi) {
        return {
            isAdmin: true,
            browse: p => adminApi.browse({...p, memberUuid}),
            replies: p => adminApi.replies({...p, memberUuid}),
            read: id => adminApi.read({commentId: id, memberUuid}),
            count: p => api.comments.count(p),
            add: p => api.comments.add(p),
            edit: p => api.comments.edit(p),
            like: p => api.comments.like(p),
            unlike: p => api.comments.unlike(p),
            report: p => api.comments.report(p),
            updateMember: data => api.member.update(data),
            hideComment: id => adminApi.hideComment(id),
            showComment: p => adminApi.showComment(p)
        };
    }

    return {
        isAdmin: false,
        browse: p => api.comments.browse(p),
        replies: p => api.comments.replies(p),
        read: id => api.comments.read(id),
        count: p => api.comments.count(p),
        add: p => api.comments.add(p),
        edit: p => api.comments.edit(p),
        like: p => api.comments.like(p),
        unlike: p => api.comments.unlike(p),
        report: p => api.comments.report(p),
        updateMember: data => api.member.update(data)
    };
}
