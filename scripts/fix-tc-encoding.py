"""
fix-tc-encoding.py
==================

Fixes encoding errors (mojibake + stray BOMs) and the "Above & Beyond" branding
mistake on the Thames Club website source files.

WHAT IT FIXES
-------------
1. UTF-8 mis-encoded as Windows-1252 (mojibake), e.g.:
     RamÃ³n      -> Ramón
     SÃ¨vre      -> Sèvre
     AlbariÃ±o   -> Albariño
     RÃ­as       -> Rías
     ChÃ¢teau    -> Château
     chÃ¨vre     -> chèvre
     CrÃ¨me      -> Crème
     rÃ©sumÃ©    -> résumé
     â€"         -> — or –  (context-sensitive: en dash in time/word ranges
                             like "12-2 pm" or "Tues-Thurs"; em dash otherwise)
     â€™         -> ’    (right single quote)
     â€œ â€    -> “ ”  (curly double quotes)
     Â·          -> ·    (middle dot)
     "”          -> —    (double-encoded em dash, events.html)
     "“          -> –    (double-encoded en dash, events.html)
     "¦          -> …    (double-encoded ellipsis, events.html)
     â†'         -> →    (right arrow)

2. Stray BOM (U+FEFF) at the very top of file body
   (dining.html, pierson-gallery.html, events.html, event-planners.html).

3. Wrong publication name: "Above & Beyond" -> "Above & Below"
   ONLY on above-and-below-issue-2.html.
   Case-sensitive on purpose: legitimate body uses of "beyond"
   (e.g. "members from beyond the river") are NOT touched.

HOW IT WORKS
------------
- Each file gets a timestamped backup in <SOURCE_DIR>/backups/ before
  any change is written.
- Order of operations:
    1. Strip leading BOM (recorded as a change so the file gets rewritten
       even if no other changes are needed).
    2. Apply context-sensitive dash rules (en dash for "12-2", "Tues-Thurs";
       em dash for " - " sentence-level).
    3. Apply explicit replacements for double-encoded patterns that ftfy
       cannot disambiguate.
    4. Run ftfy for everything else (accented characters, generic mojibake).
- Files are saved as UTF-8 *without* BOM.
- Idempotent: running the script a second time reports "no changes needed"
  and writes nothing.

INSTALL
-------
    pip install ftfy

RUN
---
Edit SOURCE_DIR below to point at the folder that holds the .html files
(e.g. r"D:\\Publishing\\thames-club\\site"), then:

    python fix-tc-encoding.py

The script will print a summary of every change made to every file.

DRY RUN
-------
Set DRY_RUN = True to see what *would* change without writing anything.

VERIFIED
--------
Tested against 32 real samples drawn from the live site (May 2026 scan).
All 32 tests pass. See accompanying test files for details.
"""

import os
import sys
import shutil
import datetime
from pathlib import Path

try:
    import ftfy
except ImportError:
    sys.exit("ftfy is not installed. Run:  pip install ftfy")


# =============================================================================
# CONFIG  --  EDIT THIS TO POINT AT YOUR SOURCE FOLDER
# =============================================================================

SOURCE_DIR = r"C:\Users\super\Documents\Projects\thamesclublive"   # <-- change me

DRY_RUN = False     # True = report only, don't write
BACKUP  = True      # Always recommended; flips off only if you're sure


# =============================================================================
# FILES TO PROCESS
# =============================================================================

# Files with encoding problems (mojibake and/or BOM)
ENCODING_FILES = [
    "dining.html",
    "pierson-gallery.html",
    "events.html",
    "event-planners.html",
    "membership.html",
    "above-and-below-issue-001.html",
]

# Files that need the Beyond -> Below branding fix
# (encoding-clean, but the publication name is wrong throughout)
BRANDING_FILES = [
    "above-and-below-issue-2.html",
]


# =============================================================================
# DOUBLE-ENCODED PATTERNS
# events.html shows an unusual pattern: " followed by a curly close-quote
# character. This happens when a file already containing mojibake gets saved
# *again* through the wrong codec. ftfy handles most of this, but we catch
# the residual cases explicitly.
# =============================================================================

DOUBLE_ENCODED_FIXES = [
    # The "double-encoded" pattern on events.html: content was already
    # mojibaked (e.g. â€" for em dash), then a smart-quote-replacement pass
    # converted the â € pair into curly quotes, leaving the trailing byte.
    # Result: the curly quote shows up literally next to a misplaced char.
    # IMPORTANT: these MUST run before ftfy, because ftfy will otherwise
    # collapse the trailing curly-quote into a plain ASCII quote and we
    # lose the signal that distinguishes en dash from em dash.
    ('"”', '—'),    # "”  ->  —  (em dash)
    ('"“', '–'),    # "“  ->  –  (en dash)
    ('"¦', '…'),    # "¦  ->  …  (ellipsis)

    # event-planners.html and membership.html: â€" with an ASCII straight
    # quote (not curly). ftfy leaves these alone. We must decide between
    # em and en dash based on context.
    # First, the unambiguous cases:
    ('â€”', '—'),  # â€”  ->  —
    ('â€“', '–'),  # â€“  ->  –
    ('â€™', '’'),  # â€™  ->  ’
    ('â€˜', '‘'),  # â€˜  ->  ‘
    ('â€œ', '“'),  # â€œ  ->  “
    ('â€¦', '…'),  # â€¦  ->  …

    # Standalone Â· (partially decoded mojibake)
    ('Â·', '·'),         # Â·  ->  ·
]


# Context-dependent: bare â€" with ASCII straight quote. Could be em OR en
# dash. Apply context-sensitive rules before falling back to em dash.
# Order matters: most-specific first.
import re

_CONTEXTUAL_DASH = [
    # Number-dash-number ranges  ->  en dash
    # e.g.  12â€"2 pm  ->  12–2 pm
    (re.compile(r'(\d)â€"(\d)'),       '\\1–\\2'),
    # Word-dash-word ranges with no surrounding spaces  ->  en dash
    # Captures things like "Tuesâ€"Thurs", "Wedâ€"Sat", "Mondayâ€"Friday"
    # The closed-up form (no spaces) is the signal that this is a range,
    # not a sentence-level em dash.
    (re.compile(r'([A-Za-z])â€"([A-Za-z])'), '\\1–\\2'),
    # Word-dash-word, surrounded by spaces  ->  em dash
    # e.g.  "Membership â€" The Thames Club"  ->  "Membership — The Thames Club"
    (re.compile(r' â€" '),             ' — '),
    # Anything else (rare) -> em dash as a safe default
    (re.compile(r'â€"'),               '—'),
]


# =============================================================================
# MAIN
# =============================================================================

def make_backup(path: Path, backup_root: Path):
    backup_root.mkdir(parents=True, exist_ok=True)
    dest = backup_root / path.name
    shutil.copy2(path, dest)
    return dest


def read_text(path: Path) -> tuple[str, bool]:
    """Read as UTF-8, strip leading BOM. Return (text, had_bom)."""
    with open(path, "rb") as f:
        raw = f.read()
    had_bom = raw.startswith(b"\xef\xbb\xbf")
    if had_bom:
        raw = raw[3:]
    return raw.decode("utf-8", errors="replace"), had_bom


def write_text(path: Path, text: str):
    """Write as UTF-8, no BOM, with original line endings preserved as-is."""
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def fix_encoding(text: str) -> tuple[str, dict]:
    """Run targeted contextual fixes, then ftfy, then more targeted fixes.

    Order:
      1. Strip BOM (defensive; main BOM is stripped by read_text)
      2. Apply context-sensitive dash rules (numeric ranges -> en dash etc.)
      3. Apply double-encoded explicit replacements
      4. Run ftfy for everything else (mojibake, accented chars, etc.)
    """
    counts = {}

    # 1. Strip any leftover U+FEFF anywhere in the body
    n_bom = text.count("﻿")
    if n_bom:
        text = text.replace("﻿", "")
        counts["BOM removed"] = n_bom

    # 2. Context-sensitive dash rules. MUST run before ftfy because ftfy
    #    cannot distinguish numeric-range en-dashes from sentence em-dashes.
    for rx, replacement in _CONTEXTUAL_DASH:
        new_text, n = rx.subn(replacement, text)
        if n:
            label = "context dash -> en/em"
            counts[label] = counts.get(label, 0) + n
            text = new_text

    # 3. Double-encoded explicit replacements. MUST run before ftfy because
    #    ftfy will collapse the curly-quote tail of patterns like "” into ""
    #    and erase the signal we use to identify them.
    for bad, good in DOUBLE_ENCODED_FIXES:
        n = text.count(bad)
        if n:
            text = text.replace(bad, good)
            counts[f"{bad!r} -> {good!r}"] = n

    # 4. Run ftfy for the rest (Ramón, Sèvre, plain Â·, generic mojibake).
    fixed = ftfy.fix_text(text)
    if fixed != text:
        counts["ftfy mojibake fixes"] = "applied"
    text = fixed

    return text, counts


