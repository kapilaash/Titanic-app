// components/AICopilot.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'https://titanic-app-production.up.railway.app/api';
// const API_BASE = 'http://localhost:5000/api';

// Custom markdown renderer component - FIXED VERSION
const MarkdownText = ({ text }) => {
  // Handle null/undefined cases
  if (!text) return null;
  
  // Ensure text is a string
  const textString = typeof text === 'string' ? text : String(text);
  
  // Split by lines and process each line
  const lines = textString.split('\n');
  
  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {lines.map((line, lineIndex) => {
        // Skip empty lines
        if (line.trim() === '') {
          return <br key={lineIndex} />;
        }
        
        // Check if it's a bullet point
        if (line.trim().startsWith('•')) {
          return (
            <div key={lineIndex} className="flex items-start ml-2">
              <span className="mr-2 mt-1 text-gray-700">•</span>
              <span className="flex-1">
                <InlineMarkdown text={line.substring(1).trim()} />
              </span>
            </div>
          );
        }
        
        // Check if it's a numbered list
        const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={lineIndex} className="flex items-start ml-2">
              <span className="mr-2 mt-1 text-gray-700 font-semibold">{numberedMatch[1]}.</span>
              <span className="flex-1">
                <InlineMarkdown text={numberedMatch[2]} />
              </span>
            </div>
          );
        }
        
        // Regular line with markdown
        return (
          <div key={lineIndex}>
            <InlineMarkdown text={line} />
          </div>
        );
      })}
    </div>
  );
};

// Component for inline markdown (bold, etc.) - FIXED VERSION
const InlineMarkdown = ({ text }) => {
  // Ensure text is a string
  const textString = typeof text === 'string' ? text : String(text);
  
  const parts = [];
  let currentIndex = 0;
  let boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  // Find all bold sections
  while ((match = boldRegex.exec(textString)) !== null) {
    // Add text before the bold section
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: textString.substring(currentIndex, match.index)
      });
    }
    
    // Add the bold section
    parts.push({
      type: 'bold',
      content: match[1]
    });
    
    currentIndex = boldRegex.lastIndex;
  }
  
  // Add any remaining text
  if (currentIndex < textString.length) {
    parts.push({
      type: 'text',
      content: textString.substring(currentIndex)
    });
  }
  
  // If no bold text found, return plain text
  if (parts.length === 0) {
    return <span>{textString}</span>;
  }
  
  // Render the parts
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'bold') {
          return (
            <strong key={index} className="font-semibold text-gray-900">
              {part.content}
            </strong>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </>
  );
};

