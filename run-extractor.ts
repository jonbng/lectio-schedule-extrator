import {
  extractScheduleFromFile,
  prettyPrintSchedule,
} from "./schedule-extractor";
import { writeFileSync } from "fs";

// Configuration
const HTML_FILE = "./response-formatted.html";
const OUTPUT_JSON = "./extracted-schedule.json";
const OUTPUT_PRETTY = "./extracted-schedule.txt";

console.log("🚀 STARTING SCHEDULE EXTRACTION");
console.log("═══════════════════════════════════════");
const startTime = performance.now();

try {
  console.log("📄 Reading HTML file...");
  const fileReadStart = performance.now();
  const schedule = extractScheduleFromFile(HTML_FILE);
  const fileReadTime = performance.now() - fileReadStart;
  console.log(`📄 File processing completed in ${fileReadTime.toFixed(2)}ms`);

  console.log("💾 Writing output files...");
  const writeStart = performance.now();
  writeFileSync(OUTPUT_JSON, JSON.stringify(schedule, null, 2));
  writeFileSync(OUTPUT_PRETTY, prettyPrintSchedule(schedule));
  const writeTime = performance.now() - writeStart;
  console.log(`💾 File writing completed in ${writeTime.toFixed(2)}ms`);

  console.log("📊 EXTRACTION SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`👤 Student: ${schedule.student.name}`);
  console.log(`🏫 Class: ${schedule.student.class}`);
  console.log(`🎓 School: ${schedule.school}`);
  console.log(`📅 Week: ${schedule.weekNumber} (${schedule.year})`);
  console.log(`📆 Period: ${schedule.weekRange}`);
  console.log("");
  console.log("📈 Quick Stats:");
  console.log(`   📚 Total Classes: ${schedule.summary.totalClasses}`);
  console.log(`   📝 Homework Assignments: ${schedule.summary.totalHomework}`);
  console.log(`   🔄 Changed Classes: ${schedule.summary.changedClasses}`);
  console.log(`   ❌ Cancelled Classes: ${schedule.summary.cancelledClasses}`);
  console.log(`   🎉 Special Events: ${schedule.summary.specialEvents}`);
  console.log(`   ⏰ Deadlines: ${schedule.summary.deadlines}`);
  console.log("");
  console.log("📁 Output Files:");
  console.log(`   JSON: ${OUTPUT_JSON}`);
  console.log(`   Pretty: ${OUTPUT_PRETTY}`);
  console.log("");
  console.log("✅ Extraction completed successfully!");

  console.log("\n📅 DAILY BREAKDOWN");
  console.log("═══════════════════════════════════════");
  schedule.days.forEach((day) => {
    const classCount = day.items.filter((item) => item.type === "class").length;
    const eventCount = day.items.filter((item) => item.type === "event").length;
    const deadlineCount = day.items.filter(
      (item) => item.type === "deadline"
    ).length;
    const homeworkCount = day.items.reduce(
      (count, item) => count + (item.homework ? item.homework.length : 0),
      0
    );
    const dayEmoji = day.isWeekend ? "🏖️" : "📚";
    console.log(
      `${dayEmoji} ${day.dayName} (${day.date}): ${classCount} classes, ${eventCount} events, ${deadlineCount} deadlines, ${homeworkCount} homework`
    );
  });

  console.log("\n🎯 ENROLLED SUBJECTS");
  console.log("═══════════════════════════════════════");
  schedule.studentGroups.subjects.forEach((subject, index) => {
    console.log(`${index + 1}. ${subject}`);
  });

  // Final timing summary
  const totalTime = performance.now() - startTime;
  console.log("\n⏱️  PERFORMANCE SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`📄 File Reading & Parsing: ${fileReadTime.toFixed(2)}ms`);
  console.log(`💾 File Writing: ${writeTime.toFixed(2)}ms`);
  console.log(`🏁 Total Runtime: ${totalTime.toFixed(2)}ms`);
  console.log("═══════════════════════════════════════");
} catch (error) {
  const totalTime = performance.now() - startTime;
  console.error("❌ Error during extraction:", error);
  console.log(`\n⏱️  Runtime before error: ${totalTime.toFixed(2)}ms`);
  process.exit(1);
}
