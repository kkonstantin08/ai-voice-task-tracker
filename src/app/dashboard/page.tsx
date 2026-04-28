import { TaskCategory } from "@prisma/client";
import { ProtectedNav } from "@/components/protected-nav";
import { getCurrentLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

function percentage(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return "0%";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
  const locale = await getCurrentLocale();
  const user = await requireUser();

  const [totalTasks, totalVoiceInputs, groupedCategories, recentTasks, voiceUploadedEvents, transcriptionEvents, taskCreatedEvents] =
    await Promise.all([
      prisma.task.count({ where: { userId: user.id } }),
      prisma.voiceInput.count({ where: { userId: user.id } }),
      prisma.task.groupBy({
        by: ["category"],
        where: { userId: user.id },
        _count: { category: true },
      }),
      prisma.task.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.analyticsEvent.count({
        where: { userId: user.id, eventName: "voice_uploaded" },
      }),
      prisma.analyticsEvent.count({
        where: { userId: user.id, eventName: "transcription_succeeded" },
      }),
      prisma.analyticsEvent.count({
        where: { userId: user.id, eventName: "task_created_from_voice" },
      }),
    ]);

  const categoryLookup = new Map<TaskCategory, number>();
  for (const group of groupedCategories) {
    categoryLookup.set(group.category, group._count.category);
  }

  const categoryNames: TaskCategory[] = [
    "work",
    "personal",
    "study",
    "health",
    "finance",
    "other",
  ];
  const categories: Array<{ name: TaskCategory; count: number }> = categoryNames.map(
    (name) => ({ name, count: categoryLookup.get(name) ?? 0 }),
  );
  const labels = {
    en: {
      title: "Dashboard",
      subtitle: "Overview of tasks, voice usage, and funnel conversion analytics.",
      totalTasks: "Total Tasks",
      totalVoiceInputs: "Total Voice Inputs",
      transcriptionRate: "Transcription Success Rate",
      conversionRate: "Task Conversion Rate",
      tasksByCategory: "Tasks by Category",
      funnel: "Funnel Analytics",
      voiceUploaded: "Voice Uploaded",
      transcriptionSucceeded: "Transcription Succeeded",
      taskCreated: "Task Created",
      recentTasks: "Recent Tasks",
      noTasks: "No tasks yet. Create one from a voice note.",
      colTitle: "Title",
      colCategory: "Category",
      colPriority: "Priority",
      colStatus: "Status",
      colCreated: "Created",
    },
    ru: {
      title: "Дашборд",
      subtitle: "Обзор задач, использования голоса и конверсии по воронке.",
      totalTasks: "Всего задач",
      totalVoiceInputs: "Всего голосовых вводов",
      transcriptionRate: "Успешность транскрипции",
      conversionRate: "Конверсия в задачу",
      tasksByCategory: "Задачи по категориям",
      funnel: "Аналитика воронки",
      voiceUploaded: "Голос загружен",
      transcriptionSucceeded: "Транскрипция успешна",
      taskCreated: "Задача создана",
      recentTasks: "Последние задачи",
      noTasks: "Задач пока нет. Создайте первую из голосовой заметки.",
      colTitle: "Заголовок",
      colCategory: "Категория",
      colPriority: "Приоритет",
      colStatus: "Статус",
      colCreated: "Создано",
    },
  } as const;
  const t = labels[locale];

  return (
    <div className="min-h-screen bg-slate-100">
      <ProtectedNav email={user.email} locale={locale} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{t.totalTasks}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalTasks}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{t.totalVoiceInputs}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalVoiceInputs}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{t.transcriptionRate}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {percentage(transcriptionEvents, voiceUploadedEvents)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{t.conversionRate}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {percentage(taskCreatedEvents, voiceUploadedEvents)}
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t.tasksByCategory}</h2>
            <ul className="mt-4 space-y-2">
              {categories.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-slate-700">{item.name}</span>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t.funnel}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <span className="text-slate-700">{t.voiceUploaded}</span>
                <span className="font-semibold text-slate-900">{voiceUploadedEvents}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <span className="text-slate-700">{t.transcriptionSucceeded}</span>
                <span className="font-semibold text-slate-900">{transcriptionEvents}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <span className="text-slate-700">{t.taskCreated}</span>
                <span className="font-semibold text-slate-900">{taskCreatedEvents}</span>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{t.recentTasks}</h2>
          {recentTasks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{t.noTasks}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-2 py-2">{t.colTitle}</th>
                    <th className="px-2 py-2">{t.colCategory}</th>
                    <th className="px-2 py-2">{t.colPriority}</th>
                    <th className="px-2 py-2">{t.colStatus}</th>
                    <th className="px-2 py-2">{t.colCreated}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-900">{task.title}</td>
                      <td className="px-2 py-2 capitalize text-slate-700">{task.category}</td>
                      <td className="px-2 py-2 capitalize text-slate-700">{task.priority}</td>
                      <td className="px-2 py-2 capitalize text-slate-700">{task.status}</td>
                      <td className="px-2 py-2 text-slate-700">
                        {task.createdAt.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
