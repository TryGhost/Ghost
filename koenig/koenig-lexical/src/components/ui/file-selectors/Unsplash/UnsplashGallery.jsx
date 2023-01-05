import React from 'react';
import UnsplashZoomed from './UnsplashZoomed';
import UnsplashImage from './UnsplashImage';

function UnsplashGalleryLoading() {
    return (
        <div data-kg-loader className="absolute inset-y-0 left-0 flex w-full items-center justify-center overflow-hidden pb-[8vh]">
            <div className="relative inline-block h-[50px] w-[50px] animate-spin rounded-full border border-black/10 before:z-10 before:mt-[7px] before:block before:h-[7px] before:w-[7px] before:rounded-full before:bg-grey-800"></div>
        </div>
    );
}

export function MasonryColumn(props) {
    return (
        <div className="mr-6 flex grow basis-0 flex-col justify-start last-of-type:mr-0">
            {props.children}
        </div>
    );
}

export function UnsplashGalleryColumns(props) {
    if (!props?.columns) {
        return null;
    }

    return (
        props?.columns.map((array, index) => (
            <MasonryColumn key={index}>
                {
                    array.map(payload => (
                        <UnsplashImage 
                            key={payload.id}
                            payload={payload}
                            srcUrl={payload.urls.regular}
                            alt={payload.alt_description}
                            links={payload.links}
                            likes={payload.likes}
                            user={payload.user}
                            urls={payload.urls}
                            height={payload.height}
                            width={payload.width}
                            selectImg={props?.selectImg}
                            insertImage={props?.insertImage}
                            zoomed={props?.zoomed}
                        />
                    ))
                }
            </MasonryColumn>
        ))
    );
}

export function GalleryLayout(props) {
    return (
        <div data-kg-unsplash-gallery className="relative h-full overflow-hidden">
            <div data-kg-unsplash-gallery-scrollref ref={props.galleryRef} className={`flex h-full w-full justify-center overflow-auto px-20 ${props?.zoomed ? 'pb-10' : ''}`}>
                {props.children}
                {props?.isLoading && <UnsplashGalleryLoading />}
            </div>
        </div>
    );
}

function UnsplashGallery({zoomed,
    error,
    galleryRef,
    isLoading, 
    dataset, 
    selectImg, 
    insertImage}) {
    if (zoomed) {
        return (
            <GalleryLayout
                galleryRef={galleryRef}
                zoomed={zoomed}>
                <UnsplashZoomed
                    payload={zoomed}
                    insertImage={insertImage}
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
            isLoading={isLoading}
            galleryRef={galleryRef}
            zoomed={zoomed}>
            <UnsplashGalleryColumns
                columns={dataset}
                selectImg={selectImg}
                insertImage={insertImage}
                zoomed={zoomed}
            />
        </GalleryLayout>
    );
}

export default UnsplashGallery;
