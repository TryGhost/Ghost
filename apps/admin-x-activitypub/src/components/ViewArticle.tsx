import React from 'react';
import {Button, Heading, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ViewArticle: React.FC = () => {
    const {updateRoute} = useRouting();
    
    return (
        <Page>
            <ViewContainer
                // actions={dummyActions}
                // primaryAction={{
                //     title: 'Follow',
                //     onClick: () => {
                //         updateRoute('follow-site');
                //     },
                //     icon: 'add'
                // }}
                // title='Outbox'
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_600px)_1fr] gap-x-6 gap-y-12'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' onClick={() => updateRoute('/')}/>
                    </div>
                    <div className='flex items-center'>
                        <img src=''/>
                        <span className='text-base font-semibold'>Platformer</span>
                    </div>
                    <div className='flex justify-end'>
                        <Button icon='arrow-top-right' iconSize='xs' label='Visit site' onClick={() => updateRoute('/')}/>
                    </div>
                    <div className='col-start-2 text-xl'>
                        <Heading className='mb-3' level={1}>Building ActivityPub: Day 0</Heading>
                        <p className='font-serif text-xl'>They say the best way to predict the future is to create it, so two weeks ago we shared our intention to connect Ghost with the ActivityPub Network to bring back the open web. We were delighted when our ideas managed to spread even further and wider than we had imagined, and that so many of you signed up to be a part of the journey.</p>
                    </div>
                </div>
            </ViewContainer>
        </Page>
    );
};

export default ViewArticle;