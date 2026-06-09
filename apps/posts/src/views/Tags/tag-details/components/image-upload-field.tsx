import {Button, FormControl, FormField, FormItem, FormLabel, FormMessage, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {toast} from 'sonner';
import {useFormContext} from 'react-hook-form';
import {useRef} from 'react';
import type {TagFormValues} from '../tag-form-schema';

type ImageFieldName = 'featureImage' | 'twitterImage' | 'ogImage';

export function ImageUploadField({name, label, uploadText}: {
    name: ImageFieldName;
    label: string;
    uploadText: string;
}) {
    const form = useFormContext<TagFormValues>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {mutateAsync: uploadImage, isLoading: isUploading} = useUploadImage();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        try {
            const response = await uploadImage({file});
            form.setValue(name, getImageUrl(response), {shouldDirty: true});
        } catch {
            toast.error('Failed to upload image');
        }
    };

    return (
        <FormField
            control={form.control}
            name={name}
            render={({field}) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div>
                            <input
                                ref={fileInputRef}
                                accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                aria-label={`${label} file`}
                                className="hidden"
                                type="file"
                                onChange={handleFileChange}
                            />
                            {field.value ? (
                                <div className="group relative overflow-hidden rounded-md border">
                                    <img alt={label} className="max-h-64 w-full object-cover" src={field.value} />
                                    <Button
                                        aria-label={`Remove ${label.toLowerCase()}`}
                                        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                                        size="icon"
                                        type="button"
                                        variant="destructive"
                                        onClick={() => form.setValue(name, '', {shouldDirty: true})}
                                    >
                                        <LucideIcon.Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted/50"
                                    disabled={isUploading}
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <LoadingIndicator size="sm" />
                                    ) : (
                                        <>
                                            <LucideIcon.ImagePlus className="size-5" />
                                            {uploadText}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
