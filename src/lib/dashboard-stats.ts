import { TaskCategory, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  totalTasks: number;
  totalVoiceInputs: number;
  totalVoiceTasks: number;
  statusCounts: Record<TaskStatus, number>;
  categoryCounts: Record<TaskCategory, number>;
  voiceUploadedEvents: number;
  transcriptionEvents: number;
  transcriptionRate: string;
  conversionRate: string;
};

function percentage(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return "0%";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [
    totalTasks,
    totalVoiceInputs,
    totalVoiceTasks,
    groupedCategories,
    groupedStatuses,
    voiceUploadedEvents,
    transcriptionEvents,
  ] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.voiceInput.count({ where: { userId } }),
    prisma.task.count({ where: { userId, voiceInputId: { not: null } } }),
    prisma.task.groupBy({
      by: ["category"],
      where: { userId },
      _count: { category: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.analyticsEvent.count({
      where: { userId, eventName: "voice_uploaded" },
    }),
    prisma.analyticsEvent.count({
      where: { userId, eventName: "transcription_succeeded" },
    }),
  ]);

  const categoryCounts: Record<TaskCategory, number> = {
    work: 0,
    personal: 0,
    study: 0,
    health: 0,
    finance: 0,
    other: 0,
  };
  for (const group of groupedCategories) {
    categoryCounts[group.category] = group._count.category;
  }

  const statusCounts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
  };
  for (const group of groupedStatuses) {
    statusCounts[group.status] = group._count.status;
  }

  return {
    totalTasks,
    totalVoiceInputs,
    totalVoiceTasks,
    statusCounts,
    categoryCounts,
    voiceUploadedEvents,
    transcriptionEvents,
    transcriptionRate: percentage(transcriptionEvents, voiceUploadedEvents),
    conversionRate: percentage(totalVoiceTasks, voiceUploadedEvents),
  };
}
