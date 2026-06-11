import * as customFields from '../../../../../../poc/custom-fields/repo';
import FakeLogo from '../../../assets/images/portal-splash-default-logo.png';
import LandingFormCreateModal from './landing-form/landing-form-create-modal';
import LandingFormModal from './landing-form/landing-form-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, DragIndicator, type SortableItemContainerProps, SortableList, Table, TableCell, TableRow, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

// POC Story 5.5: the Landing forms section is a Newsletters-style list of
// audience-targeted forms. "Add landing form" lives in the header always. Empty
// state shows a placeholder card; otherwise a reorderable list of rows (name +
// audience + enable toggle + Edit). Order = priority: a member gets the first
// form whose audience matches.

// The site logo, exactly as the signup portal preview renders it (portal.tsx):
// the site icon if set, otherwise an accent circle with the default Ghost logo.
const LogoMark: React.FC<{accent: string; icon?: string; size: number; className?: string}> = ({accent, icon, size, className = ''}) => (
    icon ? (
        <div className={`rounded-sm bg-cover bg-center ${className}`} style={{width: size, height: size, backgroundImage: `url(${icon})`}} />
    ) : (
        <div className={`flex items-center justify-center overflow-hidden rounded-full p-1 ${className}`} style={{width: size, height: size, backgroundColor: accent}}>
            <img alt='' className='h-auto w-5/6' src={FakeLogo} />
        </div>
    )
);

