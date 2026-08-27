import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// 排行榜:调 get_leaderboard RPC,按每条 score 记录排名(同一玩家多次上榜)
// 个人最佳:登录后调 get_my_best_score RPC
const Leaderboard = ({ user }) => {
  const [rows, setRows] = useState([]);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lbReq, bestReq] = await Promise.all([
        supabase.rpc('get_leaderboard', { p_limit: 20 }),
        user
          ? supabase.rpc('get_my_best_score')
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (lbReq.error) throw lbReq.error;
      setRows(lbReq.data || []);
      if (user) {
        if (bestReq.error) throw bestReq.error;
        const b = bestReq.data && bestReq.data.length ? bestReq.data[0] : null;
        setBest(b);
      } else {
        setBest(null);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtDuration = (ms) => (ms ? `${(ms / 1000).toFixed(1)}s` : '-');

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>🏆 排行榜</h2>
      <p style={styles.subtitle}>按每局成绩排名,同玩家多次上榜 · 邮箱已脱敏</p>

      {user ? (
        best ? (
          <div style={styles.bestBox}>
            🎯 你的最佳:<b>{best.score}</b> 分 · {fmtDuration(best.duration_ms)} · {best.beans_eaten ?? 0} 豆
          </div>
        ) : (
          <div style={styles.bestBox}>🎯 你还没有上榜成绩,去玩一局吧!</div>
        )
      ) : (
        <div style={styles.bestBox}>💡 登录后可查看个人最佳</div>
      )}

      <button onClick={load} disabled={loading} style={styles.btn}>
        {loading ? '加载中...' : '🔄 刷新'}
      </button>

      {error && <div style={styles.error}>⚠️ {error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>用户名</th>
              <th style={styles.th}>邮箱</th>
              <th style={styles.th}>分数</th>
              <th style={styles.th}>时长</th>
              <th style={styles.th}>豆</th>
              <th style={styles.th}>时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={styles.empty}>
                  {loading ? '加载中...' : '还没有人上榜,快来当第一名!'}
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const mine = user && r.user_id === user.id;
              return (
                <tr key={i} style={mine ? styles.myRow : null}>
                  <td style={styles.td}>
                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                  </td>
                  <td style={styles.td}>{r.username}</td>
                  <td style={{ ...styles.td, ...styles.email }}>{r.email_masked}</td>
                  <td style={{ ...styles.td, ...styles.score }}>{r.score}</td>
                  <td style={styles.td}>{fmtDuration(r.duration_ms)}</td>
                  <td style={styles.td}>{r.beans_eaten ?? '-'}</td>
                  <td style={{ ...styles.td, ...styles.time }}>
                    {new Date(r.played_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  wrap: {
    maxWidth: 900,
    margin: '24px auto',
    padding: 20,
    color: '#fff',
  },
  title: { margin: '0 0 4px', fontSize: 22 },
  subtitle: { margin: '0 0 12px', fontSize: 13, opacity: 0.7 },
  bestBox: {
    marginBottom: 12,
    padding: '10px 12px',
    background: 'rgba(78,205,196,0.12)',
    border: '1px solid rgba(78,205,196,0.35)',
    borderRadius: 8,
    fontSize: 14,
  },
  btn: {
    marginBottom: 12,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  error: {
    marginBottom: 12,
    padding: '8px 10px',
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.4)',
    borderRadius: 8,
    fontSize: 13,
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 8px',
    textAlign: 'left',
    background: 'rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  },
  myRow: { background: 'rgba(255,217,61,0.10)' },
  email: { opacity: 0.75, fontFamily: 'monospace' },
  score: { fontWeight: 700, color: '#ffd93d' },
  time: { opacity: 0.6, fontSize: 12 },
  empty: {
    textAlign: 'center',
    padding: '24px',
    opacity: 0.7,
  },
};

export default Leaderboard;
