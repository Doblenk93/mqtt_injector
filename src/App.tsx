import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  // Logic sederhana: cek apakah ada setting di localStorage
  // Jika tidak ada, paksa ke halaman /settings
  const hasSettings = localStorage.getItem('mqtt_settings') !== null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route 
          path="/dashboard" 
          element={hasSettings ? <DashboardPage /> : <Navigate to="/settings" />} 
        />
        {/* Redirect root ke dashboard atau settings */}
        <Route 
          path="/" 
          element={<Navigate to={hasSettings ? "/dashboard" : "/settings"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;