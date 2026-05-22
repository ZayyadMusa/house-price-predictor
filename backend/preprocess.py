import pandas as pd
import numpy as np

# annual property appreciation rates based on Nigerian real estate trends (2019-2024)
CITY_APPRECIATION = {
    "Abuja": 0.13,         # ~13% per year - capital city, high demand
    "Port Harcourt": 0.10  # ~10% per year - oil city, steady growth
}

CITIES = list(CITY_APPRECIATION.keys())

PROPERTY_TYPES = [
    "Detached Duplex",
    "Semi-Detached Duplex",
    "Terraced Duplex",
    "Detached Bungalow",
    "Semi-Detached Bungalow",
    "Flat / Apartment",
    "Mini Flat",
    "Penthouse",
]


def load_and_clean(filepath: str) -> pd.DataFrame:
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # filter to just Abuja (FCT) and Port Harcourt (Rivers state)
    state_map = {"fct": "Abuja", "abuja": "Abuja", "rivers": "Port Harcourt"}
    df["state"] = df["state"].str.strip().str.lower()
    df = df[df["state"].isin(state_map.keys())].copy()
    df["city"] = df["state"].map(state_map)

    df = df.dropna(subset=["price", "bedrooms", "bathrooms"])

    # remove obvious bad data - anything below 500k or above 5bn naira
    df = df[(df["price"] >= 500_000) & (df["price"] <= 5_000_000_000)]

    df["bedrooms"] = df["bedrooms"].clip(1, 10)
    df["bathrooms"] = df["bathrooms"].clip(1, 10)

    for col in ["toilets", "parking_space"]:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    df["property_type"] = df["title"].str.strip() if "title" in df.columns else "Flat / Apartment"

    return df


def get_features(df: pd.DataFrame):
    cols = ["bedrooms", "bathrooms", "city", "property_type"]

    for optional in ["toilets", "parking_space"]:
        if optional in df.columns:
            cols.append(optional)

    X = df[cols].copy()
    y = np.log1p(df["price"])  # log transform so extreme prices don't skew the model

    return X, y, cols
