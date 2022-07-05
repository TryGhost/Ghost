import React from 'react';
import AppContext from '../AppContext';
import NotSignedInBox from './NotSignedInBox';
import Form from './Form';
import TotalComments from './TotalComments';
import Comment from './Comment';
import Pagination from './Pagination';

class CommentsBox extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};
    }

    luminance(r, g, b) {
        var a = [r, g, b].map(function(v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    contrast(rgb1, rgb2) {
        var lum1 = this.luminance(rgb1[0], rgb1[1], rgb1[2]);
        var lum2 = this.luminance(rgb2[0], rgb2[1], rgb2[2]);
        var brightest = Math.max(lum1, lum2);
        var darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    darkMode() {
        const bodyColor = getComputedStyle(document.querySelector('body')).getPropertyValue('color');
        const colorsOnly = bodyColor.substring(bodyColor.indexOf('(') + 1, bodyColor.lastIndexOf(')')).split(/,\s*/);
        const red = colorsOnly[0];
        const green = colorsOnly[1];
        const blue = colorsOnly[2];

        return this.contrast([255, 255, 255], [red, green, blue]) < 5;
    }

    render() {
        const comments = !this.context.comments ? 'Loading...' : this.context.comments.slice().reverse().map(comment => <Comment comment={comment} key={comment.id} />);

        const containerClass = this.darkMode() ? 'dark' : '';

        return (
            <section className={containerClass}>
                {/* <div className="flex justify-between items-end mb-6">
                    <h1 className="text-2xl font-sans font-bold tracking-tight dark:text-neutral-300">Members discussion</h1>
                    <TotalComments />
                </div> */}
                <Pagination />
                <div>
                    {comments}
                </div>
                <div>
                    { this.context.member ? <Form /> : <NotSignedInBox /> }
                </div>
            </section>
        );
    }
}

export default CommentsBox;
