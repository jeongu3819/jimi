import React from 'react';
import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onPause: () => void;
}

export function HUD({ state, onPause }: Props) {
  const time = state.survivalTime;
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  const diffLabel = state.settings.difficulty === 'easy' ? '쉬움' :
    state.settings.difficulty === 'normal' ? '보통' : '어려움';

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <span style={styles.time}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span style={styles.score}>점수: {state.score.toLocaleString()}</span>
      </div>
      <div style={styles.center}>
        {state.player.onElevated && (
          <span style={styles.elevated}>높은 지형 위</span>
        )}
        {state.player.speedBoostTimer > 0 && (
          <span style={styles.boost}>⚡ 속도 증가!</span>
        )}
      </div>
      <div style={styles.right}>
        <span style={styles.info}>좀비: {state.zombies.length}</span>
        <span style={styles.info}>{diffLabel}</span>
        <button onClick={onPause} style={styles.pauseBtn}>⏸</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: 40,
  },
  left: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  center: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  right: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  time: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  score: {
    color: '#ffcc00',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  elevated: {
    color: '#44ff44',
    fontSize: 13,
    fontWeight: 'bold',
    padding: '2px 8px',
    background: 'rgba(68,255,68,0.1)',
    borderRadius: 4,
  },
  boost: {
    color: '#ffdd44',
    fontSize: 13,
    fontWeight: 'bold',
    padding: '2px 8px',
    background: 'rgba(255,221,68,0.1)',
    borderRadius: 4,
  },
  info: {
    color: '#aaa',
    fontSize: 13,
  },
  pauseBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 16,
    padding: '4px 10px',
    cursor: 'pointer',
  },
};
