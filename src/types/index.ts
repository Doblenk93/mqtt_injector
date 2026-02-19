// src/types/index.ts

export interface MqttSettings {
  host: string;       // contoh: wss://broker.emqx.io:8084/mqtt
  useAuth: boolean;   // toggle on/off
  username?: string;  // opsional jika useAuth false
  password?: string;  // opsional jika useAuth false
  clientId: string;   // generate random saat awal
}

// Tipe data untuk konfigurasi Injector (Time-based)
export interface InjectorSettings {
  baseValue: number;
  randomness: number;    // +/- noise (misal 5)
  intervalMs: number;    // default 1000ms (1 detik)
  filterType: 'none' | 'moving_average' | 'kalman';
  topic: string;         // topik tujuan publish
}

// Tipe data untuk Switch
export interface SwitchSettings {
  topicCommand: string;  // topik untuk kirim perintah (misal: device/relay/cmd)
  topicState: string;    // topik untuk listen status aktual (misal: device/relay/state)
}