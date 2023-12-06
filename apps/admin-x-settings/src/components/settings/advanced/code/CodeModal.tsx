import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useMemo, useRef, useState} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {CodeEditor, Modal, TabView} from '@tryghost/admin-x-design-system';
import {ReactCodeMirrorRef} from '@uiw/react-codemirror';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

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
            contents: (<CodeEditor height='full' {...headerProps} ref={headerEditorRef} className='mt-2' data-testid='header-code' autoFocus />)
        },
        {
            id: 'footer',
            title: 'Site footer',
            contents: (<CodeEditor height='full' {...footerProps} ref={footerEditorRef} className='mt-2' data-testid='footer-code' />)
        }
    ] as const;

    const onOk = () => {
        modal.remove();
        handleSave();
        afterClose?.();
    };

    return <Modal
        afterClose={afterClose}
        cancelLabel='Close'
        height='full'
        okColor='grey'
        okLabel='Save'
        size='full'
        testId='modal-code'
        title='Code injection'
        onOk={onOk}
    >
        <TabView<'header' | 'footer'>
            selectedTab={selectedTab}
            tabs={tabs}
            onTabChange={setSelectedTab}
        />
    </Modal>;
};

export default NiceModal.create(CodeModal);
