import { Navbar } from "@/components/ui/Navbar";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">Live provider stats and lead assignments</p>
          </div>
        </div>
        <DashboardClient />
      </main>
    </>
  );
}
