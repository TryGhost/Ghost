import {H3} from '@/components/layout/heading';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {Check, Link, X} from 'lucide-react';
import React, {useState} from 'react';

interface PostShareModalProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
    emailOnly?: boolean;
    postURL?: string;
    primaryTitle?: string;
    secondaryTitle?: string;
    description?: React.ReactNode;
    featureImageURL?: string;
    postTitle?: string;
    postExcerpt?: string;
    faviconURL?: string;
    siteTitle?: string;
    author?: string;
    onClose?: () => void;
    children?: React.ReactNode;
}

const PostShareModal: React.FC<PostShareModalProps> = (
    {emailOnly = false,
        postURL = '',
        primaryTitle = 'Your post is published.',
        secondaryTitle = 'Spread the word!',
        description = '',
        featureImageURL = '',
        postTitle = '',
        postExcerpt = '',
        faviconURL = '',
        siteTitle = '',
        author = '',
        onClose = () => {},
        children,
        ...props}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(postURL);
            setIsCopied(true);
            // Reset the copied state after 2 seconds
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // Could add toast notification for copy failure
        }
    };

    const encodedPostTitle = encodeURIComponent(postTitle);
    const encodedPostURL = encodeURIComponent(postURL);
    const encodedPostURLTitle = encodeURIComponent(`${postTitle} ${postURL}`);

    return (
        <Dialog {...props}>
            <DialogTrigger className="cursor-pointer" asChild>
                {children}
            </DialogTrigger>
            <DialogContent className='max-h-[calc(100vh-16vmin)] max-w-[540px] overflow-y-auto p-8'>
                <div className='sticky top-0 ml-auto size-0'>
                    <Button className='absolute -right-5 -top-5 cursor-pointer p-2 text-muted-foreground hover:text-foreground [&_svg]:!size-6' size='lg' variant='link' onClick={onClose}><X size={24} strokeWidth={1} /></Button>
                </div>
                <DialogHeader className='relative -mt-5'>
                    <DialogTitle className='text-3xl font-bold leading-[1.15em]'>
                        <span className='text-green-500'>{primaryTitle}</span><br />
                        <span>{secondaryTitle}</span>
                    </DialogTitle>
                    {description &&
                        <DialogDescription className='mb-0 pb-0 pt-1 text-lg text-foreground'>
                            {description}
                        </DialogDescription>
                    }
                </DialogHeader>
                <a className='flex flex-col items-stretch overflow-hidden rounded-md border transition-all hover:border-muted-foreground/40' href={postURL} rel="noopener noreferrer" target='_blank'>
                    {featureImageURL &&
                        <div className='aspect-video bg-cover bg-center' style={{
                            backgroundImage: `url(${featureImageURL})`
                        }}></div>
                    }
                    <div className='p-6 pt-5'>
                        <H3>{postTitle}</H3>
                        {postExcerpt &&
                            <p>{postExcerpt}</p>
                        }
                        <div className='mt-2 flex items-start gap-2'>
                            <div className='mt-0.5 size-4 bg-cover bg-center' style={{
                                backgroundImage: `url(${faviconURL})`
                            }}></div>
                            <div className='flex gap-1'>
                                <strong>{siteTitle}</strong>
                                <span>&bull;</span>
                                <span>{author}</span>
                            </div>
                        </div>
                    </div>
                </a>
                <DialogFooter className='justify-between gap-6'>
                    {emailOnly ?
                        <Button className='cursor-pointer' type="submit" onClick={onClose}>
                            Close
                        </Button>
                        :
                        <>
                            <div className='flex items-center gap-2'>
                                <a className='flex h-[34px] w-14 items-center justify-center rounded-sm bg-muted px-3 hover:bg-muted-foreground/20 [&_svg]:h-4' href={`https://twitter.com/intent/tweet?text=${encodedPostTitle}%0A${encodedPostURL}`} rel="noopener noreferrer" target='_blank'>
                                    <svg aria-hidden="true" viewBox="0 0 24 24"><path className="social-x_svg__x" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                </a>
                                <a className='flex h-[34px] w-14 items-center justify-center rounded-sm bg-muted px-3 hover:bg-muted-foreground/20 [&_svg]:h-4' href={`https://threads.net/intent/post?text=${encodedPostURLTitle}`} rel="noopener noreferrer" target='_blank'>
                                    <svg fill="none" viewBox="0 0 18 18"><g clipPath="url(#social-threads_svg__clip0_351_18008)"><path d="M13.033 8.38a5.924 5.924 0 00-.223-.102c-.13-2.418-1.452-3.802-3.67-3.816h-.03c-1.327 0-2.43.566-3.11 1.597l1.22.837c.507-.77 1.304-.934 1.89-.934h.02c.73.004 1.282.217 1.639.63.26.302.433.72.519 1.245a9.334 9.334 0 00-2.097-.101c-2.109.121-3.465 1.351-3.374 3.06.047.868.478 1.614 1.216 2.1.624.413 1.428.614 2.263.568 1.103-.06 1.969-.48 2.572-1.25.459-.585.749-1.342.877-2.296.526.317.915.735 1.13 1.236.366.854.387 2.255-.756 3.398-1.003 1.002-2.207 1.435-4.028 1.448-2.02-.015-3.547-.663-4.54-1.925-.93-1.182-1.41-2.89-1.428-5.075.018-2.185.498-3.893 1.428-5.075.993-1.262 2.52-1.91 4.54-1.925 2.034.015 3.588.666 4.62 1.934.505.622.886 1.405 1.137 2.317l1.43-.382c-.305-1.122-.784-2.09-1.436-2.892C13.52 1.35 11.587.517 9.096.5h-.01C6.6.517 4.689 1.354 3.404 2.986 2.262 4.44 1.672 6.46 1.652 8.994v.012c.02 2.534.61 4.555 1.752 6.008C4.69 16.646 6.6 17.483 9.086 17.5h.01c2.21-.015 3.768-.594 5.051-1.876 1.68-1.678 1.629-3.78 1.075-5.07-.397-.927-1.154-1.678-2.189-2.175zm-3.816 3.587c-.924.052-1.884-.363-1.932-1.252-.035-.659.47-1.394 1.99-1.482a8.9 8.9 0 01.512-.014c.552 0 1.068.053 1.538.156-.175 2.187-1.203 2.542-2.108 2.592z" fill="#000"></path></g><defs><clipPath id="social-threads_svg__clip0_351_18008"><path d="M0 0h17v17H0z" fill="#fff" transform="translate(.5 .5)"></path></clipPath></defs></svg>
                                </a>
                                <a className='flex h-[34px] w-14 items-center justify-center rounded-sm bg-muted px-3 hover:bg-muted-foreground/20 [&_svg]:h-4' href={`https://www.facebook.com/sharer/sharer.php?u=${encodedPostURL}`} rel="noopener noreferrer" target='_blank'>
                                    <svg fill="none" viewBox="0 0 40 40"><title>social-facebook</title><path className="social-facebook_svg__fb" d="M20 40.004c11.046 0 20-8.955 20-20 0-11.046-8.954-20-20-20s-20 8.954-20 20c0 11.045 8.954 20 20 20z" fill="#1977f3"></path><path d="M27.785 25.785l.886-5.782h-5.546V16.25c0-1.58.773-3.125 3.26-3.125h2.522V8.204s-2.29-.39-4.477-.39c-4.568 0-7.555 2.767-7.555 7.781v4.408h-5.08v5.782h5.08v13.976a20.08 20.08 0 003.125.242c1.063 0 2.107-.085 3.125-.242V25.785h4.66z" fill="#fff"></path></svg>
                                </a>
                                <a className='flex h-[34px] w-14 items-center justify-center rounded-sm bg-muted px-3 hover:bg-muted-foreground/20 [&_svg]:h-4' href={`http://www.linkedin.com/shareArticle?mini=true&title=${encodedPostTitle}&url=${encodedPostURL}`} rel="noopener noreferrer" target='_blank'>
                                    <svg fill="none" viewBox="0 0 16 16"><g clipPath="url(#social-linkedin_svg__clip0_537_833)"><path className="social-linkedin_svg__linkedin" clipRule="evenodd" d="M1.778 16h12.444c.982 0 1.778-.796 1.778-1.778V1.778C16 .796 15.204 0 14.222 0H1.778C.796 0 0 .796 0 1.778v12.444C0 15.204.796 16 1.778 16z" fill="#007ebb" fillRule="evenodd"></path><path clipRule="evenodd" d="M13.778 13.778h-2.374V9.734c0-1.109-.421-1.729-1.299-1.729-.955 0-1.453.645-1.453 1.729v4.044H6.363V6.074h2.289v1.038s.688-1.273 2.322-1.273c1.634 0 2.804.997 2.804 3.061v4.878zM3.634 5.065c-.78 0-1.411-.636-1.411-1.421s.631-1.422 1.41-1.422c.78 0 1.411.637 1.411 1.422 0 .785-.631 1.421-1.41 1.421zm-1.182 8.713h2.386V6.074H2.452v7.704z" fill="#fff" fillRule="evenodd"></path></g><defs><clipPath id="social-linkedin_svg__clip0_537_833"><path d="M0 0h16v16H0z" fill="#fff"></path></clipPath></defs></svg>
                                </a>
                            </div>
                            <Button
                                className='!ml-0 grow cursor-pointer'
                                disabled={!postURL}
                                type="button"
                                onClick={handleCopyLink}
                            >
                                {isCopied ? <Check /> : <Link />}
                                {isCopied ? 'Copied!' : 'Copy link'}
                            </Button>
                        </>
                    }

                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PostShareModal;
