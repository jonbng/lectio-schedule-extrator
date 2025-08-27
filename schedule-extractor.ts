import { readFileSync } from "fs";
import { JSDOM } from "jsdom";

// Simple timing utility for debugging performance
interface TimingRecord {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class Timer {
  private records: TimingRecord[] = [];

  start(name: string): void {
    this.records.push({
      name,
      startTime: performance.now(),
    });
  }

  end(name: string): number {
    const record = this.records.find((r) => r.name === name && !r.endTime);
    if (record) {
      record.endTime = performance.now();
      record.duration = record.endTime - record.startTime;
      return record.duration;
    }
    return 0;
  }

  getSummary(): string {
    const completed = this.records.filter((r) => r.duration !== undefined);
    let summary = "\n🕐 TIMING SUMMARY\n";
    summary += "═══════════════════════════════════════\n";

    let totalTime = 0;
    completed.forEach((record) => {
      const duration = record.duration!;
      totalTime += duration;
      summary += `${record.name}: ${duration.toFixed(2)}ms\n`;
    });

    summary += `──────────────────────────────────────\n`;
    summary += `Total Time: ${totalTime.toFixed(2)}ms\n`;
    summary += "═══════════════════════════════════════\n";

    return summary;
  }

  reset(): void {
    this.records = [];
  }
}

export interface Teacher {
  name: string;
  initials: string;
  id?: string;
}

export interface Room {
  name: string;
}

export interface Subject {
  name: string;
  code: string;
  id?: string;
}

export interface Homework {
  description: string;
}

export interface ScheduleItem {
  id?: string;
  activityId?: string;
  subject: Subject;
  teacher: Teacher;
  room: Room;
  startTime: string;
  endTime: string;
  date: string;
  module: number;
  status: "normal" | "changed" | "cancelled";
  homework?: Homework[];
  notes?: string;
  title?: string;
  topic?: string;
  type: "class" | "event" | "deadline";
}

export interface DaySchedule {
  date: string;
  dayName: string;
  items: ScheduleItem[];
  isWeekend?: boolean;
}

export interface WeekSchedule {
  weekNumber: number;
  year: number;
  weekRange: string;
  student: {
    name: string;
    class: string;
  };
  school: string;
  days: DaySchedule[];
  modules: {
    number: number;
    name: string;
    timeRange: string;
  }[];
  studentGroups: {
    subjects: string[];
    involvedGroups: string[];
    ownGroups: string[];
  };
  summary: {
    totalClasses: number;
    totalHomework: number;
    changedClasses: number;
    cancelledClasses: number;
    specialEvents: number;
    deadlines: number;
  };
}

export class LectioScheduleExtractor {
  private dom: JSDOM;
  private document: Document;
  private timer: Timer;

  constructor(htmlContent: string) {
    this.timer = new Timer();
    this.timer.start("dom-parsing");
    this.dom = new JSDOM(htmlContent);
    this.document = this.dom.window.document;
    this.timer.end("dom-parsing");
  }

  public extractSchedule(): WeekSchedule {
    this.timer.start("extraction-total");

    this.timer.start("extract-week-info");
    const weekInfo = this.extractWeekInfo();
    this.timer.end("extract-week-info");

    this.timer.start("extract-student-info");
    const studentInfo = this.extractStudentInfo();
    this.timer.end("extract-student-info");

    this.timer.start("extract-school-info");
    const schoolInfo = this.extractSchoolInfo();
    this.timer.end("extract-school-info");

    this.timer.start("extract-modules");
    const modules = this.extractModules();
    this.timer.end("extract-modules");

    this.timer.start("extract-days");
    const days = this.extractDays();
    this.timer.end("extract-days");

    this.timer.start("extract-student-groups");
    const studentGroups = this.extractStudentGroups();
    this.timer.end("extract-student-groups");

    this.timer.start("generate-summary");
    const summary = this.generateSummary(days);
    this.timer.end("generate-summary");

    this.timer.end("extraction-total");

    console.log(this.timer.getSummary());

    return {
      weekNumber: weekInfo.weekNumber,
      year: weekInfo.year,
      weekRange: weekInfo.weekRange,
      student: studentInfo,
      school: schoolInfo,
      days,
      modules,
      studentGroups,
      summary,
    };
  }

