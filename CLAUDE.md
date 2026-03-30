# CLAUDE – Project Development Guide

## Project Overview

یک CRM سفارشی برای پردازش داده‌های مشتریان از Excel. کاربر فایل آپلود می‌کند، سیستم پردازش و ادغام می‌کند، نتیجه در داشبورد تعاملی نمایش داده می‌شود. امکان افزودن دستی مشتری/خرید نیز وجود دارد.

> برای جزئیات کامل تکنیکال: **[ai-context.md](ai-context.md)** را بخوان.

---

## Architecture Summary

**سبک:** Session-Based SPA — backend مستقل FastAPI + frontend React.

```
Upload Excel → session_id (UUID) → Process → results_store[session_id] (DataFrame)
                                                      ↓
                                     Dashboard fetches stats + records via API
```

**قوانین ثابت معماری:**
- هیچ database ای وجود ندارد — `results_store` یک dict در حافظه است و با restart پاک می‌شود.
- `sessionStorage` مرورگر **فقط stats** نگه می‌دارد (نه records) — به خاطر محدودیت حجم.
- Records همیشه از `/api/results/{session_id}` fetch می‌شوند.
- شماره تلفن در backend و DataFrame همیشه **10 رقم بدون صفر اول** است (`9xxxxxxxxx`).
- ستون محصولات: `1` = خریده، `None` = نخریده — هرگز `0` استفاده نکن.
- UI کاملاً **RTL و فارسی** است.

**ممنوع:**
- اضافه کردن database یا persistence layer بدون درخواست صریح.
- ذخیره records در sessionStorage (حجم بیش از حد).
- استفاده از `0` به جای `None` برای ستون‌های محصول.
- تغییر فرمت شماره تلفن در DataFrame (باید 10 رقم بماند).

---

## Repository Structure

```
Custom CRM/
├── backend/
│   ├── main.py          # FastAPI app + تمام endpoints + results_store
│   ├── processor.py     # پردازش Excel، product_cols، calculate_loyalty_level
│   ├── requirements.txt
│   └── uploads/         # (gitignore) فایل‌های آپلودشده
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # routes (/, /processing/:id, /dashboard/:id)
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx          # آپلود فایل
│   │   │   ├── ProcessingPage.jsx      # progress bar + call /api/process
│   │   │   └── DashboardPage.jsx       # state اصلی: data, records, columns
│   │   └── components/
│   │       ├── DataTable.jsx           # جدول + فیلترها + export | props: records, columns, onAdd
│   │       ├── AddPurchaseModal.jsx    # modal دو صفحه‌ای افزودن مشتری/خرید
│   │       └── Charts/
│   │           ├── ExpertsPieChart.jsx
│   │           └── ProductsBarChart.jsx
│   └── package.json
├── CLAUDE.md            # این فایل — قوانین توسعه
├── ai-context.md        # جزئیات تکنیکال کامل
└── .gitignore
```

---

## Coding Conventions

**نام‌گذاری:**
- Python: `snake_case` برای متغیر/تابع، `PascalCase` برای کلاس.
- React: `PascalCase` برای کامپوننت، `camelCase` برای state/prop/function.
- فایل‌های کامپوننت: `PascalCase.jsx`، فایل‌های صفحه: `PascalCase + Page.jsx`.

**کد:**
- بدون کامنت اضافی — فقط جایی که logic واقعاً غیرواضح است.
- بدون type annotation اضافی در کدی که تغییر نداده‌ای.
- بدون error handling برای سناریوهایی که نمی‌توانند اتفاق بیفتند.
- بدون abstraction برای یک‌بار استفاده.
- ساده‌ترین راه‌حل ممکن را انتخاب کن.

**Styling (frontend):**
- فقط Tailwind CSS — بدون CSS فایل جداگانه.
- RTL با `dir="rtl"` روی container اصلی.
- رنگ‌بندی موجود: slate (خاکستری)، blue (اصلی)، green (موفقیت)، emerald (export)، amber (هشدار).

**Backend:**
- لاگ هر عملیات مهم با `logger.info()` یا `logger.error()`.
- HTTP errors با `HTTPException` و پیام فارسی.
- پاسخ‌های API باید `None` داشته باشند نه `NaN` (از `df.where(pd.notna(df), None)` استفاده کن).

**Commits:**
- تک‌خطی، به انگلیسی، بعد از هر تغییر — بدون استثنا.

---

## Development Rules

1. **قبل از هر تغییر، فایل مرتبط را بخوان** تا ساختار موجود را بفهمی.
2. فقط فایل‌هایی که مستقیماً به task مربوطند را تغییر بده.
3. الگوهای موجود پروژه را تقلید کن — الگوی جدید فقط در صورت ضرورت.
4. فایل جدید فقط وقتی که کامپوننت/ماژول واقعاً مستقل است اضافه کن.
5. dependency جدید فقط با دلیل محکم — ترجیحاً با چیزی که قبلاً در پروژه هست حل کن.
6. تغییرات معماری را بدون درخواست صریح انجام نده.

---

## API Overview

| Method | Endpoint | کاربرد |
|--------|----------|---------|
| POST | `/api/upload` | آپلود Excel → `session_id` |
| POST | `/api/process/{id}` | پردازش → stats |
| GET | `/api/results/{id}` | دریافت records + columns |
| GET | `/api/download/{id}` | دانلود Excel نهایی |
| POST | `/api/add_purchase/{id}` | افزودن/آپدیت مشتری یا خرید |

**مهم:** `/api/process` فقط stats برمی‌گرداند (نه records) تا از overflow حافظه مرورگر جلوگیری شود.

---

## AI Collaboration Rules

1. **ابتدا این فایل و سپس `ai-context.md` را بخوان** قبل از هر task.
2. هرگز کل پروژه را اسکن نکن — فقط فایل‌های لازم برای task فعلی.
3. تغییرات: کوچک، موضعی، با کمترین اختلال در معماری.
4. اگر فایل یا endpoint جدید اضافه شد، `ai-context.md` را آپدیت کن.
5. اگر معماری یا قوانین توسعه تغییر کرد، این فایل را هم آپدیت کن.
6. اگر چیزی نامشخص بود، حدس نزن — بپرس.
7. بعد از هر تغییر، یک کامیت تک‌خطی انگلیسی بزن (بدون اینکه کاربر بخواهد).
8. فقط آنچه خواسته شده را پیاده کن — feature اضافه، refactor ناخواسته، یا cleanup نکن.

---

## When to Update This File

این فایل باید آپدیت شود اگر:
- معماری کلی پروژه تغییر کند (مثلاً اضافه شدن database).
- ساختار پوشه‌ها عوض شود.
- قوانین کدنویسی یا commit تغییر کند.
- روش جدیدی برای مدیریت state یا API به پروژه اضافه شود.

---

## Last Updated

2026-03-30
