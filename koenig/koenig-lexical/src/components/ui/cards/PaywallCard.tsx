import CardContext from '../../../context/CardContext';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import {$getNodeByKey} from 'lexical';
import {InputList, InputListItem} from '../InputList';
import {SettingsPanel} from '../SettingsPanel';
import {Toggle} from '../Toggle';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {PostVisibility} from '../../../context/KoenigComposerContext';

const RESTRICTED_ACCESS_LABELS: Record<Exclude<PostVisibility, 'public'>, string> = {
    members: 'Members only',
    paid: 'Paid members only',
    tiers: 'Selected tiers only'
};

const PAYWALL_COPY_PROPS = ['webHeading', 'webDescription', 'webButtonText', 'webButtonUrl', 'emailHeading', 'emailDescription', 'emailButtonText', 'emailButtonUrl'] as const;
type PaywallCopyProp = typeof PAYWALL_COPY_PROPS[number];
type PaywallCopy = Record<PaywallCopyProp, string>;

const EMPTY_COPY: PaywallCopy = {
    webHeading: '',
    webDescription: '',
    webButtonText: '',
    emailHeading: '',
    emailDescription: '',
    webButtonUrl: '',
    emailButtonText: '',
    emailButtonUrl: ''
};

function defaultCopy(visibility?: PostVisibility): PaywallCopy {
    const memberish = visibility === 'members';
    return {
        webHeading: memberish ? 'This post is for members only' : 'This post is for paying subscribers only',
        webDescription: memberish
            ? 'Sign up now to read the post and get access to the full library of posts for members only.'
            : 'Upgrade your account to read the post and get access to the full library of posts for paying subscribers only.',
        webButtonText: memberish ? 'Sign up now' : 'Upgrade your account',
        emailHeading: 'Subscribe to continue reading',
        emailDescription: memberish
            ? 'Become a member to get access to the rest of this post and other exclusive content.'
            : 'Become a paying subscriber to get access to the rest of this post and other exclusive content.',
        emailButtonText: memberish ? 'Sign up' : 'Upgrade now',
        webButtonUrl: memberish ? '#/portal/signup/free' : '#/portal/signup',
        emailButtonUrl: memberish ? '#/portal/signup/free' : '#/portal/account/plans'
    };
}

function PaywallPreviewEditor({copy, defaults, medium, onChange}: {
    copy: PaywallCopy;
    defaults: PaywallCopy;
    medium: 'web' | 'email';
    onChange: (prop: PaywallCopyProp, value: string) => void;
}) {
    const accentColor = getAccentColor();
    const headingProp: PaywallCopyProp = medium === 'web' ? 'webHeading' : 'emailHeading';
    const descriptionProp: PaywallCopyProp = medium === 'web' ? 'webDescription' : 'emailDescription';
    const buttonProp: PaywallCopyProp = medium === 'web' ? 'webButtonText' : 'emailButtonText';

    return (
        <div className={`mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 rounded-lg px-10 py-12 text-center font-sans ${medium === 'email' ? 'border border-grey-250 bg-white dark:border-grey-900 dark:bg-grey-950' : 'bg-white shadow-md dark:bg-grey-950'}`}>
            <input
                className="w-full bg-transparent text-center text-2xl font-bold tracking-tight text-grey-900 outline-none placeholder:text-grey-500 dark:text-grey-100"
                data-testid={`paywall-customiser-${medium}-heading`}
                placeholder={defaults[headingProp]}
                value={copy[headingProp]}
                onChange={e => onChange(headingProp, e.target.value)}
            />
            <textarea
                className="w-full resize-none bg-transparent text-center text-md font-normal leading-normal text-grey-700 outline-none placeholder:text-grey-500 dark:text-grey-500"
                data-testid={`paywall-customiser-${medium}-description`}
                placeholder={defaults[descriptionProp]}
                rows={2}
                value={copy[descriptionProp]}
                onChange={e => onChange(descriptionProp, e.target.value)}
            />
            <div className="rounded px-1" style={{backgroundColor: accentColor || '#ff247c'}}>
                <input
                    className="bg-transparent px-4 py-2 text-center text-md font-semibold text-white outline-none placeholder:text-white/70"
                    data-testid={`paywall-customiser-${medium}-button`}
                    placeholder={defaults[buttonProp]}
                    size={Math.max((copy[buttonProp] || defaults[buttonProp]).length, 8)}
                    value={copy[buttonProp]}
                    onChange={e => onChange(buttonProp, e.target.value)}
                />
            </div>
            {medium === 'email' && (
                <p className="text-xs font-normal text-grey-600 dark:text-grey-700">
                    Shown in place of the rest of the post for subscribers without access.
                </p>
            )}
        </div>
    );
}

