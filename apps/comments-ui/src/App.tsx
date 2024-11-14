/* eslint-disable no-shadow */

import AuthFrame from './AuthFrame';
import ContentBox from './components/ContentBox';
import PopupBox from './components/PopupBox';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import i18nLib from '@tryghost/i18n';
import setupGhostApi from './utils/api';
import {ActionHandler, SyncActionHandler, isSyncAction} from './actions';
import {AdminApi, setupAdminAPI} from './utils/adminApi';
import {AppContext, DispatchActionType, EditableAppContext, LabsContextType} from './AppContext';
import {CommentsFrame} from './components/Frame';
import {useOptions} from './utils/options';

type AppProps = {
    scriptTag: HTMLElement;
};

const App: React.FC<AppProps> = ({scriptTag}) => {
    const options = useOptions(scriptTag);
    const [state, setFullState] = useState<EditableAppContext>({
        initStatus: 'running',
        member: null,
        admin: null,
        comments: [],
        pagination: null,
        commentCount: 0,
        openCommentForms: [],
        popup: null,
        labs: {},
        order: 'count__likes desc, created_at desc'
    });

    const iframeRef = React.createRef<HTMLIFrameElement>();

    const api = React.useMemo(() => {
        return setupGhostApi({
            siteUrl: options.siteUrl,
            apiUrl: options.apiUrl!,
            apiKey: options.apiKey!
        });
    }, [options]);

    const [adminApi, setAdminApi] = useState<AdminApi|null>(null);

    const setState = useCallback((newState: Partial<EditableAppContext> | ((state: EditableAppContext) => Partial<EditableAppContext>)) => {
        setFullState((state) => {
            if (typeof newState === 'function') {
                newState = newState(state);
            }
            return {
                ...state,
                ...newState
            };
        });
    }, [setFullState]);

    const dispatchAction = useCallback(async (action, data) => {
        if (isSyncAction(action)) {
            // Makes sure we correctly handle the old state
            // because updates to state may be asynchronous
            // so calling dispatchAction('counterUp') multiple times, may yield unexpected results if we don't use a callback function
            setState((state) => {
                return SyncActionHandler({action, data, state, api, adminApi: adminApi!, options});
            });
            return;
        }

        // This is a bit a ugly hack, but only reliable way to make sure we can get the latest state asynchronously
        // without creating infinite rerenders because dispatchAction needs to change on every state change
        // So state shouldn't be a dependency of dispatchAction
        setState((state) => {
            ActionHandler({action, data, state, api, adminApi: adminApi!, options}).then((updatedState) => {
                setState({...updatedState});
            }).catch(console.error); // eslint-disable-line no-console

            // No immediate changes
            return {};
        });
    }, [api, adminApi, options]); // Do not add state or context as a dependency here -> infinite render loop

    const i18n = useMemo(() => {
        return i18nLib(options.locale, 'comments');
    }, [options.locale]);

    const context = {
        ...options,
        ...state,
        t: i18n.t,
        dispatchAction: dispatchAction as DispatchActionType,
        openFormCount: useMemo(() => state.openCommentForms.length, [state.openCommentForms])
    };

    const initAdminAuth = async () => {
        if (adminApi || !options.adminUrl) {
            return;
        }

        try {
            const adminApi = setupAdminAPI({
                adminUrl: options.adminUrl
            });
            setAdminApi(adminApi);

            let admin = null;
            try {
                admin = await adminApi.getUser();
            } catch (e) {
                // Loading of admin failed. Could be not signed in, or a different error (not important)
                // eslint-disable-next-line no-console
                console.warn(`[Comments] Failed to fetch current admin user:`, e);
            }

            setState({
                admin
            });
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Comments] Failed to initialize admin authentication:`, e);
        }
    };

    /** Fetch first few comments  */
    const fetchComments = async (labs: LabsContextType) => {
        let dataPromise;
        if (labs?.commentImprovements) {
            dataPromise = api.comments.browse({page: 1, postId: options.postId, order: state.order});
        } else {
            dataPromise = api.comments.browse({page: 1, postId: options.postId});
        }

        const countPromise = api.comments.count({postId: options.postId});

        const [data, count] = await Promise.all([dataPromise, countPromise]);

        return {
            comments: data.comments,
            pagination: data.meta.pagination,
            count: count
        };
    };

    /** Initialize comments setup once in viewport, fetch data and setup state*/
    const initSetup = async () => {
        try {
            // Fetch data from API, links, preview, dev sources
            const {member, labs} = await api.init();
            const {comments, pagination, count} = await fetchComments(labs);
            const order = labs.commentImprovements ? 'count__likes desc, created_at desc' : 'created_at desc';
            const state = {
                member,
                initStatus: 'success',
                comments,
                pagination,
                commentCount: count,
                order,
                labs: labs
            };

            setState(state);
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Comments] Failed to initialize:`, e);
            /* eslint-enable no-console */
            setState({
                initStatus: 'failed'
            });
        }
    };

    /** Delay initialization until comments block is in viewport */
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    initSetup();
                    if (iframeRef.current) {
                        observer.unobserve(iframeRef.current);
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        });

        if (iframeRef.current) {
            observer.observe(iframeRef.current);
        }

        return () => {
            if (iframeRef.current) {
                observer.unobserve(iframeRef.current);
            }
        };
    }, [iframeRef.current]);

    const done = state.initStatus === 'success';

    return (
        <AppContext.Provider value={context}>
            <CommentsFrame ref={iframeRef}>
                <ContentBox done={done} />
            </CommentsFrame>
            {state.comments.length > 0 ? <AuthFrame adminUrl={options.adminUrl} onLoad={initAdminAuth}/> : null}
            <PopupBox />
        </AppContext.Provider>
    );
};

export default App;
