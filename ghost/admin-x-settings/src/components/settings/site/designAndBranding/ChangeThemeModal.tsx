import AdvancedThemeSettings from './AdvancedThemeSettings';
import Button from '../../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import Heading from '../../../../admin-x-ds/global/Heading';
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
        // Do your thing
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
                    <Button icon="arrow-left" size="sm" link onClick={() => {
                        setSelectedTheme('');
                    }}/>
                </div>
                <div className='w-[33%] text-center'>
                    <Heading level={4}>{selectedTheme}</Heading>
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
        // <div className='bg-grey-50 p-2'>
        //     <DesktopChromeHeader
        //         toolbarCenter={<span className='text-sm'>Themes / <span className='font-semibold'>{selectedTheme}</span></span>}
        //         toolbarLeft={<Button icon="arrow-left" size="sm" link onClick={() => {
        //             setSelectedTheme('');
        //         }}/>}
        //         toolbarRight={
        //             <div className='flex gap-8'>
        //                 <ButtonGroup
        //                     buttons={[
        //                         {icon: 'laptop', link: true, size: 'sm'},
        //                         {icon: 'mobile', iconColorClass: 'text-grey-500', link: true, size: 'sm'}
        //                     ]}
        //                 />
        //                 <Button color='green' label={`Install ${selectedTheme}`} />
        //             </div>
        //         }
        //     />
        // </div>;
    } else {
        toolBar =
            <div className='sticky top-0 flex justify-between gap-3 bg-white p-5 px-7'>
                <div className='flex gap-6'>
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
                        {label: 'Ok', color: 'black', className: 'min-w-[60px]', onClick: () => {
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