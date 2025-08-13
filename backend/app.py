from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import uvicorn
from typing import List, Dict, Any
import logging
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Texta Sentiment Analysis API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000",
        "https://*.netlify.app",
        "https://*.netlify.com",
        "https://*.amazonaws.com",
        "https://*.cloudfront.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize sentiment analysis models
models = {}

class TextInput(BaseModel):
    text: str
    model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"

class SentimentResult(BaseModel):
    text: str
    sentiment: str
    confidence: float
    model_name: str
    positive_score: float
    negative_score: float
    neutral_score: float
    # Simplified emotional analysis - keeping only the most reliable
    joy_score: float
    sadness_score: float
    anger_score: float
    fear_score: float
    # Simplified tone analysis
    formal_score: float
    casual_score: float
    emotional_score: float
    objective_score: float

class BatchTextInput(BaseModel):
    texts: List[str]
    model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"

class BatchSentimentResult(BaseModel):
    results: List[SentimentResult]

def analyze_text_tone(text: str) -> Dict[str, float]:
    """Analyze text tone and mood using simplified rule-based analysis"""
    text_lower = text.lower()
    
    # Core emotion keywords - keeping only the most reliable
    joy_words = ['happy', 'joy', 'excited', 'delighted', 'pleased', 'thrilled', 'ecstatic', 'elated', 'cheerful', 'jubilant', 'wonderful', 'fantastic', 'amazing', 'great', 'good', 'excellent', 'superb', 'marvelous', 'terrific', 'fabulous', 'incredible', 'love', 'like', 'enjoy', 'fun', 'laugh', 'smile', 'bright', 'sunny', 'positive', 'optimistic', 'hopeful', 'inspired']
    sadness_words = ['sad', 'depressed', 'melancholy', 'sorrowful', 'grief', 'despair', 'hopeless', 'miserable', 'gloomy', 'unhappy', 'disappointed', 'heartbroken', 'devastated', 'crushed', 'defeated', 'lonely', 'isolated', 'abandoned', 'rejected', 'hurt', 'pain', 'suffering', 'tears', 'crying', 'weep', 'mourn', 'grieve', 'terrible', 'awful', 'dreadful', 'horrible']
    anger_words = ['angry', 'furious', 'enraged', 'irritated', 'annoyed', 'frustrated', 'outraged', 'livid', 'fuming', 'mad', 'rage', 'wrath', 'hostile', 'aggressive', 'violent', 'hate', 'despise', 'loathe', 'abhor', 'detest', 'resent', 'bitter', 'hostile', 'aggressive', 'fierce', 'savage', 'brutal', 'terrible', 'awful', 'horrible', 'dreadful']
    fear_words = ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'fearful', 'panicked', 'horrified', 'frightened', 'alarmed', 'startled', 'shocked', 'dread', 'terror', 'panic', 'hysteria', 'paranoia', 'suspicious', 'cautious', 'hesitant', 'timid', 'shy', 'cowardly', 'weak', 'vulnerable']
    
    # Core tone keywords - keeping only the most reliable
    formal_words = ['therefore', 'consequently', 'furthermore', 'moreover', 'thus', 'hence', 'accordingly', 'subsequently', 'nevertheless', 'nonetheless', 'however', 'whereas', 'although', 'despite', 'notwithstanding', 'in addition', 'further', 'additionally', 'moreover', 'furthermore', 'consequently', 'as a result', 'for this reason', 'in conclusion', 'to summarize']
    casual_words = ['hey', 'cool', 'awesome', 'great', 'nice', 'okay', 'yeah', 'yep', 'nope', 'wow', 'omg', 'lol', 'haha', 'fun', 'amazing', 'incredible', 'fantastic', 'super', 'rad', 'sweet', 'neat', 'wonderful', 'lovely', 'beautiful', 'gorgeous', 'stunning', 'breathtaking', 'mind-blowing', 'epic', 'legendary']
    emotional_words = ['love', 'hate', 'feel', 'emotion', 'passion', 'heart', 'soul', 'crying', 'laughing', 'happy', 'sad', 'angry', 'scared', 'excited', 'worried', 'nervous', 'confident', 'proud', 'ashamed', 'guilty', 'jealous', 'envious', 'grateful', 'thankful', 'blessed', 'fortunate', 'lucky', 'unlucky', 'miserable', 'ecstatic', 'thrilled', 'devastated', 'heartbroken']
    objective_words = ['data', 'evidence', 'research', 'study', 'analysis', 'statistics', 'facts', 'objective', 'empirical', 'scientific', 'measured', 'quantified', 'verified', 'confirmed', 'validated', 'proven', 'demonstrated', 'established', 'documented', 'recorded', 'observed', 'witnessed', 'reported', 'stated', 'declared', 'announced', 'published', 'released']
    
    # Simplified scoring algorithm
    def calculate_score(text, word_list):
        words = text.split()
        if len(words) == 0:
            return 0.0
        
        # Count exact word matches (case-insensitive)
        exact_matches = sum(1 for word in words if word.lower() in word_list)
        
        # Count phrase matches (for multi-word phrases)
        phrase_matches = sum(1 for phrase in word_list if phrase.lower() in text.lower())
        
        total_matches = exact_matches + phrase_matches
        
        # Simple scoring: more matches = higher score
        if total_matches == 0:
            return 0.0
        elif total_matches == 1:
            return 0.3
        elif total_matches == 2:
            return 0.6
        elif total_matches == 3:
            return 0.8
        else:
            return 1.0
    
    # Calculate scores
    joy_score = calculate_score(text_lower, joy_words)
    sadness_score = calculate_score(text_lower, sadness_words)
    anger_score = calculate_score(text_lower, anger_words)
    fear_score = calculate_score(text_lower, fear_words)
    
    # Tone scores
    formal_score = calculate_score(text_lower, formal_words)
    casual_score = calculate_score(text_lower, casual_words)
    emotional_score = calculate_score(text_lower, emotional_words)
    objective_score = calculate_score(text_lower, objective_words)
    
    return {
        'joy_score': joy_score,
        'sadness_score': sadness_score,
        'anger_score': anger_score,
        'fear_score': fear_score,
        'formal_score': formal_score,
        'casual_score': casual_score,
        'emotional_score': emotional_score,
        'objective_score': objective_score
    }

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    try:
        import numpy as np
        import torch
        return {
            "numpy_version": np.__version__,
            "torch_version": torch.__version__,
            "status": "All imports working"
        }
    except Exception as e:
        return {"error": str(e)}

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    logger.info("Initializing sentiment analysis models...")
    
    # Initialize default model
    try:
        models["distilbert-base-uncased-finetuned-sst-2-english"] = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )
        logger.info("DistilBERT model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load DistilBERT model: {e}")
    
    # Initialize additional models
    try:
        models["cardiffnlp/twitter-roberta-base-sentiment-latest"] = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest"
        )
        logger.info("RoBERTa Twitter model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load RoBERTa model: {e}")
    
    try:
        models["nlptown/bert-base-multilingual-uncased-sentiment"] = pipeline(
            "sentiment-analysis",
            model="nlptown/bert-base-multilingual-uncased-sentiment"
        )
        logger.info("BERT Multilingual model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load BERT Multilingual model: {e}")
    
    # Add more models
    try:
        models["finiteautomata/bertweet-base-sentiment-analysis"] = pipeline(
            "sentiment-analysis",
            model="finiteautomata/bertweet-base-sentiment-analysis"
        )
        logger.info("BERTweet sentiment model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load BERTweet model: {e}")
    
    try:
        models["ProsusAI/finbert"] = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert"
        )
        logger.info("FinBERT financial sentiment model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load FinBERT model: {e}")
    
    try:
        models["microsoft/DialoGPT-medium"] = pipeline(
            "text-generation",
            model="microsoft/DialoGPT-medium"
        )
        logger.info("DialoGPT model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load DialoGPT model: {e}")
    
    logger.info(f"Loaded {len(models)} models successfully")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Texta Sentiment Analysis API", "status": "running"}

