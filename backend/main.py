# FastAPI backend - handles price prediction requests
# start with: python -m uvicorn main:app --reload
# interactive docs at: http://127.0.0.1:8000/docs

import os
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from preprocess import CITIES, PROPERTY_TYPES, CITY_AREAS
from predict import predict_price

app = FastAPI(title="Nigeria House Price Predictor", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_model")
_model = None
_encoder = None
_feature_cols = None


def get_model():
    global _model, _encoder, _feature_cols
    if _model is None:
        for f in ["model.pkl", "encoder.pkl", "feature_cols.pkl"]:
            if not os.path.exists(os.path.join(SAVE_DIR, f)):
                raise FileNotFoundError("Model not found - run train.py first")
        _model = joblib.load(os.path.join(SAVE_DIR, "model.pkl"))
        _encoder = joblib.load(os.path.join(SAVE_DIR, "encoder.pkl"))
        _feature_cols = joblib.load(os.path.join(SAVE_DIR, "feature_cols.pkl"))
    return _model, _encoder, _feature_cols


class HouseInput(BaseModel):
    city: str
    area: Optional[str] = None
    property_type: str
    bedrooms: int
    bathrooms: int
    toilets: int = 1
    parking_space: int = 1


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/options")
def options():
    # frontend uses this to populate the dropdowns
    return {
        "cities": CITIES,
        "property_types": PROPERTY_TYPES,
        "areas": CITY_AREAS,
    }


@app.post("/predict")
def predict(input: HouseInput):
    if input.city not in CITIES:
        raise HTTPException(status_code=400, detail=f"City must be one of {CITIES}")
    if input.property_type not in PROPERTY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid property type")
    if not (1 <= input.bedrooms <= 10):
        raise HTTPException(status_code=400, detail="Bedrooms must be between 1 and 10")

    try:
        model, encoder, feature_cols = get_model()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    result = predict_price(model, encoder, feature_cols, input.model_dump())
    return result
