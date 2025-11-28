import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const SummaryCards = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/summary`)
      .then(response => setSummary(response.data))
      .catch(error => console.error('Error fetching summary:', error));
  }, []);

  if (!summary) return (
    <div className="flex justify-center">
      <span className="loading loading-spinner loading-md"></span>
    </div>
  );

  const cards = [
    {
      title: "Total Passengers",
      value: summary.Age?.count || 'N/A',
      icon: "👥",
      color: "primary"
    },
    {
      title: "Average Age",
      value: summary.Age ? summary.Age.mean.toFixed(1) : 'N/A',
      icon: "🎂",
      color: "secondary"
    },
    {
      title: "Average Fare",
      value: summary.Fare ? `$${summary.Fare.mean.toFixed(2)}` : 'N/A',
      icon: "💰",
      color: "accent"
    },
    {
      title: "Survival Rate",
      value: summary.Survived ? (summary.Survived.mean * 100).toFixed(1) + '%' : 'N/A',
      icon: "🛟",
      color: "info"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`stats shadow bg-${card.color} text-${card.color}-content`}>
          <div className="stat">
            <div className="stat-figure text-primary">
              <div className="text-3xl">{card.icon}</div>
            </div>
            <div className="stat-title text-current opacity-90">{card.title}</div>
            <div className="stat-value text-current">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;