@app.get("/models")
async def get_available_models():
    """Get list of available models"""
    return {
        "available_models": list(models.keys()),
        "default_model": "distilbert-base-uncased-finetuned-sst-2-english"
    }

@app.post("/analyze", response_model=SentimentResult)
async def analyze_sentiment(text_input: TextInput):
    """Analyze sentiment of a single text"""
    try:
        if not text_input.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Get the model
        model_name = text_input.model_name
        if model_name not in models:
            raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
        
        model = models[model_name]
        
        # Analyze sentiment
        result = model(text_input.text)
        
        # Process results based on model type
        if model_name == "distilbert-base-uncased-finetuned-sst-2-english":
            # Binary classification: POSITIVE/NEGATIVE
            sentiment = result[0]['label']
            confidence = result[0]['score']
            
            if sentiment == 'POSITIVE':
                positive_score = confidence
                negative_score = 1 - confidence
                neutral_score = 0.0
            else:
                positive_score = 1 - confidence
                negative_score = confidence
                neutral_score = 0.0
                
        elif model_name == "cardiffnlp/twitter-roberta-base-sentiment-latest":
            # Three-class classification: POSITIVE/NEGATIVE/NEUTRAL
            sentiment = result[0]['label']
            confidence = result[0]['score']
            
            # For simplicity, we'll set the main score and others to 0
            if sentiment == 'POSITIVE':
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif sentiment == 'NEGATIVE':
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence
                
        elif model_name == "nlptown/bert-base-multilingual-uncased-sentiment":
            # 5-star rating system
            rating = float(result[0]['label'].split()[0])
            confidence = result[0]['score']
            
            # Convert 5-star rating to sentiment
            if rating >= 4:
                sentiment = "POSITIVE"
            elif rating <= 2:
                sentiment = "NEGATIVE"
            else:
                sentiment = "NEUTRAL"
            
            # Normalize scores for consistency
            if sentiment == "POSITIVE":
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif sentiment == "NEGATIVE":
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence
                
        elif model_name == "finiteautomata/bertweet-base-sentiment-analysis":
            # BERTweet sentiment analysis
            sentiment = result[0]['label'].upper()
            confidence = result[0]['score']
            
            if sentiment == 'POS':
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
                sentiment = "POSITIVE"
            elif sentiment == 'NEG':
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
                sentiment = "NEGATIVE"
            else:
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence
                sentiment = "NEUTRAL"
                
        elif model_name == "ProsusAI/finbert":
            # FinBERT financial sentiment
            sentiment = result[0]['label'].upper()
            confidence = result[0]['score']
            
            if sentiment == 'POSITIVE':
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif sentiment == 'NEGATIVE':
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence
                
        elif model_name == "microsoft/DialoGPT-medium":
            # DialoGPT - use as neutral since it's text generation
            sentiment = "NEUTRAL"
            confidence = 0.5
            positive_score = 0.33
            negative_score = 0.33
            neutral_score = 0.34
            
        else:
            # Default fallback
            sentiment = "NEUTRAL"
            confidence = 0.5
            positive_score = 0.33
            negative_score = 0.33
            neutral_score = 0.34
        
        # Analyze tone and mood
        tone_scores = analyze_text_tone(text_input.text)

        return SentimentResult(
            text=text_input.text,
            sentiment=sentiment,
            confidence=confidence,
            model_name=model_name,
            positive_score=positive_score,
            negative_score=negative_score,
            neutral_score=neutral_score,
            joy_score=tone_scores['joy_score'],
            sadness_score=tone_scores['sadness_score'],
            anger_score=tone_scores['anger_score'],
            fear_score=tone_scores['fear_score'],
            formal_score=tone_scores['formal_score'],
            casual_score=tone_scores['casual_score'],
            emotional_score=tone_scores['emotional_score'],
            objective_score=tone_scores['objective_score']
        )
        
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")

