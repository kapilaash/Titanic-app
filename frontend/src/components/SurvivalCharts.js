import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const SurvivalCharts = () => {
  const [survivalData, setSurvivalData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/survival_rates`)
      .then(response => setSurvivalData(response.data))
      .catch(error => console.error('Error fetching survival rates:', error));
  }, []);

  if (!survivalData) return (
    <div className="flex justify-center py-8">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );

  // Transform data for Recharts
  const classData = Object.entries(survivalData.by_class).map(([pclass, rate]) => ({
    category: `Class ${pclass}`,
    survivalRate: (rate * 100).toFixed(1),
    fill: '#8884d8'
  }));

  const sexData = Object.entries(survivalData.by_sex).map(([sex, rate]) => ({
    category: sex,
    survivalRate: (rate * 100).toFixed(1),
    fill: '#82ca9d'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Passenger Class Chart */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-4 text-center">By Passenger Class</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={classData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: 'Survival Rate %', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Survival Rate']}
              labelStyle={{ color: '#1f2937' }}
            />
            <Bar dataKey="survivalRate" name="Survival Rate %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gender Chart */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-4 text-center">By Gender</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sexData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: 'Survival Rate %', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Survival Rate']}
              labelStyle={{ color: '#1f2937' }}
            />
            <Bar dataKey="survivalRate" name="Survival Rate %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SurvivalCharts;