import UnsplashImage from './UnsplashImage';
import type {UnsplashPhotoPayload} from './UnsplashImage';

export interface UnsplashZoomedProps {
    payload: UnsplashPhotoPayload;
    insertImage: (image: {src: string; caption: string; height: number; width: number; alt?: string; links: unknown}) => void;
    selectImg: (payload: UnsplashPhotoPayload | null) => void;
    zoomed?: UnsplashPhotoPayload | null | false;
}

function UnsplashZoomed({payload, insertImage, selectImg, zoomed}: UnsplashZoomedProps) {
    return (
        <div className="flex h-full grow basis-0 justify-center" data-kg-unsplash-zoomed onClick={() => selectImg(null)}>
            <UnsplashImage
                alt={payload.alt_description}
                height={payload.height}
                insertImage={insertImage}
                likes={payload.likes}
                links={payload.links}
                payload={payload}
                selectImg={selectImg}
                srcUrl={payload.urls.regular}
                urls={payload.urls}
                user={payload.user}
                width={payload.width}
                zoomed={zoomed}

            />
        </div>
    );
}

export default UnsplashZoomed;
