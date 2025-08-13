from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn
from typing import List, Dict, Any
import logging
import re
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
        "https://textaanalyzer.netlify.app",  # Specific domain
        "https://*.amazonaws.com",
        "https://*.cloudfront.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face Inference API configuration
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_API_BASE = "https://api-inference.huggingface.co/models"

# Available models for HF Inference API
AVAILABLE_MODELS = {
    "ProsusAI/finbert": "ProsusAI/finbert",
    "facebook/bart-large-mnli": "facebook/bart-large-mnli",
    "finiteautomata/bertweet-base-sentiment-analysis": "finiteautomata/bertweet-base-sentiment-analysis",
    "nlptown/bert-base-multilingual-uncased-sentiment": "nlptown/bert-base-multilingual-uncased-sentiment",
    "ahmedrachid/FinancialBERT-Sentiment-Analysis": "ahmedrachid/FinancialBERT-Sentiment-Analysis",
    "tabularisai/multilingual-sentiment-analysis": "tabularisai/multilingual-sentiment-analysis",
    "yangheng/deberta-v3-base-absa-v1.1": "yangheng/deberta-v3-base-absa-v1.1",
    "yangheng/deberta-v3-large-absa-v1.1": "yangheng/deberta-v3-large-absa-v1.1"
}

class TextInput(BaseModel):
    text: str
    model_name: str = "ProsusAI/finbert"

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
    model_name: str = "ProsusAI/finbert"

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
    """Initialize Hugging Face Inference API connection"""
    logger.info("Initializing Hugging Face Inference API...")
    
    if not HF_API_TOKEN:
        logger.warning("HF_API_TOKEN not set. Some features may be limited.")
    else:
        logger.info("Hugging Face API token configured successfully")
    
    logger.info(f"Available models: {list(AVAILABLE_MODELS.keys())}")
    logger.info("Using Hugging Face Inference API - no local model loading required")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Texta Sentiment Analysis API", "status": "running"}

@app.get("/models")
async def get_available_models():
    """Get list of available models"""
    return {
        "available_models": list(AVAILABLE_MODELS.keys()),
        "default_model": "ProsusAI/finbert",
        "note": "Using Hugging Face Inference API - no local model loading required"
    }

