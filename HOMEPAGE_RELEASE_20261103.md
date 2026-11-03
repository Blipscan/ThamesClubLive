# Approved homepage release — November 3, 2026

The working homepage follows Bill's approved navy, ivory and gold design. It uses only the existing approved gold monogram and clubhouse banner, with no Chef Anna photograph or invented imagery.

## Event ownership

Both pages now use `club-events-source.js`. The homepage does not maintain its own event list or read the general calendar's room bookings. The shared resolver reads approved curated posters from `events.html` plus the existing public approved staff-flyer feed.

Staff-owned events replace their legacy poster by stable ID, even if dates or titles change. The legacy First Friday/Christopher Faison ID is explicitly mapped to its staff ID; if absent from the approved staff feed, the fixed poster cannot resurrect it. Curated metadata is used only while its authoritative staff record exists. Rejected, pending and cancelled records are excluded. On source failure both displays show an unavailable message rather than stale cards. Date window remains 30 days through the last event date in America/New_York, checked on refresh (every 60 seconds and on return to the page).

For any future migration of another fixed poster to staff management, remove its fixed poster or register its stable ID as staff-owned in the same change. The approved-only feed does not supply cancellation tombstones; the explicit ownership rule is required so missing staff records never fall back to fixed copies.

## Validation

19 browser checks passed: working design, exact approved image assets, shared first three event identities, opening the existing reservation dialog without submitting, staff removal/date/title/cancellation fixtures, polling, unavailable/retry/malformed responses, midnight expiry, full-page widths 360/390/430/1024/1440, mobile menu, metadata and links, and no uncaught homepage errors. Full-page screenshots inspected locally. Live-source smoke test recorded separately.

## Rollback

Saved branch: `backup/homepage-before-20261103`.
Original commit: `7511ad8c1596b83b854cfd2844fe875f2094bfaf`.
Original homepage blob: `2a17c748f3b8eb3ad679d2bab0e4cef0db30356b`.

Restore only `index.html` and `events.html` from that backup branch to the current publishing branch, then commit. Newly added JS/CSS can remain unreferenced. Do not reset the whole branch, because unrelated event/calendar changes may have arrived since this backup. The publish workflow runs on main-branch changes; it must complete before declaring rollback live. Verify public HTML after publication.

No changes are needed to member accounts, reservation endpoints or private information.
