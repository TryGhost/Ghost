import CustomFieldModal from './custom-fields/custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import {Button, Icon, List, ListItem, TabView} from '@tryghost/admin-x-design-system';
import {NoValueLabel, NoValueLabelIcon} from '@tryghost/shade/components';
import {TextCursorInput} from 'lucide-react';
import {useBrowseMemberCustomFieldsIncludingArchived, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {withErrorBoundary} from '../../error-boundary';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

// How many fields render before the list collapses behind "Show all" — the
// recommendations list's preview size.
const PREVIEW_COUNT = 5;

const FieldList: React.FC<{
    fields: MemberCustomField[];
    // Lifted to the parent: TabView unmounts hidden tabs, so local state
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
    // The standard settings list rows (the integrations pattern): ListItem
    // brings the hover background, separators, and the hover-revealed action
    // with it, so this list behaves like every other one in Settings.
    return (
        <>
            <List borderTop={false}>
                {visibleFields.map((field) => {
                    const userType = userTypeForField(field);
                    return (
                        <ListItem
                            key={field.key}
                            // The Edit button stays visible (not hover-only) so it's
                            // keyboard-focusable — the row div isn't. stopPropagation
                            // keeps a button click from also firing the row's onClick.
                            action={<Button color='green' label='Edit' link onClick={(e) => {
                                e?.stopPropagation();
                                openModal(field);
                            }} />}
                            avatar={
                                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-grey-100 dark:bg-grey-900'>
                                    <Icon name={userType.icon} size={18} />
                                </div>
                            }
                            detail={userType.label}
                            testId='custom-field-list-item'
                            title={<span className='font-semibold'>{field.name}</span>}
                            separator
                            onClick={() => openModal(field)}
                        />
                    );
                })}
            </List>
            {!showAll && fields.length > PREVIEW_COUNT && (
                // The recommendations table's "Show all" affordance. The top
                // border stands in for the last row's separator, which ListItem
                // suppresses on its last-of-type.
                <div className='flex items-center gap-2 border-t border-grey-100 pt-2 font-bold text-green hover:text-green-400 dark:border-grey-900'>
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

    const tabs = [
        {
            id: 'active-fields',
            title: 'Active',
            contents: <FieldList fields={activeFields} openModal={openModal} showAll={showAllActive} onShowAll={() => setShowAllActive(true)} />
        },
        {
            id: 'archived-fields',
            title: 'Archived',
            contents: <FieldList fields={archivedFields} openModal={openModal} showAll={showAllArchived} onShowAll={() => setShowAllArchived(true)} />
        }
    ];

    return (
        <TopLevelGroup
            customButtons={<Button color='clear' label='Add custom field' size='sm' onClick={() => openModal()} />}
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
                <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
