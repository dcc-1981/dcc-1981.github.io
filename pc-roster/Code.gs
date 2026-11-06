/**
 * P&C Volunteer Roster
 * ---------------------------------------------------------------
 * A Google Sheet + Google Forms volunteer roster for a school P&C.
 *
 *  - Each event gets its own sign-up Google Form, built from the
 *    event's slots. Full slots drop off the form automatically.
 *  - Slots can be copied from saved templates or from a past event.
 *  - Canteen (or any type listed in Settings) asks for a Working with
 *    Children card and flags missing/expired cards.
 *  - Hours are worked out from slot times and can be adjusted after.
 *  - Thank-you emails are drafted in Gmail after each event.
 *  - A Stats tab keeps running totals of volunteers and hours.
 *
 * See README.md for setup. Everything runs from the "P&C Roster" menu.
 */

/* ============================== Constants ============================== */

const SH = {
  EVENTS: 'Events',
  SLOTS: 'Slots',
  TEMPLATES: 'Templates',
  SIGNUPS: 'Sign-ups',
  VOLUNTEERS: 'Volunteers',
  STATS: 'Stats',
  SETTINGS: 'Settings',
  COORDS: 'Coordinators',
};

const HEADERS = {
  [SH.EVENTS]: ['Event ID', 'Event name', 'Type', 'Date', 'Location', 'Coordinator', 'Coordinator email',
    'Status', 'Extra questions', 'Group emails', 'Sign-up form link', 'Form edit link', 'Form ID', 'Thank-yous drafted', 'Notes'],
  [SH.SLOTS]: ['Event ID', 'Slot #', 'Date', 'Start', 'End', 'Role / task', 'Spots', 'Description', 'Filled', 'Remaining'],
  [SH.TEMPLATES]: ['Template', 'Day offset', 'Start', 'End', 'Role / task', 'Spots', 'Description', 'Extra questions'],
  [SH.SIGNUPS]: ['Timestamp', 'Event ID', 'Event name', 'Slot #', 'Role / task', 'Slot date', 'Start', 'End',
    'Name', 'Email', 'Phone', 'Child / class', 'WWC number', 'WWC expiry', 'Status', 'Scheduled hours',
    'Actual hours', 'Attended', 'Reminder', 'Thank-you', 'Answers / notes', 'Cancelled on', 'Ref', 'Manage token'],
  [SH.VOLUNTEERS]: ['Email', 'Name', 'Phone', 'Child / class', 'WWC number', 'WWC expiry', 'First helped',
    'Last helped', 'Events', 'Shifts', 'Total hours'],
  [SH.SETTINGS]: ['Setting', 'Value', 'Help'],
  [SH.COORDS]: ['Name', 'Email', 'Active', 'Page link', 'Welcome email', 'Key'],
};

// Wembley PS P&C Brand Identity Guide v1.1 (Oct 2026). The guide wins if these ever differ.
const BRAND = {
  deepNavy: '#1E3D7A',   // headers, footers
  navy: '#2E5AAC',       // primary, headings, links, buttons
  cyan: '#3CADD4',       // accents and rules only (never white text on cyan)
  lightCyan: '#7FCDE6',  // small labels/links on navy
  nearBlack: '#1A2744',  // body text
  midGrey: '#5A6A8A',    // secondary text
  paleBlue: '#DDE6F5',   // borders, dividers
  offWhite: '#F7F9FC',   // page background
  panelTint: '#F1F6FC',  // cards and panels on white
  cyanTint: '#EAF6FB',   // action callouts
  headingFont: 'Nunito',
  bodyFont: 'Lato',
  // Email clients can't always load web fonts; these fallbacks avoid Arial/Roboto where the device allows.
  headingStack: "'Nunito', 'Nunito Sans', 'Lato', 'Helvetica Neue', Helvetica, sans-serif",
  bodyStack: "'Lato', 'Helvetica Neue', Helvetica, sans-serif",
};

// Earlier default wording, replaced by Setup / repair only if nobody has edited it.
const RETIRED_DEFAULTS = {
  'Confirmation body': ['Hi {FirstName},\n\nThanks for signing up to help at {EventName} ({EventDate}, {Location}). Here are your slots:\n{Shifts}\n\nIf you can no longer make it, just reply to this email and we\'ll sort it out.\n\nThank you!\n{SenderName}\n{PCName}'],
  'Reminder body': ['Hi {FirstName},\n\nJust a friendly reminder that you\'re helping at {EventName} on {EventDate} at {Location}:\n{Shifts}\n\nIf anything has changed, please reply to let us know.\n\nSee you there!\n{SenderName}\n{PCName}'],
  'Reminder emails': ['Draft'],
  'Thank-you body': ['Hi {FirstName},\n\nThank you so much for volunteering at {EventName} on {EventDate}. You gave us {Hours}, helping with:\n{Shifts}\n\nEvents like this only happen because families like yours pitch in, and every dollar raised goes back into our school.\n\nWith thanks,\n{SenderName}\n{PCName}'],
  'Group thank-you body': ['Hi everyone,\n\nThank you to all {VolunteerCount} volunteers who helped at {EventName} on {EventDate}. Between you, you gave about {TotalHours} hours across {ShiftCount} shifts.\n\nEvents like this only happen because families like yours pitch in, and every dollar raised goes back into our school.\n\nWith thanks,\n{SenderName}\n{PCName}'],
};

const EVENT_STATUSES = ['Draft', 'Open', 'Closed', 'Done'];
const SIGNUP_STATUSES = ['Confirmed', 'Pending WWC', 'Waitlist', 'Cancelled'];
const ACTIVE = ['Confirmed', 'Pending WWC']; // statuses that hold a spot

// Form question titles. Changing these after forms exist breaks matching.
const Q = {
  NAME: 'Your name',
  EMAIL: 'Email',
  PHONE: 'Mobile number',
  CHILD: "Your child's name and class (optional)",
  SLOTS: 'Which slots can you help with?',
  WWC_NUM: 'Working with Children (WWC) card number',
  WWC_EXP: 'WWC card expiry date',
  NOTES: 'Anything we should know? (optional)',
};
const STANDARD_TITLES = Object.keys(Q).map(k => Q[k]);

const DEFAULT_SETTINGS = [
  ['P&C name', 'Wembley PS P&C', 'Used in emails and form headings.'],
  ['Sender name', '', 'Signs off emails, e.g. "Jo Smith, Volunteer Coordinator". Blank = "The P&C team".'],
  ['Public email', 'hello@wembleypc.org.au', 'Shown in the email and form footer, and used as the reply-to address when an event has no coordinator email.'],
  ['Facebook page link', '', 'Full link to the P&C Facebook page, for the email and form footer. Blank = left out.'],
  ['Membership line', 'Join the P&C for $1 via Qkr!', 'Footer line on emails and forms.'],
  ['Branded emails', 'Yes', 'Yes = emails use the P&C design (logo, brand colours and fonts). No = plain text.'],
  ['Logo file', 'https://drive.google.com/file/d/1oz7XvHtdJCFUA8JS6ZiTTbNs-yYGm-pc/view', 'Drive link to the full-colour logo PNG (Brand Assets). Used at the top of emails.'],
  ['Form template', '', 'Drive link to a blank Google Form with the P&C theme set (see README). New sign-up forms copy its look. Blank = Google\'s default theme.'],
  ['Admin email', '', 'Gets alerts (waitlists, WWC issues, daily summary). Blank = the account that ran Setup.'],
  ['Event types', 'Event, Canteen, Uniform shop, Working bee', 'Comma-separated list for the Type drop-down on the Events tab.'],
  ['WWC required for types', 'Canteen', 'Event types whose forms ask for a WWC card (comma-separated). Other events never ask.'],
  ['WWC warning days', '60', 'Warn this many days before a WWC card on file expires.'],
  ['Send sign-up confirmations', 'Yes', 'Yes = each volunteer gets an automatic email listing their slots.'],
  ['Notify coordinator of each sign-up', 'No', 'Yes = the event coordinator gets an email for every sign-up. (They get a daily update anyway – see Coordinator updates.)'],
  ['Coordinator page address', '', 'The Web app URL from Apps Script › Deploy (ends in /exec). Needed for coordinator links and volunteers\' cancel links. See README.'],
  ['Coordinator updates', 'Yes', 'Yes = each coordinator gets one short email a day, only when something changed (new sign-ups, cancellations) or spots are still open close to the day.'],
  ['Nudge days before', '5', 'If spots are still open this many days before an event, the coordinator\'s update includes a ready-to-share message.'],
  ['Share message', 'Can you help at {EventName}? We\'re looking for volunteers on {EventDate} at {Location}. Choose a time that suits you here: {FormLink}\n\nEven one shift makes a real difference – thank you.', 'The message coordinators copy into WhatsApp or the newsletter. Placeholders: {EventName} {EventDate} {Location} {FormLink} {PCName}'],
  ['Reminder emails', 'Send', 'Send (automatic, like other sign-up sites), Draft (saved in Gmail Drafts for you to check and send) or Off.'],
  ['Reminder days before', '2', 'How many days before a shift the reminder is prepared.'],
  ['Auto-draft thank-yous', 'Yes', 'Yes = thank-you drafts are created automatically after each event. No = only from the menu.'],
  ['Thank-you days after event', '1', 'Gives coordinators time to fix hours and attendance before drafts are made.'],
  ['Form intro', 'Thanks for offering to help. Tick every slot you can do – full slots drop off the list automatically, and you\'ll get an email confirming your slots. No experience needed, we\'ll show you the ropes.', 'Shown at the top of every sign-up form.'],
  ['Confirmation subject', 'You\'re on the roster for {EventName}', 'Placeholders: {FirstName} {Name} {EventName} {EventDate} {Location} {Shifts} {Hours} {Coordinator} {CoordinatorEmail} {SenderName} {PCName}'],
  ['Confirmation body', 'Hi {FirstName},\n\nThanks for signing up to help at {EventName} ({EventDate}, {Location}). Here are your slots:\n{Shifts}\n\n{ManageLine}\n\nThank you!\n{SenderName}\n{PCName}', '{ManageLine} becomes a link volunteers can use to cancel their own spot (or "reply to this email" if the coordinator page isn\'t set up).'],
  ['Reminder subject', 'Reminder: {EventName} on {EventDate}', ''],
  ['Reminder body', 'Hi {FirstName},\n\nJust a friendly reminder that you\'re helping at {EventName} on {EventDate} at {Location}:\n{Shifts}\n\n{ManageLine}\n\nSee you there!\n{SenderName}\n{PCName}', ''],
  ['Group emails', 'No', 'Yes = reminders and thank-yous go as one BCC email (one thank-you per event, one reminder per session) instead of one per person. Set "Group emails" on the Events tab to override for one event. Sign-up confirmations are always individual.'],
  ['Group email size limit', '450', 'Most people per BCC email. Bigger lists are split into several drafts (Gmail allows about 500 per message).'],
  ['Group reminder subject', 'Reminder: {EventName}, {SessionTime} on {EventDate}', 'Group placeholders: {EventName} {EventDate} {Location} {SessionTime} {Shifts} {VolunteerCount} {Coordinator} {CoordinatorEmail} {SenderName} {PCName}'],
  ['Group reminder body', 'Hi everyone,\n\nJust a friendly reminder that you\'re rostered on for {EventName} on {EventDate} at {Location}, {SessionTime}. This session\'s roles:\n{Shifts}\n\nIf you can no longer make it, please reply so we can find someone to cover.\n\nSee you there!\n{SenderName}\n{PCName}', ''],
  ['Group thank-you subject', 'Thank you for helping at {EventName}', ''],
  ['Group thank-you body', 'Hi everyone,\n\nThank you for helping out at {EventName}. We really couldn\'t do it without people like you, and it made a real difference.\n\nThanks again,\n{SenderName}', 'Kept short and personal on purpose. {VolunteerCount} {TotalHours} and {ShiftCount} are available if you ever want them.'],
  ['Thank-you style', 'Personal', 'Personal = a plain email that reads like a note from the coordinator (no design, no footer). Branded = the P&C email design.'],
  ['Thank-you subject', 'Thank you for helping at {EventName}', ''],
  ['Thank-you body', 'Hi {FirstName},\n\nThank you for helping out at {EventName}. We really couldn\'t do it without people like you, and it made a real difference.\n\nThanks again,\n{SenderName}', 'Signed by the event coordinator (or Sender name if there isn\'t one).'],
];

/* ============================== Menu ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('P&C Roster')
    .addItem('New event…', 'menuNewEvent')
    .addItem('Add shifts to an event…', 'menuAddShifts')
    .addSeparator()
    .addItem('Create / update sign-up form (selected event)', 'menuBuildForm')
    .addItem('Show only the selected event\'s slots & sign-ups', 'menuFilterEvent')
    .addItem('Show all rows', 'menuClearFilters')
    .addSeparator()
    .addItem('Finish event & draft thank-yous (selected event)', 'menuCloseEvent')
    .addItem('Save selected event as a template…', 'menuSaveTemplate')
    .addSeparator()
    .addItem('Coordinator links & welcome emails', 'menuCoordinatorLinks')
    .addSeparator()
    .addItem('Refresh counts, forms & stats', 'menuRefreshAll')
    .addItem('Run daily checks now', 'dailyRosterJob')
    .addSeparator()
    .addItem('Setup / repair', 'setupRoster')
    .addItem('Stop automatic jobs (handover)', 'menuStopJobs')
    .addToUi();
}

function menuNewEvent() {
  const html = HtmlService.createHtmlOutputFromFile('NewEvent').setWidth(460).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'New event');
}

function menuAddShifts() {
  const html = HtmlService.createHtmlOutputFromFile('AddShifts').setWidth(440).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add shifts');
}

function menuBuildForm() {
  const id = selectedEventId_();
  if (!id) return;
  const res = buildForm_(id);
  alert_(`Sign-up form ${res.created ? 'created' : 'updated'} for ${id}.\n\nShare this link with families:\n${res.url}\n\n(It's also in the "Sign-up form link" column on the Events tab.)`);
}

function menuFilterEvent() {
  const id = selectedEventId_();
  if (!id) return;
  [SH.SLOTS, SH.SIGNUPS].forEach(name => filterSheetByEvent_(name, id));
  ss_().setActiveSheet(sheet_(SH.SLOTS));
  toast_(`Showing ${id} only. Use "Show all rows" to undo.`);
}

function menuClearFilters() {
  [SH.SLOTS, SH.SIGNUPS].forEach(name => {
    const f = sheet_(name).getFilter();
    if (f) f.remove();
  });
  toast_('Showing all rows.');
}

function menuCloseEvent() {
  const id = selectedEventId_();
  if (!id) return;
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Finish event ' + id,
    'This will:\n• stop the sign-up form\n• mark everyone still booked as Attended = Yes (unless you\'ve already put No)\n' +
    '• fill blank Actual hours with the scheduled hours\n• create thank-you drafts in Gmail\n\n' +
    'Fix anyone who didn\'t turn up (Attended = No) or worked different hours on the Sign-ups tab first.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  const res = closeEvent_(id);
  alert_(`${id} finished.\n\n${res.drafts} thank-you draft(s) are waiting in Gmail Drafts.\n${res.hours} volunteer hours recorded.`);
}

function menuSaveTemplate() {
  const id = selectedEventId_();
  if (!id) return;
  const ev = getEvent_(id);
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Save as template', `Template name for "${ev.name}":`, ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const name = resp.getResponseText().trim();
  if (!name) return;
  if (templateNames_().indexOf(name) >= 0) {
    if (ui.alert(`Replace the existing "${name}" template?`, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }
  const n = saveTemplate_(id, name);
  alert_(`Saved ${n} slot(s) as the "${name}" template.`);
}

function menuRefreshAll() {
  refreshAll_();
  toast_('Counts, forms and stats refreshed.');
}

/* ============================== Setup ============================== */

