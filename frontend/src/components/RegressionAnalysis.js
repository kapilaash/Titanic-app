import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api' || 'http://localhost:5000/api';

const RegressionAnalysis = () => {
  const [regressionData, setRegressionData] = useState(null);
  const [featureAnalysis, setFeatureAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance');

  useEffect(() => {
    fetchRegressionData();
    fetchFeatureAnalysis();
  }, []);

  const fetchRegressionData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/regression/survival`);
      setRegressionData(response.data);
    } catch (error) {
      console.error('Error fetching regression data:', error);
    }
  };

  const fetchFeatureAnalysis = async () => {
    try {
      const response = await axios.get(`${API_BASE}/regression/feature_analysis`);
      setFeatureAnalysis(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feature analysis:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!regressionData || !featureAnalysis) {
    return (
      <div className="text-center py-12 text-gray-600 animate-fade-in">
        Loading regression analysis data...
      </div>
    );
  }

  const { model_performance, feature_importance, sample_predictions } = regressionData;

  const featureImportanceData = feature_importance && typeof feature_importance === 'object' 
    ? Object.entries(feature_importance)
        .map(([feature, importance]) => ({
          feature: feature.length > 12 ? `${feature.substring(0, 10)}...` : feature,
          importance: Math.abs(importance),
          direction: importance > 0 ? 'Positive' : 'Negative',
          rawImportance: importance
        }))
        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
        .slice(0, 8)
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-xl shadow-lg">
          <p className="font-bold text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Impact: <span className="font-bold">{payload[0].value.toFixed(3)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {payload[0].payload.direction} effect on survival
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Machine Learning Insights
        </h2>
        <p className="text-gray-600 mt-2">Random Forest model analysis for survival prediction</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-200">
        <div className="flex space-x-2">
          {[
            { id: 'performance', label: 'Model Performance', icon: '📊' },
            { id: 'features', label: 'Feature Impact', icon: '🎯' },
            { id: 'predictions', label: 'Predictions', icon: '🔮' },
            { id: 'analysis', label: 'Feature Analysis', icon: '🔍' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-slide-up">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-2">
                {model_performance?.accuracy ? (model_performance.accuracy * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <div className="text-sm opacity-90">Accuracy Score</div>
              <div className="text-xs opacity-80 mt-2">Random Forest Classifier</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-2">
                {model_performance?.training_samples || 'N/A'}
              </div>
              <div className="text-sm opacity-90">Training Samples</div>
              <div className="text-xs opacity-80 mt-2">80% of dataset</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-2">
                {model_performance?.testing_samples || 'N/A'}
              </div>
              <div className="text-sm opacity-90">Testing Samples</div>
              <div className="text-xs opacity-80 mt-2">20% of dataset</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-2">
                {model_performance?.feature_count || 'N/A'}
              </div>
              <div className="text-sm opacity-90">Features Used</div>
              <div className="text-xs opacity-80 mt-2">Engineered attributes</div>
            </div>
          </div>

          {/* Model Interpretation */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                🎯
              </div>
              <h3 className="text-xl font-bold text-gray-900">Model Interpretation</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              The Random Forest model achieves <strong>{(model_performance.accuracy * 100).toFixed(1)}% accuracy</strong> in predicting 
              passenger survival using <strong>{model_performance.feature_count} engineered features</strong>. This ensemble method 
              combines multiple decision trees to provide robust predictions, with feature importance revealing key survival factors.
            </p>
          </div>
        </div>
      )}

      {/* Feature Importance Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Feature Impact Analysis</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Positive Impact</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Negative Impact</span>
                </div>
              </div>
            </div>
            
            {featureImportanceData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 100, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Impact Magnitude', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="feature"
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="importance" 
                      name="Impact Magnitude" 
                      radius={[0, 4, 4, 0]}
                    >
                      {featureImportanceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.direction === 'Positive' ? '#10b981' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No feature importance data available.
              </div>
            )}
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
              <h4 className="font-bold text-green-900 mb-3">✅ Positive Influences</h4>
              <ul className="text-sm text-green-800 space-y-2">
                {featureImportanceData
                  .filter(f => f.direction === 'Positive')
                  .slice(0, 3)
                  .map(feature => (
                    <li key={feature.feature} className="flex justify-between">
                      <span>{feature.feature}</span>
                      <span className="font-bold">{feature.importance.toFixed(3)}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-100 rounded-2xl p-6 border border-red-200">
              <h4 className="font-bold text-red-900 mb-3">❌ Negative Influences</h4>
              <ul className="text-sm text-red-800 space-y-2">
                {featureImportanceData
                  .filter(f => f.direction === 'Negative')
                  .slice(0, 3)
                  .map(feature => (
                    <li key={feature.feature} className="flex justify-between">
                      <span>{feature.feature}</span>
                      <span className="font-bold">{feature.importance.toFixed(3)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sample Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Model Predictions on Test Data</h3>
            
            {sample_predictions && sample_predictions.length > 0 ? (
              <div className="grid gap-4">
                {sample_predictions.map((prediction, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                      prediction.correct 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-green-200' 
                        : 'bg-gradient-to-r from-red-50 to-pink-100 border-red-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-sm ${
                            prediction.predicted_survival 
                              ? 'bg-green-500 text-white shadow-lg' 
                              : 'bg-red-500 text-white shadow-lg'
                          }`}>
                            {prediction.predicted_survival ? '✅ Predicted: Survived' : '❌ Predicted: Perished'}
                          </span>
                          <span className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-sm ${
                            prediction.actual_survival 
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-gray-500 text-white shadow-lg'
                          }`}>
                            {prediction.actual_survival ? 'Actual: Survived' : 'Actual: Perished'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Class</div>
                            <div className="font-bold text-gray-900">{prediction.passenger_data?.Pclass || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Age</div>
                            <div className="font-bold text-gray-900">
                              {prediction.passenger_data?.Age ? Math.round(prediction.passenger_data.Age) : 'N/A'} yrs
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Gender</div>
                            <div className="font-bold text-gray-900">{prediction.passenger_data?.Sex || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Fare</div>
                            <div className="font-bold text-gray-900">
                              ${prediction.passenger_data?.Fare ? prediction.passenger_data.Fare.toFixed(2) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {Math.round((prediction.survival_probability || 0) * 100)}%
                        </div>
                        <div className={`text-sm font-bold ${
                          prediction.correct ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {prediction.correct ? '✓ Correct Prediction' : '✗ Incorrect Prediction'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Confidence Level
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No sample predictions available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Detailed Feature Analysis</h3>
            
            {featureAnalysis && typeof featureAnalysis === 'object' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(featureAnalysis).slice(0, 6).map(([feature, analysis], index) => (
                  <div
                    key={feature}
                    className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200 transition-all duration-300 transform hover:scale-105"
                  >
                    <h4 className="font-bold text-gray-900 mb-3 capitalize text-sm">{feature}</h4>
                    
                    {analysis && typeof analysis === 'object' && !analysis.error ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Correlation</span>
                          <span className={`font-bold text-sm ${
                            analysis.correlation_with_survival > 0 ? 'text-green-600' : 
                            analysis.correlation_with_survival < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {analysis.correlation_with_survival !== 'N/A' && analysis.correlation_with_survival !== 'Error'
                              ? parseFloat(analysis.correlation_with_survival).toFixed(2)
                              : 'N/A'}
                          </span>
                        </div>
                        
                        {analysis.survival_by_group && typeof analysis.survival_by_group === 'object' && (
                          <div>
                            <div className="text-xs text-gray-600 mb-2">Survival by Category</div>
                            <div className="space-y-1">
                              {Object.entries(analysis.survival_by_group)
                                .slice(0, 2)
                                .map(([group, rate]) => (
                                  <div key={group} className="flex justify-between text-xs">
                                    <span className="text-gray-700">{group}</span>
                                    <span className="font-bold text-gray-900">
                                      {Math.round((rate || 0) * 100)}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-500 text-xs">
                        Error analyzing feature
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No feature analysis data available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegressionAnalysis;