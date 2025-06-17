import React, {useState} from 'react';
import {
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {Post} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

interface PostSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
    postCount?: number;
    showPostCount?: boolean;
}

const PostSuccessModal: React.FC<PostSuccessModalProps> = ({
    isOpen,
    onClose,
    post,
    postCount,
    showPostCount = false
}) => {
    const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
    const {site} = useGlobalData();

    const handleCopyLink = async () => {
        if (post.url) {
            try {
                await navigator.clipboard.writeText(post.url);
                setCopyLinkSuccess(true);
                setTimeout(() => setCopyLinkSuccess(false), 1000);
            } catch (err) {
                // Error is handled silently as it's not critical
            }
        }
    };

    const encodedUrl = encodeURIComponent(post.url || '');
    const encodedTitleAndUrl = encodeURIComponent(`${post.title} ${post.url}`);

    // Get subscriber count info if available
    const getSubscriberInfo = () => {
        if (post.email?.email_count) {
            return `${post.email.email_count} subscriber${post.email.email_count !== 1 ? 's' : ''}`;
        }
        return null;
    };

    // Format publication time
    const getPublicationTime = () => {
        if (post.published_at) {
            const publishedDate = new Date(post.published_at);
            return publishedDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        }
        return null;
    };

    const subscriberInfo = getSubscriberInfo();
    const publicationTime = getPublicationTime();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-8">
                {/* Close button */}
                <button 
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                    type="button"
                    onClick={onClose}
                >
                    <LucideIcon.X className="h-5 w-5" />
                </button>

                <div className="space-y-6 text-center">
                    {/* Header */}
                    <div className="space-y-4">
                        <h1 className="text-2xl font-bold text-green-600">
                            Boom! It&apos;s out there.
                        </h1>
                        {showPostCount && postCount && (
                            <h2 className="text-2xl font-bold text-gray-900">
                                That&apos;s {postCount} post{postCount !== 1 ? 's' : ''} published.
                            </h2>
                        )}
                        <div className="text-gray-600">
                            <p>
                                Your post was {post.email_only ? 'sent' : 'published on your site'}
                                {subscriberInfo && post.email_only && (
                                    <> and sent to <strong>{subscriberInfo}</strong></>
                                )}
                                {subscriberInfo && !post.email_only && post.email && (
                                    <> and sent to <strong>{subscriberInfo}</strong></>
                                )}
                                {site?.title && (
                                    <> of <strong>{site.title}</strong></>
                                )}
                                {publicationTime && (
                                    <>, today at {publicationTime}.</>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Post Preview Card */}
                    <Card className="border text-left">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {post.title}
                                </h3>
                                <div className="text-sm text-gray-500">
                                    {post.slug}
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    {site?.title && <span>{site.title}</span>}
                                    {site?.title && <span>•</span>}
                                    <span>slarsbot</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Share Buttons */}
                    <div className="flex items-center justify-center gap-3">
                        <Button
                            className="h-12 w-12 p-0"
                            size="sm"
                            variant="outline"
                            asChild
                        >
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodedTitleAndUrl}`}
                                rel="noopener noreferrer"
                                target="_blank"
                                title="Share on X"
                            >
                                <LucideIcon.Twitter className="h-4 w-4" />
                            </a>
                        </Button>

                        <Button
                            className="h-12 w-12 p-0"
                            size="sm"
                            variant="outline"
                            asChild
                        >
                            <a
                                href={`https://threads.net/intent/post?text=${encodedTitleAndUrl}`}
                                rel="noopener noreferrer"
                                target="_blank"
                                title="Share on Threads"
                            >
                                <span className="text-sm font-bold">@</span>
                            </a>
                        </Button>

                        <Button
                            className="h-12 w-12 p-0"
                            size="sm"
                            variant="outline"
                            asChild
                        >
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                                rel="noopener noreferrer"
                                target="_blank"
                                title="Share on Facebook"
                            >
                                <LucideIcon.Facebook className="h-4 w-4" />
                            </a>
                        </Button>

                        <Button
                            className="h-12 w-12 p-0"
                            size="sm"
                            variant="outline"
                            asChild
                        >
                            <a
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                                rel="noopener noreferrer"
                                target="_blank"
                                title="Share on LinkedIn"
                            >
                                <LucideIcon.Linkedin className="h-4 w-4" />
                            </a>
                        </Button>

                        <Button
                            className={cn(
                                'flex-1 transition-colors',
                                copyLinkSuccess ? 'border-green-200 bg-green-50 text-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'
                            )}
                            size="sm"
                            variant={copyLinkSuccess ? 'outline' : 'default'}
                            onClick={handleCopyLink}
                        >
                            <LucideIcon.Link className="mr-2 h-4 w-4" />
                            {copyLinkSuccess ? 'Copied!' : 'Copy link'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PostSuccessModal; 