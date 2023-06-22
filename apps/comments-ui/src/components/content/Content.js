import React, {useContext, useEffect} from 'react';
import AppContext from '../../AppContext';
import CTABox from './CTABox';
import MainForm from './forms/MainForm';
import Comment from './Comment';
import Pagination from './Pagination';
import ContentTitle from './ContentTitle';
import {ROOT_DIV_ID} from '../../utils/constants';

const Content = () => {
    const {pagination, member, comments, commentCount, commentsEnabled, title, showCount, secundaryFormCount} = useContext(AppContext);
    const commentsElements = comments.slice().reverse().map(comment => <Comment comment={comment} key={comment.id} />);

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;

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

    const hasOpenSecundaryForms = secundaryFormCount > 0;

    return (
        <>
            <ContentTitle title={title} showCount={showCount} count={commentCount}/>
            <Pagination />
            <div className={!pagination ? 'mt-4' : ''} data-test="comment-elements">
                {commentsElements}
            </div>
            <div>
                {!hasOpenSecundaryForms
                    ? (member ? (isPaidMember || !paidOnly ? <MainForm commentsCount={commentCount} /> : <CTABox isFirst={pagination?.total === 0} isPaid={paidOnly} />) : <CTABox isFirst={pagination?.total === 0} isPaid={paidOnly} />)
                    : null
                }
            </div>
        </>
    );
};

export default Content;
