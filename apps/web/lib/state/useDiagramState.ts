'use client';

import { useContext } from 'react';
import { DiagramContext, type DiagramContextValue } from './DiagramContext';

/**
 * Hook for accessing shared diagram state.
 * Must be used inside a <DiagramProvider>.
 */
export function useDiagramState(): DiagramContextValue {
  const ctx = useContext(DiagramContext);
  if (!ctx) {
    throw new Error('useDiagramState must be used within a <DiagramProvider>');
  }
  return ctx;
}
