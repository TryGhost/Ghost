import type {ExportDOMOptions} from '@tryghost/kg-default-nodes';

export interface RendererOptions extends ExportDOMOptions {
    usedIdAttributes?: Record<string, number>;
    renderData?: Map<number, unknown>;
}
