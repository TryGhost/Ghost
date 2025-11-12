import React, {createContext, useContext, useEffect, useState} from 'react';
import {Toaster} from '../components/ui/sonner';
import {createPortal} from 'react-dom';
// import {FetchKoenigLexical} from '../global/form/HtmlEditor';
import {GlobalDirtyStateProvider} from '../hooks/use-global-dirty-state';
import Icon from '../components/ui/icon';
import {SHADE_APP_NAMESPACES} from '@/ShadeApp';

interface ShadeContextType {
    isAnyTextFieldFocused: boolean;
    setFocusState: (value: boolean) => void;
    // fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
}

const ShadeContext = createContext<ShadeContextType>({
    isAnyTextFieldFocused: false,
    setFocusState: () => {},
    // fetchKoenigLexical: async () => {},
    darkMode: false
});

export const useShade = () => useContext(ShadeContext);

export const useFocusContext = () => {
    const context = useShade();
    if (!context) {
        throw new Error('useFocusContext must be used within a FocusProvider');
    }
    return context;
};

const ToasterPortal = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return mounted
        ? createPortal(
            <div className={SHADE_APP_NAMESPACES} style={{width: 'unset', height: 'unset'}}>
                <Toaster
                    icons={{
                        error: <Icon.ErrorFill className='text-red' />,
                        success: <Icon.SuccessFill className='text-green' />,
                        info: <Icon.InfoFill className='text-gray-500' />
                    }}
                    position='bottom-left'
                    toastOptions={{
                        classNames: {
                            title: '!mt-[-1px] !text-md !font-semibold !leading-tighter !tracking-[0.1px]',
                            description: '!text-gray-900 dark:!text-gray-300 !text-sm !mt-px',
                            icon: '!ml-0'
                        },
                        style: {
                            alignItems: 'flex-start',
                            maxWidth: '290px'
                        }
                    }}
                />
            </div>,
            document.body
        )
        : null;
};

interface ShadeProviderProps {
    // fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
    children: React.ReactNode;
}

const ShadeProvider: React.FC<ShadeProviderProps> = ({darkMode, children}) => {
    const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

    const setFocusState = (value: boolean) => {
        setIsAnyTextFieldFocused(value);
    };

    return (
        <ShadeContext.Provider value={{isAnyTextFieldFocused, setFocusState, darkMode}}>
            <GlobalDirtyStateProvider>
                {children}
                <ToasterPortal />
            </GlobalDirtyStateProvider>
        </ShadeContext.Provider>
    );
};

export default ShadeProvider;
