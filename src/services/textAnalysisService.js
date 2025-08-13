// Text Analysis Service - Handles all backend logic for text analysis

export class TextAnalysisService {
  constructor() {
    // No ML model loading needed
  }

  // Analyze text using rule-based methods
  async analyzeText(text) {
    if (!text.trim()) {
      throw new Error('Please enter some text to analyze');
    }

    // Basic text analysis
    const words = text.trim().split(/\s+/);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    // Get sentiment analysis using rule-based method
    const sentimentResult = this.analyzeSentiment(text);

    return {
      wordCount: words.length,
      characterCount: characters,
      characterCountNoSpaces: charactersNoSpaces,
      sentenceCount: sentences,
      paragraphCount: paragraphs,
      averageWordsPerSentence: Math.round((words.length / sentences) * 10) / 10,
      sentiment: sentimentResult
    };
  }

  // Rule-based sentiment analysis
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'brilliant', 'outstanding', 'superb', 'marvelous', 'terrific', 'fabulous', 'incredible'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'disgusted', 'annoyed', 'furious', 'upset', 'depressed', 'miserable', 'pathetic', 'useless', 'worthless', 'dreadful'];
    
    const words = text.toLowerCase().split(/\W+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    const totalScore = positiveScore + negativeScore;
    if (totalScore === 0) {
      return { label: 'NEUTRAL', confidence: 50, method: 'Rule-based Analysis' };
    }
    
    if (positiveScore > negativeScore) {
      const confidence = Math.round((positiveScore / totalScore) * 100);
      return { label: 'POSITIVE', confidence: Math.max(confidence, 60), method: 'Rule-based Analysis' };
    } else if (negativeScore > positiveScore) {
      const confidence = Math.round((negativeScore / totalScore) * 100);
      return { label: 'NEGATIVE', confidence: Math.max(confidence, 60), method: 'Rule-based Analysis' };
    } else {
      return { label: 'NEUTRAL', confidence: 50, method: 'Rule-based Analysis' };
    }
  }
}

// Export a singleton instance
export const textAnalysisService = new TextAnalysisService();
