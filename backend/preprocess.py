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

# area multipliers relative to the city average
# e.g. Maitama is 2.5x more expensive than an average Abuja listing
CITY_AREAS = {
    "Abuja": {
        "Maitama":                   2.5,
        "Asokoro":                   2.2,
        "Wuse 2":                    1.8,
        "Guzape":                    1.7,
        "Jabi":                      1.6,
        "Katampe":                   1.5,
        "Mabushi":                   1.4,
        "Utako":                     1.3,
        "Life Camp":                 1.3,
        "Kado":                      1.25,
        "Wuye":                      1.2,
        "Gwarinpa":                  1.2,
        "Jahi":                      1.15,
        "Central Business District": 1.1,
        "Wuse":                      1.0,
        "Garki":                     1.0,
        "Apo":                       0.95,
        "Gudu":                      0.9,
        "Durumi":                    0.85,
        "Lokogoma":                  0.8,
        "Kaura":                     0.8,
        "Dawaki":                    0.75,
        "Kubwa":                     0.7,
        "Lugbe":                     0.65,
        "Galadimawa":                0.6,
        "Karu":                      0.6,
        "Karmo":                     0.58,
        "Nyanya":                    0.55,
        "Gwagwalada":                0.5,
        "Kurudu":                    0.5,
    },
    "Port Harcourt": {
        "GRA Phase 1":    2.3,
        "GRA Phase 2":    2.0,
        "Old GRA":        1.8,
        "Peter Odili":    1.5,
        "D-Line":         1.3,
        "Woji":           1.25,
        "Elelenwo":       1.2,
        "Rumuola":        1.2,
        "Eliozu":         1.1,
        "Rumuigbo":       1.05,
        "Trans Amadi":    1.0,
        "Rumuodara":      0.95,
        "Rumuokwuta":     0.9,
        "Ada George":     0.85,
        "Ogbunabali":     0.85,
        "Borokiri":       0.8,
        "Diobu":          0.8,
        "Rumuepirikom":   0.75,
        "Mile 1":         0.75,
        "Choba":          0.72,
        "Mile 3":         0.7,
        "Alakahia":       0.68,
        "Rukpokwu":       0.65,
        "Igwuruta":       0.6,
        "Oyigbo":         0.55,
    },
}


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
