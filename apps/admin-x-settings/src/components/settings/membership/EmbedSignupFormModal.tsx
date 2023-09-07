import Button from '../../../admin-x-ds/global/Button';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import Heading from '../../../admin-x-ds/global/Heading';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import MultiSelect, {MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import React, {useState} from 'react';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Label, useBrowseLabels} from '../../../api/labels';
import {MultiValue} from 'react-select';
import {getSettingValues} from '../../../api/settings';

const Preview: React.FC = () => {
    return (
        <div className='rounded-md bg-grey-100 text-grey-600'>
            preview
        </div>
    );
};

type SelectedLabelTypes = {
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
};

const Sidebar: React.FC<SidebarProps> = ({accentColor, handleColorToggle, selectedColor, labels, selectedLabels, handleLabelClick}) => {
    // convert label array to options array
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
                                value: 'branded'
                            },
                            {
                                label: 'Minimal',
                                value: 'minimal'
                            }
                        ]}
                        selectedOption='branded'
                        title='Layout'
                        onSelect={() => {}}
                    />
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
                        value={`<div style="height: 40vmin;min-height: 360px"><script src="https://cdn.jsdelivr.net/ghost/signup-form@~0.1/umd/signup-form.min.js" data-background-color="#F1F3F4" data-text-color="#000000" data-button-color="#d74780" data-button-text-color="#FFFFFF" data-title="Zimo&#039;s Secret Volcano Lair" data-description="You Know, I Have One Simple Request, And That Is To Have Sharks With Frickin&#039; Laser Beams Attached To Their Heads!" data-site="http://localhost:2368" async></script></div>`}
                    />
                </Form>
            </div>
            <Button className='self-end' color='black' label='Copy code' />
        </div>
    );
};

const EmbedSignupFormModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    // const {config} = useGlobalData();
    const {localSettings} = useSettingGroup();
    const [accentColor] = getSettingValues<string>(localSettings, ['accent_color']);

    const handleColorToggle = (e:string) => {
        setSelectedColor(e);
    };

    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedLabels, setSelectedLabels] = useState<SelectedLabelTypes[]>([]);
    const {data: labels} = useBrowseLabels();
    // const siteUrl = config.blogUrl;
    // const scriptUrl = config.signupForm.url.replace('{version}', config.signupForm.version);

    // const [scriptCode, setScriptCode] = useState<string>(`<div style="${escapeHtml(style)}"><script src="${encodeURI(scriptUrl)}"${dataOptionsString} async></script></div>`);
    const addSelectedLabel = (selected: MultiValue<MultiSelectOption>) => {
        if (selected?.length) {
            const chosenLabels = selected?.map(({value}) => ({label: value, value: value}));
            setSelectedLabels(chosenLabels);
        } else {
            setSelectedLabels([]);
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('embed-signup-form');
            }}
            cancelLabel=''
            footer={false}
            size={1120}
            testId='embed-signup-form'
            title=''
            topRightContent='close'
        >
            <div className='grid grid-cols-[5.5fr_2.5fr] gap-6 pb-8'>
                <Preview />
                <Sidebar
                    accentColor={accentColor}
                    handleColorToggle={handleColorToggle}
                    handleLabelClick={addSelectedLabel}
                    labels={labels?.labels || []}
                    selectedColor={selectedColor}
                    selectedLabels={selectedLabels}
                />
            </div>
        </Modal>
    );
});

export default EmbedSignupFormModal;
