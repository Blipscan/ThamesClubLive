# Events UX correction — 23 October 2026

Design/CSS is retained. Public calendar imports require a [PUBLIC] title prefix; descriptions are never published. Approved flyers remain visible and provide the calendar fallback.

The reservation button prepares an email. Members choose email app or Gmail and press Send there. This release does not enable automatic mail delivery. Saved status explicitly says Awaiting email / receipt; GM receipt and confirmation remain separate.

Guest fields refresh on input and preserve entries when attendance decreases and increases.

## Verification

- JavaScript syntax checks passed.
- DOM integration: guest creation, preservation, validation, prepared email content and no automatic email launch passed. Run from the repository root with jsdom installed: node scripts/test-events-ux.cjs.
- Calendar fixtures: unapproved and cancelled events excluded; approved event title retained and description stripped.

## Rollback

Website baseline: 4a8fa13ff7ecb19723e5b09733c88e85c64bd78a, preserved at rollback/events-before-20261023-ux.
Backend baseline: a319a41a93551359591b222660f1c64d5547be54, preserved at rollback/calendar-before-20261023-ux.

Revert only the commits introduced by this fix through GitHub, then deploy the resulting main branch. Do not reset main over later work. Prefer reverting the reservation files alone if the issue is confined to the form: retain the calendar privacy filter. Full rollback restores the earlier calendar exposure, so use an empty public calendar feed if reverting that code becomes necessary.

No database migration or member-record change is part of this release. The upstream Google calendar itself is public; website filtering does not change Google calendar sharing.
