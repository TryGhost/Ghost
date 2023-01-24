import React from 'react';

export default function MarkdownImageUploader({onChange, inputRef, progress, loading, filesNumber, errors = []}) {
    return (
        <>
            {
                loading && !!progress && (
                    <div className="absolute inset-0 flex min-w-full flex-col items-center justify-center overflow-hidden bg-white/50">
                        <div>Uploading {filesNumber} images...</div>
                        <div className="not-kg-prose w-[60%] rounded-full bg-grey-200 shadow">
                            <div className="rounded-full bg-green py-1 text-center text-xs leading-none text-white" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>
                )
            }

            {
                !!errors.length && (
                    <div className="absolute inset-0 flex min-w-full flex-col items-center justify-center overflow-hidden bg-white/50">
                        {
                            errors.map(error => (
                                <div>{error.fileName} - {error.message}</div>
                            ))
                        }
                    </div>

                )
            }

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
        </>
    );
}
