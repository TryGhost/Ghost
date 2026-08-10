import ImgBgIcon from '../../assets/icons/kg-img-bg.svg?react';
import clsx from 'clsx';
import {Tooltip} from './Tooltip';

export const ImageUploadSwatch = ({
    showBackgroundImage,
    onClickHandler,
    dataTestId
}) => {
    return (
        <button
            className={clsx(
                `group relative flex size-6 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-100 text-black`,
                showBackgroundImage && 'outline outline-2 outline-green'
            )}
            data-testid={dataTestId}
            title="Image"
            type="button"
            onClick={onClickHandler}
        >
            <ImgBgIcon className="size-[1.4rem]" />
            <Tooltip label='Image' />
        </button>
    );
};
