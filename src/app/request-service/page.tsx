import { Navbar } from "@/components/ui/Navbar";
import { LeadForm } from "@/components/forms/LeadForm";

export default function RequestServicePage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Request a Service</h1>
          <p className="text-slate-400 mt-2">
            Fill out the form below and we&apos;ll connect you with the right providers.
          </p>
        </div>
        <LeadForm />
      </main>
    </>
  );
}
