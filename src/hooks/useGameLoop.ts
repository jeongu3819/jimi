import { useEffect, useRef } from 'react';

export function useGameLoop(
  callback: (dt: number) => void,
  running: boolean
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!running) return;

    let lastTime = performance.now();
    let rafId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;
      callbackRef.current(dt);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [running]);
}
