import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './components/DataTable';
import SummaryCards from './components/SummaryCards';
import SurvivalCharts from './components/SurvivalCharts';
import CorrelationHeatmap from './components/CorrelationHeatmap';
import RegressionAnalysis from './components/RegressionAnalysis';
import AICopilot from './components/AICopilot';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api';

function App() {
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showCopilotIntro, setShowCopilotIntro] = useState(true);

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
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading Titanic Analytics Dashboard</p>
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
      {/* Optimized Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4 md:gap-0">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-base md:text-lg">🚢</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Titanic Analytics
                </h1>
                <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2">
                  <span className="hidden sm:inline">Real-time passenger analysis</span>
                  <span className="inline sm:hidden">Passenger analysis</span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full hidden md:inline"></span>
                  <span className={`text-xs font-medium hidden md:inline ${
                    connectionStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {connectionStatus === 'connected' ? '● Connected' : '● Connecting...'}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex gap-1 bg-white/50 rounded-2xl p-1 border border-gray-200/50 backdrop-blur-sm w-full md:w-auto justify-between">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 min-w-[60px] md:min-w-[80px] group ${
                    activeView === item.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                >
                  <span className="text-base md:text-lg mb-0.5 md:mb-1">{item.icon}</span>
                  <span className="font-semibold leading-tight">{item.label}</span>
                  <span className={`text-xs mt-0.5 hidden lg:block ${
                    activeView === item.id ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {item.description}
                  </span>
                </button>
              ))}
            </nav>
            
            {/* Dataset Info */}
            <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl px-4 py-2 border border-blue-200">
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
          </div>
        </div>
      </header>
      {showCopilotIntro && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up border border-blue-200 mx-4">
            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg sm:text-xl">🤖</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg md:text-xl">Meet Your AI Copilot</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Personal guide for Titanic analytics</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCopilotIntro(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl p-1 -mr-2"
                aria-label="Close introduction"
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-base sm:text-lg">🎯</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                      <strong className="font-semibold">I can help you navigate</strong> through dashboards, explain insights, and answer questions about Titanic data.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 text-base sm:text-lg">🎤</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                      <strong className="font-semibold">Try voice commands</strong> (coming soon!) to ask questions naturally while exploring.
                    </p>
                  </div>
                </div>
                
                {/* Additional Mobile-Specific Tip */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 border border-blue-100 mt-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <span className="text-lg">📱</span>
                    <span className="text-xs sm:text-sm font-medium">Mobile Friendly</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    The AI Copilot works perfectly on all devices - tap the floating button to start chatting!
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer - Fixed at bottom */}
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-auto order-2 sm:order-1">
                  <label className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 w-4 h-4"
                      defaultChecked
                      onChange={(e) => {
                        if(!e.target.checked) {
                          localStorage.setItem('copilotIntroDismissed', 'true');
                        }
                      }}
                    />
                    Don't show this again
                  </label>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    onClick={() => setShowCopilotIntro(false)}
                    className="px-4 py-2.5 sm:py-2 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => {
                      setShowCopilotIntro(false);
                      // Use ref instead of querySelector for better reliability
                      setTimeout(() => {
                        const copilotButton = document.querySelector('[aria-label="Open AI Copilot"]');
                        if (copilotButton) {
                          copilotButton.click();
                        } else {
                          // Fallback: show toast or open via state if you have ref
                          console.log("Copilot button not found");
                        }
                      }, 300);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 sm:py-2 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm sm:text-base shadow-lg w-full sm:w-auto"
                  >
                    Meet the Copilot →
                  </button>
                </div>
              </div>
              
              {/* Progress indicator for mobile */}
              <div className="flex justify-center mt-4 sm:hidden">
                <div className="flex gap-2">
                  {[1, 2, 3].map((dot, idx) => (
                    <div 
                      key={dot}
                      className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <section className="text-center px-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 leading-tight md:leading-normal">
                Titanic Passenger Analytics
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Explore comprehensive insights from the Titanic dataset with interactive visualizations, 
                machine learning predictions, and detailed passenger analysis.
              </p>
            </section>

            {/* Key Metrics */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                    Key Metrics
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Real-time dataset overview and statistics
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 rounded-xl px-4 py-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Live Data</span>
                </div>
              </div>
              <SummaryCards />
            </section>

            {/* Survival Analysis */}
            <section>
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-200/60 p-5 md:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                      Survival Analysis
                    </h2>
                    <p className="text-gray-600 mt-2 text-sm md:text-base">
                      Interactive charts showing survival patterns
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                    📈
                  </div>
                </div>
                <SurvivalCharts />
              </div>
            </section>

            {/* Feature Highlights */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-blue-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 text-lg md:text-xl mb-4 shadow-sm">
                  🔍
                </div>
                <h3 className="font-bold text-gray-900 text-lg md:text-lg mb-3">Dataset Overview</h3>
                <p className="text-gray-700 text-sm md:text-sm leading-relaxed">
                  Comprehensive analysis of {datasetInfo?.shape[0]} passengers with {datasetInfo?.shape[1]} features including 
                  survival status, class, demographics, and travel details.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-purple-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 text-lg md:text-xl mb-4 shadow-sm">
                  🎯
                </div>
                <h3 className="font-bold text-gray-900 text-lg md:text-lg mb-3">Analysis Scope</h3>
                <ul className="text-gray-700 text-sm md:text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Survival rate patterns by demographics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Passenger class impact analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Feature correlation studies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Predictive modeling insights</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-green-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 text-lg md:text-xl mb-4 shadow-sm">
                  ⚡
                </div>
                <h3 className="font-bold text-gray-900 text-lg md:text-lg mb-3">Technical Stack</h3>
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
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 leading-tight md:leading-normal">
                  Feature Analysis
                </h2>
                <p className="text-base md:text-lg text-gray-600">
                  Explore relationships and patterns in passenger data
                </p>
              </div>
              
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-200/60 p-5 md:p-6 lg:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Feature Correlation Matrix</h3>
                <div className="overflow-x-auto -mx-2 px-2">
                  <CorrelationHeatmap />
                </div>
              </div>
            </section>
            
            <section>
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-200/60 p-5 md:p-6 lg:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Detailed Survival Analysis</h3>
                <SurvivalCharts />
              </div>
            </section>
          </div>
        )}

        {/* ML Insights View */}
        {activeView === 'regression' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 leading-tight md:leading-normal">
                Machine Learning Insights
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                Advanced predictive analytics using Random Forest classification with 84%+ accuracy
              </p>
            </div>
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-200/60 p-5 md:p-6 lg:p-8">
              <RegressionAnalysis />
            </div>
          </div>
        )}

        {/* Data Explorer View */}
        {activeView === 'data' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight md:leading-normal">
                  Data Explorer
                </h2>
                <p className="text-gray-600 mt-2 text-base md:text-lg">
                  Interactive exploration of passenger records
                </p>
              </div>
              <div className="flex items-center gap-4">
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
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-200/60 overflow-hidden">
              <DataTable />
            </div>
          </div>
        )}
      </main>

      {/* Optimized Footer */}
      <footer className="border-t border-gray-200/60 bg-white/80 backdrop-blur-lg mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold">🚢</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Titanic Data Explorer</h3>
                <p className="text-xs md:text-sm text-gray-600">Advanced Analytics Dashboard</p>
              </div>
            </div>
            
            {/* Tech Stack */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>React Frontend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Flask Backend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Machine Learning</span>
              </div>
            </div>
            
            {/* Status */}
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-2 ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-xs md:text-sm">
                  {connectionStatus === 'connected' ? 'System Online' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-xs md:text-sm text-gray-500">
              © 2024 Titanic Analytics Dashboard • Built with modern web technologies
            </p>
          </div>
        </div>
      </footer>
      <AICopilot 
        activeView={activeView} 
        onNavigate={setActiveView} // This should be your setActiveView function
      />
    </div>
  );
}

export default App;