import {randomUUID} from 'node:crypto';
import type {
    CommentCreateRequest,
    CommentDeleteRequest,
    CommentDeleteResponse,
    CommentListRequest,
    CommentListResponse,
    CommentModerateRequest,
    CommentResponse,
    CommentUpdateRequest
} from './contracts.js';
import type {CommentRepository} from './repo.js';
import type {MemberRepository} from '../members/repo.js';
import type {SettingsRepository} from '../settings/repo.js';
import type {AnalyticsRepository} from '../analytics/repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type CommentService = {
    createComment: (input: CommentCreateRequest) => Promise<CommentResponse>;
    updateComment: (id: string, input: CommentUpdateRequest) => Promise<CommentResponse>;
    moderateComment: (id: string, input: CommentModerateRequest) => Promise<CommentResponse>;
    deleteComment: (id: string, input: CommentDeleteRequest) => Promise<CommentDeleteResponse>;
    listComments: (input: CommentListRequest) => Promise<CommentListResponse>;
};

const isCommentsEnabled = async (settingsRepository: SettingsRepository) => {
    const setting = await settingsRepository.getSettingByKey('feature.comments');
    if (!setting) {
        return true;
    }
    return JSON.parse(setting.value) === true;
};

const getCommentAccess = async (settingsRepository: SettingsRepository) => {
    const setting = await settingsRepository.getSettingByKey('comments.access');
    if (!setting) {
        return 'all' as const;
    }
    const value = String(JSON.parse(setting.value));
    return value === 'paid' ? 'paid' : 'all';
};

const toCommentResponse = (record: {
    id: string;
    postId: string;
    memberId: string;
    authorName: string;
    body: string;
    status: string;
    parentId: string | null;
    createdAt: number;
    updatedAt: number;
}): CommentResponse => ({
    comment: {
        id: record.id,
        postId: record.postId,
        memberId: record.memberId,
        authorName: record.authorName,
        body: record.body,
        status: record.status === 'published'
            ? 'published'
            : record.status === 'hidden'
                ? 'hidden'
                : 'pending',
        parentId: record.parentId ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    }
});

export const createCommentService = (
    repository: CommentRepository,
    memberRepository: MemberRepository,
    settingsRepository: SettingsRepository,
    analyticsRepository?: AnalyticsRepository
): CommentService => {
    const createComment = async (input: CommentCreateRequest) => {
        const enabled = await isCommentsEnabled(settingsRepository);
        if (!enabled) {
            throw new HttpError(403, 'comments_disabled', 'Comments are disabled');
        }

        const access = await getCommentAccess(settingsRepository);

        const member = await memberRepository.getMemberById(input.memberId);
        if (!member) {
            throw new HttpError(404, 'member_not_found', 'Member not found');
        }

        if (access === 'paid' && member.status !== 'paid') {
            throw new HttpError(403, 'comments_paid_only', 'Paid membership required');
        }

        const now = Date.now();
        const comment = await repository.createComment({
            id: randomUUID(),
            postId: input.postId,
            memberId: input.memberId,
            authorName: input.authorName,
            body: input.body,
            status: 'published',
            parentId: input.parentId ?? null,
            createdAt: now,
            updatedAt: now
        });

        if (analyticsRepository) {
            await analyticsRepository.createEvent({
                id: randomUUID(),
                memberId: input.memberId,
                type: 'comment.created',
                createdAt: now
            });
        }

        return toCommentResponse(comment);
    };

    const updateComment = async (id: string, input: CommentUpdateRequest) => {
        const comment = await repository.getCommentById(id);
        if (!comment) {
            throw new HttpError(404, 'comment_not_found', 'Comment not found');
        }

        if (comment.memberId !== input.memberId) {
            throw new HttpError(403, 'comment_forbidden', 'Not allowed to edit this comment');
        }

        const updated = await repository.updateComment({
            ...comment,
            body: input.body,
            updatedAt: Date.now()
        });

        return toCommentResponse(updated);
    };

    const moderateComment = async (id: string, input: CommentModerateRequest) => {
        const comment = await repository.getCommentById(id);
        if (!comment) {
            throw new HttpError(404, 'comment_not_found', 'Comment not found');
        }

        const updated = await repository.updateComment({
            ...comment,
            status: input.status,
            updatedAt: Date.now()
        });

        return toCommentResponse(updated);
    };

    const deleteComment = async (id: string, input: CommentDeleteRequest) => {
        const comment = await repository.getCommentById(id);
        if (!comment) {
            throw new HttpError(404, 'comment_not_found', 'Comment not found');
        }

        if (comment.memberId !== input.memberId) {
            throw new HttpError(403, 'comment_forbidden', 'Not allowed to delete this comment');
        }

        await repository.deleteComment(id);
        return {deleted: true};
    };

    const listComments = async (input: CommentListRequest) => {
        const enabled = await isCommentsEnabled(settingsRepository);
        if (!enabled) {
            throw new HttpError(403, 'comments_disabled', 'Comments are disabled');
        }

        const listInput: Parameters<CommentRepository['listComments']>[0] = {
            postId: input.postId,
            sort: input.sort ?? 'newest',
            limit: input.limit ?? 20
        };

        if (input.parentId) {
            listInput.parentId = input.parentId;
        }

        if (input.cursor !== undefined) {
            listInput.cursor = input.cursor;
        }

        const comments = await repository.listComments(listInput);

        const nextCursor = comments.length > 0 ? comments[comments.length - 1]?.createdAt ?? null : null;
        return {
            comments: comments.map((comment) => toCommentResponse(comment).comment),
            nextCursor
        };
    };

    return {
        createComment,
        updateComment,
        moderateComment,
        deleteComment,
        listComments
    };
};