@app.post("/analyze-batch", response_model=BatchSentimentResult)
async def analyze_batch_sentiment(batch_input: BatchTextInput):
    """Analyze sentiment of multiple texts"""
    try:
        if not batch_input.texts:
            raise HTTPException(status_code=400, detail="Texts list cannot be empty")
        
        if len(batch_input.texts) > 100:  # Limit batch size
            raise HTTPException(status_code=400, detail="Batch size cannot exceed 100 texts")
        
        # Get the model
        model_name = batch_input.model_name
        if model_name not in models:
            raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
        
        model = models[model_name]
        results = []
        
        for text in batch_input.texts:
            if not text.strip():
                continue
                
            # Analyze each text
            result = model(text)
            
            # Process results (similar logic as single analysis)
            sentiment = result[0]['label']
            confidence = result[0]['score']
            
            # Simplified scoring
            if sentiment == 'POSITIVE':
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif sentiment == 'NEGATIVE':
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence
            
            # Analyze tone for batch
            tone_scores = analyze_text_tone(text)

            results.append(SentimentResult(
                text=text,
                sentiment=sentiment,
                confidence=confidence,
                model_name=model_name,
                positive_score=positive_score,
                negative_score=negative_score,
                neutral_score=neutral_score,
                joy_score=tone_scores['joy_score'],
                sadness_score=tone_scores['sadness_score'],
                anger_score=tone_scores['anger_score'],
                fear_score=tone_scores['fear_score'],
                formal_score=tone_scores['formal_score'],
                casual_score=tone_scores['casual_score'],
                emotional_score=tone_scores['emotional_score'],
                objective_score=tone_scores['objective_score']
            ))
        
        return BatchSentimentResult(results=results)
        
    except Exception as e:
        logger.error(f"Error analyzing batch sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing batch sentiment: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": len(models),
        "available_models": list(models.keys())
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
