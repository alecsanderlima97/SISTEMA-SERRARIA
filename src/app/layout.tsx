import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Vanmarte Serraria | Orquestracs",
  description: "Sistema Integrado de Gestão para Serrarias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-[#0d1117] text-slate-200 antialiased font-sans">
        {/* Background Blobs */}
        <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>

        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-[#2E3B1F]/30 backdrop-blur-xl border-r border-white/5 flex flex-col pt-6 z-50">
            <div className="px-6 pb-6 border-b border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[#2E3B1F]"></div>
                </div>
                <div>
                  <h1 className="font-heading font-extrabold text-xl leading-none text-white tracking-tight">VANMARTE</h1>
                  <span className="text-[10px] uppercase tracking-widest text-primary-400 font-semibold mt-1 block">Serraria</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
              <SidebarLink href="/" icon="📊" label="Dashboard" />
              <SidebarLink href="/toras" icon="🪵" label="Entrada de Toras" />
              <SidebarLink href="/romaneios" icon="🧾" label="Romaneios" />
              <SidebarLink href="/estoque" icon="📦" label="Estoque Madeira" />
              <SidebarLink href="/financeiro" icon="💰" label="Financeiro" />
              <SidebarLink href="/rh" icon="👥" label="Recursos Humanos" />
              <SidebarLink href="/frota" icon="🚛" label="Gestão de Frotas" />
            </nav>
            
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                  AD
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Admin</div>
                  <div className="text-[10px] text-slate-400">Diretoria</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 relative flex flex-col max-h-screen overflow-hidden">
            <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black/10 backdrop-blur-md sticky top-0 z-40">
              <h2 className="font-heading text-lg font-semibold text-white/80">Gestão Geral</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-primary-500"
    >
      <span className="text-lg opacity-80">{icon}</span>
      {label}
    </Link>
  );
}
