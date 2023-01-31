import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as UnsplashIcon} from '../../../../assets/icons/kg-card-type-unsplash.svg';
import {ReactComponent as SearchIcon} from '../../../../assets/icons/kg-search.svg';
import {ReactComponent as CloseIcon} from '../../../../assets/icons/kg-close.svg';

function UnsplashSelector({closeModal, handleSearch, children, galleryRef}) {
    return (
        <>
            <div className="fixed inset-0 z-40 h-[100vh] bg-black opacity-60"></div>
            <div data-kg-modal="unsplash" className="not-kg-prose fixed inset-8 z-50 overflow-hidden rounded bg-white shadow-xl" ref={galleryRef}>
                <button className="absolute top-6 right-6 cursor-pointer">
                    <CloseIcon
                        data-kg-modal-close-button
                        onClick={() => closeModal()}
                        className="h-4 w-4 stroke-2 text-grey-400"
                    />
                </button>
                <div className="flex h-full flex-col">
                    <header className="flex shrink-0 items-center justify-between py-10 px-20">
                        <h1 className="flex items-center gap-2 font-sans text-3xl font-bold text-black">
                            <UnsplashIcon className="mb-1" />
                            Unsplash
                        </h1>
                        <div className="relative w-full max-w-sm">
                            <SearchIcon className="absolute top-1/2 left-4 h-4 w-4 -translate-y-2 text-grey-700" />
                            <input data-kg-unsplash-search onChange={handleSearch} className="h-10 w-full rounded-full border border-grey-300 pr-8 pl-10 font-sans text-md font-normal text-black focus:border-grey-400 focus-visible:outline-none" placeholder="Search free high-resolution photos" />
                        </div>
                    </header>
                    {children}
                </div>
            </div>
        </>
    );
}

UnsplashSelector.propTypes = {
    closeModal: PropTypes.func,
    handleSearch: PropTypes.func
};

export default UnsplashSelector;
