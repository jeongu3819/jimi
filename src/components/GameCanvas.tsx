import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameSettings } from '../game/types';
import { createInitialState, updateGameState, PlayerInput } from '../game/engine/GameEngine';
import { activateShield } from '../game/entities/Player';
import { renderGame } from '../renderer/CanvasRenderer';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';
import { GameOverScreen } from './GameOverScreen';

// Key bindings per player
const KEY_BINDINGS = [
  // P1: WASD + Space
  { up: 'w', down: 's', left: 'a', right: 'd', shield: ' ' },
  // P2: Arrow keys + Enter
  { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shield: 'enter' },
  // P3: IJKL + U
  { up: 'i', down: 'k', left: 'j', right: 'l', shield: 'u' },
  // P4: Numpad 8456 + 0
  { up: '8', down: '5', left: '4', right: '6', shield: '0' },
];

interface Props {
  settings: GameSettings;
  onBackToMenu: () => void;
}

export function GameCanvas({ settings, onBackToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(settings));
  const keysRef = useRef(new Set<string>());
  const shieldPressedRef = useRef(new Set<number>());
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(settings);
    setDisplayState(stateRef.current);
  }, [settings]);

  useEffect(() => {
    const allKeys = new Set<string>();
    for (let i = 0; i < settings.playerCount; i++) {
      const b = KEY_BINDINGS[i];
      allKeys.add(b.up); allKeys.add(b.down); allKeys.add(b.left); allKeys.add(b.right); allKeys.add(b.shield);
    }

    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (allKeys.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);

        // Shield press detection
        for (let i = 0; i < settings.playerCount; i++) {
          if (key === KEY_BINDINGS[i].shield) {
            shieldPressedRef.current.add(i);
          }
        }
      }
      if (key === 'escape') {
        const s = stateRef.current;
        if (s.phase === 'playing') {
          stateRef.current = { ...s, phase: 'paused' };
          setDisplayState(stateRef.current);
        } else if (s.phase === 'paused') {
          stateRef.current = { ...s, phase: 'playing' };
          setDisplayState(stateRef.current);
        }
      }
      if (key === 'r' && stateRef.current.phase === 'gameover') {
        resetGame();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      keysRef.current.clear();
      shieldPressedRef.current.clear();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [resetGame, settings.playerCount]);

  useGameLoop((dt) => {
    const k = keysRef.current;

    const inputs: PlayerInput[] = [];
    for (let i = 0; i < settings.playerCount; i++) {
      const b = KEY_BINDINGS[i];
      let dx = 0, dy = 0;
      if (k.has(b.left)) dx -= 1;
      if (k.has(b.right)) dx += 1;
      if (k.has(b.up)) dy -= 1;
      if (k.has(b.down)) dy += 1;
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
      }
      const shield = shieldPressedRef.current.has(i);
      inputs.push({ dx, dy, shield });
    }
    shieldPressedRef.current.clear();

    // Apply shield before engine update
    const state = stateRef.current;
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].shield && state.players[i]?.alive) {
        state.players[i] = activateShield(state.players[i]);
      }
    }

    stateRef.current = updateGameState(state, inputs, dt);
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
  const canvasWidth = map.cols * map.tileSize;
  const canvasHeight = map.rows * map.tileSize;

  return (
    <div style={styles.wrapper}>
      <HUD
        state={displayState}
        onPause={() => {
          const s = stateRef.current;
          if (s.phase === 'playing') {
            stateRef.current = { ...s, phase: 'paused' };
          } else if (s.phase === 'paused') {
            stateRef.current = { ...s, phase: 'playing' };
          }
          setDisplayState(stateRef.current);
        }}
      />
      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={styles.canvas}
        />
        {displayState.phase === 'paused' && (
          <div style={styles.pauseOverlay}>
            <div style={styles.pauseCard}>
              <h2 style={{ color: '#fff', margin: '0 0 12px' }}>일시정지</h2>
              <p style={{ color: '#aaa', margin: '0 0 16px', fontSize: 13 }}>
                ESC를 눌러 계속하기
              </p>
              <button onClick={onBackToMenu} style={styles.menuBtn}>
                메뉴로 돌아가기
              </button>
            </div>
          </div>
        )}
        {displayState.phase === 'gameover' && (
          <GameOverScreen
            state={displayState}
            onRestart={resetGame}
            onMenu={onBackToMenu}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#111',
  },
  canvasContainer: {
    position: 'relative',
    display: 'inline-block',
    margin: '12px auto',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  canvas: {
    display: 'block',
  },
  pauseOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  pauseCard: {
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    padding: '28px 36px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  menuBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    fontSize: 13,
    cursor: 'pointer',
  },
};
