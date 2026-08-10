import CloseIcon from '../assets/kg-close.svg?react';
import SearchIcon from '../assets/kg-search.svg?react';
import UnsplashIcon from '../assets/kg-card-type-unsplash.svg?react';
import {ChangeEvent, FunctionComponent, ReactNode} from 'react';

interface UnsplashSelectorProps {
    closeModal: () => void;
    handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
    children: ReactNode;
}

const UnsplashSelector: FunctionComponent<UnsplashSelectorProps> = ({closeModal, handleSearch, children}) => {
    return (
        <>
            <div className="fixed inset-0 z-40 h-[100vh] bg-black opacity-60"></div>
            <div className="not-kg-prose fixed inset-8 z-50 overflow-hidden rounded bg-white shadow-xl" data-kg-modal="unsplash">
                <button className="absolute right-6 top-6 cursor-pointer" type="button">
                    <CloseIcon
                        className="text-grey-400 size-4 stroke-2"
                        data-kg-modal-close-button
                        onClick={() => closeModal()}
                    />
                </button>
                <div className="flex h-full flex-col">
                    <header className="flex shrink-0 items-center justify-between px-20 py-10">
                        <h1 className="flex items-center gap-2 font-sans text-3xl font-bold text-black">
                            <UnsplashIcon className="mb-1" />
                            Unsplash
                        </h1>
                        <div className="relative w-full max-w-sm">
                            <SearchIcon className="text-grey-700 absolute left-4 top-1/2 size-4 -translate-y-2" />
                            <input className="border-grey-300 focus:border-grey-400 h-10 w-full rounded-full border border-solid pl-10 pr-8 font-sans text-md font-normal text-black focus-visible:outline-none" placeholder="Search free high-resolution photos" autoFocus data-kg-unsplash-search onChange={handleSearch} />
                        </div>
                    </header>
                    {children}
                </div>
            </div>
        </>
    );
};

export default UnsplashSelector;
