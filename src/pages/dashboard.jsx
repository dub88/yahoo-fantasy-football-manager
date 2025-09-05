import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from '../utils/auth';
import AuthButton from '../components/AuthButton';
import RosterDisplay from '../components/RosterDisplay';
import LineupOptimizer from '../components/LineupOptimizer';
import TradeAnalyzer from '../components/TradeAnalyzer';
import WaiverAssistant from '../components/WaiverAssistant';
import PerformanceChart from '../components/PerformanceChart';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [teamKey, setTeamKey] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'roster':
        return <RosterDisplay teamKey={teamKey} />;
      case 'lineup':
        return <LineupOptimizer />;
      case 'trades':
        return <TradeAnalyzer />;
      case 'waivers':
        return <WaiverAssistant />;
      case 'performance':
        return <PerformanceChart />;
      default:
        return <RosterDisplay teamKey={teamKey} />;
    }
  };

  if (!isAuthenticated()) {
    return null; // This will be handled by the useEffect redirect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Fantasy Football Manager</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Welcome back!</div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Team Key Input */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Enter Your Team Information</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="teamKey" className="block text-sm font-medium text-gray-700 mb-1">
                Yahoo Team Key
              </label>
              <input
                type="text"
                id="teamKey"
                value={teamKey}
                onChange={(e) => setTeamKey(e.target.value)}
                placeholder="e.g., 328.l.34567.t.8"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setActiveTab('roster')}
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Load Team
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            You can find your team key in the URL when viewing your team on Yahoo Fantasy Sports.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'roster', name: 'Roster' },
              { id: 'lineup', name: 'Lineup Optimizer' },
              { id: 'trades', name: 'Trade Analyzer' },
              { id: 'waivers', name: 'Waiver Assistant' },
              { id: 'performance', name: 'Performance' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
