import { Navbar } from "@/components/ui/Navbar";
import { TestToolsClient } from "@/components/dashboard/TestToolsClient";

export default function TestToolsPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-3">
            ⚠️ Developer Tools
          </div>
          <h1 className="text-3xl font-bold text-white">Test Tools</h1>
          <p className="text-slate-400 mt-2">
            Use these utilities to test the system&apos;s concurrency, idempotency, and reset features.
          </p>
        </div>
        <TestToolsClient />
      </main>
    </>
  );
}