@app.post("/analyze", response_model=SentimentResult)
async def analyze_sentiment(text_input: TextInput):
    """Analyze sentiment of a single text using Hugging Face Inference API"""
    try:
        if not text_input.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Check if model is available
        model_name = text_input.model_name
        if model_name not in AVAILABLE_MODELS:
            raise HTTPException(status_code=400, detail=f"Model {text_input.model_name} not available")
        
        # Call Hugging Face Inference API
        headers = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}
        
        # Special handling for BART MNLI (zero-shot classification)
        if model_name == "facebook/bart-large-mnli":
            payload = {
                "inputs": text_input.text,
                "parameters": {
                    "candidate_labels": ["positive", "negative", "neutral"]
                }
            }
        else:
            payload = {"inputs": text_input.text}
        
        response = requests.post(
            f"{HF_API_BASE}/{AVAILABLE_MODELS[model_name]}",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 401:
            raise HTTPException(status_code=500, detail="HF API error: Unauthorized. Ensure HF_API_TOKEN is set in Render env vars.")
        if response.status_code == 404:
            raise HTTPException(status_code=500, detail=f"HF API error: Not Found. Check model id '{AVAILABLE_MODELS[model_name]}'")
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"HF API error: {response.text}")
        
        result = response.json()
        
        # Helper to normalize HF API outputs (list or list-of-list)
        def extract_label_score(hf_result: Any) -> Dict[str, Any]:
            try:
                item = hf_result[0]
                if isinstance(item, list):
                    item = item[0]
                return {"label": item.get("label"), "score": item.get("score")}
            except Exception:
                return {"label": None, "score": None}

                # Process results based on model type
        if model_name == "ProsusAI/finbert":
            # FinBERT returns [{"label": "neutral", "score": 0.87}, ...]
            ls = extract_label_score(result)
            label = (ls["label"] or "neutral").upper()
            confidence = float(ls["score"] or 0.5)
            if label == 'POSITIVE':
                sentiment = 'POSITIVE'
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif label == 'NEGATIVE':
                sentiment = 'NEGATIVE'
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = 'NEUTRAL'
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "facebook/bart-large-mnli":
            # BART MNLI zero-shot classification
            # Returns {"sequence": "text", "labels": ["neutral", "negative", "positive"], "scores": [0.38, 0.34, 0.28]}
            try:
                labels = result.get("labels", [])
                scores = result.get("scores", [])
                if len(labels) > 0 and len(scores) > 0:
                    # Find the highest scoring label
                    max_score_idx = scores.index(max(scores))
                    top_label = labels[max_score_idx].upper()
                    confidence = float(scores[max_score_idx])
                    
                    if top_label == 'POSITIVE':
                        sentiment = 'POSITIVE'
                        positive_score = confidence
                        negative_score = 0.0
                        neutral_score = 0.0
                    elif top_label == 'NEGATIVE':
                        sentiment = 'NEGATIVE'
                        positive_score = 0.0
                        negative_score = confidence
                        neutral_score = 0.0
                    else:
                        sentiment = 'NEUTRAL'
                        positive_score = 0.0
                        negative_score = 0.0
                        neutral_score = confidence
                else:
                    sentiment = "NEUTRAL"
                    confidence = 0.5
                    positive_score = 0.33
                    negative_score = 0.33
                    neutral_score = 0.34
            except Exception:
                sentiment = "NEUTRAL"
                confidence = 0.5
                positive_score = 0.33
                negative_score = 0.33
                neutral_score = 0.34

        elif model_name == "finiteautomata/bertweet-base-sentiment-analysis":
            # BERTweet returns [{"label": "POS", "score": 0.99}, ...]
            ls = extract_label_score(result)
            raw = (ls["label"] or "NEU").upper()
            confidence = float(ls["score"] or 0.5)
            if raw == 'POS':
                sentiment = "POSITIVE"
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif raw == 'NEG':
                sentiment = "NEGATIVE"
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = "NEUTRAL"
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "nlptown/bert-base-multilingual-uncased-sentiment":
            # 5-star rating system
            ls = extract_label_score(result)
            label_text = (ls["label"] or "3 stars").lower()
            confidence = float(ls["score"] or 0.5)
            try:
                rating = float(label_text.split()[0])
            except Exception:
                rating = 3.0
            if rating >= 4:
                sentiment = "POSITIVE"
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif rating <= 2:
                sentiment = "NEGATIVE"
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = "NEUTRAL"
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "ahmedrachid/FinancialBERT-Sentiment-Analysis":
            # FinancialBERT returns [{"label": "neutral", "score": 0.99}, ...]
            ls = extract_label_score(result)
            label = (ls["label"] or "neutral").upper()
            confidence = float(ls["score"] or 0.5)
            if label == 'POSITIVE':
                sentiment = 'POSITIVE'
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif label == 'NEGATIVE':
                sentiment = 'NEGATIVE'
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = 'NEUTRAL'
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "tabularisai/multilingual-sentiment-analysis":
            # Multilingual sentiment returns [{"label": "Very Positive", "score": 0.49}, ...]
            ls = extract_label_score(result)
            label = (ls["label"] or "Neutral").upper()
            confidence = float(ls["score"] or 0.5)
            if 'POSITIVE' in label:
                sentiment = 'POSITIVE'
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif 'NEGATIVE' in label:
                sentiment = 'NEGATIVE'
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = 'NEUTRAL'
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "yangheng/deberta-v3-base-absa-v1.1":
            # DeBERTa v3 base returns [{"label": "Positive", "score": 0.98}, ...]
            ls = extract_label_score(result)
            label = (ls["label"] or "Neutral").upper()
            confidence = float(ls["score"] or 0.5)
            if label == 'POSITIVE':
                sentiment = 'POSITIVE'
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif label == 'NEGATIVE':
                sentiment = 'NEGATIVE'
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = 'NEUTRAL'
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

        elif model_name == "yangheng/deberta-v3-large-absa-v1.1":
            # DeBERTa v3 large returns [{"label": "Positive", "score": 0.99}, ...]
            ls = extract_label_score(result)
            label = (ls["label"] or "Neutral").upper()
            confidence = float(ls["score"] or 0.5)
            if label == 'POSITIVE':
                sentiment = 'POSITIVE'
                positive_score = confidence
                negative_score = 0.0
                neutral_score = 0.0
            elif label == 'NEGATIVE':
                sentiment = 'NEGATIVE'
                positive_score = 0.0
                negative_score = confidence
                neutral_score = 0.0
            else:
                sentiment = 'NEUTRAL'
                positive_score = 0.0
                negative_score = 0.0
                neutral_score = confidence

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
        
        # Check if model is available
        model_name = batch_input.model_name
        if model_name not in AVAILABLE_MODELS:
            raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
        
        results = []
        
        for text in batch_input.texts:
            if not text.strip():
                continue
                
            # Analyze each text using Hugging Face Inference API
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}
            payload = {"inputs": text}
            
            response = requests.post(
                f"{HF_API_BASE}/{AVAILABLE_MODELS[model_name]}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"HF API error for text '{text[:50]}...': {response.text}")
                continue
                
            result = response.json()
            
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
        "models_loaded": len(AVAILABLE_MODELS),
        "available_models": list(AVAILABLE_MODELS.keys()),
        "api_type": "Hugging Face Inference API"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
