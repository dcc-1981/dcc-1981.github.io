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
| **Thank-yous** | After each event, a short, plain thank-you note is saved in Gmail Drafts for each volunteer. It's signed by the event coordinator and reads like a personal email. Nothing is sent without you. |
| **Stats** | Hours, unique volunteers and shifts by year, by event type and by event. Each volunteer's running total is on the Volunteers tab. |
| **Daily check (7am)** | Prepares reminders, finishes past events, notices free spots with a waitlist, flags WWC issues, and emails you a short summary only when something needs attention. |

## One-time setup (about 15 minutes)

New to this? Ask the Secretary for the illustrated setup guide (PDF, kept in the P&C Google Drive).


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
6. Check the **Settings** tab: P&C name, sender name, admin email and email wording. Add the **Facebook page link** so it appears in the email and form footers.
7. Make the branded master form (once). See *P&C branding* below.

> Run Setup from the account that should own the drafts and send the emails, ideally a shared P&C account rather than a personal one. The daily check and the thank-you drafts run as that account.

## Who does what

| Person | What they do | Code? |
|---|---|---|
| **Secretary (you)** | The one-time setup, plus pasting in any code updates | Yes, once |
| **Event coordinators** | Create events, edit slots and manage sign-ups from the P&C Roster menu | **No.** They just need **Editor** access to the Sheet. |
| **Families** | Fill in the sign-up form | No |

- The first time a coordinator uses the menu, Google shows them the "hasn't verified this app" screen once (Advanced, then Go to P&C Roster). Warn them it's coming.
- Confirmations, reminders and the automatic thank-yous always come from the account that ran Setup. If a coordinator uses **Finish event & draft thank-yous** themselves, the drafts land in *their* Gmail.
- Forms a coordinator creates are saved in their Google Drive.
- Only the Setup account runs the automatic jobs. If someone else runs **Setup / repair**, it checks the tabs but won't start a second set of jobs, because that would send duplicate emails.
- **Handover to a new Secretary:** the outgoing Secretary runs **P&C Roster › Stop automatic jobs (handover)**. The new Secretary then runs **Setup / repair** straight away from their own account.

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

### Big events: group (BCC) emails
For events with lots of volunteers, such as a disco with several sessions and 70 helpers, switch on **group emails**. You can do this for one event (New event dialog, or the *Group emails* column on the Events tab) or for everything (*Group emails* in Settings).

| Email | Personal mode | Group mode |
|---|---|---|
| Sign-up confirmation | Sent automatically to each person | The same. It's automatic and confirms their own slots. |
| Reminder | One per volunteer | **One per session** (same start and finish time), to that session's volunteers in BCC. It lists the session's roles. |
| Thank-you | One short note per volunteer ("Hi Ann, …") | **One short note for the whole event** ("Hi everyone, …"), to everyone who attended in BCC. |

Group emails are addressed to the *Public email* (hello@wembleypc.org.au) with volunteers in **BCC**, so nobody sees anyone else's address. Replies go to the event coordinator. Lists bigger than *Group email size limit* (450) are split into several drafts to stay under Gmail's per-message limit. The wording is under *Group reminder…* and *Group thank-you…* in Settings.

**Sending from hello@:** drafts are saved in the account that ran Setup. To send them *from* hello@wembleypc.org.au, add it as a "Send mail as" address in that Gmail account, then pick it in the From field before sending.

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

## P&C branding

Everything follows the **Brand Identity Guide v1.1 (Oct 2026)**. Where this README and the guide differ, the guide wins.

| Where | What's applied |
|---|---|
| **Emails** (confirmations and reminders) | The full-colour logo on white, a Wembley Cyan rule, a small navy caps label, and the event name as a Nunito Deep Navy heading. Body text is Lato in Near-Black. Shifts sit on a Panel Tint card with Wembley Navy date tiles. The Deep Navy footer carries hello@wembleypc.org.au, Facebook and "Join the P&C for $1 via Qkr!". A plain-text version is always included. |
| **Sign-up forms** | Each form copies the branded master form (below), and the description ends with the standard footer. |
| **The Sheet** | Navy header rows in Nunito, Lato throughout, Panel Tint row banding, brand tab colours, and a styled Stats tab. |
| **Dialogs** | Nunito labels, Lato text, navy rounded buttons, Pale Blue inputs and a cyan focus ring. There's never white text on cyan. |
| **Wording** | Follows the voice guide: warm and plain, at most one exclamation mark per message, no guilt-tripping. ("Even one shift makes a difference" rather than "we desperately need you".) |

**Thank-yous are deliberately plain.** They have no logo, design or footer, so they read like a note from the coordinator:

> Hi Ann,
>
> Thank you for helping out at Disco Fever. We really couldn't do it without people like you, and it made a real difference.
>
> Thanks again,
> Sam

They're signed with the event's *Coordinator* name (or *Sender name* if no coordinator is set). You can change the wording under *Thank-you body* in Settings. To use the branded design instead, set *Thank-you style* to Branded.

**Logo.** The *Logo file* setting points to `Wembley P&C Logo.png` in the Brand Assets shared drive. Emails attach it from there, so whoever runs Setup needs access to that file. If it can't be found, the email header falls back to "Wembley PS P&C" in Nunito navy.

**Branded master form (one-off, about 5 minutes).** Google doesn't let scripts set a form's theme, so make one branded form and every new sign-up form will copy it:
1. In Google Forms, create a blank form called *P&C sign-up – master (don't delete)*.
2. Click the palette icon (**Customise theme**):
   - **Header:** upload a 1600 × 400 px banner. Make it in Canva with the P&C brand kit: an off-white background, the full-colour logo top left, a Nunito navy title such as "Volunteer sign-up", and a cyan rule or arc accent.
   - **Colour:** custom **#2E5AAC** (Wembley Navy). Choose the lightest background option.
   - **Text style:** choose **Lato** or **Nunito** if they're in the font list. Avoid Roboto and Arial.
3. Leave the form with no questions. Copy its link from the address bar into **Settings › Form template**.

Forms created before you set the template keep Google's default look. To update one, either recreate the event, or apply the same theme to it by hand (palette icon).

**Not covered yet.** The Hungry Lion canteen has its own orange-and-cream sub-brand. Canteen emails and forms currently use the main P&C look.

## Good to know

- **Privacy:** the sheet holds families' contact details and WWC numbers. Share it only with committee members who need it, and don't make it public.
- **Don't rename** the tabs, the column headings, or the questions on generated forms. The script finds things by name. Adding your own extra columns to the right is fine.
- Each form saves raw responses to a hidden tab called *Responses EV-xxx*. Leave these in place. The tidy copy is on Sign-ups.
- Hours count once a shift's date has passed, unless *Attended = No*.
- Google's daily email limits are 100 for a free Gmail account and 1,500 for Google Workspace. That's plenty for a P&C, but it's another reason to run this from a Workspace account.
- If something goes wrong, open **Extensions › Apps Script › Executions** to see the error.
