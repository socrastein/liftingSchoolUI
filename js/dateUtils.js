/**
 * Date and time helpers shared by every site and app of the business, used as `dateUtils.addDays(date, 7)`.
 *
 * Dates are handled as local calendar days: a "YYYY-MM-DD" string means that day in the person's own time zone (never midnight
 * UTC, which can fall on the day before), and every function that takes a date takes either a Date or such a string. Nothing
 * here changes the Date it is given; the functions that move a date return a new one.
 *
 * Month and weekday names come out in English (the "en-CA" and "en-US" locales), as the pages they appear on are written.
 */

/** The shortened weekday names, in the order `Date.getDay()` numbers them: 0 is Sunday. */
const WEEKDAYS_FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The shortened weekday names for a week that starts on Monday. */
const WEEKDAYS_FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** How many minutes there are in a day. */
const MINUTES_PER_DAY = 24 * 60;

/** How many hours there are in a day. */
const HOURS_PER_DAY = 24;

/**
 * @typedef {"Monday" | "Sunday"} FirstDayOfWeek The day a calendar week starts on.
 */

/**
 * The start of each hour of the day as minutes since midnight: 0, 60, 120 … 1380.
 *
 * @returns {number[]} Twenty-four numbers, one per hour.
 */
function buildHourSlots() {
  const slots = [];
  for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
    slots.push(hour * 60);
  }
  return slots;
}

/**
 * Parses a date string into a date object.
 *
 * @param {string} dateString An ISO "YYYY-MM-DD" string.
 * @returns {Date} That day at local midnight.
 */
function stringToDate(dateString) {
  const [year, month, day] = /** @type {[number, number, number]} */ (dateString.split("-").map(Number));
  return new Date(year, month - 1, day);
}

/**
 * Turns either kind of date into a Date.
 *
 * @param {Date | string} date A Date, or an ISO "YYYY-MM-DD" string.
 * @returns {Date} The same Date when given one (not a copy), or the string's day at local midnight.
 */
function toDate(date) {
  return typeof date === "string" ? stringToDate(date) : date;
}

/**
 * Turns a Date into an ISO string, using today when no date is given.
 *
 * @param {Date} [date] The Date to turn into "YYYY-MM-DD"; today when left out.
 * @returns {string} The ISO "YYYY-MM-DD" string for that local day.
 */
