import CodeEditor from '../../../code-editor';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import useSettingGroup from '../../../../hooks/use-setting-group';
import {Button, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {type ReactCodeMirrorRef} from '@uiw/react-codemirror';
import {SettingsModal} from '@tryghost/shade/patterns';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useSaveButton} from '../../../../hooks/use-save-button';

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

    return <SettingsModal
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
                <Text as='h2' className='md:text-3xl' leading='heading' size='2xl' weight='bold'>Code injection</Text>
                <Inline gap='md'>
                    <Button className='font-semibold' type='button' variant='ghost' onClick={() => {
                        modal.remove();
                        afterClose?.();
                    }}>Close</Button>
                    <Button disabled={isSaving} type='button' onClick={onSaveClick}>{savingTitle}</Button>
                </Inline>
            </div>
            <Tabs className='mb-16 flex flex-auto flex-col' value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as typeof selectedTab)}>
                <TabsList>
                    <TabsTrigger value='header'>Site header</TabsTrigger>
                    <TabsTrigger value='footer'>Site footer</TabsTrigger>
                </TabsList>
                <TabsContent className='h-full flex-auto' value='header'>
                    <CodeEditor ref={headerEditorRef} className='mt-2' data-testid='header-code' height='full' autoFocus {...headerProps} />
                </TabsContent>
                <TabsContent className='h-full flex-auto' value='footer'>
                    <CodeEditor ref={footerEditorRef} className='mt-2' data-testid='footer-code' height='full' {...footerProps} />
                </TabsContent>
            </Tabs>
        </div>
    </SettingsModal>;
};

export default NiceModal.create(CodeModal);
