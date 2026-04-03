# AI Context – Project Overview

## Project Summary

یک CRM سفارشی برای پردازش و تحلیل داده‌های مشتریان از فایل‌های Excel. کاربر فایل Excel حاوی سوابق خرید مشتریان را آپلود می‌کند؛ سیستم آن را پردازش، ادغام و تحلیل کرده و نتیجه را در یک داشبورد تعاملی نمایش می‌دهد. همچنین امکان افزودن دستی مشتری/خرید جدید وجود دارد.

---

## Tech Stack

| لایه | ابزار |
|------|-------|
| Backend Language | Python 3 |
| Backend Framework | FastAPI + Uvicorn |
| Data Processing | pandas, openpyxl |
| Frontend Framework | React 18 (Vite) |
| Styling | Tailwind CSS v3 |
| HTTP Client | axios |
| Charts | recharts |
| Icons | lucide-react |
| Excel Export (frontend) | xlsx (SheetJS) |
| Package Manager (frontend) | npm |
| Package Manager (backend) | pip (venv) |

---

## Architecture Overview

معماری **Session-Based Single-Page App** با backend مستقل:

- هر بار آپلود فایل یک `session_id` (UUID) تولید می‌شود.
- نتیجه پردازش در حافظه سرور (`results_store` dict) با کلید `session_id` نگهداری می‌شود — **بدون database**.
- Frontend فقط آمار/stats را در `sessionStorage` مرورگر ذخیره می‌کند (نه رکوردها، به دلیل محدودیت حجم).
- رکوردهای جدول از endpoint جداگانه `/api/results/{session_id}` fetch می‌شوند.
- UI کاملاً فارسی و RTL است.

**قوانین مهم:**
- `results_store` با restart سرور پاک می‌شود (in-memory only).
- شماره تلفن‌ها به فرمت **10 رقمی بدون صفر اول** ذخیره می‌شوند (مثلاً `9123456789`).
- ستون‌های محصول مقدار باینری دارند: `1` = دارد، `None` = ندارد.

---

## Project Structure

```
Custom CRM/
├── backend/
│   ├── main.py          # FastAPI app, تمام endpoints
│   ├── processor.py     # منطق پردازش Excel، تعریف محصولات، loyalty_level
│   ├── requirements.txt # fastapi, uvicorn, pandas, openpyxl, python-multipart
│   └── uploads/         # فایل‌های Excel آپلودشده (gitignore)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # React Router routes
│   │   ├── main.jsx                   # entry point
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx         # آپلود فایل Excel (پشتیبانی از append mode)
│   │   │   ├── ProcessingPage.jsx     # نمایش progress پردازش + merge stats در append mode
│   │   │   ├── DashboardPage.jsx      # داشبورد اصلی (آمار + جدول)
│   │   │   ├── CustomerProfilePage.jsx # پروفایل مشتری (gauge + charts + اطلاعات)
│   │   │   └── SettingsPage.jsx       # تنظیمات نام محصولات و کارشناسان
│   │   ├── components/
│   │   │   ├── DataTable.jsx          # جدول پیشرفته با فیلتر، صفحه‌بندی، export
│   │   │   ├── AddPurchaseModal.jsx   # modal افزودن مشتری/خرید
│   │   │   └── Charts/
│   │   │       ├── ExpertsPieChart.jsx
│   │   │       ├── ProductsBarChart.jsx
│   │   │       ├── PurchaseHistoryChart.jsx  # نمودار محصولات خریداری‌شده در پروفایل
│   │   │       └── SatisfactionGauge.jsx     # gauge سطح وفاداری در پروفایل
│   │   └── utils/
│   │       ├── products.js            # تعریف متمرکز محصولات (PRODUCTS, PRODUCT_LABEL_MAP)
│   │       ├── settings.js            # خواندن/نوشتن تنظیمات از localStorage
│   │       └── jalali.js              # تبدیل تاریخ میلادی به شمسی (jalaali-js)
│   ├── package.json
│   └── index.html
├── ai-context.md        # این فایل
└── .gitignore
```

---

## Key Modules

### `backend/processor.py`
- **مسئولیت:** پردازش کامل Excel، نرمال‌سازی شماره‌ها، ادغام رکوردهای تکراری، محاسبه loyalty level.
- **موارد مهم:**
  - `product_cols`: لیست ۱۸ محصول: `chini, dakheli, zaban, book, carman, azmoon, ghabooli, garage, hoz, kia, milyarder, gds-tuts, gds, tpms-tuts, zed, kmc, carmap, eps`
  - `product_name_map`: نگاشت کلید → نام فارسی (برخی کلیدها مثل `azmoon`, `ghabooli`, `garage` در map نیستند)
  - `calculate_loyalty_level(score)`: بر اساس score (فعلاً = total_purchases) → Bronze/Silver/Gold/Platinum/Diamond
  - `clean_phone_number()`: استخراج و نرمال‌سازی شماره به 10 رقم
  - ستون ورودی اصلی: `numberr` (شماره تلفن)، `name`، `sp` (کارشناس)

