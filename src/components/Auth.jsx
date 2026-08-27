import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 登录/注册组件。注册时通过 options.data.username 写入,触发器会落到 profiles.username
const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() || email.split('@')[0] },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          // 需要邮箱确认(取决于 Supabase Auth 是否开启 Confirm email)
          setInfo('注册成功!请到邮箱点击确认链接后再登录。');
        } else if (data.session) {
          onAuthSuccess?.(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onAuthSuccess?.(data.user);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>
        {mode === 'login' ? '🔐 登录' : '📝 注册'}
      </h2>
      <p style={styles.subtitle}>
        {mode === 'login'
          ? '登录后成绩自动上传排行榜'
          : '注册后即可上榜,用户名将显示在排行榜'}
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="用户名(排行榜显示名,留空则用邮箱前缀)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            maxLength={20}
            autoComplete="username"
          />
        )}
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="密码(至少 6 位)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          minLength={6}
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>

      <div style={styles.switch}>
        {mode === 'login' ? (
          <>没有账号?<button onClick={() => switchMode('register')} style={styles.linkBtn}>去注册</button></>
        ) : (
          <>已有账号?<button onClick={() => switchMode('login')} style={styles.linkBtn}>去登录</button></>
        )}
      </div>

      {error && <div style={styles.error}>⚠️ {error}</div>}
      {info && <div style={styles.info}>✅ {info}</div>}
    </div>
  );
};

const styles = {
  wrap: {
    maxWidth: 420,
    margin: '40px auto',
    padding: 24,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
    color: '#fff',
  },
  title: { margin: '0 0 4px', fontSize: 22 },
  subtitle: { margin: '0 0 16px', fontSize: 13, opacity: 0.7 },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.25)',
    color: '#fff',
    fontSize: 14,
  },
  btn: {
    marginTop: 4,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: '#4ecdc4',
    color: '#06231f',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  switch: { marginTop: 12, fontSize: 13, opacity: 0.85 },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#4ecdc4',
    cursor: 'pointer',
    marginLeft: 6,
    textDecoration: 'underline',
    fontSize: 13,
  },
  error: {
    marginTop: 12,
    padding: '8px 10px',
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.4)',
    borderRadius: 8,
    fontSize: 13,
  },
  info: {
    marginTop: 12,
    padding: '8px 10px',
    background: 'rgba(78,205,196,0.15)',
    border: '1px solid rgba(78,205,196,0.4)',
    borderRadius: 8,
    fontSize: 13,
  },
};

export default Auth;
