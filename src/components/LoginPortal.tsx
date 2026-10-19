'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole, AppTheme, OutgoingEmailNotification } from '@/types/erp';
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
  Check,
  Key,
  RefreshCw,
  Copy,
  X,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Inbox,
  Clock,
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
    emailConfig,
    outgoingEmails,
    requestForgotPassword,
    verifyOtpAndSetPassword,
  } = useApp();

  const isSystemEmpty = !isInitialized || !tenant || users.length === 0;
  const [showInitialSetupWizard, setShowInitialSetupWizard] = useState(false);

  // Main login inputs - defaults to first real user in institution if present
  const [email, setEmail] = useState(() => users[0]?.email || '');
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

  // Outgoing Email Simulator Modal State
  const [showEmailSimulator, setShowEmailSimulator] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<OutgoingEmailNotification | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Check URL parameters for magic OTP setup links
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

  const handleSelectRealAccount = (user: (typeof users)[0]) => {
    setEmail(user.email);
    setPassword('••••••••');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

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
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
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
            'This account is pending first-time password setup. Please click "Set Password with OTP" below.'
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
            : `No registered account found with email "${email}". Please verify your email or contact the administrator.`
        );
      }
      setIsLoading(false);
    }, 300);
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
        setSuccessMessage('Password reset successfully! You can now sign in.');
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
      setSetupError('Please enter the 6-digit OTP code received in your email.');
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
          setSuccessMessage('Account activated. Click "Sign In" to proceed.');
        }, 1200);
      }
    }, 400);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(key);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  const themesList: Array<{ id: AppTheme; name: string; desc: string }> = [
    { id: 'zen-minimalist', name: 'Zen Minimalist', desc: 'Serene warm washi paper light theme' },
    { id: 'clean-light', name: 'Clean Light', desc: 'Crisp university daylight modern light theme' },
    { id: 'obsidian-black', name: 'Obsidian Black', desc: 'High-contrast pure OLED black mode' },
  ];

  // If system is empty and user clicked Initial Setup Wizard
  if (isSystemEmpty && showInitialSetupWizard) {
    return <InitialSetupWizard onCancel={() => setShowInitialSetupWizard(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 selection:bg-indigo-600 selection:text-white">
      {/* Top Bar with Brand, Outgoing Emails / OTP Simulator, and Theme Switcher */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">
              {tenant?.name || 'Academic ERP & OBE Platform'}
            </span>
            <span className="hidden sm:inline text-slate-500 text-xs ml-2">
              &bull; Academic Year 2026–2027
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Outgoing Notification & OTP simulator viewer button */}
          <button
            type="button"
            onClick={() => setShowEmailSimulator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all shadow-sm"
            title="Inspect outgoing email notifications and OTP codes"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Email & OTP Log</span>
            <span className="bg-indigo-950 text-indigo-300 text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-indigo-800">
              {outgoingEmails.length}
            </span>
          </button>

          {/* Theme Picker */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <div className="flex gap-1">
              {themesList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    theme === t.id
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={t.desc}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STRICT RULE BANNER: Only if everything is empty then on the main login page the initial set up can be done */}
      {isSystemEmpty && (
        <div className="w-full max-w-4xl mb-6 p-5 bg-indigo-950/80 border border-indigo-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-indigo-950/40">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Initial Institution Provisioning Required
                </span>
                <span className="text-[10px] bg-indigo-900 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-700">
                  Database Empty
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                No institution or administrative accounts exist. Run the guided setup wizard to configure your institution, initial faculty, and regulations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInitialSetupWizard(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap self-start sm:self-auto transition-all"
          >
            <span>Launch Initial Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Login Card */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Left Column: Login Form */}
        <div className="md:col-span-6 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                Institutional SSO & Auth
              </span>
              <span className="text-xs text-slate-400">NBA / ABET Accredited</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Portal Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with your university account credentials to access course matrices and mark entry modules.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStep('REQUEST');
                    setForgotError(null);
                    setForgotNotice(null);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Identity...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* First-time Account Activation with OTP link */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Newly registered account?</span>
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
              className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Set Password with OTP</span>
            </button>
          </div>

          {/* Security Assurance Badge */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SQLi & XSS Shield Active</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Argon2id Salted</span>
          </div>
        </div>

        {/* Right Column: Active Registered Institution Accounts */}
        <div className="md:col-span-6 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Institutional Logins ({users.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Academic ERP</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              {users.length === 0
                ? 'No user accounts currently exist in the database. On reset, all prior logins were deleted. Launch Initial Setup to establish your primary administrator credentials.'
                : 'Select any registered institution account below to auto-fill credentials, or enter your registered email to sign in.'}
            </p>

            {users.length === 0 ? (
              <div className="p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
                <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-white">Database Clean / 0 Accounts</div>
                <p className="text-[11px] text-slate-400">
                  Click the button below to initialize your institution structure and configure the primary administrator account.
                </p>
                <button
                  type="button"
                  onClick={() => setShowInitialSetupWizard(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Configure Institution &amp; Admin</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {users.map((acc) => {
                  const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectRealAccount(acc)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-600 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{acc.fullName}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              acc.role === 'TENANT_ADMIN'
                                ? 'bg-rose-950 border border-rose-800 text-rose-300'
                                : acc.role === 'HEAD_OF_FACULTY' || acc.role === 'HEAD_OF_SCHOOL'
                                ? 'bg-amber-950 border border-amber-800 text-amber-300'
                                : acc.role === 'HOD'
                                ? 'bg-blue-950 border border-blue-800 text-blue-300'
                                : acc.role === 'COURSE_COORDINATOR'
                                ? 'bg-purple-950 border border-purple-800 text-purple-300'
                                : acc.role === 'COURSE_FACULTY'
                                ? 'bg-teal-950 border border-teal-800 text-teal-300'
                                : 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                            }`}
                          >
                            {acc.role.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-slate-300">{acc.department}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-500 text-[10px]">{acc.email}</span>
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <span className="text-[10px] text-indigo-400 font-semibold hover:underline">
                          Select
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 text-center border-t border-slate-800/80 pt-3">
            Institutional Role-Based Access Control (RBAC) &amp; Argon2id password verification active.
          </div>
        </div>
      </div>

      {/* MODAL 1: FORGOT PASSWORD (Enforcing Single Self-Service Reset Policy!) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Password Recovery</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white p-1"
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

            {/* STRICT POLICY LOCK NOTICE: Subsequent resets locked after first self-service reset! */}
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
                  Please contact the Main Institutional Administrator (<span className="text-white font-mono">admin@institution.edu</span>) to unlock and issue a master password reset authorization for your account.
                </p>
              </div>
            )}

            {forgotStep === 'REQUEST' && !forgotNotice && (
              <form onSubmit={handleRequestForgotPassword} className="space-y-4 text-xs">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Enter your registered institutional email. A secure 6-digit OTP verification code will be dispatched to your inbox.
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
                <div className="p-3 bg-indigo-950/50 border border-indigo-800 rounded-xl text-indigo-300 text-xs flex items-center justify-between">
                  <span>Verification code sent to {forgotEmail}</span>
                  <button
                    type="button"
                    onClick={() => setShowEmailSimulator(true)}
                    className="text-xs text-indigo-400 font-bold underline hover:text-indigo-300"
                  >
                    View OTP Log
                  </button>
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

                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  Note: Following this reset, further password resets are locked for security and require Main Admin authorization.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Activate Account & Set Password</h3>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              New faculty, coordinators, and students must validate their 6-digit OTP received via email to set their initial account password.
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    6-Digit Verification OTP *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmailSimulator(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    View OTP in Simulator
                  </button>
                </div>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSetupLoading ? 'Activating...' : 'Validate OTP & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OUTGOING NOTIFICATION & OTP SIMULATOR DRAWER */}
      {showEmailSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Institutional Email Dispatch & OTP Log
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live record of emails sent by the portal (First-Time Setup, Password Reset OTPs)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailSimulator(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {outgoingEmails.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No email notifications dispatched yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Creating user accounts or using &quot;Forgot Password&quot; will generate live OTP emails here.
                  </p>
                </div>
              ) : (
                outgoingEmails.map((mail) => (
                  <div
                    key={mail.id}
                    className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                            mail.type === 'FIRST_TIME_SETUP'
                              ? 'bg-teal-950 border border-teal-800 text-teal-300'
                              : mail.type === 'FORGOT_PASSWORD'
                              ? 'bg-amber-950 border border-amber-800 text-amber-300'
                              : 'bg-purple-950 border border-purple-800 text-purple-300'
                          }`}
                        >
                          {mail.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(mail.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{mail.subject}</h4>
                      <p className="text-[11px] text-slate-400">
                        To: <span className="text-slate-200 font-medium">{mail.recipientName}</span> (
                        <span className="font-mono text-slate-400">{mail.recipientEmail}</span>)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {mail.otp && (
                        <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700 px-2.5 py-1.5 rounded-xl">
                          <span className="text-[10px] text-indigo-400 uppercase font-bold">OTP:</span>
                          <span className="font-mono font-black text-xs text-white tracking-wider">
                            {mail.otp}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(mail.otp!, mail.id)}
                            className="text-indigo-400 hover:text-white ml-1 p-0.5"
                            title="Copy OTP to clipboard"
                          >
                            {copiedOtp === mail.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setPreviewEmail(mail)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/50">
              <span>
                Configured Gateway: <span className="font-mono text-indigo-400">{emailConfig.host}:{emailConfig.port}</span> ({emailConfig.senderEmail})
              </span>
              <button
                type="button"
                onClick={() => setShowEmailSimulator(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Simulated Email Notification</span>
              </h3>
              <button
                onClick={() => setPreviewEmail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white text-slate-900 rounded-2xl p-6 space-y-4 shadow-inner text-xs font-sans">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-[11px] text-slate-500">
                  From: <strong>{emailConfig.senderName}</strong> &lt;{emailConfig.senderEmail}&gt;
                </div>
                <div className="text-[11px] text-slate-500">
                  To: <strong>{previewEmail.recipientName}</strong> &lt;{previewEmail.recipientEmail}&gt;
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{previewEmail.subject}</h4>
              </div>

              <div className="space-y-3">
                <p>Dear {previewEmail.recipientName},</p>
                <p className="text-slate-700">
                  {previewEmail.type === 'FIRST_TIME_SETUP' &&
                    `Welcome to ${tenant?.name || 'Academic ERP & OBE Platform'}! An institutional user account has been registered for you.`}
                  {previewEmail.type === 'FORGOT_PASSWORD' &&
                    'We received a request to reset your password for your institutional account.'}
                  {previewEmail.type === 'ADMIN_RESET' &&
                    'The Main Institutional Administrator has authorized a password reset for your account.'}
                </p>

                {previewEmail.otp && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-1">
                    <span className="text-[11px] text-indigo-800 uppercase tracking-wider font-semibold block">
                      Your One-Time Password (OTP) Code:
                    </span>
                    <span className="text-2xl font-black font-mono text-indigo-600 tracking-widest block">
                      {previewEmail.otp}
                    </span>
                    <span className="text-[10px] text-slate-500">Valid for immediate session verification</span>
                  </div>
                )}

                {previewEmail.link && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewEmail(null);
                        setShowEmailSimulator(false);
                        if (previewEmail.type === 'FORGOT_PASSWORD') {
                          setForgotEmail(previewEmail.recipientEmail);
                          setForgotOtp(previewEmail.otp || '');
                          setForgotStep('VERIFY');
                          setShowForgotModal(true);
                        } else {
                          setSetupEmail(previewEmail.recipientEmail);
                          setSetupOtp(previewEmail.otp || '');
                          setShowSetupModal(true);
                        }
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow"
                    >
                      Click Here to Set / Reset Password
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
