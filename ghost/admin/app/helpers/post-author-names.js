import {helper} from '@ember/component/helper';

export default helper(function postAuthorNames([post]/*, hash*/) {
    return (post?.authors || []).map(author => author.name || author.email).join(', ');
});
