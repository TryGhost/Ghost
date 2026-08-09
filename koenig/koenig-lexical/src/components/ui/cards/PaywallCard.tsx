import CardContext from '../../../context/CardContext';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import {$getNodeByKey} from 'lexical';
import {InputList, InputListItem} from '../InputList';
import {SettingsPanel} from '../SettingsPanel';
import {Toggle} from '../Toggle';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {PostVisibility} from '../../../context/KoenigComposerContext';
import type {KeyboardEvent as ReactKeyboardEvent} from 'react';

// per-channel overrides of the upgrade prompt, stored on the paywall node.
// Empty object = render Ghost's defaults, so "reset" is a deletion not a copy
export type PaywallCta = {
    image?: string;
    imageBottom?: boolean;
    imageSmall?: boolean;
    heading?: string;
    description?: string;
    buttonText?: string;
    buttonUrl?: string;
    backgroundColor?: string;
    buttonColor?: string;
};

type CtaChannel = 'web' | 'email';

type PaywallCtaNode = {
    previewEmailTo?: string;
    webCta?: PaywallCta;
    emailCta?: PaywallCta;
};

type ChannelDefaults = {heading: string; description: string; buttonText: string; buttonUrl: string};

function defaultCopy(visibility: PostVisibility | undefined, channel: CtaChannel): ChannelDefaults {
    const memberish = visibility === 'members';
    if (channel === 'web') {
        return {
            heading: memberish ? 'This post is for members only' : 'This post is for paying subscribers only',
            description: memberish
                ? 'Sign up now to read the post and get access to the full library of posts for members only.'
                : 'Upgrade your account to read the post and get access to the full library of posts for paying subscribers only.',
            buttonText: memberish ? 'Sign up now' : 'Upgrade your account',
            buttonUrl: memberish ? '#/portal/signup/free' : '#/portal/signup'
        };
    }
    return {
        heading: 'Upgrade to continue reading',
        description: memberish
            ? 'Become a member to get access to the rest of this post and other exclusive content.'
            : 'Become a paid member to get access to all premium content.',
        buttonText: 'Upgrade',
        buttonUrl: memberish ? '#/portal/signup/free' : '#/portal/account/plans'
    };
}

const isCustomCta = (cta: PaywallCta) => Boolean(
    cta.heading || cta.description || cta.buttonText || cta.buttonUrl ||
    cta.image || cta.backgroundColor || cta.buttonColor
);

// native inputs inside the preview: keep every keystroke away from Lexical,
// and let Enter/Escape simply settle the field
const fieldKeys = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        (event.target as HTMLElement).blur();
    }
};

