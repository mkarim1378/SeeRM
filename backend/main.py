import uuid
import os
import io
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
from processor import process_excel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
logger.info(f"Upload directory initialized: {UPLOAD_DIR}")

results_store: dict = {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    logger.info(f"Upload request received for file: {file.filename}")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        logger.warning(f"Invalid file type rejected: {file.filename}")
        raise HTTPException(status_code=400, detail="فقط فایل Excel قبول می‌شود")

    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")
    
    logger.info(f"Generated session_id: {session_id}")

    try:
        content = await file.read()
        file_size = len(content)
        logger.info(f"File read successfully, size: {file_size} bytes")
        
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"File saved to: {file_path}")
        
        return {"session_id": session_id, "filename": file.filename}
    except Exception as e:
        logger.error(f"Failed to upload file {file.filename}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/process/{session_id}")
async def process_file(session_id: str):
    logger.info(f"Processing request for session_id: {session_id}")
    
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")
    if not os.path.exists(file_path):
        logger.error(f"File not found for session_id: {session_id}")
        raise HTTPException(status_code=404, detail="فایل یافت نشد")

    try:
        logger.info(f"Starting Excel processing for: {file_path}")
        result = process_excel(file_path)
        
        logger.info(f"Processing completed. Total records: {result.get('total', 0)}")
        
        results_store[session_id] = result['final_df']
        logger.info(f"Results stored in memory for session_id: {session_id}")
        
        result.pop('final_df')
        return result
    except Exception as e:
        logger.error(f"Processing failed for session_id {session_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{session_id}")
async def download_result(session_id: str):
    logger.info(f"Download request for session_id: {session_id}")
    
    if session_id not in results_store:
        logger.error(f"Results not found in store for session_id: {session_id}")
        raise HTTPException(status_code=404, detail="نتیجه یافت نشد")

    try:
        df = results_store[session_id]
        logger.info(f"Retrieved dataframe with {len(df)} rows for download")
        
        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)
        
        logger.info(f"Excel file generated successfully for session_id: {session_id}")
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=result.xlsx"}
        )
    except Exception as e:
        logger.error(f"Download failed for session_id {session_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