function setupRoster() {
  requireUi_();
  const ss = ss_();
  const order = [SH.EVENTS, SH.SLOTS, SH.SIGNUPS, SH.VOLUNTEERS, SH.COORDS, SH.TEMPLATES, SH.STATS, SH.SETTINGS];
  order.forEach((name, i) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name, i);
    const headers = HEADERS[name];
    if (headers) {
      const existing = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
      // Add any missing headers to the end (repair) without disturbing data.
      const missing = headers.filter(h => existing.indexOf(h) < 0);
      if (!existing.filter(String).length) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (missing.length) {
        sh.getRange(1, existing.filter(String).length + 1, 1, missing.length).setValues([missing]);
      }
      brandSheet_(sh, TAB_COLOURS[name]);
    } else {
      sh.setTabColor(TAB_COLOURS[name]);
    }
  });

  // Remove the blank default tab if present.
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  // Settings defaults (never overwrite values someone has changed).
  const set = sheet_(SH.SETTINGS);
  const have = set.getLastRow() > 1 ? set.getRange(2, 1, set.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
  const add = DEFAULT_SETTINGS.filter(r => have.indexOf(r[0]) < 0).map(r => r.slice());
  add.forEach(r => { if (r[0] === 'Admin email' && !r[1]) r[1] = Session.getEffectiveUser().getEmail(); });
  if (add.length) set.getRange(set.getLastRow() + 1, 1, add.length, 3).setValues(add);
  // Update wording that still matches an old default (never touches edited text).
  if (set.getLastRow() > 1) {
    const vals = set.getRange(2, 1, set.getLastRow() - 1, 3).getValues();
    vals.forEach((r, i) => {
      const old = RETIRED_DEFAULTS[String(r[0])];
      const def = DEFAULT_SETTINGS.filter(d => d[0] === String(r[0]))[0];
      if (old && def && old.indexOf(String(r[1])) >= 0) set.getRange(i + 2, 2, 1, 2).setValues([[def[1], def[2]]]);
    });
  }
  set.getRange('B:B').setWrap(true);
  set.getRange('C:C').setWrap(true).setFontColor(BRAND.midGrey);
  set.setColumnWidth(1, 220); set.setColumnWidth(2, 420); set.setColumnWidth(3, 420);

  formatSheets_();
  if (sheet_(SH.TEMPLATES).getLastRow() <= 1) addSampleTemplates_();
  const jobsOwner = installTriggers_();

  if (ss.getSpreadsheetTimeZone() !== Session.getScriptTimeZone()) {
    alert_(`Heads up: this sheet's time zone (${ss.getSpreadsheetTimeZone()}) differs from the script's (${Session.getScriptTimeZone()}).\n` +
      'Set both to Australia/Perth (File › Settings, and Apps Script › Project settings) so dates line up.');
  }
  if (jobsOwner) {
    alert_(`Tabs and formatting checked.\n\nThe automatic jobs (sign-ups, emails, daily check) already run under ${jobsOwner}, so nothing else was changed. You don't need to run Setup – just use P&C Roster › New event…`);
    return;
  }
  alert_('Setup complete.\n\nNext: P&C Roster › New event… to create your first event.\nCheck the Settings tab to adjust email wording and options.');
}

const TAB_COLOURS = {
  [SH.EVENTS]: BRAND.deepNavy,
  [SH.SLOTS]: BRAND.navy,
  [SH.SIGNUPS]: BRAND.cyan,
  [SH.VOLUNTEERS]: BRAND.cyan,
  [SH.TEMPLATES]: BRAND.paleBlue,
  [SH.STATS]: BRAND.navy,
  [SH.SETTINGS]: BRAND.midGrey,
  [SH.COORDS]: BRAND.deepNavy,
};

/** Brand styling for a data tab: Lato body, navy Nunito header row, Panel Tint banding. */
function brandSheet_(sh, tabColour) {
  const maxR = sh.getMaxRows(), maxC = sh.getMaxColumns();
  const lastCol = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, maxR, maxC).setFontFamily(BRAND.bodyFont).setFontColor(BRAND.nearBlack).setFontSize(10);
  sh.getBandings().forEach(b => b.remove());
  sh.getRange(1, 1, maxR, lastCol).applyRowBanding()
    .setHeaderRowColor(BRAND.navy).setFirstRowColor('#FFFFFF').setSecondRowColor(BRAND.panelTint);
  sh.getRange(1, 1, 1, lastCol).setFontFamily(BRAND.headingFont).setFontWeight('bold').setFontColor('#FFFFFF')
    .setWrap(true).setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  if (tabColour) sh.setTabColor(tabColour);
}

function formatSheets_() {
  const settings = settings_();
  const types = splitList_(settings['Event types']);

  const ev = sheet_(SH.EVENTS);
  setColumnFormat_(ev, 'Date', 'ddd d mmm yyyy');
  setValidationList_(ev, 'Type', types);
  setValidationList_(ev, 'Status', EVENT_STATUSES);
  setValidationList_(ev, 'Group emails', ['Yes', 'No']);
  setColumnFormat_(ev, 'Thank-yous drafted', 'd mmm yyyy');
  hideColumns_(ev, ['Form ID']);

  const sl = sheet_(SH.SLOTS);
  setColumnFormat_(sl, 'Date', 'ddd d mmm yyyy');
  setColumnFormat_(sl, 'Start', 'h:mm am/pm');
  setColumnFormat_(sl, 'End', 'h:mm am/pm');
  const evCol = colLetter_(HEADERS[SH.EVENTS].indexOf('Event ID') + 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ev.getRange(`${evCol}2:${evCol}`), true).setAllowInvalid(true).build();
  sl.getRange(2, colIndex_(sl, 'Event ID'), sl.getMaxRows() - 1, 1).setDataValidation(rule);
  ['Filled', 'Remaining'].forEach(h => sl.getRange(2, colIndex_(sl, h), sl.getMaxRows() - 1, 1).setFontColor(BRAND.midGrey));

  const tp = sheet_(SH.TEMPLATES);
  setColumnFormat_(tp, 'Start', 'h:mm am/pm');
  setColumnFormat_(tp, 'End', 'h:mm am/pm');

  const su = sheet_(SH.SIGNUPS);
  setColumnFormat_(su, 'Timestamp', 'd mmm yyyy h:mm am/pm');
  setColumnFormat_(su, 'Slot date', 'ddd d mmm yyyy');
  setColumnFormat_(su, 'WWC expiry', 'd mmm yyyy');
  setColumnFormat_(su, 'Phone', '@');
  setColumnFormat_(su, 'WWC number', '@');
  setValidationList_(su, 'Status', SIGNUP_STATUSES);
  setValidationList_(su, 'Attended', ['Yes', 'No']);
  setColumnFormat_(su, 'Cancelled on', 'd mmm yyyy h:mm am/pm');
  hideColumns_(su, ['Ref', 'Manage token']);

  const co = sheet_(SH.COORDS);
  setValidationList_(co, 'Active', ['Yes', 'No']);
  hideColumns_(co, ['Key']);

  const vo = sheet_(SH.VOLUNTEERS);
  setColumnFormat_(vo, 'Phone', '@');
  setColumnFormat_(vo, 'WWC number', '@');
  setColumnFormat_(vo, 'WWC expiry', 'd mmm yyyy');
  setColumnFormat_(vo, 'First helped', 'd mmm yyyy');
  setColumnFormat_(vo, 'Last helped', 'd mmm yyyy');
}

function addSampleTemplates_() {
  const rows = [
    ['Sausage sizzle', 0, '8:00 AM', '10:00 AM', 'Set up & cook', 3, 'Gazebo, BBQ and signage', ''],
    ['Sausage sizzle', 0, '10:00 AM', '12:00 PM', 'Cook & serve', 3, '', ''],
    ['Sausage sizzle', 0, '12:00 PM', '2:00 PM', 'Serve & pack down', 3, '', ''],
    ['School disco', 0, '4:30 PM', '5:30 PM', 'Set up hall', 4, '', 'Can you bring a plate to share? [Yes|No]'],
    ['School disco', 0, '5:30 PM', '7:00 PM', 'Door & sign-in', 2, '', ''],
    ['School disco', 0, '5:30 PM', '7:00 PM', 'Snack & glow-stick stall', 4, 'Handling cash', ''],
    ['School disco', 0, '7:00 PM', '7:45 PM', 'Pack down', 4, '', ''],
    ['Canteen week', 0, '8:30 AM', '11:00 AM', 'Morning prep', 2, '', ''],
    ['Canteen week', 0, '11:00 AM', '1:30 PM', 'Lunch service', 2, '', ''],
    ['Canteen week', 1, '8:30 AM', '11:00 AM', 'Morning prep', 2, '', ''],
    ['Canteen week', 1, '11:00 AM', '1:30 PM', 'Lunch service', 2, '', ''],
    ['Canteen week', 2, '8:30 AM', '11:00 AM', 'Morning prep', 2, '', ''],
    ['Canteen week', 2, '11:00 AM', '1:30 PM', 'Lunch service', 2, '', ''],
    ['Canteen week', 3, '8:30 AM', '11:00 AM', 'Morning prep', 2, '', ''],
    ['Canteen week', 3, '11:00 AM', '1:30 PM', 'Lunch service', 2, '', ''],
    ['Canteen week', 4, '8:30 AM', '11:00 AM', 'Morning prep', 2, '', ''],
    ['Canteen week', 4, '11:00 AM', '1:30 PM', 'Lunch service', 2, '', ''],
  ];
  appendObjects_(SH.TEMPLATES, rows.map(r => ({
    'Template': r[0], 'Day offset': r[1], 'Start': r[2], 'End': r[3], 'Role / task': r[4],
    'Spots': r[5], 'Description': r[6], 'Extra questions': r[7],
  })));
}

/**
 * The automatic jobs (form sign-ups, daily check) must run under ONE account, or every
 * volunteer gets duplicate emails. Google only lets each person see their own triggers, so we
 * record who owns them and refuse to add a second set for anyone else.
 * Returns '' when this account owns the jobs, or the owner's email when someone else does.
 */
