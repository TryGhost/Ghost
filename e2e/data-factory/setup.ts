import {AutomatedEmailFactory} from './factories/automated-email-factory';
import {CommentFactory} from './factories/comment-factory';
import {GhostAdminApiAdapter} from './persistence/adapters/ghost-api';
import {HttpClient} from './persistence/adapters/http-client';
import {MemberFactory} from './factories/member-factory';
import {PostFactory} from './factories/post-factory';
import {TagFactory} from './factories/tag-factory';

/**
 * Create a new PostFactory with API persistence
 * Uses the http client which already has the proper authentication headers and baseURL
 * configured (this would be Playwright's page.request)
 *
 * @param httpClient - client for requests with pre-defined authorization and base url
 * @returns PostFactory ready to use with the specified Ghost backend
 */
export function createPostFactory(httpClient: HttpClient): PostFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'posts',
        {formats: 'mobiledoc,lexical,html'}
    );
    return new PostFactory(adapter);
}

export function createTagFactory(httpClient: HttpClient): TagFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'tags'
    );
    return new TagFactory(adapter);
}

export function createMemberFactory(httpClient: HttpClient): MemberFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'members'
    );
    return new MemberFactory(adapter);
}

export function createAutomatedEmailFactory(httpClient: HttpClient): AutomatedEmailFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'automated_emails'
    );
    return new AutomatedEmailFactory(adapter);
}

export function createCommentFactory(httpClient: HttpClient): CommentFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'comments'
    );
    return new CommentFactory(adapter);
}

export interface Factories {
    postFactory: PostFactory;
    tagFactory: TagFactory;
    memberFactory: MemberFactory;
    automatedEmailFactory: AutomatedEmailFactory;
    commentFactory: CommentFactory;
}

/**
 * Helper for creating all factories with the same http client
 * @param httpClient - client for requests with pre-defined authorization and base url
 * 
 * @returns All factories ready to use with the specified Ghost backend
 */
export function createFactories(httpClient: HttpClient): Factories {
    return {
        postFactory: createPostFactory(httpClient),
        tagFactory: createTagFactory(httpClient),
        memberFactory: createMemberFactory(httpClient),
        automatedEmailFactory: createAutomatedEmailFactory(httpClient),
        commentFactory: createCommentFactory(httpClient)
    };
}

