import type {
  AddonEditorBlockRenderOutput,
  AddonEditorBlockRequest,
  AddonEditorContentModuleExports,
} from '../types.ts';

/**
 * Validates the durable strings produced by the provider-owned renderer. No
 * provider VNodes cross into Ghost's runtime.
 */
export async function renderEditorBlockModule(
  moduleExports: AddonEditorContentModuleExports,
  request: AddonEditorBlockRequest,
): Promise<AddonEditorBlockRenderOutput> {
  const output = await moduleExports.default(request);

  if (typeof output?.html !== 'string' || output.html.length === 0) {
    throw new Error('Add-on editor blocks must return static web content');
  }

  return {
    html: output.html,
    portableHtml: typeof output.portableHtml === 'string' ? output.portableHtml : '',
    css: typeof output.css === 'string' ? output.css : '',
    initialHeight: Number.isFinite(output.initialHeight) ? output.initialHeight : 320,
  };
}
