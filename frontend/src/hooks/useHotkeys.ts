import { useEffect, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

export function useHotkeys(keys: string, callback: KeyHandler) {
  // Use a ref so the effect doesn't constantly rebind on callback changes
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keysList = keys.toLowerCase().split('+');
      const isCmdOrCtrl = keysList.includes('cmd') || keysList.includes('ctrl');
      const isShift = keysList.includes('shift');
      const isAlt = keysList.includes('alt');
      const key = keysList.filter(k => !['cmd', 'ctrl', 'shift', 'alt'].includes(k))[0];

      const matchCmd = isCmdOrCtrl ? (event.metaKey || event.ctrlKey) : !(event.metaKey || event.ctrlKey);
      const matchShift = isShift ? event.shiftKey : !event.shiftKey;
      const matchAlt = isAlt ? event.altKey : !event.altKey;
      
      // Some keys like Escape or Enter
      let currentKey = event.key.toLowerCase();
      if (currentKey === 'escape') currentKey = 'esc';
      
      const matchKey = currentKey === key;

      if (matchCmd && matchShift && matchAlt && matchKey) {
        event.preventDefault();
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys]);
}
