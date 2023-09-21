import {ChangeEvent, FunctionComponent, ReactNode} from 'react';
import {ReactComponent as CloseIcon} from '../assets/kg-close.svg';
import {ReactComponent as SearchIcon} from '../assets/kg-search.svg';
import {ReactComponent as UnsplashIcon} from '../assets/kg-card-type-unsplash.svg';

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
                        className="h-4 w-4 stroke-2 text-grey-400"
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
                            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-2 text-grey-700" />
                            <input className="h-10 w-full rounded-full border border-grey-300 pl-10 pr-8 font-sans text-md font-normal text-black focus:border-grey-400 focus-visible:outline-none" placeholder="Search free high-resolution photos" autoFocus data-kg-unsplash-search onChange={handleSearch} />
                        </div>
                    </header>
                    {children}
                </div>
            </div>
        </>
    );
};

export default UnsplashSelector;
