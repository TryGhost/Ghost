import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {ButtonGroup, CodeEditor, Heading, Modal, TabView} from '@tryghost/admin-x-design-system';
import {ReactCodeMirrorRef} from '@uiw/react-codemirror';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useSaveButton} from '../../../../hooks/useSaveButton';

interface CodeModalProps {
    hint?: React.ReactNode;
    value?: string;
    onChange: (value: string) => void;
    afterClose?: () => void
}

const CodeModal: React.FC<CodeModalProps> = ({afterClose}) => {
    const {
        localSettings,
        handleSave,
        updateSetting
    } = useSettingGroup();
    const modal = useModal();

    const [headerContent, footerContent] = getSettingValues<string>(localSettings, ['codeinjection_head', 'codeinjection_foot']);

    const [selectedTab, setSelectedTab] = useState<'header' | 'footer'>('header');

    const headerEditorRef = useRef<ReactCodeMirrorRef>(null);
    const footerEditorRef = useRef<ReactCodeMirrorRef>(null);

    const html = useMemo(() => import('@codemirror/lang-html').then(module => module.html()), []);

    const headerProps = {
        extensions: [html],
        hint: 'Code here will be injected into the {{ghost_head}} tag on every page of the site',
        value: headerContent || '',
        onChange: (value: string) => updateSetting('codeinjection_head', value)
    };

    const footerProps = {
        extensions: [html],
        hint: 'Code here will be injected into the {{ghost_foot}} tag on every page of the site',
        value: footerContent || '',
        onChange: (value: string) => updateSetting('codeinjection_foot', value)
    };

    const tabs = [
        {
            id: 'header',
            title: 'Site header',
            contents: (<CodeEditor height='full' {...headerProps} ref={headerEditorRef} className='mt-2' data-testid='header-code' autoFocus />),
            tabWrapperClassName: 'flex-auto',
            containerClassName: 'h-full'
        },
        {
            id: 'footer',
            title: 'Site footer',
            contents: (<CodeEditor height='full' {...footerProps} ref={footerEditorRef} className='mt-2' data-testid='footer-code' />),
            tabWrapperClassName: 'flex-auto',
            containerClassName: 'h-full'
        }
    ] as const;

    const {savingTitle, isSaving, onSaveClick} = useSaveButton(handleSave, true);

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                onSaveClick();
            }
        };
        window.addEventListener('keydown', handleCMDS);
        return () => {
            window.removeEventListener('keydown', handleCMDS);
        };
    });

    return <Modal
        afterClose={afterClose}
        backDropClick={false}
        cancelLabel='Close'
        footer={<></>}
        height='full'
        size='full'
        testId='modal-code-injection'
    >
        <div className='flex h-full flex-col'>
            <div className='mb-4 flex items-center justify-between'>
                <Heading level={2}>Code injection</Heading>
                <ButtonGroup buttons={[
                    {
                        label: 'Close',
                        color: 'outline',
                        onClick: () => {
                            modal.remove();
                            afterClose?.();
                        }
                    },
                    {
                        disabled: isSaving,
                        label: savingTitle,
                        color: savingTitle === 'Saved' ? 'green' : 'black',
                        onClick: onSaveClick
                    }
                ]} />
            </div>
            <TabView<'header' | 'footer'>
                containerClassName='flex-auto flex flex-col mb-16'
                selectedTab={selectedTab}
                tabs={tabs}
                onTabChange={setSelectedTab}
            />
        </div>
    </Modal>;
};

export default NiceModal.create(CodeModal);
