import React from 'react';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '../../../../hooks/site/use-navigation-editor';
import {ImageUpload} from '@tryghost/admin-x-design-system';
import {Upload} from 'lucide-react';

type NavigationIconUploadProps = {
    idPrefix: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    uploadIcon?: (file: File) => Promise<string | undefined>;
}

const NavigationIconUpload: React.FC<NavigationIconUploadProps> = ({idPrefix, item, clearError, updateItem, uploadIcon}) => (
    <ImageUpload
        buttonContainerClassName='size-[38px]'
        deleteButtonClassName='invisible absolute inset-0! flex size-full! cursor-pointer items-center justify-center rounded-lg! bg-[rgba(0,0,0,0.75)] text-white group-hover/nav-icon:visible! hover:bg-black [@media(hover:none)]:visible!'
        fileUploadClassName='size-[38px] rounded-lg! border-0! bg-grey-100 p-0! text-grey-600 hover:text-black dark:bg-grey-900 dark:text-grey-400 dark:hover:text-white'
        fileUploadProps={{accept: 'image/*'}}
        height='38px'
        id={`${idPrefix}-icon-${item.id}`}
        imageClassName='size-[38px]! rounded-lg bg-grey-100 p-2.5 dark:bg-grey-900'
        imageContainerClassName='group/nav-icon size-[38px] items-center overflow-hidden rounded-lg'
        imageFit='contain'
        imageURL={item.icon || ''}
        width='38px'
        deleteButtonUnstyled
        onDelete={() => {
            clearError?.('icon');
            updateItem?.({icon: ''});
        }}
        onUpload={async (file) => {
            const icon = await uploadIcon?.(file);
            if (icon) {
                updateItem?.({icon});
            }
        }}
    >
        <>
            <Upload aria-hidden='true' className='size-4' />
            <span className='sr-only'>Upload icon</span>
        </>
    </ImageUpload>
);

export default NavigationIconUpload;
