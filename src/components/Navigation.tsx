'use client';

import React from 'react';
import { UserRole, MenuItemId } from '@/types/erp';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  ScrollText,
  GraduationCap,
  CalendarDays,
  BookOpen,
  SlidersHorizontal,
  FileQuestion,
  FileSpreadsheet,
  Award,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';

export { type MenuItemId } from '@/types/erp';

export interface SubMenuItemConfig {
  id: string;
  label: string;
}

export interface MenuItemConfig {
  id: MenuItemId;
  orderNumber: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems: SubMenuItemConfig[];
}

export const MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'org-structure',
    orderNumber: 1,
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
    id: 'regulations',
    orderNumber: 2,
    label: 'Regulations',
    shortLabel: 'Regulations',
    icon: ScrollText,
    subItems: [
      { id: 'regulations', label: 'Academic Regulations' },
      { id: 'framework', label: 'Batch 2026 Credit Rules' },
    ],
  },
  {
    id: 'programs-outcomes',
    orderNumber: 3,
    label: 'Programs and Program Outcomes and Program Specific Outcomes',
    shortLabel: 'Programs & POs / PSOs',
    icon: GraduationCap,
    subItems: [
      { id: 'programs', label: 'Academic Programs' },
      { id: 'pos', label: 'Program Outcomes (POs)' },
      { id: 'psos', label: 'Program Specific Outcomes (PSOs)' },
    ],
  },
  {
    id: 'terms',
    orderNumber: 4,
    label: 'Terms',
    shortLabel: 'Terms & Semesters',
    icon: CalendarDays,
    subItems: [
      { id: 'terms', label: 'Terms / Semesters List' },
      { id: 'timeline', label: 'Instructional Timeline' },
    ],
  },
  {
    id: 'courses',
    orderNumber: 5,
    label: 'Courses',
    shortLabel: 'Courses & Sections',
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
    orderNumber: 6,
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
    orderNumber: 7,
    label: 'Assessment & Question Papers',
    shortLabel: 'Assessment & Papers',
    icon: FileQuestion,
    subItems: [
      { id: 'designer', label: 'Question Paper Designer' },
      { id: 'windows', label: 'Assessment Windows & Deadlines' },
      { id: 'templates', label: 'Question Paper Templates' },
    ],
  },
  {
    id: 'mark-entry',
    orderNumber: 8,
    label: 'Filling of Question Wise Marks',
    shortLabel: 'Mark Entry Matrix',
    icon: FileSpreadsheet,
    subItems: [
      { id: 'matrix', label: 'Question-Wise Mark Matrix' },
      { id: 'roster', label: 'Enrolled Students Roster' },
    ],
  },
  {
    id: 'co-reports',
    orderNumber: 9,
    label: 'Course Outcome Reports',
    shortLabel: 'Course Outcome Reports',
    icon: Award,
    subItems: [
      { id: 'co', label: 'CO Attainment Analysis' },
      { id: 'po', label: 'PO & PSO Attainment & Radar' },
      { id: 'accreditation', label: 'Accreditation Summary' },
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

  const visibleMenuItems = MENU_ITEMS.filter((item) =>
    academicScope?.allowedMenuItems ? academicScope.allowedMenuItems.includes(item.id) : true
  );

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40 shrink-0">
            <GraduationCap className="w-6 h-6" />
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
      </div>

      {/* Role-Governed Menu Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {visibleMenuItems.map((item) => {
          const isActive = activeMenuItem === item.id;

          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => navigateTo(item.id, item.subItems[0]?.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 font-medium'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                  }`}
                >
                  {item.orderNumber}
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

              {/* Sub-menu items: Fully clickable with active sub-tab highlights */}
              {isActive && item.subItems.length > 0 && (
                <div className="pl-9 pr-1 py-1 space-y-1 animate-in fade-in duration-200">
                  {item.subItems.map((sub) => {
                    const isSubActive = activeSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
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
      </div>

      {/* Clean User Profile in Footer (Simulated Role and Theme removed per user request) */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
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
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
              title="Log Out of Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
