import React from 'react';
import AppContext from '../AppContext';

class Pagination extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            message: ''
        };

        this.loadMore = this.loadMore.bind(this);
    }

    loadMore() {
        this.context.onAction('loadMoreComments');
    }

    render() {
        if (!this.context.pagination) {
            return null;
        }

        const left = this.context.pagination.total - this.context.pagination.page * this.context.pagination.limit;

        if (left <= 0) {
            return null;
        }

        return (
            <button className="w-full rounded-md border p-3 mb-6 font-sans text-sm text-center dark:border-neutral-500 dark:text-white" onClick={this.loadMore}>
                View {left} previous comments
            </button>
        );
    }
}
  
export default Pagination;
