import React from 'react';
import {Trash2, Upload} from 'lucide-react';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '@/settings/hooks/site/use-navigation-editor';

type NavigationIconUploadProps = {
    idPrefix: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    uploadIcon?: (file: File) => Promise<string | undefined>;
}

const NavigationIconUpload: React.FC<NavigationIconUploadProps> = ({idPrefix, item, clearError, updateItem, uploadIcon}) => (
    <ImageUpload className='size-[38px]'>
        {item.icon ? (
            <ImageUploadPreview>
                <ImageUploadImage alt='' className='size-[38px] rounded-lg object-contain p-2.5' src={item.icon} />
                <ImageUploadActions className='inset-0 flex items-center justify-center'>
                    <ImageUploadAction
                        aria-label='Remove navigation icon'
                        className='size-full rounded-lg bg-black/75 p-0 text-white hover:bg-black/90 hover:text-white'
                        onClick={() => {
                            clearError?.('icon');
                            updateItem?.({icon: ''});
                        }}
                    >
                        <Trash2 className='size-4' />
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
                onDropAccepted={([file]) => void uploadIcon?.(file).then((icon) => {
                    if (icon) {
                        updateItem?.({icon});
                    }
                })}
            >
                <Upload aria-hidden='true' className='size-4' />
            </ImageUploadDropzone>
        )}
    </ImageUpload>
);

export default NavigationIconUpload;
