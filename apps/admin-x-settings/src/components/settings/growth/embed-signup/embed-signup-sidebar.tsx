import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button, ButtonGroup, ColorPickerField, Form, Heading, StickyFooter, TextArea} from '@tryghost/admin-x-design-system';
import {ChevronDown, Plus} from 'lucide-react';
import {Field, FieldDescription, FieldLabel, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger, inputSurface} from '@tryghost/shade/components';
import {type Label} from '@tryghost/admin-x-framework/api/labels';
import {debounce} from '../../../../utils/debounce';
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
    handleLayoutSelect: React.Dispatch<React.SetStateAction<string>>;
    selectedLayout : string;
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
    const loadDataRef = useRef(loadData);
    const selectedLabelsRef = useRef(selectedLabels);
    loadDataRef.current = loadData;
    selectedLabelsRef.current = selectedLabels;

    const loadOptions = useCallback(async (input: string, request: number) => {
        const labels = await loadDataRef.current(input);
        const currentSelectedLabels = selectedLabelsRef.current || [];
        const loadedOptions = labels.map(label => ({label: label.name, value: label.name}));
        if (request === requestSequence.current) {
            setLabelOptions([...currentSelectedLabels, ...loadedOptions.filter(option => !currentSelectedLabels.some(selected => selected.value === option.value))]);
            setLabelsLoading(false);
        }
    }, []);
    const debouncedLoadOptions = useMemo(() => debounce((input: string, request: number) => void loadOptions(input, request), 500), [loadOptions]);
    const requestOptions = useCallback((input: string, deferred = false) => {
        requestSequence.current += 1;
        const request = requestSequence.current;
        setLabelsLoading(true);
        if (deferred) {
            debouncedLoadOptions(input, request);
        } else {
            void loadOptions(input, request);
        }
    }, [debouncedLoadOptions, loadOptions]);

    useEffect(() => {
        setLabelOptions(current => [...(selectedLabels || []), ...current.filter(option => !selectedLabels?.some(selected => selected.value === option.value))]);
    }, [selectedLabels]);

    return (
        <div className='flex h-[calc(100vh-16vmin)] max-h-[645px] flex-col justify-between overflow-y-scroll border-grey-200 p-6 pb-0 max-lg:border-t lg:border-l dark:border-grey-900'>
            <div>
                <Heading className='mb-8' level={4}>Embed signup form</Heading>
                <Form gap='sm'>
                    <div className='flex w-full items-center justify-between'>
                        <div>Layout</div>
                        <ButtonGroup 
                            activeKey={selectedLayout} 
                            buttons={[
                                {
                                    key: 'all-in-one',
                                    label: 'Branded',
                                    size: 'md',
                                    className: 'w-auto px-3!',
                                    onClick: () => handleLayoutSelect('all-in-one')
                                },
                                {
                                    key: 'minimal',
                                    label: 'Minimal',
                                    size: 'md',
                                    className: 'w-auto px-3!',
                                    onClick: () => handleLayoutSelect('minimal')
                                }
                            ]} 
                            clearBg={false}
                        />
                    </div>
                    {
                        selectedLayout === 'all-in-one' &&
                        <ColorPickerField
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
                        <Popover open={labelsOpen} onOpenChange={(open) => {
                            setLabelsOpen(open);
                            if (open) {
                                requestOptions('');
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <button aria-label='Labels at signup' className={`${inputSurface('self')} flex h-(--control-height) w-full items-center justify-between px-3 text-control`} role='combobox' type='button'>
                                    <span className={selectedLabels?.length ? 'truncate' : 'truncate text-muted-foreground'}>
                                        {selectedLabels?.length ? selectedLabels.map(label => label.label).join(', ') : 'Pick one or more labels (optional)'}
                                    </span>
                                    <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align='start' className='z-[9999] w-(--radix-popover-trigger-width) p-0'>
                                <MultiSelectCombobox
                                    footer={({searchInput, clearSearch}) => {
                                        const value = searchInput.trim();
                                        if (!value || labelOptions.some(option => option.label.toLowerCase() === value.toLowerCase())) {
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
                            </PopoverContent>
                        </Popover>
                        <FieldDescription>Will be applied to all members signing up via this form</FieldDescription>
                    </Field>
                    <TextArea
                        className='text-grey-800'
                        fontStyle='mono'
                        hint={`Paste this code onto any website where you'd like your signup to appear.`}
                        title='Embed code'
                        value={`${embedScript}`}
                        onChange={() => {}}
                    />
                </Form>
            </div>
            <StickyFooter height={74}>
                <div className='flex w-full justify-end gap-3'>
                    <Button className='lg:hidden' color='outline' label='Close' onClick={handleClose} />
                    <Button color={isCopied ? 'green' : 'black'} label={isCopied ? 'Copied!' : 'Copy code'} onClick={handleCopyClick} />
                </div>
            </StickyFooter>
        </div>
    );
};

export default EmbedSignupSidebar;
