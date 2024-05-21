import React from 'react';
import {Button, Heading, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewArticleProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: any,
    onBackToList: () => void;
}

// const ArticleBody: React.FC<{html: string}> = ({html}) => {
//     const dangerouslySetInnerHTML = {__html: html};
//     return (
//         <div className="mt mb-2 flex flex-row items-center gap-4 pr-4">
//             <p dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content text-neutral-900 font-sans text-[16px] leading-normal [overflow-wrap:anywhere] dark:text-[rgba(255,255,255,0.85)]" data-testid="comment-content"/>
//         </div>
//     );
// };

const ViewArticle: React.FC<ViewArticleProps> = ({onBackToList}) => {
    const {updateRoute} = useRouting();

    // console.log(object);
    
    return (
        <Page>
            <ViewContainer
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_600px)_1fr] gap-x-6 gap-y-12'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' onClick={onBackToList}/>
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