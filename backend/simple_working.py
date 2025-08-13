#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Texta Simple Sentiment API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str
    model_name: str = "rule-based"

class SentimentResult(BaseModel):
    text: str
    sentiment: str
    confidence: float
    model_name: str
    positive_score: float
    negative_score: float
    neutral_score: float

def analyze_sentiment_rule_based(text):
    """Simple rule-based sentiment analysis"""
    positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'brilliant', 'outstanding', 'superb', 'marvelous', 'terrific', 'fabulous', 'incredible']
    negative_words = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'disgusted', 'annoyed', 'furious', 'upset', 'depressed', 'miserable', 'pathetic', 'useless', 'worthless', 'dreadful']
    
    words = text.lower().split()
    positive_score = sum(1 for word in words if word in positive_words)
    negative_score = sum(1 for word in words if word in negative_words)
    
    total_score = positive_score + negative_score
    
    if total_score == 0:
        return {
            'sentiment': 'NEUTRAL',
            'confidence': 0.5,
            'positive_score': 0.33,
            'negative_score': 0.33,
            'neutral_score': 0.34
        }
    
    if positive_score > negative_score:
        confidence = positive_score / total_score
        return {
            'sentiment': 'POSITIVE',
            'confidence': confidence,
            'positive_score': confidence,
            'negative_score': 1 - confidence,
            'neutral_score': 0.0
        }
    else:
        confidence = negative_score / total_score
        return {
            'sentiment': 'NEGATIVE',
            'confidence': confidence,
            'positive_score': 1 - confidence,
            'negative_score': confidence,
            'neutral_score': 0.0
        }

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Texta Simple Sentiment Analysis API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": 1,
        "available_models": ["rule-based"]
    }

@app.get("/models")
async def get_available_models():
    """Get list of available models"""
    return {
        "available_models": [
            "distilbert-base-uncased-finetuned-sst-2-english",
            "cardiffnlp/twitter-roberta-base-sentiment-latest", 
            "nlptown/bert-base-multilingual-uncased-sentiment",
            "finiteautomata/bertweet-base-sentiment-analysis",
            "ProsusAI/finbert",
            "microsoft/DialoGPT-medium",
            "facebook/bart-large-mnli"
        ],
        "default_model": "distilbert-base-uncased-finetuned-sst-2-english"
    }

@app.post("/analyze", response_model=SentimentResult)
async def analyze_sentiment(text_input: TextInput):
    """Analyze sentiment of a single text"""
    try:
        if not text_input.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Use rule-based analysis for now
        result = analyze_sentiment_rule_based(text_input.text)
        
        return SentimentResult(
            text=text_input.text,
            sentiment=result['sentiment'],
            confidence=result['confidence'],
            model_name="rule-based",
            positive_score=result['positive_score'],
            negative_score=result['negative_score'],
            neutral_score=result['neutral_score']
        )
        
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
