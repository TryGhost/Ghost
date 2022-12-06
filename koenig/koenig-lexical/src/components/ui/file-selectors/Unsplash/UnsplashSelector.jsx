import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as UnsplashIcon} from '../../../../assets/icons/kg-card-type-unsplash.svg';
import {ReactComponent as SearchIcon} from '../../../../assets/icons/kg-search.svg';
import {ReactComponent as CloseIcon} from '../../../../assets/icons/kg-close.svg';

function UnsplashSelector({closeModal, handleSearch, children, galleryRef}) {
    return (
        <>
            <div className="bg-black opacity-60 inset-0 h-[100vh]"></div>
            <div data-kg-modal="unsplash" className="bg-white inset-8 rounded z-40 overflow-hidden absolute shadow-xl" ref={galleryRef}>
                <button className="absolute top-6 right-6 cursor-pointer">
                    <CloseIcon 
                        data-kg-modal-close-button 
                        onClick={() => closeModal()} 
                        className="w-4 h-4 text-grey-400 stroke-2" 
                    />
                </button>
                <div className="flex flex-col h-full">
                    <header className="flex shrink-0 justify-between py-10 px-20 items-center">
                        <h1 className="flex items-center gap-2 text-black text-3xl font-bold font-sans">
                            <UnsplashIcon className="mb-1" />
                            Unsplash
                        </h1>
                        <div className="relative w-full max-w-sm">
                            <SearchIcon className="absolute top-1/2 left-4 w-4 h-4 -translate-y-2 text-grey-700" />
                            <input data-kg-unsplash-search onChange={handleSearch} className="pr-8 pl-10 border border-grey-300 rounded-full font-sans text-md font-normal text-black h-10 w-full focus:border-grey-400 focus-visible:outline-none" placeholder="Search free high-resolution photos" />
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