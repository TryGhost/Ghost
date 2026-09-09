import createDebug from '@tryghost/debug';
import _ from 'lodash';
import type Frame from '../../frame.ts';
import * as utils from '../../utils/index.ts';

const debug = createDebug('serializers:input:all');

const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

/**
 * @description Shared serializer for all requests.
 *
 * Transforms certain options from API notation into model readable language/notation.
 *
 * e.g. API uses "include", but model layer uses "withRelated".
 */
const serializers = {
  all(_apiConfig: object, frame: Frame) {
    debug('serialize all');

    if (frame.options.include) {
      frame.options.withRelated = utils.options.trimAndLowerCase(frame.options.include);
      delete frame.options.include;
    }

    if (frame.options.fields) {
      frame.options.columns = utils.options.trimAndLowerCase(frame.options.fields);
      delete frame.options.fields;
    }

    if (frame.options.formats) {
      frame.options.formats = utils.options.trimAndLowerCase(frame.options.formats);
    }

    if (Array.isArray(frame.options.formats) && Array.isArray(frame.options.columns)) {
      frame.options.columns = frame.options.columns.concat(frame.options.formats);
    }

    const context = frame.options.context;
    if (!context || typeof context !== 'object' || !('internal' in context) || !context.internal) {
      debug('omit internal options');
      frame.options = _.omit(frame.options, INTERNAL_OPTIONS);
    }
  },
};

export default serializers;
