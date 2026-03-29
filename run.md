# ترمینال ۱ - Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# ترمینال ۲ - Frontend
cd frontend
npm install
npm run dev


======


# ترمینال ۱ - Backend
cd backend
uvicorn main:app --reload

# ترمینال ۲ - Frontend
cd frontend
npm run dev
