import polars as pl
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calc_woba(plate_x: pl.Series, plate_z: pl.Series, events: pl.Series):
    # 2025 wOBA weights from: https://www.fangraphs.com/tools/guts
    event_weights = {
        "walk": 0.691,
        "hit_by_pitch": 0.722,
        "single": 0.882,
        "double": 1.252,
        "triple": 1.584,
        "home_run": 2.037,
    }

    df = pl.DataFrame({"plate_x": plate_x, "plate_z": plate_z, "events": events})

    df = df.with_columns(
        # numerator
        pl.when(pl.col.events == "walk")
        .then(event_weights["walk"])
        .otherwise(0)
        .alias("w_uBB"),
        pl.when(pl.col.events == "hit_by_pitch")
        .then(event_weights["hit_by_pitch"])
        .otherwise(0)
        .alias("w_HBP"),
        pl.when(pl.col.events == "single")
        .then(event_weights["single"])
        .otherwise(0)
        .alias("w_1B"),
        pl.when(pl.col.events == "double")
        .then(event_weights["double"])
        .otherwise(0)
        .alias("w_2B"),
        pl.when(pl.col.events == "triple")
        .then(event_weights["triple"])
        .otherwise(0)
        .alias("w_3B"),
        pl.when(pl.col.events == "home_run")
        .then(event_weights["home_run"])
        .otherwise(0)
        .alias("w_HR"),
        # denominator
        ~pl.col.events.is_in(
            ["walk", "intent_walk", "hit_by_pitch", "sac_fly", "sac_bunt"]
        ).alias("AB"),
        (pl.col.events == "walk").alias("uBB"),
        (pl.col.events == "sac_fly").alias("SF"),
        (pl.col.events == "hit_by_pitch").alias("HBP"),
    )

    res = df.group_by(["plate_x", "plate_z"]).agg(
        (
            (
                pl.col.w_uBB.sum()
                + pl.col.w_HBP.sum()
                + pl.col.w_1B.sum()
                + pl.col.w_2B.sum()
                + pl.col.w_3B.sum()
                + pl.col.w_HR.sum()
            )
            / (pl.col.AB.sum() + pl.col.uBB.sum() + pl.col.SF.sum() + pl.col.HBP.sum())
        ).alias("woba")
    )

    return res


@app.get("/woba/ohtani")
async def get_woba_ohtani():
    df = pl.read_csv("./data/ohtani_shohei.csv")
    df = df.drop_nulls(subset=["events", "plate_x", "plate_z"])
    df = df.filter((pl.col.plate_x <= 1.5) & (pl.col.plate_x >= -1.5))
    df = df.filter((pl.col.plate_z <= 5.0) & (pl.col.plate_z >= 0.3))

    plate_x = df["plate_x"]
    plate_z = df["plate_z"]
    events = df["events"]

    res = calc_woba(plate_x=plate_x, plate_z=plate_z, events=events)

    return res.to_dicts()
