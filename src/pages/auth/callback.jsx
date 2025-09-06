import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../../utils/auth';

const Callback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('Current URL:', window.location.href);
      
      // Check both query params and hash fragments for the code
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      console.log('Query Params:', Object.fromEntries(queryParams.entries()));
      console.log('Hash Params:', Object.fromEntries(hashParams.entries()));
      
      // Try to get code from either location
      const code = queryParams.get('code') || hashParams.get('code');
      
      if (!code) {
        console.error('No code parameter found in URL or hash');
        setError('No authorization code found in the callback URL.');
        setLoading(false);
        return;
      }

      try {
        console.log('Authorization code found, exchanging for token');
        await exchangeCodeForToken(code);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error during OAuth callback:', err);
        if (err.message.includes('expired')) {
          setError('The authorization code has expired. Please try logging in again.');
        } else {
          setError('Failed to authenticate. Please try again.');
        }
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating with Yahoo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
};

export default Callback;
