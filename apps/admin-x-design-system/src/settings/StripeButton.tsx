import clsx from 'clsx';
import React from 'react';
import Button, {ButtonProps} from '../global/Button';

export interface StripeButtonProps {
    label?: React.ReactNode;
    className?: string;
}

const StripeButton: React.FC<StripeButtonProps | ButtonProps> = ({label, className, ...props}) => {
    const classNames = clsx(
        'inline-block cursor-pointer rounded-md bg-[#625BF6] font-semibold text-white transition-all hover:opacity-90',
        label ? 'px-5 py-2 text-sm' : 'px-6 py-[9px]',
        className
    );

    if (!label) {
        label = <>
            <span className="sr-only">Connect with Stripe</span>
            <svg fill='none' height='16' width='132' xmlns='http://www.w3.org/2000/svg'><g clipPath='url(#clip0_1443_3527)' fill='#fff'><path d='M2 7.6c0-2.3 1.3-3.9 3-3.9 1.3 0 2.2.8 2.5 2l1.8-.6C8.7 3.2 7.2 2 5 2 2.1 2 0 4.3 0 7.6s2.1 5.6 5 5.6c2.2 0 3.7-1.2 4.3-3.1l-1.8-.6c-.3 1.3-1.2 2-2.5 2-1.8 0-3-1.6-3-3.9zm15.6 1.5C17.6 6.7 16 5 13.8 5 11.6 5 10 6.6 10 9.1c0 2.5 1.6 4.1 3.8 4.1 2.3 0 3.8-1.7 3.8-4.1zm-5.7 0c0-1.6.8-2.6 2-2.6s2 1 2 2.6-.8 2.6-2 2.6-2-1-2-2.6zM19 13h1.8V8.4c0-1.1.8-1.7 1.6-1.7 1 0 1.4.7 1.4 1.7V13h1.8V7.8c0-1.7-1-2.8-2.6-2.8-1 0-1.7.5-2.2 1v-.8H19V13zm8.5 0h1.8V8.4c0-1.1.8-1.7 1.6-1.7 1 0 1.4.7 1.4 1.7V13h1.8V7.8c0-1.7-1-2.8-2.6-2.8-1 0-1.7.5-2.2 1v-.8h-1.8V13zm11.8.2c1.6 0 2.8-.8 3.4-2.2l-1.5-.6c-.2.8-.9 1.3-1.8 1.3-1.2 0-2-.8-2.1-2.2h5.5v-.6c0-2.2-1.2-3.9-3.5-3.9-2.2 0-3.8 1.8-3.8 4.1 0 2.4 1.5 4.1 3.8 4.1zm-.1-6.7c1.1 0 1.7.8 1.7 1.6h-3.6c.2-1.1 1-1.6 1.9-1.6zm6.2 2.6c0-1.6.8-2.5 2.1-2.5 1 0 1.5.6 1.8 1.5l1.5-.8c-.4-1.3-1.6-2.2-3.3-2.2-2.2 0-3.9 1.7-3.9 4.1 0 2.4 1.6 4.1 3.9 4.1 1.7 0 2.9-1 3.3-2.3l-1.5-.8c-.2.9-.8 1.5-1.8 1.5-1.3-.1-2.1-1-2.1-2.6zM52 11c0 1.6.8 2.1 2.3 2.1.5 0 .9 0 1.2-.1v-1.5h-.7c-.6 0-1.1-.1-1.1-.8V6.6h1.7V5.1h-1.7V2.8h-1.8v2.3h-1.1v1.5h1.1L52 11zm11.7-5.9l-1.4 5.2-1.4-5.2h-1.8l2.4 7.9h1.6l1.4-5.2 1.4 5.2h1.6l2.4-7.9h-1.8l-1.5 5.2-1.4-5.2h-1.5zm7.1-1h1.8V2.3h-1.9l.1 1.8zm1.8 1h-1.8V13h1.8V5.1zm2 5.9c0 1.6.8 2.1 2.3 2.1.5 0 .9 0 1.2-.1v-1.5h-.7c-.6 0-1.1-.1-1.1-.8V6.6H78V5.1h-1.7V2.8h-1.7v2.3h-1.1v1.5h1.1V11zm4.9 2h1.8V8.4c0-1.1.8-1.7 1.6-1.7 1 0 1.4.7 1.4 1.7V13h1.8V7.8c0-1.7-1-2.8-2.6-2.8-1 0-1.7.5-2.2 1V2.3h-1.8V13zM117.1 15.4v-3c.4.3.9.7 1.9.7 1.9 0 3.6-1.5 3.6-4.9 0-3.1-1.7-4.8-3.6-4.8-1 0-1.7.5-2.1.9l-.1-.6h-2.3V16l2.6-.6zm1.2-9.7c1 0 1.6 1.1 1.6 2.5 0 1.5-.6 2.5-1.6 2.5-.6 0-1-.2-1.3-.5v-4c.4-.2.7-.5 1.3-.5zM127.701 13.2c1.3 0 2.2-.3 3-.7v-2.2c-.7.4-1.5.6-2.6.6s-1.9-.4-2.1-1.7h5.2v-1c0-2.8-1.3-4.9-3.8-4.9s-4.1 2.2-4.1 4.9c0 3.3 1.8 5 4.4 5zm-.3-7.7c.6 0 1.3.5 1.3 1.7h-2.8c.1-1.1.8-1.7 1.5-1.7zM107.6 6.5c.6-.9 1.7-.7 2-.6V3.4c-.4-.1-1.6-.4-2.1.8l-.2-.8H105v9.4h2.6V6.5zM95.602 10.2c0 .5-.4.6-1 .6-.9 0-2-.4-2.9-.9v2.6c1 .4 2 .6 2.9.6 2.2 0 3.7-1.1 3.7-3 0-3.2-4-2.6-4-3.8 0-.4.3-.6.9-.6.8 0 1.8.2 2.6.7V3.8c-.9-.4-1.7-.5-2.6-.5-2.1 0-3.6 1.1-3.6 3 0 3.1 4 2.6 4 3.9zM102.001 13.2c.8 0 1.5-.2 1.9-.4v-2.2c-.3.1-2 .6-2-1V5.8h2V3.5h-2V1.2l-2.6.6v8.6c0 1.6 1.1 2.8 2.7 2.8zM110.5.6v2.1l2.7-.5V0l-2.7.6zM113.1 3.5h-2.6v9.3h2.6V3.5z'/></g><defs><clipPath id='clip0_1443_3527'><path d='M0 0h132v16H0z' fill='#fff'/></clipPath></defs></svg>
        </>;
    }

    return (
        <Button className={classNames} label={label} unstyled {...props} />
    );
};

export default StripeButton;