// Separate from the preview so it reads as an editor control, not paywall
// content. One URL per medium; suggestions stay inside the modal via a
// height-capped, scrollable dropdown that opens upward.
function ButtonUrlEditor({value, defaultUrl, onChange}: {
    value: string;
    defaultUrl: string;
    onChange: (value: string) => void;
}) {
    const {cardConfig} = useContext(KoenigComposerContext);
    const [listOptions, setListOptions] = useState<{value: string; label: string}[]>([]);

    useEffect(() => {
        if (cardConfig?.fetchAutocompleteLinks) {
            cardConfig.fetchAutocompleteLinks().then((links: {value: string; label: string}[]) => {
                setListOptions(links.map(link => ({value: link.value, label: link.label})));
            });
        }
    }, [cardConfig]);

    const filteredSuggestions = listOptions.filter((u) => {
        return u.label.toLocaleLowerCase().includes(value.toLocaleLowerCase());
    });

    const getItem = (item: {value: string; label: string}, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => {
        return (
            <InputListItem
                key={item.value}
                className={`${selected ? 'bg-grey-100 dark:bg-grey-925' : ''} m-0 cursor-pointer px-3 py-[7px] text-left hover:bg-grey-100 dark:hover:bg-grey-925`}
                dataTestId="paywall-customiser-button-url"
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                selectedClassName=""
                onClick={(i: {value: string}) => onChange(i.value)}
                onMouseOver={onMouseOver}
            >
                <span className="block text-sm font-normal leading-tight text-black dark:text-white">{item.label}</span>
                <span className="block truncate text-xs leading-tight text-grey-700 dark:text-grey-600">{item.value}</span>
            </InputListItem>
        );
    };

    return (
        <div data-testid="paywall-customiser-button-url-section">
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">Button links to</div>
            <div className="mt-2">
                <InputList
                    dataTestId="paywall-customiser-button-url"
                    dropdownClassName="z-20 max-h-[200px] w-full overflow-y-auto rounded-lg bg-white shadow-md dark:bg-grey-900"
                    dropdownPlacementBottomClass="-top-0.5 -translate-y-full"
                    dropdownPlacementTopClass="-top-0.5 -translate-y-full"
                    getItem={getItem}
                    listOptions={filteredSuggestions}
                    placeholder={defaultUrl}
                    value={value}
                    onChange={onChange}
                />
            </div>
            <p className="mt-2 text-xs font-normal leading-snug text-grey-600 dark:text-grey-700">
                Link to an offer, a page, or any URL — leave empty for the default ({defaultUrl}).
            </p>
        </div>
    );
}

export function PaywallCard() {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {isSelected, nodeKey} = useContext(CardContext);
    const paywallImprovements = cardConfig?.feature?.paywallImprovements;
    const post = cardConfig?.post;
    const postVisibility = post?.visibility;

    // the preview email audience lives on the node ('all' | '' | CSV of
    // segments); null state means "all non-access groups"
    const [previewTo, setPreviewTo] = useState<string[] | null>(null);
    const [siteTiers, setSiteTiers] = useState<{name: string; slug: string}[]>([]);

    // paywall CTA overrides live on the node (webCta/emailCta) so they
    // serialize with the post content; the modal edits local mirrors
    const [customiserOpen, setCustomiserOpen] = useState(false);
    const [customiserTab, setCustomiserTab] = useState<CtaChannel>('web');
    const [webCta, setWebCta] = useState<PaywallCta>({});
    const [emailCta, setEmailCta] = useState<PaywallCta>({});
    // one honest way back from a destructive one-click reset
    const [undoStash, setUndoStash] = useState<{channel: CtaChannel; cta: PaywallCta} | null>(null);

    // real uploads via the shared uploader — same machinery as every card

    // for members-only posts every email recipient already has access, and
    // pages are never emailed, so email settings only apply to paid/tiers posts
    const emailSectionRelevant = post?.isPost && (postVisibility === 'paid' || postVisibility === 'tiers');

    // for members/public the wall is a registration wall, not a paywall
    const wallNoun = (postVisibility === 'paid' || postVisibility === 'tiers') ? 'paywall' : 'registration wall';

    useEffect(() => {
        if (!customiserOpen) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setCustomiserOpen(false);
                cardConfig?.savePaywallContent?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [customiserOpen, cardConfig]);

    // the removable non-access groups: Free, plus (for tiers posts) every
    // active paid tier that doesn't have access to this post
    const availableGroups = useMemo(() => {
        const groups = [{segment: 'status:free', name: 'Free'}];
        if (postVisibility === 'tiers') {
            const accessSlugs = post?.tierSlugs || [];
            siteTiers.filter(tier => !accessSlugs.includes(tier.slug)).forEach((tier) => {
                groups.push({segment: `tier:${tier.slug}`, name: tier.name});
            });
        }
        return groups;
    }, [postVisibility, post?.tierSlugs, siteTiers]);

    useEffect(() => {
        if (emailSectionRelevant && postVisibility === 'tiers') {
            cardConfig?.fetchTiers?.().then(setSiteTiers).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emailSectionRelevant, postVisibility]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey) as unknown as PaywallCtaNode | null;
            const raw = node?.previewEmailTo ?? 'all';
            setPreviewTo(raw === 'all' ? null : raw.split(',').filter(Boolean));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedSegments = previewTo === null ? availableGroups.map(g => g.segment) : previewTo;

    // a tiers post where Free is the only non-access group left behaves like
    // the paid case: a plain on/off toggle, no chips to manage
    const onlyFreeGroup = availableGroups.length === 1;

    const previousSelectionRef = useRef<string[]>([]);

    const togglePreviewEmail = (event: {target: {checked: boolean}}) => {
        if (event.target.checked) {
            const restored = previousSelectionRef.current.length ? previousSelectionRef.current : availableGroups.map(g => g.segment);
            setPreviewAudience(restored);
        } else {
            previousSelectionRef.current = selectedSegments;
            setPreviewAudience([]);
        }
    };

    const setPreviewAudience = (segments: string[]) => {
        const isAll = segments.length === availableGroups.length && availableGroups.every(g => segments.includes(g.segment));
        setPreviewTo(isAll ? null : segments);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as unknown as PaywallCtaNode | null;
            if (node) {
                node.previewEmailTo = isAll ? 'all' : segments.join(',');
            }
        });
        cardConfig?.setEmailPublicPreview?.(segments.length > 0);
        requestSave();
    };

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // node property changes don't reliably trigger the host's autosave
    // heuristics, so ask the host for an explicit content save (debounced
    // while typing, immediate on close/remove)
    const requestSave = (immediate = false) => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        if (immediate) {
            cardConfig?.savePaywallContent?.();
        } else {
            saveTimerRef.current = setTimeout(() => {
                cardConfig?.savePaywallContent?.();
            }, 1000);
        }
    };

    const openCustomiser = () => {
        editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey) as unknown as PaywallCtaNode | null;
            if (node) {
                setWebCta({...(node.webCta || {})});
                setEmailCta({...(node.emailCta || {})});
            }
        });
        setUndoStash(null);
        setCustomiserTab('web');
        setCustomiserOpen(true);
    };

    const writeCta = (channel: CtaChannel, next: PaywallCta) => {
        (channel === 'web' ? setWebCta : setEmailCta)(next);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as unknown as PaywallCtaNode | null;
            if (node) {
                if (channel === 'web') {
                    node.webCta = next;
                } else {
                    node.emailCta = next;
                }
            }
        });
        requestSave();
    };

    // empty values are deletions: an untouched field must keep tracking the
    // default rather than freezing a copy of it
    const setField = (channel: CtaChannel, field: keyof PaywallCta) => (raw: string | boolean | null) => {
        const current = channel === 'web' ? webCta : emailCta;
        const next: PaywallCta = {...current};
        if (raw) {
            (next as Record<string, unknown>)[field] = raw;
        } else {
            delete next[field];
        }
        writeCta(channel, next);
    };

    const activeCta = customiserTab === 'web' ? webCta : emailCta;
    const activeIsCustom = isCustomCta(activeCta);

    const resetToDefault = () => {
        setUndoStash({channel: customiserTab, cta: {...activeCta}});
        writeCta(customiserTab, {});
    };
    const undoReset = () => {
        if (undoStash) {
            writeCta(undoStash.channel, undoStash.cta);
            setUndoStash(null);
        }
    };

    // typing again after a reset consumes the undo window
    useEffect(() => {
        if (undoStash && isCustomCta(undoStash.channel === 'web' ? webCta : emailCta)) {
            setUndoStash(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webCta, emailCta]);

    const closeCustomiser = () => {
        setCustomiserOpen(false);
        requestSave(true);
    };

    const customiserTabs: CtaChannel[] = emailSectionRelevant ? ['web', 'email'] : ['web'];
    const activeDefaults = defaultCopy(postVisibility, customiserTab);
    const divider = <hr className="-mx-6 my-1 border-t border-grey-200 dark:border-grey-900" />;

    const settingsPanel = isSelected && post && (
        <SettingsPanel>
            <div className="flex flex-col">
                <div className="text-sm font-semibold tracking-normal text-grey-900 dark:text-grey-300">Public preview</div>
                <p className="mt-1 whitespace-nowrap text-sm font-normal leading-snug text-grey-700 dark:text-grey-600" data-testid="paywall-web-note">
                    Everyone can read up to the divider.
                </p>
            </div>
            <>
                    {emailSectionRelevant && (
                        <>
                            {divider}
                            <label className="flex cursor-pointer items-center justify-between gap-3">
                                <span className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{(postVisibility === 'paid' || onlyFreeGroup) ? 'Email the preview to free subscribers' : 'Email the preview to'}</span>
                                <span className="flex shrink-0"><Toggle dataTestId="paywall-email-preview-toggle" isChecked={selectedSegments.length > 0} onChange={togglePreviewEmail} /></span>
                            </label>
                        </>
                    )}
                    {emailSectionRelevant && postVisibility === 'tiers' && !onlyFreeGroup && selectedSegments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5" data-testid="paywall-preview-audience">
                            {availableGroups.map(group => (selectedSegments.includes(group.segment) ? (
                                <span key={group.segment} className="inline-flex items-center gap-1 rounded-full bg-grey-150 py-1 pl-3 pr-2 text-xs font-medium text-grey-900 dark:bg-grey-900 dark:text-grey-300" data-testid={`paywall-audience-chip-${group.segment}`}>
                                    {group.name}
                                    {/* preventDefault keeps focus (and the card's selection)
                                        from being stolen by the click */}
                                    <button aria-label={`Remove ${group.name}`} className="cursor-pointer text-grey-600 hover:text-grey-900 dark:hover:text-grey-100" type="button" onClick={() => setPreviewAudience(selectedSegments.filter(seg => seg !== group.segment))} onMouseDown={e => e.preventDefault()}>
                                        <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>
                                    </button>
                                </span>
                            ) : (
                                <button key={group.segment} className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-grey-400 px-3 py-1 text-xs font-medium text-grey-600 hover:border-grey-600 hover:text-grey-900 dark:border-grey-800 dark:text-grey-600" data-testid={`paywall-audience-add-${group.segment}`} type="button" onClick={() => setPreviewAudience([...selectedSegments, group.segment])} onMouseDown={e => e.preventDefault()}>
                                    + {group.name}
                                </button>
                            )))}
                        </div>
                    )}
                    {emailSectionRelevant && selectedSegments.length > 0 && (
                        <p className="whitespace-nowrap text-xs font-normal text-grey-600 dark:text-grey-700" data-testid="paywall-email-ending-note">
                            The email ends with the paywall.
                        </p>
                    )}
                    {divider}
                    <button
                        className="cursor-pointer self-start text-sm font-medium text-grey-900 hover:text-black dark:text-grey-300 dark:hover:text-white"
                        data-testid="paywall-customise"
                        type="button"
                        onClick={openCustomiser}
                    >
                        Customise {wallNoun}
                    </button>
            </>
        </SettingsPanel>
    );

    const customiserModal = customiserOpen && post && (
        <div
            className="not-kg-prose fixed inset-0 z-[10000001] flex items-center justify-center bg-black/40 p-6 font-sans"
            data-testid="paywall-customiser"
            onMouseDown={(event) => {
                event.stopPropagation();
                if (event.target === event.currentTarget) {
                    closeCustomiser();
                }
            }}
        >
            <div className="shadow-2xl flex max-h-full w-[880px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-grey-100 dark:bg-grey-975">
                <div className="flex items-center justify-between bg-white px-6 py-4 dark:bg-grey-950">
                    <h2 className="text-lg font-bold tracking-tight text-grey-900 dark:text-grey-100">{`Customise ${wallNoun}`}</h2>
                    {customiserTabs.length > 1 && (
                        <div className="flex items-center gap-1 rounded-md bg-grey-150 p-[3px] dark:bg-grey-900">
                            {customiserTabs.map(tab => (
                                <button
                                    key={tab}
                                    className={`rounded px-4 py-1 text-sm font-medium capitalize transition-all ${customiserTab === tab ? 'bg-white text-grey-900 shadow-sm dark:bg-grey-950 dark:text-grey-100' : 'text-grey-600 hover:text-grey-900 dark:text-grey-500'}`}
                                    data-testid={`paywall-customiser-tab-${tab}`}
                                    type="button"
                                    onClick={() => setCustomiserTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        className="cursor-pointer rounded-md bg-black px-4 py-[6px] text-sm font-semibold text-white hover:bg-grey-900 dark:bg-white dark:text-black"
                        data-testid="paywall-customiser-done"
                        type="button"
                        onClick={closeCustomiser}
                    >
                        Done
                    </button>
                </div>
                <div className="overflow-y-auto px-8 pb-8 pt-6">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(260px,320px)_1fr]">
                        <div className="flex flex-col gap-4" data-testid="paywall-customiser-fields">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-grey-700 dark:text-grey-500">Heading</span>
                                <input
                                    className="w-full rounded-md border border-grey-300 bg-white px-3 py-2 text-sm text-grey-900 outline-none placeholder:text-grey-500 focus:border-green dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100"
                                    data-testid={`paywall-customiser-${customiserTab}-heading`}
                                    placeholder={activeDefaults.heading}
                                    value={activeCta.heading || ''}
                                    onChange={e => setField(customiserTab, 'heading')(e.target.value)}
                                    onKeyDown={fieldKeys}
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-grey-700 dark:text-grey-500">Message</span>
                                <textarea
                                    className="w-full resize-none rounded-md border border-grey-300 bg-white px-3 py-2 text-sm leading-normal text-grey-900 outline-none placeholder:text-grey-500 focus:border-green dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100"
                                    data-testid={`paywall-customiser-${customiserTab}-description`}
                                    placeholder={activeDefaults.description}
                                    rows={3}
                                    value={activeCta.description || ''}
                                    onChange={e => setField(customiserTab, 'description')(e.target.value)}
                                    onKeyDown={fieldKeys}
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-grey-700 dark:text-grey-500">Button</span>
                                <input
                                    className="w-full rounded-md border border-grey-300 bg-white px-3 py-2 text-sm text-grey-900 outline-none placeholder:text-grey-500 focus:border-green dark:border-grey-800 dark:bg-grey-950 dark:text-grey-100"
                                    data-testid={`paywall-customiser-${customiserTab}-button`}
                                    placeholder={activeDefaults.buttonText}
                                    value={activeCta.buttonText || ''}
                                    onChange={e => setField(customiserTab, 'buttonText')(e.target.value)}
                                    onKeyDown={fieldKeys}
                                />
                            </label>
                            <ButtonUrlEditor
                                defaultUrl={activeDefaults.buttonUrl}
                                value={activeCta.buttonUrl || ''}
                                onChange={value => setField(customiserTab, 'buttonUrl')(value)}
                            />

                            {/* whose words end the wall — this post's own, or Ghost's default */}
                            <div className="flex items-center gap-2 text-xs text-grey-600" data-testid="paywall-customiser-status">
                                {activeIsCustom ? (
                                    <>
                                        <span className="rounded-full bg-green/10 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-green-600">Custom for this post</span>
                                        <button className="cursor-pointer font-semibold text-green" data-testid="paywall-customiser-reset" title="Removes this post's custom wording" type="button" onClick={resetToDefault}>Reset to default</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="rounded-full bg-grey-200 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-grey-700 dark:bg-grey-900">Default</span>
                                        {undoStash?.channel === customiserTab && (
                                            <button className="cursor-pointer font-semibold text-green" data-testid="paywall-customiser-undo" type="button" onClick={undoReset}>Undo</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col" data-testid={`paywall-customiser-${customiserTab}-preview`}>
                            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-grey-600 dark:text-grey-600">
                                {customiserTab === 'web' ? 'Shown on the web below the public preview' : 'Shown in email below the public preview'}
                            </p>
                            <div className="flex grow items-center justify-center rounded-lg bg-grey-50 p-8 dark:bg-grey-950">
                                <div className="w-full max-w-[440px] rounded-lg border border-grey-250 bg-white px-8 py-10 text-center dark:border-grey-900 dark:bg-black">
                                    <p className="text-xl font-bold tracking-tight text-grey-900 dark:text-grey-100">{activeCta.heading || activeDefaults.heading}</p>
                                    <p className="mt-2 text-sm font-normal leading-normal text-grey-700 dark:text-grey-500">{activeCta.description || activeDefaults.description}</p>
                                    <span
                                        className="mt-5 inline-block rounded px-5 py-2 text-sm font-semibold"
                                        style={{backgroundColor: activeCta.buttonColor || getAccentColor() || '#ff247c', color: activeCta.buttonColor ? textColorForBackgroundColor(activeCta.buttonColor).hex() : '#FFFFFF'}}
                                    >
                                        {activeCta.buttonText || activeDefaults.buttonText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (paywallImprovements && postVisibility === 'public') {
        // no settings panel here: inserting a divider on a public post
        // highlights the access control in the editor header instead
        return (
            <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase before:mr-2 before:flex-1 before:border-t before:border-yellow before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-yellow after:content-['']">
                <span className="text-yellow">Public preview · No effect while post is public</span>
            </div>
        );
    }

    // hosts without a post in their config (email editor, demo) keep the generic label
    const RESTRICTED_ACCESS_LABELS: Record<string, string> = {
        members: 'Members only',
        paid: 'Paid members only',
        tiers: 'Selected tiers only'
    };
    const accessLabel = paywallImprovements && postVisibility && postVisibility !== 'public'
        ? RESTRICTED_ACCESS_LABELS[postVisibility]
        : 'Only visible to members';

    return (
        <>
            <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-grey-300 dark:text-grey-800">
            Free public preview
                <span className="mx-2 text-green">↑</span>
            /
                <span className="mx-2 text-green">↓</span>
                {accessLabel}
            </div>
            {settingsPanel}
            {customiserModal}
        </>
    );
}
