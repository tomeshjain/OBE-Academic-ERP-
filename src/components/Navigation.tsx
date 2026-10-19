'use client';

import React, { useState, useEffect } from 'react';
import { UserRole, MenuItemId } from '@/types/erp';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  GraduationCap,
  BookOpen,
  SlidersHorizontal,
  FileText,
  CheckSquare,
  BarChart3,
  ChevronRight,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
} from 'lucide-react';

export { type MenuItemId } from '@/types/erp';

export interface SubMenuItemConfig {
  id: string;
  label: string;
}

export interface MenuItemConfig {
  id: MenuItemId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems: SubMenuItemConfig[];
}

export const MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'org-structure',
    label: 'Organization Structure',
    shortLabel: 'Org Structure',
    icon: Building2,
    subItems: [
      { id: 'faculties', label: 'Faculties' },
      { id: 'schools', label: 'Schools' },
      { id: 'departments', label: 'Departments' },
      { id: 'users', label: 'Users & Roles (HoF/HoS/HoD)' },
      { id: 'email-config', label: 'Email Gateway' },
      { id: 'tree', label: 'Visual Hierarchy Tree' },
    ],
  },
  {
    id: 'programs-outcomes',
    label: 'Programs & Outcomes (POs/PSOs)',
    shortLabel: 'Programs & POs',
    icon: GraduationCap,
    subItems: [
      { id: 'programs', label: 'Academic Programs' },
      { id: 'pos', label: 'Program Outcomes (POs)' },
      { id: 'psos', label: 'Program Specific Outcomes (PSOs)' },
    ],
  },
  {
    id: 'courses',
    label: 'Courses & Sections',
    shortLabel: 'Courses',
    icon: BookOpen,
    subItems: [
      { id: 'catalog', label: 'Course Catalog' },
      { id: 'enrollment', label: 'Student Enrollment' },
      { id: 'sections', label: 'Sections & Faculty Allocation' },
      { id: 'cos', label: 'Course Outcomes (COs)' },
      { id: 'matrix', label: 'CO-PO Matrix (0-3)' },
    ],
  },
  {
    id: 'scoring-components',
    label: 'Scoring Components',
    shortLabel: 'Scoring Components',
    icon: SlidersHorizontal,
    subItems: [
      { id: 'schemes', label: 'Course Evaluation Schemes' },
      { id: 'subcomponents', label: 'Assessment Sub-Components' },
    ],
  },
  {
    id: 'assessment-papers',
    label: 'Assessment & Question Papers',
    shortLabel: 'Assessment Papers',
    icon: FileText,
    subItems: [
      { id: 'designer', label: 'Question Paper Designer' },
      { id: 'windows', label: 'Assessment Windows & Deadlines' },
      { id: 'templates', label: 'Question Paper Templates' },
    ],
  },
  {
    id: 'mark-entry',
    label: 'Question-Wise Mark Entry',
    shortLabel: 'Mark Entry',
    icon: CheckSquare,
    subItems: [
      { id: 'matrix', label: 'Question-Wise Mark Matrix' },
      { id: 'roster', label: 'Enrolled Students Roster' },
    ],
  },
  {
    id: 'co-reports',
    label: 'Outcome Reports & Attainment',
    shortLabel: 'CO Reports',
    icon: BarChart3,
    subItems: [
      { id: 'co', label: 'CO Attainment Analysis' },
      { id: 'po', label: 'PO & PSO Attainment & Radar' },
      { id: 'accreditation', label: 'Accreditation Summary' },
    ],
  },
  {
    id: 'db-manager',
    label: 'Master Database Explorer',
    shortLabel: 'Master DB',
    icon: Database,
    subItems: [
      { id: 'explorer', label: 'All Tables & Records' },
      { id: 'backup', label: 'Database Backup & Restore' },
    ],
  },
];

interface NavigationProps {
  activeMenuItem?: MenuItemId;
  setActiveMenuItem?: (item: MenuItemId) => void;
  currentUserRole?: UserRole;
  setCurrentUserRole?: (role: UserRole) => void;
}

export const Navigation: React.FC<NavigationProps> = () => {
  const {
    tenant,
    currentUser,
    logout,
    activeMenuItem,
    activeSubTab,
    navigateTo,
    academicScope,
  } = useApp();

  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('academic_erp_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('academic_erp_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const visibleMenuItems = MENU_ITEMS.filter((item) =>
    academicScope?.allowedMenuItems ? academicScope.allowedMenuItems.includes(item.id) : true
  );

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header with Collapsible Toggle */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2 min-h-[69px]">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight truncate">
                  ACADEMIC<span className="text-indigo-400">ERP</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-950 border border-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded">
                  2026
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {tenant?.name || 'Academic Institution'}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors ${
            isCollapsed ? 'hidden' : 'block'
          }`}
          title="Collapse Sidebar"
          aria-label="Collapse Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* When collapsed, show expand button at top */}
      {isCollapsed && (
        <div className="px-3 pt-3 flex justify-center">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60 flex items-center justify-center transition-colors"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Menu Items List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {visibleMenuItems.map((item) => {
          const isActive = activeMenuItem === item.id;
          const ItemIcon = item.icon;

          if (isCollapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id, item.subItems[0]?.id)}
                title={item.label}
                className={`w-full flex items-center justify-center p-3 rounded-xl transition-all group relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <ItemIcon className="w-5 h-5 shrink-0" />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-400 rounded-r-full" />
                )}
              </button>
            );
          }

          return (
            <div key={item.id} className="space-y-1">
              <button
                type="button"
                onClick={() => navigateTo(item.id, item.subItems[0]?.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                  }`}
                >
                  <ItemIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-snug line-clamp-2">
                    {item.label}
                  </div>
                </div>

                {isActive && (
                  <ChevronRight className="w-4 h-4 text-white/80 shrink-0 self-center" />
                )}
              </button>

              {/* Sub-menu items (Expanded mode only) */}
              {isActive && item.subItems.length > 0 && (
                <div className="pl-11 pr-1 py-1 space-y-1 animate-in fade-in duration-200">
                  {item.subItems.map((sub) => {
                    const isSubActive = activeSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo(item.id, sub.id);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-all ${
                          isSubActive
                            ? 'bg-indigo-950/80 text-white font-semibold border border-indigo-700/80 shadow-sm'
                            : 'text-slate-400 hover:text-indigo-200 hover:bg-slate-900'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                            isSubActive
                              ? 'bg-indigo-400 ring-2 ring-indigo-400/40'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile in Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
          {!isCollapsed ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser.role.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
                title="Log Out of Portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300"
                title={`${currentUser.fullName} (${currentUser.role.replace(/_/g, ' ')})`}
              >
                <User className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
