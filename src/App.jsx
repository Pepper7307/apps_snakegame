import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import SnakeGame from './components/SnakeGame';
import Auth from './components/Auth';
import Leaderboard from './components/Leaderboard';
import './App.css';

// 整合:会话管理 + 视图切换(登录 / 游戏 / 排行榜)
function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // profiles.username
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('game'); // game | leaderboard

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTab('game');
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>
        加载会话中...
      </div>
    );
  }

  // 未登录:显示登录/注册
  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  // 已登录:顶部导航 + 视图切换
  return (
    <div className="App">
      <nav style={navStyle}>
        <div style={navLeftStyle}>
          <span style={brandStyle}>🐍 Snake</span>
          <button
            onClick={() => setTab('game')}
            style={tab === 'game' ? tabActiveStyle : tabStyle}
          >
            🎮 游戏
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            style={tab === 'leaderboard' ? tabActiveStyle : tabStyle}
          >
            🏆 排行榜
          </button>
        </div>
        <div style={navRightStyle}>
          <span style={userStyle}>
            👤 {profile?.username || user.email?.split('@')[0] || 'player'}
          </span>
          <button onClick={handleLogout} style={logoutStyle}>
            登出
          </button>
        </div>
      </nav>

      {tab === 'game' ? <SnakeGame user={user} /> : <Leaderboard user={user} />}
    </div>
  );
}

const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 20px',
  background: 'rgba(0,0,0,0.35)',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backdropFilter: 'blur(8px)',
};
const navLeftStyle = { display: 'flex', alignItems: 'center', gap: 8 };
const navRightStyle = { display: 'flex', alignItems: 'center', gap: 12 };
const brandStyle = {
  fontWeight: 700,
  marginRight: 8,
  color: '#4ecdc4',
  fontSize: 16,
};
const tabStyle = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
const tabActiveStyle = {
  ...tabStyle,
  background: '#4ecdc4',
  color: '#06231f',
  border: '1px solid #4ecdc4',
  fontWeight: 600,
};
const userStyle = { fontSize: 13, opacity: 0.9 };
const logoutStyle = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,80,80,0.4)',
  background: 'rgba(255,80,80,0.15)',
  color: '#ff8a8a',
  cursor: 'pointer',
  fontSize: 13,
};

export default App;
