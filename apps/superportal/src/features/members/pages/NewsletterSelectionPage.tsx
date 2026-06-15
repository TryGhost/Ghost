import {useState, type ReactElement} from 'react';
import type {Services, SiteNewsletter} from '../../../types';
import {cn} from '../../../shared/cn';

interface Props {
    services: Services;
    /** Free newsletters with subscribe_on_signup=true — the selectable set. */
    newsletters: SiteNewsletter[];
    /** Full newsletter list — so paid options can render as locked rows. */
    allNewsletters: SiteNewsletter[];
    loading: boolean;
    /** Portal hides the "Choose a different plan" link on free-only sites. */
    showChooseDifferentPlan?: boolean;
    onBack(): void;
    onSubmit(selected: SiteNewsletter[]): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

export function NewsletterSelectionPage({services, newsletters, allNewsletters, loading, showChooseDifferentPlan = true, onBack, onSubmit}: Props): ReactElement {
    const t = services.t;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(newsletters.map(n => n.id)));

    const paidLocked = allNewsletters.filter(n => n.paid && n.status !== 'archived');

    function toggle(id: string): void {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function handleSubmit(): void {
        const selected = newsletters.filter(n => selectedIds.has(n.id));
        onSubmit(selected);
    }

    return (
        <div className="gh:relative">
            <header className="gh:flex gh:flex-col gh:items-center gh:gap-2 gh:mb-6">
                <h1 className="gh:m-0 gh:text-center gh:text-[28px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                    {t('Choose your newsletters')}
                </h1>
            </header>

            <div className="gh:flex gh:flex-col gh:gap-3 gh:mb-6">
                {newsletters.map(n => (
                    <NewsletterRow
                        key={n.id}
                        newsletter={n}
                        checked={selectedIds.has(n.id)}
                        onToggle={() => toggle(n.id)}
                    />
                ))}
                {paidLocked.map(n => (
                    <LockedNewsletterRow key={n.id} newsletter={n} hint={t('Unlock access to all newsletters by becoming a paid subscriber.')} />
                ))}
            </div>

            <button type="button" disabled={loading} className={PRIMARY_BTN} onClick={handleSubmit}>
                {loading ? t('Sending...') : t('Continue')}
            </button>

            {showChooseDifferentPlan && (
                <div className="gh:mt-4 gh:flex gh:justify-center">
                    <button
                        type="button"
                        onClick={onBack}
                        className="gh:border-0 gh:bg-transparent gh:p-0 gh:text-[14px] gh:font-medium gh:text-[#3d3d3d] gh:underline gh:cursor-pointer gh:hover:text-[#15171a]"
                    >
                        {t('Choose a different plan')}
                    </button>
                </div>
            )}
        </div>
    );
}

interface RowProps {
    newsletter: SiteNewsletter;
    checked: boolean;
    onToggle(): void;
}

function NewsletterRow({newsletter, checked, onToggle}: RowProps): ReactElement {
    return (
        <label className="gh:flex gh:items-start gh:gap-3 gh:rounded-lg gh:border gh:border-[#dadee2] gh:p-4 gh:cursor-pointer gh:hover:border-[#a8adb4]">
            <div className="gh:flex-1">
                <h3 className="gh:m-0 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{newsletter.name}</h3>
                {newsletter.description && (
                    <p className="gh:m-0 gh:mt-1 gh:text-[13px] gh:text-[#3d3d3d]">{newsletter.description}</p>
                )}
            </div>
            <Switch checked={checked} onChange={onToggle} />
        </label>
    );
}

interface LockedRowProps {
    newsletter: SiteNewsletter;
    hint: string;
}

function LockedNewsletterRow({newsletter, hint}: LockedRowProps): ReactElement {
    return (
        <div className="gh:flex gh:items-start gh:gap-3 gh:rounded-lg gh:border gh:border-[#dadee2] gh:p-4 gh:opacity-60">
            <div className="gh:flex-1">
                <h3 className="gh:m-0 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{newsletter.name}</h3>
                <p className="gh:m-0 gh:mt-1 gh:text-[13px] gh:text-[#3d3d3d]">{hint}</p>
            </div>
            <LockIcon className="gh:w-5 gh:h-5 gh:mt-0.5 gh:text-[#666]" />
        </div>
    );
}

interface SwitchProps {
    checked: boolean;
    onChange(): void;
}

function Switch({checked, onChange}: SwitchProps): ReactElement {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.preventDefault(); onChange(); }}
            className={cn(
                'gh:relative gh:inline-flex gh:items-center gh:w-10 gh:h-6 gh:rounded-full gh:border-0 gh:cursor-pointer gh:transition-colors gh:p-0',
                checked ? 'gh:bg-[var(--ghost-accent-color,#15171a)]' : 'gh:bg-[#dadee2]'
            )}
        >
            <span
                className={cn(
                    'gh:inline-block gh:w-4 gh:h-4 gh:rounded-full gh:bg-white gh:transition-transform',
                    checked ? 'gh:ltr:translate-x-5 gh:rtl:-translate-x-5' : 'gh:ltr:translate-x-1 gh:rtl:-translate-x-1'
                )}
            />
        </button>
    );
}


function LockIcon({className}: {className?: string}): ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
