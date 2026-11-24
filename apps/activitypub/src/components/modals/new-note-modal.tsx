import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/ap-avatar';
import FeedItem from '@components/feed/feed-item';
import getHandle from '@utils/get-handle';
import { ActorProperties, ObjectProperties } from '@tryghost/admin-x-framework/api/activitypub';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  LoadingIndicator,
  Skeleton,
} from '@tryghost/shade/components';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { FILE_SIZE_ERROR_MESSAGE, MAX_FILE_SIZE } from '@utils/image';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { MAX_NOTE_IMAGES } from '@src/api/activitypub';
import { toast } from 'sonner';
import {
  uploadFile,
  useAccountForUser,
  useNoteMutationForUser,
  useReplyMutationForUser,
  useUserDataForUser,
} from '@hooks/use-activity-pub-queries';
import { useFeatureFlags } from '@src/lib/feature-flags';
import { useNavigateWithBasePath } from '@src/hooks/use-navigate-with-base-path';

interface ComposerImage {
  id: string;
  previewUrl: string;
  // Set once the upload has finished
  url: string | null;
  altText: string;
}

function getUploadErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    switch (error.statusCode) {
      case 413:
        return 'Image size exceeds limit.';
      case 415:
        return 'The file type is not supported.';
    }
  }
  return 'Failed to upload image. Try again.';
}

