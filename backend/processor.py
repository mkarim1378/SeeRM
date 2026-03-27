import pandas as pd
import re
from typing import Optional

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

def process_excel(file_path: str) -> dict:
    df = pd.read_excel(file_path)

    df['numberr'] = df['numberr'].apply(clean_phone_number)
    df.dropna(subset=['numberr'], inplace=True)
    df['__original_order'] = range(len(df))

    for col in product_cols:
        if col in df.columns:
            numeric_col = pd.to_numeric(df[col], errors='coerce').fillna(0)
            df[col] = (numeric_col > 0).astype(int)

    df['__is_valid_name'] = df['name'].apply(is_valid_name)

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

    aggregation_logic = {col: 'max' for col in product_cols if col in df.columns}
    aggregation_logic['hichi'] = 'max'
    if 'description' in df.columns:
        aggregation_logic['description'] = agg_description

    final_df = df.groupby('numberr').agg(aggregation_logic).reset_index()
    order_map = df.drop_duplicates('numberr')[['numberr', '__original_order']]
    final_df = (
        final_df.merge(order_map, on='numberr', how='left')
        .sort_values('__original_order')
        .drop(columns='__original_order')
    )

    sp_map = (
        df.sort_values('__original_order')
          .dropna(subset=['sp'])
          .drop_duplicates('numberr', keep='first')
          .set_index('numberr')['sp']
    )

    final_df['sp'] = final_df['numberr'].map(sp_map)
    final_df['name'] = final_df['numberr'].map(name_pref_map)

    available_product_cols = [col for col in product_cols if col in final_df.columns]
    if available_product_cols:
        final_df['hichi'] = (
            final_df[available_product_cols].fillna(0).sum(axis=1) == 0
        ).astype(int)
    else:
        final_df['hichi'] = 0

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

    for col in product_cols:
        if col in final_df.columns:
            final_df[col] = final_df[col].replace(0, None)
    if 'hichi' in final_df.columns:
        final_df['hichi'] = final_df['hichi'].replace(0, None)

    # ---- آمار برای داشبورد ----
    total = len(final_df)

    experts_stats = []
    for expert in target_sales_experts:
        count = int((final_df['sp'] == expert).sum())
        experts_stats.append({
            'name': expert,
            'count': count,
            'percentage': round(count / total * 100, 1) if total > 0 else 0
        })

    products_stats = []
    for col, label in product_name_map.items():
        if col in final_df.columns:
            count = int(final_df[col].notna().sum())
            products_stats.append({'product': label, 'count': count})
    products_stats.sort(key=lambda x: x['count'], reverse=True)

    hichi_count = int(final_df['hichi'].notna().sum())

    desired_order = [
        'numberr','name','sp',
        'chini','dakheli','zaban','book','carman','azmoon','ghabooli','garage',
        'hoz','kia','milyarder','gds-tuts','gds','tpms-tuts','zed','kmc','carmap','eps',
        'hichi','products'
    ]
    existing_cols = [c for c in desired_order if c in final_df.columns]
    final_df = final_df[existing_cols]

    records = final_df.where(pd.notna(final_df), None).to_dict(orient='records')

    return {
        'total': total,
        'hichi_count': hichi_count,
        'experts_stats': experts_stats,
        'products_stats': products_stats,
        'records': records,
        'columns': existing_cols,
        'final_df': final_df
    }
