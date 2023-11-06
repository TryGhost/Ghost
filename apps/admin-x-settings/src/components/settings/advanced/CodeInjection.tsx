import Button from '@tryghost/admin-x-design/global/Button';
import CodeEditor from '@tryghost/admin-x-design/global/form/CodeEditor';
import CodeModal from './code/CodeModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useMemo, useRef, useState} from 'react';
import SettingGroup from '@tryghost/admin-x-design/settings/SettingGroup';
import TabView from '@tryghost/admin-x-design/global/TabView';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ReactCodeMirrorRef} from '@uiw/react-codemirror';
import {getSettingValues} from '../../../api/settings';
import {withErrorBoundary} from '@tryghost/admin-x-design/global/ErrorBoundary';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

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
            contents: (<CodeEditor {...headerProps} ref={headerEditorRef} className='mt-2' data-testid='header-code' autoFocus />)
        },
        {
            id: 'footer',
            title: 'Site footer',
            contents: (<CodeEditor {...footerProps} ref={footerEditorRef} className='mt-2' data-testid='footer-code' />)
        }
    ] as const;

    return (
        <SettingGroup
            description="Add custom code to your publication"
            isEditing={isEditing}
            keywords={keywords}
            navid='code-injection'
            saveState={saveState}
            testId='code-injection'
            title="Code injection"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing && (
                <div className='relative'>
                    <TabView<'header' | 'footer'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                    <Button
                        className='absolute right-0 top-1 text-sm'
                        label='Fullscreen'
                        unstyled
                        onClick={() => NiceModal.show(CodeModal, {
                            ...(selectedTab === 'header' ? headerProps : footerProps),
                            afterClose: () => {
                                if (selectedTab === 'header') {
                                    headerEditorRef.current?.view?.focus();
                                } else {
                                    footerEditorRef.current?.view?.focus();
                                }
                            }
                        })}
                    />
                </div>
            )}
        </SettingGroup>
    );
};

export default withErrorBoundary(CodeInjection, 'Code injection');
