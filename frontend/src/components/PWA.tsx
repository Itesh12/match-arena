'use client';

import { useEffect } from 'react';

export default function PWA() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW registered:', reg))
        .catch((err) => console.log('SW failed:', err));
    } else if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
      // Allow localhost for development testing
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return null;
}
