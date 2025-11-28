import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const CorrelationHeatmap = () => {
  const [correlation, setCorrelation] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/correlation`)
      .then(response => setCorrelation(response.data))
      .catch(error => console.error('Error fetching correlation:', error));
  }, []);

  if (!correlation) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );

  const features = Object.keys(correlation);

  const getColorIntensity = (value) => {
    // Strong negative correlation (red)
    if (value < -0.7) return 'bg-red-500 text-white';
    if (value < -0.5) return 'bg-red-300';
    if (value < -0.3) return 'bg-red-100';
    
    // Weak correlation (light background)
    if (value > -0.3 && value < 0.3) return 'bg-gray-50';
    
    // Strong positive correlation (green)
    if (value > 0.7) return 'bg-green-500 text-white';
    if (value > 0.5) return 'bg-green-300';
    if (value > 0.3) return 'bg-green-100';
    
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

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Strong Positive</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Moderate Positive</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-50 rounded"></div>
          <span>Weak/No Correlation</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Moderate Negative</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Strong Negative</span>
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 z-10">
                Feature 1 →<br />Feature 2 ↓
              </th>
              {features.map(feature => (
                <th key={feature} className="bg-gray-50 border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {feature}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(rowFeature => (
              <tr key={rowFeature} className="hover:bg-gray-50">
                <td className="bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 z-10 whitespace-nowrap">
                  {rowFeature}
                </td>
                {features.map(colFeature => {
                  const value = correlation[rowFeature][colFeature];
                  const isDiagonal = rowFeature === colFeature;
                  
                  return (
                    <td 
                      key={colFeature}
                      className={`border border-gray-200 px-4 py-3 text-center text-sm font-mono transition-all ${
                        isDiagonal ? 'bg-gray-100 font-semibold' : getColorIntensity(value)
                      }`}
                      title={`${rowFeature} vs ${colFeature}: ${value.toFixed(3)} (${getCorrelationStrength(value)})`}
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

      {/* Insights Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Correlation Insights</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Strong Positive:</strong> FamilySize ↔ SibSp (0.891) - Larger families have more siblings</p>
          <p><strong>Strong Negative:</strong> Pclass ↔ Fare (-0.549) - Higher class = Higher fare</p>
          <p><strong>Key Finding:</strong> Pclass ↔ Survived (-0.338) - Lower class numbers (1st class) had better survival</p>
          <p><strong>Surprise:</strong> Age ↔ Survived (-0.065) - Very weak correlation with survival</p>
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;