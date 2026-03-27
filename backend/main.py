import uuid
import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
from processor import process_excel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# نتایج موقت در حافظه (فاز ۱ - بدون دیتابیس)
results_store: dict = {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="فقط فایل Excel قبول می‌شود")

    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return {"session_id": session_id, "filename": file.filename}

@app.post("/api/process/{session_id}")
async def process_file(session_id: str):
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="فایل یافت نشد")

    try:
        result = process_excel(file_path)
        # ذخیره موقت نتیجه برای دانلود
        results_store[session_id] = result['final_df']
        # حذف final_df از response (قابل serialize نیست)
        result.pop('final_df')
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{session_id}")
async def download_result(session_id: str):
    if session_id not in results_store:
        raise HTTPException(status_code=404, detail="نتیجه یافت نشد")

    df = results_store[session_id]
    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=result.xlsx"}
    )
