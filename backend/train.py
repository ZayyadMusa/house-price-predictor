# trains an XGBoost model on Nigeria house price data (Abuja + Port Harcourt)
# run once before starting the server: python train.py

import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import mean_absolute_error, r2_score

from preprocess import load_and_clean, get_features

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "nigeria_houses.csv")
SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_model")


def train():
    print("Loading dataset...")
    df = load_and_clean(DATA_PATH)
    print(f"  Abuja: {len(df[df['city'] == 'Abuja'])} listings")
    print(f"  Port Harcourt: {len(df[df['city'] == 'Port Harcourt'])} listings")

    X, y, feature_cols = get_features(df)

    # encode categorical columns - XGBoost needs numbers not strings
    cat_cols = ["city", "property_type"]
    encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    X[cat_cols] = encoder.fit_transform(X[cat_cols])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training XGBoost model...")
    model = XGBRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # evaluate - convert back from log scale for readable numbers
    preds = model.predict(X_test)
    mae = mean_absolute_error(np.expm1(y_test), np.expm1(preds))
    r2 = r2_score(y_test, preds)

    print(f"\nTest results:")
    print(f"  R² score:  {r2:.4f}  (1.0 is perfect)")
    print(f"  Mean error: ₦{mae:,.0f}")

    os.makedirs(SAVE_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(SAVE_DIR, "model.pkl"))
    joblib.dump(encoder, os.path.join(SAVE_DIR, "encoder.pkl"))
    joblib.dump(feature_cols, os.path.join(SAVE_DIR, "feature_cols.pkl"))
    print(f"\nSaved to {SAVE_DIR}/")
    print("Done - start the server with: python -m uvicorn main:app --reload")


if __name__ == "__main__":
    train()
