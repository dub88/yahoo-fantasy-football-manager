import React, { useState, useEffect } from 'react';

const PlayerNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlayerNews();
  }, []);

  const fetchPlayerNews = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, we would fetch actual news from an API
      // For now, we'll simulate the data
      const mockNews = [
        {
          id: 1,
          player: 'Patrick Mahomes',
          team: 'KC',
          position: 'QB',
          news: 'Limited in practice with knee injury, expected to play Sunday',
          date: '2025-09-05',
          status: 'Questionable'
        },
        {
          id: 2,
          player: 'Christian McCaffrey',
          team: 'SF',
          position: 'RB',
          news: 'Full participation in practice, no injury concerns',
          date: '2025-09-04',
          status: 'Healthy'
        },
        {
          id: 3,
          player: 'Tyreek Hill',
          team: 'MIA',
          position: 'WR',
          news: 'DNQ for practice with hamstring injury, status uncertain',
          date: '2025-09-05',
          status: 'Out'
        },
        {
          id: 4,
          player: 'Travis Kelce',
          team: 'KC',
          position: 'TE',
          news: 'Rest day for veteran player, expected to play Sunday',
          date: '2025-09-04',
          status: 'Healthy'
        }
      ];
      
      setNews(mockNews);
    } catch (err) {
      setError('Failed to fetch player news. Please try again.');
      console.error('Error fetching player news:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'bg-green-100 text-green-800';
      case 'Questionable': return 'bg-yellow-100 text-yellow-800';
      case 'Out': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading player news...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <div className="player-news bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Player News & Injuries</h2>
        <button 
          onClick={fetchPlayerNews}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {news.length === 0 ? (
        <p className="text-gray-500">No player news available.</p>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.player}</h3>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500 mr-2">{item.position} - {item.team}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-400">{item.date}</span>
              </div>
              <p className="mt-3 text-gray-700">{item.news}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerNews;
