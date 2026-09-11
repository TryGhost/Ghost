import {
  koenigFileUploadTypes,
  useKoenigFileUpload,
  type KoenigFileUploadType,
} from '@tryghost/admin-x-framework/hooks';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

const useEditorFileUpload = (type: KoenigFileUploadType = 'image') =>
  useKoenigFileUpload(type, EDITOR_REQUEST_OPTIONS);

/** The uploader Koenig cards use inside the editor, on the editor's request policy. */
export const editorFileUploader = {
  useFileUpload: useEditorFileUpload,
  fileTypes: koenigFileUploadTypes,
};