function installTriggers_() {
  const ss = ss_();
  const props = PropertiesService.getDocumentProperties();
  const me = Session.getEffectiveUser().getEmail();
  const owner = props.getProperty('jobsOwner');
  if (owner && owner !== me) return owner;
  props.setProperty('jobsOwner', me);
  const existing = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  if (existing.indexOf('onRosterFormSubmit') < 0) {
    ScriptApp.newTrigger('onRosterFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  }
  if (existing.indexOf('dailyRosterJob') < 0) {
    ScriptApp.newTrigger('dailyRosterJob').timeBased().everyDays(1).atHour(7).create();
  }
  return '';
}

/** For a role handover: the current owner stops their automatic jobs so the new person can run Setup. */
function menuStopJobs() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const me = Session.getEffectiveUser().getEmail();
  const owner = props.getProperty('jobsOwner');
  if (owner && owner !== me) {
    alert_(`The automatic jobs belong to ${owner}. Only they can stop them – ask them to run this menu item.`);
    return;
  }
  if (ui.alert('Stop automatic jobs?', 'Use this when handing over the roster. Sign-ups will stop being processed and no daily checks or emails will run until the new person runs P&C Roster › Setup / repair.\n\nContinue?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  props.deleteProperty('jobsOwner');
  alert_('Automatic jobs stopped. The new person should now run P&C Roster › Setup / repair from their own account – straight away, so no sign-ups are missed.');
}

/* ============================== Events & slots ============================== */

/** Data for the New event / Add shifts dialogs. */
function getDialogData() {
  requireUi_();
  const s = settings_();
  const evs = events_().sort((a, b) => (b.date || 0) - (a.date || 0));
  return {
    types: splitList_(s['Event types']),
    templates: templateNames_(),
    events: evs.map(e => ({ id: e.id, name: e.name, date: e.date ? dateKey_(e.date) : '', label: `${e.id} – ${e.name}${e.date ? ' (' + fmtDate_(e.date, 'd MMM yyyy') + ')' : ''}`, status: e.status })),
    adminEmail: s['Admin email'] || '',
  };
}

/** Called from the New event dialog. */
function createEventFromDialog(d) {
  requireUi_();
  if (!d.name || !d.date || !d.type) throw new Error('Event name, type and date are required.');
  const date = keyToDate_(d.date);
  const id = nextEventId_();
  let extra = (d.extraQuestions || '').trim();
  let copied = [];

  if (d.source && d.source.indexOf('T:') === 0) {
    const t = templateSlots_(d.source.slice(2));
    copied = t.slots;
    if (!extra) extra = t.extra;
  } else if (d.source && d.source.indexOf('E:') === 0) {
    const src = getEvent_(d.source.slice(2));
    if (src) {
      copied = slots_(src).map(s => ({
        offset: src.date && s.date ? daysBetween_(dateKey_(src.date), dateKey_(s.date)) : 0,
        start: s.start, end: s.end, role: s.role, spots: s.spots, desc: s.desc,
      }));
      if (!extra) extra = src.extra;
    }
  }

  appendObjects_(SH.EVENTS, [{
    'Event ID': id, 'Event name': d.name.trim(), 'Type': d.type, 'Date': date,
    'Location': (d.location || '').trim(), 'Coordinator': (d.coordinator || '').trim(),
    'Coordinator email': (d.coordinatorEmail || '').trim(), 'Status': 'Draft', 'Extra questions': extra,
    'Group emails': d.groupEmails || '',
  }]);

  if (copied.length) {
    appendObjects_(SH.SLOTS, copied.map((s, i) => ({
      'Event ID': id, 'Slot #': i + 1, 'Date': addDays_(date, s.offset || 0),
      'Start': s.start == null ? '' : fmtTime_(s.start, 'sheet'), 'End': s.end == null ? '' : fmtTime_(s.end, 'sheet'),
      'Role / task': s.role, 'Spots': s.spots == null ? '' : s.spots, 'Description': s.desc || '',
    })));
  }

  let url = '';
  if (d.createForm && copied.length) url = buildForm_(id).url;
  filterSheetByEvent_(SH.SLOTS, id);
  ss_().setActiveSheet(sheet_(SH.SLOTS));
  return { id, slots: copied.length, url };
}

/** Called from the Add shifts dialog: splits a block of time into shifts. */
function addShiftsFromDialog(d) {
  requireUi_();
  const ev = getEvent_(d.eventId);
  if (!ev) throw new Error('Pick an event.');
  const from = parseTime_(d.from), to = parseTime_(d.to);
  if (from == null || to == null || to <= from) throw new Error('Check the start and finish times.');
  if (!d.role) throw new Error('Enter a role or task.');
  const len = Number(d.length) || (to - from);
  const date = d.date ? keyToDate_(d.date) : ev.date;
  const existing = slots_(ev);
  let n = existing.reduce((m, s) => Math.max(m, s.n || 0), 0);
  const rows = [];
  for (let t = from; t < to; t += len) {
    rows.push({
      'Event ID': ev.id, 'Slot #': ++n, 'Date': date, 'Start': fmtTime_(t, 'sheet'),
      'End': fmtTime_(Math.min(t + len, to), 'sheet'), 'Role / task': d.role.trim(),
      'Spots': d.spots === '' || d.spots == null ? '' : Number(d.spots), 'Description': (d.description || '').trim(),
    });
  }
  appendObjects_(SH.SLOTS, rows);
  if (ev.formId) buildForm_(ev.id);
  filterSheetByEvent_(SH.SLOTS, ev.id);
  ss_().setActiveSheet(sheet_(SH.SLOTS));
  return { added: rows.length, formUpdated: !!ev.formId };
}

function saveTemplate_(eventId, name) {
  const ev = getEvent_(eventId);
  const slots = slots_(ev);
  deleteRowsWhere_(SH.TEMPLATES, r => String(r['Template']) === name);
  appendObjects_(SH.TEMPLATES, slots.map((s, i) => ({
    'Template': name, 'Day offset': daysBetween_(dateKey_(ev.date), dateKey_(s.date)),
    'Start': s.start == null ? '' : fmtTime_(s.start, 'sheet'), 'End': s.end == null ? '' : fmtTime_(s.end, 'sheet'),
    'Role / task': s.role, 'Spots': s.spots == null ? '' : s.spots, 'Description': s.desc,
    'Extra questions': i === 0 ? ev.extra : '',
  })));
  return slots.length;
}

function templateNames_() {
  const t = getTable_(SH.TEMPLATES);
  const seen = [];
  t.rows.forEach(r => { const n = String(r['Template']).trim(); if (n && seen.indexOf(n) < 0) seen.push(n); });
  return seen;
}

function templateSlots_(name) {
  const t = getTable_(SH.TEMPLATES);
  let extra = '';
  const slots = [];
  t.rows.forEach((r, i) => {
    if (String(r['Template']).trim() !== name) return;
    if (!extra && r['Extra questions']) extra = String(r['Extra questions']);
    slots.push({
      offset: Number(r['Day offset']) || 0,
      start: parseTime_(t.disp[i]['Start']), end: parseTime_(t.disp[i]['End']),
      role: String(r['Role / task']), spots: numOrNull_(r['Spots']), desc: String(r['Description'] || ''),
    });
  });
  return { slots, extra };
}

function events_() {
  const t = getTable_(SH.EVENTS);
  return t.rows.map((r, i) => ({
    row: i,
    id: String(r['Event ID']).trim(),
    name: String(r['Event name']).trim(),
    type: String(r['Type']).trim(),
    date: toDate_(r['Date']),
    location: String(r['Location'] || '').trim(),
    coordinator: String(r['Coordinator'] || '').trim(),
    coordinatorEmail: String(r['Coordinator email'] || '').trim(),
    status: String(r['Status'] || 'Draft').trim() || 'Draft',
    extra: String(r['Extra questions'] || ''),
    group: String(r['Group emails'] || '').trim(),
    formUrl: String(r['Sign-up form link'] || ''),
    formId: String(r['Form ID'] || ''),
  })).filter(e => e.id);
}

function getEvent_(id) {
  id = String(id || '').trim().toUpperCase();
  return events_().filter(e => e.id.toUpperCase() === id)[0] || null;
}

function updateEvent_(id, obj) {
  const t = getTable_(SH.EVENTS);
  const i = t.rows.findIndex(r => String(r['Event ID']).trim().toUpperCase() === id.toUpperCase());
  if (i < 0) return;
  Object.keys(obj).forEach(h => t.set(i, h, obj[h]));
}

function nextEventId_() {
  const max = events_().reduce((m, e) => {
    const x = /^EV-(\d+)$/i.exec(e.id);
    return x ? Math.max(m, Number(x[1])) : m;
  }, 0);
  return 'EV-' + String(max + 1).padStart(3, '0');
}

/** Slots for an event, sorted by date then start time. */
function slots_(ev) {
  const t = getTable_(SH.SLOTS);
  const out = [];
  t.rows.forEach((r, i) => {
    if (String(r['Event ID']).trim().toUpperCase() !== ev.id.toUpperCase()) return;
    if (!String(r['Role / task']).trim()) return;
    out.push({
      row: i,
      n: numOrNull_(r['Slot #']),
      date: toDate_(r['Date']) || ev.date,
      start: parseTime_(t.disp[i]['Start']),
      end: parseTime_(t.disp[i]['End']),
      role: String(r['Role / task']).trim(),
      spots: numOrNull_(r['Spots']),
      desc: String(r['Description'] || '').trim(),
    });
  });
  return out.sort((a, b) => (dateKey_(a.date) + pad4_(a.start)).localeCompare(dateKey_(b.date) + pad4_(b.start)));
}

/** Gives any slot without a number the next free number for its event. */
function assignSlotNumbers_(ev) {
  const t = getTable_(SH.SLOTS);
  let max = 0;
  const blanks = [];
  t.rows.forEach((r, i) => {
    if (String(r['Event ID']).trim().toUpperCase() !== ev.id.toUpperCase() || !String(r['Role / task']).trim()) return;
    const n = numOrNull_(r['Slot #']);
    if (n == null) blanks.push(i); else max = Math.max(max, n);
  });
  blanks.forEach(i => t.set(i, 'Slot #', ++max));
}

/** Count of spot-holding sign-ups per slot number. */
function activeCounts_(eventId) {
  const counts = {};
  getTable_(SH.SIGNUPS).rows.forEach(r => {
    if (String(r['Event ID']).toUpperCase() !== eventId.toUpperCase()) return;
    if (ACTIVE.indexOf(String(r['Status'])) < 0) return;
    const n = Number(r['Slot #']);
    counts[n] = (counts[n] || 0) + 1;
  });
  return counts;
}

/** Writes Filled / Remaining for one event's slots. */
function writeSlotCounts_(ev) {
  const counts = activeCounts_(ev.id);
  const t = getTable_(SH.SLOTS);
  t.rows.forEach((r, i) => {
    if (String(r['Event ID']).trim().toUpperCase() !== ev.id.toUpperCase()) return;
    const n = numOrNull_(r['Slot #']);
    const spots = numOrNull_(r['Spots']);
    const filled = counts[n] || 0;
    t.set(i, 'Filled', filled);
    t.set(i, 'Remaining', spots == null ? 'No limit' : Math.max(spots - filled, 0));
  });
}

/* ============================== Forms ============================== */

function buildForm_(eventId) {
  const ev = getEvent_(eventId);
  if (!ev) throw new Error(`Can't find event ${eventId} on the Events tab.`);
  if (!ev.date) throw new Error(`${ev.id} needs a date first.`);
  const st = settings_();
  assignSlotNumbers_(ev);
  const slots = slots_(ev);
  if (!slots.length) throw new Error(`${ev.id} has no slots yet. Add rows on the Slots tab (or use "Add shifts to an event…") first.`);

  let form = null;
  if (ev.formId) { try { form = FormApp.openById(ev.formId); } catch (e) { form = null; } }
  const created = !form;
  const title = `${ev.name} – volunteer sign-up`;
  if (created) form = createForm_(title, st);

  form.setTitle(title)
    .setDescription(formDescription_(ev, slots, st))
    .setConfirmationMessage(isYes_(st['Send sign-up confirmations'])
      ? 'Thank you! Check your email for confirmation of your slots.'
      : 'Thank you! The coordinator will be in touch.')
    .setShowLinkToRespondAgain(false)
    .setAllowResponseEdits(false);

  const needsWwc = wwcRequired_(ev, st);

  ensureItem_(form, Q.NAME, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(true);
  ensureItem_(form, Q.EMAIL, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please enter a valid email address.').build());
  ensureItem_(form, Q.PHONE, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(true);
  ensureItem_(form, Q.CHILD, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(false);
  ensureItem_(form, Q.SLOTS, FormApp.ItemType.CHECKBOX, () => form.addCheckboxItem()).asCheckboxItem().setRequired(true)
    .setHelpText('Tick as many as you like.');

  if (needsWwc) {
    ensureItem_(form, Q.WWC_NUM, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(false)
      .setHelpText('Needed for canteen shifts because they are on school grounds. If you\'ve given us your card before, you can leave this blank.');
    ensureItem_(form, Q.WWC_EXP, FormApp.ItemType.DATE, () => form.addDateItem()).asDateItem().setRequired(false);
  } else {
    [Q.WWC_NUM, Q.WWC_EXP].forEach(t => { const it = findItem_(form, t); if (it) form.deleteItem(it); });
  }

  // Event-specific extra questions. Only remove ones this script added before.
  const props = PropertiesService.getDocumentProperties();
  const key = 'extra_' + form.getId();
  const previous = JSON.parse(props.getProperty(key) || '[]');
  const extras = parseExtraQuestions_(ev.extra);
  const extraTitles = extras.map(x => x.title);
  previous.filter(t => extraTitles.indexOf(t) < 0).forEach(t => { const it = findItem_(form, t); if (it) form.deleteItem(it); });
  extras.forEach(x => {
    if (x.options) {
      ensureItem_(form, x.title, FormApp.ItemType.MULTIPLE_CHOICE, () => form.addMultipleChoiceItem())
        .asMultipleChoiceItem().setChoiceValues(x.options).setRequired(x.required);
    } else {
      ensureItem_(form, x.title, FormApp.ItemType.TEXT, () => form.addTextItem()).asTextItem().setRequired(x.required);
    }
  });
  props.setProperty(key, JSON.stringify(extraTitles));

  ensureItem_(form, Q.NOTES, FormApp.ItemType.PARAGRAPH_TEXT, () => form.addParagraphTextItem()).asParagraphTextItem().setRequired(false);

  // Keep a tidy question order.
  const order = [Q.NAME, Q.EMAIL, Q.PHONE, Q.CHILD, Q.SLOTS]
    .concat(needsWwc ? [Q.WWC_NUM, Q.WWC_EXP] : []).concat(extraTitles).concat([Q.NOTES]);
  order.forEach((t, i) => {
    const it = findItem_(form, t);
    if (it && it.getIndex() !== i) form.moveItem(it.getIndex(), i);
  });

  if (created) {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss_().getId());
    SpreadsheetApp.flush();
    tidyResponseSheet_(form, ev.id);
  }

  const status = ev.status === 'Draft' ? 'Open' : ev.status;
  updateEvent_(ev.id, {
    'Sign-up form link': form.getPublishedUrl(),
    'Form edit link': form.getEditUrl(),
    'Form ID': form.getId(),
    'Status': status,
  });
  ev.status = status;
  ev.formId = form.getId();
  refreshEventForm_(ev, form);
  return { created, url: form.getPublishedUrl() };
}

/** Rebuilds slot choices (with spots left) and opens/closes the form. */
function refreshEventForm_(ev, form) {
  writeSlotCounts_(ev);
  if (!ev.formId) return;
  if (!form) { try { form = FormApp.openById(ev.formId); } catch (e) { return; } }
  const counts = activeCounts_(ev.id);
  const today = todayKey_();
  const open = slots_(ev).filter(s => s.n != null && dateKey_(s.date) >= today &&
    (s.spots == null || (counts[s.n] || 0) < s.spots));
  const item = findItem_(form, Q.SLOTS);
  if (item && open.length) {
    item.asCheckboxItem().setChoiceValues(open.map(s => slotLabel_(s, s.spots == null ? null : s.spots - (counts[s.n] || 0))));
  }
  const accepting = open.length > 0 && (ev.status === 'Open' || ev.status === 'Draft');
  form.setAcceptingResponses(accepting);
  if (!accepting) {
    const contact = ev.coordinatorEmail ? ` Contact ${ev.coordinator || 'the coordinator'} at ${ev.coordinatorEmail} if you'd still like to help.` : '';
    form.setCustomClosedFormMessage((open.length || ev.status === 'Closed' || ev.status === 'Done'
      ? 'Sign-ups for this event are now closed. Thank you!'
      : 'All slots are now full – thank you so much!') + contact);
  }
}

function slotLabel_(s, remaining) {
  const parts = [fmtDate_(s.date, 'EEE d MMM'), s.role];
  const tr = timeRange_(s);
  if (tr) parts.push(tr);
  if (remaining != null) parts.push(remaining === 1 ? '1 spot left' : `${remaining} spots left`);
  return `${parts.join(' · ')} (#${s.n})`;
}

function formDescription_(ev, slots, st) {
  const lines = [st['Form intro'] || ''];
  const when = ev.date ? fmtDate_(ev.date, 'EEEE d MMMM yyyy') : '';
  lines.push('', [when, ev.location].filter(String).join(' · '));
  const descs = slots.filter(s => s.desc).map(s => `• ${s.role}: ${s.desc}`);
  const uniq = descs.filter((d, i) => descs.indexOf(d) === i);
  if (uniq.length) lines.push('', 'About the roles:', ...uniq);
  if (ev.coordinator || ev.coordinatorEmail) lines.push('', `Questions? ${[ev.coordinator, ev.coordinatorEmail].filter(String).join(' – ')}`);
  lines.push('', '———', footerLine_(st));
  return lines.join('\n').trim();
}

/** The standard footer for public P&C pieces: email, Facebook, $1 membership via Qkr!. */
function footerLine_(st) {
  return [st['P&C name'], st['Public email'], st['Facebook page link'], st['Membership line']]
    .map(x => String(x || '').trim()).filter(String).join(' · ');
}

/** New form: a copy of the branded template form if one is set (keeps its theme), else a plain form. */
function createForm_(title, st) {
  const tplId = driveId_(st['Form template']);
  if (tplId) {
    try {
      const copy = DriveApp.getFileById(tplId).makeCopy(title);
      const f = FormApp.openById(copy.getId());
      f.getItems().forEach(it => f.deleteItem(it));
      return f;
    } catch (e) {
      Logger.log('Could not copy the form template, using a plain form: ' + e);
    }
  }
  return FormApp.create(title);
}

/** Pulls a Drive file ID out of a link (or returns a bare ID). */
function driveId_(v) {
  const m = String(v || '').match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

function tidyResponseSheet_(form, eventId) {
  const id = form.getId();
  ss_().getSheets().forEach(sh => {
    const url = sh.getFormUrl();
    if (!url) return;
    try {
      if (FormApp.openByUrl(url).getId() === id) {
        sh.setName(`Responses ${eventId}`);
        sh.hideSheet();
      }
    } catch (e) { /* not ours */ }
  });
}

function findItem_(form, title) {
  return form.getItems().filter(i => i.getTitle() === title)[0] || null;
}

/** Finds a question by title, recreating it if its type has changed. */
function ensureItem_(form, title, type, create) {
  let it = findItem_(form, title);
  if (it && it.getType() !== type) { form.deleteItem(it); it = null; }
  if (!it) { create().setTitle(title); it = findItem_(form, title); }
  return it;
}

/* ============================== Form submissions ============================== */

/** Installable trigger: runs for every form linked to this spreadsheet. */
function onRosterFormSubmit(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = e.range.getSheet();
    const url = sh.getFormUrl();
    if (!url) return;
    const formId = FormApp.openByUrl(url).getId();
    const ev = events_().filter(x => x.formId === formId)[0];
    if (!ev) return;

    const ans = {};
    if (e.namedValues) Object.keys(e.namedValues).forEach(k => { ans[k] = (e.namedValues[k] || [])[0] || ''; });
    // Prefer real Date values for date questions.
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const vals = sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];
    headers.forEach((h, i) => {
      if (vals[i] instanceof Date && h !== 'Timestamp') ans[h] = vals[i];
      else if (ans[h] === undefined || ans[h] === '') { if (vals[i] !== '') ans[h] = vals[i]; }
    });
    processSignup_(ev, ans, vals[0] instanceof Date ? vals[0] : new Date());
  } finally {
    lock.releaseLock();
  }
}

function processSignup_(ev, ans, timestamp) {
  const st = settings_();
  const email = String(ans[Q.EMAIL] || '').trim().toLowerCase();
  const name = String(ans[Q.NAME] || '').trim();
  const phone = String(ans[Q.PHONE] || '').trim();
  const child = String(ans[Q.CHILD] || '').trim();
  const nums = slotNumbersFromAnswer_(ans[Q.SLOTS]);

  const slots = slots_(ev);
  const byN = {};
  slots.forEach(s => { byN[s.n] = s; });
  const counts = activeCounts_(ev.id);

  const already = {};
  let token = '';
  getTable_(SH.SIGNUPS).rows.forEach(r => {
    if (String(r['Event ID']).toUpperCase() !== ev.id.toUpperCase() || !email) return;
    if (String(r['Email']).trim().toLowerCase() !== email) return;
    if (!token && r['Manage token']) token = String(r['Manage token']);
    if (ACTIVE.indexOf(String(r['Status'])) >= 0) already[Number(r['Slot #'])] = true;
  });
  if (!token) token = newToken_();

  const vol = getVolunteer_(email);
  const needsWwc = wwcRequired_(ev, st);
  const wwcNum = String(ans[Q.WWC_NUM] || '').trim() || (vol ? vol.wwcNum : '');
  const wwcExp = toDate_(ans[Q.WWC_EXP]) || (vol ? vol.wwcExp : null);

  const notes = [];
  parseExtraQuestions_(ev.extra).forEach(x => { if (ans[x.title]) notes.push(`${x.title} ${ans[x.title]}`); });
  if (ans[Q.NOTES]) notes.push(`Note: ${ans[Q.NOTES]}`);

  const rows = [];
  const results = [];
  nums.forEach(n => {
    const s = byN[n];
    if (!s) return;
    if (already[n]) { results.push({ s, status: 'Already booked' }); return; }
    let status = s.spots != null && (counts[n] || 0) >= s.spots ? 'Waitlist' : 'Confirmed';
    if (status === 'Confirmed' && needsWwc && (!wwcNum || !wwcExp || dateKey_(wwcExp) < dateKey_(s.date))) status = 'Pending WWC';
    if (status !== 'Waitlist') counts[n] = (counts[n] || 0) + 1;
    const hrs = hoursBetween_(s.start, s.end);
    rows.push({
      'Timestamp': timestamp, 'Event ID': ev.id, 'Event name': ev.name, 'Slot #': n, 'Role / task': s.role,
      'Slot date': s.date, 'Start': s.start == null ? '' : fmtTime_(s.start, 'sheet'), 'End': s.end == null ? '' : fmtTime_(s.end, 'sheet'),
      'Name': name, 'Email': email, 'Phone': phone, 'Child / class': child,
      'WWC number': needsWwc ? wwcNum : '', 'WWC expiry': needsWwc && wwcExp ? wwcExp : '',
      'Status': status, 'Scheduled hours': hrs, 'Answers / notes': notes.join(' | '),
      'Ref': newRef_(), 'Manage token': token,
    });
    results.push({ s, status });
  });

  if (rows.length) appendObjects_(SH.SIGNUPS, rows);
  upsertVolunteer_({ email, name, phone, child, wwcNum: needsWwc ? String(ans[Q.WWC_NUM] || '').trim() : '', wwcExp: needsWwc ? toDate_(ans[Q.WWC_EXP]) : null });
  refreshEventForm_(ev);

  if (!email || !results.length) return results;

  // Confirmation to the volunteer.
  if (isYes_(st['Send sign-up confirmations'])) {
    const shifts = results.map(r => Object.assign({}, r.s, { note: statusNote_(r.status) }));
    const vars = templateVars_(ev, name, shifts.map(shiftText_),
      sumHours_(results.filter(r => ACTIVE.indexOf(r.status) >= 0).map(r => hoursBetween_(r.s.start, r.s.end))), st);
    vars.ManageLine = manageLine_(token);
    const m = composeEmail_('You\'re on the roster', st['Confirmation subject'], st['Confirmation body'], vars, shifts, ev, st);
    MailApp.sendEmail(clean_({
      to: email, subject: m.subject, body: m.text, htmlBody: m.html, inlineImages: m.inlineImages,
      name: fromName_(st), replyTo: replyTo_(ev, st),
    }));
  }

  // Alerts for the coordinator / admin.
  const issues = results.filter(r => r.status === 'Waitlist' || r.status === 'Pending WWC');
  const notifyAll = isYes_(st['Notify coordinator of each sign-up']);
  if (issues.length || notifyAll) {
    const to = uniq_([ev.coordinatorEmail, st['Admin email']].filter(String)).join(',');
    if (to) {
      MailApp.sendEmail(to, `${issues.length ? 'Action needed: ' : ''}${name} signed up for ${ev.name}`,
        `${name} (${email}, ${phone}) signed up for ${ev.name}:\n\n` +
        results.map(r => `${shiftLine_(r.s)} – ${r.status}`).join('\n') +
        (issues.some(r => r.status === 'Pending WWC') ? '\n\nThey need a current WWC card on file before their canteen shift. Once checked, change their Status to Confirmed on the Sign-ups tab.' : '') +
        (issues.some(r => r.status === 'Waitlist') ? '\n\nA slot was already full, so they are on the waitlist.' : '') +
        `\n\nRoster: ${ss_().getUrl()}`);
    }
  }
  return results;
}

/* ============================== Volunteers ============================== */
// (processSignup_ returns its per-slot results, used by the coordinator page.)

function getVolunteer_(email) {
  if (!email) return null;
  const t = getTable_(SH.VOLUNTEERS);
  const i = t.rows.findIndex(r => String(r['Email']).trim().toLowerCase() === email);
  if (i < 0) return null;
  return { wwcNum: String(t.rows[i]['WWC number'] || '').trim(), wwcExp: toDate_(t.rows[i]['WWC expiry']) };
}

function upsertVolunteer_(v) {
  if (!v.email) return;
  const t = getTable_(SH.VOLUNTEERS);
  const i = t.rows.findIndex(r => String(r['Email']).trim().toLowerCase() === v.email);
  if (i < 0) {
    appendObjects_(SH.VOLUNTEERS, [{
      'Email': v.email, 'Name': v.name, 'Phone': v.phone, 'Child / class': v.child,
      'WWC number': v.wwcNum || '', 'WWC expiry': v.wwcExp || '',
    }]);
    return;
  }
  if (v.name) t.set(i, 'Name', v.name);
  if (v.phone) t.set(i, 'Phone', v.phone);
  if (v.child) t.set(i, 'Child / class', v.child);
  if (v.wwcNum) t.set(i, 'WWC number', v.wwcNum);
  if (v.wwcExp) t.set(i, 'WWC expiry', v.wwcExp);
}

/* ============================== Finishing events ============================== */

/** Marks attendance, fills hours, drafts thank-yous, closes the form. */
function closeEvent_(eventId) {
  const ev = getEvent_(eventId);
  if (!ev) throw new Error(`Can't find event ${eventId}.`);
  const st = settings_();
  const t = getTable_(SH.SIGNUPS);
  const people = {};
  let hours = 0;
  const stamp = 'Drafted ' + fmtDate_(new Date(), 'd MMM');

  t.rows.forEach((r, i) => {
    if (String(r['Event ID']).toUpperCase() !== ev.id.toUpperCase()) return;
    if (ACTIVE.indexOf(String(r['Status'])) < 0) return;
    if (!String(r['Attended']).trim()) t.set(i, 'Attended', 'Yes');
    if (String(r['Actual hours']) === '' && r['Scheduled hours'] !== '') t.set(i, 'Actual hours', r['Scheduled hours']);
    if (String(t.rows[i]['Attended']) !== 'Yes') return;
    const h = Number(t.rows[i]['Actual hours']) || 0;
    hours += h;
    if (String(r['Thank-you']).trim()) return;
    const email = String(r['Email']).trim().toLowerCase();
    if (!email) return;
    if (!people[email]) people[email] = { name: String(r['Name']), rows: [], shifts: [], hours: [] };
    people[email].rows.push(i);
    people[email].shifts.push({
      date: toDate_(r['Slot date']) || ev.date, role: String(r['Role / task']),
      start: parseTime_(t.disp[i]['Start']), end: parseTime_(t.disp[i]['End']),
    });
    people[email].hours.push(h);
  });

  let drafts = 0;
  const emails = Object.keys(people);
  if (emails.length && groupEmails_(ev, st)) {
    let shiftCount = 0, total = 0;
    emails.forEach(e => { shiftCount += people[e].shifts.length; total += sumHours_(people[e].hours); });
    const vars = Object.assign(templateVars_(ev, '', [], total, st), {
      FirstName: 'everyone', VolunteerCount: emails.length, ShiftCount: shiftCount,
      TotalHours: String(Math.round(total * 2) / 2),
    });
    const m = composeEmail_('Thank you', st['Group thank-you subject'], st['Group thank-you body'], vars, [], ev, st, personalThanks_(st));
    drafts = groupDrafts_(emails, m, vars, ev, st, false);
    emails.forEach(e => people[e].rows.forEach(i => t.set(i, 'Thank-you', stamp + ' (group)')));
    emails.length = 0; // handled
  }
  emails.forEach(email => {
    const p = people[email];
    const vars = templateVars_(ev, p.name, p.shifts.map(shiftText_), sumHours_(p.hours), st);
    const m = composeEmail_('Thank you', st['Thank-you subject'], st['Thank-you body'], vars, p.shifts, ev, st, personalThanks_(st));
    GmailApp.createDraft(email, m.subject, m.text, clean_({
      htmlBody: m.html, inlineImages: m.inlineImages, name: fromName_(st), replyTo: replyTo_(ev, st),
    }));
    p.rows.forEach(i => t.set(i, 'Thank-you', stamp));
    drafts++;
  });

  updateEvent_(ev.id, { 'Status': 'Done', 'Thank-yous drafted': new Date() });
  ev.status = 'Done';
  refreshEventForm_(ev);
  refreshStats_();
  return { drafts, hours: Math.round(hours * 100) / 100 };
}

/* ============================== Daily job ============================== */

/** Time-driven trigger (daily ~7am). Also available from the menu. */
function dailyRosterJob() {
  const st = settings_();
  const today = todayKey_();
  const digest = [];

  // 1. Reminders.
  const mode = String(st['Reminder emails'] || 'Off').trim().toLowerCase();
  if (mode === 'draft' || mode === 'send') {
    const target = dateKey_(addDays_(keyToDate_(today), Number(st['Reminder days before']) || 2));
    const t = getTable_(SH.SIGNUPS);
    const groups = {}, sessions = {}, evCache = {};
    t.rows.forEach((r, i) => {
      if (ACTIVE.indexOf(String(r['Status'])) < 0 || String(r['Reminder']).trim()) return;
      const d = toDate_(r['Slot date']);
      if (!d || dateKey_(d) !== target || !r['Email']) return;
      const evId = String(r['Event ID']);
      if (!(evId in evCache)) evCache[evId] = getEvent_(evId);
      const shift = { date: d, role: String(r['Role / task']), start: parseTime_(t.disp[i]['Start']), end: parseTime_(t.disp[i]['End']) };
      if (evCache[evId] && groupEmails_(evCache[evId], st)) {
        // One BCC email per session (same start and finish time).
        const sk = evId + '|' + shift.start + '|' + shift.end;
        const g = sessions[sk] = sessions[sk] || { ev: evCache[evId], shift, emails: [], roles: [], rows: [] };
        const em = String(r['Email']).trim().toLowerCase();
        if (g.emails.indexOf(em) < 0) g.emails.push(em);
        if (!g.roles.some(x => x.role === shift.role)) g.roles.push(Object.assign({ brief: true }, shift));
        g.rows.push(i);
        return;
      }
      const k = r['Event ID'] + '|' + String(r['Email']).toLowerCase();
      if (!groups[k]) groups[k] = { eventId: String(r['Event ID']), email: String(r['Email']).toLowerCase(), name: String(r['Name']), token: String(r['Manage token'] || ''), rows: [], shifts: [], hours: [] };
      groups[k].rows.push(i);
      groups[k].shifts.push({ date: d, role: String(r['Role / task']), start: parseTime_(t.disp[i]['Start']), end: parseTime_(t.disp[i]['End']) });
      groups[k].hours.push(Number(r['Scheduled hours']) || 0);
    });
    let n = 0;
    Object.keys(groups).forEach(k => {
      const g = groups[k];
      const ev = getEvent_(g.eventId);
      if (!ev) return;
      const vars = templateVars_(ev, g.name, g.shifts.map(shiftText_), sumHours_(g.hours), st);
      vars.EventDate = fmtDate_(keyToDate_(target), 'EEEE d MMMM'); // the shift's day (matters for multi-day rosters like canteen weeks)
      vars.ManageLine = manageLine_(g.token);
      const m = composeEmail_('Reminder', st['Reminder subject'], st['Reminder body'], vars, g.shifts, ev, st);
      const opts = clean_({ htmlBody: m.html, inlineImages: m.inlineImages, name: fromName_(st), replyTo: replyTo_(ev, st) });
      if (mode === 'send') GmailApp.sendEmail(g.email, m.subject, m.text, opts); else GmailApp.createDraft(g.email, m.subject, m.text, opts);
      g.rows.forEach(i => t.set(i, 'Reminder', (mode === 'send' ? 'Sent ' : 'Drafted ') + fmtDate_(new Date(), 'd MMM')));
      n++;
    });
    Object.keys(sessions).forEach(k => {
      const g = sessions[k];
      const vars = Object.assign(templateVars_(g.ev, '', g.roles.map(shiftText_), 0, st), {
        FirstName: 'everyone', VolunteerCount: g.emails.length,
        EventDate: fmtDate_(g.shift.date, 'EEEE d MMMM'), SessionTime: timeRange_(g.shift) || 'all day',
      });
      const m = composeEmail_('Reminder', st['Group reminder subject'], st['Group reminder body'], vars, g.roles, g.ev, st);
      n += groupDrafts_(g.emails, m, vars, g.ev, st, mode === 'send');
      g.rows.forEach(i => t.set(i, 'Reminder', (mode === 'send' ? 'Sent ' : 'Drafted ') + fmtDate_(new Date(), 'd MMM') + ' (group)'));
    });
    if (n) digest.push(`${n} reminder email(s) ${mode === 'send' ? 'sent' : 'saved in Gmail Drafts – please check and send'}.`);
  }

  // 2. Auto-finish events and draft thank-yous.
  if (isYes_(st['Auto-draft thank-yous'])) {
    const lag = Number(st['Thank-you days after event']) || 1;
    events_().forEach(ev => {
      if (ev.status === 'Done' || ev.status === 'Draft' || !ev.date) return;
      const last = slots_(ev).reduce((m, s) => dateKey_(s.date) > m ? dateKey_(s.date) : m, dateKey_(ev.date));
      if (daysBetween_(last, today) >= lag) {
        const res = closeEvent_(ev.id);
        digest.push(`${ev.name} (${ev.id}) finished: ${res.drafts} thank-you draft(s) in Gmail, ${res.hours} hours recorded.`);
      }
    });
  }

  // 3. Refresh forms (drops past slots) and look for waitlists with free spots.
  events_().forEach(ev => {
    if (ev.status === 'Done') return;
    refreshEventForm_(ev);
    const counts = activeCounts_(ev.id);
    const waiting = {};
    getTable_(SH.SIGNUPS).rows.forEach(r => {
      if (String(r['Event ID']) === ev.id && String(r['Status']) === 'Waitlist') {
        const n = Number(r['Slot #']);
        (waiting[n] = waiting[n] || []).push(String(r['Name']));
      }
    });
    slots_(ev).forEach(s => {
      if (waiting[s.n] && s.spots != null && (counts[s.n] || 0) < s.spots && dateKey_(s.date) >= today) {
        digest.push(`${ev.name}: "${s.role}" ${shiftLine_(s).replace('• ', '')} has a free spot and a waitlist (${waiting[s.n].join(', ')}). Change one to Confirmed on the Sign-ups tab.`);
      }
    });
  });

  // 4. WWC checks.
  const soon = dateKey_(addDays_(keyToDate_(today), 14));
  getTable_(SH.SIGNUPS).rows.forEach(r => {
    const d = toDate_(r['Slot date']);
    if (String(r['Status']) === 'Pending WWC' && d && dateKey_(d) >= today && dateKey_(d) <= soon) {
      digest.push(`WWC needed: ${r['Name']} (${r['Email']}) – ${r['Event name']}, ${fmtDate_(d, 'EEE d MMM')}.`);
    }
  });
  const warn = dateKey_(addDays_(keyToDate_(today), Number(st['WWC warning days']) || 60));
  getTable_(SH.VOLUNTEERS).rows.forEach(r => {
    const exp = toDate_(r['WWC expiry']);
    if (!exp) return;
    const k = dateKey_(exp);
    if (k < today) digest.push(`WWC expired: ${r['Name']} (${r['Email']}) – expired ${fmtDate_(exp, 'd MMM yyyy')}.`);
    else if (k <= warn) digest.push(`WWC expiring: ${r['Name']} (${r['Email']}) – ${fmtDate_(exp, 'd MMM yyyy')}.`);
  });

  // 5. Coordinator updates (one short email each, only when there's news).
  if (isYes_(st['Coordinator updates'])) {
    try { coordinatorUpdates_(st); } catch (e) { digest.push('Coordinator updates failed: ' + e.message); }
  }

  refreshStats_();

  const to = st['Admin email'];
  if (digest.length && to) {
    MailApp.sendEmail(to, `P&C roster – ${digest.length} item(s) for ${fmtDate_(new Date(), 'EEE d MMM')}`,
      digest.map(d => '• ' + d).join('\n') + `\n\nRoster: ${ss_().getUrl()}`);
  }
  if (ui_()) toast_(digest.length ? `Daily checks done – ${digest.length} item(s) emailed to ${to}.` : 'Daily checks done – nothing needs attention.');
}

/* ============================== Stats ============================== */

function refreshAll_() {
  events_().forEach(ev => { if (ev.status !== 'Done' || ev.formId) refreshEventForm_(ev); });
  refreshStats_();
}

function refreshStats_() {
  const evs = {};
  events_().forEach(e => { evs[e.id] = e; });
  const today = todayKey_();
  const perEvent = {}, perYear = {}, perType = {}, perVol = {};

  getTable_(SH.SIGNUPS).rows.forEach(r => {
    if (ACTIVE.indexOf(String(r['Status'])) < 0 || String(r['Attended']) === 'No') return;
    const d = toDate_(r['Slot date']);
    if (!d || dateKey_(d) > today) return; // only count shifts that have happened
    const id = String(r['Event ID']);
    const ev = evs[id] || { name: String(r['Event name']), type: '', date: d, status: '' };
    const email = String(r['Email']).trim().toLowerCase() || String(r['Name']).trim().toLowerCase();
    const h = r['Actual hours'] !== '' ? Number(r['Actual hours']) || 0 : Number(r['Scheduled hours']) || 0;
    const year = d.getFullYear();

    const pe = perEvent[id] = perEvent[id] || { ev, vols: {}, shifts: 0, hours: 0 };
    pe.vols[email] = 1; pe.shifts++; pe.hours += h;
    const py = perYear[year] = perYear[year] || { events: {}, vols: {}, shifts: 0, hours: 0 };
    py.events[id] = 1; py.vols[email] = 1; py.shifts++; py.hours += h;
    const tk = year + '|' + (ev.type || 'Other');
    const pt = perType[tk] = perType[tk] || { year, type: ev.type || 'Other', events: {}, vols: {}, hours: 0 };
    pt.events[id] = 1; pt.vols[email] = 1; pt.hours += h;
    const pv = perVol[email] = perVol[email] || { first: d, last: d, events: {}, shifts: 0, hours: 0 };
    if (d < pv.first) pv.first = d;
    if (d > pv.last) pv.last = d;
    pv.events[id] = 1; pv.shifts++; pv.hours += h;
  });

  const r2 = x => Math.round(x * 100) / 100;
  const blocks = [];
  blocks.push([['Volunteering by year', '', '', '', ''], ['Year', 'Events', 'Volunteers (unique)', 'Shifts', 'Hours']]
    .concat(Object.keys(perYear).sort().reverse().map(y => {
      const p = perYear[y];
      return [Number(y), Object.keys(p.events).length, Object.keys(p.vols).length, p.shifts, r2(p.hours)];
    })));
  blocks.push([['By event type', '', '', '', ''], ['Year', 'Type', 'Events', 'Volunteers (unique)', 'Hours']]
    .concat(Object.keys(perType).sort().reverse().map(k => {
      const p = perType[k];
      return [p.year, p.type, Object.keys(p.events).length, Object.keys(p.vols).length, r2(p.hours)];
    })));
  const evRows = Object.keys(perEvent).map(id => {
    const p = perEvent[id];
    return [id, p.ev.name, p.ev.date || '', p.ev.type, Object.keys(p.vols).length, p.shifts, r2(p.hours), p.ev.status];
  }).sort((a, b) => (b[2] || 0) - (a[2] || 0));
  blocks.push([['By event', '', '', '', '', '', '', ''], ['Event ID', 'Event', 'Date', 'Type', 'Volunteers', 'Shifts', 'Hours', 'Status']].concat(evRows));

  const sh = sheet_(SH.STATS);
  sh.clear();
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(BRAND.bodyFont).setFontColor(BRAND.nearBlack).setFontSize(10);
  sh.getRange(1, 1).setValue('Volunteer stats').setFontFamily(BRAND.headingFont).setFontWeight('bold').setFontSize(18).setFontColor(BRAND.deepNavy);
  sh.getRange(2, 1).setValue(`Counts only shifts that have happened and weren't marked Attended = No. Updated ${fmtDate_(new Date(), 'd MMM yyyy h:mm a')}.`)
    .setFontColor(BRAND.midGrey);
  let row = 4;
  blocks.forEach(b => {
    const width = b[1].length;
    const data = b.map(r => { const x = r.slice(0, width); while (x.length < width) x.push(''); return x; });
    sh.getRange(row, 1, data.length, width).setValues(data);
    sh.getRange(row, 1).setFontFamily(BRAND.headingFont).setFontWeight('bold').setFontSize(13).setFontColor(BRAND.navy);
    sh.getRange(row + 1, 1, 1, width).setFontFamily(BRAND.headingFont).setFontWeight('bold')
      .setBackground(BRAND.navy).setFontColor('#FFFFFF');
    if (data.length > 2) sh.getRange(row + 2, 1, data.length - 2, width).setBackground(BRAND.panelTint)
      .setBorder(null, null, true, null, null, true, BRAND.paleBlue, SpreadsheetApp.BorderStyle.SOLID);
    if (width === 8 && data.length > 2) sh.getRange(row + 2, 3, data.length - 2, 1).setNumberFormat('d mmm yyyy');
    row += data.length + 2;
  });
  sh.autoResizeColumns(1, 8);

  // Volunteer totals.
  const vt = getTable_(SH.VOLUNTEERS);
  vt.rows.forEach((r, i) => {
    const p = perVol[String(r['Email']).trim().toLowerCase()];
    t_setMany_(vt, i, p ? {
      'First helped': p.first, 'Last helped': p.last, 'Events': Object.keys(p.events).length,
      'Shifts': p.shifts, 'Total hours': r2(p.hours),
    } : { 'Events': 0, 'Shifts': 0, 'Total hours': 0 });
  });
}

function t_setMany_(t, i, obj) { Object.keys(obj).forEach(h => t.set(i, h, obj[h])); }

/* ============================== Email helpers ============================== */

function templateVars_(ev, name, lines, hours, st) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there';
  return {
    FirstName: first,
    Name: name || '',
    EventName: ev.name,
    EventDate: ev.date ? fmtDate_(ev.date, 'EEEE d MMMM') : '',
    Location: ev.location || 'school',
    Shifts: lines.join('\n'),
    Hours: hours > 0 ? `about ${fmtHours_(hours)}` : 'your time',
    Coordinator: ev.coordinator || '',
    CoordinatorEmail: ev.coordinatorEmail || '',
    SenderName: ev.coordinator || st['Sender name'] || 'The P&C team',
    PCName: st['P&C name'] || '',
    ManageLine: 'If you can no longer make it, just reply to this email and we\'ll sort it out.',
  };
}

/** The "cancel your spot" line, as a link when the coordinator page is deployed. */
function manageLine_(token) {
  const url = webAppUrl_();
  if (!url || !token) return 'If you can no longer make it, just reply to this email and we\'ll sort it out.';
  return `Can't make it after all? You can cancel your spot here: ${url}?x=${token}`;
}

function shiftLine_(s) {
  const tr = timeRange_(s);
  return `• ${fmtDate_(s.date, 'EEE d MMM')}, ${s.role}${tr ? ', ' + tr : ''}`;
}

function statusNote_(status) {
  if (status === 'Waitlist') return 'This slot was already full, so you\'re on the waitlist. We\'ll let you know if a spot opens.';
  if (status === 'Pending WWC') return 'We need a current Working with Children card for this shift. Please reply with your card number and expiry date.';
  if (status === 'Already booked') return 'You were already booked for this one.';
  return '';
}

/** One shift as a plain-text line, with any status note. */
function shiftText_(s) {
  if (s.brief) return `• ${s.role}`; // group reminders: date and time are already in the sentence
  return shiftLine_(s) + (s.note ? ` – ${s.note}` : '');
}

/** Whether an event's reminders and thank-yous go as group (BCC) emails. */
function groupEmails_(ev, st) {
  if (/^(y|yes)$/i.test(ev.group || '')) return true;
  if (/^(n|no)$/i.test(ev.group || '')) return false;
  return isYes_(st['Group emails']);
}

/**
 * One email to the P&C's own address with volunteers in BCC, split into batches
 * under Gmail's per-message limit. Returns the number of drafts/emails made.
 */
function groupDrafts_(emails, m, vars, ev, st, send) {
  const to = st['Public email'] || st['Admin email'];
  const size = Math.max(1, Math.min(Number(st['Group email size limit']) || 450, 490));
  let n = 0;
  for (let i = 0; i < emails.length; i += size) {
    const opts = clean_({
      bcc: emails.slice(i, i + size).join(','), htmlBody: m.html, inlineImages: m.inlineImages,
      name: fromName_(st), replyTo: replyTo_(ev, st),
    });
    if (send) GmailApp.sendEmail(to, m.subject, m.text, opts); else GmailApp.createDraft(to, m.subject, m.text, opts);
    n++;
  }
  return n;
}

function personalThanks_(st) {
  return !/^branded$/i.test(String(st['Thank-you style'] || 'Personal').trim());
}

/** Display name on outgoing email. */
function fromName_(st) {
  return st['Sender name'] || st['P&C name'] || 'P&C';
}

function replyTo_(ev, st) {
  return ev.coordinatorEmail || st['Public email'] || st['Admin email'];
}

/* ============================== Branded email ============================== */

/**
 * Builds subject, plain text and (if Branded emails = Yes) the HTML version.
 * The wording comes from the Settings templates; the HTML adds the P&C design around it.
 */
function composeEmail_(kicker, subjectTpl, bodyTpl, vars, shifts, ev, st, personal) {
  const subject = fill_(subjectTpl, vars);
  if (personal) {
    // Reads like a note typed by a person: no design, no footer.
    return { subject, text: fill_(bodyTpl, Object.assign({}, vars, { Shifts: shifts.map(shiftText_).join('\n') })) };
  }
  const footer = footerLine_(st);
  const text = fill_(bodyTpl, Object.assign({}, vars, { Shifts: shifts.map(shiftText_).join('\n') })) +
    (footer ? '\n\n—\n' + footer : '');
  if (!isYes_(st['Branded emails'])) return { subject, text };
  const logo = logoBlob_(st);
  return {
    subject, text,
    html: emailHtml_(kicker, bodyTpl, vars, shifts, ev, st, !!logo),
    inlineImages: logo ? { pclogo: logo } : undefined,
  };
}

let LOGO_CACHE_;
function logoBlob_(st) {
  if (LOGO_CACHE_ !== undefined) return LOGO_CACHE_;
  LOGO_CACHE_ = null;
  const id = driveId_(st['Logo file']);
  if (id) {
    try { LOGO_CACHE_ = DriveApp.getFileById(id).getBlob().setName('pc-logo'); } catch (e) { Logger.log('Logo not found: ' + e); }
  }
  return LOGO_CACHE_;
}

function emailHtml_(kicker, bodyTpl, vars, shifts, ev, st, hasLogo) {
  const B = BRAND;
  const TOKEN = '@@SHIFTS@@';
  const link = u => `<a href="${u}" style="color:${B.navy};font-weight:700;">${/\?x=/.test(u) ? 'Cancel or check my spot' : u}</a>`;
  const para = t => `<p style="margin:0 0 16px;font-family:${B.bodyStack};font-size:15px;line-height:1.6;color:${B.nearBlack};">${esc_(t).replace(/(https:\/\/[^\s<]+)/g, m => link(m)).replace(/\n/g, '<br>')}</p>`;
  const body = fill_(bodyTpl, Object.assign({}, vars, { Shifts: TOKEN })).split(/\n{2,}/).map(chunk => {
    if (chunk.indexOf(TOKEN) < 0) return chunk.trim() ? para(chunk.trim()) : '';
    const parts = chunk.split(TOKEN);
    return parts.map((x, i) => (x.trim() ? para(x.trim()) : '') + (i < parts.length - 1 ? shiftsHtml_(shifts) : '')).join('');
  }).join('');

  const pcName = esc_(st['P&C name'] || '');
  const when = [vars.EventDate, ev.location].filter(String).join(' · ');
  const logo = hasLogo
    ? `<img src="cid:pclogo" alt="${pcName}" height="56" style="display:block;height:56px;width:auto;border:0;">`
    : `<span style="font-family:${B.headingStack};font-weight:800;font-size:20px;color:${B.navy};">${pcName}</span>`;
  const footerBits = [];
  if (st['Public email']) footerBits.push(`<a href="mailto:${esc_(st['Public email'])}" style="color:${B.lightCyan};text-decoration:underline;">${esc_(st['Public email'])}</a>`);
  if (st['Facebook page link']) footerBits.push(`<a href="${esc_(st['Facebook page link'])}" style="color:${B.lightCyan};text-decoration:underline;">Facebook</a>`);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Lato:wght@400;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${B.offWhite};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.offWhite};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${B.paleBlue};border-radius:16px;overflow:hidden;">
<tr><td style="padding:24px 28px 16px;">${logo}</td></tr>
<tr><td style="padding:0 28px;"><div style="height:4px;line-height:4px;font-size:0;background:${B.cyan};border-radius:2px;">&nbsp;</div></td></tr>
<tr><td style="padding:22px 28px 8px;">
<div style="font-family:${B.headingStack};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${B.navy};margin:0 0 6px;">${esc_(kicker)}</div>
<div style="font-family:${B.headingStack};font-size:24px;font-weight:800;line-height:1.25;color:${B.deepNavy};margin:0 0 4px;">${esc_(ev.name)}</div>
${when ? `<div style="font-family:${B.bodyStack};font-size:14px;line-height:1.5;color:${B.midGrey};margin:0 0 20px;">${esc_(when)}</div>` : ''}
${body}
</td></tr>
<tr><td style="background:${B.deepNavy};padding:18px 28px;font-family:${B.bodyStack};font-size:13px;line-height:1.7;color:#FFFFFF;">
<span style="font-family:${B.headingStack};font-weight:800;font-size:14px;">${pcName}</span><br>
${footerBits.join(' &nbsp;·&nbsp; ')}${st['Membership line'] ? (footerBits.length ? '<br>' : '') + esc_(st['Membership line']) : ''}
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Shifts as a Panel Tint card with navy date tiles. */
function shiftsHtml_(shifts) {
  const B = BRAND;
  const rows = shifts.map(s => {
    const tr = timeRange_(s);
    return `<tr>
<td width="64" valign="top" style="padding:12px 0 12px 12px;">
<table role="presentation" width="52" cellpadding="0" cellspacing="0" style="background:${B.navy};border-radius:10px;"><tr>
<td align="center" style="padding:6px 0;font-family:${B.headingStack};color:#FFFFFF;">
<div style="font-size:10px;font-weight:700;letter-spacing:1px;line-height:1.2;">${esc_(fmtDate_(s.date, 'EEE').toUpperCase())}</div>
<div style="font-size:20px;font-weight:900;line-height:1.15;">${esc_(fmtDate_(s.date, 'd'))}</div>
<div style="font-size:10px;font-weight:700;letter-spacing:1px;line-height:1.2;">${esc_(fmtDate_(s.date, 'MMM').toUpperCase())}</div>
</td></tr></table></td>
<td valign="middle" style="padding:12px 14px;font-family:${B.bodyStack};font-size:15px;line-height:1.45;color:${B.nearBlack};">
<span style="font-family:${B.headingStack};font-weight:800;">${esc_(s.role)}</span>${tr ? `<br><span style="color:${B.midGrey};">${esc_(tr)}</span>` : ''}${s.note ? `<br><span style="font-size:13px;color:${B.navy};">${esc_(s.note)}</span>` : ''}
</td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.panelTint};border-radius:12px;margin:0 0 16px;">${rows}</table>`;
}

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/* ============================== Coordinator page & volunteer self-service ==============================
 * Published once by the Secretary as a Web app (Execute as: me · Who has access: Anyone).
 * Coordinators open ?c=<their key>; volunteers open ?x=<their manage token> from their emails.
 * Every server call re-checks the key or token. Coordinators only ever see their own events.
 */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.c) {
    const c = coordinatorByKey_(p.c);
    if (!c) return messagePage_('This link isn\'t active', 'Please ask the P&C Secretary for a new coordinator link.');
    return bootPage_('Coordinator', { key: p.c, name: c.name }, 'P&C volunteer roster');
  }
  if (p.x && vmRows_(p.x).length) return bootPage_('Manage', { token: p.x }, 'Your volunteer spots');
  return messagePage_('Link not found', 'This link may have expired. If you need to change your volunteer spot, just reply to your confirmation email.');
}

function bootPage_(file, boot, title) {
  const t = HtmlService.createTemplateFromFile(file);
  t.boot = JSON.stringify(boot).replace(/</g, '\\u003c');
  return t.evaluate().setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function messagePage_(title, text) {
  const B = BRAND;
  return HtmlService.createHtmlOutput(
    `<div style="font-family:${B.bodyStack};color:${B.nearBlack};max-width:480px;margin:48px auto;padding:0 20px;">` +
    `<div style="font-family:${B.headingStack};font-weight:800;font-size:22px;color:${B.deepNavy};margin-bottom:8px;">${esc_(title)}</div>` +
    `<div style="font-size:15px;line-height:1.6;">${esc_(text)}</div></div>`)
    .setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** The deployed web app address (Settings, or detected when running as the web app). */
function webAppUrl_() {
  const v = String(settings_()['Coordinator page address'] || '').trim();
  if (/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) return v;
  try { const u = ScriptApp.getService().getUrl(); if (u && /\/exec$/.test(u)) return u; } catch (e) { /* not deployed */ }
  return '';
}

function newToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function newRef_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }

/** Fills in Ref / Manage token for rows typed straight into the sheet. */
function ensureRefs_() {
  const t = getTable_(SH.SIGNUPS);
  const tokens = {};
  t.rows.forEach(r => { if (r['Manage token']) tokens[r['Event ID'] + '|' + String(r['Email']).toLowerCase()] = r['Manage token']; });
  t.rows.forEach((r, i) => {
    if (!r['Ref']) t.set(i, 'Ref', newRef_());
    if (!r['Manage token']) {
      const k = r['Event ID'] + '|' + String(r['Email']).toLowerCase();
      tokens[k] = tokens[k] || newToken_();
      t.set(i, 'Manage token', tokens[k]);
    }
  });
}

/* ---------- Coordinators ---------- */

function coordinators_() {
  const t = getTable_(SH.COORDS);
  return t.rows.map((r, i) => ({
    row: i, name: String(r['Name']).trim(), email: String(r['Email']).trim().toLowerCase(),
    active: !/^no$/i.test(String(r['Active']).trim()), key: String(r['Key']).trim(),
  })).filter(c => c.email);
}

function coordinatorByKey_(key) {
  key = String(key || '');
  if (key.length < 24) return null;
  return coordinators_().filter(c => c.active && c.key === key)[0] || null;
}

function auth_(key) {
  const c = coordinatorByKey_(key);
  if (!c) throw new Error('This coordinator link is no longer active. Please ask the P&C Secretary for a new one.');
  return c;
}

function ownEvent_(c, id) {
  const ev = getEvent_(id);
  if (!ev || ev.coordinatorEmail.toLowerCase() !== c.email) throw new Error('Can\'t find that event.');
  return ev;
}

/** Menu: make a personal link for every coordinator, then offer welcome-email drafts. */
function menuCoordinatorLinks() {
  const ui = SpreadsheetApp.getUi();
  const url = webAppUrl_();
  if (!url) {
    alert_('The coordinator page isn\'t published yet.\n\nIn Apps Script: Deploy › New deployment › Web app · Execute as: Me · Who has access: Anyone › Deploy. ' +
      'Copy the Web app URL into Settings › Coordinator page address, then run this again. (Steps are in the setup guide.)');
    return;
  }
  // Add anyone named as a coordinator on the Events tab.
  const have = coordinators_().map(c => c.email);
  const add = [];
  events_().forEach(e => {
    const em = e.coordinatorEmail.toLowerCase();
    if (em && have.indexOf(em) < 0 && !add.some(a => a.Email === em)) add.push({ 'Name': e.coordinator || em, 'Email': em, 'Active': 'Yes' });
  });
  if (add.length) appendObjects_(SH.COORDS, add);

  const t = getTable_(SH.COORDS);
  let made = 0;
  t.rows.forEach((r, i) => {
    if (!String(r['Email']).trim()) return;
    if (!r['Key']) { t.set(i, 'Key', newToken_()); made++; }
    if (!String(r['Active']).trim()) t.set(i, 'Active', 'Yes');
    t.set(i, 'Page link', `${url}?c=${t.rows[i]['Key']}`);
  });

  const unsent = t.rows.map((r, i) => i).filter(i => t.rows[i]['Email'] && !String(t.rows[i]['Welcome email']).trim() && !/^no$/i.test(String(t.rows[i]['Active'])));
  let msg = `${made} new link(s) made. Links are in the Page link column on the Coordinators tab.`;
  if (unsent.length && ui.alert('Coordinator links', `${msg}\n\nDraft a short welcome email (with their link) for the ${unsent.length} coordinator(s) who haven't had one?`, ui.ButtonSet.YES_NO) === ui.Button.YES) {
    const st = settings_();
    unsent.forEach(i => {
      const r = t.rows[i];
      const first = String(r['Name']).trim().split(/\s+/)[0] || 'there';
      GmailApp.createDraft(String(r['Email']).trim(), 'Your link for organising P&C volunteers',
        `Hi ${first},\n\nHere's your link for organising volunteers for P&C events:\n${r['Page link']}\n\n` +
        'Bookmark it – there\'s nothing to install and no log-in. From there you can set up an event (or copy last year\'s), share the sign-up link and see who\'s coming. ' +
        'Volunteers get their confirmations and reminders automatically, and can cancel their own spot if their plans change.\n\n' +
        'Please keep the link to yourself, as it shows volunteers\' contact details. Any questions, just reply.\n\n' +
        `Thanks for helping,\n${st['Sender name'] || 'The P&C team'}`, clean_({ name: fromName_(st) }));
      t.set(i, 'Welcome email', 'Drafted ' + fmtDate_(new Date(), 'd MMM'));
    });
    alert_(`${unsent.length} welcome email(s) are in Gmail Drafts – check and send them.`);
  } else {
    alert_(msg);
  }
}

/* ---------- Coordinator page: data ---------- */

function hhmm_(mins) { return mins == null ? '' : String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'); }

function signupsFor_(eventId) {
  const t = getTable_(SH.SIGNUPS);
  return t.rows.map((r, i) => ({ r, i })).filter(x => String(x.r['Event ID']).toUpperCase() === eventId.toUpperCase());
}

function eventCard_(ev, today) {
  const counts = activeCounts_(ev.id);
  let spots = 0, filled = 0, unlimited = false;
  const slots = slots_(ev);
  slots.forEach(s => { filled += counts[s.n] || 0; if (s.spots == null) unlimited = true; else spots += s.spots; });
  const last = slots.reduce((m, s) => (dateKey_(s.date) > m ? dateKey_(s.date) : m), dateKey_(ev.date));
  return {
    id: ev.id, name: ev.name, dateText: ev.date ? fmtDate_(ev.date, 'EEE d MMM yyyy') : '',
    dateKey: dateKey_(ev.date), status: ev.status, filled, spots: unlimited ? null : spots,
    past: !!last && last < today,
  };
}

function shareText_(ev, st) {
  return fill_(st['Share message'], {
    EventName: ev.name, EventDate: ev.date ? fmtDate_(ev.date, 'EEEE d MMMM') : '', Location: ev.location || 'school',
    FormLink: ev.formUrl || '', PCName: st['P&C name'] || '',
  });
}

/** Everything the coordinator's home screen needs. */
function cpLoad(key) {
  const c = auth_(key);
  const st = settings_();
  const today = todayKey_();
  const mine = events_().filter(e => e.coordinatorEmail.toLowerCase() === c.email)
    .sort((a, b) => (a.date || 0) - (b.date || 0)).map(e => eventCard_(e, today));
  const past = events_().filter(e => e.date).sort((a, b) => b.date - a.date).slice(0, 40)
    .map(e => ({ id: e.id, label: `${e.name} (${fmtDate_(e.date, 'MMM yyyy')})` }));
  const logo = logoBlob_(st);
  return {
    name: c.name, types: splitList_(st['Event types']), wwcTypes: splitList_(st['WWC required for types']),
    events: mine, templates: templateNames_(), pastEvents: past,
    logo: logo ? 'data:' + logo.getContentType() + ';base64,' + Utilities.base64Encode(logo.getBytes()) : '',
    pcName: st['P&C name'],
  };
}

/** One event in full: details, share message and the roster. */
function cpEvent(key, id) {
  const c = auth_(key);
  ensureRefs_();
  return eventDetail_(ownEvent_(c, id));
}

function eventDetail_(ev) {
  const st = settings_();
  const today = todayKey_();
  const people = signupsFor_(ev.id);
  const slots = slots_(ev).map(s => {
    const here = people.filter(x => Number(x.r['Slot #']) === s.n && String(x.r['Status']) !== 'Cancelled').map(x => ({
      ref: String(x.r['Ref']), name: String(x.r['Name']), email: String(x.r['Email']), phone: String(x.r['Phone']),
      status: String(x.r['Status']), attended: String(x.r['Attended'] || ''),
    }));
    const active = here.filter(p => ACTIVE.indexOf(p.status) >= 0);
    return {
      n: s.n, date: dateKey_(s.date), dateText: fmtDate_(s.date, 'EEE d MMM'), start: hhmm_(s.start), end: hhmm_(s.end),
      timeText: timeRange_(s), role: s.role, spots: s.spots, desc: s.desc,
      people: active, waitlist: here.filter(p => p.status === 'Waitlist'),
      open: s.spots == null ? null : Math.max(s.spots - active.length, 0),
    };
  });
  const card = eventCard_(ev, today);
  return {
    id: ev.id, name: ev.name, type: ev.type, date: dateKey_(ev.date), dateText: card.dateText, location: ev.location,
    status: ev.status, formUrl: ev.formUrl, share: shareText_(ev, st), extra: ev.extra,
    group: groupEmails_(ev, st), past: card.past, filled: card.filled, spots: card.spots,
    multiDay: slots.some(s => s.date !== dateKey_(ev.date)), slots,
  };
}

/** Slots from a template or any earlier event, moved to the new date (no people copied). */
function cpPreviewSlots(key, source, dateKey) {
  auth_(key);
  if (!dateKey) throw new Error('Choose the event date first.');
  const base = keyToDate_(dateKey);
  let list = [], extra = '';
  if (String(source).indexOf('T:') === 0) {
    const t = templateSlots_(String(source).slice(2));
    list = t.slots; extra = t.extra;
  } else if (String(source).indexOf('E:') === 0) {
    const src = getEvent_(String(source).slice(2));
    if (src) {
      list = slots_(src).map(s => ({ offset: src.date ? daysBetween_(dateKey_(src.date), dateKey_(s.date)) : 0, start: s.start, end: s.end, role: s.role, spots: s.spots, desc: s.desc }));
      extra = src.extra;
    }
  }
  return {
    extra,
    slots: list.map(s => ({ date: dateKey_(addDays_(base, s.offset || 0)), start: hhmm_(s.start), end: hhmm_(s.end), role: s.role, spots: s.spots == null ? '' : s.spots, desc: s.desc || '' })),
  };
}

/* ---------- Coordinator page: changes ---------- */

/** Create or update an event and its slots, then publish its sign-up form. */
function cpSaveEvent(key, d) {
  const c = auth_(key);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const name = String(d.name || '').trim();
    if (!name) throw new Error('Give the event a name.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date || ''))) throw new Error('Choose the event date.');
    const slots = (d.slots || []).filter(s => String(s.role || '').trim());
    if (!slots.length) throw new Error('Add at least one slot (a job and a time).');
    slots.forEach(s => {
      const a = parseTime_(s.start), b = parseTime_(s.end);
      if (a == null || b == null) throw new Error(`Add a start and finish time for "${s.role}".`);
      if (s.spots !== '' && s.spots != null && !(Number(s.spots) >= 1)) throw new Error(`"${s.role}" needs at least 1 person (or leave it blank for no limit).`);
    });
    const st = settings_();
    const type = splitList_(st['Event types']).indexOf(d.type) >= 0 ? d.type : (splitList_(st['Event types'])[0] || 'Event');
    const fields = {
      'Event name': name, 'Type': type, 'Date': keyToDate_(d.date), 'Location': String(d.location || '').trim(),
      'Extra questions': String(d.extra || '').trim(), 'Group emails': d.group ? 'Yes' : 'No',
    };
    let id = d.id;
    if (id) {
      ownEvent_(c, id);
      updateEvent_(id, fields);
    } else {
      id = nextEventId_();
      appendObjects_(SH.EVENTS, [Object.assign({ 'Event ID': id, 'Coordinator': c.name, 'Coordinator email': c.email, 'Status': 'Draft' }, fields)]);
    }
    replaceSlots_(getEvent_(id), slots, d.date);
    buildForm_(id);
    return eventDetail_(getEvent_(id));
  } finally {
    lock.releaseLock();
  }
}

/** Rewrites an event's slots, keeping slot numbers so existing sign-ups stay attached. */
function replaceSlots_(ev, slots, eventDateKey) {
  const existing = slots_(ev);
  const counts = activeCounts_(ev.id);
  const keep = {};
  slots.forEach(s => { if (s.n) keep[Number(s.n)] = s; });
  existing.forEach(s => {
    const booked = counts[s.n] || 0;
    if (!keep[s.n] && booked) throw new Error(`${booked} ${booked === 1 ? 'person is' : 'people are'} booked for "${s.role}" (${timeRange_(s)}). Remove them first, or keep that slot.`);
    if (keep[s.n] && keep[s.n].spots !== '' && keep[s.n].spots != null && Number(keep[s.n].spots) < booked) {
      throw new Error(`"${s.role}" already has ${booked} people – set at least ${booked} spots.`);
    }
  });
  let max = existing.reduce((m, s) => Math.max(m, s.n || 0), 0);
  deleteRowsWhere_(SH.SLOTS, r => String(r['Event ID']).trim().toUpperCase() === ev.id.toUpperCase());
  appendObjects_(SH.SLOTS, slots.map(s => ({
    'Event ID': ev.id, 'Slot #': s.n ? Number(s.n) : ++max,
    'Date': keyToDate_(/^\d{4}-\d{2}-\d{2}$/.test(String(s.date || '')) ? s.date : eventDateKey),
    'Start': fmtTime_(parseTime_(s.start), 'sheet'), 'End': fmtTime_(parseTime_(s.end), 'sheet'),
    'Role / task': String(s.role).trim(), 'Spots': s.spots === '' || s.spots == null ? '' : Number(s.spots),
    'Description': String(s.desc || '').trim(),
  })));
  syncSignupsToSlots_(getEvent_(ev.id));
}

/** Keeps booked people's role, date and times in step with edited slots. */
function syncSignupsToSlots_(ev) {
  const byN = {};
  slots_(ev).forEach(s => { byN[s.n] = s; });
  const t = getTable_(SH.SIGNUPS);
  t.rows.forEach((r, i) => {
    if (String(r['Event ID']).toUpperCase() !== ev.id.toUpperCase()) return;
    const s = byN[Number(r['Slot #'])];
    if (!s) return;
    const start = s.start == null ? '' : fmtTime_(s.start, 'sheet'), end = s.end == null ? '' : fmtTime_(s.end, 'sheet');
    if (String(r['Role / task']) !== s.role) t.set(i, 'Role / task', s.role);
    if (dateKey_(toDate_(r['Slot date'])) !== dateKey_(s.date)) t.set(i, 'Slot date', s.date);
    if (parseTime_(t.disp[i]['Start']) !== s.start) t.set(i, 'Start', start);
    if (parseTime_(t.disp[i]['End']) !== s.end) t.set(i, 'End', end);
    const h = hoursBetween_(s.start, s.end);
    if (r['Scheduled hours'] !== h) t.set(i, 'Scheduled hours', h);
  });
}

/** Coordinator adds someone (e.g. a walk-up or someone who messaged them). */
function cpAddPerson(key, id, n, p) {
  const c = auth_(key);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ev = ownEvent_(c, id);
    const name = String(p.name || '').trim();
    if (!name) throw new Error('Add their name.');
    const email = String(p.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email address doesn\'t look right.');
    const s = slots_(ev).filter(x => x.n === Number(n))[0];
    if (!s) throw new Error('Can\'t find that slot.');
    if (s.spots != null && (activeCounts_(ev.id)[s.n] || 0) >= s.spots) throw new Error('That slot is full. Add a spot first (Edit event), then add them.');
    const ans = {};
    ans[Q.NAME] = name; ans[Q.EMAIL] = email; ans[Q.PHONE] = String(p.phone || '').trim(); ans[Q.SLOTS] = `(#${s.n})`;
    processSignup_(ev, ans, new Date());
    ensureRefs_();
    return eventDetail_(getEvent_(id));
  } finally {
    lock.releaseLock();
  }
}

/** Coordinator takes someone off a slot. The spot reopens on the form. */
function cpRemove(key, id, ref) {
  const c = auth_(key);
  const ev = ownEvent_(c, id);
  cancelByRef_(ev, ref);
  return eventDetail_(getEvent_(id));
}

function cpAttended(key, id, ref, came) {
  const c = auth_(key);
  const ev = ownEvent_(c, id);
  const t = getTable_(SH.SIGNUPS);
  const i = t.rows.findIndex(r => String(r['Ref']) === String(ref) && String(r['Event ID']).toUpperCase() === ev.id.toUpperCase());
  if (i < 0) throw new Error('Can\'t find that person.');
  t.set(i, 'Attended', came ? 'Yes' : 'No');
  return eventDetail_(ev);
}

/** Move someone from the waitlist into a slot that now has room. */
function cpPromote(key, id, ref) {
  const c = auth_(key);
  const ev = ownEvent_(c, id);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = getTable_(SH.SIGNUPS);
    const i = t.rows.findIndex(r => String(r['Ref']) === String(ref) && String(r['Event ID']).toUpperCase() === ev.id.toUpperCase());
    if (i < 0 || String(t.rows[i]['Status']) !== 'Waitlist') throw new Error('Can\'t find that person on the waitlist.');
    const s = slots_(ev).filter(x => x.n === Number(t.rows[i]['Slot #']))[0];
    if (s && s.spots != null && (activeCounts_(ev.id)[s.n] || 0) >= s.spots) throw new Error('That slot is still full.');
    t.set(i, 'Status', 'Confirmed');
    refreshEventForm_(ev);
  } finally {
    lock.releaseLock();
  }
  return eventDetail_(getEvent_(id));
}

function cpSetOpen(key, id, open) {
  const c = auth_(key);
  const ev = ownEvent_(c, id);
  if (ev.status === 'Done') throw new Error('This event has finished.');
  updateEvent_(ev.id, { 'Status': open ? 'Open' : 'Closed' });
  const fresh = getEvent_(ev.id);
  refreshEventForm_(fresh);
  return eventDetail_(fresh);
}

function cancelByRef_(ev, ref) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = getTable_(SH.SIGNUPS);
    const i = t.rows.findIndex(r => String(r['Ref']) === String(ref) && String(r['Event ID']).toUpperCase() === ev.id.toUpperCase());
    if (i < 0) throw new Error('Can\'t find that booking.');
    if (ACTIVE.indexOf(String(t.rows[i]['Status'])) < 0 && String(t.rows[i]['Status']) !== 'Waitlist') return t.rows[i];
    t.set(i, 'Status', 'Cancelled');
    t.set(i, 'Cancelled on', new Date());
    refreshEventForm_(ev);
    return t.rows[i];
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Volunteer self-service (?x=token) ---------- */

function vmRows_(token) {
  token = String(token || '');
  if (token.length < 24) return [];
  const t = getTable_(SH.SIGNUPS);
  return t.rows.map((r, i) => ({ r, i, disp: t.disp[i] })).filter(x => String(x.r['Manage token']) === token);
}

function vmLoad(token) {
  const rows = vmRows_(token);
  if (!rows.length) throw new Error('This link has expired.');
  const ev = getEvent_(String(rows[0].r['Event ID']));
  const today = todayKey_();
  const st = settings_();
  const logo = logoBlob_(st);
  return {
    name: String(rows[0].r['Name']).split(/\s+/)[0], eventName: ev ? ev.name : String(rows[0].r['Event name']),
    location: ev ? ev.location : '', formUrl: ev && ev.status === 'Open' ? ev.formUrl : '',
    coordinator: ev ? ev.coordinator : '', coordinatorEmail: ev ? (ev.coordinatorEmail || st['Public email']) : st['Public email'],
    logo: logo ? 'data:' + logo.getContentType() + ';base64,' + Utilities.base64Encode(logo.getBytes()) : '',
    pcName: st['P&C name'],
    slots: rows.map(x => {
      const d = toDate_(x.r['Slot date']);
      const s = { date: d, role: String(x.r['Role / task']), start: parseTime_(x.disp['Start']), end: parseTime_(x.disp['End']) };
      return {
        ref: String(x.r['Ref']), dateText: d ? fmtDate_(d, 'EEE d MMM') : '', role: s.role, timeText: timeRange_(s),
        status: String(x.r['Status']), canCancel: (ACTIVE.indexOf(String(x.r['Status'])) >= 0 || String(x.r['Status']) === 'Waitlist') && !!d && dateKey_(d) >= today,
        past: !!d && dateKey_(d) < today,
      };
    }),
  };
}

function vmCancel(token, ref) {
  ensureRefs_();
  const rows = vmRows_(token);
  const x = rows.filter(y => String(y.r['Ref']) === String(ref))[0];
  if (!x) throw new Error('This link has expired.');
  const d = toDate_(x.r['Slot date']);
  if (d && dateKey_(d) < todayKey_()) throw new Error('That shift has already happened.');
  const ev = getEvent_(String(x.r['Event ID']));
  if (!ev) throw new Error('This event no longer exists.');
  const wasActive = ACTIVE.indexOf(String(x.r['Status'])) >= 0;
  cancelByRef_(ev, ref);
  if (wasActive) {
    // Tell the coordinator straight away – this is the one thing they may need to act on.
    const st = settings_();
    const to = ev.coordinatorEmail || st['Admin email'];
    const s = { date: d, role: String(x.r['Role / task']), start: parseTime_(x.disp['Start']), end: parseTime_(x.disp['End']) };
    const waiting = signupsFor_(ev.id).filter(y => Number(y.r['Slot #']) === Number(x.r['Slot #']) && String(y.r['Status']) === 'Waitlist').map(y => String(y.r['Name']));
    const c = coordinators_().filter(k => k.email === String(ev.coordinatorEmail).toLowerCase())[0];
    const url = webAppUrl_();
    if (to) {
      MailApp.sendEmail(clean_({
        to, name: fromName_(st),
        subject: `${x.r['Name']} can no longer help at ${ev.name}`,
        body: `${x.r['Name']} has cancelled their spot:\n${shiftLine_(s)}\n\nThe spot is open again on the sign-up form.` +
          (waiting.length ? `\n\nOn the waitlist for this slot: ${waiting.join(', ')}. Add one of them from your page if you'd like.` : '') +
          (c && url ? `\n\nYour page: ${url}?c=${c.key}` : ''),
      }));
    }
  }
  return vmLoad(token);
}

/* ---------- Coordinator daily updates ---------- */

function coordinatorUpdates_(st) {
  const today = todayKey_();
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const nudgeDays = Number(st['Nudge days before']) || 5;
  const url = webAppUrl_();
  const byCoord = {};
  events_().forEach(ev => {
    if (ev.status === 'Done' || !ev.coordinatorEmail || !ev.date) return;
    const slots = slots_(ev);
    const last = slots.reduce((m, s) => (dateKey_(s.date) > m ? dateKey_(s.date) : m), dateKey_(ev.date));
    if (last < today) return;
    const people = signupsFor_(ev.id);
    const fresh = people.filter(x => x.r['Timestamp'] instanceof Date && x.r['Timestamp'] >= since && String(x.r['Status']) !== 'Cancelled');
    const gone = people.filter(x => x.r['Cancelled on'] instanceof Date && x.r['Cancelled on'] >= since);
    const counts = activeCounts_(ev.id);
    const open = slots.filter(s => s.spots != null && (counts[s.n] || 0) < s.spots && dateKey_(s.date) >= today)
      .map(s => ({ s, left: s.spots - (counts[s.n] || 0) }));
    const daysTo = daysBetween_(today, dateKey_(ev.date));
    const nudge = open.length && daysTo === nudgeDays;
    if (!fresh.length && !gone.length && !nudge) return;
    const lines = [`${ev.name} – ${fmtDate_(ev.date, 'EEE d MMM')}`];
    if (fresh.length) lines.push('New: ' + fresh.map(x => `${x.r['Name']} (${x.r['Role / task']}${x.r['Status'] === 'Waitlist' ? ', waitlist' : ''})`).join(', '));
    if (gone.length) lines.push('Cancelled: ' + gone.map(x => `${x.r['Name']} (${x.r['Role / task']})`).join(', '));
    lines.push(open.length ? 'Still open: ' + open.map(o => `${o.s.role} ${timeRange_(o.s)} – ${o.left}`).join('; ') : 'Every slot is filled.');
    if (nudge) lines.push(`\nStill need a few more? Here's a message you can paste into WhatsApp or the newsletter:\n\n${shareText_(ev, st)}`);
    const k = ev.coordinatorEmail.toLowerCase();
    (byCoord[k] = byCoord[k] || { name: ev.coordinator, events: [] }).events.push(lines.join('\n'));
  });
  const coords = coordinators_();
  Object.keys(byCoord).forEach(email => {
    const g = byCoord[email];
    const c = coords.filter(x => x.email === email && x.active)[0];
    const first = String(g.name || '').split(/\s+/)[0] || 'there';
    MailApp.sendEmail(clean_({
      to: email, name: fromName_(st),
      subject: g.events.length === 1 ? `Volunteer update: ${g.events[0].split(' – ')[0]}` : `Volunteer update: ${g.events.length} events`,
      body: `Hi ${first},\n\nHere's what's changed since yesterday.\n\n${g.events.join('\n\n')}` +
        (c && url ? `\n\nSee everyone and make changes: ${url}?c=${c.key}` : '') + '\n\nThanks for organising.',
    }));
  });
}

/* ============================== Pure helpers (unit-tested) ============================== */

/** Template fill: replaces {Key} with vars.Key; unknown keys are left alone. */
function fill_(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
}

/** Parses "9:00 AM", "9am", "13:30", "9.30pm", "9:00:00 AM" → minutes after midnight. */
function parseTime_(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number' && v >= 0 && v < 1) return Math.round(v * 1440);
  const m = String(v).trim().toLowerCase().replace(/\./g, ':').replace(/\s+/g, ' ')
    .match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|a:m:|p:m:)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3] ? m[3][0] : null;
  if (ap && (h < 1 || h > 12)) return null;
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes → "9:00 AM" (style 'sheet') or "9am" / "9:30am" (default). */
function fmtTime_(mins, style) {
  mins = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60), m = mins % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const ap = h24 < 12 ? 'am' : 'pm';
  if (style === 'sheet') return `${h}:${String(m).padStart(2, '0')} ${ap.toUpperCase()}`;
  return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`;
}

function timeRange_(s) {
  if (s.start == null) return '';
  return s.end == null ? fmtTime_(s.start) : `${fmtTime_(s.start)}–${fmtTime_(s.end)}`;
}

/** Hours between two minute values, to the nearest quarter hour. Overnight shifts wrap. */
function hoursBetween_(start, end) {
  if (start == null || end == null) return '';
  let d = end - start;
  if (d <= 0) d += 1440;
  return Math.round(d / 15) / 4;
}

function sumHours_(list) {
  return list.reduce((a, b) => a + (Number(b) || 0), 0);
}

function fmtHours_(h) {
  const r = Math.round(h * 4) / 4;
  return r === 1 ? '1 hour' : `${r} hours`;
}

/** "Can you bring a plate? [Yes|No]; *T-shirt size" → question specs. */
function parseExtraQuestions_(text) {
  return String(text || '').split(/\n|;/).map(s => s.trim()).filter(Boolean).map(q => {
    let required = false;
    if (q.charAt(0) === '*') { required = true; q = q.slice(1).trim(); }
    let options = null;
    const m = q.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (m) {
      q = m[1].trim();
      options = m[2].split('|').map(o => o.trim()).filter(Boolean);
      if (!options.length) options = null;
    }
    return { title: q, required, options };
  }).filter(x => x.title && STANDARD_TITLES.indexOf(x.title) < 0);
}

/** Pulls "(#3)" slot references out of a checkbox answer. */
function slotNumbersFromAnswer_(answer) {
  const out = [];
  const re = /\(#(\d+)\)/g;
  let m;
  while ((m = re.exec(String(answer || ''))) !== null) {
    const n = Number(m[1]);
    if (out.indexOf(n) < 0) out.push(n);
  }
  return out;
}

function splitList_(s) {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean);
}

function isYes_(v) {
  return /^(y|yes|true|1|on)$/i.test(String(v || '').trim());
}

function numOrNull_(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Drops empty/undefined options so Gmail/MailApp don't reject them. */
function clean_(o) {
  const out = {};
  Object.keys(o).forEach(k => { if (o[k] !== undefined && o[k] !== null && o[k] !== '') out[k] = o[k]; });
  return out;
}

function uniq_(a) { return a.filter((x, i) => a.indexOf(x) === i); }

function pad4_(n) { return n == null ? '9999' : String(n).padStart(4, '0'); }

/** Days from key a to key b (yyyy-MM-dd). */
function daysBetween_(a, b) {
  const p = k => { const x = k.split('-').map(Number); return Date.UTC(x[0], x[1] - 1, x[2]); };
  return Math.round((p(b) - p(a)) / 86400000);
}

function keyToDate_(k) {
  const x = String(k).split('-').map(Number);
  return new Date(x[0], x[1] - 1, x[2]);
}

function addDays_(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(n || 0));
}

/* ============================== Sheet & env helpers ============================== */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function tz_() { return ss_().getSpreadsheetTimeZone(); }

function sheet_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw new Error(`Missing the "${name}" tab – run P&C Roster › Setup / repair first.`);
  return s;
}

function dateKey_(d) { return d ? Utilities.formatDate(d, tz_(), 'yyyy-MM-dd') : ''; }

function todayKey_() { return dateKey_(new Date()); }

function fmtDate_(d, pattern) { return d ? Utilities.formatDate(d, tz_(), pattern) : ''; }

/** Accepts a Date, "yyyy-mm-dd" or a day/month/year string (month first for US-locale sheets). */
function toDate_(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    const us = /^en_US/.test(ss_().getSpreadsheetLocale());
    return us ? new Date(y, +m[1] - 1, +m[2]) : new Date(y, +m[2] - 1, +m[1]);
  }
  return null;
}

/**
 * Reads a tab into row objects keyed by header.
 * t.rows[i][header] = value, t.disp[i][header] = displayed text, t.set(i, header, value) writes back.
 */
function getTable_(name) {
  const sh = sheet_(name);
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const n = Math.max(lastRow - 1, 0);
  const raw = n && lastCol ? sh.getRange(2, 1, n, lastCol).getValues() : [];
  const rawDisp = n && lastCol ? sh.getRange(2, 1, n, lastCol).getDisplayValues() : [];
  const toObj = arr => { const o = {}; headers.forEach((h, i) => { if (h && !(h in o)) o[h] = arr[i]; }); return o; };
  const rows = raw.map(toObj);
  const disp = rawDisp.map(toObj);
  return {
    sh, headers, rows, disp,
    set(i, h, v) {
      const c = headers.indexOf(h);
      if (c < 0) return;
      sh.getRange(i + 2, c + 1).setValue(v);
      rows[i][h] = v;
    },
  };
}

function appendObjects_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const data = objs.map(o => headers.map(h => (h in o && o[h] != null ? o[h] : '')));
  sh.getRange(sh.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
}

function deleteRowsWhere_(name, pred) {
  const t = getTable_(name);
  for (let i = t.rows.length - 1; i >= 0; i--) if (pred(t.rows[i])) t.sh.deleteRow(i + 2);
}

function settings_() {
  const out = {};
  DEFAULT_SETTINGS.forEach(r => { out[r[0]] = r[1]; });
  const sh = ss_().getSheetByName(SH.SETTINGS);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => { if (r[0]) out[String(r[0]).trim()] = r[1]; });
  }
  return out;
}

function wwcRequired_(ev, st) {
  const types = splitList_(st['WWC required for types']).map(x => x.toLowerCase());
  return types.indexOf(String(ev.type).toLowerCase()) >= 0;
}

function colIndex_(sh, header) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).indexOf(header) + 1;
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function setColumnFormat_(sh, header, fmt) {
  const c = colIndex_(sh, header);
  if (c > 0) sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat(fmt);
}

function setValidationList_(sh, header, list) {
  const c = colIndex_(sh, header);
  if (c <= 0 || !list.length) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build();
  sh.getRange(2, c, sh.getMaxRows() - 1, 1).setDataValidation(rule);
}

function hideColumns_(sh, headers) {
  headers.forEach(h => { const c = colIndex_(sh, h); if (c > 0) sh.hideColumns(c); });
}

function filterSheetByEvent_(name, id) {
  const sh = sheet_(name);
  const existing = sh.getFilter();
  if (existing) existing.remove();
  const c = colIndex_(sh, 'Event ID');
  if (c <= 0) return;
  const f = sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), sh.getLastColumn()).createFilter();
  f.setColumnFilterCriteria(c, SpreadsheetApp.newFilterCriteria().whenTextEqualTo(id).build());
}

/** Event ID from the selected row on any tab with an "Event ID" column, or asks. */
function selectedEventId_() {
  const ui = SpreadsheetApp.getUi();
  const sh = ss_().getActiveSheet();
  const r = sh.getActiveRange() ? sh.getActiveRange().getRow() : 0;
  if (r > 1 && sh.getLastColumn()) {
    const c = colIndex_(sh, 'Event ID');
    if (c > 0) {
      const v = String(sh.getRange(r, c).getValue()).trim();
      if (v && getEvent_(v)) return v.toUpperCase();
    }
  }
  const resp = ui.prompt('Which event?', 'Type the Event ID (e.g. EV-003).\nTip: click any cell in the event\'s row on the Events tab first and you won\'t be asked.', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return null;
  const id = resp.getResponseText().trim().toUpperCase();
  if (!getEvent_(id)) { alert_(`Couldn't find ${id} on the Events tab.`); return null; }
  return id;
}

/** Sheet-only actions must not be callable from the public web pages. */
function requireUi_() {
  if (!ui_()) throw new Error('This action is only available from the spreadsheet.');
}

function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }

function alert_(msg) { const ui = ui_(); if (ui) ui.alert(msg); else Logger.log(msg); }

function toast_(msg) { try { ss_().toast(msg, 'P&C Roster', 6); } catch (e) { Logger.log(msg); } }