  public getTimingSummary(): string {
    return this.timer.getSummary();
  }

  private extractWeekInfo() {
    const weekHeader = this.document.querySelector(".s2weekHeader td");
    const weekText = weekHeader?.textContent?.trim() || "";
    const weekMatch = weekText.match(/Uge (\d+) - (\d+)/);
    const weekNumber = weekMatch ? parseInt(weekMatch[1]) : 0;
    const year = weekMatch ? parseInt(weekMatch[2]) : 0;
    const datePicker = this.document.querySelector(
      "#s_m_Content_Content_SkemaMedNavigation_datePicker_tb"
    );
    const weekRange = datePicker?.getAttribute("value") || weekText;
    return { weekNumber, year, weekRange };
  }

  private extractStudentInfo() {
    const title = this.document.querySelector("title")?.textContent || "";
    const match = title.match(/(.+?)\(k\), (.+?) - Skema/);
    return match
      ? {
          name: match[1].trim(),
          class: match[2].trim(),
        }
      : { name: "", class: "" };
  }

  private extractSchoolInfo(): string {
    return (
      this.document
        .querySelector(".ls-master-header-institution-name")
        ?.textContent?.trim() || ""
    );
  }

  private extractModules() {
    const modules: { number: number; name: string; timeRange: string }[] = [];
    const moduleElements = this.document.querySelectorAll(".s2module-info");

    moduleElements.forEach((element, index) => {
      const content = element.querySelector("div");
      if (content) {
        const text = content.innerHTML.replace(/<br\s*\/?>/gi, "\n").trim();
        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);
        if (lines.length >= 2) {
          modules.push({
            number: index + 1,
            name: lines[0],
            timeRange: lines[1],
          });
        }
      }
    });
    return modules;
  }

  private extractDays(): DaySchedule[] {
    const days: DaySchedule[] = [];
    const dayHeaders = this.document.querySelectorAll(".s2dayHeader td");
    const dayColumns = this.document.querySelectorAll("td[data-date]");

    for (let i = 1; i < dayHeaders.length; i++) {
      const dayHeader = dayHeaders[i];
      const dayText = dayHeader.textContent?.trim() || "";

      if (dayText) {
        const dateMatch = dayText.match(/(\w+) \((\d+\/\d+)\)/);
        if (dateMatch) {
          let dayName = dateMatch[1];
          const date = dateMatch[2];

          if (dayName === "rdag") dayName = "Lørdag";
          if (dayName === "ndag") dayName = "Søndag";

          const dayColumn = dayColumns[i - 1];
          const items = dayColumn ? this.extractDayItems(dayColumn, date) : [];
          const infoHeaderEvents = this.extractInfoHeaderEvents(i);
          items.push(...infoHeaderEvents);

          const isWeekend = dayName === "Lørdag" || dayName === "Søndag";

          days.push({ date, dayName, items, isWeekend });
        }
      }
    }
    return days;
  }

  private extractDayItems(dayColumn: Element, date: string): ScheduleItem[] {
    const items: ScheduleItem[] = [];
    if (!dayColumn) return items;

    const scheduleBlocks = dayColumn.querySelectorAll(".s2skemabrik");
    scheduleBlocks.forEach((block) => {
      const item = this.parseScheduleBlock(block, date);
      if (item) items.push(item);
    });
    return items;
  }

