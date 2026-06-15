/**
 * Recommendations — the sites a publisher recommends. Ports Portal's
 * recommendations-page.js: shown standalone (#/portal/recommendations) or as a
 * post-signup step (fromSignup). Members with a one-click-subscribe target get a
 * Subscribe button that sends a magic link to the recommended site.
 */

import {useEffect, useState, useMemo, useCallback, type ReactElement} from 'react';
import type {Services, SiteState, MemberState} from '../../types';
import {createMembersApiClient, type MembersApiClient} from '../../shared/api-client';
import {cn} from '../../shared/cn';
import {CloseButton} from '../../shared/components/buttons/CloseButton';
import {warn} from '../../shared/log';
import {buildRefUrl, getRefDomain} from './helpers';
import type {Recommendation, RecommendationsResponse} from './types';

interface Props {
    services: Services;
    api: MembersApiClient;
    fromSignup: boolean;
    onClose(): void;
}

const FOOTER_BTN = 'gh:flex gh:w-full gh:items-center gh:justify-center gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:cursor-pointer';
const PRIMARY_BTN = `${FOOTER_BTN} gh:text-white gh:bg-[var(--ghost-accent-color,#15171a)]`;
const LINK_BTN = `${FOOTER_BTN} gh:bg-transparent gh:text-[#7c8087]`;

// Fisher-Yates shuffle (matches Portal).
function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = array[i] as T;
        const b = array[j] as T;
        array[i] = b;
        array[j] = a;
    }
    return array;
}

function openTab(url: string): void {
    const tab = window.open(url, '_blank');
    if (tab) {
        tab.focus();
    } else {
        // Safari fix after async / failed tab creation.
        window.location.href = url;
    }
}