function dateToString(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

/**
 * Works out which day of the week a date falls on.
 *
 * @param {Date | string} date A Date or an ISO "YYYY-MM-DD" string.
 * @returns {string} The abbreviated day name, e.g. "Mon".
 */
function getDayString(date) {
  // getDay() is always 0 to 6, so the name is always there
  return /** @type {string} */ (WEEKDAYS_FROM_SUNDAY[toDate(date).getDay()]);
}

/**
 * Checks whether a date is today's date.
 *
 * @param {Date | string} date A Date or an ISO "YYYY-MM-DD" string.
 * @returns {boolean} True when the date is today, in the person's own time zone.
 */
function isToday(date) {
  const dateString = date instanceof Date ? dateToString(date) : date;
  return dateString === dateToString(new Date());
}

/**
 * Moves a date by a number of days.
 *
 * @param {Date | string} date The date to start from; it is not changed.
 * @param {number} add The number of days to add, or a negative number to subtract.
 * @returns {Date} A new Date that many days later (or earlier), keeping its time of day.
 */
function addDays(date, add) {
  const dateCopy = new Date(toDate(date));
  dateCopy.setDate(dateCopy.getDate() + add);
  return dateCopy;
}

/**
 * Moves a date by a number of months. When the day does not exist in the month it lands in, it becomes that month's last day:
 * January 31 plus one month is February 28 (or 29 in a leap year), not March 3.
 *
 * @param {Date | string} date The date to start from; it is not changed.
 * @param {number} add The number of months to add, or a negative number to subtract.
 * @returns {Date} A new Date that many months later (or earlier).
 */
function addMonths(date, add) {
  const dateCopy = new Date(toDate(date));
  const dayOfMonth = dateCopy.getDate();
  // Park on the 1st while the month changes, so a 31st never spills into the month after
  dateCopy.setDate(1);
  dateCopy.setMonth(dateCopy.getMonth() + add);
  const lastDayOfMonth = new Date(dateCopy.getFullYear(), dateCopy.getMonth() + 1, 0).getDate();
  dateCopy.setDate(Math.min(dayOfMonth, lastDayOfMonth));
  return dateCopy;
}

/**
 * Formats a date with a shortened month.
 *
 * @param {Date | string} date The date to format.
 * @returns {string} For example "Apr 5, 2026".
 */
function getReadableDateString(date) {
  return toDate(date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Formats a date as its weekday, then its short month and day.
 *
 * @param {Date | string} date The date to format.
 * @returns {string} For example "Fri | Oct 9".
 */
function getReadableDayMonthString(date) {
  const dayString = getDayString(date);
  const monthDayString = toDate(date).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return `${dayString} | ${monthDayString}`;
}

/**
 * Finds the first day of the week a date belongs to.
 *
 * @param {Date | string} date Any date in the week.
 * @param {FirstDayOfWeek} firstDayOfWeek Whether weeks start on Monday or on Sunday.
 * @returns {Date} A new Date for that week's first day, keeping the given date's time of day.
 */
function weekRangeStartDate(date, firstDayOfWeek) {
  const datePart = toDate(date);
  const firstDayIndex = firstDayOfWeek === "Monday" ? 1 : 0;
  const daysFromStart = (datePart.getDay() - firstDayIndex + 7) % 7;

  const startDate = new Date(datePart);
  startDate.setDate(datePart.getDate() - daysFromStart);
  return startDate;
}

/**
 * Formats the whole week a date is in, from its first day to its last.
 *
 * @param {Date | string} date Any date in the week.
 * @param {FirstDayOfWeek} firstDayOfWeek Whether weeks start on Monday or on Sunday.
 * @returns {string} For example "Apr 6 - Apr 12, 2026"; the year comes once, after the last day.
 */
function getReadableWeekRangeString(date, firstDayOfWeek) {
  const startDate = weekRangeStartDate(date, firstDayOfWeek);
  const endDate = addDays(startDate, 6);

  const startString = startDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const endString = endDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  return `${startString} - ${endString}`;
}

/**
 * Formats the month a date is in, written out in full.
 *
 * @param {Date | string} date Any date in the month.
 * @returns {string} For example "April 2026".
 */
function getReadableMonthString(date) {
  return toDate(date).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

/**
 * Splits a 24-hour time into its hours and minutes.
 *
 * @param {string} timeString A 24-hour time such as "14:00".
 * @returns {[number, number]} The hours, then the minutes.
 */
function splitTime(timeString) {
  return /** @type {[number, number]} */ (timeString.split(":").map(Number));
}

/**
 * Counts how far into the day a time is.
 *
 * @param {string} timeString A 24-hour time such as "14:00".
 * @returns {number} The minutes since midnight, e.g. 840 for "14:00".
 */
function militaryToMinutes(timeString) {
  const [hours, minutes] = splitTime(timeString);
  return hours * 60 + minutes;
}

/**
 * Writes a 24-hour time as a 12-hour one with AM or PM.
 *
 * @param {string} timeString A 24-hour time such as "14:00".
 * @returns {string} For example "2:00 PM". The space before AM or PM is whatever the browser's English locale uses, which a
 *   newer one makes a narrow no-break space; compare with a pattern, not a typed space.
 */
function militaryToStandard(timeString) {
  const [hours, minutes] = splitTime(timeString);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Counts how far into today it is right now.
 *
 * @returns {number} The minutes since 12:00 AM today.
 */
function currentMinutesFromMidnight() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** The date and time helpers; each is described where it is defined above. */
const dateUtils = {
  /** The shortened weekday names starting with Sunday. */
  daysOfWeekSun: WEEKDAYS_FROM_SUNDAY,
  /** The shortened weekday names starting with Monday. */
  daysOfWeekMon: WEEKDAYS_FROM_MONDAY,
  /** The start of each hour of the day in minutes since midnight: 0, 60 … 1380. */
  hourSlotsArray: buildHourSlots(),
  /** How many minutes there are in a day: 1440. */
  minutesPerDay: MINUTES_PER_DAY,
  getDayString,
  stringToDate,
  dateToString,
  isToday,
  addDays,
  addMonths,
  getReadableDateString,
  getReadableDayMonthString,
  weekRangeStartDate,
  getReadableWeekRangeString,
  getReadableMonthString,
  militaryToMinutes,
  militaryToStandard,
  currentMinutesFromMidnight,
};

export default dateUtils;