interface NewNoteModalProps extends ComponentPropsWithoutRef<typeof Dialog> {
  children?: ReactNode;
  replyTo?: {
    object: ObjectProperties;
    actor: ActorProperties;
  };
  onReply?: () => void;
  onReplyError?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({
  children,
  replyTo,
  onReply,
  onReplyError,
  onOpenChange,
  ...props
}) => {
  const { data: user } = useUserDataForUser('index');
  const noteMutation = useNoteMutationForUser('index', user);
  const replyMutation = useReplyMutationForUser('index', user);
  const { data: account, isLoading: isLoadingAccount } = useAccountForUser('index', 'me');
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const altTextInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ComposerImage[]>([]);
  // Mirrors `images` so handlers can read the latest list while uploads are still running
  const imagesRef = useRef<ComposerImage[]>([]);
  const updateImages = useCallback((update: (current: ComposerImage[]) => ComposerImage[]) => {
    imagesRef.current = update(imagesRef.current);
    setImages(imagesRef.current);
  }, []);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [altInputImageId, setAltInputImageId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const navigate = useNavigateWithBasePath();

  const MAX_CONTENT_LENGTH = 500;

  // Sync external open prop with internal state
  useEffect(() => {
    if (props.open !== undefined) {
      setIsOpen(props.open);
    }
  }, [props.open]);

  useEffect(() => {
    const modalIsOpen = props.open !== undefined ? props.open : isOpen;
    if (modalIsOpen) {
      const timer = setTimeout(() => {
        setIsSticky(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsSticky(false);
    }
  }, [isOpen, props.open]);

  // The service only accepts several images once `images` is deployed, so that part of the
  // composer is behind a flag until it is
  const { isEnabled } = useFeatureFlags();
  const imageLimit = isEnabled('noteImages') ? MAX_NOTE_IMAGES : 1;
  const isDisabled = !content.trim() || !user || isPosting || content.length > MAX_CONTENT_LENGTH;
  const isImageUploading = images.some((image) => image.url === null);
  const altInputImage = images.find((image) => image.id === altInputImageId);

  const handlePost = useCallback(async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent || !user) {
      return;
    }

    const uploadedImages = images.flatMap((image) =>
      image.url ? [{ url: image.url, altText: image.altText || undefined }] : [],
    );

    try {
      setIsPosting(true);

      if (replyTo) {
        await replyMutation.mutateAsync({
          inReplyTo: replyTo.object.id,
          content: trimmedContent,
          images: uploadedImages,
        });
        onReply?.();
      } else {
        await noteMutation.mutateAsync({
          content: trimmedContent,
          images: uploadedImages,
        });
        navigate('/notes');
      }

      setIsOpen(false);
      if (onOpenChange) {
        onOpenChange(false);
      }
      toast.success(replyTo ? 'Reply posted' : 'Note posted');
    } catch {
      if (replyTo) {
        onReplyError?.();
      }
      // Handle error case if needed
      // console.error('Failed to create post:', error);
    } finally {
      setIsPosting(false);
    }
  }, [
    content,
    user,
    replyTo,
    replyMutation,
    noteMutation,
    images,
    onReply,
    onReplyError,
    setIsOpen,
    navigate,
    onOpenChange,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Focus textarea when modal opens
  useEffect(() => {
    const modalIsOpen = props.open !== undefined ? props.open : isOpen;
    if (modalIsOpen && textareaRef.current) {
      // Small delay to ensure modal is fully rendered
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, props.open]);

  // Focus alt text input when it becomes visible
  useEffect(() => {
    if (altInputImageId && altTextInputRef.current) {
      const timeoutId = setTimeout(() => {
        altTextInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [altInputImageId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isDisabled && !isImageUploading) {
          handlePost();
        }
      }
    };

    const modalIsOpen = props.open !== undefined ? props.open : isOpen;
    if (modalIsOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, props.open, isDisabled, isImageUploading, handlePost]);

  const removeImage = useCallback(
    (id: string) => {
      const image = imagesRef.current.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      updateImages((current) => current.filter((item) => item.id !== id));
      setAltInputImageId((current) => (current === id ? null : current));
    },
    [updateImages],
  );

  const addImages = useCallback(
    async (files: File[]) => {
      const room = imageLimit - imagesRef.current.length;
      if (files.length > room) {
        toast.error(
          imageLimit === 1
            ? 'You can only add one image.'
            : `You can add up to ${formatNumber(imageLimit)} images.`,
        );
      }

      const added = files
        .slice(0, Math.max(room, 0))
        .filter((file) => {
          if (file.size > MAX_FILE_SIZE) {
            toast.error(FILE_SIZE_ERROR_MESSAGE);
            return false;
          }
          return true;
        })
        .map((file) => ({ file, id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file) }));

      if (added.length === 0) {
        return;
      }

      const newImages = added.map(({ id, previewUrl }) => ({
        id,
        previewUrl,
        url: null,
        altText: '',
      }));
      updateImages((current) => [...current, ...newImages]);

      await Promise.all(
        added.map(async ({ file, id }) => {
          try {
            const url = await uploadFile(file);
            updateImages((current) =>
              current.map((image) => (image.id === id ? { ...image, url } : image)),
            );
          } catch (error) {
            removeImage(id);
            toast.error(getUploadErrorMessage(error));
          }
        }),
      );
    },
    [imageLimit, removeImage, updateImages],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent | ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }

      const files = Array.from(items)
        .filter((item) => item.type.indexOf('image') !== -1)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length > 0) {
        e.preventDefault();
        await addImages(files);
      }
    },
    [addImages],
  );

  useEffect(() => {
    const modalIsOpen = props.open !== undefined ? props.open : isOpen;
    if (modalIsOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, props.open, handlePaste]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await addImages(files);
  };

  const handleClearImage = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    removeImage(id);
  };

  const handleToggleAltInput = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setAltInputImageId(altInputImageId === id ? null : id);
  };

  const handleContentClick = () => {
    textareaRef.current?.focus();
  };

  useEffect(() => {
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  let placeholder = "What's new?";
  if (replyTo) {
    const attributedTo = replyTo.object.attributedTo || {};
    if (
      typeof attributedTo === 'object' &&
      'preferredUsername' in attributedTo &&
      'id' in attributedTo
    ) {
      placeholder = `Reply to ${getHandle(attributedTo as ActorProperties)}...`;
    }
  }

  return (
    <Dialog
      open={props.open !== undefined ? props.open : isOpen}
      onOpenChange={(open) => {
        if (open) {
          setContent('');
          imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
          updateImages(() => []);
          setAltInputImageId(null);
          if (imageInputRef.current) {
            imageInputRef.current.value = '';
          }
        }

        setIsOpen(open);

        if (onOpenChange) {
          onOpenChange(open);
        }
      }}
      {...(props.open !== undefined ? {} : props)}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`max-h-[80vh] min-h-[240px] gap-0 overflow-y-auto pb-0`}
        data-testid="new-note-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="hidden">
          <DialogTitle>{replyTo ? 'Reply' : 'New note'}</DialogTitle>
          <DialogDescription>Post your thoughts to the Social web</DialogDescription>
        </DialogHeader>
        {replyTo && (
          <FeedItem
            actor={replyTo.actor}
            allowDelete={false}
            commentCount={replyTo.object.replyCount ?? 0}
            isCompact={true}
            layout="reply"
            likeCount={replyTo.object.likeCount ?? 0}
            object={replyTo.object}
            repostCount={replyTo.object.repostCount ?? 0}
            type={replyTo.object.type === 'Article' ? 'Article' : 'Note'}
            onClick={() => {}}
          />
        )}
        <div
          className={`flex ${images.length === 0 ? 'min-h-36' : ''} cursor-text items-start gap-3`}
          onClick={handleContentClick}
        >
          <div className="sticky top-0">
            <APAvatar author={user as ActorProperties} />
          </div>
          <FormPrimitive.Root asChild>
            <div className="-mt-0.5 flex w-full flex-col gap-0.5">
              {isLoadingAccount ? (
                <Skeleton className="w-10" />
              ) : (
                <span className="break-anywhere min-w-0 truncate font-semibold whitespace-nowrap text-black dark:text-white">
                  {account?.name}
                </span>
              )}
              <FormPrimitive.Field name="content" asChild>
                <FormPrimitive.Control asChild>
                  <textarea
                    ref={textareaRef}
                    autoFocus={true}
                    className="ap-textarea break-anywhere w-full resize-none bg-transparent text-[1.5rem] dark:placeholder:text-gray-700"
                    data-testid="note-textarea"
                    placeholder={placeholder}
                    rows={1}
                    value={content}
                    onChange={handleChange}
                  />
                </FormPrimitive.Control>
              </FormPrimitive.Field>
              <FormPrimitive.Field name="image" asChild>
                <FormPrimitive.Control asChild>
                  <input
                    ref={imageInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    type="file"
                    multiple
                    onChange={handleImageChange}
                  />
                </FormPrimitive.Control>
              </FormPrimitive.Field>
            </div>
          </FormPrimitive.Root>
        </div>
        {images.length > 0 && (
          <div
            className={
              images.length === 1
                ? 'mt-6 flex w-full'
                : 'mt-6 grid w-full auto-rows-[160px] grid-cols-2 gap-2'
            }
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`group relative flex w-full items-center justify-center ${images.length === 1 ? 'min-h-[200px]' : ''} ${images.length === 3 && index === 0 ? 'row-span-2' : ''}`}
                data-testid="image-preview"
              >
                <img
                  alt={`Image attachment preview ${formatNumber(index + 1)}`}
                  className={`${images.length === 1 ? 'max-h-[320px]' : 'h-full'} w-full rounded-sm object-cover outline-1 -outline-offset-1 outline-black/10 ${image.url === null && 'opacity-10'}`}
                  src={image.previewUrl}
                />
                {image.url === null && (
                  <div className="absolute leading-[0]">
                    <LoadingIndicator size="md" />
                  </div>
                )}
                <Button
                  aria-label={`Remove image ${formatNumber(index + 1)}`}
                  className="absolute top-3 right-3 size-8 bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
                  onClick={handleClearImage(image.id)}
                >
                  <LucideIcon.Trash2 />
                </Button>
                {image.url !== null && (
                  <Button
                    aria-label={`Edit alt text for image ${formatNumber(index + 1)}`}
                    className={`absolute bottom-3 left-3 h-6 px-2 py-0 text-white ${altInputImageId !== image.id ? 'bg-black/60 hover:bg-black/80' : 'bg-green-500 hover:bg-green-500'}`}
                    onClick={handleToggleAltInput(image.id)}
                  >
                    Alt
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {altInputImage && altInputImage.url !== null && (
          <div className="mt-1">
            <Input
              ref={altTextInputRef}
              className="w-full border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-0 dark:bg-(--color-popover) dark:text-white dark:placeholder:text-gray-800"
              placeholder={
                images.length === 1
                  ? 'Type alt text for image (optional)'
                  : `Type alt text for image ${formatNumber(images.indexOf(altInputImage) + 1)} (optional)`
              }
              type="text"
              value={altInputImage.altText}
              onChange={(e) =>
                updateImages((current) =>
                  current.map((image) =>
                    image.id === altInputImage.id ? { ...image, altText: e.target.value } : image,
                  ),
                )
              }
            />
          </div>
        )}
        <DialogFooter
          className={`${isSticky ? 'sticky' : 'static'} bottom-0 flex-row bg-background py-6 dark:bg-surface-elevated-2`}
        >
          <Button
            className="mr-auto w-[34px]"
            disabled={images.length >= imageLimit}
            variant="outline"
            onClick={() => imageInputRef.current?.click()}
          >
            <LucideIcon.Image />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className={`text-sm ${content.length >= MAX_CONTENT_LENGTH ? 'text-red-500' : content.length >= MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}
            >
              {content.length}/{MAX_CONTENT_LENGTH}
            </div>
            <Button
              data-testid="post-button"
              disabled={isDisabled || isImageUploading}
              loading={isPosting}
              onClick={handlePost}
            >
              Post
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewNoteModal;
