import { dequal } from 'dequal';
import type { Layout } from '@tryghost/app-contracts/bridge';

export const sameLayout = (a: Layout | undefined, b: Layout) => a !== undefined && dequal(a, b);
