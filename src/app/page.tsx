import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-blue-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Course Project MVP
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            AI Voice Task Tracker
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Record voice notes, transcribe them with Mistral, extract structured tasks with AI,
            and get Telegram notifications instantly.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Login
          </Link>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Voice to Task</h2>
            <p className="mt-2 text-sm text-slate-600">
              Record audio in-browser and convert speech into structured tasks.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">AI Extraction</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use Mistral transcription + chat models with strict JSON validation.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Telegram Alerts</h2>
            <p className="mt-2 text-sm text-slate-600">
              Link Telegram via one-time code and receive task creation notifications.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
