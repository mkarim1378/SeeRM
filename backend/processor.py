import pandas as pd
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# TODO: Score calculation logic is TBD.
# Need to define: which customer events add points, how many points per event
# (e.g. purchase = +X points, referral = +Y points, etc.)
# Update LOYALTY_THRESHOLDS below once scoring rules are finalized.
LOYALTY_THRESHOLDS = [
    (501, float('inf'), 'الماسی'),
    (201, 500,          'طلایی'),
    (51,  200,          'نقره‌ای'),
    (1,   50,           'برنزی'),
]

def get_loyalty_level(score):
    if pd.isna(score) or score is None:
        return None
    score_int = int(score)
    for min_s, max_s, name in LOYALTY_THRESHOLDS:
        if min_s <= score_int <= max_s:
            return name
    return None

target_sales_experts = ['بابایی', 'احمدی', 'هارونی', 'محمدی']

product_name_map = {
    'chini': 'دوره آنلاین چینی',
    'dakheli': 'دوره آنلاین داخلی',
    'zaban': 'دوره زبان فنی',
    'book': 'کتاب زبان فنی',
    'carman': 'دستگاه دیاگ',
    'hoz': 'دوره حضوری',
    'kia': 'دوره آنلاین کره‌ای',
    'milyarder': 'دوره تعمیرکار میلیاردر',
    'gds-tuts': 'دوره GDS',
    'gds': 'نرم افزار GDS',
    'tpms-tuts': 'دوره TPMS',
    'zed': 'دوره ضد سرقت',
    'kmc': 'وبینار KMC',
    'carmap': 'کارمپ',
    'eps': 'فرمان برقی حضوری',
}

product_cols = [
    'chini','dakheli','zaban','book','carman','azmoon','ghabooli',
    'garage','hoz','kia','milyarder','gds-tuts','gds','tpms-tuts',
    'zed','kmc','carmap','eps'
]

def clean_phone_number(phone_value):
    if pd.isna(phone_value):
        return None
    digits = re.sub(r'\D', '', str(phone_value))
    match = re.search(r'09\d{9}', digits)
    if match:
        return match.group()[1:]
    match = re.search(r'9\d{9}', digits)
    if match:
        return match.group()
    return None

def agg_description(series):
    non_null_series = series.dropna()
    if non_null_series.empty:
        return None
    return ' | '.join(non_null_series.astype(str))

def is_valid_name(name):
    if pd.isna(name):
        return False
    name_str = str(name).strip()
    if not name_str:
        return False
    invalid_patterns = ['بدون نام', 'بدوننام', 'نام ندارد', 'nan', 'None', 'null']
    name_lower = name_str.lower()
    for pattern in invalid_patterns:
        if pattern.lower() in name_lower:
            return False
    if re.search(r'\d', name_str):
        return False
    return True

def calculate_loyalty_level(score):
    """
    Calculate customer loyalty level based on score
    Levels: Bronze (0-100), Silver (101-300), Gold (301-600), 
    Platinum (601-1000), Diamond (1001+)
    """
    if pd.isna(score) or score is None:
        return None
    score = int(score)
    if score <= 100:
        return 'Bronze'
    elif score <= 300:
        return 'Silver'
    elif score <= 600:
        return 'Gold'
    elif score <= 1000:
        return 'Platinum'
    else:
        return 'Diamond'

