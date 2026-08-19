import CodeModal from './code/code-modal';
import React, {useState} from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import {Button} from '@tryghost/shade/components';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';
import {DialogPortal} from '@/settings/app/components/providers/dialog-portal';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={() => setIsCodeModalOpen(true)}>Open</Button>}
            description="Add custom code to your publication"
            keywords={keywords}
            navid='code-injection'
            testId='code-injection'
            title="Code injection"
        >
            {isCodeModalOpen && <DialogPortal><CodeModal onClose={() => setIsCodeModalOpen(false)} /></DialogPortal>}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CodeInjection, 'Code injection');
