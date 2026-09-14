import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {useCallback} from 'react';
import {useQueryClient} from '@tanstack/react-query';

export type FormFieldType = 'text' | 'email' | 'textarea' | 'number' | 'select' | 'checkbox';

export type FormField = {
    id: string;
    name: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    placeholder?: string;
    options?: string[];
};

export type FormSchema = {
    fields: FormField[];
    custom_css?: string;
};

export type Form = {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'archived';
    schema: string | FormSchema;
    custom_css?: string;
    created_at?: string;
    updated_at?: string;
    count?: {
        submissions?: number;
    };
};

export type FormSubmission = {
    id: string;
    form_id: string;
    data: string | Record<string, unknown>;
    created_at: string;
    updated_at?: string;
};

export interface FormsResponseType {
    meta?: Meta;
    forms: Form[];
}

export interface FormSubmissionsResponseType {
    meta?: Meta;
    form_submissions: FormSubmission[];
}

const formsDataType = 'FormsResponseType';
const submissionsDataType = 'FormSubmissionsResponseType';

export const useBrowseForms = createQuery<FormsResponseType>({
    dataType: formsDataType,
    path: '/forms/'
});

export const useBrowseFormById = createQueryWithId<FormsResponseType>({
    dataType: formsDataType,
    path: id => `/forms/${id}/`
});

export const useCreateForm = createMutation<FormsResponseType, Partial<Form>>({
    method: 'POST',
    path: () => '/forms/',
    body: form => ({forms: [form]}),
    invalidateQueries: {
        dataType: formsDataType
    }
});

export const useEditForm = createMutation<FormsResponseType, Partial<Form> & {id: string}>({
    method: 'PUT',
    path: form => `/forms/${form.id}/`,
    body: form => ({forms: [form]}),
    invalidateQueries: {
        dataType: formsDataType
    }
});

export const useDeleteForm = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/forms/${id}/`,
    invalidateQueries: {
        dataType: formsDataType
    }
});

export const useInvalidateForms = () => {
    const queryClient = useQueryClient();

    return useCallback(() => {
        queryClient.invalidateQueries({queryKey: [formsDataType]});
    }, [queryClient]);
};

export const useBrowseSubmissions = createQueryWithId<FormSubmissionsResponseType>({
    dataType: submissionsDataType,
    path: formId => `/forms/${formId}/submissions/`
});

export const useDeleteSubmission = createMutation<void, {formId: string; submissionId: string}>({
    method: 'DELETE',
    path: ({formId, submissionId}) => `/forms/${formId}/submissions/${submissionId}/`,
    invalidateQueries: {
        dataType: submissionsDataType
    }
});

export const useInvalidateSubmissions = () => {
    const queryClient = useQueryClient();

    return useCallback(() => {
        queryClient.invalidateQueries({queryKey: [submissionsDataType]});
    }, [queryClient]);
};

export interface FormAttachedPost {
    id: string;
    title: string;
    slug: string;
    type: 'post' | 'page';
    status: string;
    updated_at?: string;
}

export interface FormAttachedPostsResponseType {
    posts: FormAttachedPost[];
}

const attachedPostsDataType = 'FormAttachedPostsResponseType';

export const useBrowseFormAttachedPosts = createQueryWithId<FormAttachedPostsResponseType>({
    dataType: attachedPostsDataType,
    path: formId => `/forms/${formId}/posts/`
});

export const useAttachFormToPost = createMutation<{post_id: string; form_id: string; attached: boolean}, {formId: string; postId: string; placement?: 'start' | 'end'}>({
    method: 'POST',
    path: ({formId}) => `/forms/${formId}/attach/`,
    body: ({postId, placement}) => ({post_id: postId, placement: placement || 'end'}),
    invalidateQueries: {
        dataType: attachedPostsDataType
    }
});

export const useDetachFormFromPost = createMutation<{post_id: string; form_id: string; detached: boolean}, {formId: string; postId: string}>({
    method: 'POST',
    path: ({formId}) => `/forms/${formId}/detach/`,
    body: ({postId}) => ({post_id: postId}),
    invalidateQueries: {
        dataType: attachedPostsDataType
    }
});

