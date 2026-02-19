import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

interface MqttSwitchProps {
  client: mqtt.MqttClient;
  label: string;
  defaultCmdTopic: string;
  defaultStateTopic: string;
}

export default function MqttSwitch({ client, label, defaultCmdTopic, defaultStateTopic }: MqttSwitchProps) {
  // 1. Inisialisasi State (Cek LocalStorage dulu, kalau kosong pakai Default)
  const getInitial = () => {
    const saved = localStorage.getItem(`switch_settings_${label}`);
    return saved ? JSON.parse(saved) : null;
  };
  const initial = getInitial();

  const [cmdTopic, setCmdTopic] = useState(initial?.cmdTopic || defaultCmdTopic);
  const [stateTopic, setStateTopic] = useState(initial?.stateTopic || defaultStateTopic);
  
  const [isOn, setIsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2. Simpan ke LocalStorage setiap kali topik diubah
  useEffect(() => {
    localStorage.setItem(`switch_settings_${label}`, JSON.stringify({ cmdTopic, stateTopic }));
  }, [cmdTopic, stateTopic, label]);

  // 3. Logika Subscribe MQTT (Otomatis pindah jika stateTopic diedit user)
  useEffect(() => {
    client.subscribe(stateTopic, (err) => {
      if (err) console.error(`Gagal subscribe ke ${stateTopic}`, err);
    });

    const handleMessage = (topic: string, message: Buffer) => {
      if (topic === stateTopic) {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.status === 'ON') {
            setIsOn(true);
            setIsLoading(false);
          } else if (payload.status === 'OFF') {
            setIsOn(false);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Gagal parsing pesan:", error);
        }
      }
    };

    client.on('message', handleMessage);

    return () => {
      client.unsubscribe(stateTopic);
      client.removeListener('message', handleMessage);
    };
  }, [client, stateTopic]);

  const handleToggle = () => {
    setIsLoading(true);
    const payload = JSON.stringify({ status: isOn ? 'OFF' : 'ON' });
    client.publish(cmdTopic, payload);
    console.log(`Mengirim ke ${cmdTopic}:`, payload);
  };

  return (
    <div style={{
      border: 'none', padding: '24px', borderRadius: '12px',
      backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)', transition: 'all 0.3s'
    }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b', textAlign: 'left' }}>{label}</h3>
      
      {/* Input Edit Topik */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Command Topic:</label>
          <input 
            type="text" 
            value={cmdTopic} 
            onChange={(e) => setCmdTopic(e.target.value)}
            style={{ 
              width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '8px 12px',
              border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace',
              backgroundColor: '#f8fafc', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {e.target.style.borderColor = '#0284c7'}}
            onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '6px' }}>State Topic:</label>
          <input 
            type="text" 
            value={stateTopic} 
            onChange={(e) => setStateTopic(e.target.value)}
            style={{ 
              width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '8px 12px',
              border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace',
              backgroundColor: '#f8fafc', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {e.target.style.borderColor = '#0284c7'}}
            onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
          />
        </div>
      </div>
      
      <button 
        onClick={handleToggle} 
        disabled={isLoading}
        style={{
          padding: '12px 20px', fontSize: '14px', fontWeight: '600', marginTop: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          backgroundColor: isLoading ? '#fbbf24' : (isOn ? '#10b981' : '#ef4444'),
          color: '#ffffff', border: 'none', borderRadius: '8px',
          transition: 'all 0.3s', opacity: isLoading ? 0.8 : 1,
          textTransform: 'uppercase', letterSpacing: '0.5px'
        }}
        onMouseOver={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isLoading ? 'Menunggu...' : (isOn ? 'Turn OFF' : 'Turn ON')}
      </button>
    </div>
  );
}