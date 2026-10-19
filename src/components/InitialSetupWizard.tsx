'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Layers,
  Lock,
  Palette,
} from 'lucide-react';
import { AppTheme } from '@/types/erp';

export interface InitialSetupWizardProps {
  onCancel?: () => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({ onCancel }) => {
  const { initializeInstitution, theme, setTheme } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Institution Details
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [obeCutoff, setObeCutoff] = useState('60');

  // Step 2: Administrator Profile
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('Office of the Registrar');
  const [mfaEnabled, setMfaEnabled] = useState(true);

  // Step 3: Initial Structure (Optional 2026 Batch Reference)
  const [facultyName, setFacultyName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [programName, setProgramName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!instName.trim() || !instCode.trim()) {
        setErrorMsg('Please enter both Institution Name and Institution Code.');
        return;
      }
      if (!subdomain.trim()) {
        setSubdomain(
          `${instCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.obeplatform.io`
        );
      }
      setStep(2);
    } else if (step === 2) {
      if (!adminName.trim() || !adminEmail.trim()) {
        setErrorMsg('Please enter Administrator Full Name and Official Email.');
        return;
      }
      if (!adminPassword.trim() || adminPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      setStep(3);
    }
  };

  const handleCompleteSetup = () => {
    setErrorMsg(null);
    initializeInstitution({
      tenant: {
        id: `tenant-${Date.now()}`,
        name: instName.trim(),
        code: instCode.trim().toUpperCase(),
        subdomain: subdomain.trim().toLowerCase(),
        mfaEnforced: mfaEnabled,
      },
      admin: {
        id: `admin-${Date.now()}`,
        fullName: adminName.trim(),
        email: adminEmail.trim(),
        role: 'TENANT_ADMIN',
        department: adminDepartment.trim(),
        isMfaEnabled: mfaEnabled,
      },
      initialFacultyName: facultyName.trim() || undefined,
      initialDeptName: deptName.trim() || undefined,
      initialProgramName: programName.trim() || undefined,
      initialCourseCode: courseCode.trim() || undefined,
      initialCourseTitle: courseTitle.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Brand Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-glow">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Academic ERP & OBE Attainment Platform
              </h1>
              <p className="text-xs text-slate-400">
                Initial Institution Provisioning & Governance Setup Wizard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-xl text-xs">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as AppTheme)}
                className="bg-transparent text-slate-300 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="obsidian-black" className="bg-slate-900 text-white">Obsidian Black (Dark)</option>
                <option value="clean-light" className="bg-slate-900 text-white">Clean Light</option>
              </select>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800">
              Step {step} of 3
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: INSTITUTION DETAILS */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>1. Institution & Accreditation Parameters</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your University or Autonomous College profile. All OBE calculations and RLS partitions will derive from this tenant.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Full Institution / University Name *
                </label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. Apex Institute of Science & Technology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Institution Code (Short Identifier) *
                  </label>
                  <input
                    type="text"
                    value={instCode}
                    onChange={(e) => setInstCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AIST, STANFORD, BITS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Target SaaS Subdomain
                  </label>
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                    placeholder="e.g. apex.obeplatform.io"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Default Question Mastery Cutoff (%)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="90"
                    value={obeCutoff}
                    onChange={(e) => setObeCutoff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Direct vs Indirect Weight Ratio
                  </label>
                  <input
                    type="text"
                    disabled
                    value="80% Direct / 20% Exit Survey"
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-slate-400 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PRIMARY ADMINISTRATOR ACCOUNT */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-400" />
                <span>2. Create Primary Administrator Account</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                This account holds master administrative authority (`TENANT_ADMIN`) to configure departments, courses, lock/freeze windows, and OBE attainment models.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Official Institutional Email *
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. registrar@institution.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Master Password (Min 6 chars) *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="font-semibold text-white">Enforce Multi-Factor Authentication (MFA)</div>
                    <div className="text-[10px] text-slate-400">TOTP Authenticator compliance for accreditation audits</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={mfaEnabled}
                  onChange={(e) => setMfaEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INITIAL ACADEMIC STRUCTURE */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>3. Initial Academic Structure (Quick Bootstrap)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set up your first Faculty, Department, and Course offering. You will manage, add, or delete any of these later through the Admin Management Hub.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Academic Faculty Name
                  </label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="e.g. Faculty of Engineering & Technology (2026 Batch)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Department of Computer Science & Engineering"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Degree Program Name
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g. B.Tech in Computer Science & Engineering (2026 Batch)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-slate-300 font-semibold block mb-1">
                    First Course Code
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS2601"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono uppercase placeholder:text-slate-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms (2026 Batch)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {step === 1 && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Back to Login
              </button>
            )}
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteSetup}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-glow"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Launch Academic ERP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
