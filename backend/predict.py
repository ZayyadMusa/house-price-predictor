import numpy as np
import pandas as pd
from preprocess import CITY_APPRECIATION


def predict_price(model, encoder, feature_cols: list, input_data: dict) -> dict:
    df = pd.DataFrame([input_data])

    cat_cols = ["city", "property_type"]
    df[cat_cols] = encoder.transform(df[cat_cols])

    # make sure columns are in the same order the model was trained on
    df = df[feature_cols]

    log_price = model.predict(df)[0]
    current_price = float(np.expm1(log_price))

    city = input_data["city"]
    appreciation = CITY_APPRECIATION.get(city, 0.10)

    # project the sell value for each of the next 5 years
    projections = []
    for year in range(1, 6):
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
        "appreciation_rate_used": f"{appreciation * 100:.0f}% per year",
        "projections": projections,
    }
