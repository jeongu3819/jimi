import React from 'react';
import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ state, onRestart, onMenu }: Props) {
  const diff = state.settings.difficulty === 'easy' ? '쉬움' : state.settings.difficulty === 'normal' ? '보통' : '어려움';
  const t = state.survivalTime;
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 100);
  const isMulti = state.settings.playerCount > 1;

  const sorted = [...state.players].sort((a, b) => {
    if (a.alive && !b.alive) return -1;
    if (!a.alive && b.alive) return 1;
    return b.deathTime - a.deathTime;
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>GAME OVER</h2>

        {isMulti && state.settings.gameMode === 'first_caught' && state.caughtPlayer && (
          <div style={styles.result}>
            <div style={{ color: '#ff4444', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>CAUGHT!</div>
            <div style={{ color: '#ff6666', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace', margin: '4px 0' }}>{state.caughtPlayer}</div>
            <div style={{ color: '#888', fontSize: 12 }}>커피 사세요~</div>
          </div>
        )}

        {isMulti && state.settings.gameMode === 'last_survivor' && state.winner && (
          <div style={{ ...styles.result, borderColor: 'rgba(68,221,85,0.3)' }}>
            <div style={{ color: '#44dd55', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>WINNER!</div>
            <div style={{ color: '#44dd55', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace' }}>{state.winner}</div>
          </div>
        )}

        {!isMulti && <div style={{ fontSize: 36, textAlign: 'center', margin: '8px 0 12px' }}>&#x1F480;</div>}

        {isMulti && (
          <div style={{ margin: '10px 0' }}>
            {sorted.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 6px', fontSize: 12, opacity: p.alive ? 1 : 0.5 }}>
                <span style={{ color: '#888', width: 18 }}>#{i + 1}</span>
                <span style={{ color: p.color, fontWeight: 'bold', flex: 1 }}>{p.name}</span>
                <span style={{ color: p.alive ? '#44dd55' : '#ff4444', fontSize: 11 }}>
                  {p.alive ? 'ALIVE' : `${p.deathTime.toFixed(1)}s`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.stats}>
          <Row label="생존 시간" value={`${min > 0 ? min + '분 ' : ''}${sec}.${String(ms).padStart(2, '0')}초`} />
          <Row label="웨이브" value={`${state.wave}`} />
          <Row label="처치 수" value={`${state.zombiesKilled}`} />
          <Row label="난이도" value={diff} />
        </div>

        <div style={styles.buttons}>
          <button onClick={onRestart} style={styles.restartBtn}>다시 시작</button>
          <button onClick={onMenu} style={styles.menuBtn}>메뉴로</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 },
  card: { background: 'rgba(20,20,30,0.95)', borderRadius: 14, padding: '24px 32px', minWidth: 320, maxWidth: 400, border: '1px solid rgba(255,50,50,0.3)', textAlign: 'center' },
  title: { color: '#ff4444', fontSize: 26, margin: 0, fontFamily: 'monospace', letterSpacing: 3 },
  result: { margin: '12px 0', padding: '10px 14px', background: 'rgba(255,50,50,0.05)', borderRadius: 8, border: '1px solid rgba(255,50,50,0.2)' },
  stats: { marginBottom: 14 },
  buttons: { display: 'flex', gap: 8 },
  restartBtn: { flex: 1, padding: '9px 0', background: 'linear-gradient(135deg,#cc2222,#ff4444)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 'bold', cursor: 'pointer' },
  menuBtn: { flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: '#ccc', fontSize: 13, cursor: 'pointer' },
};
