import uuid
import os
import io
import logging
from datetime import date, datetime
from typing import Any

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from database import get_db
from models import Customer, CustomerProduct, UploadSession
from processor import (
    process_excel,
    upsert_to_db,
    product_cols as PRODUCT_COLS,
    product_name_map as PRODUCT_NAME_MAP,
    calculate_loyalty_level,
    is_valid_name,
)

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

# ---------------------------------------------------------------------------
# Adapter: ORM Customer → flat dict the frontend expects
# ---------------------------------------------------------------------------

COLUMN_ORDER = [
    'numberr', 'name', 'sp', 'province',
    'registration_date', 'first_purchase_date', 'last_purchase_date',
    'total_purchases', 'total_amount',
    'chini', 'dakheli', 'zaban', 'book', 'carman', 'azmoon', 'ghabooli', 'garage',
    'hoz', 'kia', 'milyarder', 'gds-tuts', 'gds', 'tpms-tuts', 'zed', 'kmc', 'carmap', 'eps',
    'hichi', 'products', 'description', 'score', 'loyalty_level',
]


def to_flat_record(customer: Customer) -> dict[str, Any]:
    purchased = {cp.product_key for cp in customer.purchases}

    product_fields: dict[str, Any] = {}
    for col in PRODUCT_COLS:
        product_fields[col] = 1 if col in purchased else None

    product_str = ' | '.join(
        PRODUCT_NAME_MAP[col]
        for col in PRODUCT_NAME_MAP
        if col in purchased
    ) or None

    has_product = any(product_fields[col] == 1 for col in PRODUCT_COLS if col in product_fields)

    def _d(v):
        return str(v) if v is not None else None

    record = {
        'numberr': customer.phone,
        'name': customer.name,
        'sp': customer.sp,
        'province': customer.province,
        'registration_date': _d(customer.registration_date),
        'first_purchase_date': _d(customer.first_purchase_date),
        'last_purchase_date': _d(customer.last_purchase_date),
        'total_purchases': customer.total_purchases,
        'total_amount': customer.total_amount,
        **product_fields,
        'hichi': None if has_product else 1,
        'products': product_str,
        'description': customer.description,
        'score': customer.score,
        'loyalty_level': customer.loyalty_level,
    }
    return record


# ---------------------------------------------------------------------------
# Stats helper — computed from DB (global across all uploads)
# ---------------------------------------------------------------------------

async def compute_stats(session: AsyncSession) -> dict:
    total_result = await session.execute(select(func.count()).select_from(Customer))
    total = total_result.scalar() or 0

    # hichi_count: customers with no purchases
    no_purchase_sub = (
        select(CustomerProduct.customer_id)
        .distinct()
        .scalar_subquery()
    )
    hichi_result = await session.execute(
        select(func.count()).select_from(Customer).where(Customer.id.not_in(no_purchase_sub))
    )
    hichi_count = hichi_result.scalar() or 0

    # experts_stats
    sp_result = await session.execute(
        select(Customer.sp, func.count().label('cnt'))
        .where(Customer.sp.isnot(None), Customer.sp != '')
        .group_by(Customer.sp)
        .order_by(func.count().desc())
    )
    experts_stats = [
        {
            'name': row.sp,
            'count': row.cnt,
            'percentage': round(row.cnt / total * 100, 1) if total > 0 else 0,
        }
        for row in sp_result.all()
    ]

    # products_stats
    prod_result = await session.execute(
        select(CustomerProduct.product_key, func.count().label('cnt'))
        .group_by(CustomerProduct.product_key)
    )
    prod_map = {row.product_key: row.cnt for row in prod_result.all()}

    products_stats = [
        {'product': label, 'count': prod_map.get(col, 0)}
        for col, label in PRODUCT_NAME_MAP.items()
    ]
    products_stats.sort(key=lambda x: x['count'], reverse=True)

    return {
        'total': total,
        'hichi_count': hichi_count,
        'experts_stats': experts_stats,
        'products_stats': products_stats,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"Upload request received: {file.filename}")

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="فقط فایل Excel قبول می‌شود")

    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"File saved: {file_path}")

        db.add(UploadSession(id=session_id, filename=file.filename))
        await db.commit()

        return {"session_id": session_id, "filename": file.filename}
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process/{session_id}")
async def process_file(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"Process request: {session_id}")

    session_row = await db.get(UploadSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="نشست یافت نشد")

    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.xlsx")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="فایل یافت نشد")

    try:
        result = process_excel(file_path)
        await upsert_to_db(db, result)

        session_row.processed_at = datetime.utcnow()
        session_row.customer_count = result['total']
        await db.commit()

        stats = await compute_stats(db)
        logger.info(f"Process complete. DB total: {stats['total']}")
        return stats
    except Exception as e:
        await db.rollback()
        logger.error(f"Processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/results/{session_id}")
