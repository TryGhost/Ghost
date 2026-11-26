import type * as React from 'react';

/** Sets a ref the way React would, whether it's a callback or an object. */
export function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}
