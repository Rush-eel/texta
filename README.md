# Texta - Sentiment Analysis with Hugging Face Models

A modern, elegant sentiment analysis application built with React, FastAPI, and Hugging Face Transformers.

## Features

- **Multiple AI Models**: Support for DistilBERT, RoBERTa Twitter, and BERT Multilingual
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
- **Transformers** - Hugging Face library for NLP models
- **PyTorch** - Deep learning framework
- **Uvicorn** - ASGI server

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
   python main.py
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

1. **DistilBERT** (`distilbert-base-uncased-finetuned-sst-2-english`)
   - Binary classification: Positive/Negative
   - Fast and efficient

2. **RoBERTa Twitter** (`cardiffnlp/twitter-roberta-base-sentiment-latest`)
   - Three-class classification: Positive/Negative/Neutral
   - Optimized for social media text

3. **BERT Multilingual** (`nlptown/bert-base-multilingual-uncased-sentiment`)
   - 5-star rating system
   - Multilingual support

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

## Color Coding

- **Green** 🟢 - Positive sentiment
- **Red** 🔴 - Negative sentiment  
- **Grey** ⚫ - Neutral sentiment

## Development

### Project Structure
```
texta/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── src/
│   ├── services/
│   │   ├── apiService.js    # API communication
│   │   └── textAnalysisService.js  # Legacy service
│   ├── App.jsx              # Main React component
│   └── index.css            # Tailwind CSS
├── package.json             # Node.js dependencies
└── README.md               # This file
```

### Adding New Models

1. **Update backend/main.py** - Add model initialization
2. **Update frontend** - Add model selection option
3. **Test integration** - Verify model works correctly

## Deployment

### Backend Deployment
- **Render**: Easy deployment with Python support
- **Railway**: Simple container deployment
- **Heroku**: Traditional Python hosting

### Frontend Deployment
- **Vercel**: Optimized for React apps
- **Netlify**: Simple static site hosting
- **GitHub Pages**: Free hosting for open source

## Troubleshooting

### Backend Issues
- **Model loading fails**: Check internet connection and model availability
- **Memory errors**: Reduce batch size or use smaller models
- **CORS errors**: Verify frontend URLs in CORS configuration

### Frontend Issues
- **Connection failed**: Ensure backend is running on port 8000
- **Models not loading**: Check backend health endpoint
- **Analysis errors**: Verify text input and model selection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue
- Check the troubleshooting section
- Review FastAPI and Transformers documentation

---

**Built with ❤️ using modern web technologies and AI models**
