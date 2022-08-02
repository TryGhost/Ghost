import React, {useContext, useEffect, useState} from 'react';
import AppContext from '../AppContext';
import NotSignedInBox from './NotSignedInBox';
import Form from './Form';
import Comment from './Comment';
import Pagination from './Pagination';
import NotPaidBox from './NotPaidBox';
// import Empty from './Empty';
import Loading from './Loading';
import {ROOT_DIV_ID} from '../utils/constants';

const CommentsBoxContent = (props) => {
    const [isEditing, setIsEditing] = useState(false);

    const {pagination, member, comments, commentsEnabled, title, showCount} = useContext(AppContext);
    const commentsElements = comments.slice().reverse().map(comment => <Comment isEditing={isEditing} comment={comment} key={comment.id} updateIsEditing={setIsEditing} />);

    const commentsCount = pagination?.total || 0;

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

    return (
        <>
            <div className="w-full flex justify-between items-baseline font-sans mb-10">
                <h2 className="font-bold text-[2.8rem] tracking-tight dark:text-[rgba(255,255,255,0.85)]">
                    {title !== null ? title : <><span className="hidden sm:inline">Member </span><span className="capitalize sm:normal-case">discussion</span></>}
                </h2>
                {showCount ? <div className="text-neutral-400 text-[1.6rem]">{commentsCount} comments</div> : null}
            </div>
            <Pagination />
            <div className={!pagination ? 'mt-4' : ''}>
                {commentsCount > 0 && commentsElements}
            </div>
            <div>
                { !isEditing
                    ? (member ? (isPaidMember || !paidOnly ? <Form commentsCount={commentsCount} /> : <NotPaidBox isFirst={commentsCount === 0} />) : <NotSignedInBox isFirst={commentsCount === 0} />)
                    : null
                }
            </div>
        </>
    );
};

const CommentsBox = (props) => {
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
        // need careful padding adjustments to match iFrame negative margins and to not cut off top editing form
        paddingTop: 8,
        paddingBottom: 64
    };

    return (
        <section className={'ghost-display ' + containerClass} style={style}>
            {props.done ? <>
                <CommentsBoxContent />
            </> : <Loading />}
        </section>
    );
};

export default CommentsBox;
