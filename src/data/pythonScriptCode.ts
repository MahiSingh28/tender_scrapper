export const PYTHON_REQUIREMENTS_TXT = `# Live public GePNIC scraper\nrequests>=2.32.0\nbeautifulsoup4>=4.12.3\npandas>=2.2.0\nopenpyxl>=3.1.5\n`;

export const COMPLETE_PYTHON_SCRAPER_SCRIPT = `"""
Live Multi-State GePNIC Tender Scraper

This script intentionally does NOT bypass CAPTCHA or reuse stale authenticated
sessions. It reads the public latest-tender tables exposed by each portal,
keeps the HTTP session cookies for immediate detail-page requests, and writes
only records actually returned by the government portal.
"""

from __future__ import annotations

import re
import time
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

STATE_PORTALS = {
    "Maharashtra": "https://mahatenders.gov.in/nicgep/app",
    "Uttar Pradesh": "https://etender.up.nic.in/nicgep/app",
    "Rajasthan": "https://eproc.rajasthan.gov.in/nicgep/app",
    "Tamil Nadu": "https://tntenders.gov.in/nicgep/app",
    "West Bengal": "https://wbtenders.gov.in/nicgep/app",
    "Madhya Pradesh": "https://mptenders.gov.in/nicgep/app",
    "Kerala": "https://etenders.kerala.gov.in/nicgep/app",
    "Punjab": "https://eproc.punjab.gov.in/nicgep/app",
    "Haryana": "https://etenders.hry.nic.in/nicgep/app",
    "Odisha": "https://tendersodisha.gov.in/nicgep/app",
    "Assam": "https://assamtenders.gov.in/nicgep/app",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}


def clean(value: str) -> str:
    return re.sub(r"\\s+", " ", value or "").strip()


def money(value: str) -> float:
    text = clean(value).lower().replace(",", "")
    m = re.search(r"([0-9]+(?:\\.[0-9]+)?)\\s*(crore|cr|lakh|lac|lakhs|million|thousand|k)?", text)
    if not m:
        return 0
    number = float(m.group(1))
    unit = m.group(2) or ""
    multiplier = {
        "crore": 10_000_000, "cr": 10_000_000,
        "lakh": 100_000, "lac": 100_000, "lakhs": 100_000,
        "million": 1_000_000, "thousand": 1_000, "k": 1_000,
    }.get(unit, 1)
    return round(number * multiplier)


def extract_latest(session: requests.Session, state: str, portal: str, limit: int = 10):
    response = session.get(portal, headers=HEADERS, timeout=30)
    response.raise_for_status()
    html = response.text
    if re.search(r"session has timed out|stale session", html, re.I):
        raise RuntimeError(f"{state}: stale session returned by portal")

    soup = BeautifulSoup(html, "html.parser")
    records = []

    for table in soup.find_all("table"):
        header_text = clean(table.find("tr").get_text(" ", strip=True) if table.find("tr") else "").lower()
        if "tender title" not in header_text or "closing date" not in header_text:
            continue

        for row in table.find_all("tr")[1:]:
            cells = [clean(td.get_text(" ", strip=True)) for td in row.find_all("td")]
            link = row.find("a", href=True)
            if not cells or not link:
                continue
            title = clean(link.get_text(" ", strip=True)) or cells[0]
            if not title or title.lower() == "more...":
                continue

            detail_url = urljoin(portal, link["href"])
            records.append({
                "state": state,
                "title": title,
                "tender_reference_number": cells[1] if len(cells) > 1 else "",
                "closing_date": cells[2] if len(cells) > 2 else "",
                "opening_date": cells[3] if len(cells) > 3 else "",
                "detail_url": detail_url,
            })

            if len(records) >= limit:
                return records

    return records


def scrape(states=None, per_state=10):
    states = states or list(STATE_PORTALS)
    rows = []

    for state in states:
        portal = STATE_PORTALS.get(state)
        if not portal:
            continue
        session = requests.Session()
        session.headers.update(HEADERS)
        try:
            found = extract_latest(session, state, portal, per_state)
            print(f"[{state}] {len(found)} live rows")
            rows.extend(found)
        except Exception as exc:
            print(f"[{state}] ERROR: {exc}")
        finally:
            session.close()
        time.sleep(1)

    df = pd.DataFrame(rows).drop_duplicates(subset=["detail_url"], keep="first")
    df.to_csv("live_tenders.csv", index=False, encoding="utf-8-sig")
    df.to_excel("live_tenders.xlsx", index=False)
    print(f"Saved {len(df)} real portal records")
    return df


if __name__ == "__main__":
    scrape(["Maharashtra", "Uttar Pradesh", "Rajasthan"], per_state=10)
`;
