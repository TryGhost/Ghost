import UnsplashImage from './UnsplashImage';
import UnsplashZoomed from './UnsplashZoomed';
import type {UnsplashPhotoPayload} from './UnsplashImage';

function UnsplashGalleryLoading() {
    return (
        <div className="absolute inset-y-0 left-0 flex w-full items-center justify-center overflow-hidden pb-[8vh]" data-kg-loader>
            <div className="relative inline-block size-[50px] animate-spin rounded-full border border-black/10 before:z-10 before:mt-[7px] before:block before:size-[7px] before:rounded-full before:bg-grey-800"></div>
        </div>
    );
}

export function MasonryColumn({children}: {children: React.ReactNode}) {
    return (
        <div className="mr-6 flex grow basis-0 flex-col justify-start last-of-type:mr-0">
            {children}
        </div>
    );
}

interface UnsplashGalleryColumnsProps {
    columns?: UnsplashPhotoPayload[][];
    insertImage?: (image: {src: string; caption: string; height: number; width: number; alt?: string; links: unknown}) => void;
    selectImg?: (payload: UnsplashPhotoPayload | null) => void;
    zoomed?: UnsplashPhotoPayload | null | false;
}

export function UnsplashGalleryColumns(props: UnsplashGalleryColumnsProps) {
    if (!props?.columns) {
        return null;
    }

    return (
        props?.columns.map(array => (
            <MasonryColumn key={array[0]?.id}>
                {
                    array.map(payload => (
                        <UnsplashImage
                            key={payload.id}
                            alt={payload.alt_description}
                            height={payload.height}
                            insertImage={props?.insertImage ?? (() => {})}
                            likes={payload.likes}
                            links={payload.links}
                            payload={payload}
                            selectImg={props?.selectImg ?? (() => {})}
                            srcUrl={payload.urls.regular}
                            urls={payload.urls}
                            user={payload.user}
                            width={payload.width}
                            zoomed={props?.zoomed}
                        />
                    ))
                }
            </MasonryColumn>
        ))
    );
}

interface GalleryLayoutProps {
    galleryRef?: React.Ref<HTMLDivElement>;
    zoomed?: UnsplashPhotoPayload | null | false;
    isLoading?: boolean;
    children?: React.ReactNode;
    dataset?: UnsplashPhotoPayload[][];
}

export function GalleryLayout(props: GalleryLayoutProps) {
    return (
        <div className="relative h-full overflow-hidden" data-kg-unsplash-gallery>
            <div ref={props.galleryRef} className={`flex size-full justify-center overflow-auto px-20 ${props?.zoomed ? 'pb-10' : ''}`} data-kg-unsplash-gallery-scrollref>
                {props.children}
                {props?.isLoading && <UnsplashGalleryLoading />}
            </div>
        </div>
    );
}

interface UnsplashGalleryProps {
    zoomed?: UnsplashPhotoPayload | null | false;
    error?: string;
    galleryRef?: React.Ref<HTMLDivElement>;
    isLoading?: boolean;
    dataset?: UnsplashPhotoPayload[][];
    selectImg: (payload: UnsplashPhotoPayload | null) => void;
    insertImage: (image: {src: string; caption: string; height: number; width: number; alt?: string; links: unknown}) => void;
}

function UnsplashGallery({zoomed,
    error,
    galleryRef,
    isLoading,
    dataset,
    selectImg,
    insertImage}: UnsplashGalleryProps) {
    if (zoomed) {
        return (
            <GalleryLayout
                galleryRef={galleryRef}
                zoomed={zoomed}>
                <UnsplashZoomed
                    insertImage={insertImage}
                    payload={zoomed}
                    selectImg={selectImg}
                    zoomed={zoomed}
                />
            </GalleryLayout>
        );
    }

    if (error) {
        return (
            <GalleryLayout
                galleryRef={galleryRef}
                zoomed={zoomed}>
                <div className="flex h-full flex-col items-center justify-center">
                    <h1 className="mb-4 text-2xl font-bold">Error</h1>
                    <p className="text-lg font-medium">{error}</p>
                </div>
            </GalleryLayout>
        );
    }

    return (
        <GalleryLayout
            dataset={dataset}
            galleryRef={galleryRef}
            isLoading={isLoading}
            zoomed={zoomed}>
            <UnsplashGalleryColumns
                columns={dataset}
                insertImage={insertImage}
                selectImg={selectImg}
                zoomed={zoomed}
            />
        </GalleryLayout>
    );
}

export default UnsplashGallery;