### `backend/main.py`
- **مسئولیت:** تمام HTTP endpoints، مدیریت `results_store`، logging.
- **موارد مهم:**
  - `results_store: dict` — کلید: session_id، مقدار: pandas DataFrame
  - لاگ‌گذاری کامل با `logging` استاندارد Python

### `frontend/src/pages/DashboardPage.jsx`
- **مسئولیت:** state اصلی داشبورد، fetch stats از sessionStorage، fetch records از API.
- **state های اصلی:** `data` (stats)، `records` (آرایه رکوردها)، `columns`، `showModal`، `toast`
- دکمه split برای "افزودن داده" (append mode) + modal تأیید راه‌اندازی مجدد.

### `frontend/src/components/DataTable.jsx`
- **مسئولیت:** نمایش جدول، فیلتر ۳ حالته محصولات، فیلترهای پیشرفته، صفحه‌بندی، export Excel.
- **props:** `records`, `columns`, `onAdd`
- هر صفحه ۲۰ رکورد نمایش می‌دهد.
- نام محصولات و کارشناسان از settings (localStorage) خوانده می‌شود.

### `frontend/src/components/AddPurchaseModal.jsx`
- **مسئولیت:** modal دو صفحه‌ای برای افزودن مشتری یا ثبت خرید.
- صفحه ۱: شماره (searchable از records موجود)، نام، استان، کارشناس
- صفحه ۲: انتخاب محصول (dropdown جستجوپذیر cascading) + مبلغ
- شماره validate می‌شود: ۱۰ رقم بدون 0 یا ۱۱ رقم با 0؛ قبل از ارسال به API به 10 رقم نرمال می‌شود.
- نام محصولات از settings خوانده می‌شود.

### `frontend/src/pages/CustomerProfilePage.jsx`
- **مسئولیت:** نمایش پروفایل کامل مشتری.
- route: `/profile/:sessionId/:phone`
- از endpoint `GET /api/customer/{session_id}/{phone}` داده می‌گیرد.
- نمایش: اطلاعات پایه، تاریخ‌های شمسی، `SatisfactionGauge`، `PurchaseHistoryChart`، لیست محصولات.

### `frontend/src/pages/SettingsPage.jsx`
- **مسئولیت:** تنظیمات نام نمایشی محصولات و کارشناسان.
- route: `/settings` (با `state: { sessionId }` برای دریافت لیست کارشناسان از API)
- داده‌ها در `localStorage` با کلید `crm_settings` ذخیره می‌شوند.

### `frontend/src/utils/products.js`
- **مسئولیت:** تنها منبع تعریف محصولات در frontend.
- exports: `PRODUCTS` (آرایه `{key, label}`)، `PRODUCT_LABEL_MAP` (key→label)، `BACKEND_LABEL_TO_KEY`
- **توجه:** `azmoon`, `ghabooli`, `garage` در `BACKEND_KEYS` نیستند (در `product_name_map` backend هم نیستند).

### `frontend/src/utils/settings.js`
- **مسئولیت:** خواندن/نوشتن تنظیمات از `localStorage`.
- exports: `getSettings`, `saveSettings`, `getProductNames`, `getExpertNames`
- کلید localStorage: `crm_settings` — ساختار: `{ productNames: {key: label}, expertNames: {code: label} }`

### `frontend/src/utils/jalali.js`
- **مسئولیت:** تبدیل تاریخ میلادی (string `YYYY-MM-DD`) به شمسی.
- از کتابخانه `jalaali-js` استفاده می‌کند.
- exports: `toJalali(dateStr)`, `gregorianStrToDate`, `dateObjToGregorianStr`

---

## API Endpoints

| Method | Path | عملکرد |
|--------|------|---------|
| `POST` | `/api/upload` | آپلود فایل Excel → `{session_id, filename}` |
| `POST` | `/api/process/{session_id}` | پردازش فایل → stats (بدون records) |
| `GET` | `/api/results/{session_id}` | دریافت `{records, columns}` |
| `GET` | `/api/download/{session_id}` | دانلود نتیجه به صورت Excel |
| `POST` | `/api/add_purchase/{session_id}` | افزودن/آپدیت مشتری یا خرید |
| `GET` | `/api/customer/{session_id}/{phone}` | پروفایل مشتری → `{customer, purchased_products}` |