// An illustrative empty state, in the spirit of the Ghost Explore preview: a faux
// browser showing a minimal post page, with the real landing card floating in the
// corner, so owners see how (and where) it appears to members. Intentionally
// always-light (like the signup portal iframe preview), so no dark: variants.
const PlaceholderCard: React.FC<{accent: string; siteUrl: string; icon?: string}> = ({accent, siteUrl, icon}) => (
    // Full-bleed gradient background (escapes the section padding); a white site
    // "window" sits on it and bleeds off the bottom, with the card floating bottom-right.
    <div className='-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-gradient-to-tr from-white to-[#f9f9fa] px-8 pt-8 md:-mx-7 md:-mb-7'>
        <div className='overflow-hidden rounded-t-xl bg-white shadow-md'>
            {/* Browser URL bar (full-width pill) */}
            <div className='px-4 pt-4'>
                <div className='flex h-7 w-full items-center rounded-full bg-grey-100 px-4'>
                    <span className='truncate text-xs text-grey-500'>{siteUrl}</span>
                </div>
            </div>
            {/* Minimal post page (title + author + body), card floating bottom-right */}
            <div className='relative h-[260px] overflow-hidden'>
                {/* The skeleton fades to transparent at the bottom (mask); the card is a
                    separate sibling below, so it stays fully opaque. */}
                <div className='h-full [mask-image:linear-gradient(to_bottom,#000_55%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent)]'>
                    <div className='mx-auto max-w-[360px] px-6 pt-8'>
                        <div className='mb-5 h-5 w-4/5 rounded bg-grey-200' />
                        <div className='mb-9 flex items-center gap-2'>
                            <div className='size-6 rounded-full bg-grey-200' />
                            <div className='h-2.5 w-24 rounded-full bg-grey-200' />
                            <div className='h-2.5 w-12 rounded-full bg-grey-100' />
                        </div>
                        <div className='flex flex-col gap-2.5'>
                            <div className='h-2 w-full rounded-full bg-grey-100' />
                            <div className='h-2 w-full rounded-full bg-grey-100' />
                            <div className='h-2 w-11/12 rounded-full bg-grey-100' />
                            <div className='h-2 w-5/6 rounded-full bg-grey-100' />
                        </div>
                        <div className='mt-5 flex flex-col gap-2.5'>
                            <div className='h-2 w-full rounded-full bg-grey-100' />
                            <div className='h-2 w-11/12 rounded-full bg-grey-100' />
                            <div className='h-2 w-full rounded-full bg-grey-100' />
                            <div className='h-2 w-2/3 rounded-full bg-grey-100' />
                        </div>
                    </div>
                </div>

                <div className='absolute right-4 bottom-5 w-[200px] rounded-lg bg-white p-5 shadow-xl'>
                    <LogoMark accent={accent} className='mx-auto mb-2' icon={icon} size={32} />
                    <div className='mb-3 text-center text-xs font-bold text-grey-900'>Tell us a bit more about you</div>
                    <div className='mb-1.5 h-2 w-14 rounded-full bg-grey-200' />
                    <div className='mb-3 h-7 rounded-md border border-grey-200' />
                    <div className='flex h-7 items-center justify-center rounded-md' style={{backgroundColor: accent}}>
                        <span className='text-[11px] font-semibold text-white'>Save</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Row container, modelled exactly on the Newsletters list (newsletters-list.tsx):
// a real TableRow (drag cell + Edit action). The Table wrapper gives the matching
// padding, fading hover, header divider, and last-row handling for free.
const LandingFormRowContainer: React.FC<Partial<SortableItemContainerProps> & {onEdit: (id: string) => void}> = ({id, setRef, isDragging, style, children, onEdit, ...props}) => {
    const container = (
        <TableRow
            ref={setRef}
            action={<Button color='green' label='Edit' link onClick={() => onEdit(id!)} />}
            className={isDragging ? 'opacity-75' : ''}
            hideActions={false}
            style={style}
            onClick={() => onEdit(id!)}
        >
            {(props.dragHandleAttributes || isDragging) && <TableCell className='w-10 align-middle!'>
                <DragIndicator className='h-10' isDragging={isDragging || false} {...props} />
            </TableCell>}
            {children}
        </TableRow>
    );
    return isDragging ? <Table>{container}</Table> : container;
};

// Row cells (the SortableList renderItem): name + audience + description, then the
// enable toggle. Mirrors Newsletters' NewsletterItem (name + "No description").
const LandingFormCells: React.FC<{
    form: customFields.LandingForm
    onEdit: (id: string) => void
    onToggle: (form: customFields.LandingForm, enabled: boolean) => void
}> = ({form, onEdit, onToggle}) => (
    <>
        <TableCell className='w-full' onClick={() => onEdit(form.id)}>
            <div className='flex grow flex-col'>
                <span className='font-medium'>{form.name}</span>
                <span className='mt-0.5 text-sm leading-tight text-grey-700 dark:text-grey-600'>{form.description || 'No description'}</span>
            </div>
        </TableCell>
        <TableCell className='align-middle!' onClick={e => e.stopPropagation()}>
            <Toggle checked={form.enabled} direction='rtl' onChange={e => onToggle(form, e.target.checked)} />
        </TableCell>
    </>
);

const LandingForm: React.FC<{keywords: string[]}> = ({keywords}) => {
    const [forms, setForms] = useState<customFields.LandingForm[]>([]);
    const [loading, setLoading] = useState(true);
    const {settings, siteData} = useGlobalData();
    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const accent = accentColor || '#F6414E';
    // Strip the scheme/trailing slash for a clean browser-bar look (e.g. localhost:2368).
    const siteUrl = (siteData?.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '') || 'yoursite.com';

    const refresh = useCallback(async () => {
        setForms(await customFields.listLandingForms());
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        return customFields.subscribe(refresh);
    }, [refresh]);

    const openEdit = (id: string) => NiceModal.show(LandingFormModal, {formId: id});

    const openCreate = () => NiceModal.show(LandingFormCreateModal, {refresh, onCreated: (form: customFields.LandingForm) => openEdit(form.id)});

    const onToggle = (form: customFields.LandingForm, enabled: boolean) => {
        setForms(current => current.map(f => (f.id === form.id ? {...f, enabled} : f)));
        customFields.updateLandingForm(form.id, {enabled});
    };

    const onMove = (id: string, overId: string) => {
        const from = forms.findIndex(f => f.id === id);
        const to = forms.findIndex(f => f.id === overId);
        if (from === -1 || to === -1) {
            return;
        }
        const next = [...forms];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setForms(next);
        customFields.setLandingForms(next);
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='clear' label='Add landing form' size='sm' onClick={openCreate} />}
            description='Collect extra information from members when they next visit your site'
            keywords={keywords}
            navid='landing-forms'
            testId='landing-forms'
            title='Landing forms'
        >
            {loading ? null : forms.length === 0 ? (
                <PlaceholderCard accent={accent} icon={icon} siteUrl={siteUrl} />
            ) : (
                // border-t = the header/content divider (Welcome emails gets this from
                // <Table borderTop>, which SortableList's wrapper can't pass through).
                <div className='border-t border-grey-300 dark:border-grey-800'>
                    <SortableList
                        container={props => <LandingFormRowContainer {...props} onEdit={openEdit} />}
                        items={forms}
                        renderItem={form => <LandingFormCells form={form} onEdit={openEdit} onToggle={onToggle} />}
                        wrapper={Table}
                        onMove={onMove}
                    />
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(LandingForm, 'Landing forms');
