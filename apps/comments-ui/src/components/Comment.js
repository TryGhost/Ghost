import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';

function Comment() {
    return (
        <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <Avatar />
                    <h4 className="text-lg font-sans font-semibold mb-1">Someone's Name</h4>
                    <h6 className="text-sm text-gray-400 font-sans">Someone's Bio</h6>
                </div>
                <div className="text-sm text-gray-400 font-sans font-normal">
                    2 mins ago
                </div>
            </div>
            <div className="mb-4 font-sans leading-normal">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut mollis erat vitae diam gravida accumsan vitae quis nisl. Donec luctus laoreet mauris, nec posuere turpis accumsan in. Proin sagittis magna quis vulputate tempus. Duis sagittis purus mattis enim condimentum, quis tempus est tristique.</p>
            </div>
            <div className="flex">
                <Like />
                <Reply />
                <More />
            </div>
        </div>
    );
}
  
export default Comment;
