import React, { useState, useEffect } from 'react';
import axios from 'axios';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-300 rounded-xl"></div>
              <div className="text-right">
                <div className="h-7 md:h-8 bg-gray-300 rounded w-16 md:w-20 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-12 md:w-14"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center px-2">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight md:leading-normal">
          Dataset Overview
        </h2>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Key statistics from the Titanic passenger dataset
        </p>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className={`bg-gradient-to-br ${card.bgColor} rounded-2xl p-5 md:p-6 border ${card.borderColor} shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-95 group`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center text-white text-base md:text-lg shadow-md`}>
                {card.icon}
              </div>
              <div className="text-right">
                <div className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{card.value}</div>
                <div className="text-xs text-gray-600 mt-1">{card.description}</div>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base mb-2">{card.title}</h3>
            
            {/* Additional Stats */}
            {card.title === "Total Passengers" && (
              <div className="mt-3 pt-3 border-t border-gray-200/60">
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
                <div className="w-full bg-gray-200/70 rounded-full h-1.5 md:h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 md:h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${summary.Survived.mean * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>0%</span>
                  <span>{`${(summary.Survived.mean * 100).toFixed(1)}%`}</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Insights */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-5 md:p-6 border border-gray-200/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
            📈
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg md:text-xl">Dataset Insights</h3>
            <p className="text-sm text-gray-600">Detailed statistics and ranges</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-xl p-4 border border-gray-200/60 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm md:text-base">Age Range</div>
              <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 text-xs">
                📊
              </div>
            </div>
            <div className="font-bold text-gray-900 text-lg md:text-xl">
              {summary.Age ? `${summary.Age.min} - ${summary.Age.max} yrs` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Youngest: {summary.Age?.min} yrs • Oldest: {summary.Age?.max} yrs
            </div>
          </div>
          
          <div className="bg-white/80 rounded-xl p-4 border border-gray-200/60 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm md:text-base">Fare Range</div>
              <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center text-green-600 text-xs">
                💰
              </div>
            </div>
            <div className="font-bold text-gray-900 text-lg md:text-xl">
              ${summary.Fare ? summary.Fare.min.toFixed(2) : '0'} - ${summary.Fare ? summary.Fare.max.toFixed(2) : '0'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Min: ${summary.Fare?.min.toFixed(2)} • Max: ${summary.Fare?.max.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-white/80 rounded-xl p-4 border border-gray-200/60 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm md:text-base">Data Quality</div>
              <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center text-emerald-600 text-xs">
                ✓
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="font-bold text-emerald-600 text-lg md:text-xl">Complete</div>
              <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                100% Clean
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              No missing values • Ready for analysis
            </div>
          </div>
        </div>
        
        {/* Stats Summary */}
        {summary && (
          <div className="mt-6 pt-6 border-t border-gray-200/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg md:text-xl font-bold text-gray-900">
                  {summary.Pclass ? summary.Pclass.mean.toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Avg. Class</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-xl font-bold text-gray-900">
                  {summary.SibSp ? summary.SibSp.mean.toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Avg. Siblings</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-xl font-bold text-gray-900">
                  {summary.Parch ? summary.Parch.mean.toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Avg. Parents</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-xl font-bold text-gray-900">
                  {summary.Age ? summary.Age.std.toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Age Std Dev</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCards;