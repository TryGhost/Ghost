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
            <div className='mt-4 w-auto'>
                <div className='mx-auto max-w-[580px] pb-16'>
                    <div className='z-0 flex w-full flex-col items-center'>
                        <div className='mx-auto w-full'>
                            <div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                                {profile.actor.image && (
                                    <img
                                        alt={profile.actor.name}
                                        className='h-full w-full object-cover'
                                        src={profile.actor.image.url}
                                    />
                                )}
                            </div>
                            <div className='-mt-12 px-4'>
                                <div className='flex items-end justify-between'>
                                    <div className='rounded-xl outline outline-4 outline-white'>
                                        <APAvatar
                                            author={profile.actor}
                                            size='lg'
                                        />
                                    </div>
                                    {/* {profile.isFollowing === false && ( */}
                                    <FollowButton isFollowing={profile.isFollowing} toFollow={profile.handle} />
                                    {/* )} */}
                                </div>
                                <Heading className='mt-4' level={3}>{profile.actor.name}</Heading>
                                <span className='mt-2 inline-block text-[1.5rem] text-grey-800'>{profile.handle}</span>
                                <div
                                    dangerouslySetInnerHTML={{__html: profile.actor.summary}}
                                    className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                                />
                                {attachments.map(attachment => (
                                    <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                        <span className={`mr-1 text-xs font-semibold after:content-[":"]`}>{attachment.name}</span>
                                        <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                    </span>
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
