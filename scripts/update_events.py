import urllib.request, json, re
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

ICS_URL = "https://calendar.google.com/calendar/ical/thamesclub.nl%40gmail.com/public/basic.ics"
TZ = ZoneInfo("America/New_York")

today = datetime.now(TZ).date()
limit = today + timedelta(days=30)

raw = urllib.request.urlopen(ICS_URL).read().decode("utf-8", errors="replace")
events = []

for block in re.sub(r'\r?\n[ \t]', '', raw).split("BEGIN:VEVENT")[1:]:
    title = re.search(r"SUMMARY:(.*)", block)
    start = re.search(r"DTSTART(?:;[^:]*)?:(.*)", block)
    desc = re.search(r"DESCRIPTION:(.*)", block)

    if not title or not start or re.search(r"^STATUS:CANCELLED\s*$", block, re.M):
        continue


    ds = start.group(1).strip()

    try:
        if len(ds) == 8:
            dt = datetime.strptime(ds, "%Y%m%d").replace(tzinfo=TZ)
        else:
            dt = datetime.strptime(ds.replace("Z",""), "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc).astimezone(TZ)
    except Exception:
        continue

    event_title = re.sub(r"^\[PUBLIC\]\s*", "", title.group(1), flags=re.I).replace("\\,", ",").strip()
    # The Club confirmed 6 p.m. for this occurrence after the calendar was entered.
    if event_title == "Hanukkah Menorah Lighting" and dt.date().isoformat() == "2026-12-09":
        dt = dt.replace(hour=18, minute=0, second=0)

    if today <= dt.date() <= limit:
        events.append({
            "audience": "public",
            "public_approved": True,
            "title": event_title,
            "date": dt.strftime("%Y-%m-%d"),
            "displayDate": dt.strftime("%A, %B %d, %Y").replace(" 0", " "),
            "time": dt.strftime("%I:%M %p").lstrip("0"),
            "description": ""
        })

events.sort(key=lambda e: (e["date"], e["time"]))

with open("events.json", "w", encoding="utf-8") as f:
    json.dump(events, f, indent=2, ensure_ascii=False)

