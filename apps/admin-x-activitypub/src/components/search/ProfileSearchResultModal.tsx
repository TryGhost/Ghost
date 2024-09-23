import React from 'react';

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Modal} from '@tryghost/admin-x-design-system';

import APAvatar from '../global/APAvatar';
import FollowButton from '../global/FollowButton';

interface ProfileSearchResultModalProps {
    profile: {
        actor: ActorProperties;
        handle: string;
        isFollowing: boolean;
    };
}

const ProfileSearchResultModal: React.FC<ProfileSearchResultModalProps> = ({profile}) => {
    const modal = useModal();
    const attachments = (profile.actor.attachment || [])
        .filter(attachment => attachment.type === 'PropertyValue');

    return (
        <Modal
            align='right'
            animate={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={640}
        >
            <div className='sticky top-0 z-50 border-grey-200 bg-white py-3'>
                <div className='grid h-8 grid-cols-3'>
                    <div className='col-[3/4] flex items-center justify-end space-x-6 px-8'>
                        <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                    </div>
                </div>
            </div>
            <div className='mt-10 w-auto'>
                <div className='mx-auto max-w-[580px] pb-16'>
                    <div className='z-0 flex w-full flex-col items-center'>
                        <div className='mx-auto w-full max-w-[560px]'>
                            <div className='h-[200px] w-full rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                                {profile.actor.image && (
                                    <img
                                        alt={profile.actor.name}
                                        className='h-full w-full object-cover'
                                        src={profile.actor.image.url}
                                    />
                                )}
                            </div>
                            <div className='-mt-8 px-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='rounded-lg border-4 border-white'>
                                        <APAvatar
                                            author={profile.actor}
                                            size='lg'
                                        />
                                    </div>
                                    {profile.isFollowing === false && (
                                        <FollowButton toFollow={profile.handle} />
                                    )}
                                </div>
                                <Heading className='mt-4' level={3}>{profile.actor.name}</Heading>
                                <span className='mt-1 text-[1.5rem] text-grey-800'>{profile.handle}</span>
                                <div
                                    dangerouslySetInnerHTML={{__html: profile.actor.summary}}
                                    className='mt-3 text-[1.5rem]'
                                />
                                {attachments.map(attachment => (
                                    <div className='mt-3 block text-[1.5rem]'>
                                        <span className='font-bold'>{attachment.name}: </span>
                                        <span dangerouslySetInnerHTML={{__html: attachment.value}} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ProfileSearchResultModal);
