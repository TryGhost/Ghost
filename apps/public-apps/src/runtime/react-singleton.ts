/**
 * React Singleton
 *
 * Ensures all features use the same React instance,
 * avoiding multiple React instances in the same page.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

export {React, ReactDOM};
export const createRoot = ReactDOM.createRoot;
