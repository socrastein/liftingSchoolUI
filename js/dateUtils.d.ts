export default dateUtils;
/**
 * The day a calendar week starts on.
 */
export type FirstDayOfWeek = "Monday" | "Sunday";
declare namespace dateUtils {
    export { WEEKDAYS_FROM_SUNDAY as daysOfWeekSun };
    export { WEEKDAYS_FROM_MONDAY as daysOfWeekMon };
    export let hourSlotsArray: number[];
    export { MINUTES_PER_DAY as minutesPerDay };
    export { getDayString };
    export { stringToDate };
    export { dateToString };
    export { isToday };
    export { addDays };
    export { addMonths };
    export { getReadableDateString };
    export { getReadableDayMonthString };
    export { weekRangeStartDate };
    export { getReadableWeekRangeString };
    export { getReadableMonthString };
    export { militaryToMinutes };
    export { militaryToStandard };
    export { currentMinutesFromMidnight };
}
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
declare const WEEKDAYS_FROM_SUNDAY: string[];
/** The shortened weekday names for a week that starts on Monday. */
declare const WEEKDAYS_FROM_MONDAY: string[];
/** How many minutes there are in a day. */
declare const MINUTES_PER_DAY: number;
/**
 * Works out which day of the week a date falls on.
 *
 * @param {Date | string} date A Date or an ISO "YYYY-MM-DD" string.
 * @returns {string} The abbreviated day name, e.g. "Mon".
 */
declare function getDayString(date: Date | string): string;
/**
 * Parses a date string into a date object.
 *
 * @param {string} dateString An ISO "YYYY-MM-DD" string.
 * @returns {Date} That day at local midnight.
 */
declare function stringToDate(dateString: string): Date;
/**
 * Turns a Date into an ISO string, using today when no date is given.
 *
 * @param {Date} [date] The Date to turn into "YYYY-MM-DD"; today when left out.
 * @returns {string} The ISO "YYYY-MM-DD" string for that local day.
 */
declare function dateToString(date?: Date): string;
/**
 * Checks whether a date is today's date.
 *
 * @param {Date | string} date A Date or an ISO "YYYY-MM-DD" string.
 * @returns {boolean} True when the date is today, in the person's own time zone.
 */
declare function isToday(date: Date | string): boolean;
/**
 * Moves a date by a number of days.
 *
 * @param {Date | string} date The date to start from; it is not changed.
 * @param {number} add The number of days to add, or a negative number to subtract.
 * @returns {Date} A new Date that many days later (or earlier), keeping its time of day.
 */
declare function addDays(date: Date | string, add: number): Date;
/**
 * Moves a date by a number of months. When the day does not exist in the month it lands in, it becomes that month's last day:
 * January 31 plus one month is February 28 (or 29 in a leap year), not March 3.
 *
 * @param {Date | string} date The date to start from; it is not changed.
 * @param {number} add The number of months to add, or a negative number to subtract.
 * @returns {Date} A new Date that many months later (or earlier).
 */
declare function addMonths(date: Date | string, add: number): Date;
/**
 * Formats a date with a shortened month.
 *
 * @param {Date | string} date The date to format.
 * @returns {string} For example "Apr 5, 2026".
 */
declare function getReadableDateString(date: Date | string): string;
/**
 * Formats a date as its weekday, then its short month and day.
 *
 * @param {Date | string} date The date to format.
 * @returns {string} For example "Fri | Oct 9".
 */
declare function getReadableDayMonthString(date: Date | string): string;
/**
 * Finds the first day of the week a date belongs to.
 *
 * @param {Date | string} date Any date in the week.
 * @param {FirstDayOfWeek} firstDayOfWeek Whether weeks start on Monday or on Sunday.
 * @returns {Date} A new Date for that week's first day, keeping the given date's time of day.
 */
declare function weekRangeStartDate(date: Date | string, firstDayOfWeek: FirstDayOfWeek): Date;
/**
 * Formats the whole week a date is in, from its first day to its last.
 *
 * @param {Date | string} date Any date in the week.
 * @param {FirstDayOfWeek} firstDayOfWeek Whether weeks start on Monday or on Sunday.
 * @returns {string} For example "Apr 6 - Apr 12, 2026"; the year comes once, after the last day.
 */
declare function getReadableWeekRangeString(date: Date | string, firstDayOfWeek: FirstDayOfWeek): string;
/**
 * Formats the month a date is in, written out in full.
 *
 * @param {Date | string} date Any date in the month.
 * @returns {string} For example "April 2026".
 */
declare function getReadableMonthString(date: Date | string): string;
/**
 * Counts how far into the day a time is.
 *
 * @param {string} timeString A 24-hour time such as "14:00".
 * @returns {number} The minutes since midnight, e.g. 840 for "14:00".
 */
declare function militaryToMinutes(timeString: string): number;
/**
 * Writes a 24-hour time as a 12-hour one with AM or PM.
 *
 * @param {string} timeString A 24-hour time such as "14:00".
 * @returns {string} For example "2:00 PM". The space before AM or PM is whatever the browser's English locale uses, which a
 *   newer one makes a narrow no-break space; compare with a pattern, not a typed space.
 */
declare function militaryToStandard(timeString: string): string;
/**
 * Counts how far into today it is right now.
 *
 * @returns {number} The minutes since 12:00 AM today.
 */
declare function currentMinutesFromMidnight(): number;
