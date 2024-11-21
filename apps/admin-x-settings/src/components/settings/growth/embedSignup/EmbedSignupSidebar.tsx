import React from 'react';
import {Button, ColorIndicator, ColorPicker, Form, Heading, LoadMultiSelectOptions, MultiSelect, MultiSelectOption, Radio, StickyFooter, TextArea, debounce} from '@tryghost/admin-x-design-system';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {MultiValue} from 'react-select';
import {useFilterableApi} from '@tryghost/admin-x-framework/hooks';

export type SelectedLabelTypes = {
    label: string;
    value: string;
};

type SidebarProps = {
    selectedColor?: string;
    accentColor?: string;
    handleColorToggle: (e: string) => void;
    handleLabelClick: (selected: MultiValue<MultiSelectOption>) => void;
    selectedLabels?: SelectedLabelTypes[];
    embedScript: string;
    handleLayoutSelect: React.Dispatch<React.SetStateAction<string>>;
    selectedLayout : string;
    handleCopyClick: () => void;
    isCopied: boolean;
    setCustomColor?: React.Dispatch<React.SetStateAction<{active: boolean}>>;
    customColor?: {active: boolean};
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
    customColor,
    setCustomColor,
    isCopied}) => {
    const {loadData} = useFilterableApi<Label>({path: '/labels/', filterKey: 'name', responseKey: 'labels'});

    const loadOptions: LoadMultiSelectOptions = async (input, callback) => {
        const labels = await loadData(input);
        callback(labels.map(label => ({label: label.name, value: label.name})));
    };

    return (
        <div className='flex h-[calc(100vh-16vmin)] max-h-[645px] flex-col justify-between overflow-y-scroll border-l border-grey-200 p-6 pb-0 dark:border-grey-900'>
            <div>
                <Heading className='mb-4' level={4}>Embed signup form</Heading>
                <Form>
                    <Radio
                        id='embed-layout'
                        options={[
                            {
                                label: 'Branded',
                                value: 'all-in-one'
                            },
                            {
                                label: 'Minimal',
                                value: 'minimal'
                            }
                        ]}
                        selectedOption={selectedLayout}
                        title='Layout'
                        onSelect={(value) => {
                            handleLayoutSelect(value);
                        }}
                    />
                    {
                        selectedLayout === 'all-in-one' &&
                        <ColorIndicator
                            isExpanded={false}
                            swatches={[
                                {
                                    hex: '#08090c',
                                    title: 'Dark'
                                },
                                {
                                    hex: '#ffffff',
                                    title: 'Light'
                                },
                                {
                                    hex: (accentColor || '#d74780'),
                                    title: 'Accent'
                                }
                            ]}
                            swatchSize='lg'
                            title='Background color'
                            value={selectedColor}
                            onSwatchChange={(e) => {
                                if (e && setCustomColor) {
                                    handleColorToggle(e);
                                    setCustomColor({active: false});
                                }
                            }}
                            onTogglePicker={() => {
                                if (setCustomColor) {
                                    setCustomColor({active: true});
                                }
                            }}
                        />
                    }

                    {
                        selectedLayout === 'all-in-one' && customColor?.active &&
                        <ColorPicker
                            containerClassName='!-mt-4'
                            eyedropper={false}
                            hexValue={selectedColor || '#d74780'}
                            onChange={(e) => {
                                if (setCustomColor && e) {
                                    setCustomColor({active: true});
                                    handleColorToggle(e);
                                }
                            }}
                        />
                    }

                    <MultiSelect
                        hint='Will be applied to all members signing up via this form'
                        loadOptions={debounce(loadOptions, 500)}
                        placeholder='Pick one or more labels (optional)'
                        title='Labels at signup'
                        values={selectedLabels || []}
                        async
                        canCreate
                        defaultOptions
                        onChange={handleLabelClick}
                    />
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
                <div className='flex w-full justify-end'>
                    <Button color={isCopied ? 'green' : 'black'} label={isCopied ? 'Copied!' : 'Copy code'} onClick={handleCopyClick} />
                </div>
            </StickyFooter>
        </div>
    );
};

export default EmbedSignupSidebar;
