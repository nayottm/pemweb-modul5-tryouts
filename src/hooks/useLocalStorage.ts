import { useCallback, useEffect, useState } from 'react';

type SetValueAction<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): readonly [T, (action: SetValueAction<T>) => void] {
  const readValue = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (action: SetValueAction<T>) => {
      setStoredValue((prev) => {
        const nextValue =
          typeof action === 'function'
            ? (action as (prevValue: T) => T)(prev)
            : action;

        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // Abaikan jika storage penuh atau diblokir browser
        }

        return nextValue;
      });
    },
    [key]
  );

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(readValue());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue] as const;
}