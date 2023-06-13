import AdvancedThemeSettings from './AdvancedThemeSettings';
import Button from '../../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import Modal from '../../../../admin-x-ds/global/Modal';
import NewThemePreview from './NewThemePreview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './OfficialThemes';
import {useState} from 'react';

const ChangeThemeModal = NiceModal.create(() => {
    const [currentTab, setCurrentTab] = useState<'official-themes' | 'advanced'>('official-themes');
    const [selectedTheme, setSelectedTheme] = useState('');

    const modal = useModal();

    const onSelectTheme = (theme: string) => {
        setSelectedTheme(theme);
    };

    let content;
    switch (currentTab) {
    case 'official-themes':
        if (selectedTheme) {
            content = <NewThemePreview selectedTheme={selectedTheme} />;
        } else {
            content = <OfficialThemes onSelectTheme={onSelectTheme} />;
        }
        break;
    case 'advanced':
        content = <AdvancedThemeSettings />;
        break;
    }

    let toolBar;
    if (selectedTheme) {
        toolBar =
            <div className='sticky top-0 flex justify-between gap-3 bg-white p-5 px-7'>
                <div className='flex w-[33%] items-center gap-2'>
                    <button
                        className={`text-sm`}
                        type="button"
                        onClick={() => {
                            setCurrentTab('official-themes');
                            setSelectedTheme('');
                        }}>
                        Official themes
                    </button>
                    &rarr;
                    <span className='text-sm font-bold'>{selectedTheme}</span>
                </div>
                <div className='flex w-[33%] justify-end gap-8'>
                    <ButtonGroup
                        buttons={[
                            {icon: 'laptop', link: true, size: 'sm'},
                            {icon: 'mobile', iconColorClass: 'text-grey-500', link: true, size: 'sm'}
                        ]}
                    />
                    <Button color='green' label={`Install ${selectedTheme}`} />
                </div>
            </div>;
    } else {
        toolBar =
            <div className='sticky top-0 flex justify-between gap-3 bg-white p-5 px-7'>
                <div className='flex gap-8'>
                    <button
                        className={`text-sm ${currentTab === 'official-themes' && 'font-bold'}`}
                        type="button"
                        onClick={() => {
                            setCurrentTab('official-themes');
                            setSelectedTheme('');
                        }}>
                        Official themes
                    </button>
                    <button
                        className={`text-sm ${currentTab === 'advanced' && 'font-bold'}`}
                        type="button"
                        onClick={() => {
                            setCurrentTab('advanced');
                        }}>
                        Installed
                    </button>
                </div>
                <ButtonGroup
                    buttons={[
                        {label: 'Upload theme', onClick: () => {
                            alert('Upload');
                        }},
                        {label: 'OK', color: 'black', className: 'min-w-[75px]', onClick: () => {
                            modal.remove();
                        }}
                    ]}
                />
            </div>;
    }

    return (
        <Modal
            cancelLabel=''
            footer={false}
            noPadding={true}
            size='full'
            title=''
        >
            <div className='flex h-full justify-between'>
                <div className='grow'>
                    {toolBar}
                    {content}
                </div>
            </div>
        </Modal>
    );
});

export default ChangeThemeModal;