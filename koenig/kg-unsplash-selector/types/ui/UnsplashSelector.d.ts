import { ChangeEvent, FunctionComponent, ReactNode } from 'react';
interface UnsplashSelectorProps {
    closeModal: () => void;
    handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
    children: ReactNode;
}
declare const UnsplashSelector: FunctionComponent<UnsplashSelectorProps>;
export default UnsplashSelector;
