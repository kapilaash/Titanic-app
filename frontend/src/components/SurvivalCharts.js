import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api' || 'http://localhost:5000/api';

const SurvivalCharts = () => {
  const [survivalData, setSurvivalData] = useState(null);
  const [activeChart, setActiveChart] = useState('class');

  useEffect(() => {
    axios.get(`${API_BASE}/survival_rates`)
      .then(response => setSurvivalData(response.data))
      .catch(error => console.error('Error fetching survival rates:', error));
  }, []);

  if (!survivalData) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  // Transform data for charts
  const classData = Object.entries(survivalData.by_class).map(([pclass, rate]) => ({
    category: `Class ${pclass}`,
    survivalRate: (rate * 100),
    color: pclass === '1' ? '#6366f1' : pclass === '2' ? '#8b5cf6' : '#ec4899'
  }));

  const sexData = Object.entries(survivalData.by_sex).map(([sex, rate]) => ({
    category: sex.charAt(0).toUpperCase() + sex.slice(1),
    survivalRate: (rate * 100),
    color: sex === 'female' ? '#ec4899' : '#6366f1'
  }));

  const embarkedData = Object.entries(survivalData.by_embarked).map(([port, rate]) => ({
    category: port === 'C' ? 'Cherbourg' : port === 'Q' ? 'Queenstown' : 'Southampton',
    survivalRate: (rate * 100),
    color: port === 'C' ? '#10b981' : port === 'Q' ? '#f59e0b' : '#6366f1'
  }));

  const titleData = Object.entries(survivalData.by_title).map(([title, rate]) => ({
    category: title,
    survivalRate: (rate * 100),
    color: title === 'Mrs' ? '#ec4899' : title === 'Miss' ? '#f472b6' : title === 'Master' ? '#60a5fa' : '#6b7280'
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-xl shadow-lg">
          <p className="font-bold text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Survival Rate: <span className="font-bold text-blue-600">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const chartConfigs = {
    class: { data: classData, title: 'Passenger Class', description: 'Survival rates by ticket class' },
    sex: { data: sexData, title: 'Gender', description: 'Survival rates by gender' },
    embarked: { data: embarkedData, title: 'Embarkation Port', description: 'Survival rates by boarding location' },
    title: { data: titleData, title: 'Passenger Title', description: 'Survival rates by social title' }
  };

  const currentConfig = chartConfigs[activeChart];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Survival Analysis
        </h2>
        <p className="text-gray-600 mt-2">Explore survival patterns across different passenger categories</p>
      </div>

      {/* Chart Selector */}
      <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-200">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(chartConfigs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveChart(key)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                activeChart === key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {config.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{currentConfig.title}</h3>
            <p className="text-gray-600 text-sm">{currentConfig.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {Math.max(...currentConfig.data.map(d => d.survivalRate)).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Highest Survival Rate</div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentConfig.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
                angle={currentConfig.data.length > 4 ? -45 : 0}
                textAnchor={currentConfig.data.length > 4 ? 'end' : 'middle'}
                height={currentConfig.data.length > 4 ? 80 : 60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Survival Rate (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: -10,
                  style: { fontSize: 12 }
                }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="survivalRate" 
                name="Survival Rate (%)" 
                radius={[4, 4, 0, 0]}
              >
                {currentConfig.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "First Class Advantage",
            description: "62% of 1st class passengers survived vs 25% in 3rd class",
            icon: "👑",
            color: "from-purple-500 to-pink-500"
          },
          {
            title: "Gender Gap",
            description: "74% of females survived vs only 19% of males",
            icon: "🚺",
            color: "from-pink-500 to-rose-500"
          },
          {
            title: "Port Impact",
            description: "Cherbourg had highest survival rate at 55%",
            icon: "⚓",
            color: "from-blue-500 to-cyan-500"
          },
          {
            title: "Social Status",
            description: "Women and children had significantly better chances",
            icon: "👶",
            color: "from-green-500 to-emerald-500"
          }
        ].map((insight, index) => (
          <div
            key={insight.title}
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${insight.color} flex items-center justify-center text-white text-sm mb-3`}>
              {insight.icon}
            </div>
            <h4 className="font-bold text-gray-900 text-sm mb-2">{insight.title}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>

      {/* Comparative Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4">📊 Survival Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(survivalData.by_sex.female * 100)}%
            </div>
            <div className="text-gray-600">Female Survival</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {Math.round(survivalData.by_sex.male * 100)}%
            </div>
            <div className="text-gray-600">Male Survival</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(survivalData.by_class[1] * 100)}%
            </div>
            <div className="text-gray-600">1st Class Survival</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(survivalData.by_class[3] * 100)}%
            </div>
            <div className="text-gray-600">3rd Class Survival</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurvivalCharts;