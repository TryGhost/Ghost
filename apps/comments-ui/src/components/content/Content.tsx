import CTABox from './CTABox';
import Comment from './Comment';
import ContentTitle from './ContentTitle';
import MainForm from './forms/MainForm';
import Pagination from './Pagination';
import {ROOT_DIV_ID} from '../../utils/constants';
import {SortingForm} from './forms/SortingForm';
import {useAppContext, useLabs} from '../../AppContext';
import {useEffect} from 'react';

const Content = () => {
    const labs = useLabs();
    const {pagination, member, comments, commentCount, commentsEnabled, title, showCount, openFormCount, t} = useAppContext();

    let commentsElements;
    const commentsDataset = comments;

    if (labs && labs.commentImprovements) {
        commentsElements = commentsDataset.slice().map(comment => <Comment key={comment.id} comment={comment} />);
    } else {
        commentsElements = commentsDataset.slice().reverse().map(comment => <Comment key={comment.id} comment={comment} />);
    }

    useEffect(() => {
        const elem = document.getElementById(ROOT_DIV_ID);

        // Check scroll position
        if (elem && window.location.hash === `#ghost-comments`) {
            // Only scroll if the user didn't scroll by the time we loaded the comments
            // We could remove this, but if the network connection is slow, we risk having a page jump when the user already started scrolling
            if (window.scrollY === 0) {
                // This is a bit hacky, but one animation frame is not enough to wait for the iframe height to have changed and the DOM to be updated correctly before scrolling
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        elem.scrollIntoView();
                    });
                });
            }
        }
    }, []);

    const isPaidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const isFirst = pagination?.total === 0;
    const hasOpenReplyForms = openFormCount > 0;

    return (
        labs.commentImprovements ? (
            <>
                <ContentTitle count={commentCount} showCount={showCount} title={title}/>
                <div>
                    {(member && (isPaidMember || !isPaidOnly)) ? (
                        <MainForm commentsCount={comments.length} />
                    ) : (
                        <section className="flex flex-col items-center py-6 sm:px-8 sm:py-10" data-testid="cta-box">
                            <CTABox isFirst={isFirst} isPaid={isPaidOnly} />
                        </section>
                    )}
                </div>
                {commentCount > 1 && (
                    <div className="z-20 mb-7 mt-3">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {t('Sort by')}: <SortingForm/>
                        </span>
                    </div>
                )}
                <div className="z-10" data-test="comment-elements">
                    {commentsElements}
                </div>
                <Pagination />
                {
                    labs?.testFlag ? <div data-testid="this-comes-from-a-flag" style={{display: 'none'}}></div> : null
                }
            </>
        ) : (
            <>
                <ContentTitle count={commentCount} showCount={showCount} title={title}/>
                <Pagination />
                <div className={!pagination ? 'mt-4' : ''} data-test="comment-elements">
                    {commentsElements}
                </div>
                <div>
                    {!hasOpenReplyForms
                        ? (member ? (isPaidMember || !isPaidOnly ? <MainForm commentsCount={commentCount} /> :
                            <section className={`flex flex-col items-center pt-[40px] ${member ? 'pb-[32px]' : 'pb-[48px]'} ${!isFirst && 'mt-4'} ${(!member || (member && isPaidOnly)) && commentCount ? 'border-t' : 'border-none'} border-[rgba(0,0,0,0.075)] sm:px-8 dark:border-[rgba(255,255,255,0.1)]`} data-testid="cta-box">
                                <CTABox isFirst={isFirst} isPaid={isPaidOnly} />
                            </section>) :
                            <section className={`flex flex-col items-center pt-[40px] ${member ? 'pb-[32px]' : 'pb-[48px]'} ${!isFirst && 'mt-4'} ${(!member || (member && isPaidOnly)) && commentCount ? 'border-t' : 'border-none'} border-[rgba(0,0,0,0.075)] sm:px-8 dark:border-[rgba(255,255,255,0.1)]`} data-testid="cta-box">
                                <CTABox isFirst={isFirst} isPaid={isPaidOnly} />
                            </section>)
                        : null
                    }
                </div>
                {
                    labs?.testFlag ? <div data-testid="this-comes-from-a-flag" style={{display: 'none'}}></div> : null
                }
            </>
        )
    );
};

export default Content;
