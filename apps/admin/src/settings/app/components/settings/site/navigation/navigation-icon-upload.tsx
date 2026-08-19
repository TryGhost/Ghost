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
<<<<<<< HEAD
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
=======
    <ImageUpload className='size-[38px]'>
        {item.icon ? (
            <ImageUploadPreview>
                <ImageUploadImage alt='' className='size-[38px] rounded-lg object-contain p-2.5' src={item.icon} />
                <ImageUploadActions>
                    <ImageUploadAction
                        aria-label='Remove navigation icon'
                        onClick={() => {
                            clearError?.('icon');
                            updateItem?.({icon: ''});
                        }}
                    >
                        <Trash2 />
                    </ImageUploadAction>
                </ImageUploadActions>
            </ImageUploadPreview>
        ) : (
            <ImageUploadDropzone
                accept={{'image/*': []}}
                aria-label='Upload navigation icon'
                className='size-[38px] rounded-lg border-0 bg-muted p-0 text-muted-foreground hover:bg-muted hover:text-foreground'
                id={`${idPrefix}-icon-${item.id}`}
                inputAriaLabel='Upload navigation icon'
                onDropAccepted={async (files) => {
                    const icon = await uploadIcon?.(files[0]);
                    if (icon) {
                        updateItem?.({icon});
                    }
                }}
            >
                <Upload aria-hidden='true' className='size-4' />
            </ImageUploadDropzone>
        )}
>>>>>>> d58c21c507 (Fixed navigation icon remove button to use hover overlay)
    </ImageUpload>
);

export default NavigationIconUpload;
