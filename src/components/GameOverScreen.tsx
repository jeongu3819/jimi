import React from 'react';
import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ state, onRestart, onMenu }: Props) {
  const diffLabel = state.settings.difficulty === 'easy' ? '쉬움' :
    state.settings.difficulty === 'normal' ? '보통' : '어려움';

  const time = state.survivalTime;
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 100);

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>GAME OVER</h2>
        <div style={styles.skull}>💀</div>

        <div style={styles.stats}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>생존 시간</span>
            <span style={styles.statValue}>
              {minutes > 0 ? `${minutes}분 ` : ''}{seconds}.{String(ms).padStart(2, '0')}초
            </span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>점수</span>
            <span style={styles.statValue}>{state.score.toLocaleString()}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>맵</span>
            <span style={styles.statValue}>{state.map.nameKo}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>난이도</span>
            <span style={styles.statValue}>{diffLabel}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>좀비 수</span>
            <span style={styles.statValue}>
              {state.settings.zombieCount} → {state.zombies.length}
            </span>
          </div>
        </div>

        <div style={styles.buttons}>
          <button onClick={onRestart} style={styles.restartBtn}>
            다시 시작
          </button>
          <button onClick={onMenu} style={styles.menuBtn}>
            메뉴로
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.75)',
    zIndex: 10,
  },
  card: {
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 16,
    padding: '36px 44px',
    minWidth: 320,
    border: '1px solid rgba(255,50,50,0.3)',
    textAlign: 'center',
  },
  title: {
    color: '#ff4444',
    fontSize: 32,
    margin: 0,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  skull: {
    fontSize: 48,
    margin: '12px 0 20px',
  },
  stats: {
    marginBottom: 24,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttons: {
    display: 'flex',
    gap: 12,
  },
  restartBtn: {
    flex: 1,
    padding: '12px 0',
    background: 'linear-gradient(135deg, #cc2222, #ff4444)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  menuBtn: {
    flex: 1,
    padding: '12px 0',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    fontSize: 15,
    cursor: 'pointer',
  },
};
