import React from 'react';
import { initiateOAuth, isAuthenticated, logout } from '../utils/auth';

const AuthButton = () => {
  const handleLogin = () => {
    initiateOAuth();
  };

  const handleLogout = () => {
    logout();
    // Reload the page to reflect the logout
    window.location.reload();
  };

  const isLoggedIn = isAuthenticated();

  return (
    <div className="auth-button-container">
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      ) : (
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Login with Yahoo
        </button>
      )}
    </div>
  );
};

export default AuthButton;
