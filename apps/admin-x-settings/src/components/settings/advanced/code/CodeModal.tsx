import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useMemo} from 'react';
import {CodeEditor, Modal} from '@tryghost/admin-x-design-system';

interface CodeModalProps {
    hint?: React.ReactNode;
    value?: string;
    onChange: (value: string) => void;
    afterClose?: () => void
}

const CodeModal: React.FC<CodeModalProps> = ({hint, value, onChange, afterClose}) => {
    const modal = useModal();

    const html = useMemo(() => import('@codemirror/lang-html').then(module => module.html()), []);

    const onOk = () => {
        modal.remove();
        afterClose?.();
    };

    return <Modal afterClose={afterClose} cancelLabel='' okColor='grey' okLabel='Done' size='full' testId='modal-code' onOk={onOk}>
        <CodeEditor extensions={[html]} height='full' hint={hint} value={value} autoFocus onChange={onChange} />
    </Modal>;
};

export default NiceModal.create(CodeModal);
