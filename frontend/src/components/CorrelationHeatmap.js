import React, { useState, useEffect } from 'react';
import axios from 'axios';

// const API_BASE = 'http://localhost:5000/api';
// const API_BASE = 'https://titanic-app-production.up.railway.app/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api' || 'http://localhost:5000/api';

const CorrelationHeatmap = () => {
  const [correlation, setCorrelation] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE}/correlation`);
        setCorrelation(response.data);
      } catch (error) {
        console.error('Error fetching correlation:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getColorIntensity = (value) => {
    if (value < -0.7) return 'bg-red-600 text-white shadow-lg';
    if (value < -0.5) return 'bg-red-400 text-white shadow-md';
    if (value < -0.3) return 'bg-red-200 shadow-sm';
    if (value > -0.3 && value < 0.3) return 'bg-gray-100';
    if (value > 0.7) return 'bg-green-600 text-white shadow-lg';
    if (value > 0.5) return 'bg-green-400 text-white shadow-md';
    if (value > 0.3) return 'bg-green-200 shadow-sm';
    return 'bg-white';
  };

  const getCorrelationStrength = (value) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return 'Very Strong';
    if (absValue > 0.5) return 'Strong';
    if (absValue > 0.3) return 'Moderate';
    if (absValue > 0.1) return 'Weak';
    return 'Very Weak';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!correlation) return null;

  const features = Object.keys(correlation);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center animate-fade-in">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Feature Correlation Matrix
        </h2>
        <p className="text-gray-600 mt-2">Explore relationships between different passenger attributes</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 animate-slide-up">
        {[
          { label: 'Strong Positive', color: 'bg-green-600' },
          { label: 'Moderate Positive', color: 'bg-green-400' },
          { label: 'Weak/No Correlation', color: 'bg-gray-100' },
          { label: 'Moderate Negative', color: 'bg-red-400' },
          { label: 'Strong Negative', color: 'bg-red-600' },
        ].map((item, index) => (
          <div
            key={item.label}
            className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border transition-transform duration-300 hover:scale-105"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-4 h-4 rounded-full ${item.color}`} />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix Container */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 px-6 py-4 text-left font-bold text-gray-900 sticky left-0 z-20">
                    <div className="rotate-0 sm:-rotate-45 transform origin-center">
                      <span className="text-sm">Features</span>
                    </div>
                  </th>
                  {features.map((feature, index) => (
                    <th
                      key={feature}
                      className="bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3 text-center font-bold text-gray-900 whitespace-nowrap min-w-[100px] transition-all duration-300 hover:bg-gray-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {feature}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((rowFeature, rowIndex) => (
                  <tr
                    key={rowFeature}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 px-6 py-3 font-bold text-gray-900 sticky left-0 z-10 whitespace-nowrap">
                      {rowFeature}
                    </td>
                    {features.map((colFeature, colIndex) => {
                      const value = correlation[rowFeature][colFeature];
                      const isDiagonal = rowFeature === colFeature;
                      
                      return (
                        <td
                          key={colFeature}
                          className={`border border-gray-100 px-4 py-3 text-center font-mono text-sm transition-all duration-300 cursor-help transform hover:scale-110 ${
                            isDiagonal ? 'bg-gradient-to-br from-blue-100 to-blue-200 font-bold' : getColorIntensity(value)
                          }`}
                          onMouseEnter={() => setSelectedCell({ rowFeature, colFeature, value })}
                          style={{ animationDelay: `${(rowIndex + colIndex) * 20}ms` }}
                        >
                          {isDiagonal ? '1.000' : value.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected Cell Info */}
      {selectedCell && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200 animate-fade-in">
          <h3 className="font-bold text-lg text-gray-900 mb-2">Correlation Insight</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 shadow-sm transition-transform duration-300 hover:scale-105">
              <div className="font-medium text-gray-600">Feature 1</div>
              <div className="font-bold text-gray-900">{selectedCell.rowFeature}</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm transition-transform duration-300 hover:scale-105">
              <div className="font-medium text-gray-600">Feature 2</div>
              <div className="font-bold text-gray-900">{selectedCell.colFeature}</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm transition-transform duration-300 hover:scale-105">
              <div className="font-medium text-gray-600">Correlation</div>
              <div className="font-bold text-gray-900">
                {selectedCell.value.toFixed(3)} ({getCorrelationStrength(selectedCell.value)})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Family Relationships",
            description: "FamilySize and SibSp show strong positive correlation (0.891)",
            icon: "👨‍👩‍👧‍👦",
            color: "bg-gradient-to-r from-green-500 to-emerald-600"
          },
          {
            title: "Class & Fare",
            description: "Higher passenger classes paid significantly more",
            icon: "💰",
            color: "bg-gradient-to-r from-blue-500 to-cyan-600"
          },
          {
            title: "Survival Factors",
            description: "Pclass strongly correlates with survival chances",
            icon: "🛟",
            color: "bg-gradient-to-r from-purple-500 to-indigo-600"
          },
          {
            title: "Age Impact",
            description: "Age shows minimal correlation with survival",
            icon: "🎂",
            color: "bg-gradient-to-r from-orange-500 to-red-600"
          }
        ].map((insight, index) => (
          <div
            key={insight.title}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-xl animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-2xl ${insight.color} flex items-center justify-center text-white text-xl mb-4`}>
              {insight.icon}
            </div>
            <h4 className="font-bold text-gray-900 mb-2">{insight.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CorrelationHeatmap;