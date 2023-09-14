import React, {useEffect, useRef} from 'react';
import clsx from 'clsx';
import {useScrollSectionContext} from '../../hooks/useScrollSection';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title: React.ReactNode;
    navid?: string;
    keywords?: string[];
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SettingNavItem: React.FC<Props> = ({
    title,
    navid = '',
    keywords,
    onClick = () => {}
}) => {
    const ref = useRef<HTMLLIElement | null>(null);
    const {currentSection} = useScrollSectionContext();
    const {checkVisible} = useSearch();

    const classNames = clsx(
        'block px-0 py-1 text-sm dark:text-white',
        (currentSection === navid) && 'font-bold',
        !checkVisible(keywords || []) && 'hidden'
    );

    useEffect(() => {
        if (ref.current && currentSection === navid) {
            const bounds = ref.current.getBoundingClientRect();

            const scrollableParent = document.getElementById('admin-x-settings-sidebar')!;
            const parentBounds = scrollableParent.getBoundingClientRect();
            const offsetTop = parentBounds.top + 40;

            if (bounds.top >= offsetTop && bounds.left >= parentBounds.left && bounds.right <= parentBounds.right && bounds.bottom <= parentBounds.bottom) {
                return;
            }

            if (!['auto', 'scroll'].includes(getComputedStyle(scrollableParent).overflowY)) {
                return;
            }

            // If this is the first nav item, scroll to top
            if (scrollableParent.querySelector('[data-setting-nav-item]') === ref.current) {
                scrollableParent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else if (bounds.top < offsetTop) {
                scrollableParent.scrollTo({
                    top: scrollableParent.scrollTop + bounds.top - offsetTop,
                    behavior: 'smooth'
                });
            } else {
                scrollableParent.scrollTo({
                    top: scrollableParent.scrollTop + bounds.top - parentBounds.top - parentBounds.height + bounds.height + 4,
                    behavior: 'smooth'
                });
            }
        }
    }, [currentSection, navid]);

    return (
        <li ref={ref} data-setting-nav-item><button className={classNames} name={navid} type='button' onClick={onClick}>{title}</button></li>
    );
};

export default SettingNavItem;
