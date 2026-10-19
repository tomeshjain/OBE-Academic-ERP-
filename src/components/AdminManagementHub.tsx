'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { BloomsTaxonomyLevel, UserRole, UserAccount } from '@/types/erp';
import {
  downloadStudentRosterTemplate,
  exportStudentsToExcel,
  parseStudentsFromExcel,
  downloadUserAccountsTemplate,
  exportUsersToExcel,
  parseUsersFromExcel,
  downloadCourseOutcomesTemplate,
  exportCourseOutcomesToExcel,
  parseCourseOutcomesFromExcel,
  downloadQuestionsTemplate,
  exportQuestionsToExcel,
  parseQuestionsFromExcel,
} from '@/lib/excel-utils';
import {
  Settings,
  Plus,
  Trash2,
  BookOpen,
  Users,
  Target,
  FileQuestion,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FolderTree,
  Upload,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  UserCheck,
  Key,
} from 'lucide-react';

export const AdminManagementHub: React.FC = () => {
  const {
    tenant,
    adminUser,
    users,
    addUser,
    addUsersBatch,
    updateUser,
    deleteUser,
    currentUserRole,
    setCurrentUserRole,
    courses,
    activeCourseId,
    setActiveCourseId,
    addCourse,
    courseOutcomes,
    addCourseOutcome,
    addCourseOutcomesBatch,
    deleteCourseOutcome,
    programOutcomes,
    addProgramOutcome,
    deleteProgramOutcome,
    students,
    addStudent,
    deleteStudent,
    addStudentsBatch,
    questions,
    addQuestion,
    addQuestionsBatch,
    deleteQuestion,
    assessmentWindows,
    updateAssessmentWindow,
    resetAllData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'users' | 'courses' | 'cos' | 'students' | 'questions' | 'pos' | 'windows'
  >('users');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File input refs for Excel uploads
  const studentExcelInputRef = useRef<HTMLInputElement>(null);
  const userExcelInputRef = useRef<HTMLInputElement>(null);
  const coExcelInputRef = useRef<HTMLInputElement>(null);
  const questionExcelInputRef = useRef<HTMLInputElement>(null);

  // User Account Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('COURSE_FACULTY');
  const [newUserDept, setNewUserDept] = useState('Department of Computer Science & Engineering');
  const [newUserMfa, setNewUserMfa] = useState(false);

  // Form states for adding course
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [credits, setCredits] = useState(4);
  const [term, setTerm] = useState('Semester I');
  const [coordinator, setCoordinator] = useState(adminUser?.fullName || 'Lead Instructor');

  // Form states for adding CO
  const [coCode, setCoCode] = useState(`CO${courseOutcomes.length + 1}`);
  const [coStatement, setCoStatement] = useState('');
  const [coBloom, setCoBloom] = useState<BloomsTaxonomyLevel>('APPLY');

  // Form states for adding Student
  const [studentRoll, setStudentRoll] = useState('');
  const [studentName, setStudentName] = useState('');

  // Form states for adding Question
  const [qNumber, setQNumber] = useState(`Q${questions.length + 1}`);
  const [qContent, setQContent] = useState('');
  const [qMarks, setQMarks] = useState(5);
  const [qCoId, setQCoId] = useState(courseOutcomes[0]?.id || '');
  const [qBloom, setQBloom] = useState<BloomsTaxonomyLevel>('APPLY');

  // Form states for adding Window
  const [windowSubName, setWindowSubName] = useState('Mid-Term Examination');
  const [windowCloseDate, setWindowCloseDate] = useState('2026-11-30T23:59:59Z');

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Handlers for User Management
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showError('Please provide both Full Name and Email Address.');
      return;
    }
    addUser({
      fullName: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      department: newUserDept.trim(),
      isMfaEnabled: newUserMfa,
      status: 'ACTIVE',
    });
    setNewUserName('');
    setNewUserEmail('');
    showNotification(`User account created with role ${newUserRole}!`);
  };

  const handleUserExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedUsers = await parseUsersFromExcel(file);
      if (parsedUsers.length === 0) {
        showError('No valid user records found in Excel. Check columns: FullName, Email, Role.');
        return;
      }
      addUsersBatch(parsedUsers);
      showNotification(`Successfully imported ${parsedUsers.length} user accounts from Excel!`);
    } catch (err) {
      showError('Failed to parse Excel file. Please use the official template.');
    }
    if (userExcelInputRef.current) userExcelInputRef.current.value = '';
  };

  // Handlers for Students Excel
  const handleStudentExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedStudents = await parseStudentsFromExcel(file);
      if (parsedStudents.length === 0) {
        showError('No student records found in Excel. Check columns: RollNumber, StudentName.');
        return;
      }
      addStudentsBatch(parsedStudents);
      showNotification(`Successfully enrolled ${parsedStudents.length} students from Excel!`);
    } catch (err) {
      showError('Failed to parse student Excel file. Please use the official template.');
    }
    if (studentExcelInputRef.current) studentExcelInputRef.current.value = '';
  };

  // Handlers for Course Outcomes Excel
  const handleCoExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedCos = await parseCourseOutcomesFromExcel(file, activeCourseId || 'default-course');
      if (parsedCos.length === 0) {
        showError('No Course Outcomes found in Excel. Check columns: Code, Statement, BloomsLevel.');
        return;
      }
      addCourseOutcomesBatch(parsedCos);
      showNotification(`Successfully imported ${parsedCos.length} Course Outcomes from Excel!`);
    } catch (err) {
      showError('Failed to parse Course Outcomes Excel file. Please use the official template.');
    }
    if (coExcelInputRef.current) coExcelInputRef.current.value = '';
  };

  // Handlers for Questions Blueprint Excel
  const handleQuestionExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedQuestions = await parseQuestionsFromExcel(file, courseOutcomes, 'qp-1');
      if (parsedQuestions.length === 0) {
        showError('No Exam Questions found in Excel. Check columns: QuestionNumber, Content, MaxMarks, MappedCO.');
        return;
      }
      addQuestionsBatch(parsedQuestions);
      showNotification(`Successfully imported ${parsedQuestions.length} Questions from Excel!`);
    } catch (err) {
      showError('Failed to parse Questions Excel file. Please use the official template.');
    }
    if (questionExcelInputRef.current) questionExcelInputRef.current.value = '';
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim()) return;
    addCourse({
      code: courseCode.trim().toUpperCase(),
      title: courseTitle.trim(),
      credits,
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2,
      term,
      coordinator,
      regulation: 'R2026-Autonomous',
    });
    setCourseCode('');
    setCourseTitle('');
    showNotification('New course added successfully!');
  };

  const handleAddCO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coCode.trim() || !coStatement.trim()) return;
    addCourseOutcome({
      courseId: activeCourseId || 'default-course',
      code: coCode.trim().toUpperCase(),
      statement: coStatement.trim(),
      bloomsLevel: coBloom,
    });
    setCoCode(`CO${courseOutcomes.length + 2}`);
    setCoStatement('');
    showNotification('Course Outcome added successfully!');
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRoll.trim() || !studentName.trim()) return;
    addStudent({
      rollNumber: studentRoll.trim(),
      studentName: studentName.trim(),
      enrollmentStatus: 'ACTIVE',
    });
    setStudentRoll('');
    setStudentName('');
    showNotification('Student enrolled successfully!');
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qNumber.trim() || !qContent.trim() || qMarks <= 0) return;
    addQuestion({
      questionPaperId: 'qp-1',
      questionNumber: qNumber.trim(),
      content: qContent.trim(),
      maxMarks: qMarks,
      courseOutcomeId: qCoId || courseOutcomes[0]?.id || 'co-1',
      bloomsLevel: qBloom,
      targetThresholdPct: 60,
      displayOrder: questions.length + 1,
    });
    setQNumber(`Q${questions.length + 2}`);
    setQContent('');
    showNotification('Question blueprint item added!');
  };

  const handleAddWindow = (e: React.FormEvent) => {
    e.preventDefault();
    updateAssessmentWindow({
      id: `win-${Date.now()}`,
      sectionId: 'sec-a',
      subComponentId: `sub-${Date.now()}`,
      subComponentName: windowSubName.trim(),
      questionPaperId: 'qp-1',
      status: 'DRAFT',
      openDateTime: new Date().toISOString(),
      closeDateTime: windowCloseDate,
    });
    showNotification('Assessment submission window created!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
                Master Administration Hub
              </span>
              <span className="text-xs text-slate-400">
                Logged in as: <strong className="text-white">{adminUser?.fullName}</strong> ({adminUser?.email})
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Institution & Academic Data Manager
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete management facility for user accounts & roles, Excel bulk operations, course offerings, learning outcomes, student rosters, and exam blueprints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all data and restart the initial setup wizard?')) {
                  resetAllData();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset & Wipe Data</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Management Subtabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto border-t border-slate-800 pt-4 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & Roles ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'students' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Student Roster ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'courses' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('cos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'cos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Course Outcomes ({courseOutcomes.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'questions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Program Outcomes ({programOutcomes.length})
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'windows' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Submission Windows ({assessmentWindows.length})
          </button>
        </div>
      </div>

      {/* TAB 1: USER ACCOUNTS & ROLES WITH EXCEL BULK */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header & Excel Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Institutional Accounts & Role Provisioning</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Granular RBAC: Tenant Admin, Dean, HOD, Course Coordinator, Faculty, Student
                </p>
              </div>

              {/* Excel Bulk Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadUserAccountsTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>Excel Template</span>
                </button>

                <input
                  type="file"
                  ref={userExcelInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleUserExcelUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => userExcelInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportUsersToExcel(users)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">User & Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">MFA</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            u.role === 'TENANT_ADMIN'
                              ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                              : u.role === 'DEAN' || u.role === 'HOD'
                              ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                              : u.role === 'COURSE_COORDINATOR'
                              ? 'bg-indigo-950/70 border-indigo-800 text-indigo-300'
                              : u.role === 'COURSE_FACULTY'
                              ? 'bg-teal-950/70 border-teal-800 text-teal-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{u.department || 'General'}</td>
                      <td className="p-3 text-center font-mono text-[10px]">
                        {u.isMfaEnabled ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Role Switcher */}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentUserRole(u.role);
                              showNotification(`Active preview role switched to ${u.role}`);
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800 px-2 py-0.5 rounded transition-colors"
                            title="Simulate / test role in UI"
                          >
                            Test Role
                          </button>
                          {u.role !== 'TENANT_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => deleteUser(u.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create User Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Create Individual Account</span>
            </h4>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Robert Chen"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. r.chen@university.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Select System Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
                >
                  <option value="TENANT_ADMIN">TENANT_ADMIN (Institutional Admin)</option>
                  <option value="DEAN">DEAN (Faculty / School Dean)</option>
                  <option value="HOD">HOD (Department Head)</option>
                  <option value="COURSE_COORDINATOR">COURSE_COORDINATOR (Syllabus & Blueprint Lead)</option>
                  <option value="COURSE_FACULTY">COURSE_FACULTY (Section Instructor / Evaluator)</option>
                  <option value="STUDENT">STUDENT (Student Read-Only Portal)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Assigned Department</label>
                <input
                  type="text"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mfaToggle"
                  checked={newUserMfa}
                  onChange={(e) => setNewUserMfa(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="mfaToggle" className="text-slate-300 font-medium cursor-pointer">
                  Require Multi-Factor Authentication (MFA)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Create User Account</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER WITH EXCEL BULK */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span>Enrolled Student Roster ({students.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Bulk import students from Excel or enter individual registrations
                </p>
              </div>

              {/* Excel Bulk Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStudentRosterTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>Excel Template</span>
                </button>

                <input
                  type="file"
                  ref={studentExcelInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleStudentExcelUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => studentExcelInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import Excel</span>
                </button>

                {students.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportStudentsToExcel(students)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Export</span>
                  </button>
                )}
              </div>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No students enrolled yet. Upload an Excel file or use the form on the right.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">Student Full Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {students.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-white">{s.rollNumber}</td>
                        <td className="p-3 font-semibold">{s.studentName}</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                            {s.enrollmentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteStudent(s.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Single Student Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Enroll Individual Student</span>
            </h4>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Roll / Registration No. *</label>
                <input
                  type="text"
                  required
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  placeholder="e.g. 2026-CSE-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Enroll Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: COURSES */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Courses ({courses.length})
            </h3>
            {courses.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No courses added yet. Use the form on the right to add your first course.
              </div>
            ) : (
              courses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCourseId(c.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    c.id === activeCourseId
                      ? 'bg-indigo-950/30 border-indigo-600'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{c.code}</span>
                      <span className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                        {c.credits} Credits
                      </span>
                      {c.id === activeCourseId && (
                        <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                          Active Course
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-200 font-semibold mt-1">{c.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Coordinator: {c.coordinator} &bull; Term: {c.term}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add New Course</span>
            </h4>
            <form onSubmit={handleAddCourse} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. CS301"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Course Coordinator</label>
                <input
                  type="text"
                  value={coordinator}
                  onChange={(e) => setCoordinator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Add Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: COURSE OUTCOMES */}
      {activeTab === 'cos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header & Excel Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Course Outcomes ({courseOutcomes.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Bulk import outcome statements with Bloom&apos;s Taxonomy levels or author manually
                </p>
              </div>

              {/* Excel Bulk Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadCourseOutcomesTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Excel Template</span>
                </button>

                <input
                  type="file"
                  ref={coExcelInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleCoExcelUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coExcelInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import Excel</span>
                </button>

                {courseOutcomes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportCourseOutcomesToExcel(courseOutcomes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Export</span>
                  </button>
                )}
              </div>
            </div>

            {courseOutcomes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No Course Outcomes defined yet. Add CO1, CO2, etc., using Excel bulk import or the form on the right.
              </div>
            ) : (
              courseOutcomes.map((co) => (
                <div
                  key={co.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded">
                        {co.code}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded">
                        {co.bloomsLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{co.statement}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCourseOutcome(co.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Delete CO"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Define Course Outcome</span>
            </h4>
            <form onSubmit={handleAddCO} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">CO Code *</label>
                  <input
                    type="text"
                    required
                    value={coCode}
                    onChange={(e) => setCoCode(e.target.value)}
                    placeholder="CO1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Revised Bloom’s</label>
                  <select
                    value={coBloom}
                    onChange={(e) => setCoBloom(e.target.value as BloomsTaxonomyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  >
                    <option value="REMEMBER">REMEMBER</option>
                    <option value="UNDERSTAND">UNDERSTAND</option>
                    <option value="APPLY">APPLY</option>
                    <option value="ANALYZE">ANALYZE</option>
                    <option value="EVALUATE">EVALUATE</option>
                    <option value="CREATE">CREATE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Action Verb & Statement *</label>
                <textarea
                  rows={4}
                  required
                  value={coStatement}
                  onChange={(e) => setCoStatement(e.target.value)}
                  placeholder="e.g. Analyze asymptotic algorithmic complexity and recurrence relations using Master Theorem..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Save Course Outcome
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header & Excel Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-indigo-400" />
                  <span>Exam Blueprint Questions ({questions.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Total Marks: <strong className="text-white">{questions.reduce((sum, q) => sum + q.maxMarks, 0)}M</strong> &bull; Import exam blueprint from Excel
                </p>
              </div>

              {/* Excel Bulk Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadQuestionsTemplate(courseOutcomes)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Excel Template</span>
                </button>

                <input
                  type="file"
                  ref={questionExcelInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleQuestionExcelUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => questionExcelInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import Excel</span>
                </button>

                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportQuestionsToExcel(questions, courseOutcomes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Export</span>
                  </button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No questions added to the blueprint yet. Import an Excel template or use the form on the right.
              </div>
            ) : (
              questions.map((q) => {
                const mappedCo = courseOutcomes.find((c) => c.id === q.courseOutcomeId);
                return (
                  <div
                    key={q.id}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded">
                          {q.questionNumber}
                        </span>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                          {mappedCo?.code || 'CO1'}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                          {q.bloomsLevel}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {q.maxMarks} Marks
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        {q.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(q.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Add Blueprint Question</span>
            </h4>
            <form onSubmit={handleAddQuestion} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Question No. *</label>
                  <input
                    type="text"
                    required
                    value={qNumber}
                    onChange={(e) => setQNumber(e.target.value)}
                    placeholder="Q1.a"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Max Marks *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Target CO</label>
                  <select
                    value={qCoId}
                    onChange={(e) => setQCoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {courseOutcomes.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.code}
                      </option>
                    ))}
                    {courseOutcomes.length === 0 && (
                      <option value="">No COs (create first)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Bloom’s Level</label>
                  <select
                    value={qBloom}
                    onChange={(e) => setQBloom(e.target.value as BloomsTaxonomyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  >
                    <option value="REMEMBER">REMEMBER</option>
                    <option value="UNDERSTAND">UNDERSTAND</option>
                    <option value="APPLY">APPLY</option>
                    <option value="ANALYZE">ANALYZE</option>
                    <option value="EVALUATE">EVALUATE</option>
                    <option value="CREATE">CREATE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Question Content / LaTeX *</label>
                <textarea
                  rows={3}
                  required
                  value={qContent}
                  onChange={(e) => setQContent(e.target.value)}
                  placeholder="e.g. State Big-O complexity for AVL tree rotations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Add Question
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: PROGRAM OUTCOMES */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Program Outcomes (POs) & PSOs</h3>
              <p className="text-xs text-slate-400">
                NBA Graduate Attributes & Program Specific Competencies
              </p>
            </div>
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-lg font-mono">
              Total: {programOutcomes.length} Outcomes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programOutcomes.map((po) => (
              <div
                key={po.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                      po.type === 'PSO'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}
                  >
                    {po.code}
                  </span>
                  <span className="text-[10px] text-slate-400">Target Level: {po.targetLevel}</span>
                </div>
                <h4 className="font-bold text-white text-xs">{po.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{po.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SUBMISSION WINDOWS */}
      {activeTab === 'windows' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assessment Windows ({assessmentWindows.length})
            </h3>
            {assessmentWindows.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No active assessment windows. Create one on the right to open mark entry for instructors.
              </div>
            ) : (
              assessmentWindows.map((w) => (
                <div
                  key={w.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{w.subComponentName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Deadline: {new Date(w.closeDateTime).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                    {w.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 h-fit text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create Submission Window</span>
            </h4>
            <form onSubmit={handleAddWindow} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Assessment Name *</label>
                <input
                  type="text"
                  required
                  value={windowSubName}
                  onChange={(e) => setWindowSubName(e.target.value)}
                  placeholder="e.g. Mid-Term Examination 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Submission Deadline (ISO)</label>
                <input
                  type="text"
                  value={windowCloseDate}
                  onChange={(e) => setWindowCloseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Open Submission Window
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
