import React from 'react';
import PropTypes from 'prop-types';

/**
 * Primary UI component for user interaction
 */
export const Card = () => {
    return (
        <div className="koenig-lexical">
            <div className="my-20 max-w-md rounded-lg bg-white py-4 px-8 shadow-lg">
                <div className="-mt-16 flex justify-center md:justify-end">
                    <img alt='sample' className="border-indigo-500 h-20 w-20 rounded-full border-2 object-cover" src="https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=334&q=80" />
                </div>
                <div>
                    <h2 className="text-gray-800 text-3xl font-semibold">Design Tools</h2>
                    <p className="text-gray-600 mt-2">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quae dolores deserunt ea doloremque natus error, rerum quas odio quaerat nam ex commodi hic, suscipit in a veritatis pariatur minus consequuntur!</p>
                </div>
                <div className="mt-4 flex justify-end">
                    <p className="text-indigo-500 text-xl font-medium">John Doe</p>
                </div>
            </div>
        </div>
    );
};

Card.propTypes = {
    /**
   * Is this the principal call to action on the page?
   */
    primary: PropTypes.bool,
    /**
   * What background color to use
   */
    backgroundColor: PropTypes.string,
    /**
   * How large should the button be?
   */
    // size: PropTypes.oneOf(['small', 'medium', 'large']),
    /**
   * Button contents
   */
    label: PropTypes.string.isRequired
    /**
   * Optional click handler
   */
    // onClick: PropTypes.func
};

Card.defaultProps = {
    backgroundColor: null,
    primary: false
    // size: 'medium',
    // onClick: undefined
};
