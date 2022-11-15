function isObject(value) {
  return value !== null && typeof value === 'object';
}

function computeFingerprint(param) {
  return `${String(param.in)}-${String(param.name)}`;
}

export const oasOpParams = (params, _opts, { path }) => {
  /**
   * This function verifies:
   *
   * 1. Operations must have unique `name` + `in` parameters.
   * 2. Operation cannot have both `in:body` and `in:formData` parameters
   * 3. Operation must have only one `in:body` parameter.
   */

  if (!Array.isArray(params)) return;

  if (params.length < 2) return;

  const results = [];

  const count = {
    body: [],
    formData: [],
  };
  const list = [];
  const duplicates = [];

  let index = -1;

  for (const param of params) {
    index++;

    if (!isObject(param)) continue;

    // skip params that are refs
    if ('$ref' in param) continue;

    // Operations must have unique `name` + `in` parameters.
    const fingerprint = computeFingerprint(param);
    if (list.includes(fingerprint)) {
      duplicates.push(index);
    } else {
      list.push(fingerprint);
    }

    if (typeof param.in === 'string' && param.in in count) {
      count[param.in].push(index);
    }
  }

  if (duplicates.length > 0) {
    for (const i of duplicates) {
      results.push({
        message: 'A parameter in this operation already exposes the same combination of "name" and "in" values.',
        path: [...path, i],
      });
    }
  }

  if (count.body.length > 0 && count.formData.length > 0) {
    results.push({
      message: 'Operation must not have both "in:body" and "in:formData" parameters.',
    });
  }

  if (count.body.length > 1) {
    for (let i = 1; i < count.body.length; i++) {
      results.push({
        message: 'Operation must not have more than a single instance of the "in:body" parameter.',
        path: [...path, count.body[i]],
      });
    }
  }

  return results;
};

export default oasOpParams;
