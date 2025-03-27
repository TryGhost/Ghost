import EmbedSignupPreview from './EmbedSignupPreview';
import EmbedSignupSidebar, {SelectedLabelTypes} from './EmbedSignupSidebar';
import NiceModal from '@ebay/nice-modal-react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Modal, MultiSelectOption} from '@tryghost/admin-x-design-system';
import {MultiValue} from 'react-select';
import {generateCode} from '../../../../utils/generateEmbedCode';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const EmbedSignupFormModal = NiceModal.create(() => {
    let i18nEnabled = false;

    const [selectedColor, setSelectedColor] = useState<string>('#08090c');
    const [selectedLabels, setSelectedLabels] = useState<SelectedLabelTypes[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<string>('all-in-one');
    const [previewScript, setPreviewScript] = useState<string>('');
    const [generatedScript, setGeneratedScript] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    const {updateRoute} = useRouting();
    const {config} = useGlobalData();
    const {localSettings, siteData} = useSettingGroup();
    const [accentColor, title, description, locale, labs, icon] = getSettingValues<string>(localSettings, ['accent_color', 'title', 'description', 'locale', 'labs', 'icon']);
    const [customColor, setCustomColor] = useState<{active: boolean}>({active: false});

    if (labs) {
        i18nEnabled = JSON.parse(labs).i18n;
    }

    useEffect(() => {
        if (!siteData) {
            return;
        }

        const defaultConfig = {
            config: {
                blogUrl: siteData.url,
                signupForm: {
                    url: config?.signupForm?.url,
                    version: config?.signupForm?.version
                }
            },
            settings: {
                accentColor: accentColor || '#d74780',
                title: title || '',
                locale: locale || 'en',
                icon: icon || '',
                description: description || ''
            },
            labels: selectedLabels.map(({label}) => ({name: label})),
            backgroundColor: selectedColor || '#08090c',
            layout: selectedLayout,
            i18nEnabled
        };

        const previewCode = generateCode({
            preview: true,
            ...defaultConfig
        });
        setPreviewScript(previewCode);

        const generatedCode = generateCode({
            preview: false,
            ...defaultConfig
        });
        setGeneratedScript(generatedCode);
    }, [siteData, accentColor, selectedLabels, config, title, selectedColor, selectedLayout, locale, i18nEnabled, icon, description]);

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(generatedScript);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // reset after 2 seconds
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy text: ', err);
        }
    };

    const handleColorToggle = (e:string) => {
        setSelectedColor(e);
    };

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
            height={645}
            padding={false}
            testId='embed-signup-form'
            title=''
            topRightContent='close'
            width={1120}
        >
            <div className='grid grid-cols-[5.2fr_2.8fr]'>
                <EmbedSignupPreview
                    html={previewScript}
                    style={selectedLayout}
                />
                <EmbedSignupSidebar
                    accentColor={accentColor}
                    customColor={customColor}
                    embedScript={generatedScript}
                    handleColorToggle={handleColorToggle}
                    handleCopyClick={handleCopyClick}
                    handleLabelClick={addSelectedLabel}
                    handleLayoutSelect={setSelectedLayout}
                    isCopied={isCopied}
                    selectedColor={selectedColor}
                    selectedLabels={selectedLabels}
                    selectedLayout={selectedLayout}
                    setCustomColor={setCustomColor}
                />
            </div>
        </Modal>
    );
});

export default EmbedSignupFormModal;
