"""Refresh the public calendar from the live schedule; never modify league data."""
import calendar
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.request
from zoneinfo import ZoneInfo
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("Calendar", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("CalendarBold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'downloads/bowling-nights-2026-27.pdf'
STATE = ROOT / 'downloads/bowling-nights-2026-27.source.json'
URL = 'https://duckpin-manager-production.up.railway.app/api/data'
HOLIDAYS = {'2026-10-12':'Columbus', '2026-10-31':'Halloween','2026-11-03':'Election','2026-11-11':'Veterans','2026-11-19':'Club event','2026-11-26':'Thanksgiving','2026-12-04':'Hanukkah begins','2026-12-12':'Hanukkah ends','2026-12-25':'Christmas','2027-01-01':'New Year','2027-01-18':'MLK Day','2027-02-15':'Presidents','2027-03-17':'St Patrick','2027-03-22':'Purim begins','2027-03-23':'Purim','2027-03-28':'Easter','2027-04-21':'Passover begins','2027-04-29':'Passover ends','2027-05-09':"Mother's Day",'2027-05-31':'Memorial Day'}

def normalize(data):
    if data.get('season', {}).get('name') != '2026-27':
        raise ValueError('Expected 2026-27 season; retain existing PDF')
    rows = data.get('schedule')
    if not isinstance(rows, list) or not rows:
        raise ValueError('Missing/empty schedule; retain existing PDF')
    clean=[]; ids=set()
    for r in rows:
        date=dt.date.fromisoformat(r['date'])
        if r['id'] in ids or r['league'] not in ('mens','doubles') or not dt.date(2026,7,1)<=date<=dt.date(2027,8,31):
            raise ValueError('Invalid schedule row')
        ids.add(r['id'])
        clean.append({k:r[k] for k in ('id','date','league','homeTeam','awayTeam')})
    return sorted(clean,key=lambda r:(r['date'],r['league'],r['id']))

def months_for(rows):
    lo=min(dt.date(2026,10,1),dt.date.fromisoformat(rows[0]['date']).replace(day=1))
    hi=max(dt.date(2027,5,1),dt.date.fromisoformat(rows[-1]['date']).replace(day=1))
    out=[]
    while lo<=hi:
        out.append((lo.year,lo.month));lo=(lo.replace(day=28)+dt.timedelta(days=4)).replace(day=1)
    return out

def build(rows, target, stamp):
    nights={}
    for r in rows:nights.setdefault(r['date'],[]).append(r)
    months=months_for(rows); buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=(792,612),invariant=1)
    navy='#183950';teal='#087386';gold='#B97711'
    def text(x,y,t,size=8,color=navy,bold=False):
        c.setFillColor(HexColor(color));c.setFont('CalendarBold' if bold else 'Calendar',size);c.drawString(x,612-y,t)
    for offset in range(0,len(months),4):
        c.setFillColor(HexColor(navy));c.rect(0,535,792,77,fill=1,stroke=0)
        text(36,39,"The bar is open, it's a Bowling Night!",20,'#FFFFFF',True)
        text(36,59,'Tues & Weds: bar open | Thursdays: bar and dinner | 2026-27 season',9,'#FFFFFF')
        for j,(yr,mo) in enumerate(months[offset:offset+4]):
            left=34+(j%2)*370;top=92+(j//2)*231;cw=328/7;ch=154/6
            c.setFillColor(HexColor(navy));c.roundRect(left,612-top-34,352,34,8,fill=1,stroke=0)
            text(left+12,top+23,f'{calendar.month_name[mo].upper()} {yr}',14,'#FFFFFF',True)
            for col,label in enumerate(['MON','TUE','WED','THU','FRI','SAT','SUN']):text(left+17+col*cw,top+46,label,6.5,bold=True)
            weeks=calendar.monthcalendar(yr,mo)
            for row in range(6):
                for col in range(7):
                    day=weeks[row][col] if row<len(weeks) else 0;x=left+12+col*cw;y=top+52+row*ch
                    key=f'{yr}-{mo:02}-{day:02}';games=nights.get(key,[])
                    c.setFillColor(HexColor('#E3F2F4' if games else '#FFFFFF' if day else '#F7F9FB'))
                    c.setStrokeColor(HexColor('#D2DDE5'));c.setLineWidth(.4);c.rect(x,612-y-ch,cw,ch,fill=1,stroke=1)
                    if not day:continue
                    text(x+3,y+8,str(day),7,bold=True)
                    if games:
                        leagues={g['league'] for g in games}
                        label='MEN+DBLS' if len(leagues)>1 else 'MEN' if 'mens' in leagues else 'DBLS'
                        if len(games)>1:label=f'{len(games)} '+label
                        color=teal if 'mens' in leagues else gold
                        text(x+3,y+15,label,6.3,color,True)
                        dow=dt.date(yr,mo,day).weekday()
                        service='BAR+DIN' if dow==3 else 'BAR' if dow in (1,2) else 'CHECK DINING'
                        text(x+3,y+23,service,5.5,color,True)
                    holiday=HOLIDAYS.get(key)
                    if holiday:
                        # Put annotations above the cell when a bowling entry occupies it.
                        text(x+14 if games else x+3,y+7 if games else y+23,holiday,4.3 if games else 5,'#95401E')
        text(36,567,'MEN + BAR Tuesday / Wednesday',8,teal,True)
        text(292,567,'DBLS + BAR & DINNER Thursday',8,gold,True)
        text(553,567,'Other days: confirm dining with club',7,navy)
        text(36,588,'Updated '+stamp+' from the live bowling schedule. Download again for the latest dates.',7.5)
        text(731,588,f'{offset//4+2}/{(len(months)+3)//4+1}',7)
        c.showPage()
    c.save()
    writer=PdfWriter();writer.add_page(PdfReader(OUTPUT).pages[0])
    for page in PdfReader(buf).pages:writer.add_page(page)
    writer.add_metadata({'/Title':'Thames Club Bowling Nights 2026-27','/Subject':'Automatically synchronized with live bowling schedule'})
    with open(target,'wb') as f:writer.write(f)

def main():
    with urllib.request.urlopen(URL,timeout=45) as response:data=json.load(response)
    rows=normalize(data)
    digest=hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()
    previous=json.loads(STATE.read_text()) if STATE.exists() else {}
    if previous.get('schedule_sha256')==digest and previous.get('generator_version')==1:
        print('Schedule unchanged; no publication needed');return
    stamp=dt.datetime.now(ZoneInfo('America/New_York')).strftime('%B %d, %Y %I:%M %p ET')
    tmp=OUTPUT.with_suffix('.tmp.pdf')
    build(rows,tmp,stamp)
    if len(PdfReader(tmp).pages)<3:raise ValueError('Incomplete generated PDF')
    os.replace(tmp,OUTPUT)
    STATE.write_text(json.dumps({'generator_version':1,'schedule_sha256':digest,'updated':stamp,'match_count':len(rows),'bowling_nights':len({r['date'] for r in rows}),'source':URL},indent=2)+'\n')
    print('Calendar updated:',len(rows),'matches')
if __name__=='__main__':main()
