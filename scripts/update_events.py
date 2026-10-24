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

    if today <= dt.date() <= limit:
        events.append({
            "audience": "public",
            "public_approved": True,
            "title": re.sub(r"^\[PUBLIC\]\s*", "", title.group(1), flags=re.I).replace("\\,", ",").strip(),
            "date": dt.strftime("%Y-%m-%d"),
            "displayDate": dt.strftime("%A, %B %d, %Y").replace(" 0", " "),
            "time": dt.strftime("%I:%M %p").lstrip("0"),
            "description": ""
        })

events.sort(key=lambda e: (e["date"], e["time"]))

with open("events.json", "w", encoding="utf-8") as f:
    json.dump(events, f, indent=2, ensure_ascii=False)

