import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import { type MqttSettings } from '../types';

export default function SettingsPage() {
  const navigate = useNavigate();
  
  // Initialize settings dari localStorage untuk menghindari multiple setState calls
  const initializeSettings = () => {
    const saved = localStorage.getItem('mqtt_settings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      host: 'wss://mqtt.domainanda.com/mqtt',
      useAuth: false,
      username: '',
      password: '',
      clientId: `mqtt_sim_${Math.random().toString(16).slice(2, 8)}`
    };
  };

  const [settings, setSettings] = useState<MqttSettings>(initializeSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleTestConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setMessage({ text: 'Menguji koneksi...', type: 'info' });

    const options: mqtt.IClientOptions = { clientId: settings.clientId, connectTimeout: 5000 };
    if (settings.useAuth) { options.username = settings.username; options.password = settings.password; }

    try {
      const client = mqtt.connect(settings.host, options);
      client.on('connect', () => {
        setMessage({ text: '✅ Koneksi Berhasil!', type: 'success' });
        client.end(true); 
        setIsTesting(false);
      });
      client.on('error', (err) => {
        setMessage({ text: `❌ Koneksi Gagal: ${err.message}`, type: 'error' });
        client.end(true);
        setIsTesting(false);
      });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setMessage({ text: `❌ URL Host tidak valid: ${error.message}`, type: 'error' });
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const settingsToSave: MqttSettings = {
      host: settings.host,
      useAuth: settings.useAuth,
      clientId: settings.clientId,
      username: settings.useAuth ? settings.username : undefined,
      password: settings.useAuth ? settings.password : undefined,
    };
    localStorage.setItem('mqtt_settings', JSON.stringify(settingsToSave));
    navigate('/dashboard');
  };

  // --- STYLING BANTUAN ---
  const inputStyle = {
    width: '100%', padding: '10px 12px', boxSizing: 'border-box' as const,
    border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none',
    fontSize: '14px', transition: 'border-color 0.2s'
  };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#4b5563' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ 
        width: '100%', maxWidth: '450px', backgroundColor: 'white', 
        padding: '30px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: '0 0 5px 0', color: '#111827' }}>Pengaturan MQTT</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Konfigurasi koneksi broker simulator Anda</p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Host URL (WebSocket)</label>
            <input type="text" value={settings.host} onChange={(e) => setSettings({ ...settings, host: e.target.value })} required style={inputStyle} placeholder="wss://broker.anda.com/mqtt" />
          </div>

          <div>
            <label style={labelStyle}>Client ID</label>
            <input type="text" value={settings.clientId} onChange={(e) => setSettings({ ...settings, clientId: e.target.value })} required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <input type="checkbox" id="authCheck" checked={settings.useAuth} onChange={(e) => setSettings({ ...settings, useAuth: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="authCheck" style={{ fontSize: '14px', cursor: 'pointer', color: '#374151', fontWeight: '500' }}>Gunakan Username & Password</label>
          </div>

          {settings.useAuth && (
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Username</label>
                <input type="text" value={settings.username} onChange={(e) => setSettings({ ...settings, username: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={settings.password} onChange={(e) => setSettings({ ...settings, password: e.target.value })} style={inputStyle} />
              </div>
            </div>
          )}

          {message.text && (
            <div style={{ 
              padding: '12px', borderRadius: '6px', fontSize: '14px', textAlign: 'center', fontWeight: '500',
              backgroundColor: message.type === 'success' ? '#d1fae5' : message.type === 'error' ? '#fee2e2' : '#e0e7ff',
              color: message.type === 'success' ? '#065f46' : message.type === 'error' ? '#991b1b' : '#3730a3'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={handleTestConnection} disabled={isTesting} 
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', fontWeight: 'bold', cursor: isTesting ? 'wait' : 'pointer', transition: 'bg 0.2s' }}>
              {isTesting ? 'Menguji...' : 'Test Koneksi'}
            </button>
            <button type="submit" 
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
              Simpan & Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}