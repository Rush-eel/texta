// API Service for connecting to FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Get available models
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  }

  // Analyze single text
  async analyzeSentiment(text, modelName = 'distilbert-base-uncased-finetuned-sst-2-english') {
    try {
      const response = await fetch(`${this.baseURL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_name: modelName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/`);
      return await response.json();
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
