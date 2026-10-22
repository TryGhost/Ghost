import React from 'react';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

/**
 * Renders its children only while a Labs flag is on, for UI that doesn't exist in this
 * build until the flag is released. Nothing renders in its place.
 */
export const LabsFlagGate: React.FC<{ flag: string; children: React.ReactNode }> = ({
  flag,
  children,
}) => (useFeatureFlag(flag) ? children : null);
