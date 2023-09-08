import Button from '../../../../admin-x-ds/global/Button';
import ColorIndicator from '../../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import MultiSelect, {MultiSelectOption} from '../../../../admin-x-ds/global/form/MultiSelect';
import Radio from '../../../../admin-x-ds/global/form/Radio';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import {Label} from '../../../../api/labels';
import {MultiValue} from 'react-select';

export type SelectedLabelTypes = {
    label: string;
    value: string;
};

type SidebarProps = {
    selectedColor?: string;
    accentColor?: string;
    handleColorToggle: (e: string) => void;
    labels?: Label[];
    handleLabelClick: (selected: MultiValue<MultiSelectOption>) => void;
    selectedLabels?: SelectedLabelTypes[];
    embedScript: string;
    handleLayoutSelect: React.Dispatch<React.SetStateAction<string>>;
    selectedLayout : string;
    handleCopyClick: () => void;
    isCopied: boolean;
};

const EmbedSignupSidebar: React.FC<SidebarProps> = ({selectedLayout, 
    accentColor, 
    handleColorToggle, 
    selectedColor, 
    labels, 
    selectedLabels, 
    handleLabelClick, 
    embedScript, 
    handleLayoutSelect,
    handleCopyClick,
    isCopied}) => {
    const labelOptions = labels ? labels.map((l) => {
        return {
            label: l?.name,
            value: l?.name
        };
    }).filter(Boolean) : [];
    return (
        <div className='flex h-full flex-col justify-between'>
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
                                if (e) {
                                    handleColorToggle(e);
                                }
                            }}
                            onTogglePicker={() => {}}
                        />
                    }
                    <MultiSelect
                        hint='Will be applied to all members signing up via this form'
                        options={labelOptions}
                        placeholder='Pick one or more labels (optional)'
                        title='Labels at signup'
                        values={selectedLabels || []}
                        onChange={handleLabelClick}
                    />
                    <TextArea
                        className='text-grey-800'
                        clearBg={false}
                        fontStyle='mono'
                        hint={`Paste this code onto any website where you'd like your signup to appear.`}
                        title='Embed code'
                        value={`${embedScript}`}
                        onChange={() => {}}
                    />
                </Form>
            </div>
            <Button className='self-end' color={isCopied ? 'green' : 'black'} label={isCopied ? 'Copied!' : 'Copy code'} onClick={handleCopyClick} />
        </div>
    );
};

export default EmbedSignupSidebar;
