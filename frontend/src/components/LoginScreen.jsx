import React, { useState } from 'react';
import { requestOTP, verifyOTP } from '../api/api';

export default function LoginScreen({ onLogin }) {
  const [step, setStep] = useState('email'); // email, otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await requestOTP(email.trim());
      if (result.success) {
        setStep('otp');
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyOTP(email, otp.trim());
      if (result.internalId) {
        // Store user info
        localStorage.setItem('calmstories_user', JSON.stringify(result));
        onLogin(result);
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fefefd',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 1px 8px #efefee'
      }}>
        <div style={{
          fontSize: '1.5em',
          marginBottom: '30px',
          textAlign: 'center',
          opacity: 0.8
        }}>
          {step === 'email' ? 'Welcome to Calm Stories' : 'Enter Verification Code'}
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9em',
                opacity: 0.7
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1em'
                }}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#bbb' : '#222',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1em',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9em',
                opacity: 0.7
              }}>
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1em',
                  textAlign: 'center',
                  letterSpacing: '2px'
                }}
                placeholder="123456"
                maxLength={6}
                disabled={loading}
              />
              <div style={{
                fontSize: '0.8em',
                opacity: 0.6,
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Check your email for the 6-digit code
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#bbb' : '#222',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1em',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '10px'
              }}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer'
              }}>
              Back to Email
            </button>
          </form>
        )}

        {error && (
          <div style={{
            color: '#d44',
            fontSize: '0.9em',
            marginTop: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}