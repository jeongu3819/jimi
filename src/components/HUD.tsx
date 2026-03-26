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

  const modeLabel = state.settings.gameMode === 'first_caught' ? 'First Caught' : 'Last Survivor';

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <span style={styles.time}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span style={styles.score}>점수: {state.score.toLocaleString()}</span>
      </div>
      <div style={styles.center}>
        {state.players.map(p => (
          <div key={p.id} style={{
            ...styles.playerStatus,
            opacity: p.alive ? 1 : 0.4,
            borderColor: p.color,
          }}>
            <span style={{ color: p.color, fontWeight: 'bold', fontSize: 11 }}>
              {p.name}
            </span>
            {p.alive && (
              <span style={styles.statusIcons}>
                {p.shieldAvailable && <span title="방어막" style={{ color: '#66ccff' }}>&#x1F6E1;</span>}
                {p.shieldActive && <span style={{ color: '#66ccff', animation: 'pulse 0.5s infinite' }}>&#x2728;</span>}
                {p.stunTimer > 0 && <span style={{ color: '#bbbbdd' }}>&#x1F4AB;</span>}
                {p.slowTimer > 0 && <span style={{ color: '#9977cc' }}>&#x1F578;</span>}
                {p.speedBoostTimer > 0 && <span style={{ color: '#ffdd44' }}>&#x26A1;</span>}
                {p.onElevated && <span style={{ color: p.elevatedTime > 3 ? '#ff4444' : '#44ff44' }}>&#9650;</span>}
              </span>
            )}
            {!p.alive && <span style={{ fontSize: 10, color: '#ff4444' }}>OUT</span>}
          </div>
        ))}
      </div>
      <div style={styles.right}>
        <span style={styles.info}>좀비: {state.zombies.length}</span>
        <span style={styles.info}>{diffLabel}</span>
        {state.settings.playerCount > 1 && <span style={styles.info}>{modeLabel}</span>}
        {state.settings.visionMode === 'blackout' && <span style={{ color: '#666', fontSize: 11 }}>&#x1F319;</span>}
        <button onClick={onPause} style={styles.pauseBtn}>&#x23F8;</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: 38,
    flexWrap: 'wrap',
    gap: 8,
  },
  left: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  center: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  right: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  time: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  score: {
    color: '#ffcc00',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  playerStatus: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    padding: '2px 6px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    border: '1px solid',
    fontSize: 11,
  },
  statusIcons: {
    display: 'flex',
    gap: 2,
    fontSize: 11,
  },
  info: {
    color: '#aaa',
    fontSize: 12,
  },
  pauseBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
    padding: '3px 8px',
    cursor: 'pointer',
  },
};
