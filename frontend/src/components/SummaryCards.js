import React, { useState, useEffect } from 'react';
import axios from 'axios';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api' || 'http://localhost:5000/api';

const SummaryCards = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE}/summary`);
        setSummary(response.data);
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-gray-200 rounded-2xl p-6 animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: "Total Passengers",
      value: summary.Age?.count || 'N/A',
      icon: "👥",
      description: "Dataset size",
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Average Age",
      value: summary.Age ? `${summary.Age.mean.toFixed(1)} yrs` : 'N/A',
      icon: "🎂",
      description: "Mean passenger age",
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
      borderColor: "border-green-200"
    },
    {
      title: "Average Fare",
      value: summary.Fare ? `$${summary.Fare.mean.toFixed(2)}` : 'N/A',
      icon: "💰",
      description: "Mean ticket price",
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
      borderColor: "border-purple-200"
    },
    {
      title: "Survival Rate",
      value: summary.Survived ? `${(summary.Survived.mean * 100).toFixed(1)}%` : 'N/A',
      icon: "🛟",
      description: "Overall survival rate",
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-50 to-red-50",
      borderColor: "border-orange-200"
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Dataset Overview
        </h2>
        <p className="text-gray-600 mt-1">Key statistics from the Titanic passenger dataset</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className={`bg-gradient-to-br ${card.bgColor} rounded-2xl p-6 border ${card.borderColor} shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl animate-slide-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center text-white text-lg shadow-md`}>
                {card.icon}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-xs text-gray-600 mt-1">{card.description}</div>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 text-sm">{card.title}</h3>
            
            {/* Additional Stats */}
            {card.title === "Total Passengers" && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Training:</span>
                  <span className="font-bold">712</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Testing:</span>
                  <span className="font-bold">179</span>
                </div>
              </div>
            )}
            
            {card.title === "Survival Rate" && summary.Survived && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${summary.Survived.mean * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Insights */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">📈 Dataset Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-gray-600">Age Range</div>
            <div className="font-bold text-gray-900">
              {summary.Age ? `${summary.Age.min} - ${summary.Age.max} yrs` : 'N/A'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-gray-600">Fare Range</div>
            <div className="font-bold text-gray-900">
              ${summary.Fare ? summary.Fare.min.toFixed(2) : '0'} - ${summary.Fare ? summary.Fare.max.toFixed(2) : '0'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-gray-600">Data Quality</div>
            <div className="font-bold text-green-600">Complete Records</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;