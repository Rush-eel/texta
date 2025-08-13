#!/usr/bin/env python3
"""
Startup script for memory-optimized model loading
"""
import os
import gc
import logging

# Force CPU usage
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def optimize_memory():
    """Optimize memory usage before loading models"""
    logger.info("Optimizing memory usage...")
    
    # Force garbage collection
    gc.collect()
    
    # Set environment variables for PyTorch
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    
    logger.info("Memory optimization complete")

if __name__ == "__main__":
    optimize_memory()
