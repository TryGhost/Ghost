import {DESKTOP_MAX_THREAD_DEPTH} from '../../../src/utils/helpers';
import {buildComment, buildReply} from '../../utils/fixtures';
import {buildThreadGraph, buildThreadedReplies, getFocusedThread} from '../../../src/utils/thread-graph';

function buildNestedComment(depth: number) {
    const replies = [];
    let parentId: string | undefined;

    for (let i = 1; i <= depth; i += 1) {
        const id = `${i}`;
        replies.push(buildReply({
            id,
            ...(parentId ? {in_reply_to_id: parentId} : {})
        }));
        parentId = id;
    }

    return buildComment({id: 'top-level', replies});
}

describe('buildThreadedReplies', function () {
    it('builds nested replies from a flat reply list', function () {
        const threadParentComment = buildComment({
            id: 'root',
            replies: [
                {id: 'reply-1', in_reply_to_id: null},
                {id: 'reply-2', in_reply_to_id: 'reply-1'},
                {id: 'reply-3', in_reply_to_id: 'reply-2'},
                {id: 'reply-4', in_reply_to_id: null}
            ]
        });

        const threadedReplies = buildThreadedReplies(threadParentComment);

        expect(threadedReplies.map(reply => reply.id)).toEqual(['reply-1', 'reply-4']);
        expect(threadedReplies[0].nestedReplies.map(reply => reply.id)).toEqual(['reply-2']);
        expect(threadedReplies[0].nestedReplies[0].nestedReplies.map(reply => reply.id)).toEqual(['reply-3']);
    });

    it('keeps replies with missing parents at the root', function () {
        const threadParentComment = buildComment({
            id: 'root',
            replies: [
                {id: 'reply-1', in_reply_to_id: 'missing'}
            ]
        });

        expect(buildThreadedReplies(threadParentComment).map(reply => reply.id)).toEqual(['reply-1']);
    });
});

describe('buildThreadGraph', function () {
    it('builds a reply tree with lookup helpers', function () {
        const comment = buildComment({
            id: 'top-level',
            replies: [
                buildReply({id: '1'}),
                buildReply({id: '2', in_reply_to_id: '1'}),
                buildReply({id: '3', in_reply_to_id: '2'})
            ]
        });

        const graph = buildThreadGraph(comment);

        expect(graph.rootComment.id).toEqual('top-level');
        expect(graph.roots.map(reply => reply.id)).toEqual(['1']);
        expect(graph.roots[0].depth).toEqual(1);
        expect(graph.roots[0].nestedReplies[0].depth).toEqual(2);
        expect(graph.roots[0].nestedReplies[0].nestedReplies.map(reply => reply.id)).toEqual(['3']);
    });

    it('returns a focused window for deeply nested comments', function () {
        const comment = buildNestedComment(6);
        const graph = buildThreadGraph(comment);
        const threadWindow = graph.getWindowForComment('5', DESKTOP_MAX_THREAD_DEPTH);

        expect(threadWindow?.topLevelComment.id).toEqual('top-level');
        expect(threadWindow?.focusedComment.id).toEqual('4');
        expect(threadWindow?.backComment.id).toEqual('4');
    });
});

describe('getFocusedThread', function () {
    it('returns null when the target is visible in the main thread window', function () {
        const comment = buildNestedComment(2);

        expect(getFocusedThread([comment], '2', DESKTOP_MAX_THREAD_DEPTH)).toBeNull();
    });

    it('does not focus a shallow permalink', function () {
        const comment = buildNestedComment(4);

        expect(getFocusedThread([comment], '4', DESKTOP_MAX_THREAD_DEPTH)).toBeNull();
    });

    it('does not focus a level 4 permalink because it is visible in the main list', function () {
        const comment = buildNestedComment(6);

        expect(getFocusedThread([comment], '4', DESKTOP_MAX_THREAD_DEPTH)).toBeNull();
    });

    it('focuses the visible parent for a level 5 permalink', function () {
        const comment = buildNestedComment(6);
        const focusedThread = getFocusedThread([comment], '5', DESKTOP_MAX_THREAD_DEPTH);

        expect(focusedThread?.topLevelComment.id).toEqual('top-level');
        expect(focusedThread?.focusedComment.id).toEqual('4');
        expect(focusedThread?.backComment.id).toEqual('4');
    });

    it('skips top-level comments that do not contain the target reply before building a graph', function () {
        const nonMatchingComment = buildComment({id: 'non-matching'});
        const throwingReplies = {
            some: () => false,
            forEach: () => {
                throw new Error('Should not build graph for non-matching replies');
            }
        };
        Object.defineProperty(nonMatchingComment, 'replies', {
            value: throwingReplies
        });

        const matchingComment = buildNestedComment(6);
        const focusedThread = getFocusedThread([nonMatchingComment, matchingComment], '5', DESKTOP_MAX_THREAD_DEPTH);

        expect(focusedThread?.topLevelComment.id).toEqual('top-level');
        expect(focusedThread?.focusedComment.id).toEqual('4');
    });

    it('focuses the context comment for the nearest detail window', function () {
        const comment = buildNestedComment(9);
        const focusedThread = getFocusedThread([comment], '9', DESKTOP_MAX_THREAD_DEPTH);

        expect(focusedThread?.focusedComment.id).toEqual('8');
        expect(focusedThread?.backComment.id).toEqual('8');
    });

    it('focuses the existing detail window for a permalink visible in that window', function () {
        const comment = buildNestedComment(9);
        const focusedThread = getFocusedThread([comment], '8', DESKTOP_MAX_THREAD_DEPTH);

        expect(focusedThread?.focusedComment.id).toEqual('4');
        expect(focusedThread?.backComment.id).toEqual('4');
    });
});
