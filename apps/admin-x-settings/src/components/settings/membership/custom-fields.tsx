import CustomFieldIcon from './custom-fields/custom-field-icon';
import CustomFieldModal from './custom-fields/custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, NoValueLabel, NoValueLabelIcon, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {TextCursorInput} from 'lucide-react';
import {useBrowseMemberCustomFieldsIncludingArchived, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {withErrorBoundary} from '../../error-boundary';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

// How many fields render before the list collapses behind "Show all" — the
// recommendations list's preview size.
const PREVIEW_COUNT = 5;

const FieldList: React.FC<{
    fields: MemberCustomField[];
    // Lifted to the parent: Tabs unmount hidden panels, so local state
    // would forget an expanded list on every tab switch.
    showAll: boolean;
    onShowAll: () => void;
    openModal: (field: MemberCustomField) => void;
}> = ({fields, showAll, onShowAll, openModal}) => {

    if (fields.length === 0) {
        // Mirrors the newsletters list's empty state, tab for tab.
        return (
            <NoValueLabel>
                <NoValueLabelIcon><TextCursorInput /></NoValueLabelIcon>
                No custom fields found.
            </NoValueLabel>
        );
    }

    // The endpoint returns the full (deliberately small) list, so "Show all"
    // is a client-side reveal — same UI as the recommendations table, without
    // inventing pagination the API doesn't have.
    const visibleFields = showAll ? fields : fields.slice(0, PREVIEW_COUNT);
    return (
        <>
            <ActionList>
                {visibleFields.map((field) => {
                    const userType = userTypeForField(field);
                    return (
                        <ActionListItem key={field.key} data-testid='custom-field-list-item'>
                            <ActionListItemContent asChild>
                                <button className='flex w-full items-center gap-3 py-3 text-left' type='button' onClick={() => openModal(field)}>
                                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted'>
                                        <CustomFieldIcon className='size-[18px]' type={userType.id} />
                                    </span>
                                    <span className='min-w-0 grow'>
                                        <span className='block font-semibold'>{field.name}</span>
                                        <span className='block text-sm text-muted-foreground'>{userType.label}</span>
                                    </span>
                                </button>
                            </ActionListItemContent>
                            <ActionListItemActions>
                                <Button className='h-auto p-0 font-bold text-green hover:text-green/90 hover:no-underline' size='sm' type='button' variant='link' onClick={() => openModal(field)}>Edit</Button>
                            </ActionListItemActions>
                        </ActionListItem>
                    );
                })}
            </ActionList>
            {!showAll && fields.length > PREVIEW_COUNT && (
                <div className='flex items-center gap-2 border-t border-border pt-2 font-bold text-green hover:opacity-80'>
                    <button type='button' onClick={onShowAll}>Show all</button>
                </div>
            )}
        </>
    );
};

const CustomFields: React.FC<{keywords: string[]}> = ({keywords}) => {
    // The endpoint is closed (404s) while the flag is off, so keep the query in
    // step with the flag rather than firing it into a wall. Settings is the one
    // place that manages archived fields too, so it uses the include-archived
    // variant rather than the default active-only browse.
    const hasCustomFields = useFeatureFlag('membersCustomFields');
    const {data} = useBrowseMemberCustomFieldsIncludingArchived({
        enabled: hasCustomFields
    });
    const fields = data?.members_custom_fields || [];
    const [selectedTab, setSelectedTab] = useState('active-fields');
    const [showAllActive, setShowAllActive] = useState(false);
    const [showAllArchived, setShowAllArchived] = useState(false);

    // The opted-in query returns both statuses; the tabs split them, following
    // the newsletters group. Archived fields stay manageable (rename, reactivate)
    // rather than vanishing — their globally-unique names would otherwise
    // block new fields for no visible reason.
    const activeFields = fields.filter(field => field.status === 'active');
    const archivedFields = fields.filter(field => field.status === 'archived');

    // The collapse is an initial-view optimization only: fields append in
    // insertion order, so a just-created (or just-reactivated) field is
    // always LAST — exactly the hidden slot. When a tab's list grows while
    // the screen is open, expand it so the new arrival is visible in place
    // rather than silently swallowed behind "Show all".
    const previousCounts = useRef({active: 0, archived: 0});
    useEffect(() => {
        if (activeFields.length > previousCounts.current.active && previousCounts.current.active > 0) {
            setShowAllActive(true);
        }
        if (archivedFields.length > previousCounts.current.archived && previousCounts.current.archived > 0) {
            setShowAllArchived(true);
        }
        previousCounts.current = {active: activeFields.length, archived: archivedFields.length};
    }, [activeFields.length, archivedFields.length]);

    const openModal = (field?: MemberCustomField) => NiceModal.show(CustomFieldModal, {field});

    return (
        <TopLevelGroup
            customButtons={<Button size='sm' type='button' variant='ghost' onClick={() => openModal()}>Add custom field</Button>}
            description='Create and manage custom fields to store extra information about your members'
            keywords={keywords}
            navid='custom-fields'
            testId='custom-fields'
            title='Custom fields'
        >
            {/* Both tabs render (empty ones included, the newsletters pattern)
                once ANY field exists — but a site with no fields at all gets
                no tabs, just the group description; newsletters never faces
                that state (a site always has one), custom fields start there. */}
            {fields.length > 0 && (
                <Tabs value={selectedTab} variant='underline' onValueChange={setSelectedTab}>
                    <TabsList>
                        <TabsTrigger value='active-fields'>Active</TabsTrigger>
                        <TabsTrigger value='archived-fields'>Archived</TabsTrigger>
                    </TabsList>
                    <TabsContent value='active-fields'><FieldList fields={activeFields} openModal={openModal} showAll={showAllActive} onShowAll={() => setShowAllActive(true)} /></TabsContent>
                    <TabsContent value='archived-fields'><FieldList fields={archivedFields} openModal={openModal} showAll={showAllArchived} onShowAll={() => setShowAllArchived(true)} /></TabsContent>
                </Tabs>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
