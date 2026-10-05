import UnsplashButton from './UnsplashButton';
import { FC, MouseEvent } from 'react';
import { InsertImageFn, Photo, SelectImgFn, User } from '../UnsplashTypes';

// Unsplash's API guidelines ask for this referral on every link back to Unsplash.
const REFERRAL = { utm_source: 'ghost', utm_medium: 'referral', utm_campaign: 'api-credit' };

function withReferral(href: string, params: Record<string, string> = {}): string {
  const url = new URL(href);
  for (const [key, value] of Object.entries({ ...REFERRAL, ...params })) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

export interface UnsplashImageProps {
  payload: Photo;
  srcUrl: string;
  links: Photo['links'];
  likes: number;
  user: User;
  alt: string;
  urls: { regular: string };
  height: number;
  width: number;
  zoomed: Photo | null;
  insertImage: InsertImageFn;
  selectImg: SelectImgFn;
}

const UnsplashImage: FC<UnsplashImageProps> = ({
  payload,
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
  selectImg,
}) => {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    selectImg(zoomed ? null : payload);
  };

  return (
    <div
      className={`relative mb-6 block ${zoomed ? 'h-full w-[max-content] cursor-zoom-out' : 'w-full cursor-zoom-in'}`}
      style={{ backgroundColor: payload.color || 'transparent' }}
      data-kg-unsplash-gallery-item
      onClick={handleClick}
    >
      <img
        alt={alt}
        className={`${zoomed ? 'h-full w-auto object-contain' : 'block h-auto'}`}
        height={height}
        loading="lazy"
        src={srcUrl}
        width={width}
        data-kg-unsplash-gallery-img
      />
      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/5 via-black/5 to-black/30 p-5 opacity-0 transition-all ease-in-out focus-within:opacity-100 hover:opacity-100">
        <div className="flex items-center justify-end gap-3">
          <UnsplashButton
            data-kg-button="unsplash-like"
            href={withReferral(links.html)}
            icon="heart"
            label={likes.toString()}
            rel="noopener noreferrer"
            target="_blank"
          />
          <UnsplashButton
            data-kg-button="unsplash-download"
            href={withReferral(links.download, { force: 'true' })}
            icon="download"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              alt="author"
              className="mr-2 size-8 rounded-full"
              src={user.profile_image.medium}
            />
            <div className="mr-2 truncate font-sans text-[1.2rem] font-medium text-white">
              {user.name}
            </div>
          </div>
          <UnsplashButton
            href="#"
            label="Insert image"
            data-kg-unsplash-insert-button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertImage({
                src: urls.regular.replace(/&w=1080/, '&w=2000'),
                caption: `<span>Photo by <a href="${withReferral(user.links.html)}">${user.name}</a> / <a href="${withReferral('https://unsplash.com/')}">Unsplash</a></span>`,
                height: height,
                width: width,
                alt: alt,
                links: links,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default UnsplashImage;
