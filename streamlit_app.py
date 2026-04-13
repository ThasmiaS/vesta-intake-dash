from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

STAGES = ["visited", "started", "personal_info", "document_upload", "review", "completed"]
CSV_PATH = Path("data/mock_intake.csv")


@st.cache_data
def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["time_spent_seconds"] = pd.to_numeric(df["time_spent_seconds"], errors="coerce")
    return df


def stage_user_counts(df: pd.DataFrame, intake_type: str) -> pd.Series:
    filtered = df if intake_type == "all" else df[df["intake_type"] == intake_type]
    counts = filtered.groupby("stage")["user_id"].nunique().reindex(STAGES, fill_value=0)
    return counts


def conversion_df(stage_counts: pd.Series) -> pd.DataFrame:
    rows = []
    for i in range(len(STAGES) - 1):
        frm = STAGES[i]
        to = STAGES[i + 1]
        frm_count = int(stage_counts.loc[frm])
        to_count = int(stage_counts.loc[to])
        rate = 0.0 if frm_count == 0 else (to_count / frm_count) * 100
        rows.append(
            {
                "from_stage": frm,
                "to_stage": to,
                "from_count": frm_count,
                "to_count": to_count,
                "conversion_pct": round(rate, 1),
            }
        )
    return pd.DataFrame(rows)


def median_time_df(df: pd.DataFrame, intake_type: str) -> pd.DataFrame:
    filtered = df if intake_type == "all" else df[df["intake_type"] == intake_type]
    med = (
        filtered.groupby("stage")["time_spent_seconds"]
        .median()
        .reindex(STAGES, fill_value=0)
        .reset_index()
        .rename(columns={"time_spent_seconds": "median_seconds"})
    )
    med["median_seconds"] = med["median_seconds"].round(1)
    return med


def main() -> None:
    st.set_page_config(page_title="Vesta Intake Dashboard", layout="wide")
    st.title("Vesta Intake Funnel Dashboard")
    st.caption("Data source: data/mock_intake.csv")

    if not CSV_PATH.exists():
        st.error(f"Could not find CSV at: {CSV_PATH}")
        return

    df = load_data(CSV_PATH)

    intake_options = ["all"] + sorted(df["intake_type"].dropna().unique().tolist())
    selected_type = st.selectbox("Filter by intake type", intake_options, index=0)

    stage_counts = stage_user_counts(df, selected_type)
    conv = conversion_df(stage_counts)
    med = median_time_df(df, selected_type)

    total_users = int(stage_counts.loc["visited"])
    completed_users = int(stage_counts.loc["completed"])
    completion_rate = 0.0 if total_users == 0 else (completed_users / total_users) * 100

    k1, k2, k3 = st.columns(3)
    k1.metric("Users at visited", f"{total_users:,}")
    k2.metric("Completed users", f"{completed_users:,}")
    k3.metric("Completion rate", f"{completion_rate:.1f}%")

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Funnel (User Count by Stage)")
        funnel_df = pd.DataFrame({"stage": STAGES, "users": stage_counts.values})
        fig_funnel = px.funnel(funnel_df, y="stage", x="users")
        st.plotly_chart(fig_funnel, use_container_width=True)

    with c2:
        st.subheader("Step Conversion (%)")
        conv["step"] = conv["from_stage"] + " -> " + conv["to_stage"]
        fig_conv = px.bar(conv, x="step", y="conversion_pct", text="conversion_pct", range_y=[0, 100])
        fig_conv.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
        fig_conv.update_layout(yaxis_title="Conversion %", xaxis_title="")
        st.plotly_chart(fig_conv, use_container_width=True)

    st.subheader("Median Time per Stage (seconds)")
    fig_time = px.line(med, x="stage", y="median_seconds", markers=True)
    fig_time.update_layout(yaxis_title="Seconds", xaxis_title="")
    st.plotly_chart(fig_time, use_container_width=True)

    st.subheader("Detailed Tables")
    t1, t2 = st.columns(2)
    with t1:
        st.dataframe(conv, use_container_width=True, hide_index=True)
    with t2:
        st.dataframe(med, use_container_width=True, hide_index=True)


if __name__ == "__main__":
    main()
