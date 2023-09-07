import Button from '../../../admin-x-ds/global/Button';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import Heading from '../../../admin-x-ds/global/Heading';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import MultiSelect, {MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import React, {useEffect, useState} from 'react';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Label, useBrowseLabels} from '../../../api/labels';
import {MultiValue} from 'react-select';
import {generateCode} from '../../../utils/generateEmbedCode';
import {getSettingValues} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

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
    embedScript: string;
    handleLayoutSelect: React.Dispatch<React.SetStateAction<string>>;
    selectedLayout : string;
    handleCopyClick: () => void;
    isCopied: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({selectedLayout, 
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
                        value={`${embedScript}`}
                        onChange={() => {}}
                    />
                </Form>
            </div>
            <Button className='self-end' color={isCopied ? 'green' : 'black'} label={isCopied ? 'Copied!' : 'Copy code'} onClick={handleCopyClick} />
        </div>
    );
};

const EmbedSignupFormModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {config} = useGlobalData();
    const {localSettings, siteData} = useSettingGroup();
    const [accentColor] = getSettingValues<string>(localSettings, ['accent_color']);
    const [title] = getSettingValues<string>(localSettings, ['title']);

    const handleColorToggle = (e:string) => {
        setSelectedColor(e);
    };

    const [selectedColor, setSelectedColor] = useState<string>('#08090c');
    const [selectedLabels, setSelectedLabels] = useState<SelectedLabelTypes[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<string>('all-in-one');
    const {data: labels} = useBrowseLabels();
    const addSelectedLabel = (selected: MultiValue<MultiSelectOption>) => {
        if (selected?.length) {
            const chosenLabels = selected?.map(({value}) => ({label: value, value: value}));
            setSelectedLabels(chosenLabels);
        } else {
            setSelectedLabels([]);
        }
    };

    const [embedScript, setEmbedScript] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!siteData) {
            return;
        }
        const code = generateCode({
            preview: true,
            config: {
                blogUrl: siteData.url,
                signupForm: {
                    url: config?.signupForm?.url,
                    version: config?.signupForm?.version
                }
            },
            settings: {
                accentColor: accentColor || '#d74780',
                title: title || ''
            },
            labels: selectedLabels.map(({label}) => ({name: label})),
            backgroundColor: selectedColor || '#08090c',
            layout: selectedLayout
        });

        setEmbedScript(code);
    }, [siteData, accentColor, selectedLabels, config, title, selectedColor, selectedLayout]);

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(embedScript);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // reset after 2 seconds
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy text: ', err);
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
                <Preview/>
                <Sidebar
                    accentColor={accentColor}
                    embedScript={embedScript}
                    handleColorToggle={handleColorToggle}
                    handleCopyClick={handleCopyClick}
                    handleLabelClick={addSelectedLabel}
                    handleLayoutSelect={setSelectedLayout}
                    isCopied={isCopied}
                    labels={labels?.labels || []}
                    selectedColor={selectedColor}
                    selectedLabels={selectedLabels}
                    selectedLayout={selectedLayout}
                />
            </div>
        </Modal>
    );
});

export default EmbedSignupFormModal;
