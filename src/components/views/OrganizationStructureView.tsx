'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  AcademicFaculty,
  AcademicSchool,
  AcademicDepartment,
  UserAccount,
  UserRole,
  OutgoingEmailNotification,
} from '@/types/erp';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  Building2,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Network,
  ChevronRight,
  School,
  GraduationCap,
  FileSpreadsheet,
  Users,
  UserCheck,
  Key,
  Mail,
  Send,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  Eye,
  Settings,
  Sparkles,
  Lock,
  Unlock,
  Search,
} from 'lucide-react';
import { sanitizeInput } from '@/lib/security';

export const OrganizationStructureView: React.FC = () => {
  const {
    tenant,
    currentUserRole,
    faculties,
    addFaculty,
    addFacultiesBatch,
    updateFaculty,
    deleteFaculty,
    setFacultyHead,
    schools,
    addSchool,
    addSchoolsBatch,
    updateSchool,
    deleteSchool,
    setSchoolHead,
    departments,
    addDepartment,
    addDepartmentsBatch,
    updateDepartment,
    deleteDepartment,
    setDepartmentHead,
    users,
    addUser,
    addUsersBatch,
    updateUser,
    deleteUser,
    approveUserAccount,
    rejectUserAccount,
    adminResetUserPassword,
    emailConfig,
    updateEmailConfig,
    outgoingEmails,
    clearOutgoingEmails,
    sendTestEmail,
    activeSubTab,
    setActiveSubTab,
    academicScope,
    currentUser,
  } = useApp();

  const [subTab, setSubTab] = useState<
    'faculties' | 'schools' | 'departments' | 'users' | 'email-config' | 'tree'
  >(
    (['faculties', 'schools', 'departments', 'users', 'email-config', 'tree'].includes(activeSubTab)
      ? (activeSubTab as any)
      : 'faculties')
  );

  React.useEffect(() => {
    if (['faculties', 'schools', 'departments', 'users', 'email-config', 'tree'].includes(activeSubTab)) {
      if (activeSubTab === 'email-config' && !academicScope.isAdmin) {
        setSubTab('faculties');
      } else {
        setSubTab(activeSubTab as any);
      }
    }
  }, [activeSubTab, academicScope.isAdmin]);

  const switchSubTab = (tab: 'faculties' | 'schools' | 'departments' | 'users' | 'email-config' | 'tree') => {
    if (tab === 'email-config' && !academicScope.isAdmin) {
      showMsg('Access Restricted: Only Institutional Administrators can access SMTP credentials and system outbox logs.', 'error');
      return;
    }
    setSubTab(tab);
    setActiveSubTab(tab);
  };
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Modals state for hierarchy
  const [modalType, setModalType] = useState<
    | 'addFaculty'
    | 'editFaculty'
    | 'addSchool'
    | 'editSchool'
    | 'addDept'
    | 'editDept'
    | 'addUser'
    | 'editUser'
    | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for hierarchy
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentFacultyId, setParentFacultyId] = useState('');
  const [parentSchoolId, setParentSchoolId] = useState('');
  const [selectedHeadUserId, setSelectedHeadUserId] = useState('');

  // Form states for User Management
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('COURSE_FACULTY');
  const [userDepartment, setUserDepartment] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Form states for Email Configuration
  const [smtpHost, setSmtpHost] = useState(emailConfig.host);
  const [smtpPort, setSmtpPort] = useState(emailConfig.port);
  const [smtpSecure, setSmtpSecure] = useState(emailConfig.secure);
  const [smtpSenderName, setSmtpSenderName] = useState(emailConfig.senderName);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState(emailConfig.senderEmail);
  const [smtpUsername, setSmtpUsername] = useState(emailConfig.username);
  const [smtpPassword, setSmtpPassword] = useState(emailConfig.password || '');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  // Email preview modal state
  const [previewEmail, setPreviewEmail] = useState<OutgoingEmailNotification | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string, otpKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(otpKey);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  // Role-Based Eligible Head Accounts (Enforces: accounts with just faculty role cannot head Faculty, School, or Dept)
  const eligibleHoFUsers = users.filter((u) => u.role === 'HEAD_OF_FACULTY' || u.role === 'TENANT_ADMIN');
  const eligibleHoSUsers = users.filter((u) => u.role === 'HEAD_OF_SCHOOL' || u.role === 'TENANT_ADMIN');
  const eligibleHodUsers = users.filter((u) => u.role === 'HOD' || u.role === 'TENANT_ADMIN');

  // Open Hierarchy Modals
  const openAddFaculty = () => {
    if (!academicScope.canCreateFaculty) {
      showMsg('Access Restricted: Only Tenant Administrator can register a new Faculty. Head of Faculty can create schools within their faculty.', 'error');
      return;
    }
    setCode(`FAC-${faculties.length + 1}-2026`);
    setName('');
    setSelectedHeadUserId('');
    setEditingId(null);
    setModalType('addFaculty');
  };

  const openEditFaculty = (f: AcademicFaculty) => {
    if (!academicScope.canEditFaculty) {
      showMsg('Access Restricted: Only Institutional Administrators can edit Faculty details.', 'error');
      return;
    }
    setCode(f.code);
    setName(f.name);
    setSelectedHeadUserId(f.headUserId || '');
    setEditingId(f.id);
    setModalType('editFaculty');
  };

  const openAddSchool = () => {
    if (!academicScope.canCreateSchool) {
      showMsg('Access Restricted: Only Tenant Administrator or Head of Faculty can create schools.', 'error');
      return;
    }
    setCode(`SCH-${schools.length + 1}-2026`);
    setName('');
    const defaultFacId = academicScope.isHeadOfFaculty && academicScope.ledFaculties.length > 0
      ? academicScope.ledFaculties[0].id
      : (academicScope.visibleFaculties[0]?.id || faculties[0]?.id || '');
    setParentFacultyId(defaultFacId);
    setSelectedHeadUserId('');
    setEditingId(null);
    setModalType('addSchool');
  };

  const openEditSchool = (s: AcademicSchool) => {
    if (!academicScope.canEditSchool) {
      showMsg('Access Restricted: Only Institutional Administrators or Head of Faculty can edit School details.', 'error');
      return;
    }
    setCode(s.code);
    setName(s.name);
    setParentFacultyId(s.facultyId);
    setSelectedHeadUserId(s.headUserId || '');
    setEditingId(s.id);
    setModalType('editSchool');
  };

  const openAddDept = () => {
    if (!academicScope.canCreateDepartment) {
      showMsg('Access Restricted: Only Tenant Administrator, Head of Faculty, or Head of School can create departments.', 'error');
      return;
    }
    setCode(`DEPT-${departments.length + 1}-2026`);
    setName('');
    const defaultSchoolId = academicScope.isHeadOfSchool && academicScope.ledSchools.length > 0
      ? academicScope.ledSchools[0].id
      : (academicScope.visibleSchools[0]?.id || schools[0]?.id || 'school-default');
    setParentSchoolId(defaultSchoolId);
    setSelectedHeadUserId('');
    setEditingId(null);
    setModalType('addDept');
  };

  const openEditDept = (d: AcademicDepartment) => {
    if (!academicScope.canEditDepartment) {
      showMsg('Access Restricted: Only Administrators, Head of Faculty, or Head of School can edit Department details.', 'error');
      return;
    }
    setCode(d.code);
    setName(d.name);
    setParentSchoolId(d.schoolId);
    setSelectedHeadUserId(d.headUserId || '');
    setEditingId(d.id);
    setModalType('editDept');
  };

  // Open User Modals
  const openAddUser = (initialRole?: UserRole | React.MouseEvent) => {
    setUserFullName('');
    setUserEmail('');
    const allowed = academicScope.assignableRoles;
    const requested = typeof initialRole === 'string' ? initialRole : undefined;
    const defaultRole = (requested && allowed.includes(requested))
      ? requested
      : (allowed.length > 0 ? allowed[0] : 'COURSE_FACULTY');
    setUserRole(defaultRole);
    setUserDepartment(departments[0]?.name || 'Computer Science & Engineering');
    setEditingId(null);
    setModalType('addUser');
  };

  const openEditUser = (u: UserAccount) => {
    if (!academicScope.isAdmin && u.id !== currentUser?.id) {
      showMsg('Access Restricted: Non-admin users can only view or edit their own profile.', 'error');
      return;
    }
    setUserFullName(u.fullName);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserDepartment(u.department || '');
    setEditingId(u.id);
    setModalType('editUser');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setCode('');
    setName('');
    setSelectedHeadUserId('');
    setUserFullName('');
    setUserEmail('');
  };

  // Hierarchy Save Handlers
  const handleSaveFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const assignedUser = users.find((u) => u.id === selectedHeadUserId);

    if (modalType === 'addFaculty') {
      if (!academicScope.isAdmin) {
        showMsg('Access Restricted: Only Institutional Administrators can register new faculties.', 'error');
        return;
      }
      addFaculty(code.trim().toUpperCase(), name.trim(), assignedUser?.id, assignedUser?.fullName);
      showMsg(`Faculty ${code.trim().toUpperCase()} registered with assigned Head.`);
    } else if (editingId) {
      if (!academicScope.canEditFaculty) {
        showMsg('Access Restricted: Only Institutional Administrators can update Faculty details.', 'error');
        return;
      }
      const existingFaculty = faculties.find((f) => f.id === editingId);
      // Security: Only Institutional Administrator can appoint or replace the Head of Faculty.
      // An HoF cannot replace themselves or designate a new HoF!
      const canChangeHead = academicScope.isAdmin;
      const headUserId = canChangeHead ? (assignedUser?.id || undefined) : existingFaculty?.headUserId;
      const headUserName = canChangeHead ? (assignedUser?.fullName || undefined) : existingFaculty?.headUserName;

      updateFaculty(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        headUserId,
        headUserName,
      });
      if (canChangeHead && assignedUser) {
        setFacultyHead(editingId, assignedUser.id, assignedUser.fullName);
      }
      showMsg('Faculty details updated.');
    }
    closeModal();
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !parentFacultyId) return;
    const assignedUser = users.find((u) => u.id === selectedHeadUserId);

    if (modalType === 'addSchool') {
      if (!academicScope.isAdmin && !academicScope.isHeadOfFaculty) {
        showMsg('Access Restricted: Only Administrator or Head of Faculty can create schools.', 'error');
        return;
      }
      addSchool(parentFacultyId, code.trim().toUpperCase(), name.trim(), assignedUser?.id, assignedUser?.fullName);
      showMsg(`School ${code.trim().toUpperCase()} registered with assigned Head.`);
    } else if (editingId) {
      if (!academicScope.canEditSchool) {
        showMsg('Access Restricted: Only Administrators or Head of Faculty can update School details.', 'error');
        return;
      }
      const existingSchool = schools.find((s) => s.id === editingId);
      // Security: Only Administrator or Head of Faculty can appoint or replace the Head of School.
      // A Head of School cannot replace themselves or assign someone else as HoS!
      const canChangeHead = academicScope.isAdmin || academicScope.isHeadOfFaculty;
      const headUserId = canChangeHead ? (assignedUser?.id || undefined) : existingSchool?.headUserId;
      const headUserName = canChangeHead ? (assignedUser?.fullName || undefined) : existingSchool?.headUserName;

      updateSchool(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        facultyId: parentFacultyId,
        headUserId,
        headUserName,
      });
      if (canChangeHead && assignedUser) {
        setSchoolHead(editingId, assignedUser.id, assignedUser.fullName);
      }
      showMsg('School details updated.');
    }
    closeModal();
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !parentSchoolId) return;
    const assignedUser = users.find((u) => u.id === selectedHeadUserId);

    if (modalType === 'addDept') {
      if (!academicScope.isAdmin && !academicScope.isHeadOfFaculty && !academicScope.isHeadOfSchool) {
        showMsg('Access Restricted: Only Administrator, Head of Faculty, or Head of School can create departments.', 'error');
        return;
      }
      addDepartment(parentSchoolId, code.trim().toUpperCase(), name.trim(), assignedUser?.id, assignedUser?.fullName);
      showMsg(`Department ${code.trim().toUpperCase()} registered with assigned HOD.`);
    } else if (editingId) {
      if (!academicScope.canEditDepartment) {
        showMsg('Access Restricted: Only Administrators, Head of Faculty, or Head of School can update Department details.', 'error');
        return;
      }
      const existingDept = departments.find((d) => d.id === editingId);
      // Security: Only Administrator, Head of Faculty, or Head of School can appoint or replace the HOD.
      // A Head of Department cannot replace themselves or assign someone else as HOD!
      const canChangeHead = academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool;
      const headUserId = canChangeHead ? (assignedUser?.id || undefined) : existingDept?.headUserId;
      const headUserName = canChangeHead ? (assignedUser?.fullName || undefined) : existingDept?.headUserName;

      updateDepartment(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        schoolId: parentSchoolId,
        headUserId,
        headUserName,
      });
      if (canChangeHead && assignedUser) {
        setDepartmentHead(editingId, assignedUser.id, assignedUser.fullName);
      }
      showMsg('Department details updated.');
    }
    closeModal();
  };

  // User Save Handler with role hierarchy validation
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName.trim() || !userEmail.trim()) return;

    if (modalType === 'addUser') {
      // Validate role hierarchy permission
      if (academicScope.assignableRoles.length > 0 && !academicScope.assignableRoles.includes(userRole)) {
        showMsg(`You do not have permission to assign the role "${userRole}".`, 'error');
        return;
      }

      // Check existing email
      const existing = users.find((u) => u.email.toLowerCase() === userEmail.trim().toLowerCase());
      if (existing) {
        showMsg(`An account with email "${userEmail.trim()}" already exists.`, 'error');
        return;
      }

      const res = addUser({
        fullName: sanitizeInput(userFullName).trim(),
        email: sanitizeInput(userEmail).trim().toLowerCase(),
        role: userRole,
        department: sanitizeInput(userDepartment).trim(),
        isMfaEnabled: false,
        status: 'PENDING_PASSWORD_SETUP',
      });

      if (res.user.approvalStatus === 'PENDING') {
        showMsg(
          `Account created for ${res.user.fullName} (${res.user.role}). Queued for Administrator approval before activation.`,
          'info'
        );
      } else {
        showMsg(
          `Account created for ${res.user.fullName}. Welcome email with OTP (${res.otp}) dispatched to ${res.user.email}.`
        );
      }
    } else if (editingId) {
      const targetUser = users.find((u) => u.id === editingId);
      if (!targetUser) return;

      if (!academicScope.isAdmin && editingId !== currentUser?.id) {
        showMsg('Access Restricted: Only Administrators can modify other user accounts.', 'error');
        return;
      }

      let finalRole = targetUser.role;
      if (academicScope.canEditUserRole) {
        finalRole = userRole;
      } else if (userRole !== targetUser.role) {
        showMsg('Governance Policy: Modifying institutional roles is strictly reserved for Administrators.', 'error');
        return;
      }

      updateUser(editingId, {
        fullName: sanitizeInput(userFullName).trim(),
        role: finalRole,
        department: sanitizeInput(userDepartment).trim(),
      });
      showMsg(`Account details updated for ${userFullName}.`);
    }
    closeModal();
  };

  // Email Config Save Handler
  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailConfig({
      host: smtpHost.trim(),
      port: Number(smtpPort),
      secure: smtpSecure,
      senderName: smtpSenderName.trim(),
      senderEmail: smtpSenderEmail.trim(),
      username: smtpUsername.trim(),
      password: smtpPassword,
    });
    showMsg('SMTP Email configuration successfully saved.');
  };

  const handleSendTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient.trim()) return;
    const res = sendTestEmail(testEmailRecipient.trim());
    if (res.success) {
      showMsg(res.message);
      setShowTestEmailModal(false);
      setTestEmailRecipient('');
    } else {
      showMsg(res.message, 'error');
    }
  };

  // Filtered Users List with strict jurisdictional scoping
  const filteredUsers = useMemo(() => {
    let list = users;

    // Jurisdictional hierarchy filtering
    if (!academicScope.isAdmin) {
      if (academicScope.isHeadOfFaculty && academicScope.ledFaculties.length > 0) {
        // HoF: Sees accounts under ALL their faculties' departments, plus themselves. Cannot see Tenant/Super Admin.
        const ledFacultyIds = new Set(academicScope.ledFaculties.map((f) => f.id));
        const facultySchoolIds = new Set(schools.filter((s) => s.facultyId && ledFacultyIds.has(s.facultyId)).map((s) => s.id));
        const facultyDeptNames = new Set(departments.filter((d) => facultySchoolIds.has(d.schoolId)).map((d) => d.name));
        list = list.filter((u) => {
          if (u.role === 'SUPER_ADMIN' || u.role === 'TENANT_ADMIN') return false;
          if (u.id === currentUser?.id) return true;
          return u.department && facultyDeptNames.has(u.department);
        });
      } else if (academicScope.isHeadOfSchool && academicScope.ledSchools.length > 0) {
        // HoS: Sees accounts under ALL their schools' departments, plus themselves.
        const ledSchoolIds = new Set(academicScope.ledSchools.map((s) => s.id));
        const schoolDeptNames = new Set(departments.filter((d) => ledSchoolIds.has(d.schoolId)).map((d) => d.name));
        list = list.filter((u) => {
          if (u.role === 'SUPER_ADMIN' || u.role === 'TENANT_ADMIN' || u.role === 'HEAD_OF_FACULTY') return false;
          if (u.id === currentUser?.id) return true;
          return u.department && schoolDeptNames.has(u.department);
        });
      } else if (academicScope.isHod && academicScope.ledDepartments.length > 0) {
        // HoD: Sees accounts under ALL their departments, plus themselves.
        const myDeptNames = new Set(academicScope.ledDepartments.map((d) => d.name));
        list = list.filter((u) => {
          if (u.role === 'SUPER_ADMIN' || u.role === 'TENANT_ADMIN' || u.role === 'HEAD_OF_FACULTY' || u.role === 'HEAD_OF_SCHOOL') return false;
          if (u.id === currentUser?.id) return true;
          return u.department && myDeptNames.has(u.department);
        });
      } else {
        // Regular faculty / coordinator: can only see themselves or departmental colleagues
        list = list.filter((u) => u.id === currentUser?.id || (currentUser?.department && u.department === currentUser.department));
      }
    }

    return list.filter((u) => {
      const matchesQuery =
        u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, academicScope, schools, departments, currentUser, userSearchQuery, selectedRoleFilter]);

  // Role badge helper
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'TENANT_ADMIN':
      case 'SUPER_ADMIN':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300">
            Admin
          </span>
        );
      case 'HEAD_OF_FACULTY':
      case 'DEAN':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950/80 border border-teal-800 text-teal-300">
            Head of Faculty
          </span>
        );
      case 'HEAD_OF_SCHOOL':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300">
            Head of School
          </span>
        );
      case 'HOD':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
            HOD
          </span>
        );
      case 'COURSE_COORDINATOR':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300">
            Coordinator
          </span>
        );
      case 'COURSE_FACULTY':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
            Faculty
          </span>
        );
      case 'STUDENT':
        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            Student
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner - Space Optimized & Integrated */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Institutional Architecture &amp; Gateway</span>
              <span>&bull;</span>
              <span>Academic Year 2026–2027</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>Organization Structure, Roles &amp; Gateway</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Define Faculties, Schools, Departments, assigned Leadership Heads, User Accounts with OTP setup, and SMTP configuration.
            </p>
          </div>

          {/* Sub-menu Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto flex-wrap gap-1 shrink-0">
            <button
              onClick={() => switchSubTab('faculties')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                subTab === 'faculties'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Faculties ({academicScope.visibleFaculties.length})
            </button>
            <button
              onClick={() => switchSubTab('schools')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                subTab === 'schools'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Schools ({academicScope.visibleSchools.length})
            </button>
            <button
              onClick={() => switchSubTab('departments')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                subTab === 'departments'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Departments ({academicScope.visibleDepartments.length})
            </button>
            <button
              onClick={() => switchSubTab('users')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                subTab === 'users'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              User Accounts ({filteredUsers.length})
            </button>
            {academicScope.isAdmin && (
              <button
                onClick={() => switchSubTab('email-config')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  subTab === 'email-config'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Email Gateway &amp; Outbox ({outgoingEmails.length})
              </button>
            )}
            <button
              onClick={() => switchSubTab('tree')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                subTab === 'tree'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Hierarchy Tree
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : notification.type === 'info'
                ? 'bg-amber-950/60 border border-amber-800 text-amber-200'
                : 'bg-rose-950/60 border border-rose-800 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'info' ? (
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: FACULTIES */}
      {subTab === 'faculties' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Academic Faculties / Colleges</h2>
              <p className="text-xs text-slate-400">
                Top-level governance units headed by a Head of Faculty / Dean.
              </p>
            </div>
            {academicScope.canCreateFaculty && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddFaculty}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Faculty</span>
                </button>
              </div>
            )}
          </div>

          {/* Head of Faculty Scoped Governance Notice */}
          {academicScope.isHeadOfFaculty && academicScope.ledFaculties.length > 0 && (
            <div className="bg-teal-950/40 border border-teal-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-teal-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">
                    {academicScope.ledFaculties.length > 1 ? 'Governed Faculties: ' : 'Governed Faculty: '}
                    {academicScope.ledFaculties.map((f) => `${f.name} (${f.code})`).join(' • ')}
                  </span>
                  <p className="text-teal-300/90 text-[11px] mt-0.5">
                    As Head of Faculty, you have full administrative governance over all schools, departments, and programs within your {academicScope.ledFaculties.length > 1 ? 'governed faculties' : 'faculty'}. Creating new Faculties is restricted to the Tenant Administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {academicScope.visibleFaculties.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Faculties Registered</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {academicScope.canCreateFaculty
                  ? 'Click "Add Faculty" above to register faculties (e.g. Faculty of Engineering) and assign a Head of Faculty.'
                  : 'No faculty is currently assigned to your account.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academicScope.visibleFaculties.map((f) => {
                const childSchools = schools.filter((s) => s.facultyId === f.id);
                return (
                  <div
                    key={f.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300">
                        {f.code}
                      </span>
                      <div className="flex items-center gap-1">
                        {academicScope.canEditFaculty ? (
                          <button
                            onClick={() => openEditFaculty(f)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1 text-slate-600 flex items-center"
                            title="Faculty governance is restricted to Institutional Administrator."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          </span>
                        )}
                        {f.headUserId === currentUser?.id || (academicScope.isHeadOfFaculty && academicScope.ledFaculties.some((lf) => lf.id === f.id)) ? (
                          <span
                            className="p-1 text-slate-500 cursor-not-allowed flex items-center"
                            title="Protected Leadership Entity: A Head of Faculty cannot delete their own Faculty."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          </span>
                        ) : academicScope.canDeleteFaculty ? (
                          <button
                            onClick={() => {
                              if (confirm(`Delete faculty "${f.name}"?`)) {
                                deleteFaculty(f.id);
                                showMsg(`Deleted faculty ${f.code}.`);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete faculty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white">{f.name}</h3>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-medium text-slate-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-teal-400" />
                            Head of Faculty:
                          </span>
                          <span className="text-[10px] text-teal-300 font-medium">
                            {f.headUserName || 'Unassigned'}
                          </span>
                        </div>
                        {academicScope.canAssignFacultyHead ? (
                          <select
                            value={f.headUserId || ''}
                            onChange={(e) => {
                              const newUid = e.target.value;
                              if (newUid) {
                                const u = users.find((usr) => usr.id === newUid);
                                setFacultyHead(f.id, newUid, u?.fullName || 'Assigned Head');
                                showMsg(`Assigned ${u?.fullName || 'Account'} as Head of Faculty for ${f.name}`);
                              } else {
                                setFacultyHead(f.id, '', '');
                                showMsg(`Unassigned Head of Faculty for ${f.name}`);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Assign Head of Faculty (HoF Required) --</option>
                            {eligibleHoFUsers.length === 0 ? (
                              <option disabled value="">No HoF accounts registered</option>
                            ) : (
                              eligibleHoFUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName} ({u.role === 'HEAD_OF_FACULTY' ? 'HoF' : 'Admin'})
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                            <span className="font-medium text-slate-200">{f.headUserName || 'Unassigned'}</span>
                            <span className="text-[10px] bg-teal-950/80 text-teal-400 border border-teal-800/80 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Governed by Admin
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-teal-400/80 block">
                          Role Policy: Only HoF accounts can head a Faculty. Faculty accounts are restricted.
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Schools: {childSchools.length}</span>
                      <span className="text-slate-500 font-mono">2026 Batch Structure</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SCHOOLS */}
      {subTab === 'schools' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Academic Schools</h2>
              <p className="text-xs text-slate-400">
                Divisions under a Faculty, headed by an assigned Head of School.
              </p>
            </div>
            {academicScope.canCreateSchool && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddSchool}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add School</span>
                </button>
              </div>
            )}
          </div>

          {/* Head of School Scoped Governance Notice */}
          {academicScope.isHeadOfSchool && academicScope.ledSchools.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">
                    {academicScope.ledSchools.length > 1 ? 'Governed Schools: ' : 'Governed School: '}
                    {academicScope.ledSchools.map((s) => `${s.name} (${s.code})`).join(' • ')}
                  </span>
                  <p className="text-indigo-300/90 text-[11px] mt-0.5">
                    As Head of School, you have full governance over all academic departments and programs under your {academicScope.ledSchools.length > 1 ? 'governed schools' : 'school'}. Creating new Schools is handled by your Head of Faculty or Administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {academicScope.visibleSchools.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <School className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Schools Registered</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {academicScope.canCreateSchool
                  ? 'Click "Add School" to register schools (e.g. School of Computing) and assign a Head of School.'
                  : 'No school is currently assigned to your scope.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academicScope.visibleSchools.map((s) => {
                const parentFac = faculties.find((f) => f.id === s.facultyId);
                const childDepts = departments.filter((d) => d.schoolId === s.id);
                return (
                  <div
                    key={s.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                        {s.code}
                      </span>
                      <div className="flex items-center gap-1">
                        {academicScope.canEditSchool ? (
                          <button
                            onClick={() => openEditSchool(s)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1 text-slate-600 flex items-center"
                            title="School governance is restricted to Administrator or Head of Faculty."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          </span>
                        )}
                        {s.headUserId === currentUser?.id || (academicScope.isHeadOfSchool && academicScope.ledSchools.some((ls) => ls.id === s.id)) ? (
                          <span
                            className="p-1 text-slate-500 cursor-not-allowed flex items-center"
                            title="Protected Leadership Entity: A Head of School cannot delete their own School."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          </span>
                        ) : academicScope.canDeleteSchool ? (
                          <button
                            onClick={() => {
                              if (confirm(`Delete school "${s.name}"?`)) {
                                deleteSchool(s.id);
                                showMsg(`Deleted school ${s.code}.`);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete school"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white">{s.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        Faculty: <strong className="text-slate-200">{parentFac?.name || 'Unassigned Faculty'}</strong>
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-medium text-slate-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-indigo-400" />
                            Head of School:
                          </span>
                          <span className="text-[10px] text-indigo-300 font-medium">
                            {s.headUserName || 'Unassigned'}
                          </span>
                        </div>
                        {(academicScope.isAdmin || academicScope.isHeadOfFaculty) ? (
                          <select
                            value={s.headUserId || ''}
                            onChange={(e) => {
                              const newUid = e.target.value;
                              if (newUid) {
                                const u = users.find((usr) => usr.id === newUid);
                                setSchoolHead(s.id, newUid, u?.fullName || 'Assigned Head');
                                showMsg(`Assigned ${u?.fullName || 'Account'} as Head of School for ${s.name}`);
                              } else {
                                setSchoolHead(s.id, '', '');
                                showMsg(`Unassigned Head of School for ${s.name}`);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Assign Head of School (HoS Required) --</option>
                            {eligibleHoSUsers.length === 0 ? (
                              <option disabled value="">No HoS accounts registered</option>
                            ) : (
                              eligibleHoSUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName} ({u.role === 'HEAD_OF_SCHOOL' ? 'HoS' : 'Admin'})
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                            <span className="font-semibold text-white">{s.headUserName || 'Unassigned Head of School'}</span>
                            <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded font-mono">
                              Governed by HoF / Admin
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-indigo-400/80 block">
                          {(academicScope.isAdmin || academicScope.isHeadOfFaculty)
                            ? "Role Policy: Only HoS accounts can head a School. Faculty accounts are restricted."
                            : "Governance Policy: A Head of School cannot replace himself. Reassignment requires HoF or Admin authority."}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Departments: {childDepts.length}</span>
                      <span className="text-slate-500 font-mono">2026 Batch Structure</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: DEPARTMENTS */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Academic Departments</h2>
              <p className="text-xs text-slate-400">
                Operating departments offering curricular degree programs, headed by an HOD.
              </p>
            </div>
            {academicScope.canCreateDepartment && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddDept}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </div>
            )}
          </div>

          {/* HOD Scoped Governance Notice */}
          {academicScope.isHod && academicScope.ledDepartments.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">
                    {academicScope.ledDepartments.length > 1 ? 'Governed Departments: ' : 'Governed Department: '}
                    {academicScope.ledDepartments.map((d) => `${d.name} (${d.code})`).join(' • ')}
                  </span>
                  <p className="text-amber-300/90 text-[11px] mt-0.5">
                    As Head of Department (HOD), you have full authority over degree programs, courses, section allocation, and mark deadlines within your {academicScope.ledDepartments.length > 1 ? 'governed departments' : 'department'}. Creating new Departments is managed by your Head of School.
                  </p>
                </div>
              </div>
            </div>
          )}

          {academicScope.visibleDepartments.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Departments Registered</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {academicScope.canCreateDepartment
                  ? 'Click "Add Department" to register departments (e.g. Computer Science & Engineering) and map an HOD.'
                  : 'No department is currently assigned to your scope.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academicScope.visibleDepartments.map((d) => {
                const parentSch = schools.find((s) => s.id === d.schoolId);
                return (
                  <div
                    key={d.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                        {d.code}
                      </span>
                      <div className="flex items-center gap-1">
                        {academicScope.canEditDepartment ? (
                          <button
                            onClick={() => openEditDept(d)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1 text-slate-600 flex items-center"
                            title="Department governance is restricted to Administrator, HoF, or HoS."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          </span>
                        )}
                        {d.headUserId === currentUser?.id || (academicScope.isHod && academicScope.ledDepartments.some((ld) => ld.id === d.id)) ? (
                          <span
                            className="p-1 text-slate-500 cursor-not-allowed flex items-center"
                            title="Protected Leadership Entity: A Head of Department cannot delete their own Department."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          </span>
                        ) : academicScope.canDeleteDepartment ? (
                          <button
                            onClick={() => {
                              if (confirm(`Delete department "${d.name}"?`)) {
                                deleteDepartment(d.id);
                                showMsg(`Deleted department ${d.code}.`);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white">{d.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        School: <strong className="text-slate-200">{parentSch?.name || 'General / Autonomous'}</strong>
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-medium text-slate-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-amber-400" />
                            Head of Dept (HOD):
                          </span>
                          <span className="text-[10px] text-amber-300 font-medium">
                            {d.headUserName || 'Unassigned'}
                          </span>
                        </div>
                        {(academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool) ? (
                          <select
                            value={d.headUserId || ''}
                            onChange={(e) => {
                              const newUid = e.target.value;
                              if (newUid) {
                                const u = users.find((usr) => usr.id === newUid);
                                setDepartmentHead(d.id, newUid, u?.fullName || 'Assigned HOD');
                                showMsg(`Assigned ${u?.fullName || 'Account'} as HOD for ${d.name}`);
                              } else {
                                setDepartmentHead(d.id, '', '');
                                showMsg(`Unassigned HOD for ${d.name}`);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Assign Head of Department (HoD Required) --</option>
                            {eligibleHodUsers.length === 0 ? (
                              <option disabled value="">No HoD accounts registered</option>
                            ) : (
                              eligibleHodUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName} ({u.role === 'HOD' ? 'HoD' : 'Admin'})
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                            <span className="font-semibold text-white">{d.headUserName || 'Unassigned Head of Department'}</span>
                            <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded font-mono">
                              Governed by HoS / HoF / Admin
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-amber-400/80 block">
                          {(academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool)
                            ? "Role Policy: Only HoD accounts can head a Department. Faculty accounts are restricted."
                            : "Governance Policy: A Head of Department cannot replace himself. Reassignment requires HoS, HoF, or Admin authority."}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Curricular Unit</span>
                      <span className="text-slate-500 font-mono">Batch 2026</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: USERS & ACCESS CONTROL */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Institutional User Accounts & Roles</span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage accounts, assign leadership roles (Head of Faculty, Head of School, HOD, Coordinator, Faculty), issue OTP setup, and manage password reset security policies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {academicScope.canCreateUser && (
                <>
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bulk Upload Users</span>
                  </button>
                  <button
                    onClick={() => openAddUser()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add User Account</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pending Account Approvals Section (Admin Approval Required) */}
          {filteredUsers.some((u) => u.approvalStatus === 'PENDING') && (
            <div className="bg-amber-950/20 border border-amber-800/60 rounded-2xl p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm text-amber-300">
                      Pending Account Approvals ({filteredUsers.filter((u) => u.approvalStatus === 'PENDING').length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Accounts created by Unit Heads (HoF, HoS, HoD) require Institutional Administrator authorization before activation.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 self-start sm:self-center">
                  {academicScope.canApproveUser ? 'Admin Action Required' : 'Awaiting Admin Review'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="px-3 py-2.5">Candidate</th>
                      <th className="px-3 py-2.5">Requested Role</th>
                      <th className="px-3 py-2.5">Department</th>
                      <th className="px-3 py-2.5">Submitted By</th>
                      <th className="px-3 py-2.5 text-right">Approval Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers
                      .filter((u) => u.approvalStatus === 'PENDING')
                      .map((pu) => (
                        <tr key={pu.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-white">{pu.fullName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{pu.email}</div>
                          </td>
                          <td className="px-3 py-2.5">{renderRoleBadge(pu.role)}</td>
                          <td className="px-3 py-2.5 text-slate-300">{pu.department || '—'}</td>
                          <td className="px-3 py-2.5 text-[11px]">
                            <span className="text-white font-medium">{pu.createdByName || 'Unit Head'}</span>
                            <span className="text-slate-500 block text-[10px]">{pu.createdByRole?.replace(/_/g, ' ') || 'Authorized Head'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {academicScope.canApproveUser ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const res = approveUserAccount(pu.id);
                                    if (res.success) {
                                      showMsg(res.message);
                                    } else {
                                      showMsg(res.message, 'error');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-[11px] shadow-sm transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve & Activate</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt(`Enter rejection reason for ${pu.fullName}:`, 'Role credentials could not be verified');
                                    if (reason !== null) {
                                      const res = rejectUserAccount(pu.id, reason);
                                      showMsg(res.message);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold rounded-lg text-[11px] transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-400/80 italic">Pending Admin Review</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Filtering & Search Controls */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Filter Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs cursor-pointer"
              >
                <option value="ALL">All Roles ({filteredUsers.length})</option>
                <option value="TENANT_ADMIN">Institutional Admin</option>
                <option value="HEAD_OF_FACULTY">Head of Faculty</option>
                <option value="HEAD_OF_SCHOOL">Head of School</option>
                <option value="HOD">Head of Department (HOD)</option>
                <option value="COURSE_COORDINATOR">Course Coordinator</option>
                <option value="COURSE_FACULTY">Faculty / Instructor</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Full Name & Email</th>
                    <th className="px-4 py-3">Institutional Role</th>
                    <th className="px-4 py-3">Department / Unit</th>
                    <th className="px-4 py-3 text-center">Account Status</th>
                    <th className="px-4 py-3 text-center">Reset Policy</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No user accounts match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: UserAccount) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white text-xs">{u.fullName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {renderRoleBadge(u.role)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {u.department || 'General Administration'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.approvalStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pending Approval
                            </span>
                          ) : u.approvalStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              Rejected
                            </span>
                          ) : u.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              OTP Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.passwordResetLocked ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300" title="Subsequent reset locked: requires Admin reset authorization">
                              <Lock className="w-3 h-3 text-rose-400" />
                              Admin Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300" title="First-time setup or self-service eligible">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              Self-Service Eligible
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(() => {
                              const isSelf = u.id === currentUser?.id;
                              const canEditThisUser = isSelf || academicScope.isAdmin;
                              const canDeleteThisUser = academicScope.canDeleteUser && !isSelf;

                              return (
                                <>
                                  {/* Admin Reset Password Button: Admin only */}
                                  {academicScope.isAdmin && (
                                    <button
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Authorize Administrator Password Reset for ${u.fullName} (${u.email})?\n\nThis will unlock their account and dispatch a fresh OTP & password setup link.`
                                          )
                                        ) {
                                          const res = adminResetUserPassword(u.id);
                                          showMsg(res.message);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                      title="Authorize Administrator Password Reset (Dispatches OTP)"
                                    >
                                      <Key className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Edit Role / Profile Button: Self can edit profile, Admin can edit any */}
                                  {canEditThisUser && (
                                    <button
                                      onClick={() => openEditUser(u)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                      title={isSelf ? 'Edit Your Profile Details' : 'Edit User Account (Admin Only)'}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete User Button: Strictly Institutional Administrator Only */}
                                  {canDeleteThisUser && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Permanently delete account "${u.fullName}" (${u.email})?`)) {
                                          deleteUser(u.id);
                                          showMsg(`Deleted user ${u.fullName}.`);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                      title="Delete Account (Admin Only)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {!canEditThisUser && !canDeleteThisUser && !academicScope.isAdmin && (
                                    <span
                                      className="text-[10px] text-slate-500 flex items-center gap-1 font-mono px-1 py-0.5"
                                      title="Account is governed by Institutional Administrator"
                                    >
                                      <Lock className="w-3 h-3 text-slate-600" />
                                      <span>Governed</span>
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EMAIL CONFIGURATION & OUTBOX SIMULATOR */}
      {subTab === 'email-config' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>Institutional Email (SMTP) Gateway & Delivery Log</span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure outgoing institutional email service for OTP verification, password links, and deadline alerts.
              </p>
            </div>
            <button
              onClick={() => setShowTestEmailModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SMTP Gateway Settings Form */}
            <form
              onSubmit={handleSaveEmailConfig}
              className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  SMTP Connection Settings
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  {emailConfig.isConfigured ? 'Gateway Active' : 'Default Preset'}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">SMTP Host / Server *</label>
                <input
                  type="text"
                  required
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com or smtp.office365.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">SMTP Port *</label>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-300 font-medium">SSL / TLS Protocol</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Sender Display Name</label>
                <input
                  type="text"
                  value={smtpSenderName}
                  onChange={(e) => setSmtpSenderName(e.target.value)}
                  placeholder="e.g. Academic ERP Notification Center"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Sender Email Address *</label>
                <input
                  type="email"
                  required
                  value={smtpSenderEmail}
                  onChange={(e) => setSmtpSenderEmail(e.target.value)}
                  placeholder="e.g. notifications@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">SMTP Username / Auth ID</label>
                <input
                  type="text"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="e.g. notifications@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">SMTP Password / API Key</label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Save SMTP Configuration
              </button>
            </form>

            {/* Outgoing Notifications & Delivery Simulator */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time Notification Delivery Log & OTP Simulator</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Every welcome email, setup link, and 6-digit OTP dispatched by the system is tracked here for testing and verification.
                  </p>
                </div>
                {outgoingEmails.length > 0 && (
                  <button
                    onClick={clearOutgoingEmails}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[11px] transition-colors"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {outgoingEmails.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
                  <Mail className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">No Outgoing Emails Yet</h4>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    When user accounts are created or password resets are requested, emails with OTP codes and activation links will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {outgoingEmails.map((mail) => (
                    <div
                      key={mail.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                              mail.type === 'FIRST_TIME_SETUP'
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                : mail.type === 'FORGOT_PASSWORD'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : mail.type === 'ADMIN_RESET'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {mail.type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-white truncate max-w-xs">{mail.subject}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {new Date(mail.sentAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400">
                        <div>
                          <span>To: </span>
                          <strong className="text-white">{mail.recipientName}</strong> &bull;{' '}
                          <span className="font-mono text-slate-300">{mail.recipientEmail}</span>
                        </div>

                        {mail.otp && (
                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <span className="text-[10px] uppercase font-bold text-slate-400">OTP:</span>
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                              {mail.otp}
                            </span>
                            <button
                              onClick={() => copyToClipboard(mail.otp!, mail.id)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Copy OTP"
                            >
                              {copiedOtp === mail.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Dispatched via SMTP
                        </span>
                        <button
                          onClick={() => setPreviewEmail(mail)}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Full Email Preview</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: VISUAL HIERARCHY TREE */}
      {subTab === 'tree' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              <span>Autonomous Institutional Hierarchy & Assigned Leadership</span>
            </h2>
            <p className="text-xs text-slate-400">
              Visual overview of the institution, mapped faculties with Head of Faculty, schools with Head of School, and departments with HOD.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{tenant?.name || 'Academic Institution'}</div>
              <div className="text-[11px] text-slate-400">
                Institutional Admin: <strong className="text-purple-300">{users.find((u) => u.role === 'TENANT_ADMIN')?.fullName || 'Administrator'}</strong> &bull; Batch 2026 Governance
              </div>
            </div>
          </div>

          {academicScope.visibleFaculties.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No faculties defined in your scope.
            </div>
          ) : (
            <div className="space-y-4 pl-4 border-l-2 border-slate-800">
              {academicScope.visibleFaculties.map((f) => {
                const childSchools = academicScope.visibleSchools.filter((s) => s.facultyId === f.id);
                return (
                  <div key={f.id} className="space-y-3">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300">
                          {f.code}
                        </span>
                        <strong className="text-white">{f.name}</strong>
                      </div>
                      <span className="text-[11px] text-teal-300 font-semibold">
                        Head of Faculty: {f.headUserName || 'Unassigned'}
                      </span>
                    </div>

                    <div className="pl-6 border-l-2 border-slate-800/60 space-y-3">
                      {childSchools.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic">No schools under this faculty.</div>
                      ) : (
                        childSchools.map((s) => {
                          const childDepts = academicScope.visibleDepartments.filter((d) => d.schoolId === s.id);
                          return (
                            <div key={s.id} className="space-y-2">
                              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                                    {s.code}
                                  </span>
                                  <span className="font-semibold text-slate-200">{s.name}</span>
                                </div>
                                <span className="text-[11px] text-indigo-300 font-semibold">
                                  Head of School: {s.headUserName || 'Unassigned'}
                                </span>
                              </div>

                              <div className="pl-6 border-l border-slate-800/40 space-y-1.5">
                                {childDepts.length === 0 ? (
                                  <div className="text-[11px] text-slate-500 italic">No departments under this school.</div>
                                ) : (
                                  childDepts.map((d) => (
                                    <div
                                      key={d.id}
                                      className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2 flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                                          {d.code}
                                        </span>
                                        <span className="text-slate-300">{d.name}</span>
                                      </div>
                                      <span className="text-[11px] text-amber-300 font-semibold">
                                        HOD: {d.headUserName || 'Unassigned'}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT FACULTY */}
      {(modalType === 'addFaculty' || modalType === 'editFaculty') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addFaculty' ? 'Register New Faculty' : 'Edit Faculty Details'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Faculty Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FAC-ENG-2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Faculty of Engineering & Technology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300 block">
                    Assigned Head of Faculty Account
                  </label>
                  {academicScope.isAdmin && (
                    <button
                      type="button"
                      onClick={() => openAddUser('HEAD_OF_FACULTY')}
                      className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register New Account</span>
                    </button>
                  )}
                </div>
                {academicScope.isAdmin ? (
                  <select
                    value={selectedHeadUserId}
                    onChange={(e) => setSelectedHeadUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Account as Head of Faculty (HoF Required) --</option>
                    {eligibleHoFUsers.length === 0 ? (
                      <option disabled value="">No eligible HoF accounts found</option>
                    ) : (
                      eligibleHoFUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) &bull; {u.role === 'HEAD_OF_FACULTY' ? 'HoF' : 'Admin'}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 flex items-center justify-between text-xs">
                    <span>{users.find((u) => u.id === selectedHeadUserId)?.fullName || 'Assigned Head of Faculty'}</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded font-mono">
                      Locked (Admin Governance)
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {academicScope.isAdmin
                    ? "Role Policy: Only accounts with role 'Head of Faculty (HoF)' can head a Faculty."
                    : "Institutional Governance: The Head of Faculty cannot replace himself or assign someone else as HoF. Reassignment requires Institutional Administrator authority."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  {modalType === 'addFaculty' ? 'Create Faculty' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHOOL */}
      {(modalType === 'addSchool' || modalType === 'editSchool') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addSchool' ? 'Register New School' : 'Edit School Details'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Parent Faculty *</label>
                {academicScope.isHeadOfFaculty && academicScope.ledFaculties.length === 1 ? (
                  <div className="w-full bg-slate-950/80 border border-teal-800/60 rounded-xl px-3 py-2 text-teal-300 flex items-center justify-between">
                    <span>{academicScope.ledFaculties[0].code} - {academicScope.ledFaculties[0].name}</span>
                    <span className="text-[10px] bg-teal-950 px-2 py-0.5 rounded border border-teal-800 font-mono text-teal-400">Your Governed Faculty</span>
                  </div>
                ) : (
                  <select
                    value={parentFacultyId}
                    onChange={(e) => setParentFacultyId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {(academicScope.isHeadOfFaculty && academicScope.ledFaculties.length > 1
                      ? academicScope.ledFaculties
                      : academicScope.visibleFaculties
                    ).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">School Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. SCH-COMP-2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. School of Computer Science & Artificial Intelligence"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300 block">
                    Assigned Head of School Account
                  </label>
                  {(academicScope.isAdmin || academicScope.isHeadOfFaculty) && (
                    <button
                      type="button"
                      onClick={() => openAddUser('HEAD_OF_SCHOOL')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register New Account</span>
                    </button>
                  )}
                </div>
                {(academicScope.isAdmin || academicScope.isHeadOfFaculty) ? (
                  <select
                    value={selectedHeadUserId}
                    onChange={(e) => setSelectedHeadUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Account as Head of School (HoS Required) --</option>
                    {eligibleHoSUsers.length === 0 ? (
                      <option disabled value="">No eligible HoS accounts found</option>
                    ) : (
                      eligibleHoSUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) &bull; {u.role === 'HEAD_OF_SCHOOL' ? 'HoS' : 'Admin'}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 flex items-center justify-between text-xs">
                    <span>{users.find((u) => u.id === selectedHeadUserId)?.fullName || 'Assigned Head of School'}</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded font-mono">
                      Locked (HoS cannot self-replace)
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {(academicScope.isAdmin || academicScope.isHeadOfFaculty)
                    ? "Role Policy: Only accounts with role 'Head of School (HoS)' can head a School."
                    : "Institutional Governance: The Head of School cannot replace himself or assign someone else as HoS. Reassignment requires Institutional Administrator or Head of Faculty authority."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  {modalType === 'addSchool' ? 'Create School' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {(modalType === 'addDept' || modalType === 'editDept') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addDept' ? 'Register New Department' : 'Edit Department Details'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Parent School *</label>
                {academicScope.isHeadOfSchool && academicScope.ledSchools.length === 1 ? (
                  <div className="w-full bg-slate-950/80 border border-indigo-800/60 rounded-xl px-3 py-2 text-indigo-300 flex items-center justify-between">
                    <span>{academicScope.ledSchools[0].code} - {academicScope.ledSchools[0].name}</span>
                    <span className="text-[10px] bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 font-mono text-indigo-400">Your Governed School</span>
                  </div>
                ) : (
                  <select
                    value={parentSchoolId}
                    onChange={(e) => setParentSchoolId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {academicScope.visibleSchools.length === 0 ? (
                      <option value="school-default">General School</option>
                    ) : (
                      (academicScope.isHeadOfSchool && academicScope.ledSchools.length > 1
                        ? academicScope.ledSchools
                        : academicScope.visibleSchools
                      ).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. DEPT-CSE-2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300 block">
                    Assigned Head of Department (HOD)
                  </label>
                  {(academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool) && (
                    <button
                      type="button"
                      onClick={() => openAddUser('HOD')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register New Account</span>
                    </button>
                  )}
                </div>
                {(academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool) ? (
                  <select
                    value={selectedHeadUserId}
                    onChange={(e) => setSelectedHeadUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Account as HOD (HoD Required) --</option>
                    {eligibleHodUsers.length === 0 ? (
                      <option disabled value="">No eligible HoD accounts found</option>
                    ) : (
                      eligibleHodUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) &bull; {u.role === 'HOD' ? 'HoD' : 'Admin'}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 flex items-center justify-between text-xs">
                    <span>{users.find((u) => u.id === selectedHeadUserId)?.fullName || 'Assigned Head of Department'}</span>
                    <span className="text-[10px] bg-slate-900 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded font-mono">
                      Locked (HoD cannot self-replace)
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {(academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool)
                    ? "Role Policy: Only accounts with role 'Head of Department (HoD)' can head a Department."
                    : "Institutional Governance: The Head of Department cannot replace himself or assign someone else as HoD. Reassignment requires Administrator, Head of Faculty, or Head of School authority."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  {modalType === 'addDept' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER ACCOUNT */}
      {(modalType === 'addUser' || modalType === 'editUser') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <span>{modalType === 'addUser' ? 'Add User Account' : 'Edit User Role & Details'}</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Dr. Sunita Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={modalType === 'editUser'}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. sunita.sharma@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Institutional Role *</label>
                {modalType === 'editUser' && (!academicScope.canEditUserRole || editingId === currentUser?.id) ? (
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 flex items-center justify-between text-xs">
                    <span className="font-semibold">{userRole.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Role Governance Locked (Admin Only)
                    </span>
                  </div>
                ) : (
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {(academicScope.assignableRoles.length > 0
                      ? academicScope.assignableRoles
                      : (['COURSE_FACULTY', 'STUDENT'] as UserRole[])
                    ).map((r) => {
                      const roleLabels: Record<UserRole, string> = {
                        SUPER_ADMIN: 'Super Administrator',
                        TENANT_ADMIN: 'Institutional Admin (Master Governance)',
                        HEAD_OF_FACULTY: 'Head of Faculty (HoF) - Eligible to Head Faculty',
                        HEAD_OF_SCHOOL: 'Head of School (HoS) - Eligible to Head School',
                        HOD: 'Head of Department (HoD) - Eligible to Head Department',
                        DEAN: 'Dean of Faculty / School',
                        COURSE_COORDINATOR: 'Course Coordinator - Blueprints & CO Mapping',
                        COURSE_FACULTY: 'Faculty - Teaching & Marks Entry',
                        STUDENT: 'Student - Learner Profile',
                      };
                      return (
                        <option key={r} value={r}>
                          {roleLabels[r] || r}
                        </option>
                      );
                    })}
                  </select>
                )}
                <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Hierarchy Restriction Policy:</span>
                  </div>
                  <p>
                    {currentUser?.role === 'TENANT_ADMIN' ? (
                      'As Institutional Admin, you have full governance to provision and approve any administrative or academic role.'
                    ) : (
                      <>
                        As <strong className="text-white">{currentUser?.role?.replace(/_/g, ' ')}</strong>, you can only create accounts with roles <em>strictly below your level</em>. Provisioned accounts are queued for Administrator approval before activation.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Department / Unit</label>
                <input
                  type="text"
                  value={userDepartment}
                  onChange={(e) => setUserDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {modalType === 'addUser' && currentUser?.role !== 'TENANT_ADMIN' ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Requires Administrator Approval:</strong> This account will be created with status <strong className="text-white font-mono">PENDING_APPROVAL</strong>. The Institutional Admin must approve this user before their login is enabled and OTP instructions are emailed.
                  </span>
                </div>
              ) : modalType === 'addUser' ? (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Upon saving, a secure 6-digit OTP code and password activation link will be automatically generated and dispatched to this email.
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  {modalType === 'addUser'
                    ? currentUser?.role === 'TENANT_ADMIN'
                      ? 'Create Account & Send OTP'
                      : 'Submit for Admin Approval'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SEND TEST EMAIL */}
      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                <span>Dispatch SMTP Test Email</span>
              </h3>
              <button
                onClick={() => setShowTestEmailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Recipient Test Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="e.g. administrator@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div>Current Host: <strong className="text-white">{emailConfig.host}:{emailConfig.port}</strong></div>
                <div>Sender: <strong className="text-white">{emailConfig.senderEmail}</strong></div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTestEmailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Send Test Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW EMAIL PREVIEW */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                  Email Message Preview
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-sm mt-0.5">
                  {previewEmail.subject}
                </h3>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] space-y-1">
                <div>
                  <span className="text-slate-500">From: </span>
                  <span className="text-slate-200 font-semibold">{emailConfig.senderName} &lt;{emailConfig.senderEmail}&gt;</span>
                </div>
                <div>
                  <span className="text-slate-500">To: </span>
                  <span className="text-slate-200 font-semibold">{previewEmail.recipientName} &lt;{previewEmail.recipientEmail}&gt;</span>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <span className="text-slate-400 font-mono">{new Date(previewEmail.sentAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Simulated Email Body */}
              <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-inner space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <strong className="text-slate-900 text-sm font-bold">
                    {tenant?.name || 'Academic ERP & OBE Attainment'}
                  </strong>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  Hello <strong>{previewEmail.recipientName}</strong>,
                </p>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {previewEmail.type === 'FIRST_TIME_SETUP'
                    ? 'Your institutional user account has been successfully provisioned. Please use the secure one-time verification code below to set your account password.'
                    : previewEmail.type === 'ADMIN_RESET'
                    ? 'The Main Institutional Administrator has authorized a password reset for your account. Please use the verification code below to establish a new password.'
                    : previewEmail.type === 'FORGOT_PASSWORD'
                    ? 'A password reset request was initiated for your institutional account. Please use the verification code below.'
                    : 'This is a test notification confirming that the institutional SMTP gateway is active and operational.'}
                </p>

                {previewEmail.otp && (
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Your 6-Digit Verification OTP
                    </div>
                    <div className="text-2xl font-black font-mono tracking-widest text-indigo-700">
                      {previewEmail.otp}
                    </div>
                    <div className="text-[10px] text-slate-500">Valid for immediate password verification.</div>
                  </div>
                )}

                {previewEmail.link && (
                  <div className="text-center pt-2">
                    <span className="inline-block px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-sm">
                      Set / Activate Password Link
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-2 break-all">
                      {previewEmail.link}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-200">
                  Institutional Security Compliance &bull; Batch 2026 Academic Portal
                </p>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewEmail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      <BulkDataUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title={
          subTab === 'faculties'
            ? 'Bulk Upload Faculties'
            : subTab === 'schools'
            ? 'Bulk Upload Schools'
            : subTab === 'departments'
            ? 'Bulk Upload Academic Departments'
            : 'Bulk Upload User Accounts'
        }
        entityName={
          subTab === 'faculties'
            ? 'Faculties'
            : subTab === 'schools'
            ? 'Schools'
            : subTab === 'departments'
            ? 'Departments'
            : 'User Accounts'
        }
        columns={
          subTab === 'faculties'
            ? [
                { key: 'code', label: 'Faculty Code', required: true, description: 'e.g. FAC-ENG-2026' },
                { key: 'name', label: 'Faculty Name', required: true, description: 'e.g. Faculty of Engineering' },
              ]
            : subTab === 'schools'
            ? [
                { key: 'code', label: 'School Code', required: true, description: 'e.g. SCH-COMP-2026' },
                { key: 'name', label: 'School Name', required: true, description: 'e.g. School of Computing' },
              ]
            : subTab === 'departments'
            ? [
                { key: 'code', label: 'Dept Code', required: true, description: 'e.g. DEPT-CSE-2026' },
                { key: 'name', label: 'Dept Name', required: true, description: 'e.g. Computer Science & Engineering' },
              ]
            : [
                { key: 'fullName', label: 'Full Name', required: true, description: 'e.g. Dr. Sunita Sharma' },
                { key: 'email', label: 'Email Address', required: true, description: 'e.g. sunita.sharma@institution.edu' },
                { key: 'role', label: 'Role', required: true, description: 'COURSE_FACULTY, COURSE_COORDINATOR, HOD, HEAD_OF_SCHOOL, HEAD_OF_FACULTY' },
                { key: 'department', label: 'Department', required: false, description: 'e.g. Computer Science & Engineering' },
              ]
        }
        sampleRows={
          subTab === 'faculties'
            ? [
                { code: 'FAC-ENG-2026', name: 'Faculty of Engineering & Technology' },
                { code: 'FAC-SCI-2026', name: 'Faculty of Applied Sciences' },
              ]
            : subTab === 'schools'
            ? [
                { code: 'SCH-CS-2026', name: 'School of Computer Science & Artificial Intelligence' },
                { code: 'SCH-ECE-2026', name: 'School of Electrical & Communication Sciences' },
              ]
            : subTab === 'departments'
            ? [
                { code: 'DEPT-CSE-2026', name: 'Department of Computer Science & Engineering' },
                { code: 'DEPT-AIDS-2026', name: 'Department of Artificial Intelligence & Data Science' },
                { code: 'DEPT-IT-2026', name: 'Department of Information Technology' },
              ]
            : [
                {
                  fullName: 'Dr. Sunita Sharma',
                  email: 'sunita.sharma@institution.edu',
                  role: 'COURSE_FACULTY',
                  department: 'Computer Science & Engineering',
                },
                {
                  fullName: 'Prof. Arvind Kumar',
                  email: 'coordinator.cse@institution.edu',
                  role: 'COURSE_COORDINATOR',
                  department: 'Computer Science & Engineering',
                },
                {
                  fullName: 'Dr. Rajesh Ramanathan',
                  email: 'hod.cse@institution.edu',
                  role: 'HOD',
                  department: 'Computer Science & Engineering',
                },
              ]
        }
        onImport={(rows) => {
          if (subTab === 'faculties') {
            addFacultiesBatch(rows.map((r) => ({ code: String(r.code).toUpperCase(), name: String(r.name) })));
            showMsg(`Imported ${rows.length} Faculties.`);
          } else if (subTab === 'schools') {
            const parentFacId = faculties[0]?.id || 'fac-default';
            addSchoolsBatch(rows.map((r) => ({ facultyId: parentFacId, code: String(r.code).toUpperCase(), name: String(r.name) })));
            showMsg(`Imported ${rows.length} Schools.`);
          } else if (subTab === 'departments') {
            const parentSchId = schools[0]?.id || 'school-default';
            addDepartmentsBatch(rows.map((r) => ({ schoolId: parentSchId, code: String(r.code).toUpperCase(), name: String(r.name) })));
            showMsg(`Imported ${rows.length} Departments.`);
          } else {
            addUsersBatch(
              rows.map((r) => ({
                fullName: String(r.fullName),
                email: String(r.email).toLowerCase(),
                role: (r.role as UserRole) || 'COURSE_FACULTY',
                department: r.department ? String(r.department) : undefined,
                isMfaEnabled: false,
                status: 'PENDING_PASSWORD_SETUP',
              }))
            );
            showMsg(`Imported ${rows.length} User Accounts. Welcome emails & OTPs dispatched.`);
          }
        }}
      />
    </div>
  );
};
