import React, { useCallback, useMemo, useState } from 'react';
import {
  ProtoVariantsContext,
  type ProtoSlot,
  readStoredSelections,
  writeStoredSelections,
} from './proto-variants';

// The provider half of proto-variants — split from the context module the same
// way lane-switcher is split from lanes (react-refresh/only-export-components).
//
// A lane opts into variant switching by wrapping its SCREENS in this with the
// slots it offers; the lane switcher renders whatever slots the surrounding
// provider carries. Selections live in localStorage (see proto-variants), so
// the two screens of one lane — list and detail — can each wrap themselves and
// still agree on what's selected: the store is the shared state, the provider
// just makes it reactive within a screen.
export const ProtoVariantsProvider: React.FC<{
  slots: ProtoSlot[];
  children: React.ReactNode;
}> = ({ slots, children }) => {
  const [selections, setSelections] = useState(readStoredSelections);
  const select = useCallback((slotId: string, variantId: string) => {
    setSelections((prev) => {
      const next = { ...prev, [slotId]: variantId };
      writeStoredSelections(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ slots, selections, select }), [slots, selections, select]);
  return <ProtoVariantsContext.Provider value={value}>{children}</ProtoVariantsContext.Provider>;
};