  private parseScheduleBlock(
    block: Element,
    dayDate: string
  ): ScheduleItem | null {
    const tooltip = block.getAttribute("data-tooltip");
    if (!tooltip) return null;

    const lines = tooltip
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    let startTime = "",
      endTime = "",
      date = dayDate,
      subjectName = "",
      teacherName = "",
      teacherInitials = "",
      roomName = "",
      notes = "",
      title = "",
      topic = "";
    let status: "normal" | "changed" | "cancelled" = "normal";
    let homework: Homework[] = [];
    let type: "class" | "event" | "deadline" = "class";

    const activityId = block.getAttribute("data-brikid") || undefined;

    if (block.classList.contains("s2changed")) status = "changed";
    else if (block.classList.contains("s2cancelled")) status = "cancelled";

    const isSpecialEvent = lines.some(
      (line) =>
        line.toLowerCase().includes("dag") &&
        !line.includes("Hold:") &&
        (line.includes("Idrætsdag") ||
          line.includes("weekend") ||
          line.includes("Hele dagen"))
    );

    if (isSpecialEvent) {
      type = "event";
      title = lines[0] || "";
      subjectName = title;
    }

    if (
      lines.length > 0 &&
      !lines[0].includes("til") &&
      !lines[0].includes("/") &&
      !lines[0].includes("Hold:") &&
      !lines[0].includes("Lærer:") &&
      !lines[0].includes("Lokale:")
    ) {
      const potentialTopic = lines[0];
      if (potentialTopic.length > 3 && !potentialTopic.includes(":")) {
        topic = potentialTopic;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const timeMatch = line.match(
        /(\d+\/\d+-\d+)\s+(\d+:\d+)\s+til\s+(?:(\d+\/\d+-\d+)\s+)?(\d+:\d+)/
      );
      if (timeMatch) {
        if (timeMatch[1]) date = timeMatch[1];
        startTime = timeMatch[2];
        endTime = timeMatch[4];
        continue;
      }

      if (line.includes("Hele dagen")) {
        startTime = "";
        endTime = "Hele dagen";
        if (i > 0) title = lines[i - 1];
        type = "event";
        continue;
      }

      if (line.startsWith("Hold:")) {
        subjectName = line.replace("Hold:", "").trim();
        continue;
      }

      const teacherMatch = line.match(/Lærer:\s*(.+?)\s*\((.+?)\)/);
      if (teacherMatch) {
        teacherName = teacherMatch[1];
        teacherInitials = teacherMatch[2];
        continue;
      }

      if (line.startsWith("Lokale:")) {
        roomName = line.replace("Lokale:", "").trim();
        continue;
      }

      if (line.includes("Lektier:")) {
        for (let j = i + 1; j < lines.length; j++) {
          const homeworkLine = lines[j];
          if (homeworkLine.startsWith("-")) {
            homework.push({ description: homeworkLine.substring(1).trim() });
          } else if (
            homeworkLine.includes("Note:") ||
            homeworkLine.includes("Lærer:") ||
            homeworkLine.includes("Lokale:")
          ) {
            break;
          }
        }
        continue;
      }

      if (line.includes("Note:")) {
        notes = lines
          .slice(i + 1)
          .join(" ")
          .trim();
        break;
      }
    }

    const content = block.querySelector(".s2skemabrikcontent");
    if (content && !subjectName) {
      const contentText = content.textContent?.trim() || "";
      const parts = contentText.split("•").map((part) => part.trim());

      if (parts.length >= 3) {
        subjectName = parts[0];
        teacherInitials = parts[1];
        roomName = parts[2];
        if (parts.length > 3) topic = parts.slice(3).join(" ");
      } else if (parts.length === 1 && type === "event") {
        title = parts[0];
        subjectName = parts[0];
      }

      const topicSpan = content.querySelector("span[style*='word-wrap']");
      if (topicSpan && !topic) {
        topic = topicSpan.textContent?.trim() || "";
      }
    }

    const timelineElement = block.querySelector(".s2timeline");
    if (timelineElement) {
      const timelineText = timelineElement.textContent?.trim() || "";
      if (timelineText.includes("-")) {
        const [start, end] = timelineText.split("-");
        startTime = start.trim();
        endTime = end.trim();
      }
      type = "event";
    }

    const styleAttr = block.getAttribute("style") || "";
    const topMatch = styleAttr.match(/top:\s*(\d+\.?\d*)em/);
    let module = 0;
    if (topMatch) {
      const topValue = parseFloat(topMatch[1]);
      if (topValue < 2) module = 1;
      else if (topValue < 9) module = 2;
      else if (topValue < 18) module = 3;
      else if (topValue < 25) module = 4;
      else module = 5;
    }

    return {
      activityId,
      subject: { name: subjectName, code: subjectName },
      teacher: { name: teacherName, initials: teacherInitials },
      room: { name: roomName },
      startTime,
      endTime,
      date,
      module,
      status,
      homework: homework.length > 0 ? homework : undefined,
      notes: notes || undefined,
      title: title || undefined,
      topic: topic || undefined,
      type,
    };
  }

  private extractInfoHeaderEvents(dayIndex: number): ScheduleItem[] {
    const events: ScheduleItem[] = [];
    const infoRows = this.document.querySelectorAll(".s2infoHeader");

    if (infoRows.length > dayIndex) {
      const dayInfoHeader = infoRows[dayIndex];
      const eventBlocks = dayInfoHeader.querySelectorAll(".s2skemabrik");

      eventBlocks.forEach((block) => {
        const tooltip = block.getAttribute("data-tooltip");
        if (tooltip) {
          const lines = tooltip
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line);

          if (lines.length > 0) {
            const titleLine = lines[0];
            let type: "class" | "event" | "deadline" = "event";

            if (
              titleLine.toLowerCase().includes("frist") ||
              titleLine.toLowerCase().includes("deadline") ||
              tooltip.includes("Hele dagen")
            ) {
              type = "deadline";
            }

            let date = "",
              startTime = "",
              endTime = "";
            const dateMatch = tooltip.match(/(\d+\/\d+-\d+)\s+(.*)/);
            if (dateMatch) {
              date = dateMatch[1];
              if (tooltip.includes("Hele dagen")) {
                endTime = "Hele dagen";
              }
            }

            events.push({
              title: titleLine,
              subject: { name: titleLine, code: titleLine },
              teacher: { name: "", initials: "" },
              room: { name: "" },
              startTime,
              endTime,
              date,
              module: 0,
              status: "normal",
              type,
            });
          }
        }
      });
    }
    return events;
  }

