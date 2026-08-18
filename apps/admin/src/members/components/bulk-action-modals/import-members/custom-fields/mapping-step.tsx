import {Button, Checkbox, DialogFooter, LoadingIndicator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {CreateFieldForm} from '@/members/components/bulk-action-modals/import-members/custom-fields/create-field-form';
import {APIError, HostLimitError, JSONError, ValidationError, getErrorMessage} from '@tryghost/admin-x-framework/errors';
import {memberCustomFieldCsvColumns, memberCustomFieldParts, useCreateMemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {FieldPicker} from '@/members/components/bulk-action-modals/import-members/custom-fields/field-picker';
import {LabelPicker} from '@/members/label-picker';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import {MembersFieldMapping, columnsOf} from '@/members/components/bulk-action-modals/import-members/custom-fields/mapping';
import {Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {type FieldTarget} from '@/members/components/bulk-action-modals/import-members/custom-fields/field-targets';
import {type MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {type UseLabelPickerResult} from '@/members/hooks/use-label-picker';

interface MappingPreviewRow {
    key: string;
    value: string;
    mapTo: string | null;
}

// An import the table refuses to send: why, and which columns are to blame. One value rather
// than two, because a message shown with the wrong rows marked is worse than either alone.
interface IncompleteImport {
    message: string;
    columns: ReadonlySet<string>;
}

interface MappingStepProps {
    status: 'MAPPING' | 'UPLOADING';
    fileData: Record<string, string>[];
    mapping: MembersFieldMapping | null;
    mappingError: string | null;
    showMappingErrors: boolean;
    dataPreviewIndex: number;
    targets: FieldTarget[];
    labelPicker: UseLabelPickerResult;
    onUpdateMapping: (from: string, to: string | null) => void;
    onFieldCreated: (columnKey: string, column: string | null) => void;
    onDataPreviewIndexChange: (next: number) => void;
    onStartOver: () => void;
    // Whether a column has been switched in or out of the import, which is the one decision
    // this table keeps to itself. Everything else the publisher changes goes through
    // onUpdateMapping, so between them the modal knows if there is anything to lose.
    onColumnsChanged: () => void;
    // Carries what the import should write, column by column. The table is the only thing
    // that knows both the mapping and which columns are in the import, so it says the whole
    // of it rather than handing over a correction to apply.
    onUpload: (importMapping: Record<string, string | null>) => void;
}

// A set with one member added or removed, since both halves of the in-or-out decision below
// are held as memberships.
function toggled(set: ReadonlySet<string>, key: string, present: boolean): ReadonlySet<string> {
    const next = new Set(set);
    if (present) {
        next.add(key);
    } else {
        next.delete(key);
    }
    return next;
}

/**
 * The CSV column a row should map onto, resolved from the field the server actually created
 * rather than from the type that was asked for.
 *
 * Null for a composite, which spans several columns and so has no single answer. Which of them
 * this column holds is asked in the field picker afterwards, not here: it is the same question
 * as any other mapping, and the picker already knows how to ask it.
 */
function columnFor(field: MemberCustomField): string | null {
    if (memberCustomFieldParts(field.type)) {
        return null;
    }
    return memberCustomFieldCsvColumns([field])[0]?.value ?? null;
}

export function MappingStep({
    status,
    fileData,
    mapping,
    mappingError,
    showMappingErrors,
    dataPreviewIndex,
    targets,
    labelPicker,
    onUpdateMapping,
    onFieldCreated,
    onDataPreviewIndexChange,
    onStartOver,
    onColumnsChanged,
    onUpload
}: MappingStepProps) {
    // Columns switched on without a target yet, and columns switched off that still have one.
    // Between them and the mapping, a column is either in the import or out of it — and what it
    // was mapped to survives being switched off, because that is a different decision.
    const [pendingColumns, setPendingColumns] = useState<ReadonlySet<string>>(new Set());
    const [excludedColumns, setExcludedColumns] = useState<ReadonlySet<string>>(new Set());
    // Raised when Import is pressed on a table that cannot be imported, and cleared by any
    // answer to it. Set afresh on every press, so pressing Import again scrolls back to the
    // first offender below rather than sitting inert.
    const [incomplete, setIncomplete] = useState<IncompleteImport | null>(null);

    // Each row's field picker, so a refusal can bring the column it names into view. A long
    // file scrolls, and naming a column the publisher would have to go looking for is barely
    // better than not naming it.
    const fieldTriggers = useRef(new Map<string, HTMLElement>());

    // After the refusal has rendered rather than while handling the click: the message appears
    // below the table and takes its height from it, so scrolling first would aim at a table
    // that is about to get shorter and leave the row half under the new bottom edge. Layout,
    // not effect, so it lands before the frame the message arrives in is painted.
    useLayoutEffect(() => {
        const [firstUndecided] = incomplete?.columns ?? [];
        if (!firstUndecided) {
            return;
        }
        // 'nearest' scrolls only as far as it has to, leaving a column already in view where
        // it was; scroll-my on the trigger keeps it off the edge it arrives at.
        fieldTriggers.current.get(firstUndecided)?.scrollIntoView({
            block: 'nearest',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
    }, [incomplete]);

    // The column whose create form is open, shown as a row beneath that column's own. Held
    // here rather than by the modal, which only ever forwarded it, so it clears with the
    // table on Start over instead of outliving the file it belonged to.
    const [createFieldForColumn, setCreateFieldForColumn] = useState<string | null>(null);

    // Which row's field picker is open, and what it is filtered by. Held here rather than in
    // each picker because creating a composite has to reopen the picker it was launched from,
    // filtered to the field just made — and only one can be open at a time regardless.
    const [openPicker, setOpenPicker] = useState<{columnKey: string; search: string} | null>(null);

    // A row other than the one being answered is faded out, and is inert to match: reading as
    // disabled while still taking clicks is a mixed signal, and it is also what kept the create
    // form reachable for unmounting while its own request was still in flight.
    // The create lives here rather than in the form because its outcome is this step's
    // business: a scalar finishes a row's mapping, a composite reopens the picker, and a
    // refusal has to keep the form on screen to be shown in. The form asks; this answers.
    const {mutateAsync: createField, isPending: isCreating} = useCreateMemberCustomField();
    const [nameError, setNameError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [canRetry, setCanRetry] = useState(true);
    const handleError = useHandleError();

    const clearCreateErrors = useCallback(() => {
        setNameError(null);
        setSaveError(null);
        setCanRetry(true);
    }, []);

    const reportCreateFailure = (error: unknown) => {
        const apiError = error instanceof JSONError ? error.data?.errors?.[0] : null;

        // A refusal the publisher can answer by typing belongs on the input they would change.
        if (error instanceof ValidationError && apiError?.property === 'name') {
            setNameError(getErrorMessage(error, 'Invalid name'));
            return;
        }

        // The server's own sentence wherever there is one — for the site's field ceiling it is
        // the only thing that explains the refusal. The fallback covers the errors carrying no
        // API body at all (maintenance, timeout, unreachable), whose class message is the text.
        setSaveError(getErrorMessage(error, error instanceof APIError ? error.message : 'Could not create the custom field, please try again.'));
        // Nothing they can type changes a ceiling or a permission.
        setCanRetry(!(error instanceof HostLimitError) && apiError?.type !== 'NoPermissionError');

        // The ceiling is an expected answer rather than a fault; everything else reaching here
        // (a 500, a timeout, an expired session) should be visible to us. No toast: the form is
        // still on screen saying it, an inch above the button they pressed.
        if (!(error instanceof HostLimitError)) {
            handleError(error, {withToast: false});
        }
    };

    // The whole create, from asking to what its answer means for the row. Named rather than
    // inlined into the form's prop: it is the step's business end, not markup.
    const createFieldForRow = async (rowKey: string, name: string, type: MemberCustomField['type']) => {
        clearCreateErrors();

        let field;
        try {
            const response = await createField({name, type});
            field = response.members_custom_fields?.[0];
        } catch (error) {
            reportCreateFailure(error);
            return;
        }

        if (!field) {
            // A success carrying nothing. The field may well have been made, so saying it could
            // not be would have them make a second one; this says what is true and leaves the
            // row to be mapped by hand from the list.
            setSaveError('The field was created, but this column could not be mapped to it. Choose it from the list.');
            setCanRetry(false);
            handleError(new Error('Custom field create returned no field'));
            return;
        }

        const column = columnFor(field);
        onFieldCreated(rowKey, column);
        setCreateFieldForColumn(null);
        // Creating a field for a column the import was refused over is an answer to that
        // refusal, so it clears with the others. A composite is not answered yet — its part is
        // still to choose — but the message named a column, not a part, and leaving it up would
        // keep pointing at a row that has moved on.
        setIncomplete(null);

        if (column) {
            // A scalar is fully mapped now, so the form just goes; focus returns to the row
            // rather than to the body.
            fieldTriggers.current.get(rowKey)?.focus();
            return;
        }
        // A composite spans several columns, so which of them this one holds is still open.
        // Asked in the picker, filtered to the new field: the same question as any other
        // mapping, rather than a third control on the form for the one type that needs it.
        showPicker(rowKey, field.name);
    };

    const isDimmed = (row: MappingPreviewRow) => Boolean(createFieldForColumn) && createFieldForColumn !== row.key;
    // Locked only while a create is actually in flight — long enough that the form cannot be
    // taken away before its own request settles, and no longer, so moving on to another column
    // still puts a form the publisher has finished with away.
    const isRowLocked = (_row: MappingPreviewRow) => status === 'UPLOADING' || isCreating;

    // Opening a row's picker puts the create form away: the publisher has moved on to another
    // decision, and leaving it open would strand a half-filled form under someone else's
    // dropdown. The form's own selects live inside it and are unaffected.
    const showPicker = (columnKey: string, search: string) => {
        // The refusal belonged to the form being put away. Left standing it would greet the
        // next form, under an input nobody has touched, and a ceiling refusal would arrive
        // with its Save already disabled.
        clearCreateErrors();
        setCreateFieldForColumn(null);
        setOpenPicker({columnKey, search});
    };

    const showCreateForm = (columnKey: string) => {
        clearCreateErrors();
        setCreateFieldForColumn(columnKey);
    };

    // A target belongs to one column, so mapping it here takes it from whichever column held
    // it. That column keeps its place in the import with the field still to answer: it did not
    // ask to lose anything, and should not silently drop out of the import with nothing said.
    const claimTarget = (row: MappingPreviewRow, target: string) => {
        const previousHolder = mapping?.getKeyByValue(target);
        if (previousHolder && previousHolder !== row.key) {
            setPendingColumns(previous => toggled(previous, previousHolder, true));
        }
        onUpdateMapping(row.key, target);
    };

    const isImported = (row: MappingPreviewRow) => !excludedColumns.has(row.key)
        && (Boolean(row.mapTo) || pendingColumns.has(row.key));

    // Switching a column off leaves its field alone: excluding a column from this import and
    // choosing what it holds are different answers, and switching it back on should not make
    // the publisher pick again.
    const setImported = (row: MappingPreviewRow, imported: boolean) => {
        setIncomplete(null);
        onColumnsChanged();
        setExcludedColumns(previous => toggled(previous, row.key, !imported));
        setPendingColumns(previous => toggled(previous, row.key, imported && !row.mapTo));
        if (!imported && createFieldForColumn === row.key) {
            setCreateFieldForColumn(null);
        }
    };

    // Both refusals read the same way, and the mapping error wins: a file with no email column
    // cannot be imported at all, whereas an undecided column is one answer away.
    // Gated as the shipped step gates it, deliberately. The gate is dead — it only opens when
    // Import is pressed, and that button is disabled in the one state that sets a mapping error
    // — but opening it changes nothing a publisher can reach: papaparse does not throw, so the
    // parse and read messages behind it cannot fire, and the empty-file case the table already
    // reports in its own body. Left matching the shipped import until csv.ts stops discarding
    // papaparse's errors, which is what would make any of these reachable. See BER ticket.
    const visibleError = (showMappingErrors && mappingError) || incomplete?.message;
    // A refusal that names columns is marked on their own selects, so the table is left alone:
    // reddening the whole of it would point at every row for the sake of one. Every other
    // refusal is about the file rather than a row anyone can be sent to, so the table carries it.
    const tableError = Boolean(visibleError) && !incomplete?.columns.size;

    const columnCount = 4;

    // Every column the file has, not the ones the previewed row happens to carry. Papaparse
    // omits keys for a row with fewer cells than the header, so reading columns off a single row
    // lets a ragged CSV hide one from the table entirely — and a column the mapping never names
    // is carried through by the importer rather than left out, which is the opposite of what a
    // publisher who never saw it would expect. The preview index chooses which values are shown;
    // it must never decide which columns exist.
    // Derived rather than passed: all three are facts about the file and where the preview
    // sits in it, both of which are already here. Sent down as well, they could only ever
    // differ from their source by a bug.
    const membersCount = fileData.length;
    const hasPrevRecord = dataPreviewIndex > 0;
    const hasNextRecord = Boolean(fileData[dataPreviewIndex + 1]);

    const columnKeys = useMemo(() => columnsOf(fileData), [fileData]);

    const currentlyDisplayedData: MappingPreviewRow[] = mapping
        ? columnKeys.map(key => ({
            key,
            value: fileData[dataPreviewIndex]?.[key] ?? '',
            mapTo: mapping.get(key)
        }))
        : [];

    // What this import writes: one entry per column in the file — the field it fills, empty for
    // a column left out, or null for a column in the import with no field chosen yet.
    // Everything asking what is being imported reads this one value, so the checks below and
    // the request itself cannot disagree.
    //
    // Empty rather than omitted, because the importer carries a column the mapping does not
    // name through under its own header — which is how an unnamed custom_fields.* column
    // survives to be read. Leaving a column out of the mapping is the opposite of leaving it
    // out of the import.
    const importMapping: Record<string, string | null> = Object.fromEntries(
        currentlyDisplayedData.map(row => [row.key, isImported(row) ? row.mapTo : ''])
    );

    // What refuses this import, read off the mapping actually being sent. With custom fields
    // on it is answered here, because this is the only place that knows both the mapping and
    // which columns are in the import. A file-level problem (empty, unreadable) is the modal's
    // to report and it refuses the upload itself, so nothing about the mapping is worth saying
    // ahead of it.
    //
    // Off, both checks belong to the modal exactly as they always did.
    const importRefusal = (): IncompleteImport | null => {
        if (mappingError) {
            return null;
        }

        if (!Object.values(importMapping).includes('email')) {
            return {
                message: 'Please map "Email" to one of the fields in the CSV, and make sure it is selected.',
                columns: new Set()
            };
        }

        // Null is a column in the import with nothing chosen for it, which is the one state
        // the table can hold that cannot be sent.
        const undecided = Object.keys(importMapping).filter(column => importMapping[column] === null);
        if (undecided.length === 0) {
            return null;
        }

        return {
            message: `Choose a field for ${undecided.map(column => `"${column}"`).join(', ')}, or deselect ${undecided.length === 1 ? 'it' : 'them'}.`,
            columns: new Set(undecided)
        };
    };

    const handleImport = () => {
        const refusal = importRefusal();
        if (refusal) {
            setIncomplete(refusal);
            return;
        }
        onUpload(importMapping);
    };

    return (
        <>
            {/* A flex column inside the height-bounded dialog: the table box below grows into
                whatever room is left, so a short file keeps a small modal and a long one
                fills the viewport rather than scrolling inside a fixed 400px. */}
            <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-5">
                {(
                    <>
                        <div className={cn(
                            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border',
                            tableError && 'border-destructive'
                        )}>
                            <div className="min-h-0 flex-1 overflow-auto">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">
                                                <span className="sr-only">Import this column</span>
                                            </TableHead>
                                            <TableHead className="w-[26%]">Field</TableHead>
                                            <TableHead className="w-[30%]">
                                                <div className="flex items-center justify-between">
                                                    <span>
                                                        Sample data <span className="text-muted-foreground">(#{formatNumber(dataPreviewIndex + 1)})</span>
                                                    </span>
                                                    <div className="flex items-center">
                                                        <button
                                                            aria-label="Show previous sample row"
                                                            className={cn(
                                                                'rounded p-0.5 hover:bg-muted',
                                                                !hasPrevRecord && 'cursor-default opacity-30'
                                                            )}
                                                            disabled={!hasPrevRecord || status === 'UPLOADING'}
                                                            type="button"
                                                            onClick={() => onDataPreviewIndexChange(dataPreviewIndex - 1)}
                                                        >
                                                            <LucideIcon.ChevronLeft className="size-4" />
                                                        </button>
                                                        <button
                                                            aria-label="Show next sample row"
                                                            className={cn(
                                                                'rounded p-0.5 hover:bg-muted',
                                                                !hasNextRecord && 'cursor-default opacity-30'
                                                            )}
                                                            disabled={!hasNextRecord || status === 'UPLOADING'}
                                                            type="button"
                                                            onClick={() => onDataPreviewIndexChange(dataPreviewIndex + 1)}
                                                        >
                                                            <LucideIcon.ChevronRight className="size-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-[38%]">Import as</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentlyDisplayedData.length > 0 ? (
                                            currentlyDisplayedData.map(row => (
                                                <Fragment key={row.key}>
                                                {/* While a create form is open, the rows it doesn't concern step back, so
                                                    the pair being worked on reads as the foreground without anything being
                                                    covered. Opacity on the rows themselves, not a layer over them. */}
                                                {/* A row that is out of the import is tinted rather than
                                                    faded. Alpha on the token, not opacity on the row: at
                                                    full strength it read as heavier than the rows that
                                                    matter, and fading the row instead took the field
                                                    control's border down with it. Fading is left for the
                                                    create form, where dropping everything back is the
                                                    point.

                                                    No row hover: Shade paints it onto each cell through
                                                    group-hover, so it is turned off there. Nothing here
                                                    responds to a row being pointed at — the controls in
                                                    it have their own hover — and the hover token is
                                                    lighter than the tint above, so on a row out of the
                                                    import it read as the row coming back to life. */}
                                                <TableRow className={cn(
                                                    'transition-opacity [&>td]:group-hover:bg-transparent',
                                                    !isImported(row) && 'bg-muted/50',
                                                    isDimmed(row) && 'opacity-40'
                                                )}>
                                                    <TableCell>
                                                        <Checkbox
                                                            aria-label={`Import ${row.key}`}
                                                            checked={isImported(row)}
                                                            disabled={isRowLocked(row)}
                                                            onCheckedChange={checked => setImported(row, checked === true)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className={cn('text-sm font-medium break-all', !isImported(row) && 'text-muted-foreground')}>{row.key}</TableCell>
                                                    <TableCell className={cn('text-sm break-all', (!row.value || !isImported(row)) && 'text-muted-foreground')}>
                                                        {row.value || '\u00A0'}
                                                    </TableCell>
                                                    <TableCell>
                                                    {/* Hidden rather than unmounted for a column out of the
                                                        import: the control it would offer cannot be used, and a
                                                        disabled one has to be styled, faded and explained.
                                                        visibility keeps its box, so the row does not change
                                                        height as columns go in and out, and takes it out of the
                                                        tab order and out of reach of the pointer without a
                                                        second mechanism. The mapping is not lost either way —
                                                        it comes back with the row when it is selected again. */}
                                                        <FieldPicker
                                                            className={cn(!isImported(row) && 'invisible')}
                                                            columnKey={row.key}
                                                            disabled={isRowLocked(row)}
                                                            invalid={incomplete?.columns.has(row.key)}
                                                            open={openPicker?.columnKey === row.key}
                                                            search={openPicker?.columnKey === row.key ? openPicker.search : ''}
                                                            targets={targets}
                                                            triggerRef={(node) => {
                                                                if (node) {
                                                                    fieldTriggers.current.set(row.key, node);
                                                                } else {
                                                                    fieldTriggers.current.delete(row.key);
                                                                }
                                                            }}
                                                            value={row.mapTo}
                                                            onCreateField={() => showCreateForm(row.key)}
                                                            onOpenChange={next => (next ? showPicker(row.key, '') : setOpenPicker(null))}
                                                            onSearchChange={search => setOpenPicker({columnKey: row.key, search})}
                                                            onSelect={(target) => {
                                                                setIncomplete(null);
                                                                claimTarget(row, target);
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                                {/* The create form is a row of the table rather than a layer over it, so it
                                                    scrolls with the rows, needs no anchoring or collision handling, and can't
                                                    be scrolled out from under itself. It follows the row it belongs to, which
                                                    keeps that column's name and sample value in view while deciding. */}
                                                {createFieldForColumn === row.key && (
                                                    <TableRow className="bg-transparent hover:bg-transparent">
                                                        <TableCell className="p-2" colSpan={columnCount}>
                                                            {/* Raised rather than floating: it reads as a surface above the table
                                                                while remaining a row of it, so nothing has to be anchored to the
                                                                row or repositioned when the table scrolls. */}
                                                            <div className="rounded-lg border bg-surface-elevated-2 p-3 shadow-lg">
                                                            <CreateFieldForm
                                                                canRetry={canRetry}
                                                                columnKey={row.key}
                                                                isSaving={isCreating}
                                                                nameError={nameError}
                                                                saveError={saveError}
                                                                onCancel={() => {
                                                                    clearCreateErrors();
                                                                    setCreateFieldForColumn(null);
                                                                    // Unmounting the form drops focus to the body, leaving a
                                                                    // keyboard publisher to tab back from the top of the table.
                                                                    fieldTriggers.current.get(row.key)?.focus();
                                                                }}
                                                                onEdit={clearCreateErrors}
                                                                onSubmit={(name, type) => void createFieldForRow(row.key, name, type)}
                                                            />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell className="text-muted-foreground" colSpan={columnCount}>
                                                    No data found in the uploaded CSV.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {visibleError && <p className="text-sm text-destructive" role="alert">{visibleError}</p>}

                        {membersCount > 0 && (
                            <p className="text-sm text-muted-foreground">
                                If an email address in your CSV matches an existing member, they will be updated with the mapped values.
                            </p>
                        )}

                        <div className="mt-5">
                            <label className="mb-1 block text-sm font-semibold">Label these members</label>
                            <LabelPicker
                                isCreating={labelPicker.isCreating}
                                labels={labelPicker.labels}
                                optionSource={labelPicker.optionSource}
                                resolvedSelectedLabels={labelPicker.resolvedSelectedLabels}
                                selectedSlugs={labelPicker.selectedSlugs}
                                onCreate={labelPicker.createLabel}
                                onDelete={labelPicker.deleteLabel}
                                onEdit={labelPicker.editLabel}
                                onToggle={labelPicker.toggleLabel}
                            />
                        </div>
                    </>
                )}
            </div>

            <DialogFooter className="mt-5">
                <Button
                    disabled={status === 'UPLOADING'}
                    variant="outline"
                    onClick={onStartOver}
                >
                    Start over
                </Button>
                <Button
                    disabled={status === 'UPLOADING' || membersCount === 0}
                    onClick={handleImport}
                >
                    {status === 'UPLOADING' ? (
                        <span className="flex items-center gap-2">
                            <LoadingIndicator color="light" size="sm" />
                            Uploading
                        </span>
                    ) : membersCount > 0 ? (
                        `Import ${formatNumber(membersCount)} ${membersCount === 1 ? 'member' : 'members'}`
                    ) : (
                        'Import members'
                    )}
                </Button>
            </DialogFooter>
        </>
    );
}
