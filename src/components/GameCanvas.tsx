import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameSettings } from '../game/types';
import { createInitialState, updateGameState, PlayerInput } from '../game/engine/GameEngine';
import { renderGame } from '../renderer/CanvasRenderer';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';
import { GameOverScreen } from './GameOverScreen';

interface Props {
  settings: GameSettings;
  onBackToMenu: () => void;
}

export function GameCanvas({ settings, onBackToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(settings));
  const keysRef = useRef(new Set<string>());
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(settings);
    setDisplayState(stateRef.current);
  }, [settings]);

  useEffect(() => {
    const gameKeys = new Set([
      'arrowup','arrowdown','arrowleft','arrowright',
      'w','a','s','d','escape','r',
    ]);

    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (gameKeys.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
      if (key === 'escape') {
        const s = stateRef.current;
        if (s.phase === 'playing') stateRef.current = { ...s, phase: 'paused' };
        else if (s.phase === 'paused') stateRef.current = { ...s, phase: 'playing' };
        setDisplayState(stateRef.current);
      }
      if (key === 'r' && stateRef.current.phase === 'gameover') {
        resetGame();
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const onBlur = () => keysRef.current.clear();

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [resetGame]);

  useGameLoop((dt) => {
    const k = keysRef.current;

    let dx = 0, dy = 0;
    if (k.has('arrowleft') || k.has('a')) dx -= 1;
    if (k.has('arrowright') || k.has('d')) dx += 1;
    if (k.has('arrowup') || k.has('w')) dy -= 1;
    if (k.has('arrowdown') || k.has('s')) dy += 1;
    if (dx !== 0 && dy !== 0) { const l = Math.SQRT2; dx /= l; dy /= l; }

    const inputs: PlayerInput[] = [];
    for (let i = 0; i < settings.playerCount; i++) {
      inputs.push({ dx, dy });
    }

    stateRef.current = updateGameState(stateRef.current, inputs, dt);
    setDisplayState(stateRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderGame(ctx, stateRef.current);
  }, displayState.phase === 'playing');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderGame(ctx, stateRef.current);
  }, []);

  const map = stateRef.current.map;

  return (
    <div style={styles.wrapper}>
      <HUD state={displayState} onPause={() => {
        const s = stateRef.current;
        if (s.phase === 'playing') stateRef.current = { ...s, phase: 'paused' };
        else if (s.phase === 'paused') stateRef.current = { ...s, phase: 'playing' };
        setDisplayState(stateRef.current);
      }} />
      <div style={styles.canvasContainer}>
        <canvas ref={canvasRef} width={map.cols * map.tileSize} height={map.rows * map.tileSize} style={styles.canvas} />
        {displayState.phase === 'paused' && (
          <div style={styles.pauseOverlay}>
            <div style={styles.pauseCard}>
              <h2 style={{ color: '#fff', margin: '0 0 12px' }}>일시정지</h2>
              <p style={{ color: '#aaa', margin: '0 0 16px', fontSize: 13 }}>ESC를 눌러 계속하기</p>
              <button onClick={onBackToMenu} style={styles.menuBtn}>메뉴로</button>
            </div>
          </div>
        )}
        {displayState.phase === 'gameover' && (
          <GameOverScreen state={displayState} onRestart={resetGame} onMenu={onBackToMenu} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#080808' },
  canvasContainer: { position: 'relative', display: 'inline-block', margin: '8px auto', border: '2px solid rgba(255,50,50,0.15)', borderRadius: 4 },
  canvas: { display: 'block' },
  pauseOverlay: { position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 },
  pauseCard: { background: 'rgba(20,20,30,0.95)', borderRadius: 12, padding: '24px 32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' },
  menuBtn: { padding: '8px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#ccc', fontSize: 13, cursor: 'pointer' },
};
