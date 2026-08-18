import ColorPickerField from '@/settings/app/components/color-picker-field';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldGroup, FieldLabel, MultiSelectCombobox, Textarea, ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {type EmbedSignupLayout} from '@/settings/app/utils/generate-embed-code';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {type Label} from '@tryghost/admin-x-framework/api/labels';
import {Plus} from 'lucide-react';
import {useFilterableApi} from '@tryghost/admin-x-framework/hooks';

export type SelectedLabelTypes = {
    label: string;
    value: string;
};

type SidebarProps = {
    selectedColor?: string;
    accentColor?: string;
    handleColorToggle: (e: string) => void;
    handleLabelClick: (selected: string[]) => void;
    selectedLabels?: SelectedLabelTypes[];
    embedScript: string;
    handleLayoutSelect: React.Dispatch<React.SetStateAction<EmbedSignupLayout>>;
    selectedLayout: EmbedSignupLayout;
    handleCopyClick: () => void;
    isCopied: boolean;
    setCustomColor?: React.Dispatch<React.SetStateAction<{active: boolean}>>;
    customColor?: {active: boolean};
    handleClose: () => void;
};

const EmbedSignupSidebar: React.FC<SidebarProps> = ({selectedLayout,
    accentColor,
    handleColorToggle,
    selectedColor,
    selectedLabels,
    handleLabelClick,
    embedScript,
    handleLayoutSelect,
    handleCopyClick,
    isCopied,
    handleClose}) => {
    const {loadData} = useFilterableApi<Label>({path: '/labels/', filterKey: 'name', responseKey: 'labels'});
    const [labelOptions, setLabelOptions] = useState<SelectedLabelTypes[]>(selectedLabels || []);
    const [labelsOpen, setLabelsOpen] = useState(false);
    const [labelsLoading, setLabelsLoading] = useState(false);
    const requestSequence = useRef(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadDataRef = useRef(loadData);
    const selectedLabelsRef = useRef(selectedLabels);
    loadDataRef.current = loadData;
    selectedLabelsRef.current = selectedLabels;

    const loadOptions = useCallback(async (input: string, request: number) => {
        const currentSelectedLabels = selectedLabelsRef.current || [];
        try {
            const labels = await loadDataRef.current(input);
            const loadedOptions = labels.map(label => ({label: label.name, value: label.name}));
            if (request === requestSequence.current) {
                setLabelOptions([...currentSelectedLabels, ...loadedOptions.filter(option => !currentSelectedLabels.some(selected => selected.value === option.value))]);
            }
        } catch {
            if (request === requestSequence.current) {
                setLabelOptions(currentSelectedLabels);
            }
        } finally {
            if (request === requestSequence.current) {
                setLabelsLoading(false);
            }
        }
    }, []);
    const requestOptions = useCallback((input: string, deferred = false) => {
        requestSequence.current += 1;
        const request = requestSequence.current;
        setLabelsLoading(true);
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }
        if (deferred) {
            searchTimer.current = setTimeout(() => void loadOptions(input, request), 500);
        } else {
            void loadOptions(input, request);
        }
    }, [loadOptions]);

    useEffect(() => {
        setLabelOptions(current => [...(selectedLabels || []), ...current.filter(option => !selectedLabels?.some(selected => selected.value === option.value))]);
    }, [selectedLabels]);

    useEffect(() => {
        return () => {
            requestSequence.current += 1;
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }
        };
    }, []);

    return (
        <Stack className='h-auto border-border p-6 max-lg:border-t lg:h-[calc(100vh-16vmin)] lg:max-h-[645px] lg:overflow-y-scroll lg:border-l' gap='none'>
            <div>
                <Text as='h4' className='mb-8 md:text-xl' leading='heading' size='lg' weight='bold'>Embed signup form</Text>
                <FieldGroup className='gap-6'>
                    <div className='flex w-full items-center justify-between'>
                        <div>Layout</div>
                        <ToggleGroup type='single' value={selectedLayout} onValueChange={(value) => {
                            if (value === 'all-in-one' || value === 'minimal') {
                                handleLayoutSelect(value);
                            }
                        }}>
                            <ToggleGroupItem value='all-in-one'>Branded</ToggleGroupItem>
                            <ToggleGroupItem value='minimal'>Minimal</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    {
                        selectedLayout === 'all-in-one' &&
                        <ColorPickerField
                            debounceMs={200}
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
                                {
                                    hex: '#08090c',
                                    title: 'Dark',
                                    value: '#08090c'
                                },
                                {
                                    hex: '#ffffff',
                                    title: 'Light',
                                    value: '#ffffff'
                                },
                                {
                                    hex: (accentColor || '#d74780'),
                                    title: 'Accent',
                                    value: (accentColor || '#d74780')
                                }
                            ]}
                            title='Background color'
                            value={selectedColor}
                            onChange={(e) => {
                                if (e) {
                                    handleColorToggle(e);
                                }
                            }}
                        />
                    }

                    <Field>
                        <FieldLabel>Labels at signup</FieldLabel>
                        <Combobox open={labelsOpen} onOpenChange={(open) => {
                            setLabelsOpen(open);
                            if (open) {
                                requestOptions('');
                            }
                        }}>
                            <ComboboxTrigger aria-label='Labels at signup'>
                                <ComboboxValue placeholder={!selectedLabels?.length}>
                                    {selectedLabels?.length ? selectedLabels.map(label => label.label).join(', ') : 'Pick one or more labels (optional)'}
                                </ComboboxValue>
                            </ComboboxTrigger>
                            <ComboboxContent>
                                <MultiSelectCombobox
                                    footer={({searchInput, clearSearch}) => {
                                        const value = searchInput.trim();
                                        if (labelsLoading || !value || labelOptions.some(option => option.label.toLowerCase() === value.toLowerCase())) {
                                            return null;
                                        }
                                        return (
                                            <div className='border-t p-1'>
                                                <button className='flex h-8 w-full items-center justify-start gap-2 rounded-xs px-2 text-sm hover:bg-interactive-hover' type='button' onClick={() => {
                                                    const option = {label: value, value};
                                                    setLabelOptions(current => [...current, option]);
                                                    handleLabelClick([...(selectedLabels || []).map(label => label.value), value]);
                                                    clearSearch();
                                                }}>
                                                    <Plus className='size-4' />
                                                    Create “{value}”
                                                </button>
                                            </div>
                                        );
                                    }}
                                    isLoading={labelsLoading}
                                    options={labelOptions}
                                    values={(selectedLabels || []).map(label => label.value)}
                                    onChange={handleLabelClick}
                                    onSearchChange={input => requestOptions(input, true)}
                                />
                            </ComboboxContent>
                        </Combobox>
                        <FieldDescription>Will be applied to all members signing up via this form</FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='embed-signup-code'>Embed code</FieldLabel>
                        <Textarea className='resize-none font-mono' id='embed-signup-code' value={`${embedScript}`} readOnly />
                        <FieldDescription>Paste this code onto any website where you&apos;d like your signup to appear.</FieldDescription>
                        <Inline className='mt-2 lg:justify-start' gap='md' justify='end'>
                            <Button className='font-semibold lg:hidden' type='button' variant='outline' onClick={handleClose}>Close</Button>
                            <Button type='button' onClick={handleCopyClick}>{isCopied ? 'Copied!' : 'Copy code'}</Button>
                        </Inline>
                    </Field>
                </FieldGroup>
            </div>
        </Stack>
    );
};

export default EmbedSignupSidebar;
