import React, { useState, useEffect } from 'react';
import { fetchPlayerNews as fetchYahooPlayerNews } from '../utils/yahooApi.js';

const PlayerNews = ({ teamKey }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerKeys, setPlayerKeys] = useState([]);

  // Fetch player keys when teamKey changes
  useEffect(() => {
    if (teamKey) {
      fetchTeamPlayerKeys(teamKey);
    }
  }, [teamKey]);

  // Fetch news when playerKeys changes
  useEffect(() => {
    if (playerKeys.length > 0) {
      fetchPlayerNews();
    }
  }, [playerKeys]);

  // Fetch player keys for the team
  const fetchTeamPlayerKeys = async (teamKey) => {
    try {
      // In a real implementation, we would fetch the team roster to get player keys
      // For now, we'll use a placeholder or you can implement the actual fetch
      // This is a simplified version - you'll need to implement fetchTeamRoster
      const roster = await fetchTeamRoster(teamKey);
      if (roster && roster.players) {
        setPlayerKeys(roster.players.map(p => p.player_key));
      }
    } catch (err) {
      console.error('Error fetching team roster:', err);
      setError('Failed to load team roster. Some news may be missing.');
    }
  };

  // Fetch news for the team's players
  const fetchPlayerNews = async () => {
    if (playerKeys.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch news in batches to avoid hitting API limits
      const batchSize = 10;
      let allNews = [];
      
      for (let i = 0; i < playerKeys.length; i += batchSize) {
        const batch = playerKeys.slice(i, i + batchSize);
        const newsData = await fetchYahooPlayerNews(batch);
        
        if (newsData) {
          const parsedNews = parseNewsData(newsData);
          allNews = [...allNews, ...parsedNews];
        }
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < playerKeys.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Sort news by date (newest first)
      allNews.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setNews(allNews);
    } catch (err) {
      setError('Failed to fetch player news. Please try again.');
      console.error('Error fetching player news:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Parse the XML response from Yahoo API into a more usable format
  const parseNewsData = (xmlData) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const newsItems = [];
      
      // Get all player nodes
      const playerNodes = xmlDoc.getElementsByTagName('player');
      
      for (let i = 0; i < playerNodes.length; i++) {
        const playerNode = playerNodes[i];
        
        // Get player info
        const nameNode = playerNode.getElementsByTagName('name')[0];
        const playerName = nameNode ? nameNode.getElementsByTagName('full')[0]?.textContent : 'Unknown Player';
        const teamNode = playerNode.getElementsByTagName('editorial_team_abbr')[0];
        const team = teamNode ? teamNode.textContent : 'NFL';
        const positionNode = playerNode.getElementsByTagName('display_position')[0] || 
                           playerNode.getElementsByTagName('position')[0];
        const position = positionNode ? positionNode.textContent : 'N/A';
        
        // Get injury status if available
        const injuryNode = playerNode.getElementsByTagName('injury_note')[0];
        let status = 'Healthy';
        
        if (injuryNode) {
          const injuryStatus = playerNode.getElementsByTagName('status')[0]?.textContent;
          if (injuryStatus === 'O') status = 'Out';
          else if (injuryStatus === 'D' || injuryStatus === 'IR') status = 'Doubtful';
          else if (injuryStatus === 'Q') status = 'Questionable';
          else status = 'Injured';
        }
        
        // Get news items for this player
        const newsNodes = playerNode.getElementsByTagName('news');
        
        for (let j = 0; j < newsNodes.length; j++) {
          const newsNode = newsNodes[j];
          const titleNode = newsNode.getElementsByTagName('title')[0];
          const contentNode = newsNode.getElementsByTagName('story')[0];
          const dateNode = newsNode.getElementsByTagName('date')[0];
          
          if (titleNode && contentNode) {
            newsItems.push({
              id: `${i}-${j}`,
              player: playerName,
              team,
              position,
              title: titleNode.textContent,
              news: contentNode.textContent,
              date: dateNode ? new Date(dateNode.textContent).toLocaleDateString() : 'N/A',
              status
            });
          }
        }
      }
      
      return newsItems;
    } catch (err) {
      console.error('Error parsing news data:', err);
      return [];
    }
  };
  
  // Mock function - replace with actual implementation to fetch team roster
  const fetchTeamRoster = async (teamKey) => {
    // In a real implementation, fetch the team roster from your API
    // This is a placeholder that returns an empty array
    return { players: [] };
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