### `POST /api/add_purchase/{session_id}` — body:
```json
{
  "phone": "9123456789",
  "customer_name": "علی محمدی",
  "province": "تهران",
  "sp": "کد_کارشناس",
  "products": { "chini": 500000, "hoz": 300000 },
  "save_only": false
}
```
- `save_only: true` → فقط اطلاعات مشتری ذخیره، بدون خرید
- `products` → dict از `col: amount`؛ ستون‌های مربوط به 1 set می‌شوند، `total_purchases` و `total_amount` آپدیت می‌شوند
- فیلد `sp` (کارشناس فروش) نیز ذخیره/آپدیت می‌شود

### `GET /api/customer/{session_id}/{phone}` — response:
```json
{
  "customer": { "numberr": "9123456789", "name": "...", ... },
  "purchased_products": ["chini", "hoz"]
}
```

---

## Important Conventions

- **شماره تلفن:** همیشه 10 رقم بدون صفر اول در backend و DataFrame؛ در UI با صفر اول نمایش داده می‌شود.
- **محصولات در DataFrame:** مقدار `1` = خریده، `None` = نخریده (نه `0`).
- **loyalty_level:** مقادیر انگلیسی (`Bronze`, `Silver`, `Gold`, `Platinum`, `Diamond`) در DataFrame؛ ترجمه در frontend انجام می‌شود.
- **RTL:** تمام UI با `dir="rtl"` و متن فارسی.
- **لاگ‌گذاری:** از `logging` استاندارد Python در backend؛ هر عملیات مهم لاگ دارد.
- **Commit messages:** تک‌خطی، به انگلیسی.
- **کامنت:** کامنت اضافی در کد نباید اضافه شود.
- **تاریخ‌ها:** در DataFrame به فرمت `YYYY-MM-DD` میلادی؛ در UI با `toJalali()` به شمسی تبدیل می‌شوند.
- **نام نمایشی محصولات/کارشناسان:** override از `localStorage` (`crm_settings`) — همیشه fallback به مقدار پیش‌فرض اگر override نباشد.
- **تعریف محصولات در frontend:** فقط از `utils/products.js` — هرگز inline تعریف نکن.
- **Append mode:** آپلود فایل جدید با `?mode=append&from={oldSessionId}` — backend دو session مجزا می‌سازد؛ در ProcessingPage stats ادغام می‌شوند و `appendFrom` در sessionStorage ذخیره می‌شود. رکوردهای تکراری در backend با ادغام (حفظ کارشناس + union محصولات) پردازش می‌شوند.

---

## Environment & Config

- **CORS:** در backend باز است (`allow_origins=["*"]`) — فقط مناسب development.
- **Upload dir:** `backend/uploads/` — در `.gitignore` است.
- **Vite proxy:** درخواست‌های `/api/*` از frontend به backend روی پورت متفاوت proxy نمی‌شوند؛ باید backend و frontend روی پورت یکسان یا با proxy کانفیگ شده اجرا شوند.
- **هیچ `.env` فعالی** در پروژه وجود ندارد.

---

## Development Workflow

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev                  # پورت پیش‌فرض 5173
```

> برای production: `npm run build` سپس serve استاتیک از `frontend/dist/`.

---

## AI Assistant Instructions

1. **قبل از هر کار، این فایل را بخوان** تا context پروژه روشن باشد.
2. فقط فایل‌های مرتبط با task را باز کن؛ از اسکن کل پروژه بپرهیز.
3. **هر تغییر مهم** (فایل جدید، endpoint جدید، dependency جدید، تغییر ساختار) را در این فایل ثبت کن.
4. بعد از هر تغییر در کد، **یک کامیت تک‌خطی انگلیسی** بزن.
5. `results_store` in-memory است — هیچ‌گاه از آن به عنوان database دائمی استفاده نکن.
6. شماره تلفن را قبل از ارسال به API نرمال کن (10 رقم، بدون 0).
7. sessionStorage فقط stats را نگه می‌دارد؛ records از `/api/results/{session_id}` fetch می‌شوند.
8. برای تعریف محصولات در frontend، فقط از `utils/products.js` استفاده کن.
9. نام نمایشی محصولات و کارشناسان را از `utils/settings.js` بخوان — هرگز hardcode نکن.

---

## Last Updated

2026-04-03 — افزوده شد: صفحه پروفایل مشتری، صفحه تنظیمات (نام محصولات/کارشناسان)، append mode، utils متمرکز (products/settings/jalali)، endpoint پروفایل مشتری، نمودارهای SatisfactionGauge و PurchaseHistoryChart.
