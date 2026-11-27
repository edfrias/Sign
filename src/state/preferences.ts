import { useState } from 'react';

/** Preferencias pequeñas de este dispositivo, guardadas en localStorage. */
export const SOUND_KEY = 'sign.sound';

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback; // almacenamiento no disponible
  }
}

export function useStoredBoolean(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => readBoolean(key, fallback));
  const set = (v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* sin persistencia */
    }
  };
  return [value, set];
}
