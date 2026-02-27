import { describe, it, expect } from "vitest";
import {
  getCalendarDays,
  formatDateForUrl,
  formatMonthYear,
  parseDateFromUrl,
  generateGoogleCalendarUrl,
} from "./date-utils";

describe("date-utils", () => {
  describe("getCalendarDays", () => {
    it("returns array of dates for a calendar month view", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const days = getCalendarDays(date);

      // Calendar should always have complete weeks
      expect(days.length % 7).toBe(0);
      // Should have at least 28 days (4 weeks) and at most 42 days (6 weeks)
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);
    });

    it("includes days from previous and next months to complete weeks", () => {
      const date = new Date(2024, 1, 15); // February 15, 2024
      const days = getCalendarDays(date);

      // First day should be a Sunday (start of week)
      expect(days[0].getDay()).toBe(0);
      // Last day should be a Saturday (end of week)
      expect(days[days.length - 1].getDay()).toBe(6);
    });

    it("handles months starting on Sunday", () => {
      const date = new Date(2024, 8, 1); // September 2024 starts on Sunday
      const days = getCalendarDays(date);

      expect(days.length % 7).toBe(0);
      expect(days[0].getDay()).toBe(0);
    });

    it("handles months ending on Saturday", () => {
      const date = new Date(2024, 7, 31); // August 2024 ends on Saturday
      const days = getCalendarDays(date);

      expect(days.length % 7).toBe(0);
      expect(days[days.length - 1].getDay()).toBe(6);
    });
  });

  describe("formatDateForUrl", () => {
    it("formats date as yyyy-MM-dd", () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(formatDateForUrl(date)).toBe("2024-06-15");
    });

    it("pads single digit months and days", () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateForUrl(date)).toBe("2024-01-05");
    });

    it("handles December correctly", () => {
      const date = new Date(2024, 11, 25); // December 25, 2024
      expect(formatDateForUrl(date)).toBe("2024-12-25");
    });
  });

  describe("formatMonthYear", () => {
    it("formats date as full month name and year", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatMonthYear(date)).toBe("January 2024");
    });

    it("handles all months correctly", () => {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      months.forEach((monthName, index) => {
        const date = new Date(2024, index, 1);
        expect(formatMonthYear(date)).toBe(`${monthName} 2024`);
      });
    });
  });

  describe("parseDateFromUrl", () => {
    it("parses valid date string", () => {
      const result = parseDateFromUrl("2024-06-15");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it("returns null for undefined input", () => {
      expect(parseDateFromUrl(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseDateFromUrl("")).toBeNull();
    });

    it("sets time to midnight", () => {
      const result = parseDateFromUrl("2024-06-15");
      expect(result?.getHours()).toBe(0);
      expect(result?.getMinutes()).toBe(0);
      expect(result?.getSeconds()).toBe(0);
    });
  });

  describe("generateGoogleCalendarUrl", () => {
    it("generates URL with correct base and action", () => {
      const task = {
        title: "Test Task",
        dueDate: null,
        createdAt: new Date(2024, 5, 15),
      };
      const url = generateGoogleCalendarUrl(task);

      expect(url).toContain("https://calendar.google.com/calendar/render");
      expect(url).toContain("action=TEMPLATE");
    });

    it("encodes task title in URL", () => {
      const task = {
        title: "Buy groceries & milk",
        dueDate: null,
        createdAt: new Date(2024, 5, 15),
      };
      const url = generateGoogleCalendarUrl(task);

      expect(url).toContain("text=Buy+groceries+%26+milk");
    });

    it("creates all-day event when dueDate has no time (00:00)", () => {
      const task = {
        title: "All Day Task",
        dueDate: new Date(2024, 5, 15, 0, 0, 0), // Midnight = all-day
        createdAt: new Date(2024, 5, 10),
      };
      const url = generateGoogleCalendarUrl(task);

      // All-day format: YYYYMMDD/YYYYMMDD (next day)
      expect(url).toContain("dates=20240615%2F20240616");
    });

    it("creates timed event when dueDate has time", () => {
      const task = {
        title: "Timed Task",
        dueDate: new Date(2024, 5, 15, 14, 30, 0), // 2:30 PM
        createdAt: new Date(2024, 5, 10),
      };
      const url = generateGoogleCalendarUrl(task);

      // Timed format: YYYYMMDDTHHmmss/YYYYMMDDTHHmmss
      expect(url).toContain("dates=20240615T143000%2F20240615T153000");
    });

    it("uses createdAt when dueDate is null", () => {
      const task = {
        title: "No Due Date Task",
        dueDate: null,
        createdAt: new Date(2024, 5, 10, 0, 0, 0),
      };
      const url = generateGoogleCalendarUrl(task);

      // Should use createdAt as all-day event
      expect(url).toContain("dates=20240610%2F20240611");
    });

    it("creates 1-hour duration for timed events", () => {
      const task = {
        title: "One Hour Meeting",
        dueDate: new Date(2024, 5, 15, 10, 0, 0), // 10:00 AM
        createdAt: new Date(2024, 5, 10),
      };
      const url = generateGoogleCalendarUrl(task);

      // Start: 10:00, End: 11:00 (1 hour later)
      expect(url).toContain("dates=20240615T100000%2F20240615T110000");
    });

    it("handles special characters in title", () => {
      const task = {
        title: "Meeting: Review Q2 Results (Important!)",
        dueDate: null,
        createdAt: new Date(2024, 5, 15),
      };
      const url = generateGoogleCalendarUrl(task);

      // URL should be properly encoded
      expect(url).toContain("text=");
      // Decoding should give back the original title
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get("text")).toBe("Meeting: Review Q2 Results (Important!)");
    });

    it("handles task with midnight time correctly as all-day", () => {
      const task = {
        title: "Deadline",
        dueDate: new Date("2024-06-15T00:00:00"),
        createdAt: new Date(2024, 5, 10),
      };
      const url = generateGoogleCalendarUrl(task);

      // 00:00 should be treated as all-day event
      expect(url).toContain("dates=20240615%2F20240616");
    });
  });
});
