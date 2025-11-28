import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = 'http://localhost:5000/api';

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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!regressionData || !featureAnalysis) {
    return (
      <div className="text-center py-12 text-gray-600">
        loading regression analysis data...
      </div>
    );
  }

  const { model_performance, feature_importance, sample_predictions, coefficients } = regressionData;

  // Prepare feature importance data for chart - with null checks
  const featureImportanceData = feature_importance && typeof feature_importance === 'object' 
    ? Object.entries(feature_importance)
        .map(([feature, importance]) => ({
          feature,
          importance: Math.abs(importance),
          direction: importance > 0 ? 'Positive' : 'Negative',
          rawImportance: importance
        }))
        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    : [];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'performance', label: 'Model Performance' },
            { id: 'features', label: 'Feature Importance' },
            { id: 'predictions', label: 'Sample Predictions' },
            { id: 'analysis', label: 'Feature Analysis' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Model Performance Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {model_performance?.accuracy ? (model_performance.accuracy * 100).toFixed(1) + '%' : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Accuracy Score</div>
            <div className="text-xs text-gray-500 mt-2">
              Logistic Regression Model
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {model_performance?.training_samples || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Training Samples</div>
            <div className="text-xs text-gray-500 mt-2">
              80% of total data
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {model_performance?.testing_samples || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Testing Samples</div>
            <div className="text-xs text-gray-500 mt-2">
              20% of total data
            </div>
          </div>

          <div className="md:col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📈 Model Interpretation</h4>
            <p className="text-sm text-blue-800">
              {model_performance?.accuracy 
                ? `The logistic regression model achieves ${(model_performance.accuracy * 100).toFixed(1)}% accuracy in predicting passenger survival. This model considers multiple passenger attributes to estimate survival probability.`
                : 'Model performance data is not available.'}
            </p>
          </div>
        </div>
      )}

      {/* Feature Importance Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Feature Impact on Survival</h3>
            {featureImportanceData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="feature" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value.toFixed(3), 'Absolute Impact']}
                      labelFormatter={(label) => `Feature: ${label}`}
                    />
                    <Bar dataKey="importance" name="Impact Magnitude">
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
              <div className="text-center py-8 text-gray-500">
                No feature importance data available.
              </div>
            )}
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Positive Impact on Survival</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Negative Impact on Survival</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Model Predictions on Test Data</h3>
          {sample_predictions && sample_predictions.length > 0 ? (
            <div className="grid gap-4">
              {sample_predictions.map((prediction, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg border p-4 ${
                    prediction.correct ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        prediction.predicted_survival 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {prediction.predicted_survival ? '✅ Predicted: Survived' : '❌ Predicted: Died'}
                      </span>
                      <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        prediction.actual_survival 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prediction.actual_survival ? 'Actual: Survived' : 'Actual: Died'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round((prediction.survival_probability || 0) * 100)}% confidence
                      </div>
                      <div className={`text-xs ${
                        prediction.correct ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {prediction.correct ? 'Correct Prediction' : 'Incorrect Prediction'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>Class: {prediction.passenger_data?.Pclass || 'N/A'}</div>
                    <div>Age: {prediction.passenger_data?.Age ? Math.round(prediction.passenger_data.Age) : 'N/A'}</div>
                    <div>Sex: {prediction.passenger_data?.Sex || 'N/A'}</div>
                    <div>Fare: ${prediction.passenger_data?.Fare ? prediction.passenger_data.Fare.toFixed(2) : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No sample predictions available.
            </div>
          )}
        </div>
      )}

      {/* Feature Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Detailed Feature Analysis</h3>
          {featureAnalysis && typeof featureAnalysis === 'object' ? (
            <div className="grid gap-6">
              {Object.entries(featureAnalysis).map(([feature, analysis]) => (
                <div key={feature} className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="font-semibold mb-4 capitalize">{feature}</h4>
                  
                  {analysis && typeof analysis === 'object' && !analysis.error ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {analysis.correlation_with_survival !== 'N/A' 
                              ? analysis.correlation_with_survival 
                              : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">Correlation with Survival</div>
                        </div>
                        
                        {analysis.mean_survival && typeof analysis.mean_survival === 'object' && analysis.mean_survival !== 'N/A' ? (
                          <>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-900">
                                {analysis.mean_survival.survived || 'N/A'}
                              </div>
                              <div className="text-sm text-blue-600">Avg Value (Survived)</div>
                            </div>
                            
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <div className="text-lg font-bold text-red-900">
                                {analysis.mean_survival.died || 'N/A'}
                              </div>
                              <div className="text-sm text-red-600">Avg Value (Died)</div>
                            </div>
                          </>
                        ) : (
                          <div className="md:col-span-2 text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-sm text-yellow-700">
                              Mean survival analysis not available for categorical feature
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <strong>Survival Analysis:</strong>{' '}
                        {analysis.survival_by_group || analysis.survival_by_category
                          ? Object.entries(analysis.survival_by_group || analysis.survival_by_category || {})
                              .map(([group, rate]) => `${group}: ${Math.round((rate || 0) * 100)}%`)
                              .join(', ')
                          : 'No survival data available'}
                      </div>
                    </>
                  ) : (
                    <div className="text-red-500">
                      Error analyzing this feature: {analysis?.error || 'Unknown error'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No feature analysis data available.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegressionAnalysis;