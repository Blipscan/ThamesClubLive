import copy, io, json, tempfile, unittest
from pathlib import Path
from pypdf import PdfReader
from update_bowling_calendar import normalize, build, months_for

class CalendarTests(unittest.TestCase):
    def setUp(self):
        self.data={'season':{'name':'2026-27'},'schedule':[{'id':'a','date':'2026-10-14','league':'mens','homeTeam':1,'awayTeam':2},{'id':'b','date':'2027-05-06','league':'doubles','homeTeam':1,'awayTeam':2}]}
    def test_move_add_remove_and_extended_month(self):
        self.data['schedule'][0]['date']='2027-06-01'
        rows=normalize(self.data)
        self.assertEqual(months_for(rows)[-1],(2027,6))
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'test.pdf';build(rows,p,'test')
            pages=PdfReader(p).pages
            self.assertEqual(len(pages),4)
            self.assertIn('JUNE 2027',pages[3].extract_text())
        self.data['schedule'].pop();self.assertEqual(len(normalize(self.data)),1)
    def test_bad_input_retains_existing(self):
        for change in ({'schedule':[]},{'season':None},{'schedule':[self.data['schedule'][0]]*2}):
            d=copy.deepcopy(self.data);d.update(change)
            with self.assertRaises((ValueError,AttributeError)):normalize(d)
    def test_reordering_is_unchanged(self):
        before=normalize(self.data);self.data['schedule'].reverse();self.assertEqual(before,normalize(self.data))
if __name__=='__main__':unittest.main()
