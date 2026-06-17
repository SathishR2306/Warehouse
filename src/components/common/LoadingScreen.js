// src/components/common/LoadingScreen.js
import React from 'react';
import { Boxes } from 'lucide-react';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      gap: 20,
    }}>
      <div style={{
        width: 64,
        height: 64,
        background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
        animation: 'pulse 2s infinite',
      }}>
        <Boxes size={32} color="white" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>WareFlow</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>{message}</div>
      </div>
      <div className="spinner" style={{ borderTopColor: '#6366f1' }} />
    </div>
  );
};

export default LoadingScreen;
