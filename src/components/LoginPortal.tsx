'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AppTheme } from '@/types/erp';
import { InitialSetupWizard } from '@/components/InitialSetupWizard';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Palette,
  Key,
  X,
  ShieldAlert,
  CheckCircle2,
  Building2,
  CheckCircle,
} from 'lucide-react';
import { validateAgainstSqlInjection, sanitizeInput, checkRateLimit, resetRateLimit } from '@/lib/security';

export const LoginPortal: React.FC = () => {
  const {
    tenant,
    users,
    login,
    theme,
    setTheme,
    isInitialized,
    requestForgotPassword,
    verifyOtpAndSetPassword,
  } = useApp();

  const isSystemEmpty = !isInitialized || !tenant || users.length === 0;
  const [showInitialSetupWizard, setShowInitialSetupWizard] = useState(false);

  // Main login inputs - completely blank by default to prevent credential leakage
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // First-Time Setup / OTP Password Set Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupOtp, setSetupOtp] = useState('');
  const [setupNewPassword, setSetupNewPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(false);

  // Check URL parameters for magic OTP setup links (e.g. from institutional activation emails)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const emailParam = params.get('email');
      const otpParam = params.get('otp');

      if ((action === 'set-password' || action === 'admin-reset' || action === 'reset-password') && emailParam) {
        if (action === 'reset-password') {
          setForgotEmail(emailParam);
          if (otpParam) setForgotOtp(otpParam);
          setForgotStep('VERIFY');
          setShowForgotModal(true);
        } else {
          setSetupEmail(emailParam);
          if (otpParam) setSetupOtp(otpParam);
          setShowSetupModal(true);
        }
      }
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(`login_${email.trim()}`, 5, 30000, 60000);
    if (!rateCheck.allowed) {
      setErrorMessage(
        `Too many failed attempts. Security lock active. Please retry in ${rateCheck.retryAfterSeconds} seconds.`
      );
      return;
    }

    // 2. SQL Injection Validation
    const emailSqli = validateAgainstSqlInjection(email);
    if (!emailSqli.isValid) {
      setErrorMessage(emailSqli.detectedThreat || 'Invalid characters detected in email.');
      return;
    }

    const passSqli = validateAgainstSqlInjection(password);
    if (!passSqli.isValid) {
      setErrorMessage(passSqli.detectedThreat || 'Invalid characters detected in password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const sanitizedEmail = sanitizeInput(email).toLowerCase().trim();
      const foundUser = users.find((u) => u.email.toLowerCase() === sanitizedEmail);

      if (foundUser) {
        if (foundUser.approvalStatus === 'PENDING' || foundUser.status === 'PENDING_APPROVAL') {
          setErrorMessage(
            `Account Pending Approval: This account was provisioned by ${foundUser.createdByName || 'Academic Unit Head'} (${foundUser.createdByRole ? foundUser.createdByRole.replace(/_/g, ' ') : 'Leadership'}) and is awaiting Institutional Administrator approval before access is permitted.`
          );
          setIsLoading(false);
          return;
        }

        if (foundUser.approvalStatus === 'REJECTED') {
          setErrorMessage(
            `Account Registration Not Approved: ${foundUser.rejectionReason || 'Account request was declined by institutional administrator.'}`
          );
          setIsLoading(false);
          return;
        }

        if (foundUser.status === 'PENDING_PASSWORD_SETUP' && foundUser.setupOtp) {
          setErrorMessage(
            'This account is pending first-time password setup. Please click "Activate Account with OTP" below.'
          );
          setSetupEmail(foundUser.email);
          setIsLoading(false);
          return;
        }

        resetRateLimit(`login_${email.trim()}`);
        login(foundUser);
      } else {
        setErrorMessage(
          users.length === 0
            ? 'No user accounts exist in the system. Please launch Initial Setup below.'
            : `Invalid email or credentials. Please verify your address or contact the institutional administrator.`
        );
      }
      setIsLoading(false);
    }, 350);
  };

  // Forgot password submission
  const handleRequestForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotNotice(null);
    if (!forgotEmail.trim()) return;

    setIsForgotLoading(true);
    setTimeout(() => {
      const res = requestForgotPassword(forgotEmail.trim());
      setIsForgotLoading(false);

      if (!res.success) {
        if (res.isLocked) {
          setForgotNotice(res.message);
        } else {
          setForgotError(res.message);
        }
      } else {
        setForgotStep('VERIFY');
      }
    }, 400);
  };

  const handleVerifyForgotOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must contain at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsForgotLoading(true);
    setTimeout(() => {
      const res = verifyOtpAndSetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
      setIsForgotLoading(false);

      if (!res.success) {
        setForgotError(res.message);
      } else {
        setShowForgotModal(false);
        setEmail(forgotEmail.trim());
        setPassword(forgotNewPassword);
        setSuccessMessage('Password updated successfully! You can now sign in.');
      }
    }, 400);
  };

  // First-time OTP Password Set submission
  const handleVerifySetupOtpAndSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(null);

    if (!setupEmail.trim()) {
      setSetupError('Please enter your institutional email address.');
      return;
    }
    if (!setupOtp.trim()) {
      setSetupError('Please enter the 6-digit activation OTP code received in your email.');
      return;
    }
    if (setupNewPassword.length < 6) {
      setSetupError('Password must contain at least 6 characters.');
      return;
    }
    if (setupNewPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    setIsSetupLoading(true);
    setTimeout(() => {
      const res = verifyOtpAndSetPassword(setupEmail.trim(), setupOtp.trim(), setupNewPassword);
      setIsSetupLoading(false);

      if (!res.success) {
        setSetupError(res.message);
      } else {
        setSetupSuccess('Account successfully activated and password secured!');
        setEmail(setupEmail.trim());
        setPassword(setupNewPassword);
        setTimeout(() => {
          setShowSetupModal(false);
          setSuccessMessage('Account activated. Click "Sign In" to access your dashboard.');
        }, 1200);
      }
    }, 400);
  };

  const themesList: Array<{ id: AppTheme; name: string; desc: string }> = [
    { id: 'zen-minimalist', name: 'Zen Minimalist', desc: 'Serene warm washi paper light theme' },
    { id: 'clean-light', name: 'Clean Light', desc: 'Crisp university daylight modern light theme' },
    { id: 'obsidian-black', name: 'Obsidian Black', desc: 'High-contrast pure OLED black mode' },
  ];

  // If system is completely empty and user clicked Initial Setup Wizard
  if (isSystemEmpty && showInitialSetupWizard) {
    return <InitialSetupWizard onCancel={() => setShowInitialSetupWizard(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] relative flex flex-col justify-between items-center p-4 sm:p-6 selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      {/* Background Decorative Ambient Lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 z-10 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 ring-1 ring-white/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {tenant?.name || 'Academic ERP & OBE Platform'}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Live Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Outcome-Based Education Management &bull; AY 2026–2027
            </p>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-2xl text-xs shadow-sm">
          <Palette className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <div className="flex gap-1">
            {themesList.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
                  theme === t.id
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
                title={t.desc}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md my-auto py-8 z-10">
        {/* System Empty Alert (Only shown when 0 accounts exist) */}
        {isSystemEmpty && (
          <div className="mb-6 p-4 bg-indigo-950/90 border border-indigo-700/80 rounded-2xl shadow-xl shadow-indigo-950/40 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Initial Provisioning Required
                </h4>
                <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
                  No institution records or administrator credentials exist. Launch the setup wizard to configure your university and primary administrator.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInitialSetupWizard(true)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <span>Launch Initial Setup Wizard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Executive Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl shadow-2xl shadow-black/80 p-6 sm:p-8 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-300 mb-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Institutional Sign In</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Sign In to Your Account
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Access outcome attainment matrices, student marks entry, and curriculum governance.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800/90 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/90 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px]">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStep('REQUEST');
                    setForgotError(null);
                    setForgotNotice(null);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Identity...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Account Activation Section */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Key className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-[11px]">New faculty or student?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSetupEmail(email);
                  setSetupOtp('');
                  setSetupNewPassword('');
                  setSetupConfirmPassword('');
                  setSetupError(null);
                  setSetupSuccess(null);
                  setShowSetupModal(true);
                }}
                className="text-teal-400 hover:text-teal-300 font-semibold hover:underline text-[11px] whitespace-nowrap"
              >
                Activate Account with OTP
              </button>
            </div>
          </div>

          {/* Trust & Security Indicators */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Argon2id Salted</span>
            </div>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>NBA / ABET OBE</span>
            </div>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>TLS 1.3 Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 z-10">
        <div>
          &copy; {new Date().getFullYear()} {tenant?.name || 'Academic ERP & OBE Platform'}. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Role-Based Access Control</span>
          <span>&bull;</span>
          <span>Zero Public Account Exposure</span>
          <span>&bull;</span>
          <span>Security Hardened</span>
        </div>
      </footer>

      {/* MODAL 1: FORGOT PASSWORD */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Password Recovery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STRICT POLICY LOCK NOTICE: Subsequent resets locked after first self-service reset */}
            {forgotNotice && (
              <div className="p-4 bg-amber-950/70 border border-amber-800 rounded-2xl text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Institutional Security Lockout Active</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-200">
                  {forgotNotice}
                </p>
                <p className="text-[11px] text-slate-300 pt-1 border-t border-amber-900/60">
                  Please contact your Institutional Administrator to authorize an additional password reset.
                </p>
              </div>
            )}

            {forgotStep === 'REQUEST' && !forgotNotice && (
              <form onSubmit={handleRequestForgotPassword} className="space-y-4 text-xs">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Enter your registered institutional email. A secure 6-digit OTP code will be dispatched to your inbox.
                </p>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. sunita.sharma@institution.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isForgotLoading ? 'Sending Code...' : 'Send Verification OTP'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'VERIFY' && !forgotNotice && (
              <form onSubmit={handleVerifyForgotOtpAndReset} className="space-y-4 text-xs">
                <div className="p-3 bg-indigo-950/50 border border-indigo-800/80 rounded-xl text-indigo-300 text-xs">
                  <span>Verification code sent to your registered institutional inbox ({forgotEmail}).</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    6-Digit OTP Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="e.g. 549281"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono tracking-widest text-base focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    New Secure Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isForgotLoading ? 'Updating Password...' : 'Verify OTP & Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: FIRST-TIME SETUP / OTP PASSWORD SET ACTIVATION */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Activate Account & Set Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              New faculty, coordinators, and students must validate their 6-digit OTP received via email to activate their account and set their personal password.
            </p>

            {setupError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            {setupSuccess && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{setupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleVerifySetupOtpAndSetPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Institutional Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="e.g. sunita.sharma@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  6-Digit Activation OTP *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={setupOtp}
                  onChange={(e) => setSetupOtp(e.target.value)}
                  placeholder="e.g. 741852"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono tracking-widest text-base focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Set Account Password *
                </label>
                <input
                  type="password"
                  required
                  value={setupNewPassword}
                  onChange={(e) => setSetupNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSetupLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSetupLoading ? 'Activating...' : 'Validate OTP & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
