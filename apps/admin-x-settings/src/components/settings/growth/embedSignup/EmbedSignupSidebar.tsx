import React from 'react';
import {Button, ButtonGroup, ColorPickerField, Form, Heading, LoadMultiSelectOptions, MultiSelect, MultiSelectOption, StickyFooter, TextArea, debounce} from '@tryghost/admin-x-design-system';
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
    isCopied}) => {
    const {loadData} = useFilterableApi<Label>({path: '/labels/', filterKey: 'name', responseKey: 'labels'});

    const loadOptions: LoadMultiSelectOptions = async (input, callback) => {
        const labels = await loadData(input);
        callback(labels.map(label => ({label: label.name, value: label.name})));
    };

    return (
        <div className='flex h-[calc(100vh-16vmin)] max-h-[645px] flex-col justify-between overflow-y-scroll border-l border-grey-200 p-6 pb-0 dark:border-grey-900'>
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
                                    className: 'w-auto !px-3',
                                    onClick: () => handleLayoutSelect('all-in-one')
                                },
                                {
                                    key: 'minimal',
                                    label: 'Minimal',
                                    size: 'md',
                                    className: 'w-auto !px-3',
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
