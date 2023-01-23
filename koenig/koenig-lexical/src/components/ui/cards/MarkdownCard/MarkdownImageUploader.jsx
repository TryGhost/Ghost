import React from 'react';

export default function MarkdownImageUploader({onChange, inputRef, loading}) {
    return (
        <div>
            {loading && 'loading'}
            <form onChange={onChange}>
                <input
                    name="image"
                    type='file'
                    accept='image/*'
                    ref={inputRef}
                    multiple
                    hidden
                />
            </form>
        </div>
    );
}
