import argparse
import os
import sqlite3
import statistics
from collections import defaultdict


def ms_to_minutes(ms: float) -> float:
    return ms / 1000.0 / 60.0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compute regression time savings from Prisma SQLite DB.\n"
            "Savings is estimated as: sum(TestCaseExecution.duration) - TestSuiteExecution.duration."
        )
    )
    parser.add_argument(
        "--db",
        default=os.path.join("prisma", "dev.db"),
        help="Path to SQLite DB (default: prisma/dev.db)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="How many recent suite executions to analyze (default: 200)",
    )
    parser.add_argument(
        "--top-suites",
        type=int,
        default=10,
        help="How many suites to show in per-suite summary (default: 10)",
    )
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        raise SystemExit(f"DB not found: {db_path}")

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = {r[0] for r in cur.fetchall()}
    for t in ("TestSuiteExecution", "TestCaseExecution", "TestSuite"):
        if t not in tables:
            raise SystemExit(f"Missing table: {t}")

    cur.execute(
        """
        SELECT e.id, e.suiteId, e.suiteName, e.status, e.startTime, e.duration, s.runMode
        FROM TestSuiteExecution e
        LEFT JOIN TestSuite s ON s.id = e.suiteId
        WHERE e.duration IS NOT NULL AND e.status IN ('completed','failed','stopped')
        ORDER BY e.startTime DESC
        LIMIT ?
        """,
        (args.limit,),
    )
    execs = cur.fetchall()

    rows = []
    for e in execs:
        cur.execute(
            """
            SELECT duration
            FROM TestCaseExecution
            WHERE suiteExecutionId = ? AND duration IS NOT NULL
            """,
            (e["id"],),
        )
        durs = [r[0] for r in cur.fetchall() if r[0] is not None]
        if not durs:
            continue

        serial_est = sum(durs)
        wall = e["duration"]
        savings = serial_est - wall
        ratio = (savings / serial_est) if serial_est else None
        rows.append(
            {
                "executionId": e["id"],
                "suiteId": e["suiteId"],
                "suiteName": e["suiteName"],
                "startTime": e["startTime"],
                "status": e["status"],
                "runMode": e["runMode"],
                "wall_ms": wall,
                "serial_est_ms": serial_est,
                "savings_ms": savings,
                "ratio": ratio,
                "case_count": len(durs),
            }
        )

    if not rows:
        raise SystemExit(
            "No executions found with both suite duration and per-case durations. "
            "Run at least one suite execution first."
        )

    wall_all = [r["wall_ms"] for r in rows]
    serial_all = [r["serial_est_ms"] for r in rows]
    savings_all = [r["savings_ms"] for r in rows]
    ratios = [r["ratio"] for r in rows if r["ratio"] is not None]

    print(f"SAMPLES\t{len(rows)}")
    print(f"AVG_WALL_MIN\t{ms_to_minutes(statistics.mean(wall_all)):.2f}")
    print(f"AVG_SERIAL_EST_MIN\t{ms_to_minutes(statistics.mean(serial_all)):.2f}")
    print(f"AVG_SAVINGS_MIN\t{ms_to_minutes(statistics.mean(savings_all)):.2f}")
    print(f"MEDIAN_SAVINGS_MIN\t{ms_to_minutes(statistics.median(savings_all)):.2f}")
    print(f"AVG_SAVINGS_PCT\t{statistics.mean(ratios) * 100.0:.1f}")
    print(f"MEDIAN_SAVINGS_PCT\t{statistics.median(ratios) * 100.0:.1f}")

    by_suite: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_suite[r["suiteId"]].append(r)

    print("TOP_SUITES")
    top = sorted(
        ((len(v), sid, v[0]["suiteName"]) for sid, v in by_suite.items()),
        reverse=True,
    )[: args.top_suites]

    for cnt, sid, name in top:
        v = by_suite[sid]
        avg_wall = ms_to_minutes(statistics.mean([x["wall_ms"] for x in v]))
        avg_serial = ms_to_minutes(statistics.mean([x["serial_est_ms"] for x in v]))
        avg_save = ms_to_minutes(statistics.mean([x["savings_ms"] for x in v]))
        avg_pct = (
            statistics.mean([x["ratio"] for x in v if x["ratio"] is not None]) * 100.0
        )
        print(
            f"{name}\t{sid}\tsamples={cnt}\tavg_wall_min={avg_wall:.2f}"
            f"\tavg_serial_min={avg_serial:.2f}\tavg_save_min={avg_save:.2f}"
            f"\tavg_save_pct={avg_pct:.1f}"
        )

    rows.sort(key=lambda r: r["startTime"], reverse=True)
    ex = rows[0]
    print("EXAMPLE")
    print(f"suiteName\t{ex['suiteName']}")
    print(f"executionId\t{ex['executionId']}")
    print(f"status\t{ex['status']}")
    print(f"runMode\t{ex['runMode']}")
    print(f"case_count\t{ex['case_count']}")
    print(f"wall_min\t{ms_to_minutes(ex['wall_ms']):.2f}")
    print(f"serial_est_min\t{ms_to_minutes(ex['serial_est_ms']):.2f}")
    print(f"savings_min\t{ms_to_minutes(ex['savings_ms']):.2f}")
    print(f"savings_pct\t{(ex['ratio'] * 100.0) if ex['ratio'] is not None else 0.0:.1f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

