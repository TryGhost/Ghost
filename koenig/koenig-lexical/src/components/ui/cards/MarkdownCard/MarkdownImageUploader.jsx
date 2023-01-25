import React from 'react';
import pluralize from 'pluralize';
import {ProgressBar} from '../../ProgressBar';

export default function MarkdownImageUploader({onChange, inputRef, progress, loading, filesNumber, errors = []}) {
    const progressStyle = {
        width: `${progress}%`
    };
    return (
        <>
            {
                loading && !!progress && (
                    <div className="absolute inset-0 z-10 flex min-w-full flex-col items-center justify-center overflow-hidden bg-white/70">
                        <div className="mb-4 w-full text-center">
                            <h3 className="mb-3 font-sans text-xl font-bold">
                                Uploading {filesNumber} {pluralize('image', filesNumber)}...
                            </h3>
                            <ProgressBar style={progressStyle} />
                        </div>
                    </div>
                )
            }

            {
                !!errors.length && (
                    errors.map(error => (
                        <div className="absolute inset-0 z-10 flex min-w-full flex-col items-center justify-center overflow-hidden bg-white/70">
                            <div className="mb-4 w-3/5 text-center">
                                <h3 className="mb-3 font-sans text-xl font-bold">{error.fileName}<span className="text-red"> failed to upload.</span></h3>
                                <p className="font-sans text-sm font-normal">{error.message}</p>
                            </div>
                        </div>
                    ))
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
