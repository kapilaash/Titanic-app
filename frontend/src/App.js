import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './components/DataTable';
import SummaryCards from './components/SummaryCards';
import SurvivalCharts from './components/SurvivalCharts';
import CorrelationHeatmap from './components/CorrelationHeatmap';
import RegressionAnalysis from './components/RegressionAnalysis';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api';
function App() {
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  const fetchDatasetInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/info`);
      setDatasetInfo(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to connect to backend. Make sure Flask is running on port 5000.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Titanic Analysis Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold">Connection Error</h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchDatasetInfo}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Titanic Analysis</h1>
                <p className="text-sm text-gray-500">Passenger survival analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-1 text-sm">
                <span className="text-gray-500">Dataset:</span>
                <span className="font-medium text-gray-900">
                  {datasetInfo?.shape[0]} rows × {datasetInfo?.shape[1]} features
                </span>
              </div>
              
              <nav className="flex space-x-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { id: 'analysis', label: 'Analysis', icon: '📈' },
                  { id: 'regression', label: 'ML Analysis', icon: '🤖' },
                  { id: 'data', label: 'Data', icon: '📋' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeView === item.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Key Metrics</h2>
                <div className="text-sm text-gray-500">
                  Real-time dataset overview
                </div>
              </div>
              <SummaryCards />
            </section>

            {/* Survival Analysis */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Survival Analysis</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SurvivalCharts />
              </div>
            </section>

            {/* Quick Insights */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Dataset Overview</h3>
                <p className="text-gray-600 text-sm">
                  The Titanic dataset contains passenger information from the 1912 maiden voyage, 
                  including survival status, class, age, and fare details for analysis.
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Analysis Scope</h3>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• Survival rate patterns by demographics</li>
                  <li>• Passenger class impact analysis</li>
                  <li>• Feature correlation studies</li>
                  <li>• Predictive modeling insights</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Technical Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {['React', 'Tailwind CSS', 'Flask', 'Pandas', 'Python'].map((tech) => (
                    <span key={tech} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeView === 'analysis' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Feature Correlation Matrix</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <CorrelationHeatmap />
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Survival Analysis</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SurvivalCharts />
              </div>
            </section>
          </div>
        )}
        {activeView === 'regression' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Machine Learning Analysis</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <RegressionAnalysis />
            </div>
          </div>
        )}
        {activeView === 'data' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Data Preview</h2>
              <div className="text-sm text-gray-500">
                First 100 records from cleaned dataset
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <DataTable />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">T</span>
              </div>
              <span className="text-sm text-gray-600">Titanic Data Explorer</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <span>Built with React & Flask</span>
              <span>•</span>
              <span>Data Visualization Dashboard</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;