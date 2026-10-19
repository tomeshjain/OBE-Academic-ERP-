'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  StudentEnrollment,
  QuestionItem,
  MarkEntryRecord,
  AssessmentWindowRecord,
  MarkEntryStatusCode,
  UserRole,
  CourseSection,
} from '@/types/erp';
import { useApp } from '@/context/AppContext';
import {
  Table,
  Users,
  PlusCircle,
  Edit2,
  Trash2,
  Download,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  FileSpreadsheet,
  X,
  Save,
  Check,
  UserCheck,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import {
  downloadStudentRosterTemplate,
  exportStudentsToExcel,
  parseStudentsFromExcel,
  downloadMarkEntryTemplate,
  exportCompletedMarksToExcel,
  parseMarksFromExcel,
} from '@/lib/excel-utils';
import { printElement, downloadPdfFromElement } from '@/lib/pdf-print-utils';

export const MarkEntryView: React.FC = () => {
  const {
    tenant,
    students,
    questions,
    marks,
    updateMarkEntry,
    importMarksBatch,
    assessmentWindows,
    updateAssessmentWindow,
    activeWindowId,
    setActiveWindowId,
    courses,
    activeCourseId,
    setActiveCourseId,
    courseSections,
    activeSectionId,
    setActiveSectionId,
    currentUserRole,
    courseOutcomes,
    addStudent,
    addStudentsBatch,
    updateStudent,
    deleteStudent,
    users,
    extendAssessmentWindowDeadline,
    currentUser,
    activeSubTab: globalSubTab,
    setActiveSubTab: setGlobalSubTab,
    academicScope,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'roster'>(
    (['matrix', 'roster'].includes(globalSubTab) ? (globalSubTab as any) : 'matrix')
  );

  React.useEffect(() => {
    if (['matrix', 'roster'].includes(globalSubTab)) {
      setActiveSubTab(globalSubTab as any);
    }
  }, [globalSubTab]);

  const switchSubTab = (tab: 'matrix' | 'roster') => {
    setActiveSubTab(tab);
    setGlobalSubTab(tab);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [extendFacultyId, setExtendFacultyId] = useState('');

  const displayedCourses = academicScope.visibleCourses;
  const activeCourse = displayedCourses.find((c) => c.id === activeCourseId) || displayedCourses[0] || null;
  const canManageCourse = academicScope.canManageCourse(activeCourse?.id);
  const canUnlockOrExtendDeadline = academicScope.canUnlockOrExtendDeadline;

  // Sections of the active course - scoped to assigned section for Section Faculty!
  const currentCourseSections = useMemo(() => {
    if (!activeCourse) return [];
    if (academicScope.isFaculty && !academicScope.isCoordinator && !academicScope.isHod && !academicScope.isAdmin) {
      const facultySections = academicScope.mappedSections.filter((s) => s.courseId === activeCourse.id);
      return facultySections.length > 0 ? facultySections : courseSections.filter((s) => s.courseId === activeCourse.id);
    }
    return courseSections.filter((s) => s.courseId === activeCourse.id);
  }, [courseSections, activeCourse, academicScope]);

  const activeSection = useMemo(() => {
    return (
      currentCourseSections.find((s) => s.id === activeSectionId) ||
      currentCourseSections[0] ||
      null
    );
  }, [currentCourseSections, activeSectionId]);

  // Assessment Windows for the active course / section
  const currentCourseWindows = useMemo(() => {
    if (!activeCourse) return assessmentWindows;
    return assessmentWindows.filter(
      (w) => !w.courseId || w.courseId === activeCourse.id
    );
  }, [assessmentWindows, activeCourse]);

  // Active Assessment Window
  const currentWindow: AssessmentWindowRecord | undefined = useMemo(() => {
    return (
      currentCourseWindows.find((w) => w.id === activeWindowId) ||
      currentCourseWindows[0]
    );
  }, [currentCourseWindows, activeWindowId]);

  // Questions for the active window/paper
  const activeQuestions = useMemo(() => {
    if (!currentWindow) return questions;
    return questions.filter(
      (q) => !q.questionPaperId || q.questionPaperId === currentWindow.questionPaperId
    );
  }, [questions, currentWindow]);

  // Deadline check
  const isDeadlinePassed = useMemo(() => {
    if (!currentWindow?.closeDateTime) return false;
    return new Date(currentWindow.closeDateTime).getTime() < Date.now();
  }, [currentWindow]);

  const isWindowLocked =
    currentWindow?.status === 'LOCKED' ||
    currentWindow?.status === 'FROZEN' ||
    isDeadlinePassed;

  const canEditMarks = academicScope.canEditMarksForSection(activeSection?.id, isWindowLocked);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        filterStatus === 'ALL' || s.enrollmentStatus === filterStatus;
      const matchesSection =
        selectedSectionFilter === 'ALL'
          ? (activeSection ? s.sectionId === activeSection.id : true)
          : s.sectionId === selectedSectionFilter;
      const matchesCourse =
        !s.courseId || s.courseId === activeCourse?.id;
      return matchesSearch && matchesStatus && matchesSection && matchesCourse;
    });
  }, [students, searchQuery, filterStatus, selectedSectionFilter, activeCourse, activeSection]);

  // Modals state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [showExtendDeadlineModal, setShowExtendDeadlineModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)
  );

  // Student CRUD Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEnrollment | null>(null);
  const [studentForm, setStudentForm] = useState({
    rollNumber: '',
    studentName: '',
    sectionId: '',
    enrollmentStatus: 'ACTIVE' as 'ACTIVE' | 'DROPPED' | 'WITHDRAWN',
  });

  // Action / Feedback Message
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Excel input refs
  const marksExcelRef = useRef<HTMLInputElement>(null);
  const rosterExcelRef = useRef<HTMLInputElement>(null);

  // Mark Helpers
  const getMark = (enrollmentId: string, questionId: string): MarkEntryRecord | undefined => {
    return marks.find(
      (m) => m.enrollmentId === enrollmentId && m.questionId === questionId
    );
  };

  // Save state tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Mark Helpers - Unified Frictionless Input (No Dropdowns!)
  // Accepts numeric marks, or shorthand codes: 'AB' (Absent), 'MP' (Malpractice), 'EX' (Exempted), '-' (Pending)
  const handleCellInput = (
    enrollmentId: string,
    questionId: string,
    maxMarks: number,
    rawText: string
  ) => {
    if (!canEditMarks) {
      setActionMessage({
        type: 'error',
        text: 'Assessment deadline has elapsed or window is locked. Mark entry is read-only for faculty.',
      });
      return;
    }

    setHasUnsavedChanges(true);
    const cleaned = rawText.trim().toUpperCase();

    // 1. Pending / Not Evaluated cases: empty or '-'
    if (cleaned === '' || cleaned === '-') {
      updateMarkEntry(enrollmentId, questionId, 'NOT_EVALUATED', null);
      return;
    }

    // 2. Attendance / Special evaluation codes:
    if (cleaned === 'AB' || cleaned === 'A' || cleaned === 'ABS') {
      updateMarkEntry(enrollmentId, questionId, 'ABSENT', 0);
      return;
    }

    if (cleaned === 'MP' || cleaned === 'M' || cleaned === 'MAL') {
      updateMarkEntry(enrollmentId, questionId, 'MALPRACTICE', 0);
      return;
    }

    if (cleaned === 'EX' || cleaned === 'E' || cleaned === 'EXE') {
      updateMarkEntry(enrollmentId, questionId, 'EXEMPTED', 0);
      return;
    }

    // 3. Numeric marks:
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      if (num < 0 || num > maxMarks) {
        setActionMessage({
          type: 'error',
          text: `Marks must be between 0 and maximum marks (${maxMarks}).`,
        });
        return;
      }
      updateMarkEntry(enrollmentId, questionId, 'PRESENT', num);
      setActionMessage(null);
      return;
    }

    // Invalid code entered
    setActionMessage({
      type: 'error',
      text: `Invalid entry "${rawText}". Enter a number (0–${maxMarks}), or AB (Absent), MP (Malpractice), EX (Exempted), or - (Pending).`,
    });
  };

  // Keyboard navigation for Excel-style down/up arrow and Enter key navigation
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIdx: number,
    colIdx: number,
    totalRows: number,
    totalCols: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(rowIdx + 1, totalRows - 1);
      const nextCell = document.getElementById(`mark-cell-${nextRow}-${colIdx}`);
      if (nextCell) {
        (nextCell as HTMLInputElement).focus();
        (nextCell as HTMLInputElement).select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(rowIdx - 1, 0);
      const prevCell = document.getElementById(`mark-cell-${prevRow}-${colIdx}`);
      if (prevCell) {
        (prevCell as HTMLInputElement).focus();
        (prevCell as HTMLInputElement).select();
      }
    }
  };

  // Save Button Handler
  const handleSaveAllMarks = () => {
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date().toLocaleTimeString());
    setActionMessage({
      type: 'success',
      text: `✓ All marks and attendance records have been successfully saved for ${activeSection?.name || 'Section'}! (${marks.length} recorded entries)`,
    });
  };

  // Quick fill helper
  const handleMarkAllPendingAsAbsent = () => {
    if (!canEditMarks) return;
    if (confirm('Mark all currently pending (-) students as Absent (AB) for this assessment?')) {
      filteredStudents.forEach((student) => {
        activeQuestions.forEach((q) => {
          const entry = getMark(student.id, q.id);
          if (!entry || entry.statusCode === 'NOT_EVALUATED') {
            updateMarkEntry(student.id, q.id, 'ABSENT', 0);
          }
        });
      });
      setHasUnsavedChanges(true);
      setActionMessage({
        type: 'info',
        text: 'All remaining pending entries marked as Absent (AB). Click "Save Marks" to persist.',
      });
    }
  };

  // Student Modal Handlers
  const handleOpenStudentModal = (student?: StudentEnrollment) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({
        rollNumber: student.rollNumber,
        studentName: student.studentName,
        sectionId: student.sectionId || activeSection?.id || '',
        enrollmentStatus: student.enrollmentStatus,
      });
    } else {
      setEditingStudent(null);
      setStudentForm({
        rollNumber: '',
        studentName: '',
        sectionId: activeSection?.id || currentCourseSections[0]?.id || '',
        enrollmentStatus: 'ACTIVE',
      });
    }
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.rollNumber.trim() || !studentForm.studentName.trim()) {
      setActionMessage({ type: 'error', text: 'Roll number and student name are required.' });
      return;
    }

    if (editingStudent) {
      updateStudent(editingStudent.id, {
        rollNumber: studentForm.rollNumber.trim(),
        studentName: studentForm.studentName.trim(),
        sectionId: studentForm.sectionId,
        courseId: activeCourse?.id,
        enrollmentStatus: studentForm.enrollmentStatus,
      });
      setActionMessage({ type: 'success', text: `Updated student: ${studentForm.studentName}` });
    } else {
      addStudent({
        rollNumber: studentForm.rollNumber.trim(),
        studentName: studentForm.studentName.trim(),
        sectionId: studentForm.sectionId,
        courseId: activeCourse?.id,
        enrollmentStatus: studentForm.enrollmentStatus,
      });
      setActionMessage({ type: 'success', text: `Added new student: ${studentForm.studentName}` });
    }
    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = (student: StudentEnrollment) => {
    if (confirm(`Are you sure you want to delete student "${student.studentName}" (${student.rollNumber})?`)) {
      deleteStudent(student.id);
      setActionMessage({ type: 'info', text: `Deleted student: ${student.studentName}` });
    }
  };

  // Bulk Excel Student Upload
  const handleRosterExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseStudentsFromExcel(file);
      if (parsed.length === 0) {
        setActionMessage({ type: 'error', text: 'No valid student records found in file.' });
        return;
      }
      addStudentsBatch(
        parsed.map((p) => ({
          ...p,
          courseId: activeCourse?.id,
          sectionId: activeSection?.id || currentCourseSections[0]?.id,
        }))
      );
      setActionMessage({
        type: 'success',
        text: `Successfully imported ${parsed.length} students into ${activeSection?.name || 'Section'} from Excel!`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Excel parse failed: ${err.message}` });
    } finally {
      if (rosterExcelRef.current) rosterExcelRef.current.value = '';
    }
  };

  // Bulk Excel Marks Upload
  const handleMarksExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWindow) return;

    try {
      const parsed = await parseMarksFromExcel(file, activeQuestions, filteredStudents, currentWindow.id);
      if (parsed.length === 0) {
        setActionMessage({ type: 'error', text: 'No matching student marks parsed from Excel.' });
        return;
      }
      importMarksBatch(parsed);
      setActionMessage({
        type: 'success',
        text: `Successfully imported ${parsed.length} mark entries from Excel!`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Marks Excel error: ${err.message}` });
    } finally {
      if (marksExcelRef.current) marksExcelRef.current.value = '';
    }
  };

  // Lock / Unlock Handlers
  const handleToggleLock = () => {
    if (!currentWindow) return;
    if (currentWindow.status === 'LOCKED' || currentWindow.status === 'FROZEN') {
      setShowUnlockModal(true);
    } else {
      updateAssessmentWindow({
        ...currentWindow,
        status: 'LOCKED',
      });
      setActionMessage({
        type: 'info',
        text: `Assessment window "${currentWindow.subComponentName}" has been LOCKED against further changes.`,
      });
    }
  };

  const handleConfirmUnlock = () => {
    if (!currentWindow || !unlockReason.trim()) return;
    updateAssessmentWindow({
      ...currentWindow,
      status: 'OPEN',
      unlockAuditReason: unlockReason.trim(),
    });
    setShowUnlockModal(false);
    setUnlockReason('');
    setActionMessage({
      type: 'success',
      text: `Assessment window "${currentWindow.subComponentName}" is now UNLOCKED for authorized faculty mark entry.`,
    });
  };

  const handleSaveExtendedDeadline = () => {
    if (!currentWindow || !newDeadline) return;
    const assignedFac = users.find((u) => u.id === extendFacultyId);
    const facName = assignedFac?.fullName || currentWindow.facultyName;
    extendAssessmentWindowDeadline(
      currentWindow.id,
      new Date(newDeadline).toISOString(),
      extendFacultyId || undefined,
      `Deadline extended to ${new Date(newDeadline).toLocaleString()} by Admin`
    );
    updateAssessmentWindow({
      ...currentWindow,
      status: 'UNLOCKED_BY_ADMIN',
      facultyId: extendFacultyId || currentWindow.facultyId,
      facultyName: facName,
      closeDateTime: new Date(newDeadline).toISOString(),
      unlockAuditReason: `Deadline extended to ${new Date(newDeadline).toLocaleString()} by Admin`,
    });
    setShowExtendDeadlineModal(false);
    setActionMessage({
      type: 'success',
      text: `Deadline extended to ${new Date(newDeadline).toLocaleString()} for ${facName || 'Assigned Faculty'}. Window is now UNLOCKED.`,
    });
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrintAwardSheet = () => {
    printElement(
      'printable-award-sheet',
      `Official_Award_Sheet_${activeCourse?.code || 'Course'}_${currentWindow?.subComponentName || 'Marks'}_${activeSection?.name || 'Section'}`
    );
  };

  const handleDownloadAwardSheetPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadPdfFromElement(
        'printable-award-sheet',
        `Official_Award_Sheet_${activeCourse?.code || 'Course'}_${currentWindow?.subComponentName || 'Marks'}_${activeSection?.name || 'Section'}.pdf`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Space Optimized & Integrated */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4.5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Module 8</span>
              <span>&bull;</span>
              <span>Faculty Assessment &amp; Mark Entry</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Filling of Question Wise Marks
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Enter question-level scores for students in paired sections within admin-configured deadlines.
            </p>
          </div>

          {/* Sub-menu Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto shrink-0">
            <button
              onClick={() => switchSubTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Mark Matrix</span>
            </button>
            <button
              onClick={() => switchSubTab('roster')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'roster'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Roster ({filteredStudents.length})</span>
            </button>
          </div>
        </div>

        {/* Paired Section & Faculty Allocation Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Section & Faculty Pair */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                Target Section:
              </span>
              <select
                value={activeSection?.id || ''}
                onChange={(e) => setActiveSectionId(e.target.value)}
                className="bg-transparent text-white font-bold rounded focus:outline-none cursor-pointer"
              >
                {currentCourseSections.length === 0 ? (
                  <option value="">No sections defined</option>
                ) : (
                  currentCourseSections.map((sec) => (
                    <option key={sec.id} value={sec.id} className="bg-slate-950 text-white">
                      {sec.name}
                    </option>
                  ))
                )}
              </select>
              <span className="text-slate-600">&harr;</span>
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {currentWindow?.facultyName || activeSection?.facultyName || 'Dr. Ramesh Kumar'}
                </span>
              </div>
            </div>

            {/* Assessment Window Selector */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                Assessment Window:
              </span>
              <select
                value={activeWindowId || currentWindow?.id || ''}
                onChange={(e) => setActiveWindowId(e.target.value)}
                className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer"
              >
                {currentCourseWindows.length === 0 ? (
                  <option value="">No Windows Configured</option>
                ) : (
                  currentCourseWindows.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-950 text-indigo-300">
                      {w.subComponentName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            {currentUser && (currentWindow?.facultyId === currentUser.id || activeSection?.facultyId === currentUser.id) && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-950/90 border border-teal-700 text-teal-300">
                Allocated to You
              </span>
            )}
            {currentWindow && (
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  isWindowLocked
                    ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                    : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                }`}
              >
                {isWindowLocked ? 'Window Locked' : 'Mark Entry Active'}
              </span>
            )}
          </div>
        </div>

        {/* Feedback Message */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : actionMessage.type === 'error'
                ? 'bg-rose-950/60 border border-rose-800 text-rose-200'
                : 'bg-indigo-950/60 border border-indigo-800 text-indigo-200'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: QUESTION-WISE MARK MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          {/* Assessment Window Selector & Deadlines Banner */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Assessment Window
                </label>
                <select
                  value={activeWindowId || currentWindow?.id || ''}
                  onChange={(e) => setActiveWindowId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                >
                  {currentCourseWindows.length === 0 ? (
                    <option value="">No Assessment Windows defined (See Menu 7)</option>
                  ) : (
                    currentCourseWindows.map((win) => (
                      <option key={win.id} value={win.id}>
                        {win.subComponentName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {currentWindow && (
                <div className="flex items-center gap-2 pt-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                      isWindowLocked
                        ? 'bg-rose-950 border border-rose-800 text-rose-300'
                        : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {isWindowLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{isDeadlinePassed ? 'DEADLINE EXPIRED' : currentWindow.status}</span>
                  </span>

                  {canUnlockOrExtendDeadline && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleToggleLock}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        {isWindowLocked ? 'Emergency Unlock' : 'Freeze / Lock'}
                      </button>
                      <button
                        onClick={() => setShowExtendDeadlineModal(true)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-indigo-950 border border-indigo-700 text-indigo-300 hover:bg-indigo-900 transition-colors"
                        title="Extend mark entry deadline or reallocate to another faculty"
                      >
                        Extend Deadline / Reallocate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deadline Notification Chip */}
            {currentWindow && (
              <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Admin Deadline: <strong className={isDeadlinePassed ? 'text-rose-400 font-mono' : 'text-slate-200 font-mono'}>
                    {new Date(currentWindow.closeDateTime).toLocaleString()}
                  </strong>
                </span>
              </div>
            )}

            {/* Excel & Save Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={marksExcelRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleMarksExcelUpload}
              />

              {/* High-Visibility Save Button */}
              <button
                onClick={handleSaveAllMarks}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                title="Save all marks and attendance changes to database"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Marks</span>
                {hasUnsavedChanges ? (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" title="Unsaved changes pending" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                )}
              </button>

              {lastSavedTime && (
                <span className="text-[11px] text-emerald-400 font-mono hidden lg:inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved {lastSavedTime}
                </span>
              )}

              {/* Quick Fill Remaining AB Button */}
              <button
                disabled={!canEditMarks}
                onClick={handleMarkAllPendingAsAbsent}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                title="Mark all pending (-) students as Absent (AB) in this assessment"
              >
                <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Mark Remaining as AB</span>
              </button>

              <button
                onClick={() => {
                  if (filteredStudents.length === 0 || activeQuestions.length === 0) {
                    setActionMessage({
                      type: 'error',
                      text: 'Please ensure students and questions are present before downloading template.',
                    });
                    return;
                  }
                  downloadMarkEntryTemplate(
                    filteredStudents,
                    activeQuestions,
                    currentWindow?.subComponentName || 'Assessment Marks'
                  );
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Template</span>
              </button>

              <button
                disabled={!canEditMarks}
                onClick={() => marksExcelRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Excel</span>
              </button>

              <button
                onClick={() => {
                  if (filteredStudents.length === 0 || activeQuestions.length === 0) {
                    setActionMessage({
                      type: 'error',
                      text: 'No marks data to export.',
                    });
                    return;
                  }
                  exportCompletedMarksToExcel(
                    filteredStudents,
                    activeQuestions,
                    marks,
                    currentWindow?.subComponentName || 'Assessment Marks'
                  );
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Export Marks</span>
              </button>

              <button
                onClick={handlePrintAwardSheet}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                title="Print Official Examination Mark Award Sheet (isolated output)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Award Sheet</span>
              </button>

              <button
                onClick={handleDownloadAwardSheetPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                title="Download Vector PDF Award Sheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Deadline Warning Banner if Expired */}
          {isDeadlinePassed && (
            <div className="p-4 bg-rose-950/40 border border-rose-900/80 rounded-2xl flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <strong className="block text-white">Assessment Submission Deadline Expired</strong>
                  <span>
                    The mark entry window configured by the Admin closed on {new Date(currentWindow.closeDateTime).toLocaleString()}. Faculty mark entry is locked.
                  </span>
                </div>
              </div>
              {(currentUserRole === 'TENANT_ADMIN' || currentUserRole === 'HOD') && (
                <button
                  onClick={() => setShowExtendDeadlineModal(true)}
                  className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-white border border-rose-700 rounded-xl font-semibold shrink-0"
                >
                  Extend Deadline
                </button>
              )}
            </div>
          )}

          {/* Mark Entry Matrix Table */}
          {filteredStudents.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Students in {activeSection?.name || 'Section'}</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Switch to the "Enrolled Students Roster" sub-tab above to add 2026 Batch students or allocate them to {activeSection?.name || 'this section'}.
              </p>
            </div>
          ) : activeQuestions.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Table className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Questions in Assessment Blueprint</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                No questions have been configured for this assessment window. Configure questions under Menu Item 7 (Assessment & Question Papers).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick Case Legend & Frictionless Data Entry Guidance Bar */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap text-slate-300">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Fast Keys:</span>
                  <span className="inline-flex items-center gap-1 font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                    <strong>Score</strong> (e.g. 15, 8.5)
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/60">
                    <strong>AB</strong> Absent
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-red-200 bg-red-900/40 px-2 py-0.5 rounded border border-red-700/60">
                    <strong>MP</strong> Malpractice
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/60">
                    <strong>EX</strong> Exempted
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    <strong className="text-white">-</strong> Pending (Clear)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-[10px]">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-[10px]">↓</kbd> to jump to next student</span>
                </div>
              </div>

              <div id="printable-award-sheet" className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-0 sm:p-2 space-y-4">
                {/* Official Print Header */}
                <div className="hidden print:block p-6 border-b-2 border-slate-900 mb-4 text-center bg-white text-slate-950 font-serif">
                  <h1 className="text-xl font-bold uppercase tracking-wider">{tenant?.name || 'CENTRAL UNIVERSITY'}</h1>
                  <h2 className="text-sm font-semibold uppercase text-slate-700 mt-1">
                    Official Mark Award Sheet &bull; {currentWindow?.subComponentName || 'Examination Marks'}
                  </h2>
                  <div className="text-xs text-slate-600 mt-1">
                    Course: {activeCourse?.code} - {activeCourse?.title} &bull; Section: {activeSection?.name || 'Section A'} &bull; Evaluator: {currentWindow?.facultyName || activeSection?.facultyName || 'Course Faculty'} &bull; Batch 2026
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-3 sticky left-0 bg-slate-950 z-20 w-12 text-center">#</th>
                      <th className="px-4 py-3 sticky left-12 bg-slate-950 z-20 min-w-[130px]">Roll No</th>
                      <th className="px-4 py-3 sticky left-[178px] bg-slate-950 z-20 min-w-[180px]">Student Name</th>
                      {activeQuestions.map((q) => {
                        const coCode =
                          courseOutcomes.find((co) => co.id === q.courseOutcomeId)?.code || 'CO';
                        return (
                          <th key={q.id} className="px-4 py-3 text-center border-l border-slate-800/80 min-w-[130px]">
                            <div className="font-bold text-white text-xs">{q.questionNumber}</div>
                            <div className="text-[10px] text-indigo-400 font-normal">
                              Max: {q.maxMarks}M &bull; {coCode}
                            </div>
                            <div className="text-[9px] text-slate-500 font-normal">
                              {q.bloomsLevel}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center border-l border-slate-800 bg-slate-950/80 min-w-[100px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredStudents.map((student, idx) => {
                      let studentTotalObtained = 0;
                      let studentTotalMax = 0;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 sticky left-0 bg-slate-900/90 z-10 text-center text-slate-500 font-sans text-xs">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 sticky left-12 bg-slate-900/90 z-10 font-bold text-white">
                            {student.rollNumber}
                          </td>
                          <td className="px-4 py-3 sticky left-[178px] bg-slate-900/90 z-10 font-sans text-slate-200 truncate">
                            {student.studentName}
                          </td>

                          {activeQuestions.map((q, qIdx) => {
                            const entry = getMark(student.id, q.id);
                            const val = entry?.marksObtained;
                            const status = entry?.statusCode || 'NOT_EVALUATED';

                            if (status === 'PRESENT' && typeof val === 'number') {
                              studentTotalObtained += val;
                            }
                            studentTotalMax += q.maxMarks;

                            // Determine display string for this cell
                            let cellText = '';
                            if (status === 'ABSENT') {
                              cellText = 'AB';
                            } else if (status === 'MALPRACTICE') {
                              cellText = 'MP';
                            } else if (status === 'EXEMPTED') {
                              cellText = 'EX';
                            } else if (status === 'PRESENT' && typeof val === 'number') {
                              cellText = String(val);
                            } else {
                              cellText = ''; // empty displays placeholder '-'
                            }

                            return (
                              <td
                                key={q.id}
                                className="px-2 py-1.5 border-l border-slate-800/60 text-center"
                              >
                                {canEditMarks ? (
                                  <input
                                    id={`mark-cell-${idx}-${qIdx}`}
                                    type="text"
                                    value={cellText}
                                    onChange={(e) =>
                                      handleCellInput(
                                        student.id,
                                        q.id,
                                        q.maxMarks,
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleCellKeyDown(
                                        e,
                                        idx,
                                        qIdx,
                                        filteredStudents.length,
                                        activeQuestions.length
                                      )
                                    }
                                    placeholder="-"
                                    title={`Q${q.questionNumber} (Max: ${q.maxMarks}M). Type score (0–${q.maxMarks}), or AB for Absent, MP for Malpractice, EX for Exempted, - for Pending. Press Enter for next student.`}
                                    className={`w-16 h-8 text-center rounded-lg text-xs font-mono font-bold border transition-all ${
                                      status === 'ABSENT'
                                        ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold focus:ring-1 focus:ring-rose-500'
                                        : status === 'MALPRACTICE'
                                        ? 'bg-red-950/90 border-red-600 text-red-200 font-bold focus:ring-1 focus:ring-red-500'
                                        : status === 'EXEMPTED'
                                        ? 'bg-blue-950/80 border-blue-700 text-blue-300 font-bold focus:ring-1 focus:ring-blue-500'
                                        : status === 'PRESENT' && typeof val === 'number'
                                        ? val >= q.maxMarks * 0.6
                                          ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-300 focus:border-emerald-400'
                                          : 'bg-amber-950/50 border-amber-600/70 text-amber-300 focus:border-amber-400'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 placeholder:text-slate-600 focus:border-indigo-500'
                                    } focus:outline-none focus:scale-105`}
                                  />
                                ) : (
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-bold ${
                                      status === 'ABSENT'
                                        ? 'text-rose-400 bg-rose-950/60 border border-rose-900'
                                        : status === 'MALPRACTICE'
                                        ? 'text-red-300 bg-red-950/60 border border-red-900'
                                        : status === 'EXEMPTED'
                                        ? 'text-blue-400 bg-blue-950/60 border border-blue-900'
                                        : typeof val === 'number'
                                        ? 'text-slate-200'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {status === 'ABSENT'
                                      ? 'AB'
                                      : status === 'MALPRACTICE'
                                      ? 'MP'
                                      : status === 'EXEMPTED'
                                      ? 'EX'
                                      : typeof val === 'number'
                                      ? val
                                      : '-'}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 border-l border-slate-800 text-center font-bold text-white bg-slate-950/30">
                            <span>{studentTotalObtained.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {' '}/ {studentTotalMax}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Official Print Signatures */}
              <div className="hidden print:grid grid-cols-3 gap-6 pt-8 pb-4 text-center text-xs font-serif text-slate-900 border-t border-slate-400 mt-6 bg-white">
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Faculty Evaluator Signature</div>
                </div>
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Course Coordinator Verification</div>
                </div>
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Head of Department Seal</div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ENROLLED STUDENTS ROSTER */}
      {activeSubTab === 'roster' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search roll number or name..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Sections</option>
                {currentCourseSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DROPPED">Dropped</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={rosterExcelRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleRosterExcelUpload}
              />
              <button
                onClick={downloadStudentRosterTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Template</span>
              </button>

              <button
                onClick={() => rosterExcelRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload Excel</span>
              </button>

              <button
                onClick={() => exportStudentsToExcel(filteredStudents)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Export</span>
              </button>

              {canManageCourse && (
                <>
                  <button
                    onClick={() => rosterExcelRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload Excel</span>
                  </button>

                  <button
                    onClick={() => handleOpenStudentModal()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Students Table */}
          {filteredStudents.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Enrolled Students Found</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                No students match your criteria. Click "Add Student" above or upload an Excel roster template for 2026 Batch.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredStudents.map((stu, idx) => {
                    const sec = currentCourseSections.find((s) => s.id === stu.sectionId);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{stu.rollNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{stu.studentName}</td>
                        <td className="px-4 py-3 font-semibold text-indigo-300">
                          {sec?.name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              stu.enrollmentStatus === 'ACTIVE'
                                ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                                : 'bg-rose-950 border border-rose-800 text-rose-300'
                            }`}
                          >
                            {stu.enrollmentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canManageCourse ? (
                              <>
                                <button
                                  onClick={() => handleOpenStudentModal(stu)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                  title="Edit Student"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(stu)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-600 text-[11px] italic">Managed by Coordinator</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STUDENT ADD / EDIT MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingStudent ? 'Edit Enrolled Student' : 'Add New Student (2026 Batch)'}
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Roll / Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.rollNumber}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, rollNumber: e.target.value })
                  }
                  placeholder="e.g. 2026-CSE-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reference format for Batch 2026: 2026-[DEPT]-[ROLL]
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.studentName}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, studentName: e.target.value })
                  }
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Group into Section
                </label>
                <select
                  value={studentForm.sectionId}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, sectionId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Section --</option>
                  {currentCourseSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.facultyName || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Enrollment Status
                </label>
                <select
                  value={studentForm.enrollmentStatus}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      enrollmentStatus: e.target.value as 'ACTIVE' | 'DROPPED' | 'WITHDRAWN',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Currently Enrolled)</option>
                  <option value="DROPPED">DROPPED</option>
                  <option value="WITHDRAWN">WITHDRAWN</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  {editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WINDOW UNLOCK REQUEST MODAL */}
      {showUnlockModal && currentWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Unlock Assessment Window</h3>
              </div>
              <button
                onClick={() => setShowUnlockModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                This assessment window is locked for accreditation compliance. Please provide a formal justification for reopening mark entry:
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Reason for Unlocking *
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Grievance re-evaluation / missing marks correction approved by HOD."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!unlockReason.trim()}
                  onClick={handleConfirmUnlock}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors shadow-sm"
                >
                  Confirm & Re-open Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND DEADLINE MODAL */}
      {showExtendDeadlineModal && currentWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <Calendar className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Extend Assessment Deadline</h3>
              </div>
              <button
                onClick={() => setShowExtendDeadlineModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300">
                Configure a new submission cutoff deadline and faculty assignment for <strong>{currentWindow.subComponentName}</strong>:
              </p>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Assigned Faculty for Mark Entry
                </label>
                <select
                  value={extendFacultyId}
                  onChange={(e) => setExtendFacultyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Keep Current ({currentWindow.facultyName || 'Assigned Faculty'}) --</option>
                  {users
                    .filter((u) => u.role !== 'STUDENT')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email}) &bull; {u.role}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reassign the specific faculty authorized to enter marks during this extension.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  New Admin Deadline (Date & Time) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtendDeadlineModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExtendedDeadline}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save & Extend Deadline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
