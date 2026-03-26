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

  const isMulti = state.settings.playerCount > 1;
  const modeLabel = state.settings.gameMode === 'first_caught' ? 'First Caught' : 'Last Survivor';

  // Sort players by death time (alive first, then by latest death)
  const sortedPlayers = [...state.players].sort((a, b) => {
    if (a.alive && !b.alive) return -1;
    if (!a.alive && b.alive) return 1;
    return b.deathTime - a.deathTime;
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>GAME OVER</h2>

        {isMulti && state.settings.gameMode === 'first_caught' && state.caughtPlayer && (
          <div style={styles.resultBox}>
            <div style={styles.caughtLabel}>CAUGHT!</div>
            <div style={styles.caughtName}>{state.caughtPlayer}</div>
            <div style={styles.caughtSub}>커피 사세요~</div>
          </div>
        )}

        {isMulti && state.settings.gameMode === 'last_survivor' && state.winner && (
          <div style={{ ...styles.resultBox, borderColor: 'rgba(68,221,85,0.3)' }}>
            <div style={{ ...styles.caughtLabel, color: '#44dd55' }}>WINNER!</div>
            <div style={{ ...styles.caughtName, color: '#44dd55' }}>{state.winner}</div>
          </div>
        )}

        {!isMulti && (
          <div style={{ fontSize: 40, textAlign: 'center', margin: '8px 0 16px' }}>&#x1F480;</div>
        )}

        {isMulti && (
          <div style={styles.ranking}>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} style={{
                ...styles.rankRow,
                opacity: p.alive ? 1 : 0.6,
              }}>
                <span style={{ color: '#888', fontSize: 12, width: 20 }}>#{i + 1}</span>
                <span style={{ color: p.color, fontWeight: 'bold', flex: 1 }}>{p.name}</span>
                <span style={{ color: p.alive ? '#44dd55' : '#ff4444', fontSize: 12 }}>
                  {p.alive ? 'ALIVE' : `${p.deathTime.toFixed(1)}s`}
                </span>
              </div>
            ))}
          </div>
        )}

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
            <span style={styles.statLabel}>맵 / 난이도</span>
            <span style={styles.statValue}>{state.map.nameKo} / {diffLabel}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>좀비</span>
            <span style={styles.statValue}>
              {state.settings.zombieCount} &rarr; {state.zombies.length}
            </span>
          </div>
          {isMulti && (
            <div style={styles.statRow}>
              <span style={styles.statLabel}>모드</span>
              <span style={styles.statValue}>{modeLabel}</span>
            </div>
          )}
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
    background: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  card: {
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 16,
    padding: '28px 36px',
    minWidth: 340,
    maxWidth: 420,
    border: '1px solid rgba(255,50,50,0.3)',
    textAlign: 'center',
  },
  title: {
    color: '#ff4444',
    fontSize: 28,
    margin: 0,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  resultBox: {
    margin: '16px 0',
    padding: '12px 16px',
    background: 'rgba(255,50,50,0.05)',
    borderRadius: 10,
    border: '1px solid rgba(255,50,50,0.2)',
  },
  caughtLabel: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  caughtName: {
    color: '#ff6666',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    margin: '4px 0',
  },
  caughtSub: {
    color: '#888',
    fontSize: 13,
  },
  ranking: {
    margin: '12px 0',
    padding: '8px 0',
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    fontSize: 13,
  },
  stats: {
    marginBottom: 16,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttons: {
    display: 'flex',
    gap: 10,
  },
  restartBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'linear-gradient(135deg, #cc2222, #ff4444)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  menuBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    fontSize: 14,
    cursor: 'pointer',
  },
};
