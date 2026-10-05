"use client"; // Это нужно, так как мы используем useState

import { usePathname } from "next/navigation"; // Вместо NavLink
import Link from "next/link";
import { useState } from "react";
import { Gamepad2, Activity, Trophy, BarChart2, Cpu, Settings, Search, Bell, Menu, X } from "lucide-react";
import "./globals.css"; // Импорт стилей Tailwind
import Image from "next/image"; // В самом верху файла

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // Получаем текущий путь
  const avatarUrl = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=100"; 

  const navItems = [
    { name: "Live Dashboard", path: "/", icon: Activity },
    { name: "Matches", path: "/matches", icon: Gamepad2 },
    { name: "Analytics", path: "/analytics", icon: BarChart2 },
    { name: "ML Models", path: "/predictions", icon: Cpu },
  ];

  return (
    <html lang="ru">
      <body>
        <div className="flex h-screen w-full text-slate-300 font-sans overflow-hidden">
          
          {/* Sidebar - Desktop */}
          <aside className="hidden md:flex flex-col w-64 bg-[#121216] border-r border-white/5 h-full">
            <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xl font-bold text-white tracking-wider uppercase">
                Nexus<span className="text-emerald-500">.gg</span>
              </span>
            </div>
            
            <nav className="flex-1 py-6 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/5">
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">Settings</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 bg-[#121216]/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  className="md:hidden p-2 text-slate-400 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0c] border border-white/10 rounded-full focus-within:border-emerald-500/50 transition-all">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search matches, teams..." 
                    className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600 w-48 md:w-64"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[1px]">
                    <div className="w-full h-full rounded-full bg-[#121216] overflow-hidden">
                      <img src="default-avatar.jpg" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-[#0a0a0c] to-[#0f1115]">
              {children} {/* Сюда будут подставляться страницы (Home, Matches и т.д.) */}
            </main>
          </div>

          {/* Mobile Menu (Overlay) */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="w-64 h-full bg-[#121216] border-r border-white/5" onClick={e => e.stopPropagation()}>
                 {/* Тут можно повторить навигацию для мобилки */}
              </div>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}