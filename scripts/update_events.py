import urllib.request, json, re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ICS_URL = "https://calendar.google.com/calendar/ical/thamesclub.nl%40gmail.com/public/basic.ics"
TZ = ZoneInfo("America/New_York")

raw = urllib.request.urlopen(ICS_URL).read().decode("utf-8", errors="replace")

events = []
blocks = raw.split("BEGIN:VEVENT")[1:]

def clean(s):
    return re.sub(r"\\n|\\,", lambda m: "\n" if m.group(0)=="\\n" else ",", s).strip()

for b in blocks:
    title = re.search(r"SUMMARY:(.*)", b)
    start = re.search(r"DTSTART(?:;[^:]*)?:(.*)", b)
    desc = re.search(r"DESCRIPTION:(.*)", b)

    if not title or not start:
        continue

    ds = start.group(1).strip()
    try:
        if len(ds) == 8:
            dt = datetime.strptime(ds, "%Y%m%d").replace(tzinfo=TZ)
        else:
            dt = datetime.strptime(ds.replace("Z",""), "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc).astimezone(TZ)
    except:
        continue

    if dt.date() >= datetime.now(TZ).date():
        events.append({
            "title": clean(title.group(1)),
            "date": dt.strftime("%A, %B %-d, %Y") if hasattr(dt, "strftime") else dt.isoformat(),
            "time": dt.strftime("%-I:%M %p"),
            "description": clean(desc.group(1)) if desc else ""
        })

events.sort(key=lambda e: e["date"] + e["time"])

out = {
    "lastUpdated": datetime.now(TZ).strftime("%B %d, %Y at %I:%M %p"),
    "events": events
}

with open("events.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
