import CloseIcon from '../assets/kg-close.svg?react';
import SearchIcon from '../assets/kg-search.svg?react';
import UnsplashIcon from '../assets/kg-card-type-unsplash.svg?react';
import { ChangeEvent, FunctionComponent, ReactNode } from 'react';

interface UnsplashSelectorProps {
  closeModal: () => void;
  handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}

const UnsplashSelector: FunctionComponent<UnsplashSelectorProps> = ({
  closeModal,
  handleSearch,
  children,
}) => {
  return (
    <>
      <div className="fixed inset-0 z-40 h-[100vh] bg-black opacity-60"></div>
      <div
        className="not-kg-prose bg-surface-panel fixed inset-8 z-50 overflow-hidden rounded shadow-xl"
        data-kg-modal="unsplash"
      >
        <button className="absolute right-6 top-6 cursor-pointer" type="button">
          <CloseIcon
            className="text-muted-foreground size-4 stroke-2"
            data-kg-modal-close-button
            onClick={() => closeModal()}
          />
        </button>
        <div className="flex h-full flex-col">
          <header className="flex shrink-0 items-center justify-between px-20 py-10">
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[2.8rem] font-bold">
              <UnsplashIcon className="mb-1" />
              Unsplash
            </h1>
            <div className="relative w-full max-w-sm">
              <SearchIcon className="text-muted-foreground absolute left-4 top-1/2 size-4 -translate-y-2" />
              <input
                className="border-border focus:border-muted-foreground placeholder:text-muted-foreground text-foreground h-10 w-full rounded-full border border-solid bg-transparent pl-10 pr-8 font-sans text-[1.4rem] font-normal focus-visible:outline-none"
                placeholder="Search free high-resolution photos"
                autoFocus
                data-kg-unsplash-search
                onChange={handleSearch}
              />
            </div>
          </header>
          {children}
        </div>
      </div>
    </>
  );
};

export default UnsplashSelector;