async def get_results(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"Results request: {session_id}")

    session_row = await db.get(UploadSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="نتیجه یافت نشد")

    stmt = select(Customer)
    customers = (await db.execute(stmt)).scalars().all()

    records = [to_flat_record(c) for c in customers]
    logger.info(f"Returning {len(records)} records")
    return {"records": records, "columns": COLUMN_ORDER}


@app.post("/api/add_purchase/{session_id}")
async def add_purchase(
    session_id: str,
    purchase_data: dict,
    db: AsyncSession = Depends(get_db),
):
    session_row = await db.get(UploadSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="نشست یافت نشد")

    phone = purchase_data.get('phone')
    customer_name = purchase_data.get('customer_name')
    province = purchase_data.get('province')
    sp = purchase_data.get('sp')
    products: dict = purchase_data.get('products', {})
    save_only: bool = purchase_data.get('save_only', False)
    today = date.today()

    logger.info(f"add_purchase: phone={phone}, save_only={save_only}")

    stmt = select(Customer).where(Customer.phone == phone)
    customer = (await db.execute(stmt)).scalar_one_or_none()

    if customer is None:
        customer = Customer(
            phone=phone,
            name=customer_name,
            province=province,
            sp=sp,
            registration_date=today,
            total_purchases=0,
        )
        db.add(customer)
        await db.flush()
        logger.info(f"New customer created: {phone}")
    else:
        # Optimistic lock check (version is bumped on each update)
        customer.name = customer_name
        customer.province = province
        customer.sp = sp
        customer.version += 1

    if not save_only and products:
        amount_total = sum(v for v in products.values() if v)
        rows = [
            {
                'customer_id': customer.id,
                'product_key': col,
                'amount': products.get(col),
                'source': 'manual_entry',
            }
            for col in products
            if col in PRODUCT_COLS
        ]
        if rows:
            insert_stmt = pg_insert(CustomerProduct).values(rows)
            insert_stmt = insert_stmt.on_conflict_do_nothing(
                index_elements=['customer_id', 'product_key']
            )
            await db.execute(insert_stmt)

        customer.total_purchases = (customer.total_purchases or 0) + len(products)
        customer.total_amount = (customer.total_amount or 0) + amount_total
        customer.last_purchase_date = today
        if not customer.first_purchase_date:
            customer.first_purchase_date = today
        customer.loyalty_level = calculate_loyalty_level(customer.total_purchases)

    await db.commit()
    await db.refresh(customer)

    record = to_flat_record(customer)
    logger.info(f"add_purchase success: {phone}")
    return {"success": True, "record": record}


@app.get("/api/customer/{session_id}/{phone}")
async def get_customer(
    session_id: str,
    phone: str,
    db: AsyncSession = Depends(get_db),
):
    session_row = await db.get(UploadSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="نشست یافت نشد")

    stmt = select(Customer).where(Customer.phone == phone)
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="مشتری یافت نشد")

    purchased = [cp.product_key for cp in customer.purchases]
    return {"customer": to_flat_record(customer), "purchased_products": purchased}


@app.get("/api/download/{session_id}")
async def download_result(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    session_row = await db.get(UploadSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="نتیجه یافت نشد")

    stmt = select(Customer)
    customers = (await db.execute(stmt)).scalars().all()

    records = [to_flat_record(c) for c in customers]
    df = pd.DataFrame(records, columns=COLUMN_ORDER)

    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=result.xlsx"},
    )
