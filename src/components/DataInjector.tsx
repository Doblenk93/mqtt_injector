import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

interface DataInjectorProps {
  client: mqtt.MqttClient;
  defaultTopic?: string;
}

export default function DataInjector({ client, defaultTopic = 'sensor/suhu' }: DataInjectorProps) {
  // 1. Inisialisasi State dari LocalStorage
  const getInitial = () => {
    const saved = localStorage.getItem(`injector_settings_${defaultTopic}`);
    return saved ? JSON.parse(saved) : null;
  };
  const initial = getInitial();

  const [isActive, setIsActive] = useState(false);
  const [topic, setTopic] = useState(initial?.topic || defaultTopic);
  const [baseValue, setBaseValue] = useState(initial?.baseValue || 74);
  const [noise, setNoise] = useState(initial?.noise || 5);
  const [intervalMs, setIntervalMs] = useState(initial?.intervalMs || 1000);
  const [filterType, setFilterType] = useState<'none' | 'moving_average' | 'kalman'>(initial?.filterType || 'none');
  
  const [currentRaw, setCurrentRaw] = useState(0);
  const [currentFiltered, setCurrentFiltered] = useState(0);

  const maBuffer = useRef<number[]>([]); 
  const kalmanState = useRef({ est: baseValue, errEst: 1.0, q: 0.1, r: noise });

  // 2. Simpan ke LocalStorage tiap ada perubahan setingan
  useEffect(() => {
    localStorage.setItem(`injector_settings_${defaultTopic}`, JSON.stringify({
      topic, baseValue, noise, intervalMs, filterType
    }));
  }, [topic, baseValue, noise, intervalMs, filterType, defaultTopic]);

  // 3. Logika Injector & Filter
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isActive) {
      maBuffer.current = [];
      kalmanState.current.est = baseValue;
      kalmanState.current.r = noise; // Update noise r saat mulai

      timer = setInterval(() => {
        const randomNoise = (Math.random() * noise * 2) - noise;
        const rawValue = baseValue + randomNoise;
        setCurrentRaw(Number(rawValue.toFixed(2)));

        let finalValue = rawValue;

        if (filterType === 'moving_average') {
          maBuffer.current.push(rawValue);
          if (maBuffer.current.length > 5) maBuffer.current.shift();
          finalValue = maBuffer.current.reduce((a, b) => a + b, 0) / maBuffer.current.length;
        } else if (filterType === 'kalman') {
          const { est, errEst, q, r } = kalmanState.current;
          const predictedErrEst = errEst + q;
          const kalmanGain = predictedErrEst / (predictedErrEst + r);
          const currentEst = est + kalmanGain * (rawValue - est);
          kalmanState.current = { est: currentEst, errEst: (1 - kalmanGain) * predictedErrEst, q, r };
          finalValue = currentEst;
        }

        setCurrentFiltered(Number(finalValue.toFixed(2)));

        const payload = JSON.stringify({
          sensor_id: topic,
          timestamp: Date.now(),
          value: Number(finalValue.toFixed(2)),
          raw_value: Number(rawValue.toFixed(2))
        });

        client.publish(topic, payload);
      }, intervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, baseValue, noise, intervalMs, filterType, topic, client]);

  return (
    <div style={{
      border: 'none', padding: '24px', borderRadius: '12px', 
      backgroundColor: '#ffffff', fontFamily: 'sans-serif',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)', transition: 'all 0.3s'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Data Injector Sensor</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '12px', display: 'block', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>Topik Tujuan:</label>
          <input 
            type="text" 
            value={topic} 
            onChange={e => setTopic(e.target.value)} 
            disabled={isActive} 
            style={{ 
              width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px',
              border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace',
              backgroundColor: isActive ? '#f1f5f9' : '#f8fafc', color: '#1e293b',
              transition: 'all 0.2s', cursor: isActive ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {if (!isActive) e.target.style.borderColor = '#0284c7'}}
            onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>Nilai Dasar:</label>
            <input 
              type="number" 
              value={baseValue} 
              onChange={e => setBaseValue(Number(e.target.value))} 
              disabled={isActive} 
              style={{ 
                width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px',
                border: '1px solid #cbd5e1', borderRadius: '6px',
                backgroundColor: isActive ? '#f1f5f9' : '#f8fafc', color: '#1e293b',
                transition: 'all 0.2s', cursor: isActive ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {if (!isActive) e.target.style.borderColor = '#0284c7'}}
              onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>Noise (+/-):</label>
            <input 
              type="number" 
              value={noise} 
              onChange={e => setNoise(Number(e.target.value))} 
              disabled={isActive} 
              style={{ 
                width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px',
                border: '1px solid #cbd5e1', borderRadius: '6px',
                backgroundColor: isActive ? '#f1f5f9' : '#f8fafc', color: '#1e293b',
                transition: 'all 0.2s', cursor: isActive ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {if (!isActive) e.target.style.borderColor = '#0284c7'}}
              onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>Interval (ms):</label>
            <input 
              type="number" 
              value={intervalMs} 
              onChange={e => setIntervalMs(Number(e.target.value))} 
              disabled={isActive} 
              style={{ 
                width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px',
                border: '1px solid #cbd5e1', borderRadius: '6px',
                backgroundColor: isActive ? '#f1f5f9' : '#f8fafc', color: '#1e293b',
                transition: 'all 0.2s', cursor: isActive ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {if (!isActive) e.target.style.borderColor = '#0284c7'}}
              onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
              step="100"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>Tipe Filter:</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value as 'none' | 'moving_average' | 'kalman')} 
              disabled={isActive} 
              style={{ 
                width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px',
                border: '1px solid #cbd5e1', borderRadius: '6px',
                backgroundColor: isActive ? '#f1f5f9' : '#f8fafc', color: '#1e293b',
                transition: 'all 0.2s', cursor: isActive ? 'not-allowed' : 'pointer'
              }}
              onFocus={(e) => {if (!isActive) e.target.style.borderColor = '#0284c7'}}
              onBlur={(e) => {e.target.style.borderColor = '#cbd5e1'}}
            >
              <option value="none">Tanpa Filter</option>
              <option value="moving_average">Moving Avg (5)</option>
              <option value="kalman">Kalman Filter</option>
            </select>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setIsActive(!isActive)}
        style={{
          width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          backgroundColor: isActive ? '#ef4444' : '#0284c7', color: 'white', border: 'none', borderRadius: '8px',
          transition: 'all 0.3s', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isActive ? 'STOP INJECTOR' : 'START INJECTOR'}
      </button>

      {isActive && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', textAlign: 'center', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '600', marginBottom: '12px' }}>Mengirim Data</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: '500', marginBottom: '4px' }}>Raw Value</div>
              <div style={{ fontWeight: '700', color: '#d97706', fontSize: '18px' }}>{currentRaw}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: '500', marginBottom: '4px' }}>Filtered Value</div>
              <div style={{ fontWeight: '700', color: '#16a34a', fontSize: '18px' }}>{currentFiltered}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}