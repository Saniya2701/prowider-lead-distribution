import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5 text-sky-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
            Lead Distribution System
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Prowider
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Intelligent lead distribution with fair round-robin allocation, real-time tracking, and quota management.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Link href="/request-service" className="card p-6 hover:border-sky-500/50 transition-all duration-300 group">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors">Request Service</h2>
            <p className="text-slate-500 text-sm mt-1">Submit a new lead enquiry</p>
          </Link>

          <Link href="/dashboard" className="card p-6 hover:border-sky-500/50 transition-all duration-300 group">
            <div className="text-3xl mb-3">📊</div>
            <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors">Dashboard</h2>
            <p className="text-slate-500 text-sm mt-1">Provider & lead overview</p>
          </Link>

          <Link href="/test-tools" className="card p-6 hover:border-sky-500/50 transition-all duration-300 group">
            <div className="text-3xl mb-3">🔧</div>
            <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors">Test Tools</h2>
            <p className="text-slate-500 text-sm mt-1">Dev & testing utilities</p>
          </Link>
        </div>

        <div className="card p-4 text-left space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-sky-500/10 rounded-lg p-3">
              <div className="text-sky-400 font-semibold">Service 1</div>
              <div className="text-slate-400 text-xs mt-1">Mandatory: P1 • Pool: P2, P3, P4</div>
            </div>
            <div className="bg-violet-500/10 rounded-lg p-3">
              <div className="text-violet-400 font-semibold">Service 2</div>
              <div className="text-slate-400 text-xs mt-1">Mandatory: P5 • Pool: P6, P7, P8</div>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-3">
              <div className="text-emerald-400 font-semibold">Service 3</div>
              <div className="text-slate-400 text-xs mt-1">Mandatory: P1, P4 • Pool: P2,P3,P5,P6,P7,P8</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
