import numpy as np
import pandas as pd
from preprocess import CITY_APPRECIATION, CITY_AREAS


def predict_price(model, encoder, feature_cols: list, input_data: dict) -> dict:
    area = input_data.pop("area", None)

    df = pd.DataFrame([input_data])
    cat_cols = ["city", "property_type"]
    df[cat_cols] = encoder.transform(df[cat_cols])
    df = df[feature_cols]

    log_price = model.predict(df)[0]
    base_price = float(np.expm1(log_price))

    # apply area multiplier - Maitama costs more than Lugbe, GRA more than Diobu
    city = input_data["city"]
    multiplier = 1.0
    if area and city in CITY_AREAS and area in CITY_AREAS[city]:
        multiplier = CITY_AREAS[city][area]

    current_price = base_price * multiplier

    appreciation = CITY_APPRECIATION.get(city, 0.10)

    projections = []
    for year in range(1, 11):
        projected = current_price * ((1 + appreciation) ** year)
        profit = projected - current_price
        projections.append({
            "year": year,
            "projected_price": round(projected),
            "profit": round(profit),
            "roi_percent": round((profit / current_price) * 100, 1),
        })

    return {
        "buy_price": round(current_price),
        "city": city,
        "area": area or "General",
        "appreciation_rate_used": f"{appreciation * 100:.0f}% per year",
        "projections": projections,
    }
