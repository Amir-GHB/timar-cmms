import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home,
  Wrench,
  Clock,
  FileBarChart,
  CheckSquare,
  Package,
  Settings,
} from 'lucide-react';

export type MainSection =
  | 'dashboard'
  | 'overall'
  | 'assets'
  | 'timeline'
  | 'reports'
  | 'requests'
  | 'storage'
  | 'settings';

interface NavigationPanelProps {
  activeSection: MainSection;
  onSelectSection: (section: MainSection) => void;
  pendingApprovalsCount?: number;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  activeSection,
  onSelectSection,
  pendingApprovalsCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    {
      id: 'dashboard' as MainSection,
      label: 'داشبورد',
      icon: LayoutDashboard,
    },
    {
      id: 'overall' as MainSection,
      label: 'نمای کلی',
      icon: Home,
    },
    {
      id: 'assets' as MainSection,
      label: 'تجهیزات',
      icon: Wrench,
    },
    {
      id: 'timeline' as MainSection,
      label: 'تایم لاین',
      icon: Clock,
    },
    {
      id: 'reports' as MainSection,
      label: 'گزارش ها',
      icon: FileBarChart,
    },
    {
      id: 'requests' as MainSection,
      label: 'درخواست‌ها',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
    },
    {
      id: 'storage' as MainSection,
      label: 'انبار قطعات',
      icon: Package,
    },
    {
      id: 'settings' as MainSection,
      label: 'تنظیمات',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex h-full select-none bg-[#e3e3e3] border-l border-slate-300 flex-col py-3 transition-all duration-200 ease-in-out shrink-0 z-20 ${
          isHovered ? 'w-[160px] shadow-lg' : 'w-[60px]'
        }`}
        dir="rtl"
      >
        {/* Navigation Buttons Stack */}
        <div className="flex-1 flex flex-col space-y-1.5 px-2 overflow-y-auto pt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full h-[45px] rounded-lg flex items-center transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-300/80 hover:text-slate-900 font-medium'
                } ${isHovered ? 'px-3 justify-start' : 'justify-center'}`}
                title={item.label}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                />

                {isHovered && (
                  <span className="mr-3 text-xs whitespace-nowrap overflow-hidden transition-opacity duration-150">
                    {item.label}
                  </span>
                )}

                {/* Badge for pending requests */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`absolute ${
                      isHovered
                        ? 'left-2 px-1.5 py-0.2 text-[10px] bg-amber-500 text-white font-bold rounded-full'
                        : 'top-1.5 left-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full'
                    }`}
                  >
                    {isHovered ? item.badge : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Clean minimal footer without any Timar text */}
        <div className="px-2 pt-2 border-t border-slate-300/80 text-center">
          {isHovered ? (
            <div className="text-[10px] text-slate-500 font-mono">سامانه نت هوشمند v2.0</div>
          ) : (
            <div className="text-[10px] text-slate-400 font-mono">v2</div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg overflow-x-auto"
        dir="rtl"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg relative min-w-[50px] transition-colors cursor-pointer ${
                isActive ? 'text-sky-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-700 stroke-[2.2]' : 'text-slate-500'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] text-[9px] bg-amber-500 text-white font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
