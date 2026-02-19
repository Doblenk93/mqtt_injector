import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import { type MqttSettings } from '../types';
import MqttSwitch from '../components/MqttSwitch';
import DataInjector from '../components/DataInjector';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [statusMsg, setStatusMsg] = useState('Menghubungkan ke Broker...');

  useEffect(() => {
    const savedSettings = localStorage.getItem('mqtt_settings');
    if (!savedSettings) { navigate('/settings'); return; }

    const settings: MqttSettings = JSON.parse(savedSettings);
    const options: mqtt.IClientOptions = { clientId: settings.clientId, connectTimeout: 5000 };
    if (settings.useAuth) { options.username = settings.username; options.password = settings.password; }

    const mqttClient = mqtt.connect(settings.host, options);

    mqttClient.on('connect', () => {
      setStatus('connected'); setStatusMsg(`Terhubung ke: ${settings.host}`); setClient(mqttClient);
    });
    mqttClient.on('error', (err) => {
      setStatus('error'); setStatusMsg(`Koneksi Gagal: ${err.message}`);
    });
    mqttClient.on('reconnect', () => {
      setStatus('connecting'); setStatusMsg('Mencoba menghubungkan ulang...');
    });

    return () => { mqttClient.end(true); };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* --- NAVBAR HEADER --- */}
      <header style={{ 
        backgroundColor: '#ffffff', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', borderBottom: '2px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>IoT Simulator Panel</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ 
              width: '12px', height: '12px', borderRadius: '50%', 
              backgroundColor: status === 'connected' ? '#10b981' : status === 'error' ? '#ef4444' : '#f59e0b',
              boxShadow: `0 0 8px ${status === 'connected' ? '#10b981' : status === 'error' ? '#ef4444' : '#f59e0b'}40`
            }}></span>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{statusMsg}</span>
          </div>
        </div>
        <button onClick={() => navigate('/settings')} style={{ 
          padding: '10px 20px', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', 
          borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
          fontSize: '14px'
        }} onMouseOver={(e) => {e.currentTarget.style.backgroundColor = '#cbd5e1'}} onMouseOut={(e) => {e.currentTarget.style.backgroundColor = '#e2e8f0'}}>
          Pengaturan
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {client ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            
            {/* SECTION: RELAY/SWITCH */}
            <section>
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', margin: 0, marginBottom: '8px' }}>
                  Kontrol Aktuator
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Kelola relay dan switch perangkat Anda</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <MqttSwitch client={client} label="Lampu Teras" defaultCmdTopic="device/lampu1/cmd" defaultStateTopic="device/lampu1/state" />
                <MqttSwitch client={client} label="Pompa Air" defaultCmdTopic="device/pompa/cmd" defaultStateTopic="device/pompa/state" />
              </div>
            </section>

            {/* SECTION: DATA INJECTOR */}
            <section>
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', margin: 0, marginBottom: '8px' }}>
                  Simulasi Sensor
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Injeksi data sensor untuk testing</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                <DataInjector client={client} defaultTopic="sensor/suhu" />
                <DataInjector client={client} defaultTopic="sensor/kelembaban" />
              </div>
            </section>

          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#64748b', fontSize: '16px' }}>
            {status === 'error' ? 'Koneksi terputus. Periksa pengaturan broker Anda.' : 'Sedang menyiapkan ruang simulasi...'}
          </div>
        )}
      </main>
    </div>
  );
}