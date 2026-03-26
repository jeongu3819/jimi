import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameSettings } from '../game/types';
import { createInitialState, updateGameState, PlayerInput } from '../game/engine/GameEngine';
import { activateShield } from '../game/entities/Player';
import { renderGame } from '../renderer/CanvasRenderer';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';
import { GameOverScreen } from './GameOverScreen';

// 모든 플레이어 동일 조작 (각자 PC에서 플레이)
const UNIFIED_KEYS = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: ' ', shield: 'shift' };
const UNIFIED_KEYS_ALT = { up: 'w', down: 's', left: 'a', right: 'd', shoot: ' ', shield: 'shift' };
const KEY_BINDINGS = [UNIFIED_KEYS, UNIFIED_KEYS, UNIFIED_KEYS, UNIFIED_KEYS, UNIFIED_KEYS];

interface Props {
  settings: GameSettings;
  onBackToMenu: () => void;
}

export function GameCanvas({ settings, onBackToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(settings));
  const keysRef = useRef(new Set<string>());
  const shieldPressRef = useRef(new Set<number>());
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(settings);
    setDisplayState(stateRef.current);
  }, [settings]);

  useEffect(() => {
    const gameKeys = new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','shift','escape','r']);

    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (gameKeys.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        if (key === 'shift') shieldPressRef.current.add(0); // shield for local player
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
    const onBlur = () => { keysRef.current.clear(); shieldPressRef.current.clear(); };

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

    // 모든 플레이어 동일 조작 (방향키 + WASD 둘 다 지원)
    let dx = 0, dy = 0;
    if (k.has('arrowleft') || k.has('a')) dx -= 1;
    if (k.has('arrowright') || k.has('d')) dx += 1;
    if (k.has('arrowup') || k.has('w')) dy -= 1;
    if (k.has('arrowdown') || k.has('s')) dy += 1;
    if (dx !== 0 && dy !== 0) { const l = Math.SQRT2; dx /= l; dy /= l; }
    const shoot = k.has(' ');
    const shield = shieldPressRef.current.has(0);

    // 모든 플레이어에게 동일 입력 전달 (나중에 네트워크 분리 시 각자 입력)
    const inputs: PlayerInput[] = [];
    for (let i = 0; i < settings.playerCount; i++) {
      inputs.push({ dx, dy, shoot, shield });
    }
    shieldPressRef.current.clear();

    // Apply shields
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
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#111' },
  canvasContainer: { position: 'relative', display: 'inline-block', margin: '8px auto', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 4 },
  canvas: { display: 'block' },
  pauseOverlay: { position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 },
  pauseCard: { background: 'rgba(20,20,30,0.95)', borderRadius: 12, padding: '24px 32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' },
  menuBtn: { padding: '8px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#ccc', fontSize: 13, cursor: 'pointer' },
};
