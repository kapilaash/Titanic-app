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
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  const fetchDatasetInfo = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      const response = await axios.get(`${API_BASE}/info`);
      setDatasetInfo(response.data);
      setConnectionStatus('connected');
      setLoading(false);
    } catch (err) {
      console.error('Connection error:', err);
      setError('Unable to connect to the backend server. Please check if the service is running.');
      setConnectionStatus('error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading Titanic Analytics Dashboard</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to data services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-slide-up">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={fetchDatasetInfo}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🔄 Retry Connection
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-300"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊',
      description: 'Overview & Metrics'
    },
    { 
      id: 'analysis', 
      label: 'Analysis', 
      icon: '📈',
      description: 'Feature Analysis'
    },
    { 
      id: 'regression', 
      label: 'ML Insights', 
      icon: '🤖',
      description: 'AI Predictions'
    },
    { 
      id: 'data', 
      label: 'Data Explorer', 
      icon: '📋',
      description: 'Raw Data'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">🚢</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Titanic Analytics
                </h1>
                <p className="text-sm text-gray-500 flex items-center space-x-2">
                  <span>Real-time passenger analysis</span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className={`text-xs font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {connectionStatus === 'connected' ? '● Connected' : '● Connecting...'}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Navigation & Stats */}
            <div className="flex items-center space-x-6">
              {/* Dataset Info */}
              <div className="hidden lg:flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl px-4 py-2 border border-blue-200">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {datasetInfo?.shape[0]} passengers
                  </div>
                  <div className="text-xs text-gray-600">
                    {datasetInfo?.shape[1]} features
                  </div>
                </div>
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-blue-600 text-sm">📊</span>
                </div>
              </div>
              
              {/* Navigation */}
              <nav className="flex space-x-1 bg-white/50 rounded-2xl p-1 border border-gray-200/50 backdrop-blur-sm">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-w-[80px] group ${
                      activeView === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                    }`}
                  >
                    <span className="text-lg mb-1">{item.icon}</span>
                    <span className="font-semibold">{item.label}</span>
                    <span className={`text-xs mt-1 ${
                      activeView === item.id ? 'text-blue-100' : 'text-gray-400'
                    } hidden lg:block`}>
                      {item.description}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <section className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Titanic Passenger Analytics
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Explore comprehensive insights from the Titanic dataset with interactive visualizations, 
                machine learning predictions, and detailed passenger analysis.
              </p>
            </section>

            {/* Key Metrics */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Key Metrics</h2>
                  <p className="text-gray-600 mt-2">Real-time dataset overview and statistics</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white/50 rounded-xl px-4 py-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Live Data</span>
                </div>
              </div>
              <SummaryCards />
            </section>

            {/* Survival Analysis */}
            <section>
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Survival Analysis</h2>
                    <p className="text-gray-600 mt-2">Interactive charts showing survival patterns</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                    📈
                  </div>
                </div>
                <SurvivalCharts />
              </div>
            </section>

            {/* Feature Highlights */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-3xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 text-xl mb-4 shadow-sm">
                  🔍
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">Dataset Overview</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Comprehensive analysis of 891 passengers with 12 engineered features including 
                  survival status, class, demographics, and travel details.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-3xl p-6 border border-purple-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 text-xl mb-4 shadow-sm">
                  🎯
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">Analysis Scope</h3>
                <ul className="text-gray-700 text-sm space-y-2">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Survival rate patterns by demographics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Passenger class impact analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Feature correlation studies</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Predictive modeling insights</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 text-xl mb-4 shadow-sm">
                  ⚡
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">Technical Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {['React', 'Tailwind', 'Flask', 'Pandas', 'Scikit-learn', 'Python'].map((tech) => (
                    <span key={tech} className="bg-white/80 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Analysis View */}
        {activeView === 'analysis' && (
          <div className="space-y-8 animate-fade-in">
            <section>
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  Feature Analysis
                </h2>
                <p className="text-xl text-gray-600">
                  Explore relationships and patterns in passenger data
                </p>
              </div>
              
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Feature Correlation Matrix</h3>
                <CorrelationHeatmap />
              </div>
            </section>
            
            <section>
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Detailed Survival Analysis</h3>
                <SurvivalCharts />
              </div>
            </section>
          </div>
        )}

        {/* ML Insights View */}
        {activeView === 'regression' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Machine Learning Insights
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Advanced predictive analytics using Random Forest classification with 84%+ accuracy
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 p-8">
              <RegressionAnalysis />
            </div>
          </div>
        )}

        {/* Data Explorer View */}
        {activeView === 'data' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Data Explorer
                </h2>
                <p className="text-xl text-gray-600 mt-2">
                  Interactive exploration of passenger records
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl px-4 py-2 border border-blue-200">
                  <div className="text-sm font-semibold text-gray-900">
                    {datasetInfo?.shape[0]} records
                  </div>
                  <div className="text-xs text-gray-600">
                    Paginated view
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 overflow-hidden">
              <DataTable />
            </div>
          </div>
        )}
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t border-gray-200/60 bg-white/80 backdrop-blur-lg mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            {/* Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold">🚢</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Titanic Data Explorer</h3>
                <p className="text-sm text-gray-600">Advanced Analytics Dashboard</p>
              </div>
            </div>
            
            {/* Tech Stack */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>React Frontend</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Flask Backend</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Machine Learning</span>
              </div>
            </div>
            
            {/* Status */}
            <div className="flex items-center space-x-4 text-sm">
              <div className={`flex items-center space-x-2 ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>
                  {connectionStatus === 'connected' ? 'System Online' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 Titanic Analytics Dashboard • Built with modern web technologies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;