  private extractStudentGroups() {
    const subjects: string[] = [];
    const involvedGroups: string[] = [];
    const ownGroups: string[] = [];

    const holdRows = this.document.querySelectorAll(
      "#s_m_Content_Content_holdElementLinkList tr"
    );
    holdRows.forEach((row) => {
      const header = row.querySelector("th");
      const links = row.querySelectorAll("a");

      if (header && links.length > 0) {
        const headerText = header.textContent?.trim() || "";
        links.forEach((link) => {
          const text = link.textContent?.trim() || "";
          if (headerText.includes("Hold:")) subjects.push(text);
          else if (headerText.includes("Indb. grupper:"))
            involvedGroups.push(text);
          else if (headerText.includes("Egne grupper:")) ownGroups.push(text);
        });
      }
    });
    return { subjects, involvedGroups, ownGroups };
  }

  private generateSummary(days: DaySchedule[]) {
    let totalClasses = 0,
      totalHomework = 0,
      changedClasses = 0,
      cancelledClasses = 0,
      specialEvents = 0,
      deadlines = 0;

    days.forEach((day) => {
      day.items.forEach((item) => {
        if (item.type === "class") {
          totalClasses++;
          if (item.homework?.length) totalHomework += item.homework.length;
          if (item.status === "changed") changedClasses++;
          if (item.status === "cancelled") cancelledClasses++;
        } else if (item.type === "event") {
          specialEvents++;
        } else if (item.type === "deadline") {
          deadlines++;
        }
      });
    });

    return {
      totalClasses,
      totalHomework,
      changedClasses,
      cancelledClasses,
      specialEvents,
      deadlines,
    };
  }
}

