import polars as pl
import numpy as np
from pygam import LogisticGAM, s, te
from pygam.terms import TermList

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_avg_grid(df: pl.DataFrame):
    df = df.with_columns(
        pl.col.events.is_in(["single", "double", "triple", "home_run"])
        .cast(pl.UInt8)
        .alias("hit")
    )

    X = df[["plate_x", "plate_z"]].to_numpy()
    y = df["hit"].to_numpy()

    terms = TermList(te(0, 1))
    gam = LogisticGAM(terms=terms).fit(X, y)  # type: ignore

    x, z = np.linspace(-1.5, 1.5, 50), np.linspace(0.3, 5.0, 50)

    x_grid, z_grid = np.meshgrid(x, z)

    grid_points = np.column_stack([x_grid.ravel(), z_grid.ravel()])

    avgs = gam.predict_mu(grid_points)

    avg_grid = [
        {"x": x_val, "z": z_val, "avg": avg}
        for x_val, z_val, avg in zip(x_grid.ravel(), z_grid.ravel(), avgs)
        # if -1.2 <= x_val <= 1.2 and 0.8 <= z_val <= 4.2
    ]

    return avg_grid, x.tolist(), z.tolist()


@app.get("/avg/")
async def get_avg(last: str, first: str):
    df = pl.read_csv(f"./data/{last}_{first}.csv")
    df = df.drop_nulls(subset=["events", "plate_x", "plate_z"])
    df = df.filter((pl.col.plate_x <= 1.5) & (pl.col.plate_x >= -1.5))
    df = df.filter((pl.col.plate_z <= 5.0) & (pl.col.plate_z >= 0.3))

    avg_grid, x, z = get_avg_grid(df)

    return {"probGrid": avg_grid, "x": x, "z": z}
