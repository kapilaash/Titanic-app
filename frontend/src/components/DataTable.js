import React, { useState, useEffect } from 'react';
import axios from 'axios';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://titanic-app-production.up.railway.app/api' || 'http://localhost:5000/api';

const DataTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    fetchData();
    fetchTotalCount();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/data`, {
        params: { page: currentPage, per_page: itemsPerPage }
      });
      setData(response.data.data);
      setTotalRecords(response.data.total_records);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/count`);
      setTotalRecords(response.data.total_records);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const filteredData = sortedData.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatValue = (value, key) => {
    if (key === 'Survived') {
      return value === 1 ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm animate-pulse">
          ✅ Survived
        </span>
      ) : (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-sm animate-pulse">
          ❌ Perished
        </span>
      );
    }
    if (key === 'Fare') return `$${parseFloat(value).toFixed(2)}`;
    if (key === 'Age') return `${parseInt(value)} yrs`;
    return value;
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center animate-fade-in">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Passenger Data Explorer
        </h2>
        <p className="text-gray-600 mt-2">Interactive exploration of Titanic passenger records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Passengers', value: totalRecords, icon: '👥', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
          { label: 'Features', value: columns.length, icon: '📊', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
          { label: 'Survival Rate', value: `${Math.round((data.filter(row => row.Survived === 1).length / data.length) * 100)}%`, icon: '🛟', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
          { label: 'Avg Age', value: `${Math.round(data.reduce((sum, row) => sum + row.Age, 0) / data.length)} yrs`, icon: '🎂', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-2xl p-6 text-white shadow-lg transition-transform duration-300 hover:scale-105 animate-slide-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-90">{stat.label}</div>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 animate-slide-up">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search passengers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              Page {currentPage} of {Math.ceil(totalRecords / itemsPerPage)}
            </span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                {filteredData.length} results
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                {columns.map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 group"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column}</span>
                      <div className={`transform transition-transform duration-300 ${
                        sortConfig.key === column && sortConfig.direction === 'desc' ? 'rotate-180' : ''
                      } text-gray-400 group-hover:text-gray-600`}>
                        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  className={`transition-all duration-300 hover:scale-105 hover:bg-blue-50 cursor-pointer ${
                    selectedRow?.PassengerId === row.PassengerId ? 'bg-blue-50 scale-105' : ''
                  }`}
                  onClick={() => setSelectedRow(selectedRow?.PassengerId === row.PassengerId ? null : row)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {columns.map((column) => (
                    <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(row[column], column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && searchTerm && (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matching records</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {Math.ceil(totalRecords / itemsPerPage) > 1 && (
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 animate-slide-up">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} passengers
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex space-x-1">
              {[...Array(Math.ceil(totalRecords / itemsPerPage))].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === Math.ceil(totalRecords / itemsPerPage) ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-110 ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 py-2 text-gray-500">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalRecords / itemsPerPage)))}
              disabled={currentPage === Math.ceil(totalRecords / itemsPerPage)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Selected Row Detail */}
      {selectedRow && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200 animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">Passenger Details</h3>
            <button
              onClick={() => setSelectedRow(null)}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(selectedRow).map(([key, value]) => (
              <div key={key} className="bg-white rounded-lg p-4 shadow-sm transition-transform duration-300 hover:scale-105">
                <div className="text-sm font-medium text-gray-600 capitalize">{key}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {formatValue(value, key)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;