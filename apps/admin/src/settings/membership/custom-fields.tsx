import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import CustomFieldModal from './custom-fields/custom-field-modal';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import useFeatureFlag from '@/settings/app/hooks/use-feature-flag';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, DragIndicator, NoValueLabel, NoValueLabelIcon, type SortableItemContainerProps, SortableList, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {TextCursorInput} from 'lucide-react';
import {arrayMove} from '@dnd-kit/sortable';
import {inOrderOf, memberCustomFieldsDataType, useBrowseMemberCustomFieldsIncludingArchived, useReorderMemberCustomFields, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {DialogPortal} from '@/settings/app/components/providers/dialog-portal';

// How many fields render before the list collapses behind "Show all" — the
// recommendations list's preview size.
const PREVIEW_COUNT = 5;

// The sortable list addresses rows by `id`; a field has no id over the API, so its key
// is the identity throughout.
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
    // Neither belongs on the handle button the rest is spread onto: DragIndicator errors
    // on `separator`, and `id` is a field key that would become the button's DOM id.
    void separator;
    void id;

    // The handle sits in a centred column because the row stretches its children.
    const row = (
        <ActionListItem ref={setRef} className={isDragging ? 'opacity-75' : ''} data-testid='custom-field-list-item' style={style}>
            <Inline align='center' className='w-10 shrink-0'>
                <DragIndicator className='h-10' isDragging={isDragging || false} {...props} />
            </Inline>
            {children}
        </ActionListItem>
    );

    return isDragging ? <ActionList>{row}</ActionList> : row;
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

    // A collapsed list is still sortable: both ends of a drag are rows on screen, and the
    // fields behind "Show all" keep their places around the move.
    const isSortable = Boolean(onMove);

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
    const {mutateAsync: reorderFields} = useReorderMemberCustomFields();
    const queryClient = useQueryClient();
    const handleError = useHandleError();

    // The order just drawn, held as keys over whatever the server says — so a field added
    // or removed elsewhere still appears or goes. It states an order, never a set.
    const [drawnOrder, setDrawnOrder] = useState<string[] | null>(null);
    const serverFields = data?.members_custom_fields;
    const fields = useMemo(() => {
        const known = serverFields || [];
        return drawnOrder ? inOrderOf(drawnOrder, known) : known;
    }, [serverFields, drawnOrder]);
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

    const [editingField, setEditingField] = useState<{field?: MemberCustomField} | null>(null);
    const openModal = (field?: MemberCustomField) => setEditingField({field});

    /**
     * Applied to the whole list rather than the active tab: a reorder names every
     * definition, and the archived ones keep their places around the move. Rendered
     * immediately from local state, so letting go is the end of the interaction.
     */
    const onMove = (key: string, overKey: string) => {
        const from = fields.findIndex(field => field.key === key);
        const to = fields.findIndex(field => field.key === overKey);
        if (from === -1 || to === -1 || from === to) {
            return;
        }

        const reordered = arrayMove(fields, from, to);
        setDrawnOrder(reordered.map(field => field.key));

        reorderFields(reordered)
            .catch((error) => {
                // The server's message says what to do; refetching is how the screen
                // learns about the field it did not know about.
                handleError(error);
                void queryClient.invalidateQueries({queryKey: [memberCustomFieldsDataType]});
            })
            // Dropped either way: on success the cache holds this order, on failure the
            // server's is the one to show.
            .finally(() => setDrawnOrder(null));
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
            {editingField && <DialogPortal><CustomFieldModal field={editingField.field} onClose={() => setEditingField(null)} /></DialogPortal>}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
