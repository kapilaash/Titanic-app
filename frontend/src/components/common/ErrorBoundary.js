import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[UI ErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            This section could not be displayed
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Please retry. If the issue continues, check the browser console and backend response.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Retry Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
