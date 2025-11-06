'use client';

import { useEffect, useRef } from 'react';

/**
 * StartupTrigger - Client component that triggers startup tasks once
 * This component should be included in the root layout to trigger on app load
 */
export function StartupTrigger() {
  const triggered = useRef(false);

  useEffect(() => {
    // Only trigger once per client session
    if (triggered.current) return;
    triggered.current = true;

    // Trigger startup endpoint (silent background task)
    fetch('/api/startup')
      .catch(() => {
        // Silently ignore errors - this is a background task
      });
  }, []);

  // This component renders nothing
  return null;
}
