import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Form, FormWrapper} from './form';
import {scrollToElement} from '../../../utils/helpers';
import {useAppContext} from '../../../app-context';
import {useEditor} from '../../../utils/hooks';

const BlueskyDiscussionLink: React.FC = () => {
    const {blueskyPostUrl} = useAppContext();

    if (!blueskyPostUrl) {
        return null;
    }

    return (
        <div className="mt-1 flex items-center gap-2 px-1 font-sans text-sm text-neutral-500 dark:text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 600 530" fill="currentColor" className="shrink-0"><path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/></svg>
            <a
                className="font-medium text-neutral-600 underline hover:text-black dark:text-neutral-400 dark:hover:text-white"
                href={blueskyPostUrl}
                rel="noopener noreferrer"
                target="_blank"
            >
                Join the discussion on Bluesky
            </a>
        </div>
    );
};

const BlueskyUpgradePrompt: React.FC = () => {
    const {member, siteUrl} = useAppContext();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) {
        return null;
    }

    // Only show if member is a Bluesky user without write scope
    if (!member?.atproto_did || !member?.bluesky_handle) {
        return null;
    }

    const hasWriteScope = member.atproto_scope?.includes('transition:generic');
    if (hasWriteScope) {
        return null;
    }

    const handleUpgrade = () => {
        // POST to the authorize endpoint with upgraded scope
        const apiBase = siteUrl.replace(/\/$/, '');
        fetch(`${apiBase}/members/api/atproto/authorize`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                handle: member.bluesky_handle,
                scope: 'atproto transition:generic',
                return_url: window.location.href
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    window.location.href = data.url;
                }
            })
            .catch(() => {
                // silently fail
            });
    };

    return (
        <div className="mt-1 flex items-center gap-2 px-1 font-sans text-sm text-neutral-500 dark:text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 600 530" fill="currentColor" className="shrink-0"><path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/></svg>
            <span>
                Your comments post as this blog on Bluesky.{' '}
                <button
                    className="cursor-pointer font-medium text-neutral-700 underline hover:text-black dark:text-neutral-300 dark:hover:text-white"
                    type="button"
                    onClick={handleUpgrade}
                >
                    Post as @{member.bluesky_handle} instead?
                </button>
            </span>
            <button
                className="ml-auto cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                type="button"
                onClick={() => setDismissed(true)}
            >
                ✕
            </button>
        </div>
    );
};

type Props = {
    commentsCount: number
};

const MainForm: React.FC<Props> = ({commentsCount}) => {
    const {postId, dispatchAction, t} = useAppContext();

    const editorConfig = useMemo(() => ({
        placeholder: (commentsCount === 0 ? t('Start the conversation') : t('Join the discussion')),
        autofocus: false
    }), [commentsCount]);

    const {editor, hasContent} = useEditor(editorConfig);

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('addComment', {
            post_id: postId,
            status: 'published',
            html
        });

        editor?.commands.clearContent();
    }, [postId, dispatchAction, editor]);

    // C keyboard shortcut to focus main form
    const formEl = useRef(null);

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event: KeyboardEvent) => {
            if (!editor) {
                return;
            }

            if (event.metaKey || event.ctrlKey) {
                // CMD on MacOS or CTRL
                // Don't do anything
                return;
            }

            let focusedElement = document.activeElement as HTMLElement | null;
            while (focusedElement && focusedElement.tagName === 'IFRAME') {
                if (!(focusedElement as HTMLIFrameElement).contentDocument) {
                    // CORS issue
                    // disable the C shortcut when we have a focused external iframe
                    break;
                }

                focusedElement = ((focusedElement as HTMLIFrameElement).contentDocument?.activeElement ?? null) as HTMLElement | null;
            }
            const hasInputFocused = focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'IFRAME' || focusedElement.contentEditable === 'true');

            if (event.key === 'c' && !editor?.isFocused && !hasInputFocused) {
                editor?.commands.focus();

                if (formEl.current) {
                    scrollToElement(formEl.current);
                }
                return;
            }
        };

        // Note: normally we would need to attach this listener to the window + the iframe window. But we made listener
        // in the Iframe component that passes down all the keydown events to the main window to prevent that
        window.addEventListener('keydown', keyDownListener, {passive: true});

        return () => {
            window.removeEventListener('keydown', keyDownListener, {passive: true} as any);
        };
    }, [editor]);

    const submitProps = {
        submitText: (
            <>
                <span className="hidden sm:inline">{t('Add comment')} </span><span className="sm:hidden">{t('Comment')}</span>
            </>
        ),
        submitSize: 'large' as const,
        submit
    };

    const isOpen = editor?.isFocused || hasContent;

    return (
        <div ref={formEl} className='px-3 pb-2 pt-3' data-testid="main-form">
            <FormWrapper editor={editor} isOpen={isOpen} reduced={false}>
                <Form
                    editor={editor}
                    isOpen={isOpen}
                    reduced={false}
                    {...submitProps}
                />
            </FormWrapper>
            <BlueskyDiscussionLink />
            <BlueskyUpgradePrompt />
        </div>
    );
};

export default MainForm;
