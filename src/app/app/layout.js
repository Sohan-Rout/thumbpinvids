import { TopNav } from "@/components/dashboard/top-nav";
import { AdminModal } from "@/components/dashboard/admin-modal";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <TopNav />
      
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Admin Floating Tool */}
      <div className="fixed bottom-6 right-6">
        <AdminModal />
      </div>
    </div>
  );
}
