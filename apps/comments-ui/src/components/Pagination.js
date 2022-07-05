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
            <div className="w-full rounded-md border p-3 mb-3 font-sans text-sm text-center" onClick={this.loadMore}>
                Show {left} more comments
            </div>
        );
    }
}
  
export default Pagination;