const AICopilot = ({ activeView, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [showTour, setShowTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [apiStatus, setApiStatus] = useState('unknown');
  const [connectionError, setConnectionError] = useState('');
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const tourOverlayRef = useRef(null);

  // Check API health on component mount and when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      checkApiHealth();
    }
  }, [isOpen, isMinimized]);

  const checkApiHealth = async () => {
    try {
      console.log('🔍 Checking API health...');
      const response = await axios.get(`${API_BASE}/copilot/health`, {
        timeout: 3000
      });
      console.log('✅ API Health:', response.data);
      setApiStatus('healthy');
      setConnectionError('');
      
      // If we have no messages, show welcome with status
      if (messages.length === 0) {
        const welcomeMessage = {
          id: 1,
          role: 'assistant',
          content: `👋 **Welcome to Titanic Analytics!**\n\nI'm your AI Copilot. I can help you:\n• Navigate through the app\n• Explain features and data\n• Analyze survival patterns\n• Make predictions\n• Answer your questions\n\n**Status:** ✅ Connected to backend\n\nWhat would you like to explore today?`,
          type: 'welcome',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('❌ API Health check failed:', error);
      setApiStatus('unhealthy');
      setConnectionError(error.message);
      
      // Show connection error message
      if (messages.length === 0) {
        const errorMessage = {
          id: 1,
          role: 'assistant',
          content: `⚠️ **Connection Issue**\n\nI cannot connect to the backend server. Please ensure:\n1. Flask server is running on port 5000\n2. CORS is properly configured\n3. No firewall is blocking the connection\n\n**Temporary Mode:** Using fallback responses only.\n\nYou can still ask about Titanic data!`,
          type: 'error',
          timestamp: new Date().toISOString()
        };
        setMessages([errorMessage]);
      }
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: 1,
        role: 'assistant',
        content: `👋 **Welcome to Titanic Analytics!**\n\nI'm your AI Copilot. I can help you:\n• Navigate through the app\n• Explain features and data\n• Analyze survival patterns\n• Make predictions\n• Answer your questions\n\n**Status:** Checking connection...`,
        type: 'welcome',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      checkApiHealth();
    }
  }, [isOpen, messages.length]);

  // Update context when activeView changes
  useEffect(() => {
    if (isOpen && !isMinimized) {
      updateContext(activeView);
      loadQuickActions(activeView);
    }
  }, [activeView, isOpen, isMinimized]);

  // Close tour when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTour && tourOverlayRef.current && 
          !tourOverlayRef.current.contains(event.target) &&
          !event.target.closest('.tour-button')) {
        setShowTour(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTour]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const updateContext = async (context) => {
    try {
      await axios.post(`${API_BASE}/copilot/set-context`, {
        context: context
      }, {
        timeout: 3000
      });
      console.log(`✅ Context updated to: ${context}`);
    } catch (error) {
      console.warn('⚠️ Context update failed (fallback mode):', error.message);
    }
  };

  const loadQuickActions = async (context) => {
    try {
      const response = await axios.get(`${API_BASE}/copilot/quick-actions`, {
        params: { context },
        timeout: 3000
      });
      setQuickActions(response.data.actions);
    } catch (error) {
      console.warn('⚠️ Quick actions failed, using fallback:', error.message);
      // Fallback actions if API fails
      const fallbackActions = {
        dashboard: [
          {icon: '📊', label: 'View Stats', action: 'ask:Show survival statistics'},
          {icon: '📈', label: 'Go to Analysis', action: 'navigate:analysis'},
          {icon: '🤖', label: 'Try Prediction', action: 'navigate:regression'},
          {icon: '🔍', label: 'Explore Data', action: 'navigate:data'}
        ],
        analysis: [
          {icon: '🔥', label: 'Explain Heatmap', action: 'ask:What does the heatmap show'},
          {icon: '👥', label: 'Class Analysis', action: 'ask:Show survival by class'},
          {icon: '⚡', label: 'Quick Predict', action: 'ask:Predict for female in 1st class'},
          {icon: '🏠', label: 'Back to Dashboard', action: 'navigate:dashboard'}
        ],
        regression: [
          {icon: '🎯', label: 'Make Prediction', action: 'open_predictor'},
          {icon: '📊', label: 'View Accuracy', action: 'ask:What is the model accuracy'},
          {icon: '🔑', label: 'Key Factors', action: 'ask:What factors are most important'},
          {icon: '📈', label: 'Go to Analysis', action: 'navigate:analysis'}
        ],
        data: [
          {icon: '🔍', label: 'Search Passengers', action: 'focus_search'},
          {icon: '📋', label: 'Filter by Class', action: 'filter:pclass:1'},
          {icon: '📊', label: 'Back to Stats', action: 'navigate:dashboard'},
          {icon: '🤖', label: 'Ask AI', action: 'open_chat'}
        ]
      };
      setQuickActions(fallbackActions[context] || fallbackActions.dashboard);
    }
  };

    const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
        id: Date.now(),
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        console.log('📤 Sending to copilot:', input);
        
        // Try the API endpoint first
        let response;
        try {
        response = await axios.post(`${API_BASE}/copilot/chat`, {
            question: input,
            context: activeView
        }, {
            timeout: 10000
        });
        console.log('📥 Received from API:', response.data);
        } catch (apiError) {
        console.warn('⚠️ API call failed, using fallback:', apiError.message);
        // Use fallback responses if API fails
        response = {
            data: generateFallbackResponse(input, activeView)
        };
        }

        // Extract and format the response properly
        let responseText = '';
        let responseType = 'text';
        let responseSuggestions = [];
        
        if (response.data && response.data.response) {
        // Check if response is a string (could be JSON string or regular string)
        if (typeof response.data.response === 'string') {
            // Try to parse if it looks like JSON
            try {
            const parsed = JSON.parse(response.data.response);
            if (parsed.response) {
                responseText = parsed.response;
                responseType = parsed.type || 'text';
            } else {
                responseText = response.data.response;
                responseType = response.data.type || 'text';
            }
            } catch {
            // Not JSON, use as is
            responseText = response.data.response;
            responseType = response.data.type || 'text';
            }
        } else if (typeof response.data.response === 'object') {
            // Response is already an object
            if (response.data.response.response) {
            responseText = response.data.response.response;
            responseType = response.data.response.type || 'text';
            } else {
            responseText = JSON.stringify(response.data.response);
            responseType = response.data.type || 'text';
            }
        } else {
            responseText = String(response.data.response);
            responseType = response.data.type || 'text';
        }
        } else {
        responseText = "I don't have an answer for that right now.";
        }
        
        // Get suggestions
        responseSuggestions = response.data.suggestions || [];

        const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText,
        type: responseType,
        data: response.data.data,
        suggestions: responseSuggestions,
        timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Reload quick actions
        loadQuickActions(activeView);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        
        const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "⚠️ **An unexpected error occurred.**\n\nPlease try again or check the console for details.",
        type: 'error',
        timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
    };

  // Fallback response generator when API is unavailable
  const generateFallbackResponse = (question, context) => {
    const questionLower = question.toLowerCase();
    
    // Titanic statistics (pre-calculated or hardcoded for fallback)
    const titanicStats = {
      overall_survival: 38.4,
      total_passengers: 891,
      female_survival: 74.2,
      male_survival: 18.9,
      first_class_survival: 62.9,
      second_class_survival: 47.3,
      third_class_survival: 24.2,
      model_accuracy: 84.3,
      average_age: 29.7,
      average_fare: 32.2
    };
    
    // Check for common questions
    if (questionLower.includes('accuracy') || questionLower.includes('model')) {
      return {
        response: `**Model Accuracy:** ${titanicStats.model_accuracy}%\n\n**Details:**\n• Model Type: Random Forest\n• Training Samples: 712 passengers\n• Testing Samples: 179 passengers\n• Top Features: Pclass, Sex, Fare, Age, Title\n\n*Note: Using fallback data - API connection issue*`,
        type: 'model_info',
        suggestions: []
      };
    } else if (questionLower.includes('survival') && questionLower.includes('overall')) {
      const survivors = Math.round(titanicStats.total_passengers * titanicStats.overall_survival / 100);
      return {
        response: `**Overall Survival Rate:** ${titanicStats.overall_survival}%\n\nThat's **${survivors} survivors** out of ${titanicStats.total_passengers} total passengers.\n\n*Note: Using fallback data - API connection issue*`,
        type: 'statistics',
        suggestions: []
      };
    } else if (questionLower.includes('female') && questionLower.includes('survival')) {
      return {
        response: `**Female Survival Rate:** ${titanicStats.female_survival}%\n**Male Survival Rate:** ${titanicStats.male_survival}%\n\nFemale passengers were much more likely to survive.\n\n*Note: Using fallback data - API connection issue*`,
        type: 'statistics',
        suggestions: []
      };
    } else if (questionLower.includes('class') && questionLower.includes('survival')) {
      return {
        response: `**Survival by Passenger Class:**\n\n• **First Class:** ${titanicStats.first_class_survival}%\n• **Second Class:** ${titanicStats.second_class_survival}%\n• **Third Class:** ${titanicStats.third_class_survival}%\n\nFirst class passengers had the highest survival rates.\n\n*Note: Using fallback data - API connection issue*`,
        type: 'statistics',
        suggestions: []
      };
    } else if (questionLower.includes('average age')) {
      return {
        response: `The **average age** of passengers was **${titanicStats.average_age} years**.\n\n*Note: Using fallback data - API connection issue*`,
        type: 'statistics',
        suggestions: []
      };
    } else if (questionLower.includes('help') || questionLower.includes('what can')) {
      return {
        response: `**You're in the ${context} section!**\n\nI can help you with:\n• Survival statistics and rates\n• Passenger demographics\n• Model accuracy and predictions\n• Data analysis insights\n\nTry asking specific questions about the Titanic data!\n\n*Note: In fallback mode - Some features limited*`,
        type: 'navigation',
        suggestions: []
      };
    }
    
    // Default fallback response
    return {
      response: `I can help analyze Titanic data! Here's what I know:\n\n• Overall survival: ${titanicStats.overall_survival}%\n• Female survival: ${titanicStats.female_survival}%\n• Model accuracy: ${titanicStats.model_accuracy}%\n• Average age: ${titanicStats.average_age} years\n\nTry asking about specific survival rates or passenger statistics!\n\n*Note: Using fallback mode - Backend connection issue*`,
      type: 'fallback',
      suggestions: []
    };
  };

  const handleAction = (action) => {
    if (!action) return;

    switch (action.type) {
      case 'navigate':
        if (onNavigate && action.destination) {
          onNavigate(action.destination);
          // Briefly minimize when navigating
          setIsMinimized(true);
          setTimeout(() => setIsMinimized(false), 500);
        }
        break;
      case 'ask':
        if (action.question) {
          setInput(action.question);
          setTimeout(() => handleSend(), 100);
        }
        break;
      default:
        break;
    }
  };

  const handleQuickAction = (action) => {
    if (action.startsWith('navigate:')) {
      const dest = action.split(':')[1];
      if (onNavigate) {
        onNavigate(dest);
        setIsMinimized(true);
        setTimeout(() => setIsMinimized(false), 500);
      }
    } else if (action.startsWith('ask:')) {
      const question = action.split(':')[1];
      setInput(question);
      setTimeout(() => handleSend(), 100);
    } else if (action === 'start_tour') {
      startTour();
    } else if (action === 'open_predictor') {
      if (onNavigate) {
        onNavigate('regression');
        setIsMinimized(true);
        setTimeout(() => setIsMinimized(false), 500);
      }
    } else if (action === 'open_chat') {
      setIsMinimized(false);
      setInput('');
    } else if (action === 'test_connection') {
      checkApiHealth();
    }
  };

  const startTour = async () => {
    try {
      const response = await axios.get(`${API_BASE}/copilot/tour`, {
        params: { type: 'quick' },
        timeout: 3000
      });
      setTourSteps(response.data.tour.steps);
      setShowTour(true);
      setCurrentTourStep(0);
    } catch (error) {
      console.warn('⚠️ Tour API failed, using fallback tour:', error.message);
      // Fallback tour
      setTourSteps([
        {
          step: 1, 
          section: "dashboard", 
          title: "Dashboard Overview", 
          description: "Start here to see key metrics, survival charts, and dataset insights at a glance."
        },
        {
          step: 2, 
          section: "analysis", 
          title: "Feature Analysis", 
          description: "Explore correlations between features and analyze survival patterns by demographics."
        },
        {
          step: 3, 
          section: "regression", 
          title: "ML Predictions", 
          description: "Try survival predictions with our AI model and see feature importance."
        },
        {
          step: 4, 
          section: "data", 
          title: "Data Explorer", 
          description: "Browse passenger records, filter data, and explore individual passenger details."
        }
      ]);
      setShowTour(true);
      setCurrentTourStep(0);
    }
  };

  const nextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      const nextStep = tourSteps[currentTourStep + 1];
      if (onNavigate) {
        onNavigate(nextStep.section);
      }
      setCurrentTourStep(currentTourStep + 1);
    } else {
      setShowTour(false);
      setTourSteps([]);
      setCurrentTourStep(0);
    }
  };

  const prevTourStep = () => {
    if (currentTourStep > 0) {
      const prevStep = tourSteps[currentTourStep - 1];
      if (onNavigate) {
        onNavigate(prevStep.section);
      }
      setCurrentTourStep(currentTourStep - 1);
    }
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'navigation': return '🧭';
      case 'analysis': return '📊';
      case 'prediction': return '🤖';
      case 'explanation': return '💡';
      case 'help': return '❓';
      case 'tour': return '🗺️';
      case 'model_info': return '🎯';
      case 'statistics': return '📈';
      default: return '✨';
    }
  };

  const getSectionIcon = (section) => {
    switch(section) {
      case 'dashboard': return '📊';
      case 'analysis': return '📈';
      case 'regression': return '🤖';
      case 'data': return '📋';
      default: return '⚡';
    }
  };

  const handleMinimizeToggle = () => {
    setIsMinimized(!isMinimized);
    // If we're minimizing and there's a tour open, close it
    if (!isMinimized && showTour) {
      setShowTour(false);
    }
  };

  const handleCloseCopilot = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setShowTour(false);
  };

  // Get current tour step data
  const currentStep = tourSteps[currentTourStep];

  // Add a test connection function
  const testConnection = async () => {
    console.log('🔍 Testing connection to:', API_BASE);
    try {
      const test = await axios.get(`${API_BASE}/health`, { timeout: 3000 });
      console.log('✅ Connection test successful:', test.data);
      
      const copilotTest = await axios.get(`${API_BASE}/copilot/health`, { timeout: 3000 });
      console.log('✅ Copilot health:', copilotTest.data);
      
      // Add success message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: "✅ **Connection Test Successful!**\n\nBackend is responding correctly.",
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
      
      setApiStatus('healthy');
      setConnectionError('');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ **Connection Test Failed**\n\nError: ${error.message}\n\nPlease ensure:\n1. Flask server is running\n2. Port 5000 is not blocked\n3. Check browser console for details`,
        type: 'error',
        timestamp: new Date().toISOString()
      }]);
      setApiStatus('unhealthy');
      setConnectionError(error.message);
    }
  };

  return (
    <>
      {/* Main Toggle Button - Only shows when copilot is closed */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            checkApiHealth();
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open AI Copilot"
        >
          <div className="relative">
            <span className="text-xl">🤖</span>
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${apiStatus === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
          </div>
          <div className="absolute -top-12 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            AI Copilot
          </div>
        </button>
      )}

      {/* Copilot Panel - When open and not minimized */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-24 right-6 z-50">
          {/* Main Panel */}
          <div className="bg-white rounded-2xl shadow-2xl w-96 max-w-[90vw] flex flex-col border border-gray-200 max-h-[80vh]">
            {/* Header - Fixed at top */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${apiStatus === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI Copilot</h3>
                  <p className="text-blue-100 text-sm">Titanic Analytics Guide</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={testConnection}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Test Connection"
                  aria-label="Test backend connection"
                >
                  <span className="text-xl">🔌</span>
                </button>
                <button
                  onClick={startTour}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors tour-button"
                  title="Start Tour"
                  aria-label="Start app tour"
                >
                  <span className="text-xl">🗺️</span>
                </button>
                <button
                  onClick={handleCloseCopilot}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close copilot"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Connection Status Bar */}
            <div className={`px-4 py-2 text-xs font-medium ${apiStatus === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span>
                    {apiStatus === 'healthy' ? '✅ Connected to backend' : '⚠️ Backend connection issue'}
                  </span>
                </div>
                {apiStatus === 'unhealthy' && (
                  <button 
                    onClick={testConnection}
                    className="text-xs underline hover:no-underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Current Section Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getSectionIcon(activeView)}</span>
                <div>
                  <div className="font-bold text-gray-900 capitalize">{activeView} Section</div>
                  <div className="text-xs text-gray-600">
                    {activeView === 'dashboard' && 'Overview & Metrics'}
                    {activeView === 'analysis' && 'Feature Analysis'}
                    {activeView === 'regression' && 'ML Predictions'}
                    {activeView === 'data' && 'Data Explorer'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleMinimizeToggle}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Minimize chat"
                title="Minimize chat"
              >
                <span className="text-lg">🔽</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.action)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-gray-700 text-xs px-3 py-2 rounded-full transition-colors shadow-sm border border-blue-100"
                    aria-label={action.label}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Container - Scrollable */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
              style={{ maxHeight: 'calc(80vh - 180px)' }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">AI</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                    }`}
                  >
                    <MarkdownText text={msg.content} />
                    
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300/30">
                        <div className="text-xs text-gray-600 mb-2">Try asking:</div>
                        <div className="flex flex-wrap gap-2">
                          {msg.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAction(suggestion.action)}
                              className="text-xs bg-white hover:bg-gray-50 text-gray-700 px-2 py-1 rounded-lg transition-colors border"
                            >
                              <span className="flex items-center gap-1">
                                {getIconForType(suggestion.type)}
                                {suggestion.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-gray-600 text-sm">You</span>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">AI</span>
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {apiStatus === 'healthy' ? 'Thinking...' : 'Using fallback mode...'}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Fixed at bottom */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={apiStatus === 'healthy' ? "Ask about navigation, features, or data..." : "Fallback mode - Ask about Titanic data"}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  disabled={isLoading}
                  aria-label="Ask AI Copilot"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <span className="text-xl">➤</span>
                </button>
              </div>
              {apiStatus === 'unhealthy' && (
                <div className="text-xs text-yellow-600 mt-2 text-center">
                  ⚠️ Working in fallback mode - Backend connection issue
                </div>
              )}
            </div>
          </div>

          {/* Tour Overlay - Fixed positioning independent of scroll */}
          {showTour && (
            <div 
              ref={tourOverlayRef}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw]"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">🗺️</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">App Tour Guide</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          Step {currentTourStep + 1} of {tourSteps.length}
                        </span>
                        <span>•</span>
                        <span>{currentStep?.title || 'Getting Started'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTour(false)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close tour"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">You're currently in:</div>
                  <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 mb-4">
                    <span className="text-2xl">{getSectionIcon(currentStep?.section || activeView)}</span>
                    <div>
                      <div className="font-bold text-gray-900 capitalize">{currentStep?.section || activeView} Section</div>
                      <div className="text-xs text-gray-600">
                        {currentStep?.section === 'dashboard' && 'Overview & Metrics'}
                        {currentStep?.section === 'analysis' && 'Feature Analysis'}
                        {currentStep?.section === 'regression' && 'ML Predictions'}
                        {currentStep?.section === 'data' && 'Data Explorer'}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">
                    {currentStep?.description || 'Explore this section to learn more about Titanic data analysis.'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tourSteps.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full ${idx === currentTourStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={prevTourStep}
                      disabled={currentTourStep === 0}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={nextTourStep}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      {currentTourStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next →'}
                    </button>
                  </div>
                </div>

                {/* Quick Tip */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    💡 <strong>Tip:</strong> The AI Copilot can answer questions about any section. Just ask!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimized State - Only shows when minimized */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-24 right-6 z-50">
          <button
            onClick={() => setIsMinimized(false)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 flex items-center gap-2 pl-4 pr-5"
            aria-label="Expand AI Copilot"
            title="Expand AI Copilot"
          >
            <span className="text-xl">🤖</span>
            <span className="text-sm font-medium">Copilot</span>
            <div className={`w-2 h-2 rounded-full ${apiStatus === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
          </button>
        </div>
      )}

      {/* Tour Backdrop - When tour is open */}
      {showTour && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setShowTour(false)}
        />
      )}
    </>
  );
};

export default AICopilot;