def process_excel(file_path: str) -> dict:
    logger.info(f"Starting Excel processing for file: {file_path}")
    
    try:
        df = pd.read_excel(file_path)
        logger.info(f"Excel file loaded successfully. Rows: {len(df)}, Columns: {len(df.columns)}")
    except Exception as e:
        logger.error(f"Failed to read Excel file: {str(e)}", exc_info=True)
        raise

    # Clean phone numbers
    logger.info("Cleaning phone numbers...")
    df['numberr'] = df['numberr'].apply(clean_phone_number)
    initial_count = len(df)
    df.dropna(subset=['numberr'], inplace=True)
    dropped = initial_count - len(df)
    if dropped > 0:
        logger.warning(f"Dropped {dropped} rows with invalid phone numbers")
    
    df['__original_order'] = range(len(df))

    # Convert product columns to binary
    logger.info("Converting product columns to binary...")
    for col in product_cols:
        if col in df.columns:
            numeric_col = pd.to_numeric(df[col], errors='coerce').fillna(0)
            df[col] = (numeric_col > 0).astype(int)

    # Validate names
    logger.info("Validating customer names...")
    df['__is_valid_name'] = df['name'].apply(is_valid_name)
    valid_names_count = df['__is_valid_name'].sum()
    logger.info(f"Found {valid_names_count} valid names out of {len(df)} records")

    valid_name_map = (
        df[df['__is_valid_name']]
        .sort_values('__original_order')
        .drop_duplicates('numberr', keep='first')
        .set_index('numberr')['name']
    )

    name_pref_map = (
        df.sort_values(['numberr', '__is_valid_name', '__original_order'],
                       ascending=[True, False, True])
          .drop_duplicates('numberr', keep='first')
          .set_index('numberr')['name']
    )

    name_pref_map = name_pref_map.copy()
    invalid_mask = ~name_pref_map.apply(is_valid_name)
    replacement_names = pd.Series(
        name_pref_map.loc[invalid_mask].index.map(valid_name_map),
        index=name_pref_map.loc[invalid_mask].index
    )
    name_pref_map.loc[invalid_mask] = replacement_names.combine_first(
        name_pref_map.loc[invalid_mask]
    )

    # Aggregate by phone number
    logger.info("Aggregating records by phone number...")
    aggregation_logic = {col: 'max' for col in product_cols if col in df.columns}
    if 'description' in df.columns:
        aggregation_logic['description'] = agg_description

    final_df = df.groupby('numberr').agg(aggregation_logic).reset_index()
    logger.info(f"Aggregation complete. Unique phone numbers: {len(final_df)}")
    
    order_map = df.drop_duplicates('numberr')[['numberr', '__original_order']]
    final_df = (
        final_df.merge(order_map, on='numberr', how='left')
        .sort_values('__original_order')
        .drop(columns='__original_order')
    )

    # Map sales experts
    sp_map = (
        df.sort_values('__original_order')
          .dropna(subset=['sp'])
          .drop_duplicates('numberr', keep='first')
          .set_index('numberr')['sp']
    )
    final_df['sp'] = final_df['numberr'].map(sp_map)
    final_df['name'] = final_df['numberr'].map(name_pref_map)

    # Calculate 'hichi' (no products)
    logger.info("Calculating customers with no products...")
    available_product_cols = [col for col in product_cols if col in final_df.columns]
    if available_product_cols:
        final_df['hichi'] = (
            final_df[available_product_cols].fillna(0).sum(axis=1) == 0
        ).astype(int)
    else:
        final_df['hichi'] = 0

    # Generate products column
    logger.info("Generating products summary column...")
    available_cols = [c for c in product_name_map if c in final_df.columns]
    if available_cols:
        products_df = final_df[available_cols].copy()
        for col in available_cols:
            products_df[col] = products_df[col].apply(
                lambda x: product_name_map[col] if pd.notna(x) and int(x) == 1 else None
            )
        final_df['products'] = products_df.apply(
            lambda row: ' | '.join(row.dropna()), axis=1
        )
    else:
        final_df['products'] = None

    logger.info("Adding new customer fields...")
    final_df['province'] = None
    final_df['registration_date'] = None
    final_df['first_purchase_date'] = None
    final_df['last_purchase_date'] = None
    final_df['total_purchases'] = None
    final_df['total_amount'] = None
    
    # TODO: Implement score calculation logic based on purchases and customer activities
    final_df['score'] = None
    
    # Calculate loyalty level based on score
    final_df['loyalty_level'] = final_df['score'].apply(calculate_loyalty_level)

    # Replace 0 with None for cleaner output
    for col in product_cols:
        if col in final_df.columns:
            final_df[col] = final_df[col].replace(0, None)
    if 'hichi' in final_df.columns:
        final_df['hichi'] = final_df['hichi'].replace(0, None)
        
    # Replace NaN with None for JSON compatibility
    final_df = final_df.replace({pd.NA: None, float('nan'): None})
    final_df = final_df.where(pd.notna(final_df), None)

    # Generate dashboard statistics
    logger.info("Generating dashboard statistics...")
    total = len(final_df)

    experts_stats = []
    for expert in target_sales_experts:
        count = int((final_df['sp'] == expert).sum())
        experts_stats.append({
            'name': expert,
            'count': count,
            'percentage': round(count / total * 100, 1) if total > 0 else 0
        })
    logger.info(f"Sales experts stats calculated for {len(experts_stats)} experts")

    products_stats = []
    for col, label in product_name_map.items():
        if col in final_df.columns:
            count = int(final_df[col].notna().sum())
            products_stats.append({'product': label, 'count': count})
    products_stats.sort(key=lambda x: x['count'], reverse=True)
    logger.info(f"Product stats calculated for {len(products_stats)} products")

    hichi_count = int(final_df['hichi'].notna().sum())
    logger.info(f"Customers with no products: {hichi_count}")

    # Reorder columns
    desired_order = [
        'numberr', 'name', 'sp', 'province',
        'registration_date', 'first_purchase_date', 'last_purchase_date',
        'total_purchases', 'total_amount',
        'chini', 'dakheli', 'zaban', 'book', 'carman', 'azmoon', 'ghabooli', 'garage',
        'hoz', 'kia', 'milyarder', 'gds-tuts', 'gds', 'tpms-tuts', 'zed', 'kmc', 'carmap', 'eps',
        'hichi', 'products', 'description', 'score', 'loyalty_level'
    ]

    existing_cols = [c for c in desired_order if c in final_df.columns]
    final_df = final_df[existing_cols]

    records = final_df.where(pd.notna(final_df), None).to_dict(orient='records')
    logger.info(f"Processing completed successfully. Total records: {total}")

    return {
        'total': total,
        'hichi_count': hichi_count,
        'experts_stats': experts_stats,
        'products_stats': products_stats,
        'records': records,
        'columns': existing_cols,
        'final_df': final_df
    }
