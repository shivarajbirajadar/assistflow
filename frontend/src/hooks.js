import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';


/* =========================================================
   1. useDebounce
   Delays a value update until the user stops typing.
========================================================= */

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}


/* =========================================================
   2. useMediaQuery
   Tracks whether a media query currently matches.
========================================================= */

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}


/* =========================================================
   3. usePolling
   Repeatedly executes an async function at an interval.
========================================================= */

export function usePolling(
  callback,
  interval = 30000,
  enabled = true
) {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || interval <= 0) {
      return undefined;
    }

    let active = true;

    const execute = async () => {
      if (
        !active ||
        runningRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      runningRef.current = true;

      try {
        await callbackRef.current();
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        runningRef.current = false;
      }
    };

    const timer = setInterval(execute, interval);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [interval, enabled]);
}


/* =========================================================
   4. useUndo
   Stores a previous value and allows reverting an update.
========================================================= */

export function useUndo(initialValue) {
  const [value, setValue] = useState(initialValue);
  const [previousValue, setPreviousValue] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  const update = useCallback((newValue) => {
    setValue((currentValue) => {
      setPreviousValue(currentValue);
      setCanUndo(true);

      return typeof newValue === 'function'
        ? newValue(currentValue)
        : newValue;
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) {
      return;
    }

    setValue(previousValue);
    setPreviousValue(null);
    setCanUndo(false);
  }, [canUndo, previousValue]);

  const reset = useCallback((newValue = initialValue) => {
    setValue(newValue);
    setPreviousValue(null);
    setCanUndo(false);
  }, [initialValue]);

  return {
    value,
    update,
    undo,
    reset,
    canUndo,
  };
}


/* =========================================================
   5. useKeyboardShortcuts
   Registers keyboard shortcuts for dashboard actions.

   Example:
   useKeyboardShortcuts({
     '/': () => searchInputRef.current?.focus(),
     'Escape': () => closeModal(),
   });
========================================================= */

export function useKeyboardShortcuts(
  shortcuts = {},
  options = {}
) {
  const {
    enabled = true,
    preventDefault = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        );

      const key = event.key;

      const shortcut = shortcutsRef.current[key];

      if (!shortcut || isTyping) {
        return;
      }

      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (typeof shortcut !== 'function') {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      shortcut(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, preventDefault]);
}