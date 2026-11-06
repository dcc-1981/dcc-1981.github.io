# P&C Volunteer Roster (Google Sheet + Google Forms)

A volunteer roster that runs inside one Google Sheet. Coordinators build an event's slots in the sheet (or copy them from a template or a past event), and the script creates a Google Form for families to sign up. After the event it drafts thank-you emails and adds the hours to the P&C's stats.

## What it does

| | |
|---|---|
| **Sign-ups** | One Google Form per event, built from that event's slots. Each slot shows how many spots are left. Full slots disappear from the form, and the form closes itself when everything is full. |
| **Templates** | Start a new event from a saved template (sausage sizzle, disco, canteen week…) or copy any past event. Slot dates move to the new date automatically. Any event can be saved as a template. |
| **Quick shifts** | "Add shifts" turns a block of time into shifts, e.g. BBQ 8am–2pm in 2-hour shifts with 3 people each. |
| **Custom questions** | Each event can ask extra questions, e.g. "Can you bring a plate? [Yes\|No]". |
| **WWC (canteen only)** | Only canteen forms ask for a Working with Children card. A card on file is reused next time. Missing or expired cards are marked *Pending WWC* and flagged to you. Event forms never ask. |
| **Hours** | Worked out from slot times. You can change *Actual hours* or set *Attended = No* before finishing an event. |
| **Thank-yous** | After each event, a personal thank-you is saved in Gmail Drafts for each volunteer, listing their shifts and approximate hours. Nothing is sent without you. |
| **Stats** | Hours, unique volunteers and shifts by year, by event type and by event. Each volunteer's running total is on the Volunteers tab. |
| **Daily check (7am)** | Prepares reminders, finishes past events, notices free spots with a waitlist, flags WWC issues, and emails you a short summary only when something needs attention. |

## One-time setup (about 10 minutes)

1. Create a new Google Sheet in the P&C's Google account, e.g. *P&C Volunteer Roster*.
   Check **File › Settings › Time zone** is *(GMT+08:00) Perth*.
2. Open **Extensions › Apps Script**.
3. In the editor:
   - Replace everything in `Code.gs` with the contents of [`Code.gs`](Code.gs).
   - Click **+ › HTML**, name it `NewEvent` (without `.html`), and paste in [`NewEvent.html`](NewEvent.html).
   - Click **+ › HTML**, name it `AddShifts`, and paste in [`AddShifts.html`](AddShifts.html).
   - Click **Project Settings** (cog icon), tick **Show "appsscript.json" manifest file**, then go back to the editor and replace `appsscript.json` with [`appsscript.json`](appsscript.json).
   - Click **Save**.
4. Go back to the sheet and reload it. A **P&C Roster** menu appears.
5. Click **P&C Roster › Setup / repair**. Google will ask you to authorise the script. It needs access to the sheet, Forms (to build sign-up forms), Gmail (to save drafts and send confirmations) and triggers (for the daily check). Click through "Advanced › Go to project" if Google warns that the app isn't verified. That's normal for your own scripts.
6. Check the **Settings** tab: P&C name, sender name, admin email and email wording.

> Run Setup from the account that should own the drafts and send the emails, ideally a shared P&C account rather than a personal one. The daily check and the thank-you drafts run as that account.

## Running an event

1. **P&C Roster › New event…** Enter the name, type, date, location and coordinator. Under *Start from*, pick a template or a previous event. Leave *Create the sign-up form straight away* ticked.
2. Copy the **sign-up form link** into the newsletter, Facebook or class WhatsApp groups. The link is also on the Events tab.
3. Need changes? Edit rows on the **Slots** tab, or use **Add shifts to an event…**, then click **P&C Roster › Create / update sign-up form** with the event's row selected. Existing sign-ups are kept.
4. Sign-ups appear on the **Sign-ups** tab as they come in. Use **Show only the selected event's slots & sign-ups** to focus on one event.
5. **After the event**, fix anyone who didn't turn up (*Attended = No*) or whose hours were different (*Actual hours*). Then either:
   - wait, and the daily check will finish the event and draft the thank-yous the day after (adjust this under *Thank-you days after event*), or
   - use **P&C Roster › Finish event & draft thank-yous** straight away.
6. Open **Gmail › Drafts**, read through the thank-yous and send them.

### Cancellations and the waitlist
- When someone cancels, set their *Status* to **Cancelled** and click **Refresh counts, forms & stats**. The spot goes back on the form.
- If a slot fills while someone has the form open, they're added as **Waitlist** and told so. The daily summary tells you when a spot opens for someone on the waitlist. Change their status to **Confirmed** and let them know.

### Canteen and WWC
- Use the event type **Canteen** (e.g. from the *Canteen week* template, which covers Monday to Friday). Only those forms ask for a WWC card number and expiry date.
- If a volunteer has no card on file, or it expires before their shift, the sign-up is marked **Pending WWC**, and you and the coordinator get an email. Once it's checked, change the status to **Confirmed**.
- The daily summary lists cards that have expired or will expire within *WWC warning days*.
- To require WWC for other types too (e.g. *Uniform shop*), add them to *WWC required for types* in Settings.

## Customising

**Extra questions** (Events tab *Extra questions* column, the New event dialog, or a template's first row). Put one question per line, or separate them with `;`:

```
Can you bring a plate to share? [Yes|No]
*Do you hold a current RSA? [Yes|No]
T-shirt size
```
`*` makes a question required. `[a|b|c]` makes it a multiple-choice question; without brackets it's a short-answer question. Answers show in the *Answers / notes* column. After changing questions, click **Create / update sign-up form**.

**Templates tab.** Each row is one slot. *Day offset* is the number of days after the event date (0 = same day, 1 = next day…). Edit, add or delete rows freely, or use **Save selected event as a template…**

**Event types.** Edit *Event types* in Settings, then run **Setup / repair** to update the drop-down.

**Emails.** All subjects and wording are on the Settings tab. Placeholders:
`{FirstName} {Name} {EventName} {EventDate} {Location} {Shifts} {Hours} {Coordinator} {CoordinatorEmail} {SenderName} {PCName}`

| Setting | Options |
|---|---|
| Send sign-up confirmations | Yes / No |
| Notify coordinator of each sign-up | Yes / No (waitlist and WWC problems are always flagged) |
| Reminder emails | Off / Draft / Send |
| Auto-draft thank-yous | Yes / No |

## Good to know

- **Privacy:** the sheet holds families' contact details and WWC numbers. Share it only with committee members who need it, and don't make it public.
- **Don't rename** the tabs, the column headings, or the questions on generated forms. The script finds things by name. Adding your own extra columns to the right is fine.
- Each form saves raw responses to a hidden tab called *Responses EV-xxx*. Leave these in place. The tidy copy is on Sign-ups.
- Hours count once a shift's date has passed, unless *Attended = No*.
- Google's daily email limits are 100 for a free Gmail account and 1,500 for Google Workspace. That's plenty for a P&C, but it's another reason to run this from a Workspace account.
- If something goes wrong, open **Extensions › Apps Script › Executions** to see the error.
