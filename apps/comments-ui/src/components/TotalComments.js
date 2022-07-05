import React from 'react';
import AppContext from '../AppContext';

class TotalComments extends React.Component {
    static contextType = AppContext;

    render() {
        if (!this.context.pagination) {
            return null;
        }

        return (
            <section className="font-sans text-base text-neutral-400 mb-px dark:text-white">
                <p>{this.context.pagination.total} {this.context.pagination.total === 1 ? 'comment' : 'comments'}</p>
            </section>
        );
    }
}
  
export default TotalComments;