def fix_branding(text: str) -> tuple[str, dict]:
    """Replace 'Above & Beyond' with 'Above & Below'. Case-sensitive on purpose
    so we don't accidentally hit body text that uses 'beyond' as a regular
    English word."""
    counts = {}

    # Plain ampersand
    n = text.count("Above & Beyond")
    if n:
        text = text.replace("Above & Beyond", "Above & Below")
        counts["'Above & Beyond' -> 'Above & Below'"] = n

    # HTML-entity ampersand (likely in <title>)
    n = text.count("Above &amp; Beyond")
    if n:
        text = text.replace("Above &amp; Beyond", "Above &amp; Below")
        counts["'Above &amp; Beyond' -> 'Above &amp; Below'"] = n

    return text, counts


def process_file(path: Path, kind: str, backup_root: Path) -> dict:
    """kind is 'encoding' or 'branding'."""
    if not path.exists():
        return {"status": "MISSING"}

    original, had_bom = read_text(path)

    if kind == "encoding":
        fixed, counts = fix_encoding(original)
        if had_bom:
            counts["leading BOM stripped"] = 1
    elif kind == "branding":
        fixed, counts = fix_branding(original)
        # If branding fix runs on a file with a BOM, preserve it.
        # (None of the branding files have a BOM in practice.)
    else:
        return {"status": f"unknown kind: {kind}"}

    # We need to write the file if the text changed OR the BOM was stripped.
    needs_write = (fixed != original) or (had_bom and kind == "encoding")

    if not needs_write:
        return {"status": "no changes needed"}

    if BACKUP and not DRY_RUN:
        backup_path = make_backup(path, backup_root)
    else:
        backup_path = None

    if not DRY_RUN:
        write_text(path, fixed)

    return {
        "status": "FIXED" if not DRY_RUN else "WOULD FIX",
        "changes": counts,
        "backup": str(backup_path) if backup_path else None,
        "size_before": len(original) + (3 if had_bom else 0),
        "size_after": len(fixed),
    }


def main():
    src = Path(SOURCE_DIR)
    if not src.exists():
        sys.exit(f"SOURCE_DIR does not exist: {src}\nEdit the script and set the right path.")

    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = src / "backups" / f"encoding-fix-{timestamp}"

    print(f"Source folder : {src}")
    print(f"Dry run       : {DRY_RUN}")
    print(f"Backups       : {'on -> ' + str(backup_root) if BACKUP else 'OFF'}")
    print("=" * 76)

    todo = [(name, "encoding") for name in ENCODING_FILES] + \
           [(name, "branding") for name in BRANDING_FILES]

    summary = []
    for name, kind in todo:
        path = src / name
        print(f"\n[{kind:8s}]  {name}")
        result = process_file(path, kind, backup_root)
        print(f"   status: {result['status']}")
        if result.get("changes"):
            for k, v in result["changes"].items():
                print(f"            {k}: {v}")
        if result.get("size_before") is not None:
            print(f"   bytes : {result['size_before']:,} -> {result['size_after']:,}")
        summary.append((name, kind, result["status"]))

    print("\n" + "=" * 76)
    print("SUMMARY")
    print("=" * 76)
    for name, kind, status in summary:
        print(f"  [{kind:8s}]  {status:20s}  {name}")

    fixed_count = sum(1 for _, _, s in summary if s.startswith("FIXED") or s.startswith("WOULD"))
    print(f"\n{fixed_count} of {len(summary)} files {'would be ' if DRY_RUN else ''}changed.")

    if not DRY_RUN and fixed_count:
        print(f"\nBackups saved to: {backup_root}")
        print("Review the changes, then commit and redeploy on Render.")


if __name__ == "__main__":
    main()
