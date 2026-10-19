'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Navigation, MenuItemId, MENU_ITEMS } from '@/components/Navigation';
import { InitialSetupWizard } from '@/components/InitialSetupWizard';
import { LoginPortal } from '@/components/LoginPortal';
import { OrganizationStructureView } from '@/components/views/OrganizationStructureView';
import { RegulationsView } from '@/components/views/RegulationsView';
import { ProgramsAndOutcomesView } from '@/components/views/ProgramsAndOutcomesView';
import { TermsView } from '@/components/views/TermsView';
import { CoursesView } from '@/components/views/CoursesView';
import { ScoringComponentsView } from '@/components/views/ScoringComponentsView';
import { AssessmentQuestionsView } from '@/components/views/AssessmentQuestionsView';
import { MarkEntryView } from '@/components/views/MarkEntryView';
import { CourseOutcomeReportsView } from '@/components/views/CourseOutcomeReportsView';
import { AppTheme } from '@/types/erp';
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  LogOut,
  Palette,
  User,
  Shield,
  GraduationCap,
  BookOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

function DashboardShell() {
  const {
    isInitialized,
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    tenant,
    resetAllData,
    theme,
    setTheme,
    logout,
    activeMenuItem,
    setActiveMenuItem,
    programs,
    activeProgramId,
    setActiveProgramId,
    courses,
    activeCourseId,
    setActiveCourseId,
    academicScope,
  } = useApp();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showSecurityAudit, setShowSecurityAudit] = useState(false);

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
    setResetConfirmWord('');
  };

  const visiblePrograms = academicScope?.visiblePrograms ?? programs;
  const visibleCourses = academicScope?.visibleCourses ?? courses;

  React.useEffect(() => {
    if (visiblePrograms.length > 0 && !visiblePrograms.some((p) => p.id === activeProgramId)) {
      setActiveProgramId(visiblePrograms[0].id);
    }
  }, [visiblePrograms, activeProgramId, setActiveProgramId]);

  React.useEffect(() => {
    if (visibleCourses.length > 0 && !visibleCourses.some((c) => c.id === activeCourseId)) {
      setActiveCourseId(visibleCourses[0].id);
    }
  }, [visibleCourses, activeCourseId, setActiveCourseId]);

  // Synchronize active Course with URL query parameter so refresh preserves state
  React.useEffect(() => {
    if (typeof window !== 'undefined' && activeCourseId) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('course') !== activeCourseId) {
          url.searchParams.set('course', activeCourseId);
          window.history.replaceState({}, '', url.toString());
        }
      } catch {}
    }
  }, [activeCourseId]);

  React.useEffect(() => {
    if (
      academicScope?.allowedMenuItems &&
      academicScope.allowedMenuItems.length > 0 &&
      !academicScope.allowedMenuItems.includes(activeMenuItem)
    ) {
      setActiveMenuItem(academicScope.allowedMenuItems[0]);
    }
  }, [academicScope?.allowedMenuItems, activeMenuItem, setActiveMenuItem]);

  // Authentication Portal (Enforces: initial setup is only available on login portal if system is completely empty)
  if (!currentUser) {
    return <LoginPortal />;
  }

  const currentMenuConfig = MENU_ITEMS.find((m) => m.id === activeMenuItem) || MENU_ITEMS[0];

  const handleResetSystem = () => {
    if (resetConfirmWord !== 'RESET' || captchaInput.toUpperCase() !== captchaCode.toUpperCase()) {
      return;
    }
    resetAllData();
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen flex bg-[#070b14] text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
      {/* 1. Left Sidebar: Strict 9 Menu Items with clickable sub-items */}
      <Navigation />

      {/* 2. Main Content Dashboard Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar: Optimized space with Active Program and Course Display */}
        <header className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Active Module Identifier */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded">
              Module {currentMenuConfig.orderNumber}
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[150px] lg:max-w-none">
              {currentMenuConfig.label}
            </span>
          </div>

          {/* Center: Global Active Program and Course (Clear Visibility & Quick Switching) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-2xl">
            {/* Active Program Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-indigo-900/50 rounded-xl px-2.5 py-1 text-xs text-slate-300 shadow-sm hover:border-indigo-700/70 transition-colors">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 leading-none">
                  Active Program
                </span>
                <select
                  value={activeProgramId || ''}
                  onChange={(e) => setActiveProgramId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer max-w-[150px] md:max-w-[190px] truncate"
                  title="Global Active Academic Program"
                >
                  {visiblePrograms.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-950 text-white">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Course Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-teal-900/50 rounded-xl px-2.5 py-1 text-xs text-slate-300 shadow-sm hover:border-teal-700/70 transition-colors">
              <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400 leading-none">
                  Active Course
                </span>
                <select
                  value={activeCourseId || ''}
                  onChange={(e) => setActiveCourseId(e.target.value)}
                  className="bg-transparent text-teal-200 font-bold text-xs focus:outline-none cursor-pointer max-w-[160px] md:max-w-[220px] truncate"
                  title="Global Active Course"
                >
                  {visibleCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-white">
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right: AY Batch / Security / Theme / Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Compact Academic Year & Batch */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>AY 26-27</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-indigo-300 font-semibold">B26</span>
            </div>

            {/* Security Shield Indicator */}
            <button
              onClick={() => setShowSecurityAudit(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-medium hover:bg-emerald-900/50 transition-colors"
              title="Click to view Security & SQLi Defense Audit"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden 2xl:inline">Shield Active</span>
            </button>

            {/* Theme Selector Dropdown in Right Top Menu */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300 shadow-sm">
              <Palette className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as AppTheme)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                title="Select Platform Theme"
              >
                <option value="zen-minimalist" className="bg-slate-950 text-slate-200">
                  Zen (Light)
                </option>
                <option value="clean-light" className="bg-slate-950 text-slate-200">
                  Clean Light
                </option>
                <option value="obsidian-black" className="bg-slate-950 text-slate-200">
                  Obsidian (Dark)
                </option>
              </select>
            </div>

            {/* Active User Profile & Log Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[85px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors"
                title="Log Out of Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Log Out</span>
              </button>

              {(currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => {
                    generateCaptcha();
                    setShowResetConfirm(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                  title="Reset & Wipe All Institutional Data (Administrator Only)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* View Component Rendering - One and only one canonical way to reach each page */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {activeMenuItem === 'org-structure' && <OrganizationStructureView />}
          {activeMenuItem === 'regulations' && <RegulationsView />}
          {activeMenuItem === 'programs-outcomes' && <ProgramsAndOutcomesView />}
          {activeMenuItem === 'terms' && <TermsView />}
          {activeMenuItem === 'courses' && <CoursesView />}
          {activeMenuItem === 'scoring-components' && <ScoringComponentsView />}
          {activeMenuItem === 'assessment-papers' && <AssessmentQuestionsView />}
          {activeMenuItem === 'mark-entry' && <MarkEntryView />}
          {activeMenuItem === 'co-reports' && <CourseOutcomeReportsView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/40 px-8 py-5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {tenant?.name || 'Academic ERP & OBE Attainment Platform'} &bull; Single Authoritative Navigation Engine
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Theme: <strong className="text-white capitalize">{theme.replace('-', ' ')}</strong></span>
            <span>&bull;</span>
            <span>NBA Tier-I Compliant</span>
            <span>&bull;</span>
            <span>ABET EAC/CAC Ready</span>
            <span>&bull;</span>
            <span>NAAC Metric 2.6.2</span>
          </div>
        </footer>
      </div>

      {/* SECURITY DEFENSE AUDIT MODAL */}
      {showSecurityAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Platform Security & Defense Audit</h3>
                  <p className="text-xs text-slate-400">Zero-Trust Academic Governance Verification</p>
                </div>
              </div>
              <button
                onClick={() => setShowSecurityAudit(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SQL Injection (SQLi) Defense Engine</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Active regex filter intercepts comments (<code>--</code>, <code>/*</code>), stacked queries (<code>; DROP</code>), boolean tautologies (<code>' OR '1'='1</code>), and union extractions before state commits.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cross-Site Scripting (XSS) Disinfection</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All user formulas and question bodies are disinfected via strict HTML entity encoding and KaTeX token whitelist.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Role-Based Access Control (RBAC) & Tenant RLS</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Strict partition by tenant ID with role authorization for Admin, Coordinator, Faculty, HOD, and Student accounts.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Brute-Force & Rate Limiting Guard</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Throttles consecutive failed login attempts and emergency unlock operations with exponential backoff.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSecurityAudit(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL DATA CONFIRMATION MODAL WITH 'RESET' AND CAPTCHA VALIDATION */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-950/80 border border-rose-700/80 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded">
                    Admin Security Guard
                  </span>
                  <span className="text-[11px] text-slate-400">Irreversible Action</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Wipe &amp; Reset Institutional Platform?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  This administrative operation permanently deletes all configured faculties, departments, courses, examination blueprints, student rosters, and marks, returning the platform to a clean state.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              {/* Step 1: Confirmation Word */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  1. Type <strong className="text-rose-400 font-mono tracking-widest">RESET</strong> in capital letters to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={(e) => setResetConfirmWord(e.target.value)}
                  placeholder="Type RESET"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-wider focus:border-rose-500 focus:outline-none"
                  autoComplete="off"
                />
              </div>

              {/* Step 2: CAPTCHA Verification */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Security CAPTCHA Verification:
                  </label>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                    title="Generate new CAPTCHA challenge"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change Code</span>
                  </button>
                </div>

                {/* Visual Styled Captcha Badge */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-900/50 flex items-center justify-center select-none shadow-inner"
                    style={{ letterSpacing: '0.45em' }}
                  >
                    <span className="font-mono text-xl font-black text-rose-300 italic line-through decoration-rose-500/50 drop-shadow-md">
                      {captchaCode}
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character CAPTCHA"
                  maxLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-widest uppercase focus:border-rose-500 focus:outline-none"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                {resetConfirmWord === 'RESET' && captchaInput.toUpperCase() === captchaCode.toUpperCase() ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verification passed</span>
                  </span>
                ) : (
                  <span>Both RESET and Captcha required</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetSystem}
                  disabled={resetConfirmWord !== 'RESET' || captchaInput.toUpperCase() !== captchaCode.toUpperCase()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed shadow-md shadow-rose-950/50 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Execute Platform Wipe</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <DashboardShell />
    </AppProvider>
  );
}
