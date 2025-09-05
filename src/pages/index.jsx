import React from 'react';
import AuthButton from '../components/AuthButton';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0 md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-12">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-white mb-4">Yahoo Fantasy Football Manager</h1>
              <p className="text-xl text-blue-100 mb-8">Optimize your fantasy football team with powerful analytics and insights</p>
              <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-xl p-6 inline-block">
                <p className="text-white text-lg">Take control of your fantasy football destiny</p>
              </div>
            </div>
          </div>
          <div className="p-8 md:w-1/2">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Manage Your Team Like a Pro</h2>
                <p className="text-gray-600 mb-6">Get actionable insights, optimize your lineup, analyze trades, and dominate your league.</p>
              </div>
              
              <div className="w-full max-w-md space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2 mr-4">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Lineup Optimization</h3>
                    <p className="text-gray-600">Get the best lineup recommendations based on projections and matchups.</p>
                  </div>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-4 flex items-start">
                  <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-2 mr-4">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Trade Analysis</h3>
                    <p className="text-gray-600">Evaluate trade proposals with advanced player value metrics.</p>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 flex items-start">
                  <div className="flex-shrink-0 bg-purple-100 rounded-lg p-2 mr-4">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Waiver Wire</h3>
                    <p className="text-gray-600">Discover the best waiver wire pickups for your roster.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-gray-600 max-w-2xl">
        <p>This application integrates with the Yahoo Fantasy Sports API to provide advanced analytics and tools for managing your fantasy football team.</p>
      </div>
    </div>
  );
};

export default Home;
