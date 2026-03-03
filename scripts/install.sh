#!/bin/bash
# Cognitive Agent Platform — Full Installation Script
# Usage: ./scripts/install.sh

set -e

echo "🚀 Starting CAP Installation..."

# 1. Check dependencies
command -v python3 >/dev/null 2>&1 || { echo >&2 "Python3 is required. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo >&2 "docker-compose is required. Aborting."; exit 1; }

echo "✅ Dependencies verified."

# 2. Setup Environment
if [ ! -f .env ]; then
    echo "⚠️ .env not found. Copying from .env.example..."
    cp .env.example .env
    echo "🚨 IMPORTANT: Please edit .env with your actual API keys before running the application."
fi

# 3. Backend Setup
echo "🐍 Setting up Backend (FastAPI)..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# 4. Frontend Setup
echo "⚛️ Setting up Frontend (Next.js)..."
cd frontend
npm install
cd ..

# 5. Bring up Databases via Docker
echo "🐳 Starting PostgreSQL and Redis via Docker Compose..."
docker-compose up -d postgres redis

# Wait for DB to be healthy
echo "⏳ Waiting for PostgreSQL to initialize..."
sleep 5

echo "✅ Installation complete."
echo "--------------------------------------------------------"
echo "To start the full stack, run:"
echo "  docker-compose up --build"
echo "--------------------------------------------------------"
