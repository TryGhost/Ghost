import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import Button from '../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import FileUpload from '../../../admin-x-ds/global/FileUpload';
import Modal from '../../../admin-x-ds/global/Modal';
import NewThemePreview from './theme/ThemePreview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import TabView from '../../../admin-x-ds/global/TabView';
import {useState} from 'react';

const ChangeThemeModal = NiceModal.create(() => {
    const [currentTab, setCurrentTab] = useState('official');
    const [selectedTheme, setSelectedTheme] = useState('');

    const modal = useModal();

    const onSelectTheme = (theme: string) => {
        setSelectedTheme(theme);
    };

    let content;
    switch (currentTab) {
    case 'official':
        if (selectedTheme) {
            content = <NewThemePreview selectedTheme={selectedTheme} />;
        } else {
            content = <OfficialThemes onSelectTheme={onSelectTheme} />;
        }
        break;
    case 'installed':
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
                            setCurrentTab('official');
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
                <TabView
                    border={false}
                    tabs={[
                        {id: 'official', title: 'Official themes'},
                        {id: 'installed', title: 'Installed'}
                    ]}
                    onTabChange={(id: string) => {
                        setCurrentTab(id);
                    }}
                />

                <div className='flex items-center gap-3'>
                    <FileUpload id='theme-uplaod' onUpload={(file: File) => {
                        alert(file.name);
                    }}>Upload theme</FileUpload>
                    <Button
                        className='min-w-[75px]'
                        color='black'
                        label='OK'
                        onClick = {() => {
                            modal.remove();
                        }} />
                </div>
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