export function extractScheduleFromFile(filePath: string): WeekSchedule {
  const timer = new Timer();

  timer.start("file-read");
  const htmlContent = readFileSync(filePath, "utf-8");
  const readTime = timer.end("file-read");
  console.log(
    `📂 File read: ${readTime.toFixed(2)}ms (${htmlContent.length} chars)`
  );

  timer.start("extractor-init");
  const extractor = new LectioScheduleExtractor(htmlContent);
  const initTime = timer.end("extractor-init");
  console.log(`🔧 Extractor init: ${initTime.toFixed(2)}ms`);

  return extractor.extractSchedule();
}

export function prettyPrintSchedule(schedule: WeekSchedule): string {
  let output = `
📅 LECTIO SCHEDULE EXTRACTION
═══════════════════════════════════════════════════════

👤 Student: ${schedule.student.name}
🏫 Class: ${schedule.student.class}
🎓 School: ${schedule.school}
📅 Week: ${schedule.weekNumber} (${schedule.year})
📆 Period: ${schedule.weekRange}

📊 SUMMARY
────────────────────────────────────────────────────────
📚 Total Classes: ${schedule.summary.totalClasses}
📝 Homework Assignments: ${schedule.summary.totalHomework}
🔄 Changed Classes: ${schedule.summary.changedClasses}
❌ Cancelled Classes: ${schedule.summary.cancelledClasses}
🎉 Special Events: ${schedule.summary.specialEvents}
⏰ Deadlines: ${schedule.summary.deadlines}

⏰ MODULES
────────────────────────────────────────────────────────
`;

  schedule.modules.forEach((module) => {
    output += `${module.number}. ${module.name} (${module.timeRange})\n`;
  });

  output += `
📅 DAILY SCHEDULE
────────────────────────────────────────────────────────
`;

  schedule.days.forEach((day) => {
    const dayEmoji = day.isWeekend ? "🏖️" : "📚";
    output += `\n${dayEmoji} ${day.dayName.toUpperCase()} (${day.date})\n`;

    if (day.items.length === 0) {
      output += "   No classes scheduled\n";
    } else {
      day.items.forEach((item) => {
        const statusEmoji =
          item.status === "changed"
            ? "🔄"
            : item.status === "cancelled"
            ? "❌"
            : "✅";
        const typeEmoji =
          item.type === "event" ? "🎉" : item.type === "deadline" ? "⏰" : "📖";

        output += `   ${statusEmoji} ${typeEmoji} ${item.subject.name}\n`;
        if (item.activityId) output += `      🆔 ${item.activityId}\n`;
        output += `      👨‍🏫 ${item.teacher.name} (${item.teacher.initials})\n`;
        if (item.room.name) output += `      🏠 ${item.room.name}\n`;
        if (item.startTime && item.endTime)
          output += `      ⏰ ${item.startTime} - ${item.endTime}\n`;
        if (item.topic) output += `      📋 Topic: ${item.topic}\n`;
        if (item.homework?.length) {
          output += `      📝 Homework:\n`;
          item.homework.forEach(
            (hw) => (output += `         • ${hw.description}\n`)
          );
        }
        if (item.notes) output += `      📌 Note: ${item.notes}\n`;
        output += "\n";
      });
    }
  });

  output += `
📚 SUBJECTS & GROUPS
────────────────────────────────────────────────────────
🎯 Subjects: ${schedule.studentGroups.subjects.join(", ")}
👥 Involved Groups: ${schedule.studentGroups.involvedGroups.join(", ")}
🏷️ Own Groups: ${schedule.studentGroups.ownGroups.join(", ")}

═══════════════════════════════════════════════════════
Extracted successfully! 🎉
`;

  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const schedule = extractScheduleFromFile("./response-formatted.html");
    console.log("=== JSON OUTPUT ===");
    console.log(JSON.stringify(schedule, null, 2));
    console.log("\n\n=== PRETTY OUTPUT ===");
    console.log(prettyPrintSchedule(schedule));
  } catch (error) {
    console.error("Error:", error);
  }
}
