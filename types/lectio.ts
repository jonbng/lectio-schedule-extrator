// Complete Lectio Schedule Type Definitions
// Based on the actual API response structure

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
  isWeekend: boolean;
}

export interface Module {
  number: number;
  name: string;
  timeRange: string;
}

export interface Student {
  name: string;
  class: string;
}

export interface StudentGroups {
  subjects: string[];
  involvedGroups: string[];
  ownGroups: string[];
}

export interface ScheduleSummary {
  totalClasses: number;
  totalHomework: number;
  changedClasses: number;
  cancelledClasses: number;
  specialEvents: number;
  deadlines: number;
}

export interface WeekSchedule {
  weekNumber: number;
  year: number;
  weekRange: string;
  student: Student;
  school: string;
  days: DaySchedule[];
  modules: Module[];
  studentGroups: StudentGroups;
  summary: ScheduleSummary;
}

export interface LectioScheduleResponse {
  schedule: WeekSchedule;
  nextHash: string;
  updatedAt: number;
}

// Additional utility types for specific use cases
export type ScheduleStatus = ScheduleItem["status"];
export type ScheduleItemType = ScheduleItem["type"];

// Type guards for runtime checking
export const isScheduleItem = (item: any): item is ScheduleItem => {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.subject === "object" &&
    typeof item.teacher === "object" &&
    typeof item.room === "object" &&
    typeof item.startTime === "string" &&
    typeof item.endTime === "string" &&
    typeof item.date === "string" &&
    typeof item.module === "number" &&
    ["normal", "changed", "cancelled"].includes(item.status) &&
    ["class", "event", "deadline"].includes(item.type)
  );
};

export const isWeekSchedule = (schedule: any): schedule is WeekSchedule => {
  return (
    typeof schedule === "object" &&
    schedule !== null &&
    typeof schedule.weekNumber === "number" &&
    typeof schedule.year === "number" &&
    typeof schedule.weekRange === "string" &&
    typeof schedule.student === "object" &&
    typeof schedule.school === "string" &&
    Array.isArray(schedule.days) &&
    Array.isArray(schedule.modules) &&
    typeof schedule.studentGroups === "object" &&
    typeof schedule.summary === "object"
  );
};

export const isLectioScheduleResponse = (
  response: any
): response is LectioScheduleResponse => {
  return (
    typeof response === "object" &&
    response !== null &&
    isWeekSchedule(response.schedule) &&
    typeof response.nextHash === "string" &&
    typeof response.updatedAt === "number"
  );
};
