import UnsplashButton from './UnsplashButton';

export interface UnsplashPhotoPayload {
    id: string;
    alt_description?: string;
    height: number;
    width: number;
    likes: number;
    links: {html: string; download: string; [key: string]: string};
    urls: {regular: string; [key: string]: string};
    user: {
        name: string;
        links: {html: string; [key: string]: string};
        profile_image: {small: string; [key: string]: string};
    };
    [key: string]: unknown;
}

export interface UnsplashImageProps {
    payload: UnsplashPhotoPayload;
    srcUrl: string;
    links: {html: string; download: string; [key: string]: string};
    likes: number;
    user: UnsplashPhotoPayload['user'];
    alt?: string;
    urls: {regular: string; [key: string]: string};
    height: number;
    width: number;
    zoomed?: UnsplashPhotoPayload | null | false;
    insertImage: (image: {src: string; caption: string; height: number; width: number; alt?: string; links: unknown}) => void;
    selectImg: (payload: UnsplashPhotoPayload | null) => void;
}

function UnsplashImage({payload,
    srcUrl,
    links,
    likes,
    user,
    alt,
    urls,
    height,
    width,
    zoomed,
    insertImage,
    selectImg}: UnsplashImageProps) {
    return (
        <div
            className={`relative mb-6 block bg-grey-100 ${zoomed ? 'h-full w-[max-content] cursor-zoom-out' : 'w-full cursor-zoom-in'}`}
            data-kg-unsplash-gallery-item
            onClick={(e) => {
                e.stopPropagation();
                selectImg(zoomed ? null : payload);
            }}>
            <img
                alt={alt}
                className={`${zoomed ? 'h-full w-auto object-contain' : ''}`}
                height={height}
                loading='lazy'
                src={srcUrl}
                width={width}
                data-kg-unsplash-gallery-img
            />
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/5 via-black/5 to-black/30 p-5 opacity-0 transition-all ease-in-out hover:opacity-100">
                <div className="flex items-center justify-end">
                    <UnsplashButton
                        data-kg-button="unsplash-like"
                        href={`${links.html}/?utm_source=ghost&amp;utm_medium=referral&amp;utm_campaign=api-credit`}
                        icon="heart"
                        label={likes}
                        rel="noopener noreferrer"
                        target="_blank"
                    />
                    <UnsplashButton
                        data-kg-button="unsplash-download"
                        href={`${links.download}/?utm_source=ghost&amp;utm_medium=referral&amp;utm_campaign=api-credit&amp;force=true`}
                        icon="download"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <img alt="author" className="mr-2 size-8 rounded-full" src={user.profile_image.small} />
                        <div className="mr-2 truncate font-sans text-sm font-medium text-white">{user.name}</div>
                    </div>
                    <UnsplashButton label="Insert image" data-kg-unsplash-insert-button onClick={(e) => {
                        e.stopPropagation();
                        insertImage({
                            src: urls.regular.replace(/&w=1080/, '&w=2000'),
                            caption: `<span>Photo by <a href="${user.links.html}">${user.name}</a> / <a href="https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">Unsplash</a></span>`,
                            height: height,
                            width: width,
                            alt: alt,
                            links: links
                        });
                    }} />
                </div>
            </div>
        </div>
    );
}

export default UnsplashImage;
