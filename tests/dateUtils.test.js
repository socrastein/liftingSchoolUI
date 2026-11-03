import { describe, it, expect, vi, afterEach } from "vitest";
import dateUtils from "../js/dateUtils.js";

/**
 * Dates are local calendar days: "YYYY-MM-DD" strings mean that day in the person's own time zone, every function takes a Date
 * or such a string, and the ones that move a date return a new one. The expected values are written by hand from the calendar
 * (April 5, 2026 is a Sunday; October 9, 2026 a Friday).
 */

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Pretends it is a given moment, in the local time zone.
 * @param {number} year
 * @param {number} monthIndex 0 for January
 * @param {number} day
 * @param {number} [hours]
 * @param {number} [minutes]
 */
function setNow(year, monthIndex, day, hours = 12, minutes = 0) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(year, monthIndex, day, hours, minutes));
}

describe("the constants", () => {
  it("lists the weekdays from Sunday, as Date.getDay() numbers them, and from Monday", () => {
    expect(dateUtils.daysOfWeekSun).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(dateUtils.daysOfWeekMon).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("has the start of each of the 24 hours in minutes since midnight", () => {
    expect(dateUtils.hourSlotsArray).toHaveLength(24);
    expect(dateUtils.hourSlotsArray[0]).toBe(0);
    expect(dateUtils.hourSlotsArray[1]).toBe(60);
    expect(dateUtils.hourSlotsArray[23]).toBe(1380);
  });

  it("knows a day has 1440 minutes", () => {
    expect(dateUtils.minutesPerDay).toBe(1440);
  });
});

describe("stringToDate", () => {
  it("is that day at local midnight, not midnight UTC", () => {
    const date = dateUtils.stringToDate("2026-04-05");

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 3, 5]);
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });
});

