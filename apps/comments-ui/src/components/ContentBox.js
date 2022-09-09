import React, {useContext, useEffect} from 'react';
import AppContext from '../AppContext';
import CTABox from './content/CTABox';
import MainForm from './content/forms/MainForm';
import Comment from './content/Comment';
import Pagination from './content/Pagination';
import Loading from './content/Loading';
import {ROOT_DIV_ID} from '../utils/constants';
import ContentTitle from './content/ContentTitle';

const Content = (props) => {
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

const ContentBox = (props) => {
    const luminance = (r, g, b) => {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrast = (rgb1, rgb2) => {
        var lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        var lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
        var brightest = Math.max(lum1, lum2);
        var darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    };
    const {accentColor, colorScheme} = useContext(AppContext);

    const darkMode = () => {
        if (colorScheme === 'light') {
            return false;
        } else if (colorScheme === 'dark') {
            return true;
        } else {
            const containerColor = getComputedStyle(document.getElementById(ROOT_DIV_ID).parentNode).getPropertyValue('color');

            const colorsOnly = containerColor.substring(containerColor.indexOf('(') + 1, containerColor.lastIndexOf(')')).split(/,\s*/);
            const red = colorsOnly[0];
            const green = colorsOnly[1];
            const blue = colorsOnly[2];

            return contrast([255, 255, 255], [red, green, blue]) < 5;
        }
    };

    const containerClass = darkMode() ? 'dark' : '';
    const style = {
        '--gh-accent-color': accentColor ?? 'blue',
        paddingTop: 0,
        paddingBottom: 24 // remember to allow for bottom shadow on comment text box
    };

    return (
        <section className={'ghost-display ' + containerClass} style={style} data-testid="content-box">
            {props.done ? <Content /> : <Loading />}
        </section>
    );
};

export default ContentBox;
