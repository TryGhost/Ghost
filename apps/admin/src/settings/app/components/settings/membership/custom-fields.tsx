import CustomFieldIcon from './custom-fields/custom-field-icon';
import CustomFieldModal from './custom-fields/custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import useFeatureFlag from '@/settings/app/hooks/use-feature-flag';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, DragIndicator, NoValueLabel, NoValueLabelIcon, type SortableItemContainerProps, SortableList, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {TextCursorInput} from 'lucide-react';
import {arrayMove} from '@dnd-kit/sortable';
import {useDndContext} from '@dnd-kit/core';
import {memberCustomFieldsDataType, useBrowseMemberCustomFieldsIncludingArchived, useReorderMemberCustomFields, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';
import type {MemberCustomField, MemberCustomFieldsResponseType} from '@tryghost/admin-x-framework/api/member-custom-fields';

// How many fields render before the list collapses behind "Show all" — the
// recommendations list's preview size.
const PREVIEW_COUNT = 5;

// A field as the sortable list wants it. That list addresses rows by `id`; a custom
// field has no id over the API and is addressed by its key, which is also what the
// reorder request names, so the key is the identity all the way through.
type SortableField = MemberCustomField & {id: string};
const withRowIds = (fields: MemberCustomField[]): SortableField[] =>
    fields.map(field => ({...field, id: field.key}));

// One row's content, shared by the plain list and the sortable one so a field reads
// identically whether or not it can be dragged.
const FieldRow: React.FC<{
    field: MemberCustomField;
    openModal: (field: MemberCustomField) => void;
}> = ({field, openModal}) => {
    const userType = userTypeForField(field);
    return (
        <>
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
        </>
    );
};

// The row a dragged field sits in. The drag overlay renders outside the list's wrapper,
// so a row being dragged supplies its own ActionList to keep its styling.
const SortableFieldRow: React.FC<SortableItemContainerProps> = ({
    id,
    setRef,
    isDragging,
    style,
    separator,
    children,
    ...props
}) => {
    // `separator` is dropped rather than passed on: what is left here is spread onto the
    // handle button, and DragIndicator errors if it receives it. `id` is dropped for the
    // same reason — it is a field key, which would become the button's DOM id.
    void separator;

    // `isDragging` is true only for the copy the drag overlay renders, never for the row
    // that copy was made from: the list hands every one of its own rows `false`. So the
    // row being dragged has to be identified from the drag itself.
    //
    // It matters because that row is still in the list, still opaque, and still carrying
    // the drag's transform — so without this it tracks the cursor alongside the overlay
    // and a publisher drags two of everything. Hiding it leaves the overlay as the only
    // thing moving, and leaves its space behind for the list to close up.
    const {active} = useDndContext();
    const isOverlay = Boolean(isDragging);
    const isRowBeingDragged = !isOverlay && active !== null && active.id === id;

    const row = (
        <ActionListItem
            ref={setRef}
            className={isOverlay ? 'opacity-75' : (isRowBeingDragged ? 'opacity-0' : '')}
            data-dragging={isRowBeingDragged || undefined}
            data-testid='custom-field-list-item'
            style={style}
        >
            <DragIndicator className='mr-2 h-10 shrink-0' isDragging={isOverlay} {...props} />
            {children}
        </ActionListItem>
    );

    return isOverlay ? <ActionList>{row}</ActionList> : row;
};

const FieldList: React.FC<{
    fields: MemberCustomField[];
    // Lifted to the parent: Tabs unmount hidden panels, so local state
    // would forget an expanded list on every tab switch.
    showAll: boolean;
    onShowAll: () => void;
    openModal: (field: MemberCustomField) => void;
    // Absent on the archived tab: an archived field holds its place in the order but
    // there is nowhere to see it, so there is nothing to drag it through.
    onMove?: (key: string, overKey: string) => void;
}> = ({fields, showAll, onShowAll, openModal, onMove}) => {

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
    const isTruncated = !showAll && fields.length > PREVIEW_COUNT;
    const visibleFields = isTruncated ? fields.slice(0, PREVIEW_COUNT) : fields;

    // Dragging is offered only once the whole list is on screen. Half a list is a bad
    // thing to reorder: the places a field can be dropped are the rows you can see, so
    // a truncated list silently withholds most of the order. Expanding is one click and
    // a list of five or fewer never collapses in the first place.
    const isSortable = Boolean(onMove) && !isTruncated;

    return (
        <>
            {isSortable ? (
                <SortableList
                    container={props => <SortableFieldRow {...props} />}
                    getDragHandleLabel={field => `Reorder ${field.name}`}
                    items={withRowIds(visibleFields)}
                    renderItem={field => <FieldRow field={field} openModal={openModal} />}
                    wrapper={ActionList}
                    onMove={(key, overKey) => onMove?.(key, overKey)}
                />
            ) : (
                <ActionList>
                    {visibleFields.map(field => (
                        <ActionListItem key={field.key} data-testid='custom-field-list-item'>
                            <FieldRow field={field} openModal={openModal} />
                        </ActionListItem>
                    ))}
                </ActionList>
            )}
            {isTruncated && (
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
    const {mutateAsync: reorderFields} = useReorderMemberCustomFields();
    const queryClient = useQueryClient();
    const handleError = useHandleError();
    const [selectedTab, setSelectedTab] = useState('active-fields');
    const [showAllActive, setShowAllActive] = useState(false);
    const [showAllArchived, setShowAllArchived] = useState(false);

    // The opted-in query returns both statuses; the tabs split them, following
    // the newsletters group. Archived fields stay manageable (rename, reactivate)
    // rather than vanishing — their globally-unique names would otherwise
    // block new fields for no visible reason.
    const activeFields = fields.filter(field => field.status === 'active');
    const archivedFields = fields.filter(field => field.status === 'archived');

    // The collapse is an initial-view optimization only: a new field is appended to the
    // end of the publisher's order, so it lands in exactly the hidden slot. When a tab's
    // list grows while the screen is open, expand it so the new arrival is visible in
    // place rather than silently swallowed behind "Show all". Expanding also puts the
    // active list back in reach of a drag, which a truncated list does not offer.
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

    /**
     * Move a field to where another one sits, and tell the server the new order.
     *
     * The move is applied to the whole list, not to the active tab it was made in: a
     * reorder states the order of every definition the site has, and the archived fields
     * mixed in among them keep their places. Both ends of a drag are active fields, so
     * moving the dragged one to the target's index in the full list gives exactly the
     * order the publisher drew, with the archived ones undisturbed around it.
     *
     * The cache is moved first so the row stays where it was dropped. Waiting for the
     * round-trip would snap it back under the cursor and then jump. If the request
     * fails, invalidating puts the server's order back.
     */
    const onMove = (key: string, overKey: string) => {
        const from = fields.findIndex(field => field.key === key);
        const to = fields.findIndex(field => field.key === overKey);
        if (from === -1 || to === -1 || from === to) {
            return;
        }

        const reordered = arrayMove(fields, from, to);

        // Several lists live under this data type, one per set of query params, and they
        // do not hold the same fields: this screen asked for every status, while a
        // member's details and the importer asked for active fields only. Each is put
        // into the new order rather than replaced by this screen's list, which would
        // hand those two archived fields they are written to assume they never see.
        const placeOf = new Map(reordered.map((field, place) => [field.key, place]));
        queryClient.setQueriesData<MemberCustomFieldsResponseType>(
            {queryKey: [memberCustomFieldsDataType]},
            (current) => {
                if (!current?.members_custom_fields) {
                    return current;
                }
                // A field this drag did not name keeps to the end rather than jumping to
                // the front, which is where an unknown place would otherwise sort.
                const inNewOrder = [...current.members_custom_fields].sort(
                    (a, b) => (placeOf.get(a.key) ?? Infinity) - (placeOf.get(b.key) ?? Infinity)
                );
                return {...current, members_custom_fields: inNewOrder};
            }
        );

        reorderFields(reordered).catch((error) => {
            // The server's own message, not a generic one. The failure a publisher can
            // actually provoke is a list that no longer names every field, because a
            // colleague added one, and the API says so in words worth reading: it names
            // the field and asks them to reload.
            handleError(error);
            queryClient.invalidateQueries({queryKey: [memberCustomFieldsDataType]});
        });
    };

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
                    <TabsContent value='active-fields'><FieldList fields={activeFields} openModal={openModal} showAll={showAllActive} onMove={onMove} onShowAll={() => setShowAllActive(true)} /></TabsContent>
                    <TabsContent value='archived-fields'><FieldList fields={archivedFields} openModal={openModal} showAll={showAllArchived} onShowAll={() => setShowAllArchived(true)} /></TabsContent>
                </Tabs>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
