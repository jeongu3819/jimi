import { useEffect, useRef } from 'react';

export interface InputState {
  dx: number;
  dy: number;
}

export function useInput(): InputState {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keys.current.add(key);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      keys.current.clear();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Return current direction based on held keys
  const k = keys.current;
  let dx = 0;
  let dy = 0;
  if (k.has('a') || k.has('arrowleft')) dx -= 1;
  if (k.has('d') || k.has('arrowright')) dx += 1;
  if (k.has('w') || k.has('arrowup')) dy -= 1;
  if (k.has('s') || k.has('arrowdown')) dy += 1;

  // Normalize diagonal
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  return { dx, dy };
}
