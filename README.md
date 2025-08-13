# Texta - Sentiment Analysis with Hugging Face Models

🌐 **Live Demo: [https://textaanalyzer.netlify.app/](https://textaanalyzer.netlify.app/)**

A modern, elegant sentiment analysis application built with React, FastAPI, and Hugging Face Inference API. Analyze text sentiment using 8 different AI models with real-time results and beautiful visualizations.

## Features
- **8 AI Models**: Support for 8 different Hugging Face sentiment analysis models
- **Real-time Analysis**: Instant sentiment analysis with confidence scores
- **File Upload**: Support for text files (.txt, .doc, .docx, .pdf)
- **Model Comparison**: Easy switching between different Hugging Face models
- **Elegant UI**: Modern, responsive design with Tailwind CSS
- **Backend Status**: Real-time connection monitoring

## Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **FastAPI** - Modern Python web framework
- **Hugging Face Inference API** - Cloud-based model inference
- **Requests** - HTTP client for API calls
- **Gunicorn** - Production WSGI server

## Deployment

### Backend & Frontend Deployment
- **Render**: Easy deployment with Python support
- **Netlify**: Simple static site hosting

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the FastAPI server**
   ```bash
   python app.py
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` or `http://localhost:5174`

## API Endpoints

### Health Check
- `GET /health` - Check backend status and loaded models

### Models
- `GET /models` - Get list of available models

### Analysis
- `POST /analyze` - Analyze single text sentiment
- `POST /analyze-batch` - Analyze multiple texts

## Available Models

### 🏦 Financial & Business Models
1. **ProsusAI/finbert** - Financial sentiment analysis
   - Specialized for business and financial text
   - Three-class: Positive/Negative/Neutral
   - High accuracy on financial documents

2. **ahmedrachid/FinancialBERT-Sentiment-Analysis** - Financial sentiment
   - Optimized for financial news and reports
   - Three-class classification with confidence scores

### 🌍 Multilingual & General Models
3. **tabularisai/multilingual-sentiment-analysis** - Multilingual sentiment
   - Supports multiple languages
   - Four-class: Very Positive/Positive/Neutral/Negative
   - Great for international content

4. **nlptown/bert-base-multilingual-uncased-sentiment** - 5-star rating system
   - Converts text to 1-5 star ratings
   - Multilingual support
   - Perfect for review analysis

### 🐦 Social Media & Twitter Models
5. **finiteautomata/bertweet-base-sentiment-analysis** - Twitter sentiment
   - Optimized for social media text
   - Three-class: POS/NEG/NEU
   - Handles informal language well

### 🚀 Advanced AI Models
6. **facebook/bart-large-mnli** - Zero-shot classification
   - Can classify any text without training
   - Flexible sentiment analysis
   - High accuracy on diverse content

7. **yangheng/deberta-v3-base-absa-v1.1** - DeBERTa v3 base
   - State-of-the-art performance
   - Three-class: Positive/Negative/Neutral
   - Excellent for general sentiment analysis

8. **yangheng/deberta-v3-large-absa-v1.1** - DeBERTa v3 large
   - Highest accuracy model
   - Three-class classification
   - Best for critical applications

### 🔧 Model Selection Guide
- **For financial text**: Use FinBERT or FinancialBERT
- **For social media**: Use BERTweet
- **For multilingual content**: Use tabularisai multilingual
- **For highest accuracy**: Use DeBERTa v3 large
- **For flexibility**: Use BART MNLI (zero-shot)
- **For reviews**: Use nlptown 5-star rating

## Usage

1. **Start both backend and frontend servers**
2. **Select a model** from the dropdown
3. **Upload a file** or **type text directly**
4. **Click "Analyze"** to get sentiment results
5. **View detailed scores** and confidence percentages
6. **Switch models** to compare different approaches

## File Upload Support

- **Text files** (.txt) - Direct text content
- **Word documents** (.doc, .docx) - Text extraction
- **PDF files** (.pdf) - Text extraction






