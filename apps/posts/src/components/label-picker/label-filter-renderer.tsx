import React, {useCallback, useRef, useState} from 'react';
import {
    Button,
    CommandItem,
    type FooterRenderProps,
    MultiSelectCombobox,
    Popover,
    PopoverContent,
    PopoverTrigger,
    type RenderItemProps
} from '@tryghost/shade/components';
import {EditRow} from './edit-row';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {LucideIcon} from '@tryghost/shade/utils';
import {useLabelPicker} from '@src/hooks/use-label-picker';
import type {CustomRendererProps, ValueSource} from '@tryghost/shade/patterns';

const LabelFilterRenderer: React.FC<CustomRendererProps<string>> = ({field, values, onChange}) => {
    const picker = useLabelPicker({
        selectedSlugs: values,
        onSelectionChange: onChange,
        valueSource: field.valueSource as ValueSource<string> | undefined
    });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const [alignOffset, setAlignOffset] = useState(0);

    const updateAlignOffset = useCallback(() => {
        const trigger = triggerRef.current;
        const parent = trigger?.parentElement;
        if (trigger && parent) {
            const triggerRect = trigger.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            setAlignOffset(Math.round(parentRect.left - triggerRect.left));
        }
    }, []);

    let triggerText = 'Select...';
    if (picker.resolvedSelectedLabels.length === 1) {
        triggerText = picker.resolvedSelectedLabels[0].name;
    } else if (picker.resolvedSelectedLabels.length > 1) {
        triggerText = `${picker.resolvedSelectedLabels.length} labels`;
    }

    // Convert labels to FilterOption format for MultiSelectCombobox
    const options = picker.labels.map(label => ({
        value: label.slug,
        label: label.name,
        metadata: {id: label.id}
    }));

    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

    const renderItem = useCallback(({option, isSelected, onSelect}: RenderItemProps<string>) => {
        const labelId = String(option.metadata?.id ?? '');

        if (editingLabelId === labelId) {
            const label: Label = {
                id: labelId,
                name: option.label,
                slug: String(option.value),
                created_at: '',
                updated_at: ''
            };
            return (
                <EditRow
                    key={labelId}
                    isDuplicateName={picker.isDuplicateName}
                    label={label}
                    onCancel={() => setEditingLabelId(null)}
                    onDelete={async (id) => {
                        await picker.deleteLabel(id);
                        setEditingLabelId(null);
                    }}
                    onSave={async (id, name) => {
                        await picker.editLabel(id, name);
                        setEditingLabelId(null);
                    }}
                />
            );
        }

        return (
            <CommandItem
                key={String(option.value)}
                className="group"
                value={option.label}
                onSelect={onSelect}
            >
                <span className="flex-1 truncate">{option.label}</span>
                <button
                    aria-label={`Edit label ${option.label}`}
                    className="relative ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingLabelId(labelId);
                    }}
                >
                    {isSelected && (
                        <LucideIcon.Check className="absolute size-3 text-primary transition-opacity duration-150 group-hover:opacity-0" />
                    )}
                    <LucideIcon.Pencil className="absolute size-3 translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                </button>
            </CommandItem>
        );
    }, [editingLabelId, picker]);

    const renderFooter = useCallback(({searchInput, clearSearch}: FooterRenderProps) => {
        const showCreate = searchInput.trim() && picker.canCreateFromSearch(searchInput);
        if (!showCreate) {
            return null;
        }
        return (
            <div className="border-t p-1">
                <Button
                    className="h-8 w-full justify-start gap-2 px-2 text-sm font-normal"
                    disabled={picker.isCreating}
                    variant="ghost"
                    onClick={async () => {
                        const newLabel = await picker.createLabel(searchInput.trim());
                        if (newLabel) {
                            picker.toggleLabel(newLabel.slug);
                        }
                        clearSearch();
                    }}
                >
                    <LucideIcon.Plus className="size-4" />
                    {picker.isCreating ? 'Creating...' : `Create "${searchInput.trim()}"`}
                </Button>
            </div>
        );
    }, [picker]);

    return (
        <Popover
            onOpenChange={(open) => {
                if (open) {
                    updateAlignOffset();
                }
            }}
        >
            <PopoverTrigger asChild>
                <button
                    ref={triggerRef}
                    className="flex size-full items-center truncate text-left text-sm"
                    type="button"
                >
                    {triggerText}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" alignOffset={alignOffset} className="w-64 p-0">
                {picker.isLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        Loading labels...
                    </div>
                ) : (
                    <MultiSelectCombobox
                        footer={renderFooter}
                        i18n={{
                            searchPlaceholder: 'Search labels...',
                            noResultsFound: 'No labels found'
                        }}
                        options={options}
                        renderItem={renderItem}
                        shouldFilter={false}
                        values={values}
                        onChange={onChange}
                        onSearchChange={picker.onSearchChange}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
};

export default LabelFilterRenderer;
