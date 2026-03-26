import React from 'react';
import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onPause: () => void;
}

export function HUD({ state, onPause }: Props) {
  const t = state.survivalTime;
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const diff = state.settings.difficulty === 'easy' ? '쉬움' : state.settings.difficulty === 'normal' ? '보통' : '어려움';

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <span style={styles.time}>{String(min).padStart(2,'0')}:{String(sec).padStart(2,'0')}</span>
        <span style={styles.wave}>WAVE {state.wave}</span>
        <span style={styles.kills}>Kill: {state.zombiesKilled}</span>
      </div>
      <div style={styles.center}>
        {state.players.map(p => (
          <div key={p.id} style={{ ...styles.ps, opacity: p.alive ? 1 : 0.35, borderColor: p.color }}>
            <span style={{ color: p.color, fontWeight: 'bold', fontSize: 10 }}>{p.name}</span>
            {p.alive && (
              <>
                <span style={{ color: '#aaa', fontSize: 9 }}>HP:{Math.ceil(p.hp)}</span>
                <span style={{ color: '#ff8844', fontSize: 9 }}>D:{p.gun.damage}</span>
                {p.baseIndex === -1 && <span style={{ color: '#ffaa44', fontSize: 9 }}>NO BASE</span>}
                {p.shieldAvailable && <span style={{ color: '#66ccff', fontSize: 9 }}>&#x1F6E1;</span>}
                {p.shieldActive && <span style={{ color: '#66ccff', fontSize: 9 }}>&#x2728;</span>}
              </>
            )}
            {!p.alive && <span style={{ fontSize: 9, color: '#ff4444' }}>DEAD</span>}
          </div>
        ))}
      </div>
      <div style={styles.right}>
        <span style={styles.info}>Z:{state.zombies.filter(z => z.alive).length}</span>
        <span style={styles.info}>{diff}</span>
        {state.settings.visionMode === 'blackout' && <span style={{ color: '#666', fontSize: 10 }}>&#x1F319;</span>}
        <button onClick={onPause} style={styles.pauseBtn}>&#x23F8;</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'rgba(0,0,0,0.75)', borderBottom: '1px solid rgba(255,255,255,0.1)', minHeight: 36, gap: 6, flexWrap: 'wrap' },
  left: { display: 'flex', gap: 10, alignItems: 'center' },
  center: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  right: { display: 'flex', gap: 8, alignItems: 'center' },
  time: { color: '#fff', fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold' },
  wave: { color: '#ff8844', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' },
  kills: { color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
  ps: { display: 'flex', gap: 4, alignItems: 'center', padding: '2px 5px', background: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid', fontSize: 10 },
  info: { color: '#aaa', fontSize: 11 },
  pauseBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: '#fff', fontSize: 13, padding: '2px 7px', cursor: 'pointer' },
};