export function RecommendationsModal({services, api, fromSignup, onClose}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const member = state.member;
    const recommendationsEnabled = site.recommendations_enabled ?? false;

    const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
    const [numToShow, setNumToShow] = useState(5);

    useEffect(() => {
        api.site.recommendations({limit: 100}).then((data) => {
            const list = (data as RecommendationsResponse).recommendations ?? [];
            const withOneClick = list.filter(r => r.one_click_subscribe);
            const withoutOneClick = list.filter(r => !r.one_click_subscribe);
            setRecommendations([...shuffle(withOneClick), ...shuffle(withoutOneClick)]);
        }).catch((err) => {
            warn('failed to load recommendations', err);
            setRecommendations([]);
        });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (recommendations === null) {
        return (
            <div className="gh:relative">
                <CloseButton onClick={onClose} t={t} />
                <div className="gh:flex gh:justify-center gh:py-10"><Spinner /></div>
            </div>
        );
    }

    const heading = fromSignup ? t('Welcome to {siteTitle}', {siteTitle: site.title}) : t('Recommendations');

    let subheading: string;
    if (recommendationsEnabled && recommendations.length > 0) {
        subheading = fromSignup
            ? t('Thank you for subscribing. Before you start reading, below are a few other sites you may enjoy.')
            : t('Here are a few other sites you may enjoy.');
    } else {
        subheading = t('Sorry, no recommendations are available right now.');
    }

    const showAll = (): void => setNumToShow(recommendations.length);
    const showFooter = numToShow < recommendations.length || fromSignup;

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />
            <div className="gh:mb-5 gh:flex gh:flex-col gh:items-center">
                {site.icon && <img className="gh:mb-3 gh:h-12 gh:w-12 gh:rounded-md" alt={site.title} src={site.icon} />}
                <h1 className="gh:m-0 gh:px-8 gh:text-center gh:text-[24px] gh:font-bold gh:text-balance gh:text-[#15171a]">{heading}</h1>
            </div>
            <p className="gh:mb-0 gh:text-center gh:text-[15px] gh:text-[#7c8087]">{subheading}</p>

            {recommendationsEnabled && (
                <div className="gh:mt-6 gh:flex gh:flex-col gh:divide-y gh:divide-[#eaeaea]">
                    {recommendations.slice(0, numToShow).map(recommendation => (
                        <RecommendationItem
                            key={recommendation.id}
                            api={api}
                            recommendation={recommendation}
                            member={member}
                            site={site}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {showFooter && (
                <footer className="gh:mt-6 gh:flex gh:flex-col gh:gap-2">
                    {numToShow < recommendations.length && (
                        <button type="button" className={PRIMARY_BTN} onClick={showAll}>{t('Show all')}</button>
                    )}
                    {fromSignup && (
                        <button type="button" className={LINK_BTN} onClick={onClose}>{t('Maybe later')}</button>
                    )}
                </footer>
            )}
        </div>
    );
}

interface ItemProps {
    api: MembersApiClient;
    recommendation: Recommendation;
    member: MemberState | null;
    site: SiteState;
    t: Services['t'];
}

function RecommendationItem({api, recommendation, member, site, t}: ItemProps): ReactElement {
    const {id, title, url, description, favicon, featured_image: featuredImage, one_click_subscribe: oneClickSubscribe} = recommendation;
    const allowOneClickSubscribe = Boolean(member && oneClickSubscribe);
    const outboundLinkTagging = site.outbound_link_tagging ?? false;

    const [subscribed, setSubscribed] = useState(false);
    const [clicked, setClicked] = useState(false);
    const [loading, setLoading] = useState(false);

    const refUrl = useMemo(() => buildRefUrl(url, outboundLinkTagging, getRefDomain()), [url, outboundLinkTagging]);

    const visitHandler = useCallback(() => {
        openTab(refUrl);
        if (!clicked) {
            api.recommendations.trackClicked({recommendationId: id});
            setClicked(true);
        }
    }, [refUrl, id, clicked, api]);

    const subscribeHandler = useCallback(async () => {
        try {
            setLoading(true);
            const ext = createMembersApiClient({siteUrl: url});
            const integrityToken = await ext.member.getIntegrityToken();
            await ext.member.sendMagicLink({
                email: member?.email ?? '',
                name: member?.name,
                emailType: 'signup',
                autoRedirect: false,
                integrityToken,
                urlHistory: outboundLinkTagging ? [{
                    time: Date.now(),
                    referrerSource: getRefDomain(),
                    referrerMedium: 'Ghost Recommendations',
                    referrerUrl: window.location.href
                }] : []
            });
            api.recommendations.trackSubscribed({recommendationId: id});
            setSubscribed(true);
        } catch {
            // Fall back to the recommended site's signup page.
            const signupUrl = new URL('#/portal/signup', refUrl);
            openTab(signupUrl.toString());
            if (!clicked) {
                api.recommendations.trackClicked({recommendationId: id});
                setClicked(true);
            }
        }
        setLoading(false);
    }, [url, refUrl, id, clicked, member, outboundLinkTagging, api]);

    return (
        <section className="gh:flex gh:min-h-[38px] gh:items-start gh:justify-between gh:gap-3 gh:py-3">
            <div className="gh:group gh:flex-1 gh:cursor-pointer" onClick={visitHandler}>
                <div className="gh:flex gh:items-center gh:gap-[10px]">
                    <RecommendationIcon title={title} favicon={favicon} featuredImage={featuredImage} />
                    <h3 className="gh:m-0 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{title}</h3>
                    <ArrowIcon className="gh:h-3 gh:opacity-0 gh:transition-opacity gh:group-hover:opacity-80 gh:rtl:-scale-x-100" />
                </div>
                <div className="gh:relative gh:ps-[30px]">
                    {subscribed && (
                        <div className={cn('gh:flex gh:items-center gh:gap-1 gh:text-[13.5px] gh:text-[#7c8087]', description ? 'gh:absolute' : 'gh:mt-[5px]')}>
                            <span>{t('Verification link sent, check your inbox')}</span>
                            <CheckmarkIcon className="gh:h-4 gh:w-4 gh:text-[#30cf43]" />
                        </div>
                    )}
                    {description && (
                        <p className={cn('gh:mt-1 gh:text-[13.5px] gh:font-normal gh:text-[#7c8087]', subscribed && 'gh:invisible')}>{description}</p>
                    )}
                </div>
            </div>
            <div className="gh:flex gh:min-h-[28px] gh:items-center">
                {!subscribed && loading && <Spinner />}
                {!subscribed && !loading && allowOneClickSubscribe && (
                    <button
                        type="button"
                        className="gh:rounded-md gh:border-0 gh:bg-[#f4f5f6] gh:px-3 gh:py-[6px] gh:text-[13px] gh:font-semibold gh:text-[#15171a] gh:cursor-pointer"
                        onClick={() => { void subscribeHandler().catch(e => warn('one-click subscribe error', e)); }}
                    >
                        {t('Subscribe')}
                    </button>
                )}
            </div>
        </section>
    );
}

function RecommendationIcon({title, favicon, featuredImage}: {title: string; favicon?: string | null; featuredImage?: string | null}): ReactElement {
    const [icon, setIcon] = useState<string | null>(favicon || featuredImage || null);
    if (!icon) {
        return <div className="gh:h-5 gh:w-5 gh:shrink-0 gh:rounded-[3px] gh:bg-[#eaeaea]" />;
    }
    return <img className="gh:h-5 gh:w-5 gh:shrink-0 gh:rounded-[3px]" src={icon} alt={title} onError={() => setIcon(null)} />;
}

function ArrowIcon({className}: {className?: string}): ReactElement {
    return (
        <svg className={className} viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 9.5 9.5 2.5" />
            <path d="M3.5 2.5h6v6" />
        </svg>
    );
}

function CheckmarkIcon({className}: {className?: string}): ReactElement {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function Spinner(): ReactElement {
    return <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />;
}