describe("dateToString", () => {
  it("writes the local day as YYYY-MM-DD, with zeros kept", () => {
    expect(dateUtils.dateToString(new Date(2026, 3, 5))).toBe("2026-04-05");
  });

  it("uses today when no date is given", () => {
    setNow(2026, 10, 3);

    expect(dateUtils.dateToString()).toBe("2026-11-03");
  });

  it("round-trips with stringToDate", () => {
    expect(dateUtils.dateToString(dateUtils.stringToDate("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("isToday", () => {
  it("is true for today as a Date or as a string, whatever the time of day", () => {
    setNow(2026, 10, 3, 23, 59);

    expect(dateUtils.isToday(new Date(2026, 10, 3, 0, 0))).toBe(true);
    expect(dateUtils.isToday("2026-11-03")).toBe(true);
  });

  it("is false for yesterday and tomorrow", () => {
    setNow(2026, 10, 3);

    expect(dateUtils.isToday("2026-11-02")).toBe(false);
    expect(dateUtils.isToday(new Date(2026, 10, 4))).toBe(false);
  });
});

describe("getDayString", () => {
  it("names the weekday of a Date or a string", () => {
    expect(dateUtils.getDayString("2026-04-05")).toBe("Sun");
    expect(dateUtils.getDayString(new Date(2026, 9, 9))).toBe("Fri");
  });
});

describe("addDays", () => {
  it("adds days across a month end, and subtracts with a negative number", () => {
    expect(dateUtils.dateToString(dateUtils.addDays("2026-01-30", 3))).toBe("2026-02-02");
    expect(dateUtils.dateToString(dateUtils.addDays("2026-03-01", -1))).toBe("2026-02-28");
  });

  it("crosses a year end", () => {
    expect(dateUtils.dateToString(dateUtils.addDays("2026-12-31", 1))).toBe("2027-01-01");
  });

  it("returns a new Date and leaves the one it was given alone", () => {
    const original = new Date(2026, 3, 5);

    const later = dateUtils.addDays(original, 7);

    expect(later).not.toBe(original);
    expect(dateUtils.dateToString(original)).toBe("2026-04-05");
  });
});

describe("addMonths", () => {
  it("adds months, and subtracts with a negative number", () => {
    expect(dateUtils.dateToString(dateUtils.addMonths("2026-04-15", 2))).toBe("2026-06-15");
    expect(dateUtils.dateToString(dateUtils.addMonths("2026-04-15", -3))).toBe("2026-01-15");
  });

  it("lands on the last day of a shorter month: January 31 plus one month is February 28", () => {
    expect(dateUtils.dateToString(dateUtils.addMonths("2026-01-31", 1))).toBe("2026-02-28");
  });

  it("knows a leap year: January 31 plus one month is February 29 in 2028", () => {
    expect(dateUtils.dateToString(dateUtils.addMonths("2028-01-31", 1))).toBe("2028-02-29");
  });

  it("crosses a year end in either direction", () => {
    expect(dateUtils.dateToString(dateUtils.addMonths("2026-11-30", 3))).toBe("2027-02-28");
    expect(dateUtils.dateToString(dateUtils.addMonths("2026-01-15", -1))).toBe("2025-12-15");
  });

  it("returns a new Date and leaves the one it was given alone", () => {
    const original = new Date(2026, 0, 31);

    dateUtils.addMonths(original, 1);

    expect(dateUtils.dateToString(original)).toBe("2026-01-31");
  });
});

describe("the readable formats", () => {
  it("getReadableDateString: a shortened month, the day and the year", () => {
    expect(dateUtils.getReadableDateString("2026-04-05")).toBe("Apr 5, 2026");
  });

  it("getReadableDayMonthString: the weekday, then the short month and day", () => {
    expect(dateUtils.getReadableDayMonthString("2026-10-09")).toBe("Fri | Oct 9");
  });

  it("getReadableMonthString: the month in full and the year", () => {
    expect(dateUtils.getReadableMonthString("2026-04-15")).toBe("April 2026");
  });

  it("accept a Date as well as a string", () => {
    expect(dateUtils.getReadableDateString(new Date(2026, 3, 5))).toBe("Apr 5, 2026");
  });
});

describe("weeks", () => {
  it("weekRangeStartDate: the Monday of a Wednesday's week, when weeks start on Monday", () => {
    expect(dateUtils.dateToString(dateUtils.weekRangeStartDate("2026-04-08", "Monday"))).toBe("2026-04-06");
  });

  it("weekRangeStartDate: the Sunday before, when weeks start on Sunday", () => {
    expect(dateUtils.dateToString(dateUtils.weekRangeStartDate("2026-04-08", "Sunday"))).toBe("2026-04-05");
  });

  it("weekRangeStartDate: a Sunday belongs to the Monday-week that began six days earlier", () => {
    expect(dateUtils.dateToString(dateUtils.weekRangeStartDate("2026-04-12", "Monday"))).toBe("2026-04-06");
  });

  it("weekRangeStartDate: the first day of the week is its own start", () => {
    expect(dateUtils.dateToString(dateUtils.weekRangeStartDate("2026-04-06", "Monday"))).toBe("2026-04-06");
    expect(dateUtils.dateToString(dateUtils.weekRangeStartDate("2026-04-05", "Sunday"))).toBe("2026-04-05");
  });

  it("getReadableWeekRangeString: the first to the last day, the year once at the end", () => {
    expect(dateUtils.getReadableWeekRangeString("2026-04-08", "Monday")).toBe("Apr 6 - Apr 12, 2026");
    expect(dateUtils.getReadableWeekRangeString("2026-04-08", "Sunday")).toBe("Apr 5 - Apr 11, 2026");
  });

  it("getReadableWeekRangeString: a week over a month end names both months", () => {
    expect(dateUtils.getReadableWeekRangeString("2026-04-30", "Monday")).toBe("Apr 27 - May 3, 2026");
  });
});

describe("times of day", () => {
  it("militaryToMinutes: the minutes since midnight", () => {
    expect(dateUtils.militaryToMinutes("00:00")).toBe(0);
    expect(dateUtils.militaryToMinutes("14:00")).toBe(840);
    expect(dateUtils.militaryToMinutes("23:59")).toBe(1439);
  });

  it("militaryToStandard: a 12-hour time with AM or PM", () => {
    // The space before AM/PM is a narrow no-break space in newer browsers, so spaces of any kind are matched as one
    expect(dateUtils.militaryToStandard("14:00").replace(/\s/g, " ")).toBe("2:00 PM");
    expect(dateUtils.militaryToStandard("00:30").replace(/\s/g, " ")).toBe("12:30 AM");
    expect(dateUtils.militaryToStandard("09:05").replace(/\s/g, " ")).toBe("9:05 AM");
  });

  it("currentMinutesFromMidnight: how far into today it is now", () => {
    setNow(2026, 10, 3, 14, 5);

    expect(dateUtils.currentMinutesFromMidnight()).toBe(845);
  });
});
