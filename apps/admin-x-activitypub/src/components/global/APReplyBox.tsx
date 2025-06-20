import React, {HTMLProps, useState} from 'react';

import APAvatar from './APAvatar';
import NewNoteModal from '@components/modals/NewNoteModal';
import getUsername from '../../utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useUserDataForUser} from '@hooks/use-activity-pub-queries';

export interface APTextAreaProps extends HTMLProps<HTMLDivElement> {
    object: ObjectProperties;
    onReply?: () => void;
    onReplyError?: () => void;
}

const APReplyBox: React.FC<APTextAreaProps> = ({
    object,
    onReply,
    onReplyError,
    className,
    ...props
}) => {
    const {data: user} = useUserDataForUser('index');
    const [showReplyModal, setShowReplyModal] = useState(false);

    if (!user) {
        return null;
    }

    const attributedTo = object.attributedTo as ActorProperties | undefined;
    let placeholder = 'Reply...';
    if (attributedTo?.preferredUsername && attributedTo?.id) {
        placeholder = `Reply to ${getUsername(attributedTo)}...`;
    }

    return (
        <>
            <div
                className={`flex w-full cursor-pointer gap-x-3 py-6 ${className || ''}`}
                onClick={() => setShowReplyModal(true)}
                {...props}
            >
                <APAvatar author={user as ActorProperties} />
                <div className='flex w-full items-center'>
                    <div className='w-full text-[1.5rem] text-gray-500 transition-colors dark:text-gray-400'>
                        {placeholder}
                    </div>
                </div>
            </div>

            {showReplyModal && (
                <NewNoteModal
                    open={showReplyModal}
                    replyTo={{
                        object: object,
                        actor: object.attributedTo as ActorProperties
                    }}
                    onOpenChange={(open) => {
                        setShowReplyModal(open);
                    }}
                    onReply={() => {
                        onReply?.();
                        setShowReplyModal(false);
                    }}
                    onReplyError={() => {
                        onReplyError?.();
                    }}
                />
            )}
        </>
    );
};

export default APReplyBox;
