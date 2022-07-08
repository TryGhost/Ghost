import React, {useContext} from 'react';
import AppContext from '../AppContext';
import NotSignedInBox from './NotSignedInBox';
import Form from './Form';
import Comment from './Comment';
import Pagination from './Pagination';

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

    const darkMode = () => {
        if (props.colorScheme === 'light') {
            return false;
        } else if (props.colorScheme === 'dark') {
            return true;
        } else {
            const containerColor = getComputedStyle(document.querySelector('#ghost-comments-root').parentNode).getPropertyValue('color');

            const colorsOnly = containerColor.substring(containerColor.indexOf('(') + 1, containerColor.lastIndexOf(')')).split(/,\s*/);
            const red = colorsOnly[0];
            const green = colorsOnly[1];
            const blue = colorsOnly[2];

            return contrast([255, 255, 255], [red, green, blue]) < 5;
        }
    };

    const {accentColor, pagination, member, comments} = useContext(AppContext);

    const commentsElements = !comments ? 'Loading...' : comments.slice().reverse().map(comment => <Comment comment={comment} key={comment.id} avatarSaturation={props.avatarSaturation} />);

    const containerClass = darkMode() ? 'dark' : '';
    const commentsCount = comments.length;
    const style = {
        '--gh-accent-color': accentColor ?? 'blue'
    };

    return (
        <section className={containerClass} style={style}>
            <Pagination />
            <div className={!pagination ? 'mt-4' : ''}>
                {commentsElements}
            </div>
            <div>
                { member ? <Form commentsCount={commentsCount} avatarSaturation={props.avatarSaturation} /> : <NotSignedInBox /> }
            </div>
        </section>
    );
};

export default CommentsBox;
