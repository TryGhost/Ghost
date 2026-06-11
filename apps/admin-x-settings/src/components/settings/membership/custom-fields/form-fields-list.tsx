import * as customFields from '../../../../../../../poc/custom-fields/repo';
import CustomFieldModal from './custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import {Button, DragIndicator, Select, type SelectOption, type SortableItemContainerProps, SortableList, Toggle} from '@tryghost/admin-x-design-system';

// POC: an ordered "Form fields" list for a collection surface. Used by the
// signup form (with built-in Email/Name rows) and the Landing form (custom
// fields only). Placements live in poc/custom-fields/repo; the signup Name
// toggle maps to the real `portal_name` setting.

const CREATE_NEW = '__create_new_field__';
const BUILTIN_LABELS: Record<string, string> = {email: 'Email', name: 'Name'};

const typeLabel = (type: customFields.FieldType) => customFields.TYPES.find(t => t.value === type)?.label || type;

const Badge: React.FC<{children: React.ReactNode}> = ({children}) => (
    <span className='inline-flex items-center rounded-sm bg-grey-200 px-1.5 py-0.5 text-xs font-medium text-grey-700 dark:bg-grey-900 dark:text-grey-500'>
        {children}
    </span>
);

interface FormEntry extends customFields.FormPlacement {
    id: string;
}

// Simple row: drag handle + content, subtle separator, no border on the last row.
const FieldRowContainer: React.FC<Partial<SortableItemContainerProps>> = ({setRef, isDragging, style, children, ...props}) => (
    <div
        ref={setRef}
        className={`flex w-full items-center gap-3 border-b border-grey-100 py-2.5 last:border-b-0 dark:border-grey-900 ${isDragging ? 'opacity-75' : ''}`}
        style={style}
    >
        {(props.dragHandleAttributes || isDragging) && <DragIndicator isDragging={isDragging || false} {...props} />}
        {children}
    </div>
);

// The list reads/writes either a Portal surface (`surface`, e.g. signup) or a
// specific landing form's fields (`formId`, Story 5.5). Exactly one is used.
const FormFieldsList: React.FC<{
    surface?: string
    formId?: string
    title?: string
    portalName?: boolean
    updateSetting?: (key: string, value: boolean) => void
}> = ({surface = '', formId, title = 'Form fields', portalName = false, updateSetting}) => {
    const [items, setItems] = useState<FormEntry[]>([]);
    const [definitions, setDefinitions] = useState<customFields.FieldDefinition[]>([]);
    const [addKey, setAddKey] = useState(0);

    const refresh = useCallback(async () => {
        const [form, defs] = await Promise.all([
            formId ? customFields.getLandingFormFields(formId) : customFields.getForm(surface),
            customFields.listFields()
        ]);
        setItems(form.map(p => ({...p, id: p.fieldId})));
        setDefinitions(defs);
    }, [surface, formId]);

    useEffect(() => {
        refresh();
        return customFields.subscribe(refresh);
    }, [refresh]);

    const persist = (next: FormEntry[]) => {
        const ordered = next.map((entry, index) => ({...entry, order: index}));
        setItems(ordered);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const placements = ordered.map(({id, ...placement}) => placement);
        if (formId) {
            customFields.setLandingFormFields(formId, placements);
        } else {
            customFields.setForm(surface, placements);
        }
    };

    const onMove = (id: string, overId: string) => {
        const from = items.findIndex(i => i.id === id);
        const to = items.findIndex(i => i.id === overId);
        if (from === -1 || to === -1) {
            return;
        }
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        persist(next);
    };

    const removeField = (id: string) => persist(items.filter(i => i.id !== id));
    const addField = (fieldId?: string) => {
        if (!fieldId || items.some(i => i.fieldId === fieldId)) {
            return;
        }
        // POC: a field placed on a form is required.
        persist([...items, {id: fieldId, fieldId, required: true, placeholder: null, order: items.length}]);
        setAddKey(k => k + 1);
    };

    const openCreateModal = () => {
        NiceModal.show(CustomFieldModal, {refresh, onCreated: (field: customFields.FieldDefinition) => addField(field.id)});
    };

    const placedIds = new Set(items.map(i => i.fieldId));
    const addOptions: SelectOption[] = [
        ...definitions
            .filter(d => !d.archived && !placedIds.has(d.id))
            .map(d => ({value: d.id, label: d.label})),
        {value: CREATE_NEW, label: 'New custom field', className: 'border-t border-grey-200 font-semibold text-green dark:border-grey-800'}
    ];

    const onAddSelect = (option: SelectOption | null) => {
        setAddKey(k => k + 1); // reset the picker back to its prompt
        if (!option) {
            return;
        }
        if (option.value === CREATE_NEW) {
            openCreateModal();
        } else {
            addField(option.value);
        }
    };

    const renderControl = (item: FormEntry) => {
        if (item.fieldId === 'name' && updateSetting) {
            return (
                <Toggle
                    checked={portalName}
                    direction='rtl'
                    onChange={e => updateSetting('portal_name', e.target.checked)}
                />
            );
        }
        if (item.fieldId !== 'email' && item.fieldId !== 'name') {
            return (
                <Button
                    icon='trash'
                    iconColorClass='text-grey-700'
                    label='Remove'
                    size='sm'
                    hideLabel
                    link
                    onClick={() => removeField(item.id)}
                />
            );
        }
        return null;
    };

    return (
        <div className='flex flex-col gap-3'>
            <span className='text-sm font-semibold text-grey-900 dark:text-grey-300'>{title}</span>
            {items.length > 0 && (
                <SortableList
                    container={props => <FieldRowContainer {...props} />}
                    items={items}
                    renderItem={(item) => {
                        const isBuiltin = item.fieldId === 'email' || item.fieldId === 'name';
                        const def = definitions.find(d => d.id === item.fieldId);
                        const label = isBuiltin ? BUILTIN_LABELS[item.fieldId] : (def?.label || item.fieldId);
                        // Built-in fields are system fields: no type badge.
                        const badge = isBuiltin ? '' : (def ? typeLabel(def.type) : '');
                        return (
                            <>
                                <span className='inline-flex min-w-0 flex-1 items-center gap-2'>
                                    <span className='font-medium'>{label}</span>
                                    {badge && <Badge>{badge}</Badge>}
                                </span>
                                {renderControl(item)}
                            </>
                        );
                    }}
                    onMove={onMove}
                />
            )}
            <Select
                key={addKey}
                formatOptionLabel={(option, meta) => {
                    // Show the field's type badge in the dropdown, matching the placed rows.
                    const def = definitions.find(d => d.id === option.value);
                    if (!def) {
                        return option.label; // "New custom field" and any non-field option
                    }
                    return (
                        <span className='flex items-center gap-2'>
                            <span>{option.label}</span>
                            {meta.context === 'menu' && <Badge>{typeLabel(def.type)}</Badge>}
                        </span>
                    );
                }}
                options={addOptions}
                prompt='Add a custom field'
                title=''
                hideTitle
                onSelect={onAddSelect}
            />
        </div>
    );
};

export default FormFieldsList;
