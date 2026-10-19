'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CourseRecord,
  CourseOutcomeItem,
  BloomsTaxonomyLevel,
  CourseSection,
} from '@/types/erp';
import {
  downloadCourseOutcomesTemplate,
  exportCourseOutcomesToExcel,
  parseCourseOutcomesFromExcel,
} from '@/lib/excel-utils';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  BookOpen,
  Target,
  Network,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
  Users,
  UserCheck,
  CheckSquare,
  Square,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

export const CoursesView: React.FC = () => {
  const {
    courses,
    activeCourseId,
    setActiveCourseId,
    addCourse,
    addCoursesBatch,
    updateCourse,
    deleteCourse,
    courseSections,
    activeSectionId,
    setActiveSectionId,
    addCourseSection,
    addCourseSectionsBatch,
    updateCourseSection,
    deleteCourseSection,
    assignStudentsToSection,
    assignFacultyToSection,
    courseOutcomes,
    addCourseOutcome,
    addCourseOutcomesBatch,
    updateCourseOutcome,
    deleteCourseOutcome,
    programOutcomes,
    coPoMappings,
    updateCoPoMapping,
    deleteCoPoMapping,
    programs,
    activeProgramId,
    terms,
    regulations,
    users,
    students,
    addStudent,
    addStudentsBatch,
    updateStudent,
    deleteStudent,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const [subTab, setSubTab] = useState<'catalog' | 'enrollment' | 'sections' | 'cos' | 'matrix'>(
    (['catalog', 'enrollment', 'sections', 'cos', 'matrix'].includes(activeSubTab)
      ? (activeSubTab as any)
      : 'catalog')
  );

  React.useEffect(() => {
    if (['catalog', 'enrollment', 'sections', 'cos', 'matrix'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'catalog' | 'enrollment' | 'sections' | 'cos' | 'matrix') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };

  const [showBulkModal, setShowBulkModal] = useState<'courses' | 'sections' | 'cos' | 'students' | null>(null);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');

  const displayedCourses = academicScope.visibleCourses;
  const activeCourse = displayedCourses.find((c) => c.id === activeCourseId) || displayedCourses[0] || null;
  const canCreateCourse = academicScope.canCreateCourse;
  const canManageCourse = academicScope.canManageCourse(activeCourse?.id);

  // Active Program for PO mapping - dynamically resolved based on the course's program!
  const courseProgram =
    programs.find((p) => p.id === activeCourse?.programId) ||
    programs.find((p) => p.id === activeProgramId) ||
    programs[0] ||
    null;
  const currentProgramPos = programOutcomes.filter((po) => po.programId === courseProgram?.id);

  // Filter sections for active course
  const currentCourseSections = courseSections.filter(
    (sec) => sec.courseId === activeCourse?.id
  );

  // Course-Level Enrolled Students
  const courseEnrolledStudents = students.filter(
    (s) => s.courseId === activeCourse?.id || (!s.courseId && currentCourseSections.some((sec) => sec.id === s.sectionId))
  );

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const filteredEnrolledStudents = courseEnrolledStudents.filter((s) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    return s.rollNumber.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q);
  });

  // Registered Faculty Accounts
  const facultyAccounts = users.filter(
    (u) =>
      u.role === 'COURSE_FACULTY' ||
      u.role === 'COURSE_COORDINATOR' ||
      u.role === 'HOD' ||
      u.role === 'TENANT_ADMIN'
  );

  // File input ref for Excel CO upload
  const coExcelInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [modalType, setModalType] = useState<
    | 'addCourse'
    | 'editCourse'
    | 'addCO'
    | 'editCO'
    | 'addSection'
    | 'editSection'
    | 'assignStudents'
    | 'enrollStudent'
    | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Student enrollment form states
  const [enrollRoll, setEnrollRoll] = useState('');
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollSectionId, setEnrollSectionId] = useState('');

  // Course form states
  const [courseProgramId, setCourseProgramId] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [credits, setCredits] = useState(4);
  const [lectureHours, setLectureHours] = useState(3);
  const [tutorialHours, setTutorialHours] = useState(0);
  const [practicalHours, setPracticalHours] = useState(2);
  const [term, setTerm] = useState('Semester I (Batch 2026)');
  const [coordinator, setCoordinator] = useState('Lead Course Faculty');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [regulation, setRegulation] = useState('R2026');

  // Section form states
  const [sectionName, setSectionName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');

  // Assign students state
  const [targetSectionForStudents, setTargetSectionForStudents] = useState<CourseSection | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // CO form states
  const [coCode, setCoCode] = useState('');
  const [coStatement, setCoStatement] = useState('');
  const [coBloom, setCoBloom] = useState<BloomsTaxonomyLevel>('APPLY');

  // Articulation matrix cell selection state
  const [selectedCell, setSelectedCell] = useState<{
    coId: string;
    poId: string;
    coCode: string;
    poCode: string;
    currentLevel: number;
    justification: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filter COs for active course
  const currentCourseOutcomes = courseOutcomes.filter((co) => co.courseId === activeCourse?.id);

  // Mapping lookup table
  const mappingMap = React.useMemo(() => {
    const map = new Map<string, { level: number; justification: string }>();
    coPoMappings.forEach((m) => {
      map.set(`${m.courseOutcomeId}_${m.programOutcomeId}`, {
        level: m.mappingLevel,
        justification: m.justification || '',
      });
    });
    return map;
  }, [coPoMappings]);

  // Open modals
  const openAddCourse = () => {
    if (!canCreateCourse) {
      showMsg('Access Restricted: Only Admin, Head of Faculty, Head of School, or HOD can create new courses.', 'error');
      return;
    }
    setCourseProgramId(
      selectedProgramFilter !== 'ALL' ? selectedProgramFilter : programs[0]?.id || ''
    );
    setCourseCode('CS2601');
    setCourseTitle('');
    setCredits(4);
    setLectureHours(3);
    setTutorialHours(0);
    setPracticalHours(2);
    setTerm(terms[0]?.name || 'Semester I (Batch 2026)');
    const defaultFac = facultyAccounts[0] || users.find((u) => u.role !== 'STUDENT');
    setCoordinator(defaultFac?.fullName || 'Lead Course Faculty');
    setCoordinatorId(defaultFac?.id || '');
    setRegulation(regulations[0]?.code || 'R2026');
    setEditingId(null);
    setModalType('addCourse');
  };

  const openEditCourse = (c: CourseRecord) => {
    if (!academicScope.canManageCourse(c.id)) {
      showMsg('Access Restricted: Course configuration can only be edited by the Course Coordinator or HOD/Admin.', 'error');
      return;
    }
    setCourseProgramId(c.programId || programs[0]?.id || '');
    setCourseCode(c.code);
    setCourseTitle(c.title);
    setCredits(c.credits);
    setLectureHours(c.lectureHours);
    setTutorialHours(c.tutorialHours);
    setPracticalHours(c.practicalHours);
    setTerm(c.term);
    setCoordinator(c.coordinator || '');
    const matchedFac = users.find((u) => u.id === c.coordinatorId || u.fullName.toLowerCase() === c.coordinator?.toLowerCase());
    setCoordinatorId(c.coordinatorId || matchedFac?.id || '');
    setRegulation(c.regulation);
    setEditingId(c.id);
    setModalType('editCourse');
  };

  const openAddSection = () => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Only the Course Coordinator or HOD/Admin can add course sections.', 'error');
      return;
    }
    if (!activeCourse) {
      showMsg('Please select a course first.', 'error');
      return;
    }
    const nextSecLetter = String.fromCharCode(65 + currentCourseSections.length);
    setSectionName(`Section ${nextSecLetter}`);
    setFacultyId(facultyAccounts[0]?.id || '');
    setAcademicYear('2026-2027');
    setEditingId(null);
    setModalType('addSection');
  };

  const openEditSection = (sec: CourseSection) => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Section configuration can only be edited by the Course Coordinator or HOD/Admin.', 'error');
      return;
    }
    setSectionName(sec.name);
    setFacultyId(sec.facultyId || '');
    setAcademicYear(sec.academicYear || '2026-2027');
    setEditingId(sec.id);
    setModalType('editSection');
  };

  const openAssignStudentsModal = (sec: CourseSection) => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Student section assignment can only be modified by the Course Coordinator or HOD/Admin.', 'error');
      return;
    }
    setTargetSectionForStudents(sec);
    const currentlyInSec = students.filter((s) => s.sectionId === sec.id).map((s) => s.id);
    setSelectedStudentIds(currentlyInSec);
    setModalType('assignStudents');
  };

  const openEnrollStudent = () => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Only the Course Coordinator or HOD/Admin can enroll students into the course.', 'error');
      return;
    }
    if (!activeCourse) {
      showMsg('Please select a Course first.', 'error');
      return;
    }
    const nextSeq = String(courseEnrolledStudents.length + 1).padStart(3, '0');
    setEnrollRoll(`2026-${activeCourse.code.replace(/[^A-Za-z0-9]/g, '').substring(0, 4)}-${nextSeq}`);
    setEnrollName('');
    setEnrollEmail('');
    setEnrollSectionId(currentCourseSections[0]?.id || '');
    setModalType('enrollStudent');
  };

  const handleSaveEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollRoll.trim() || !enrollName.trim() || !activeCourse) return;

    addStudent({
      rollNumber: enrollRoll.trim().toUpperCase(),
      studentName: enrollName.trim(),
      enrollmentStatus: 'ACTIVE',
      courseId: activeCourse.id,
      sectionId: enrollSectionId || currentCourseSections[0]?.id || undefined,
    });
    showMsg(`Student ${enrollName.trim()} (${enrollRoll.trim().toUpperCase()}) enrolled to ${activeCourse.code}.`);
    closeModal();
  };

  const bulkStudentColumns: BulkUploadColumn[] = [
    { key: 'rollNumber', label: 'Roll / Reg Number', required: true, example: '2026-CS-001' },
    { key: 'studentName', label: 'Student Full Name', required: true, example: 'Aarav Patel' },
    { key: 'section', label: 'Section (e.g. Section A)', required: false, example: 'Section A' },
  ];

  const bulkStudentSamples = [
    { rollNumber: '2026-CS-001', studentName: 'Aarav Patel', section: 'Section A' },
    { rollNumber: '2026-CS-002', studentName: 'Bhavna Sharma', section: 'Section A' },
    { rollNumber: '2026-CS-003', studentName: 'Chetan Desai', section: 'Section B' },
    { rollNumber: '2026-CS-004', studentName: 'Deepa Narayanan', section: 'Section B' },
  ];

  const handleBulkEnrollStudents = (rows: Array<Record<string, string>>) => {
    if (!activeCourse) return;
    const batch = rows.map((r) => {
      const matchedSec = currentCourseSections.find(
        (sec) => sec.name.toLowerCase() === r.section?.trim().toLowerCase()
      );
      return {
        rollNumber: r.rollNumber.trim().toUpperCase(),
        studentName: r.studentName.trim(),
        courseId: activeCourse.id,
        sectionId: matchedSec?.id || currentCourseSections[0]?.id,
      };
    });
    addStudentsBatch(batch);
    showMsg(`Successfully enrolled ${batch.length} students into ${activeCourse.code}.`);
    setShowBulkModal(null);
  };

  const openAddCO = () => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Course Outcomes can only be configured by the Course Coordinator or HOD/Admin.', 'error');
      return;
    }
    if (!activeCourse) {
      showMsg('Please select or create a Course first.', 'error');
      return;
    }
    setCoCode(`CO${currentCourseOutcomes.length + 1}`);
    setCoStatement('');
    setCoBloom('APPLY');
    setEditingId(null);
    setModalType('addCO');
  };

  const openEditCO = (co: CourseOutcomeItem) => {
    if (!canManageCourse) {
      showMsg('Access Restricted: Course Outcomes can only be edited by the Course Coordinator or HOD/Admin.', 'error');
      return;
    }
    setCoCode(co.code);
    setCoStatement(co.statement);
    setCoBloom(co.bloomsLevel);
    setEditingId(co.id);
    setModalType('editCO');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setTargetSectionForStudents(null);
    setEnrollRoll('');
    setEnrollName('');
    setEnrollEmail('');
    setEnrollSectionId('');
  };

  // Submit handlers
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim()) return;

    if (modalType === 'addCourse') {
      addCourse({
        programId: courseProgramId || programs[0]?.id,
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        credits: Number(credits) || 4,
        lectureHours: Number(lectureHours) || 3,
        tutorialHours: Number(tutorialHours) || 0,
        practicalHours: Number(practicalHours) || 0,
        term,
        coordinator: coordinator.trim(),
        coordinatorId: coordinatorId || undefined,
        regulation: regulation.trim(),
      });
      showMsg('Course registered successfully with designated Course Coordinator.');
    } else if (modalType === 'editCourse' && editingId) {
      updateCourse(editingId, {
        programId: courseProgramId || programs[0]?.id,
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        credits: Number(credits) || 4,
        lectureHours: Number(lectureHours) || 3,
        tutorialHours: Number(tutorialHours) || 0,
        practicalHours: Number(practicalHours) || 0,
        term,
        coordinator: coordinator.trim(),
        coordinatorId: coordinatorId || undefined,
        regulation: regulation.trim(),
      });
      showMsg('Course details and assigned Course Coordinator updated.');
    }
    closeModal();
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim() || !activeCourse) return;

    const matchedFaculty = facultyAccounts.find((f) => f.id === facultyId);

    if (modalType === 'addSection') {
      addCourseSection({
        courseId: activeCourse.id,
        name: sectionName.trim(),
        facultyId: matchedFaculty?.id,
        facultyName: matchedFaculty?.fullName || 'Assigned Faculty',
        academicYear,
      });
      showMsg(`Added ${sectionName.trim()} mapped to ${matchedFaculty?.fullName || 'Faculty'}.`);
    } else if (modalType === 'editSection' && editingId) {
      updateCourseSection(editingId, {
        name: sectionName.trim(),
        facultyId: matchedFaculty?.id,
        facultyName: matchedFaculty?.fullName || 'Assigned Faculty',
        academicYear,
      });
      showMsg('Section details updated.');
    }
    closeModal();
  };

  const handleSaveStudentAssignment = () => {
    if (!targetSectionForStudents) return;
    assignStudentsToSection(selectedStudentIds, targetSectionForStudents.id);
    showMsg(`Updated ${selectedStudentIds.length} students grouped in ${targetSectionForStudents.name}.`);
    closeModal();
  };

  const handleSaveCO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !coCode.trim() || !coStatement.trim()) return;

    if (modalType === 'addCO') {
      addCourseOutcome({
        courseId: activeCourse.id,
        code: coCode.trim().toUpperCase(),
        statement: coStatement.trim(),
        bloomsLevel: coBloom,
      });
      showMsg(`Course Outcome ${coCode.trim().toUpperCase()} added.`);
    } else if (modalType === 'editCO' && editingId) {
      updateCourseOutcome(editingId, {
        code: coCode.trim().toUpperCase(),
        statement: coStatement.trim(),
        bloomsLevel: coBloom,
      });
      showMsg(`Course Outcome ${coCode.trim().toUpperCase()} updated.`);
    }
    closeModal();
  };

  // Excel CO upload handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCourse) return;

    try {
      const parsed = await parseCourseOutcomesFromExcel(file, activeCourse.id);
      if (parsed.length === 0) {
        showMsg('No valid Course Outcome rows found in the uploaded file.', 'error');
        return;
      }
      addCourseOutcomesBatch(parsed);
      showMsg(`Imported ${parsed.length} Course Outcomes from Excel.`);
    } catch (err: any) {
      showMsg(`Upload error: ${err.message}`, 'error');
    } finally {
      if (coExcelInputRef.current) coExcelInputRef.current.value = '';
    }
  };

  const handleSaveMapping = () => {
    if (!selectedCell) return;
    updateCoPoMapping(
      selectedCell.coId,
      selectedCell.poId,
      selectedCell.currentLevel,
      selectedCell.justification
    );
    showMsg(`Mapped ${selectedCell.coCode} to ${selectedCell.poCode} at Level ${selectedCell.currentLevel}.`);
    setSelectedCell(null);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner - Space-Optimized */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Curriculum, Sections &amp; Outcome Articulation</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Courses</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Manage courses, course-level student enrollments, sections mapped to faculty, and 0–3 CO-PO articulation.
            </p>
          </div>

          {/* Sub-menu Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto flex-wrap gap-1 shrink-0">
            <button
              onClick={() => switchSubTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Catalog ({displayedCourses.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('enrollment')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'enrollment'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Enrollment ({courseEnrolledStudents.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('sections')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'sections'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sections &amp; Faculty ({currentCourseSections.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('cos')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'cos'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Outcomes ({currentCourseOutcomes.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('matrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>CO-PO Matrix (0-3)</span>
            </button>
          </div>
        </div>

        {/* Active Course Selector & Metadata */}
        {displayedCourses.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                Active Course:
              </span>
              <select
                value={activeCourse?.id || ''}
                onChange={(e) => setActiveCourseId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 focus:border-indigo-500 focus:outline-none"
              >
                {displayedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title} ({c.credits} Credits)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <span>Coordinator: <strong className="text-amber-300">{activeCourse?.coordinator || 'Unassigned'}</strong></span>
              <span>&bull;</span>
              <span>Term: <strong className="text-white">{activeCourse?.term || 'Semester I'}</strong></span>
            </div>
          </div>
        )}
      </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-800 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.text}</span>
          </div>
        )}
      {/* SUB-TAB 1: COURSE CATALOG */}
      {subTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Registered Courses</h2>
              <p className="text-xs text-slate-400">Curricular courses for 2026 Batch linked to degree programs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Program Filter */}
              {programs.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-slate-400 font-semibold">Program:</span>
                  <select
                    value={selectedProgramFilter}
                    onChange={(e) => setSelectedProgramFilter(e.target.value)}
                    className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All Programs ({displayedCourses.length})
                    </option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.code} ({displayedCourses.filter((c) => c.programId === p.id).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {canCreateCourse && (
                <>
                  <button
                    onClick={() => setShowBulkModal('courses')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bulk Upload CSV</span>
                  </button>
                  <button
                    onClick={openAddCourse}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Course</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {displayedCourses.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Courses Defined</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {canCreateCourse
                  ? 'Click "Add Course" above to register courses for the 2026 Batch cohort.'
                  : 'No course is currently mapped to your scope.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedProgramFilter === 'ALL'
                ? displayedCourses
                : displayedCourses.filter((c) => c.programId === selectedProgramFilter)
              ).map((course) => {
                const isSelected = activeCourse?.id === course.id;
                const coCount = courseOutcomes.filter((co) => co.courseId === course.id).length;
                const secCount = courseSections.filter((s) => s.courseId === course.id).length;
                const courseProg = programs.find((p) => p.id === course.programId);
                const canManageThis = academicScope.canManageCourse(course.id);

                return (
                  <div
                    key={course.id}
                    className={`bg-slate-900/60 border rounded-2xl p-5 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-500/80 shadow-lg shadow-indigo-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setActiveCourseId(course.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                          {course.code}
                        </span>
                        {courseProg && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300">
                            {courseProg.code}
                          </span>
                        )}
                      </div>
                      {(canManageThis || academicScope.canDeleteCourse) && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {canManageThis && (
                            <button
                              onClick={() => openEditCourse(course)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Edit Course"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {academicScope.canDeleteCourse && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete course ${course.code} - ${course.title}?`)) {
                                  deleteCourse(course.id);
                                  showMsg(`Deleted course ${course.code}.`);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                              title="Delete Course (Leadership Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                      {course.title}
                    </h3>

                    <div className="text-[11px] text-slate-400 space-y-1 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Program:</span>
                        <strong className="text-purple-300 font-semibold truncate max-w-[160px]">
                          {courseProg ? `${courseProg.code} (${courseProg.name})` : 'Default Program'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Credits:</span>
                        <strong className="text-slate-200">{course.credits} Credits (L-T-P: {course.lectureHours}-{course.tutorialHours}-{course.practicalHours})</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sections:</span>
                        <span className="text-indigo-400 font-semibold">{secCount} Sections</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Outcomes:</span>
                        <span className="text-teal-400 font-semibold">{coCount} Defined COs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Regulation:</span>
                        <span className="text-slate-300">{course.regulation || 'R2026'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-indigo-400 font-medium">Coordinator:</span>
                        <span className="text-amber-300 font-semibold truncate max-w-[170px]" title={course.coordinator}>
                          {course.coordinator || 'Unassigned Faculty'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="text-[10px] text-indigo-300 font-bold flex items-center gap-1 border-t border-slate-800 pt-2">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                        <span>Currently Active for COs & Mapping</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: COURSE LEVEL STUDENT ENROLLMENT & SECTION ALLOCATION */}
      {subTab === 'enrollment' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Student Enrollment & Section Assignment ({activeCourse?.code})
                </h2>
                <span className="text-[10px] bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Course Level
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Enroll students directly into <strong>{activeCourse?.code} - {activeCourse?.title}</strong> and allocate them to faculty-mapped course sections.
              </p>
            </div>
            {canManageCourse && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setShowBulkModal('students')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload Enrollment (CSV)</span>
                </button>
                <button
                  onClick={openEnrollStudent}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
              </div>
            )}
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Enrolled</span>
                <GraduationCap className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white">{courseEnrolledStudents.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Students in {activeCourse?.code}</div>
            </div>

            {currentCourseSections.map((sec) => {
              const count = courseEnrolledStudents.filter((s) => s.sectionId === sec.id).length;
              return (
                <div key={sec.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300 truncate">{sec.name}</span>
                    <Users className="w-4 h-4 text-teal-400 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-white">{count}</div>
                  <div className="text-[11px] text-teal-400/90 truncate mt-0.5">
                    Faculty: <strong>{sec.facultyName || 'Unassigned'}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              placeholder="Search by Roll / Reg Number or Student Name..."
              className="w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <div className="text-xs text-slate-400 self-end sm:self-auto">
              Showing <strong className="text-white">{filteredEnrolledStudents.length}</strong> of{' '}
              <strong className="text-white">{courseEnrolledStudents.length}</strong> students
            </div>
          </div>

          {/* Roster Table */}
          {courseEnrolledStudents.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Students Enrolled in this Course</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Enroll students at the Course Level and assign them directly to course sections with mapped faculty.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={openEnrollStudent}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  + Enroll First Student
                </button>
                <button
                  onClick={() => setShowBulkModal('students')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Bulk Upload CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Roll / Reg Number</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Assigned Section & Faculty</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredEnrolledStudents.map((stu, sIdx) => {
                      return (
                        <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{sIdx + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-white">{stu.rollNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{stu.studentName}</td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{activeCourse?.code}</td>
                          <td className="px-4 py-3">
                            {canManageCourse ? (
                              <select
                                value={stu.sectionId || ''}
                                onChange={(e) => {
                                  const newSecId = e.target.value;
                                  updateStudent(stu.id, { sectionId: newSecId || undefined });
                                  const secObj = currentCourseSections.find((s) => s.id === newSecId);
                                  showMsg(`Assigned ${stu.studentName} to ${secObj ? secObj.name : 'Unassigned'}.`);
                                }}
                                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:border-indigo-500 focus:outline-none cursor-pointer"
                              >
                                <option value="">-- Unassigned Section --</option>
                                {currentCourseSections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.name} &bull; Faculty: {sec.facultyName || 'Unassigned'}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-300">
                                {currentCourseSections.find((s) => s.id === stu.sectionId)?.name || 'Unassigned'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                              {stu.enrollmentStatus || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManageCourse ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${stu.studentName} (${stu.rollNumber}) from ${activeCourse?.code}?`)) {
                                    deleteStudent(stu.id);
                                    showMsg(`Removed ${stu.studentName}.`);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Drop / Remove Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: COURSE SECTIONS & FACULTY ALLOCATION */}
      {subTab === 'sections' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Sections & Faculty Allocation ({activeCourse?.code})
              </h2>
              <p className="text-xs text-slate-400">
                Group enrolled students into sections and assign course faculty with mark-entry authorization.
              </p>
            </div>
            {canManageCourse && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setShowBulkModal('sections')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload Sections</span>
                </button>
                <button
                  onClick={openAddSection}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Section</span>
                </button>
              </div>
            )}
          </div>

          {currentCourseSections.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Sections Configured for this Course</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Create sections (e.g. Section A, Section B) to map faculty and group 2026 Batch students.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentCourseSections.map((sec) => {
                const assignedStudents = students.filter((s) => s.sectionId === sec.id);

                return (
                  <div
                    key={sec.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{sec.name}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            {sec.academicYear || '2026-2027'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Mapped Faculty: <strong className="text-white">{sec.facultyName || 'Unassigned'}</strong></span>
                        </div>
                      </div>

                      {canManageCourse && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSection(sec)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit Section & Faculty"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${sec.name}?`)) {
                                deleteCourseSection(sec.id);
                                showMsg(`Deleted ${sec.name}.`);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned Students Summary */}
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-teal-400" />
                        <span className="text-slate-300">
                          Grouped Students: <strong className="text-white">{assignedStudents.length}</strong>
                        </span>
                      </div>
                      {canManageCourse && (
                        <button
                          onClick={() => openAssignStudentsModal(sec)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Group / Manage Students
                        </button>
                      )}
                    </div>

                    {assignedStudents.length > 0 && (
                      <div className="text-[11px] text-slate-400 max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        {assignedStudents.map((stu) => (
                          <div key={stu.id} className="flex items-center justify-between py-0.5 border-b border-slate-800/40">
                            <span className="font-mono text-slate-300">{stu.rollNumber}</span>
                            <span className="truncate max-w-[180px]">{stu.studentName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: COURSE OUTCOMES (COs) */}
      {subTab === 'cos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Course Outcomes ({activeCourse?.code})
              </h2>
              <p className="text-xs text-slate-400">Bloom's taxonomy mapped performance indicators.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canManageCourse && (
                <>
                  <input
                    ref={coExcelInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                  <button
                    onClick={downloadCourseOutcomesTemplate}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Template</span>
                  </button>
                  <button
                    onClick={() => coExcelInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload Excel</span>
                  </button>
                </>
              )}
              <button
                onClick={() => exportCourseOutcomesToExcel(currentCourseOutcomes)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Export</span>
              </button>
              {canManageCourse && (
                <>
                  <button
                    onClick={() => setShowBulkModal('cos')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload CSV</span>
                  </button>
                  <button
                    onClick={openAddCO}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add CO</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {!canManageCourse && (
            <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">Course Outcomes Governance</span>
                  <p className="text-indigo-300/90 text-[11px] mt-0.5">
                    Course Outcomes (COs) and articulation are defined and governed by the Course Coordinator ({activeCourse?.coordinator || 'Assigned Lead'}). Section faculty has read-only visibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentCourseOutcomes.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Course Outcomes Configured</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {canManageCourse
                  ? `Click "Add CO" above or upload an Excel template to define outcomes for ${activeCourse?.code}.`
                  : 'No course outcomes are configured for this course yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-20">Code</th>
                    <th className="px-4 py-3">Course Outcome Statement</th>
                    <th className="px-4 py-3 w-32">Bloom's Level</th>
                    {canManageCourse && <th className="px-4 py-3 w-24 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {currentCourseOutcomes.map((co) => (
                    <tr key={co.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-400">{co.code}</td>
                      <td className="px-4 py-3 leading-relaxed">{co.statement}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {co.bloomsLevel}
                        </span>
                      </td>
                      {canManageCourse && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditCO(co)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Edit CO"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${co.code}?`)) {
                                  deleteCourseOutcome(co.id);
                                  showMsg(`Deleted ${co.code}.`);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                              title="Delete CO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: CO-PO MATRIX */}
      {subTab === 'matrix' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                CO-PO / PSO Articulation Matrix ({activeCourse?.code})
              </h2>
              <p className="text-xs text-slate-400">
                {canManageCourse
                  ? '1-Click mapping: Click any cell to cycle correlation (— → 1: Slight → 2: Moderate → 3: Substantial). Zero popups required.'
                  : 'Read-only view: You can inspect correlations. Only the Course Coordinator or Department Head can edit this matrix.'}
              </p>
            </div>

            {/* Quick Presets Toolbar */}
            {canManageCourse ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Presets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    currentCourseOutcomes.forEach((co) => {
                      currentProgramPos.forEach((po) => {
                        updateCoPoMapping(co.id, po.id, 2);
                      });
                    });
                    showMsg('Set all matrix correlations to 2 (Moderate).');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-900/40 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Set All 2 (Moderate)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    currentCourseOutcomes.forEach((co) => {
                      currentProgramPos.forEach((po) => {
                        updateCoPoMapping(co.id, po.id, 3);
                      });
                    });
                    showMsg('Set all matrix correlations to 3 (Substantial).');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-900/40 text-emerald-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Set All 3 (Substantial)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    currentCourseOutcomes.forEach((co) => {
                      currentProgramPos.forEach((po) => {
                        updateCoPoMapping(co.id, po.id, 0);
                      });
                    });
                    showMsg('Cleared all matrix correlations.');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Clear All (—)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-amber-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Governed Matrix (Managed by Course Coordinator)</span>
              </div>
            )}
          </div>

          {currentCourseOutcomes.length === 0 || currentProgramPos.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Network className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Matrix Requires COs and POs</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Ensure you have defined Course Outcomes (under the COs tab) and Program Outcomes (under Programs &amp; Outcomes).
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-3 sticky left-0 bg-slate-950 z-20 min-w-[90px]">CO Code</th>
                      {currentProgramPos.map((po) => (
                        <th key={po.id} className="px-3 py-3 text-center border-l border-slate-800 min-w-[70px]">
                          <span className="font-mono text-white">{po.code}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {currentCourseOutcomes.map((co) => (
                      <tr key={co.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 sticky left-0 bg-slate-900/90 z-10 font-bold text-indigo-400 font-sans">
                          {co.code}
                        </td>
                        {currentProgramPos.map((po) => {
                          const record = mappingMap.get(`${co.id}_${po.id}`);
                          const level = record?.level || 0;
                          return (
                            <td
                              key={po.id}
                              onClick={() => {
                                if (!canManageCourse) return;
                                const nextLevel = (level + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0
                                updateCoPoMapping(co.id, po.id, nextLevel, record?.justification);
                              }}
                              title={canManageCourse ? 'Click to cycle: 0 -> 1 -> 2 -> 3 -> 0' : 'Read-only: Managed by Course Coordinator'}
                              className={`px-3 py-3 text-center border-l border-slate-800 font-bold select-none transition-all ${
                                canManageCourse ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'
                              } ${
                                level === 3
                                  ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 shadow-inner'
                                  : level === 2
                                  ? 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 shadow-inner'
                                  : level === 1
                                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                                  : 'text-slate-600 hover:bg-slate-800/60'
                              }`}
                            >
                              {level > 0 ? level : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 font-bold border-t-2 border-slate-800 text-xs text-white">
                      <td className="px-4 py-3 sticky left-0 bg-slate-950 z-20 font-sans">
                        Average Correlation
                      </td>
                      {currentProgramPos.map((po) => {
                        let sum = 0;
                        let count = 0;
                        currentCourseOutcomes.forEach((co) => {
                          const item = mappingMap.get(`${co.id}_${po.id}`);
                          if (item && item.level > 0) {
                            sum += item.level;
                            count++;
                          }
                        });
                        const avg = count > 0 ? (sum / count).toFixed(2) : '—';
                        return (
                          <td
                            key={po.id}
                            className="px-3 py-3 text-center border-l border-slate-800 font-mono text-indigo-300 font-bold"
                          >
                            {avg}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT COURSE */}
      {(modalType === 'addCourse' || modalType === 'editCourse') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addCourse' ? 'Register New Course (Batch 2026)' : 'Edit Course Details'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Academic Program *
                </label>
                <select
                  value={courseProgramId}
                  onChange={(e) => setCourseProgramId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {programs.length === 0 ? (
                    <option value="">No Programs Found (Create in Programs &amp; Outcomes)</option>
                  ) : (
                    programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.batchYear || '2026-2030'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CS2601"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Credits *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Advanced Data Structures & Algorithm Design"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Lecture (L)</label>
                  <input
                    type="number"
                    min="0"
                    value={lectureHours}
                    onChange={(e) => setLectureHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Tutorial (T)</label>
                  <input
                    type="number"
                    min="0"
                    value={tutorialHours}
                    onChange={(e) => setTutorialHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Practical (P)</label>
                  <input
                    type="number"
                    min="0"
                    value={practicalHours}
                    onChange={(e) => setPracticalHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Academic Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g. Semester I (Batch 2026)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Assigned Course Coordinator (Faculty Account) *
                  </label>
                  <select
                    value={coordinatorId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setCoordinatorId(selId);
                      const matched = users.find((u) => u.id === selId);
                      if (matched) {
                        setCoordinator(matched.fullName);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Faculty Account as Course Coordinator --</option>
                    {users
                      .filter((u) => u.role !== 'STUDENT')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) &bull; {u.role}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Assigned: <strong className="text-indigo-300">{coordinator || 'Unassigned'}</strong>
                  </span>
                </div>
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
                  {modalType === 'addCourse' ? 'Create Course' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL STUDENT DIRECTLY AT COURSE LEVEL */}
      {modalType === 'enrollStudent' && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Enroll Student in {activeCourse.code}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Course: {activeCourse.title}
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEnrollStudent} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Roll / Registration Number *</label>
                <input
                  type="text"
                  required
                  value={enrollRoll}
                  onChange={(e) => setEnrollRoll(e.target.value)}
                  placeholder="e.g. 2026-CS-045"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Student Email (Optional)</label>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  placeholder="e.g. student@institution.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Course Section Assignment</label>
                <select
                  value={enrollSectionId}
                  onChange={(e) => setEnrollSectionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Unassigned Section --</option>
                  {currentCourseSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} &bull; Mapped Faculty: {sec.facultyName || 'Unassigned'}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Assigning a section connects the student to that section's assigned faculty member for question-wise marks entry.
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
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COURSE SECTION */}
      {(modalType === 'addSection' || modalType === 'editSection') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addSection' ? 'Add Course Section' : 'Edit Section Details'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Section A, Section B, Batch 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Mapped Faculty / Instructor *</label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Faculty Account --</option>
                  {facultyAccounts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullName} ({f.email}) &bull; {f.role}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Only mapped faculty can fill marks for this section within admin deadlines.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
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
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN STUDENTS TO SECTION */}
      {modalType === 'assignStudents' && targetSectionForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Group Students into {targetSectionForStudents.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select students to allocate to this course section.
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Select Students ({selectedStudentIds.length} selected):</span>
                <button
                  onClick={() => {
                    if (selectedStudentIds.length === students.length) {
                      setSelectedStudentIds([]);
                    } else {
                      setSelectedStudentIds(students.map((s) => s.id));
                    }
                  }}
                  className="text-indigo-400 hover:underline font-semibold text-[11px]"
                >
                  {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {students.length === 0 ? (
                <div className="text-center text-slate-500 py-6">
                  No enrolled students in system. Add students in Mark Entry Matrix.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {students.map((stu) => {
                    const isChecked = selectedStudentIds.includes(stu.id);
                    return (
                      <div
                        key={stu.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedStudentIds(selectedStudentIds.filter((id) => id !== stu.id));
                          } else {
                            setSelectedStudentIds([...selectedStudentIds, stu.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-950/40 border-indigo-700 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                          <span className="font-mono font-bold">{stu.rollNumber}</span>
                          <span>&bull;</span>
                          <span className="font-sans font-medium text-slate-200">{stu.studentName}</span>
                        </div>
                        {stu.sectionId && stu.sectionId !== targetSectionForStudents.id && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900">
                            Currently in other section
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStudentAssignment}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save Group Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CO */}
      {(modalType === 'addCO' || modalType === 'editCO') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addCO' ? `Add Course Outcome (${activeCourse?.code})` : 'Edit Course Outcome'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCO} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">CO Code *</label>
                  <input
                    type="text"
                    required
                    value={coCode}
                    onChange={(e) => setCoCode(e.target.value)}
                    placeholder="e.g. CO1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Bloom's Taxonomy Level *</label>
                  <select
                    value={coBloom}
                    onChange={(e) => setCoBloom(e.target.value as BloomsTaxonomyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="REMEMBER">Remember (Level 1)</option>
                    <option value="UNDERSTAND">Understand (Level 2)</option>
                    <option value="APPLY">Apply (Level 3)</option>
                    <option value="ANALYZE">Analyze (Level 4)</option>
                    <option value="EVALUATE">Evaluate (Level 5)</option>
                    <option value="CREATE">Create (Level 6)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Course Outcome Statement *</label>
                <textarea
                  required
                  rows={4}
                  value={coStatement}
                  onChange={(e) => setCoStatement(e.target.value)}
                  placeholder="e.g. Apply asymptotic notations and recurrence relations to analyze computational complexity."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"
                />
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
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CO-PO MAPPING DIALOG */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Map {selectedCell.coCode} &rarr; {selectedCell.poCode}</span>
              </h3>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-2">
                  Articulation Level (0 - 3)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() =>
                        setSelectedCell({ ...selectedCell, currentLevel: lvl })
                      }
                      className={`py-2.5 rounded-xl font-bold transition-all border ${
                        selectedCell.currentLevel === lvl
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 0 ? '0 (None)' : `${lvl} (${lvl === 1 ? 'Slight' : lvl === 2 ? 'Moderate' : 'Substantial'})`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Accreditation Justification / Evidence Note
                </label>
                <textarea
                  rows={3}
                  value={selectedCell.justification}
                  onChange={(e) =>
                    setSelectedCell({
                      ...selectedCell,
                      justification: e.target.value,
                    })
                  }
                  placeholder="e.g. Laboratory sessions directly reinforce asymptotic analysis principles."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapping}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save Articulation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkModal === 'courses' && (
        <BulkDataUploadModal
          title="Bulk Upload Course Catalog (CSV)"
          description="Upload multiple course catalog specifications with credits, L-T-P lecture-tutorial-practical hours, and regulations."
          sampleFileName="courses_catalog_template.csv"
          columns={[
            { key: 'code', label: 'Course Code', required: true, example: 'CS201' },
            { key: 'title', label: 'Course Title', required: true, example: 'Data Structures & Algorithms' },
            { key: 'programCode', label: 'Program Code', required: false, example: programs[0]?.code || 'BTECH-CSE-2026' },
            { key: 'credits', label: 'Credits', required: false, example: '4' },
            { key: 'lectureHours', label: 'Lecture Hours (L)', required: false, example: '3' },
            { key: 'tutorialHours', label: 'Tutorial Hours (T)', required: false, example: '0' },
            { key: 'practicalHours', label: 'Practical Hours (P)', required: false, example: '2' },
            { key: 'term', label: 'Academic Term', required: false, example: 'Semester I (Batch 2026)' },
            { key: 'coordinator', label: 'Course Coordinator', required: false, example: 'Dr. Ramesh Kumar' },
            { key: 'regulation', label: 'Regulation', required: false, example: 'R2026' },
          ]}
          onImport={(rows) => {
            const parsed = rows.map((r) => {
              const matchedProg = programs.find(
                (p) => p.code.toLowerCase() === r.programCode?.trim().toLowerCase()
              );
              return {
                programId:
                  matchedProg?.id ||
                  (selectedProgramFilter !== 'ALL' ? selectedProgramFilter : programs[0]?.id),
                code: r.code.toUpperCase().trim(),
                title: r.title.trim(),
                credits: Number(r.credits) || 4,
                lectureHours: Number(r.lectureHours) || 3,
                tutorialHours: Number(r.tutorialHours) || 0,
                practicalHours: Number(r.practicalHours) || 0,
                term: r.term?.trim() || terms[0]?.name || 'Semester I (Batch 2026)',
                coordinator: r.coordinator?.trim() || 'Lead Course Faculty',
                regulation: r.regulation?.trim() || regulations[0]?.code || 'R2026',
              };
            });
            addCoursesBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} courses with default sections.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}

      {showBulkModal === 'sections' && activeCourse && (
        <BulkDataUploadModal
          title={`Bulk Upload Course Sections (${activeCourse.code})`}
          description={`Create sections and map faculty for ${activeCourse.code} - ${activeCourse.title}`}
          sampleFileName={`sections_${activeCourse.code}.csv`}
          columns={[
            { key: 'name', label: 'Section Name', required: true, example: 'Section A' },
            { key: 'facultyName', label: 'Faculty Name', required: false, example: 'Dr. Ramesh Kumar' },
            { key: 'academicYear', label: 'Academic Year', required: false, example: '2026-2027' },
          ]}
          onImport={(rows) => {
            const parsed = rows.map((r) => {
              const matchedFaculty = facultyAccounts.find(
                (f) => f.fullName.toLowerCase() === r.facultyName?.trim().toLowerCase()
              );
              return {
                courseId: activeCourse.id,
                name: r.name.trim(),
                facultyId: matchedFaculty?.id,
                facultyName: r.facultyName?.trim() || matchedFaculty?.fullName || 'Assigned Faculty',
                academicYear: r.academicYear?.trim() || '2026-2027',
              };
            });
            addCourseSectionsBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} sections for ${activeCourse.code}.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}

      {showBulkModal === 'cos' && activeCourse && (
        <BulkDataUploadModal
          title={`Bulk Upload Course Outcomes (COs) for ${activeCourse.code}`}
          description={`Upload performance indicators and Bloom's taxonomy mappings for ${activeCourse.code}`}
          sampleFileName={`cos_${activeCourse.code}.csv`}
          columns={[
            { key: 'code', label: 'CO Code', required: true, example: 'CO1' },
            { key: 'statement', label: 'Outcome Statement', required: true, example: 'Analyze asymptotic computational complexity of algorithms' },
            { key: 'bloomsLevel', label: 'Bloom\'s Level (REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE)', required: false, example: 'ANALYZE' },
          ]}
          onImport={(rows) => {
            const validBlooms: BloomsTaxonomyLevel[] = [
              'REMEMBER',
              'UNDERSTAND',
              'APPLY',
              'ANALYZE',
              'EVALUATE',
              'CREATE',
            ];
            const parsed = rows.map((r) => {
              const rawBloom = (r.bloomsLevel || 'APPLY').toUpperCase().trim();
              const matchedBloom = validBlooms.find((b) => b === rawBloom) || 'APPLY';
              return {
                courseId: activeCourse.id,
                code: r.code.toUpperCase().trim(),
                statement: r.statement.trim(),
                bloomsLevel: matchedBloom,
              };
            });
            addCourseOutcomesBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} Course Outcomes for ${activeCourse.code}.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}

      {showBulkModal === 'students' && activeCourse && (
        <BulkDataUploadModal
          title={`Bulk Upload Student Enrollment (${activeCourse.code})`}
          description={`Enroll students directly into ${activeCourse.code} - ${activeCourse.title} and assign them to sections`}
          sampleFileName={`enrollment_${activeCourse.code}.csv`}
          columns={bulkStudentColumns}
          onImport={handleBulkEnrollStudents}
          onClose={() => setShowBulkModal(null)}
        />
      )}
    </div>
  );
};
