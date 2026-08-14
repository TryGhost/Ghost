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
import {type Label} from '@tryghost/admin-x-framework/api/labels';
import {LucideIcon} from '@tryghost/shade/utils';
import {canCreateLabel} from './can-create-label';
import {useLabelPicker} from '@/members/hooks/use-label-picker';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

const LabelFilterRenderer: React.FC<CustomRendererProps<string>> = ({field, values, onChange}) => {
    const picker = useLabelPicker({
        selectedSlugs: values,
        onSelectionChange: onChange,
        valueSource: field.valueSource
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

    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

    const renderItem = useCallback(({option, isSelected, onSelect}: RenderItemProps<string>) => {
        const metadataId = option.metadata?.id;
        const labelId = typeof metadataId === 'string' || typeof metadataId === 'number' ? String(metadataId) : '';

        if (editingLabelId === labelId && !isSelected) {
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
                {isSelected ? (
                    <LucideIcon.Check className="size-3 shrink-0 text-primary" />
                ) : (
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
                        <LucideIcon.Pencil className="absolute size-3 translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    </button>
                )}
            </CommandItem>
        );
    }, [editingLabelId, picker]);

    const renderFooter = useCallback(({searchInput, clearSearch}: FooterRenderProps) => {
        const showCreate = canCreateLabel(picker.labels, searchInput);
        if (!showCreate) {
            return null;
        }
        return (
            <div className="border-t p-1">
                <Button
                    className="h-8 w-full justify-start gap-2 px-2 text-sm font-normal"
                    disabled={picker.isCreating}
                    variant="ghost"
                    onClick={() => void (async () => {
                        try {
                            const newLabel = await picker.createLabel(searchInput.trim());
                            if (newLabel) {
                                clearSearch();
                            }
                        } catch {
                            // Already reported via toast - keep the typed name for retry
                        }
                    })()}
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
                } else {
                    // MultiSelectCombobox remounts with an empty input, so clear the picker query
                    // too or the hidden search state keeps filtering labels after reopen.
                    picker.optionSource.onSearchChange?.('');
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
                {picker.optionSource.isInitialLoad ? (
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
                        optionSource={picker.optionSource}
                        renderItem={renderItem}
                        values={values}
                        onChange={onChange}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
};

export default LabelFilterRenderer;
