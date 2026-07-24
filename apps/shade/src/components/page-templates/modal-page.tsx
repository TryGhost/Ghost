import React from 'react';
import {Box, Text} from '@/components/primitives';
import {cn} from '@/lib/utils';

type ModalPageProps = React.ComponentPropsWithoutRef<typeof Box>;
type ModalPageTitleProps = Omit<React.ComponentPropsWithoutRef<typeof Text>, 'as'>;

const ModalPageTitle = React.forwardRef<HTMLElement, ModalPageTitleProps>(
    function ModalPageTitle({className, ...props}, ref) {
        return (
            <Text
                ref={ref}
                as='h1'
                className={cn('mb-8 text-4xl', className)}
                data-modal-page='title'
                leading='supertight'
                weight='bold'
                {...props}
            />
        );
    }
);

ModalPageTitle.displayName = 'ModalPage.Title';

const ModalPageRoot = React.forwardRef<HTMLDivElement, ModalPageProps>(
    function ModalPage({className, ...props}, ref) {
        return (
            <Box
                ref={ref}
                className={cn('w-full p-[8vmin] pt-5', className)}
                data-modal-page='root'
                {...props}
            />
        );
    }
);

ModalPageRoot.displayName = 'ModalPage';

type ModalPageComponent = typeof ModalPageRoot & {
    Title: typeof ModalPageTitle;
};

const ModalPage = Object.assign(ModalPageRoot, {
    Title: ModalPageTitle
}) as ModalPageComponent;

export {ModalPage, ModalPageTitle};
export type {ModalPageProps, ModalPageTitleProps};
