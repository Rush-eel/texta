import { useState, useEffect } from 'react'
import { apiService } from './services/apiService'

export default function TextAnalyzer() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('distilbert-base-uncased-finetuned-sst-2-english');
  const [availableModels, setAvailableModels] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [fileContent, setFileContent] = useState('');
  const [modelComparison, setModelComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvResults, setCsvResults] = useState(null);
  const [csvProgress, setCsvProgress] = useState({ current: 0, total: 0 });
  const [currentCsvIndex, setCurrentCsvIndex] = useState(0);

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const health = await apiService.healthCheck();
      const models = await apiService.getAvailableModels();
      setAvailableModels(models.available_models);
      setBackendStatus('connected');
    } catch (error) {
      console.error('Backend connection failed:', error);
      setBackendStatus('disconnected');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      if (file.name.endsWith('.csv')) {
        // Handle CSV file
        try {
          const csvContent = parseCSV(content);
          setCsvData(csvContent);
          setText(''); // Clear text input when CSV is loaded
          console.log('CSV loaded:', csvContent);
          
          // Show warning if there was one
          if (csvContent.warning) {
            alert(`CSV loaded with warning: ${csvContent.warning}`);
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          
          // Show more helpful error message
          let errorMessage = 'Error parsing CSV file. ';
          if (error.message.includes('empty')) {
            errorMessage += 'The file appears to be empty.';
          } else if (error.message.includes('text column')) {
            errorMessage += 'Please ensure it has a "text" column or the first column contains text data.';
          } else {
            errorMessage += error.message;
          }
          
          alert(errorMessage);
        }
      } else {
        // Handle other file types
        setFileContent(content);
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    if (lines.length === 1) {
      // Only one line - treat as single text without headers
      return {
        headers: ['text'],
        texts: [lines[0].trim()],
        totalRows: 1,
        hasHeaders: false
      };
    }
    
    // Try to detect if first row is headers
    const firstLine = lines[0];
    const secondLine = lines[1];
    
    // Check if first line looks like headers (contains common CSV header words)
    const headerIndicators = ['text', 'content', 'message', 'sentence', 'comment', 'review', 'feedback', 'data'];
    const firstLineLower = firstLine.toLowerCase();
    const hasHeaderIndicators = headerIndicators.some(indicator => firstLineLower.includes(indicator));
    
    let headers, startIndex;
    
    if (hasHeaderIndicators) {
      // First line is headers
      headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
      startIndex = 1;
    } else {
      // No headers, treat first line as data
      headers = ['text'];
      startIndex = 0;
    }
    
    // Find the text column (case-insensitive)
    const textColumnIndex = headers.findIndex(h => 
      h.toLowerCase() === 'text' || 
      h.toLowerCase() === 'content' || 
      h.toLowerCase() === 'message' ||
      h.toLowerCase() === 'sentence' ||
      h.toLowerCase() === 'comment' ||
      h.toLowerCase() === 'review' ||
      h.toLowerCase() === 'feedback' ||
      h.toLowerCase() === 'data'
    );
    
    if (textColumnIndex === -1) {
      // If no text column found, use the first column
      console.warn('No text column found, using first column as text');
      const texts = [];
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values[0] && values[0].length > 0) {
            texts.push(values[0]);
          }
        }
      }
      
      return {
        headers: headers,
        texts: texts,
        totalRows: texts.length,
        hasHeaders: hasHeaderIndicators,
        warning: 'No text column found, using first column as text'
      };
    }
    
    // Extract texts from the found text column
    const texts = [];
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values[textColumnIndex] && values[textColumnIndex].length > 0) {
          texts.push(values[textColumnIndex]);
        }
      }
    }
    
    return {
      headers: headers,
      texts: texts,
      totalRows: texts.length,
      hasHeaders: hasHeaderIndicators
    };
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await apiService.analyzeSentiment(text, selectedModel);
      setAnalysis(result);
    } catch (error) {
      setAnalysis({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareModels = async () => {
    if (!text.trim()) return;
    
    setIsComparing(true);
    try {
      const results = {};
      for (const model of availableModels) {
        try {
          const result = await apiService.analyzeSentiment(text, model);
          results[model] = result;
        } catch (error) {
          results[model] = { error: error.message };
        }
      }
      setModelComparison(results);
    } catch (error) {
      console.error('Error comparing models:', error);
    } finally {
      setIsComparing(false);
    }
  };

  const handleAnalyzeCSV = async () => {
    if (!csvData || !csvData.texts.length) return;
    
    setIsProcessingCsv(true);
    setCsvProgress({ current: 0, total: csvData.texts.length });
    
    try {
      const results = [];
      for (let i = 0; i < csvData.texts.length; i++) {
        const text = csvData.texts[i];
        try {
          const result = await apiService.analyzeSentiment(text, selectedModel);
          results.push(result);
        } catch (error) {
          results.push({ 
            text, 
            error: error.message, 
            sentiment: 'ERROR',
            confidence: 0,
            model_name: selectedModel
          });
        }
        
        // Update progress
        setCsvProgress({ current: i + 1, total: csvData.texts.length });
      }
      
      // Store results in state to display in the app
      setCsvResults(results);
      setCurrentCsvIndex(0);
      
      // Set the first result as the current analysis
      if (results.length > 0) {
        setAnalysis(results[0]);
      }
      
      console.log('CSV analysis complete:', results);
    } catch (error) {
      console.error('Error analyzing CSV:', error);
      alert('Error analyzing CSV. Please try again.');
    } finally {
      setIsProcessingCsv(false);
      setCsvProgress({ current: 0, total: 0 });
    }
  };

  const generateResultsCSV = (results) => {
    const headers = ['Text', 'Sentiment', 'Confidence', 'Model', 'Joy Score', 'Sadness Score', 'Anger Score', 'Fear Score', 'Formal Score', 'Casual Score', 'Emotional Score', 'Objective Score'];
    const rows = results.map(result => [
      result.text,
      result.sentiment || 'ERROR',
      result.confidence || 0,
      result.model_name || 'unknown',
      result.joy_score || 0,
      result.sadness_score || 0,
      result.anger_score || 0,
      result.fear_score || 0,
      result.formal_score || 0,
      result.casual_score || 0,
      result.emotional_score || 0,
      result.objective_score || 0
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fixCSVFormat = () => {
    if (!csvData) return;
    
    // Create a properly formatted CSV with headers
    const fixedCSV = ['text', ...csvData.texts.map(text => `"${text.replace(/"/g, '""')}"`)].join('\n');
    downloadCSV(fixedCSV, 'fixed_texts.csv');
  };

  const getSentimentColor = (sentiment) => {
    const sentimentUpper = sentiment.toUpperCase();
    switch (sentimentUpper) {
      case 'POSITIVE': return 'bg-emerald-500';
      case 'NEGATIVE': return 'bg-rose-500';
      case 'NEUTRAL': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const getSentimentEmoji = (sentiment) => {
    const sentimentUpper = sentiment.toUpperCase();
    switch (sentimentUpper) {
      case 'POSITIVE': return '😊';
      case 'NEGATIVE': return '😞';
      case 'NEUTRAL': return '😐';
      default: return '😐';
    }
  };

  const getModelDisplayName = (modelName) => {
    const modelMap = {
      'distilbert-base-uncased-finetuned-sst-2-english': 'DistilBERT',
      'cardiffnlp/twitter-roberta-base-sentiment-latest': 'RoBERTa Twitter',
      'nlptown/bert-base-multilingual-uncased-sentiment': 'BERT Multilingual',
                   'finiteautomata/bertweet-base-sentiment-analysis': 'BERTweet',
             'ProsusAI/finbert': 'FinBERT',
             'microsoft/DialoGPT-medium': 'DialoGPT'
    };
    return modelMap[modelName] || modelName.split('/').pop();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <header className="bg-white/60 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-light text-slate-700 tracking-wide">
                texta
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-slate-500 font-light">
                {backendStatus === 'connected' ? 'Backend Connected' : backendStatus === 'checking' ? 'Checking...' : 'Backend Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="relative py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-light text-slate-800 mb-6 leading-relaxed">
            Analyze Your Text with
            <span className="block font-normal text-slate-600 mt-2">
              Hugging Face Models
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
            Discover insights through sophisticated text analysis using state-of-the-art transformer models.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Left Column - Text Input */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 p-8">
            <h2 className="text-xl font-medium text-slate-800 mb-6">Text Input</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300/50 focus:border-slate-300 bg-white/50 backdrop-blur-sm" disabled={backendStatus !== 'connected'}>
                {availableModels.map((model) => (
                  <option key={model} value={model}>{getModelDisplayName(model)}</option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload File</label>
              

              
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-slate-300 transition-colors duration-300">
                <input type="file" onChange={handleFileUpload} accept=".txt,.doc,.docx,.pdf,.csv" className="hidden" id="file-upload"/>
                <label htmlFor="file-upload" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer">Choose File</label>
                <p className="text-xs text-slate-500 mt-2">Supports: TXT, DOC, DOCX, PDF, CSV</p>
              </div>
              
              {/* CSV Information Display */}
              {csvData && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📊 CSV File Loaded</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>• <strong>{csvData.totalRows}</strong> texts ready for analysis</div>
                    <div>• Headers detected: {csvData.hasHeaders ? 'Yes' : 'No'}</div>
                    <div>• Columns: {csvData.headers.join(', ')}</div>
                    {csvData.warning && (
                      <div className="text-orange-600 font-medium">⚠️ {csvData.warning}</div>
                    )}
                  </div>
                  
                  {/* Debug: Show CSV content */}
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                      🔍 Debug: Show parsed content
                    </summary>
                    <div className="mt-2 p-2 bg-white rounded border text-xs text-slate-600 max-h-32 overflow-y-auto">
                      <div className="font-medium mb-1">Headers: [{csvData.headers.join(', ')}]</div>
                      <div className="font-medium mb-1">First 3 texts:</div>
                      {csvData.texts.slice(0, 3).map((text, index) => (
                        <div key={index} className="mb-1 p-1 bg-slate-50 rounded">
                          <span className="font-medium">{index + 1}:</span> {text.substring(0, 100)}{text.length > 100 ? '...' : ''}
                        </div>
                      ))}
                      {csvData.texts.length > 3 && (
                        <div className="text-slate-500">... and {csvData.texts.length - 3} more</div>
                      )}
                    </div>
                  </details>
                  
                  {/* Fix CSV Format Button */}
                  <div className="mt-2">
                    <button 
                      onClick={fixCSVFormat}
                      className="text-xs text-green-600 hover:text-green-800 underline mr-3"
                    >
                      🔧 Download Fixed CSV
                    </button>
                    <span className="text-xs text-slate-500">(Properly formatted with headers)</span>
                  </div>
                  
                  <button 
                    onClick={handleAnalyzeCSV}
                    disabled={isProcessingCsv || backendStatus !== 'connected'}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    {isProcessingCsv ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline"></div>
                        Analyzing {csvProgress.current} of {csvProgress.total} texts...
                        <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                          <div 
                            className="bg-white h-1 rounded-full transition-all duration-300" 
                            style={{ width: `${(csvProgress.current / csvProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      </>
                    ) : (
                      `Analyze All ${csvData.totalRows} Texts`
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="mb-6">
              <label htmlFor="textInput" className="block text-sm font-medium text-slate-700 mb-2">Or type your text directly</label>
              <div className="relative">
                <textarea id="textInput" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste your text here to begin analysis..." className="w-full h-64 p-6 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-300/50 focus:border-slate-300 resize-none text-slate-700 placeholder-slate-400 transition-all duration-300 text-base leading-relaxed bg-white/50 backdrop-blur-sm" disabled={backendStatus !== 'connected'}/>
                <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">{text.length} characters</div>
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={handleAnalyze} disabled={isLoading || !text.trim() || backendStatus !== 'connected'} className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-light py-4 px-8 rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-slate-400/30 flex items-center justify-center text-base shadow-sm hover:shadow-md">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Analyzing with {getModelDisplayName(selectedModel)}...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analyze Text
                  </>
                )}
              </button>
              <button onClick={handleCompareModels} disabled={isComparing || !text.trim() || backendStatus !== 'connected'} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-light py-3 px-6 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-400/30 flex items-center justify-center text-sm shadow-sm hover:shadow-md">
                {isComparing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Comparing Models...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Compare All Models
                  </>
                )}
              </button>
            </div>
          </div>

                          {/* Right Column - Sentiment Analysis Report */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 p-8">
                  <h2 className="text-xl font-medium text-slate-800 mb-6">Sentiment Analysis Report</h2>
            {backendStatus !== 'connected' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">Backend Disconnected</h3>
                <p className="text-slate-500 text-sm">Please ensure the backend server is running</p>
              </div>
            ) : !analysis ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">Ready to Analyze</h3>
                <p className="text-slate-500 text-sm">Enter some text and click analyze to get started</p>
              </div>
            ) : analysis.error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-red-700 mb-2">Analysis Failed</h3>
                <p className="text-red-500 text-sm">{analysis.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall CSV Sentiment Report */}
                {csvResults && csvResults.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-200/50 rounded-2xl p-4 mb-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                      <span className="mr-2">📊</span>Overall Sentiment Report ({csvResults.length} texts)
                    </h3>
                    
                    {/* Sentiment Distribution */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 bg-white/70 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">
                          {csvResults.filter(r => r.sentiment === 'POSITIVE').length}
                        </div>
                        <div className="text-xs text-slate-600">Positive</div>
                        <div className="text-xs text-slate-500">
                          {((csvResults.filter(r => r.sentiment === 'POSITIVE').length / csvResults.length) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white/70 rounded-lg">
                        <div className="text-lg font-semibold text-red-600">
                          {csvResults.filter(r => r.sentiment === 'NEGATIVE').length}
                        </div>
                        <div className="text-xs text-slate-600">Negative</div>
                        <div className="text-xs text-slate-500">
                          {((csvResults.filter(r => r.sentiment === 'NEGATIVE').length / csvResults.length) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white/70 rounded-lg">
                        <div className="text-lg font-semibold text-gray-600">
                          {csvResults.filter(r => r.sentiment === 'NEUTRAL').length}
                        </div>
                        <div className="text-xs text-slate-600">Neutral</div>
                        <div className="text-xs text-slate-500">
                          {((csvResults.filter(r => r.sentiment === 'NEUTRAL').length / csvResults.length) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Overall Confidence & Dominant Emotions */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 bg-white/70 rounded-lg">
                        <div className="text-xs text-slate-600 font-medium">Avg Confidence</div>
                        <div className="text-sm font-semibold text-slate-800">
                          {(csvResults.filter(r => !r.error).reduce((sum, r) => sum + r.confidence, 0) / csvResults.filter(r => !r.error).length * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2 bg-white/70 rounded-lg">
                        <div className="text-xs text-slate-600 font-medium">Dominant Emotion</div>
                        <div className="text-sm font-semibold text-slate-800">
                          {(() => {
                            const emotions = ['joy_score', 'sadness_score', 'anger_score', 'fear_score'];
                            const avgEmotions = emotions.map(emotion => ({
                              name: emotion.replace('_score', ''),
                              avg: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r[emotion] || 0), 0) / csvResults.filter(r => !r.error).length
                            }));
                            const dominant = avgEmotions.reduce((max, curr) => curr.avg > max.avg ? curr : max);
                            return dominant.name.charAt(0).toUpperCase() + dominant.name.slice(1);
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Visual Sentiment Bar */}
                    <div className="mb-3">
                      <div className="text-xs text-slate-600 font-medium mb-1">Sentiment Distribution</div>
                      <div className="flex w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${(csvResults.filter(r => r.sentiment === 'POSITIVE').length / csvResults.length) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-red-500 h-full" 
                          style={{ width: `${(csvResults.filter(r => r.sentiment === 'NEGATIVE').length / csvResults.length) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-gray-400 h-full" 
                          style={{ width: `${(csvResults.filter(r => r.sentiment === 'NEUTRAL').length / csvResults.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const csvContent = generateResultsCSV(csvResults);
                        downloadCSV(csvContent, 'sentiment_analysis_results.csv');
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200"
                    >
                      📥 Export All Results as CSV
                    </button>
                  </div>
                )}

                {/* Detailed CSV Analytics */}
                {csvResults && csvResults.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50/30 border border-purple-200/50 rounded-2xl p-4 mb-4">
                    <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                      <span className="mr-2">📈</span>Detailed Analytics
                    </h3>
                    
                    {/* Average Emotion Scores */}
                    <div className="mb-3">
                      <div className="text-xs text-purple-700 font-medium mb-2">Average Emotion Levels</div>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { 
                            label: 'Joy', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.joy_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-yellow-400'
                          },
                          { 
                            label: 'Sadness', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.sadness_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-blue-400'
                          },
                          { 
                            label: 'Anger', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.anger_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-red-400'
                          },
                          { 
                            label: 'Fear', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.fear_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-purple-400'
                          }
                        ].map((emotion) => (
                          <div key={emotion.label} className="flex items-center justify-between p-1 bg-white/50 rounded text-xs">
                            <span className="text-slate-600 font-medium">{emotion.label}</span>
                            <div className="flex items-center space-x-1">
                              <div className="w-8 bg-slate-200 rounded-full h-1">
                                <div className={`h-1 rounded-full ${emotion.color}`} style={{ width: `${emotion.score * 100}%` }}></div>
                              </div>
                              <span className="text-slate-500 text-xs w-6">{(emotion.score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tone Analysis */}
                    <div className="mb-3">
                      <div className="text-xs text-purple-700 font-medium mb-2">Overall Tone Profile</div>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { 
                            label: 'Formal', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.formal_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-slate-400'
                          },
                          { 
                            label: 'Casual', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.casual_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-blue-400'
                          },
                          { 
                            label: 'Emotional', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.emotional_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-pink-400'
                          },
                          { 
                            label: 'Objective', 
                            score: csvResults.filter(r => !r.error).reduce((sum, r) => sum + (r.objective_score || 0), 0) / csvResults.filter(r => !r.error).length,
                            color: 'bg-gray-400'
                          }
                        ].map((tone) => (
                          <div key={tone.label} className="flex items-center justify-between p-1 bg-white/50 rounded text-xs">
                            <span className="text-slate-600 font-medium">{tone.label}</span>
                            <div className="flex items-center space-x-1">
                              <div className="w-8 bg-slate-200 rounded-full h-1">
                                <div className={`h-1 rounded-full ${tone.color}`} style={{ width: `${tone.score * 100}%` }}></div>
                              </div>
                              <span className="text-slate-500 text-xs w-6">{(tone.score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className="p-2 bg-white/50 rounded-lg">
                      <div className="text-xs text-purple-700 font-medium mb-1">Key Insights</div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          • {csvResults.filter(r => r.sentiment === 'POSITIVE').length > csvResults.filter(r => r.sentiment === 'NEGATIVE').length 
                            ? 'Overall positive sentiment detected' 
                            : csvResults.filter(r => r.sentiment === 'NEGATIVE').length > csvResults.filter(r => r.sentiment === 'POSITIVE').length
                            ? 'Overall negative sentiment detected'
                            : 'Balanced sentiment distribution'}
                        </div>
                        <div>
                          • Analyzed using {getModelDisplayName(selectedModel)} model
                        </div>
                        <div>
                          • {csvResults.filter(r => r.confidence > 0.8).length} high-confidence predictions ({'>'}80%)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Result Navigation */}
                {csvResults && csvResults.length > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-slate-600 font-medium">
                      Individual Results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          const newIndex = Math.max(0, currentCsvIndex - 1);
                          setCurrentCsvIndex(newIndex);
                          setAnalysis(csvResults[newIndex]);
                        }}
                        disabled={currentCsvIndex === 0}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm text-slate-600 font-medium">
                        {currentCsvIndex + 1} of {csvResults.length}
                      </span>
                      <button 
                        onClick={() => {
                          const newIndex = Math.min(csvResults.length - 1, currentCsvIndex + 1);
                          setCurrentCsvIndex(newIndex);
                          setAnalysis(csvResults[newIndex]);
                        }}
                        disabled={currentCsvIndex === csvResults.length - 1}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/50 rounded-2xl p-6">
                  <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>Sentiment Analysis
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Result</span>
                      <div className={`px-4 py-2 rounded-full text-white font-medium text-sm ${getSentimentColor(analysis.sentiment)}`}>
                        {getSentimentEmoji(analysis.sentiment)} {analysis.sentiment.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-600 font-medium">Confidence</span>
                        <span className="text-slate-800 font-semibold">{(analysis.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-1000 ease-out ${getSentimentColor(analysis.sentiment)}`} style={{ width: `${analysis.confidence * 100}%` }}></div>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm font-light">Model: <span className="font-medium text-slate-600">{getModelDisplayName(analysis.model_name)}</span></p>
                  </div>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-6">
                  <h3 className="text-lg font-medium text-slate-800 mb-4">Text Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center"><div className="text-2xl font-semibold text-slate-700 mb-1">{analysis.text.split(/\s+/).length}</div><div className="text-slate-500 font-light text-sm">Words</div></div>
                    <div className="text-center"><div className="text-2xl font-semibold text-slate-700 mb-1">{analysis.text.length}</div><div className="text-slate-500 font-light text-sm">Characters</div></div>
                    <div className="text-center"><div className="text-2xl font-semibold text-slate-700 mb-1">{analysis.text.split(/[.!?]+/).filter(s => s.trim().length > 0).length}</div><div className="text-slate-500 font-light text-sm">Sentences</div></div>
                    <div className="text-center"><div className="text-2xl font-semibold text-slate-700 mb-1">{analysis.text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length}</div><div className="text-slate-500 font-light text-sm">Paragraphs</div></div>
                  </div>
                </div>
                
                                       {/* Simplified Emotional Analysis - Core Emotions & Tones */}
                       <div className="bg-gradient-to-br from-purple-50 to-pink-50/30 border border-purple-200/50 rounded-2xl p-6">
                         <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center"><span className="mr-2">🎭</span>Emotional Analysis</h3>
                         <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                               <h4 className="text-sm font-medium text-slate-600 mb-3">Core Emotions</h4>
                               <div className="space-y-2">
                                 {[
                                   { label: 'Joy', score: analysis.joy_score, color: 'bg-yellow-400' },
                                   { label: 'Sadness', score: analysis.sadness_score, color: 'bg-blue-400' },
                                   { label: 'Anger', score: analysis.anger_score, color: 'bg-red-400' },
                                   { label: 'Fear', score: analysis.fear_score, color: 'bg-purple-400' }
                                 ].map((emotion) => (
                                   <div key={emotion.label} className="flex items-center justify-between">
                                     <span className="text-xs text-slate-600 font-medium">{emotion.label}</span>
                                     <div className="flex items-center space-x-2">
                                       <div className="w-16 bg-slate-200 rounded-full h-2">
                                         <div className={`h-2 rounded-full ${emotion.color}`} style={{ width: `${emotion.score * 100}%` }}></div>
                                       </div>
                                       <span className="text-xs text-slate-500 w-8 text-right">{(emotion.score * 100).toFixed(0)}%</span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                             <div>
                               <h4 className="text-sm font-medium text-slate-600 mb-3">Tone Characteristics</h4>
                               <div className="space-y-2">
                                 {[
                                   { label: 'Formal', score: analysis.formal_score, color: 'bg-slate-400' },
                                   { label: 'Casual', score: analysis.casual_score, color: 'bg-blue-400' },
                                   { label: 'Emotional', score: analysis.emotional_score, color: 'bg-pink-400' },
                                   { label: 'Objective', score: analysis.objective_score, color: 'bg-gray-400' }
                                 ].map((tone) => (
                                   <div key={tone.label} className="flex items-center justify-between">
                                     <span className="text-xs text-slate-600 font-medium">{tone.label}</span>
                                                                        <div className="flex items-center space-x-2">
                                     <div className="w-16 bg-slate-200 rounded-full h-2">
                                       <div className={`h-2 rounded-full ${tone.color}`} style={{ width: `${tone.score * 100}%` }}></div>
                                     </div>
                                     <span className="text-xs text-slate-500 w-8 text-right">{(tone.score * 100).toFixed(0)}%</span>
                                   </div>
                                 </div>
                                 ))}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Comparison Section */}
        {modelComparison && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 p-8 mb-16">
            <h2 className="text-2xl font-medium text-slate-800 mb-8 text-center">Model Comparison</h2>
            <p className="text-slate-600 text-center mb-8 font-light">Compare sentiment analysis results across different Hugging Face models</p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-4 px-6 font-medium text-slate-700">Model</th>
                    <th className="text-center py-4 px-6 font-medium text-slate-700">Type</th>
                    <th className="text-center py-4 px-6 font-medium text-slate-700">Overall Sentiment</th>
                    <th className="text-center py-4 px-6 font-medium text-slate-700">Confidence</th>
                    <th className="text-center py-4 px-6 font-medium text-slate-700">Sentiment Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(modelComparison).map(([modelName, result]) => {
                    const modelInfo = {
                      'distilbert-base-uncased-finetuned-sst-2-english': {
                        type: 'Binary Classification',
                        description: 'Positive/Negative sentiment analysis'
                      },
                      'cardiffnlp/twitter-roberta-base-sentiment-latest': {
                        type: 'Three-Class Classification',
                        description: 'Positive/Negative/Neutral sentiment analysis'
                      },
                      'nlptown/bert-base-multilingual-uncased-sentiment': {
                        type: 'Rating System',
                        description: '5-star rating sentiment analysis'
                      },
                      'finiteautomata/bertweet-base-sentiment-analysis': {
                        type: 'Social Media Sentiment',
                        description: 'Twitter-optimized sentiment analysis'
                      },
                      'ProsusAI/finbert': {
                        type: 'Financial Sentiment',
                        description: 'Financial text sentiment analysis'
                      },
                                                   'microsoft/DialoGPT-medium': {
                               type: 'Text Generation',
                               description: 'Dialogue generation model'
                             }
                    };
                    
                    const info = modelInfo[modelName] || { type: 'Unknown', description: 'Custom model' };
                    
                    return (
                      <tr key={modelName} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{getModelDisplayName(modelName)}</div>
                          <div className="text-xs text-slate-500">{modelName}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="text-sm font-medium text-slate-700">{info.type}</div>
                          <div className="text-xs text-slate-500">{info.description}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {result.error ? (
                            <span className="text-red-500 text-sm">Error</span>
                          ) : (
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getSentimentColor(result.sentiment)}`}>
                              {getSentimentEmoji(result.sentiment)} {result.sentiment.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {result.error ? (
                            <span className="text-red-500 text-sm">-</span>
                          ) : (
                            <span className="font-semibold text-slate-800">{(result.confidence * 100).toFixed(1)}%</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {result.error ? (
                            <div className="text-center text-red-500 text-sm">Analysis failed</div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-center text-sm font-medium text-slate-700 mb-2">
                                {result.sentiment.toUpperCase()}
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 ${getSentimentColor(result.sentiment)}`} 
                                  style={{ width: `${result.confidence * 100}%` }}
                                ></div>
                              </div>
                              <div className="text-center text-xs text-slate-500">
                                {(result.confidence * 100).toFixed(1)}% confidence
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white/60 backdrop-blur-md border-t border-slate-200/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-slate-500 font-light">
            <p>&copy; 2024 texta. Powered by Hugging Face Transformers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