// Separate from the preview so it reads as an editor control, not paywall
// content. One URL per medium; suggestions stay inside the modal via a
// height-capped, scrollable dropdown that opens upward.
function ButtonUrlEditor({value, defaultUrl, medium, onChange}: {
    value: string;
    defaultUrl: string;
    medium: 'web' | 'email';
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
        <div className="mx-auto mt-4 w-full max-w-[520px] rounded-lg border border-grey-250 bg-white p-5 text-left font-sans dark:border-grey-900 dark:bg-grey-950" data-testid="paywall-customiser-button-url-section">
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

    // paywall copy lives on the node so it serializes with the post content
    const [customiserOpen, setCustomiserOpen] = useState(false);
    const [customiserTab, setCustomiserTab] = useState<'web' | 'email'>('web');
    const [copy, setCopy] = useState<PaywallCopy>(EMPTY_COPY);

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
            const node = $getNodeByKey(nodeKey) as unknown as {previewEmailTo?: string} | null;
            const raw = node?.previewEmailTo ?? 'all';
            setPreviewTo(raw === 'all' ? null : raw.split(',').filter(Boolean));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedSegments = previewTo === null ? availableGroups.map(g => g.segment) : previewTo;

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
            const node = $getNodeByKey(nodeKey) as unknown as {previewEmailTo?: string} | null;
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

    const removePublicPreview = () => {
        editor.update(() => {
            $getNodeByKey(nodeKey)?.remove();
        });
        requestSave(true);
    };

    const openCustomiser = () => {
        editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey) as unknown as Partial<PaywallCopy> | null;
            if (node) {
                setCopy(Object.fromEntries(PAYWALL_COPY_PROPS.map(prop => [prop, node[prop] || ''])) as PaywallCopy);
            }
        });
        setCustomiserTab('web');
        setCustomiserOpen(true);
    };

    const changeCopy = (prop: PaywallCopyProp, value: string) => {
        setCopy(current => ({...current, [prop]: value}));
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as unknown as Record<PaywallCopyProp, string> | null;
            if (node) {
                node[prop] = value;
            }
        });
        requestSave();
    };

    const closeCustomiser = () => {
        setCustomiserOpen(false);
        requestSave(true);
    };

    const defaults = defaultCopy(postVisibility);
    const divider = <hr className="-mx-6 my-1 border-t border-grey-200 dark:border-grey-900" />;

    const settingsPanel = isSelected && post && (
        <SettingsPanel>
            <div className="flex flex-col">
                <div className="text-sm font-semibold tracking-normal text-grey-900 dark:text-grey-300">Public preview</div>
                <span className="mt-3 text-2xs font-semibold uppercase tracking-wide text-grey-800 dark:text-grey-500" data-testid="paywall-web-section-header">Web</span>
                <p className="mt-1 text-sm font-normal leading-snug text-grey-700 dark:text-grey-600">
                    Everything above the public preview divider is visible to everyone on the web.
                </p>
            </div>
            {post?.isPost && (
                <>
                    {divider}
                    <span className="text-2xs font-semibold uppercase tracking-wide text-grey-800 dark:text-grey-500" data-testid="paywall-email-section-header">Email</span>
                </>
            )}
            {emailSectionRelevant && (
                <>
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                        <span className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{postVisibility === 'paid' ? 'Send the preview to free subscribers' : 'Send the preview by email'}</span>
                        <span className="flex shrink-0"><Toggle dataTestId="paywall-email-preview-toggle" isChecked={selectedSegments.length > 0} onChange={togglePreviewEmail} /></span>
                    </label>
                </>
            )}
            {emailSectionRelevant && postVisibility === 'tiers' && selectedSegments.length > 0 && (
                <>
                    <span className="text-2xs font-semibold uppercase tracking-wide text-grey-800 dark:text-grey-500">To</span>
                    <div className="flex flex-wrap gap-1.5" data-testid="paywall-preview-audience">
                        {availableGroups.map(group => (selectedSegments.includes(group.segment) ? (
                            <span key={group.segment} className="inline-flex items-center gap-1 rounded-full bg-grey-150 py-1 pl-3 pr-2 text-xs font-medium text-grey-900 dark:bg-grey-900 dark:text-grey-300" data-testid={`paywall-audience-chip-${group.segment}`}>
                                {group.name}
                                <button aria-label={`Remove ${group.name}`} className="cursor-pointer text-grey-600 hover:text-grey-900 dark:hover:text-grey-100" type="button" onClick={() => setPreviewAudience(selectedSegments.filter(seg => seg !== group.segment))}>
                                    <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>
                                </button>
                            </span>
                        ) : (
                            <button key={group.segment} className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-grey-400 px-3 py-1 text-xs font-medium text-grey-600 hover:border-grey-600 hover:text-grey-900 dark:border-grey-800 dark:text-grey-600" data-testid={`paywall-audience-add-${group.segment}`} type="button" onClick={() => setPreviewAudience([...selectedSegments, group.segment])}>
                                + {group.name}
                            </button>
                        )))}
                    </div>
                </>
            )}
            {emailSectionRelevant && (
                <p className="text-xs font-normal leading-snug text-grey-600 dark:text-grey-700" data-testid="paywall-preview-audience-note">
                    {selectedSegments.length === 0
                        ? (postVisibility === 'paid' ? 'Free subscribers won’t get this post by email.' : 'Subscribers without access won’t get this post by email.')
                        : `They get an email with the public preview, followed by the ${wallNoun}.` + (postVisibility === 'tiers' && selectedSegments.length < availableGroups.length ? ' Everyone else without access gets no email.' : '')}
                </p>
            )}
            {!emailSectionRelevant && post?.isPost && (
                <p className="text-sm font-normal leading-snug text-grey-700 dark:text-grey-600">
                    Everyone who receives this post by email already has full access, so the preview only affects the web.
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
            {divider}
            <button
                className="cursor-pointer self-start text-sm font-medium text-red hover:text-red-600"
                data-testid="paywall-remove-public-preview"
                type="button"
                onClick={removePublicPreview}
            >
                Remove public preview
            </button>
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
            <div className="shadow-2xl flex max-h-full w-[680px] flex-col overflow-hidden rounded-xl bg-grey-100 dark:bg-grey-975">
                <div className="flex items-center justify-between bg-white px-6 py-4 dark:bg-grey-950">
                    <h2 className="text-lg font-bold tracking-tight text-grey-900 dark:text-grey-100">{`Customise ${wallNoun}`}</h2>
                    <div className="flex items-center gap-1 rounded-md bg-grey-150 p-[3px] dark:bg-grey-900">
                        {(['web', 'email'] as const).map(tab => (
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
                    <button
                        className="cursor-pointer rounded-md bg-black px-4 py-[6px] text-sm font-semibold text-white hover:bg-grey-900 dark:bg-white dark:text-black"
                        data-testid="paywall-customiser-done"
                        type="button"
                        onClick={closeCustomiser}
                    >
                        Done
                    </button>
                </div>
                <div className="overflow-y-auto px-10 pb-8 pt-10">
                    <p className="mx-auto mb-6 max-w-[520px] text-center text-xs font-medium uppercase tracking-wide text-grey-600 dark:text-grey-600">
                        {customiserTab === 'web' ? 'Shown on the web below the public preview' : 'Shown in email below the public preview'}
                    </p>
                    <PaywallPreviewEditor
                        copy={copy}
                        defaults={defaults}
                        medium={customiserTab}
                        onChange={changeCopy}
                    />
                    <ButtonUrlEditor
                        defaultUrl={customiserTab === 'web' ? defaults.webButtonUrl : defaults.emailButtonUrl}
                        medium={customiserTab}
                        value={customiserTab === 'web' ? copy.webButtonUrl : copy.emailButtonUrl}
                        onChange={(value: string) => changeCopy(customiserTab === 'web' ? 'webButtonUrl' : 'emailButtonUrl', value)}
                    />
                    <p className="mx-auto mt-5 max-w-[520px] text-center text-xs font-normal text-grey-600 dark:text-grey-700">
                        Click any text in the preview to edit it. Empty fields use Ghost’s default wording.
                    </p>
                </div>
            </div>
        </div>
    );

    if (paywallImprovements && postVisibility === 'public') {
        return (
            <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase before:mr-2 before:flex-1 before:border-t before:border-yellow before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-yellow after:content-['']">
                <span className="text-yellow">Public preview · No effect while post is public</span>
            </div>
        );
    }

    // hosts without a post in their config (email editor, demo) keep the generic label
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
