import uuid
import os
import io
import logging
from datetime import date
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
from processor import process_excel, product_cols as PRODUCT_COLS, calculate_loyalty_level

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

@app.post("/api/add_purchase/{session_id}")
async def add_purchase(session_id: str, purchase_data: dict):
    logger.info(f"Add purchase request for session_id: {session_id}, phone: {purchase_data.get('phone')}")

    if session_id not in results_store:
        raise HTTPException(status_code=404, detail="نشست یافت نشد")

    df = results_store[session_id]
    phone = purchase_data.get('phone')
    customer_name = purchase_data.get('customer_name')
    province = purchase_data.get('province')
    products = purchase_data.get('products', {})
    save_only = purchase_data.get('save_only', False)
    today = str(date.today())

    mask = df['numberr'] == phone

    if not mask.any():
        logger.info(f"Creating new customer for phone: {phone}")
        new_row = {col: None for col in df.columns}
        new_row['numberr'] = phone
        new_row['name'] = customer_name
        new_row['province'] = province
        new_row['registration_date'] = today

        if not save_only and products:
            for col in products:
                if col in new_row:
                    new_row[col] = 1
            new_row['total_purchases'] = len(products)
            new_row['total_amount'] = sum(products.values())
            new_row['first_purchase_date'] = today
            new_row['last_purchase_date'] = today
            new_row['loyalty_level'] = calculate_loyalty_level(new_row['total_purchases'])
            logger.info(f"New customer with {len(products)} products, total_amount: {new_row['total_amount']}")

        results_store[session_id] = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df = results_store[session_id]
        record_row = df[df['numberr'] == phone].iloc[-1]
    else:
        idx = df[mask].index[0]
        logger.info(f"Updating existing customer index {idx} for phone: {phone}")

        if not save_only and products:
            for col in products:
                if col in df.columns:
                    df.at[idx, col] = 1

            current_total = df.at[idx, 'total_purchases'] or 0
            current_amount = df.at[idx, 'total_amount'] or 0
            df.at[idx, 'total_purchases'] = current_total + len(products)
            df.at[idx, 'total_amount'] = current_amount + sum(products.values())
            df.at[idx, 'last_purchase_date'] = today

            if not df.at[idx, 'first_purchase_date']:
                df.at[idx, 'first_purchase_date'] = today

            df.at[idx, 'loyalty_level'] = calculate_loyalty_level(df.at[idx, 'total_purchases'])
            logger.info(f"Updated customer: total_purchases={df.at[idx, 'total_purchases']}, total_amount={df.at[idx, 'total_amount']}")

        results_store[session_id] = df
        record_row = df.iloc[idx]

    record = record_row.where(pd.notna(record_row), None).to_dict()
    logger.info(f"Successfully processed add_purchase for phone: {phone}")
    return {"success": True, "record": record}


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
