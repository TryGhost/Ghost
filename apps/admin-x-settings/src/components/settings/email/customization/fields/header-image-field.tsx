import {Hint, Icon, ImageUpload} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

type HeaderImageFieldProps = {
    value: string;
    onChange: (value: string) => void;
};

export const HeaderImageField: React.FC<HeaderImageFieldProps> = ({value, onChange}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    return (
        <div>
            <div className='mb-2 text-[1.3rem] font-semibold leading-tight'>Header image</div>
            <div className='flex-column flex gap-1'>
                <ImageUpload
                    deleteButtonClassName='!top-1 !right-1'
                    height={value ? '66px' : '64px'}
                    id='header-image'
                    imageURL={value || undefined}
                    onDelete={() => {
                        onChange('');
                    }}
                    onUpload={async (file) => {
                        try {
                            const imageUrl = getImageUrl(await uploadImage({file}));
                            onChange(imageUrl);
                        } catch (e) {
                            handleError(e);
                        }
                    }}
                >
                    <Icon colorClass='text-grey-700 dark:text-grey-300' name='picture' />
                </ImageUpload>
                <Hint>1200×600 recommended. Use a transparent PNG for best results on any background.</Hint>
            </div>
        </div>
    );
};
