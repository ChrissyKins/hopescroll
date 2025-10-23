import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting state to localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial value if no stored value exists
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    if (!isHydrated) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
      } finally {
        setIsHydrated(true);
      }
    }
  }, [key, isHydrated]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
