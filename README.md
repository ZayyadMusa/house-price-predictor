# Nigeria House Price Predictor

I built this as part of my MSc AI portfolio. The idea came from actually living between Abuja and Port Harcourt and having no real way to estimate what a property is worth or whether it's a good investment. Most tools online are either too generic or don't cover Nigeria at all, so I built one that does.

You enter the details of a property — city, type, bedrooms, bathrooms — and it gives you an estimated buy price based on real Nigerian listing data, plus a projected sell value for each of the next 5 years so you can see whether the investment makes sense.

---

## What it does

- Predicts the current market price of a house in **Abuja** or **Port Harcourt**
- Shows a **10-year sell projection** with expected profit and ROI
- Plots a chart so you can see how the value grows year by year
- Built on a dataset of real Nigerian property listings from PropertyPro.ng

---

## How it works

The model is XGBoost trained on Nigerian house listing data. The features it uses are city, property type, number of bedrooms, bathrooms, toilets and parking spaces.

For the 5-year projection I apply historical annual appreciation rates:
- **Abuja** — ~13% per year (capital city, demand is high)
- **Port Harcourt** — ~10% per year (oil city, steady growth)

These rates are based on Nigerian real estate market trends from 2019–2024. The projection is clearly labelled as an estimate, not a guarantee.

---

## Getting the dataset

The model trains on Nigerian property listing data. Download it from Kaggle:

1. Go to [kaggle.com/datasets/abdullahiyunus/nigeria-houses-dataset](https://www.kaggle.com/datasets/abdullahiyunus/nigeria-houses-dataset)
2. Download the CSV file
3. Rename it to `nigeria_houses.csv`
4. Place it in `backend/data/`

---

## How to run it

**Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Train the model** (only needed once):
```bash
python train.py
```

It will print the R² score and mean price error so you know how accurate it is.

**Start the API:**
```bash
python -m uvicorn main:app --reload
```

**Open the app:**

Open `frontend/index.html` in your browser. The dropdowns load from the API automatically.

---

## Project structure

```
house-price-predictor/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── train.py         # model training
│   ├── predict.py       # price + projection logic
│   ├── preprocess.py    # data cleaning
│   ├── data/            # put the dataset here (not in git)
│   └── saved_model/     # trained model files (not in git)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md
```

---

## What I learned

This project taught me more about feature engineering than anything else. Nigerian property prices vary massively by location — a 3-bedroom flat in Maitama is nowhere near the same price as one in Lugbe, even though the features look identical to a model that only sees "Abuja". Location granularity matters a lot and is something I'd improve with more detailed neighbourhood-level data.

The XGBoost model handles the non-linear relationships between features well, which is why I chose it over a simple linear regression.
