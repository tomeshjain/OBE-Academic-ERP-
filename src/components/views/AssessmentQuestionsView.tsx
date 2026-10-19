'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  AssessmentWindowRecord,
  QuestionItem,
  QuestionPaper,
  QuestionPaperSection,
  QuestionPaperTemplate,
  BloomsTaxonomyLevel,
  AssessmentWindowStatus,
} from '@/types/erp';
import {
  FileQuestion,
  Lock,
  Unlock,
  Send,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  Sparkles,
  Bold,
  Italic,
  Code,
  Sigma,
  List,
  Eraser,
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Settings2,
  BookOpen,
  Calendar,
  Save,
  Check,
  User,
  ShieldCheck,
  Printer,
  Eye,
  Split,
  Image as ImageIcon,
  LayoutGrid,
  Table as TableIcon,
  X,
  Search,
} from 'lucide-react';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import { sanitizeInput } from '@/lib/security';
import { LatexRenderer } from '@/components/LatexRenderer';
import { RichQuestionEditor } from '@/components/RichQuestionEditor';
import { generateQuestionPaperPdf } from '@/lib/pdf-print-utils';

export const AssessmentQuestionsView: React.FC = () => {
  const {
    tenant,
    courses,
    activeCourseId,
    setActiveCourseId,
    scoringSubComponents,
    assessmentWindows,
    activeWindowId,
    setActiveWindowId,
    addAssessmentWindow,
    bulkUpsertAssessmentWindows,
    updateAssessmentWindow,
    deleteAssessmentWindow,
    questionPapers,
    activeQuestionPaperId,
    setActiveQuestionPaperId,
    addQuestionPaper,
    updateQuestionPaper,
    deleteQuestionPaper,
    getOrCreateQuestionPaperForSubComponent,
    questionPaperSections,
    addQuestionPaperSection,
    updateQuestionPaperSection,
    deleteQuestionPaperSection,
    questionPaperTemplates,
    addQuestionPaperTemplate,
    updateQuestionPaperTemplate,
    deleteQuestionPaperTemplate,
    applyQuestionPaperTemplate,
    questions,
    addQuestion,
    addQuestionsBatch,
    updateQuestion,
    deleteQuestion,
    courseOutcomes,
    currentUserRole,
    courseSections,
    users,
    extendAssessmentWindowDeadline,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const [subTab, setSubTab] = useState<'designer' | 'windows' | 'templates'>(
    (['designer', 'windows', 'templates'].includes(activeSubTab) ? (activeSubTab as any) : 'designer')
  );

  React.useEffect(() => {
    if (['designer', 'windows', 'templates'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'designer' | 'windows' | 'templates') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };

  const displayedCourses = academicScope.visibleCourses;
  const activeCourse = displayedCourses.find((c) => c.id === activeCourseId) || displayedCourses[0] || null;
  const canManageCourse = academicScope.canManageCourse(activeCourse?.id);
  const canUnlockOrExtendDeadline = academicScope.canUnlockOrExtendDeadline;

  // Scoped Assessment Windows
  const visibleAssessmentWindows = assessmentWindows.filter((win) => {
    if (academicScope.isAdmin || academicScope.isHeadOfFaculty || academicScope.isHeadOfSchool || academicScope.isHod) {
      return academicScope.visibleCourses.some((c) => c.id === win.courseId);
    }
    if (academicScope.isCoordinator) {
      return academicScope.coordinatedCourses.some((c) => c.id === win.courseId);
    }
    if (academicScope.isFaculty) {
      return academicScope.mappedSections.some((s) => s.id === win.sectionId);
    }
    return true;
  });

  // Assessment Windows Matrix Bulk Schedule & Filter State
  const windowsScheduleFileRef = useRef<HTMLInputElement>(null);
  const [windowsSearchQuery, setWindowsSearchQuery] = useState('');
  const [windowsCourseFilter, setWindowsCourseFilter] = useState('ALL');
  const [windowsStatusFilter, setWindowsStatusFilter] = useState<'ALL' | 'OPEN' | 'OVERDUE' | 'LOCKED' | 'EXTENDED'>('ALL');

  // Download Schedule Matrix pre-populated with ALL Course x SubComponent x Section x Faculty combinations
  const handleDownloadScheduleMatrix = () => {
    const header = [
      'Course Code',
      'Course Title',
      'Assessment Component',
      'Section',
      'Assigned Faculty',
      'Faculty Email',
      'Start Date (YYYY-MM-DD HH:MM)',
      'Deadline (YYYY-MM-DD HH:MM)',
      'Status',
      'Course ID',
      'SubComponent ID',
      'Section ID',
      'Window ID',
    ];

    const rows: string[][] = [];
    const targetCourses = windowsCourseFilter !== 'ALL'
      ? courses.filter((c) => c.id === windowsCourseFilter)
      : displayedCourses;

    targetCourses.forEach((c) => {
      const subs = scoringSubComponents.filter((s) => !s.courseId || s.courseId === c.id);
      const secs = courseSections.filter((s) => s.courseId === c.id);

      const effectiveSubs = subs.length > 0 ? subs : [
        { id: `sub-cie1-${c.id}`, name: 'Continuous Internal Evaluation (CIE) - 1' },
        { id: `sub-cie2-${c.id}`, name: 'Continuous Internal Evaluation (CIE) - 2' },
        { id: `sub-see-${c.id}`, name: 'Semester End Examination (SEE)' },
      ];

      const effectiveSecs = secs.length > 0 ? secs : [
        { id: `sec-a-${c.id}`, name: 'Section A', facultyName: 'Assigned Faculty', facultyId: '' },
      ];

      effectiveSubs.forEach((sub) => {
        effectiveSecs.forEach((sec) => {
          const existingWin = assessmentWindows.find(
            (w) =>
              (w.courseId === c.id || !w.courseId) &&
              w.subComponentId === sub.id &&
              w.sectionId === sec.id
          );

          const faculty = users.find((u) => u.id === (existingWin?.facultyId || sec.facultyId));
          const facName = existingWin?.facultyName || faculty?.fullName || sec.facultyName || 'Dr. Ramesh Kumar';
          const facEmail = faculty?.email || '';

          const openFormatted = existingWin?.openDateTime
            ? existingWin.openDateTime.replace('T', ' ').slice(0, 16)
            : new Date().toISOString().slice(0, 10) + ' 09:00';

          const closeFormatted = existingWin?.closeDateTime
            ? existingWin.closeDateTime.replace('T', ' ').slice(0, 16)
            : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) + ' 23:59';

          const status = existingWin?.status || 'OPEN';

          rows.push([
            c.code,
            c.title,
            sub.name,
            sec.name,
            facName,
            facEmail,
            openFormatted,
            closeFormatted,
            status,
            c.id,
            sub.id,
            sec.id,
            existingWin?.id || '',
          ]);
        });
      });
    });

    const csvContent =
      '\uFEFF' +
      [
        header.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Assessment_Windows_Schedule_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMsg(`Downloaded schedule matrix with ${rows.length} combinations. Update dates and upload to schedule!`);
  };

  // Bulk Upload Assessment Windows CSV
  const handleUploadScheduleMatrix = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          showMsg('CSV file is empty or missing data rows.', 'error');
          return;
        }

        const parseLine = (line: string): string[] => {
          const cells: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === ',' && !inQuotes) {
              cells.push(cur.trim());
              cur = '';
            } else {
              cur += ch;
            }
          }
          cells.push(cur.trim());
          return cells;
        };

        const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
        const getIdx = (name: string, fallbackIdx: number) => {
          const found = headers.findIndex((h) => h.includes(name.toLowerCase()));
          return found >= 0 ? found : fallbackIdx;
        };

        const courseIdIdx = getIdx('course id', 9);
        const subCompIdIdx = getIdx('subcomponent id', 10);
        const sectionIdIdx = getIdx('section id', 11);
        const windowIdIdx = getIdx('window id', 12);
        const courseCodeIdx = getIdx('course code', 0);
        const assessmentNameIdx = getIdx('assessment component', 2);
        const sectionNameIdx = getIdx('section', 3);
        const facultyNameIdx = getIdx('faculty name', 4);
        const facultyEmailIdx = getIdx('faculty email', 5);
        const startDateIdx = getIdx('start date', 6);
        const deadlineIdx = getIdx('deadline', 7);
        const statusIdx = getIdx('status', 8);

        const itemsToUpsert: Array<Omit<AssessmentWindowRecord, 'id'> & { id?: string }> = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          if (cols.length < 5) continue;

          let courseId = cols[courseIdIdx] || '';
          let subCompId = cols[subCompIdIdx] || '';
          let sectionId = cols[sectionIdIdx] || '';
          const windowId = cols[windowIdIdx] || '';
          const subComponentName = cols[assessmentNameIdx] || 'Assessment Component';
          const facName = cols[facultyNameIdx] || '';
          const facEmail = cols[facultyEmailIdx] || '';
          const rawStart = cols[startDateIdx] || '';
          const rawDeadline = cols[deadlineIdx] || '';
          const rawStatus = (cols[statusIdx] || 'OPEN').toUpperCase();

          if (!courseId) {
            const courseCode = cols[courseCodeIdx];
            const matched = courses.find((c) => c.code.toLowerCase() === courseCode?.toLowerCase());
            if (matched) courseId = matched.id;
          }
          if (!subCompId) {
            const matched = scoringSubComponents.find((s) => s.name.toLowerCase() === subComponentName.toLowerCase());
            if (matched) subCompId = matched.id;
          }
          if (!sectionId) {
            const secName = cols[sectionNameIdx];
            const matched = courseSections.find((s) => s.name.toLowerCase() === secName?.toLowerCase() && (!courseId || s.courseId === courseId));
            if (matched) sectionId = matched.id;
          }

          if (!courseId) courseId = activeCourse?.id || courses[0]?.id || '';
          if (!subCompId) subCompId = `sub-${Date.now()}-${i}`;
          if (!sectionId) sectionId = courseSections[0]?.id || 'sec-a';

          let matchedFaculty = users.find((u) => facEmail && u.email.toLowerCase() === facEmail.toLowerCase());
          if (!matchedFaculty && facName) {
            matchedFaculty = users.find((u) => u.fullName.toLowerCase() === facName.toLowerCase());
          }

          let openDateTime = new Date().toISOString();
          if (rawStart) {
            const parsed = new Date(rawStart.replace(' ', 'T'));
            if (!isNaN(parsed.getTime())) openDateTime = parsed.toISOString();
          }

          let closeDateTime = new Date(Date.now() + 14 * 86400000).toISOString();
          if (rawDeadline) {
            const parsed = new Date(rawDeadline.replace(' ', 'T'));
            if (!isNaN(parsed.getTime())) closeDateTime = parsed.toISOString();
          }

          const validStatus: AssessmentWindowStatus = [
            'OPEN',
            'DRAFT',
            'LOCKED',
            'SUBMITTED',
            'UNLOCKED_BY_ADMIN',
            'FROZEN',
          ].includes(rawStatus as any)
            ? (rawStatus as AssessmentWindowStatus)
            : 'OPEN';

          const qp = getOrCreateQuestionPaperForSubComponent(subCompId, courseId, subComponentName);

          itemsToUpsert.push({
            id: windowId || undefined,
            courseId,
            sectionId,
            subComponentId: subCompId,
            subComponentName,
            questionPaperId: qp.id,
            status: validStatus,
            facultyId: matchedFaculty?.id || undefined,
            facultyName: matchedFaculty?.fullName || facName || 'Course Faculty',
            openDateTime,
            closeDateTime,
          });
        }

        if (itemsToUpsert.length > 0) {
          bulkUpsertAssessmentWindows(itemsToUpsert);
          showMsg(`Bulk Upload Successful! Updated and scheduled ${itemsToUpsert.length} assessment submission windows.`);
        } else {
          showMsg('No valid assessment rows could be parsed from the CSV.', 'error');
        }
      } catch (err: any) {
        showMsg(`Error parsing CSV: ${err.message || 'Invalid format'}`, 'error');
      } finally {
        if (windowsScheduleFileRef.current) windowsScheduleFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Auto-schedule missing windows with default +14 days deadline
  const handleAutoScheduleAll = () => {
    const targetCourses = displayedCourses;
    const itemsToUpsert: Array<Omit<AssessmentWindowRecord, 'id'>> = [];

    targetCourses.forEach((c) => {
      const subs = scoringSubComponents.filter((s) => !s.courseId || s.courseId === c.id);
      const secs = courseSections.filter((s) => s.courseId === c.id);

      const effectiveSubs = subs.length > 0 ? subs : [
        { id: `sub-cie1-${c.id}`, name: 'Continuous Internal Evaluation (CIE) - 1' },
        { id: `sub-cie2-${c.id}`, name: 'Continuous Internal Evaluation (CIE) - 2' },
        { id: `sub-see-${c.id}`, name: 'Semester End Examination (SEE)' },
      ];

      const effectiveSecs = secs.length > 0 ? secs : [
        { id: `sec-a-${c.id}`, name: 'Section A', facultyName: 'Assigned Faculty', facultyId: '' },
      ];

      effectiveSubs.forEach((sub) => {
        effectiveSecs.forEach((sec) => {
          const existingWin = assessmentWindows.find(
            (w) =>
              (w.courseId === c.id || !w.courseId) &&
              w.subComponentId === sub.id &&
              w.sectionId === sec.id
          );

          if (!existingWin) {
            const qp = getOrCreateQuestionPaperForSubComponent(sub.id, c.id, sub.name);
            itemsToUpsert.push({
              courseId: c.id,
              sectionId: sec.id,
              subComponentId: sub.id,
              subComponentName: sub.name,
              questionPaperId: qp.id,
              status: 'OPEN',
              facultyId: sec.facultyId || undefined,
              facultyName: sec.facultyName || 'Course Faculty',
              openDateTime: new Date().toISOString(),
              closeDateTime: new Date(Date.now() + 14 * 86400000).toISOString(),
            });
          }
        });
      });
    });

    if (itemsToUpsert.length === 0) {
      showMsg('All assessment and section combinations are already scheduled.');
      return;
    }

    bulkUpsertAssessmentWindows(itemsToUpsert);
    showMsg(`Auto-scheduled ${itemsToUpsert.length} missing assessment submission windows with +14 days deadline.`);
  };

  // Batch extend active deadlines by +7 days
  const handleBatchExtendActive = () => {
    const activeWins = visibleAssessmentWindows.filter((w) => w.status !== 'FROZEN' && w.status !== 'LOCKED');
    if (activeWins.length === 0) {
      showMsg('No active assessment windows found to extend.', 'error');
      return;
    }

    const updated = activeWins.map((w) => {
      const currentClose = new Date(w.closeDateTime).getTime();
      const base = currentClose < Date.now() ? Date.now() : currentClose;
      const newClose = new Date(base + 7 * 86400000).toISOString();
      return {
        ...w,
        closeDateTime: newClose,
        status: 'UNLOCKED_BY_ADMIN' as AssessmentWindowStatus,
        unlockAuditReason: `Batch extended by 7 days on ${new Date().toLocaleDateString()}`,
      };
    });

    bulkUpsertAssessmentWindows(updated);
    showMsg(`Extended deadlines for ${updated.length} assessment windows by +7 days.`);
  };

  // Filtered Assessment Windows with Search & Status filters
  const filteredAssessmentWindows = useMemo(() => {
    return visibleAssessmentWindows.filter((win) => {
      if (windowsCourseFilter !== 'ALL' && win.courseId && win.courseId !== windowsCourseFilter) {
        return false;
      }
      const isOverdue = new Date() > new Date(win.closeDateTime);
      if (windowsStatusFilter === 'OPEN' && (isOverdue || win.status === 'LOCKED' || win.status === 'FROZEN')) {
        return false;
      }
      if (windowsStatusFilter === 'OVERDUE' && !isOverdue) {
        return false;
      }
      if (windowsStatusFilter === 'LOCKED' && win.status !== 'LOCKED' && win.status !== 'FROZEN') {
        return false;
      }
      if (windowsStatusFilter === 'EXTENDED' && win.status !== 'UNLOCKED_BY_ADMIN') {
        return false;
      }
      if (windowsSearchQuery.trim()) {
        const q = windowsSearchQuery.toLowerCase();
        const course = courses.find((c) => c.id === win.courseId);
        const section = courseSections.find((s) => s.id === win.sectionId);
        const matchesName = win.subComponentName.toLowerCase().includes(q);
        const matchesCourse = course?.code.toLowerCase().includes(q) || course?.title.toLowerCase().includes(q);
        const matchesSec = section?.name.toLowerCase().includes(q);
        const matchesFac = win.facultyName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCourse && !matchesSec && !matchesFac) return false;
      }
      return true;
    });
  }, [visibleAssessmentWindows, windowsCourseFilter, windowsStatusFilter, windowsSearchQuery, courses, courseSections]);

  // Filter subcomponents for active course
  const currentSubComponents = scoringSubComponents.filter(
    (sub) => !sub.courseId || sub.courseId === activeCourse?.id
  );

  // Active Sub-Component for Question Paper
  const [selectedSubCompId, setSelectedSubCompId] = useState<string>(
    currentSubComponents[0]?.id || ''
  );

  // Active Question Paper (guaranteed to exist for sub-component)
  const activeQuestionPaper: QuestionPaper | null = useMemo(() => {
    if (!activeCourse) return null;
    const subComp = currentSubComponents.find((s) => s.id === selectedSubCompId) || currentSubComponents[0];
    if (!subComp) return null;
    return getOrCreateQuestionPaperForSubComponent(subComp.id, activeCourse.id, subComp.name);
  }, [activeCourse, selectedSubCompId, currentSubComponents, questionPapers, getOrCreateQuestionPaperForSubComponent]);

  // Sections of the active Question Paper
  const currentPaperSections = useMemo(() => {
    return questionPaperSections
      .filter((s) => s.questionPaperId === activeQuestionPaper?.id)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [questionPaperSections, activeQuestionPaper?.id]);

  // Questions of the active Question Paper
  const currentPaperQuestions = useMemo(() => {
    return questions
      .filter((q) => q.questionPaperId === activeQuestionPaper?.id)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [questions, activeQuestionPaper?.id]);

  // Filter COs for active course
  const currentCourseOutcomes = courseOutcomes.filter(
    (co) => co.courseId === activeCourse?.id
  );

  // Inline Section Creation state (no modal popup needed)
  const [showInlineAddSection, setShowInlineAddSection] = useState(false);
  const [secName, setSecName] = useState('Section A');
  const [secChoiceRule, setSecChoiceRule] = useState<'ALL' | 'ANY_N'>('ALL');
  const [secQuestionsToAnswer, setSecQuestionsToAnswer] = useState(5);
  const [secTotalQuestions, setSecTotalQuestions] = useState(5);
  const [secInstructions, setSecInstructions] = useState('Answer ALL questions in this section.');

  // Inline Question Creation state (inside specific section card)
  const [inlineSectionId, setInlineSectionId] = useState<string | null>(null);
  const [qNumber, setQNumber] = useState('Q1');
  const [qIsPart, setQIsPart] = useState(false);
  const [qPartLabel, setQPartLabel] = useState('a');
  const [qIsOption, setQIsOption] = useState(false);
  const [qOptionGroup, setQOptionGroup] = useState('OPT_1');
  const [qOptionLabel, setQOptionLabel] = useState('Option A');
  const [qContent, setQContent] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qImageCaption, setQImageCaption] = useState('');
  const [qMaxMarks, setQMaxMarks] = useState(5);
  const [qCoId, setQCoId] = useState('');
  const [qBlooms, setQBlooms] = useState<BloomsTaxonomyLevel>('APPLY');

  // Question editing modal state
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [editQNumber, setEditQNumber] = useState('');
  const [editQContent, setEditQContent] = useState('');
  const [editQImageUrl, setEditQImageUrl] = useState('');
  const [editQImageCaption, setEditQImageCaption] = useState('');
  const [editQMaxMarks, setEditQMaxMarks] = useState(5);
  const [editQCoId, setEditQCoId] = useState('');
  const [editQBlooms, setEditQBlooms] = useState<BloomsTaxonomyLevel>('APPLY');
  const [editQIsPart, setEditQIsPart] = useState(false);
  const [editQPartLabel, setEditQPartLabel] = useState('');
  const [editQIsOption, setEditQIsOption] = useState(false);
  const [editQOptionGroup, setEditQOptionGroup] = useState('');
  const [editQOptionLabel, setEditQOptionLabel] = useState('');

  // View Layout: 'cards' (visual parts & options hierarchy with LaTeX) or 'table' (rapid dropdown)
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [showExamPaperPreview, setShowExamPaperPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Customizable Print / PDF Options
  const [printOptions, setPrintOptions] = useState({
    showSignatures: true,
    showCoBlooms: true,
    showInstructions: true,
    showInstituteHeader: true,
    showMarks: true,
  });

  const handleMoveQuestion = (qId: string, direction: 'up' | 'down', list: QuestionItem[]) => {
    const index = list.findIndex((q) => q.id === qId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const currentQ = list[index];
    const targetQ = list[targetIndex];

    const currentOrder = currentQ.displayOrder ?? index + 1;
    const targetOrder = targetQ.displayOrder ?? targetIndex + 1;

    let newCurrentOrder = targetOrder;
    let newTargetOrder = currentOrder;
    if (currentOrder === targetOrder) {
      newCurrentOrder = direction === 'up' ? targetOrder - 1 : targetOrder + 1;
      newTargetOrder = targetOrder;
    }

    updateQuestion(currentQ.id, { displayOrder: newCurrentOrder });
    updateQuestion(targetQ.id, { displayOrder: newTargetOrder });
    showMsg(`Moved question ${currentQ.questionNumber} ${direction}.`);
  };

  // Modals kept only when truly appropriate
  const [modalType, setModalType] = useState<
    | 'addWindow'
    | 'editWindow'
    | 'unlock'
    | 'applyTemplate'
    | 'saveAsTemplate'
    | null
  >(null);
  const [editingWindowId, setEditingWindowId] = useState<string | null>(null);

  // Window form states
  const [windowCourseId, setWindowCourseId] = useState(activeCourse?.id || '');
  const [windowSubCompId, setWindowSubCompId] = useState(currentSubComponents[0]?.id || '');
  const [windowSectionId, setWindowSectionId] = useState(courseSections[0]?.id || '');
  const [windowFacultyId, setWindowFacultyId] = useState('');
  const [openDate, setOpenDate] = useState(new Date().toISOString().slice(0, 16));
  const [closeDate, setCloseDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16)
  );
  const [unlockReason, setUnlockReason] = useState('');
  const [extendReason, setExtendReason] = useState('');

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    questionPaperTemplates[0]?.id || ''
  );
  const [newTemplateName, setNewTemplateName] = useState('');

  // Bulk Upload Modal
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const openEditQuestionModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setEditQNumber(q.questionNumber);
    setEditQContent(q.content || '');
    setEditQImageUrl(q.imageUrl || '');
    setEditQImageCaption(q.imageCaption || '');
    setEditQMaxMarks(q.maxMarks);
    setEditQCoId(q.courseOutcomeId);
    setEditQBlooms(q.bloomsLevel);
    setEditQIsPart(Boolean(q.partLabel));
    setEditQPartLabel(q.partLabel || '');
    setEditQIsOption(Boolean(q.isOption));
    setEditQOptionGroup(q.optionGroup || '');
    setEditQOptionLabel(q.optionLabel || '');
  };

  const handleSaveEditedQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    updateQuestion(editingQuestion.id, {
      questionNumber: sanitizeInput(editQNumber).trim(),
      content: editQContent.trim() ? sanitizeInput(editQContent).trim() : undefined,
      imageUrl: editQImageUrl.trim() ? editQImageUrl.trim() : undefined,
      imageCaption: editQImageCaption.trim() ? sanitizeInput(editQImageCaption).trim() : undefined,
      maxMarks: Number(editQMaxMarks) || 5,
      courseOutcomeId: editQCoId,
      bloomsLevel: editQBlooms,
      partLabel: editQIsPart ? sanitizeInput(editQPartLabel).trim() : undefined,
      isOption: editQIsOption,
      optionGroup: editQIsOption ? sanitizeInput(editQOptionGroup).trim() : undefined,
      optionLabel: editQIsOption ? sanitizeInput(editQOptionLabel).trim() : undefined,
    });

    showMsg(`Updated question ${editQNumber}.`);
    setEditingQuestion(null);
  };

  const handlePrintPaper = () => {
    if (!activeQuestionPaper) {
      showMsg('Please select a question paper to print.', 'error');
      return;
    }
    const marksTotal = activeQuestionPaper.totalMarks || currentPaperQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
    generateQuestionPaperPdf({
      tenantName: tenant?.name,
      courseCode: activeCourse?.code || 'COURSE',
      courseTitle: activeCourse?.title || 'Course Title',
      paperTitle: activeQuestionPaper.title,
      academicYear: '2026-2027',
      totalMarks: marksTotal,
      duration: '3 Hours',
      sections: currentPaperSections,
      questions: currentPaperQuestions,
      courseOutcomes: currentCourseOutcomes,
      printOptions,
      action: 'print',
    });
  };

  const handleDownloadPaperPdf = async () => {
    if (!activeQuestionPaper) {
      showMsg('Please select a question paper to download.', 'error');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const marksTotal = activeQuestionPaper.totalMarks || currentPaperQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
      generateQuestionPaperPdf({
        tenantName: tenant?.name,
        courseCode: activeCourse?.code || 'COURSE',
        courseTitle: activeCourse?.title || 'Course Title',
        paperTitle: activeQuestionPaper.title,
        academicYear: '2026-2027',
        totalMarks: marksTotal,
        duration: '3 Hours',
        sections: currentPaperSections,
        questions: currentPaperQuestions,
        courseOutcomes: currentCourseOutcomes,
        printOptions,
        action: 'download',
      });
      showMsg('Official examination question paper vector PDF generated and downloaded successfully.');
    } catch (err) {
      console.error(err);
      showMsg('Failed to generate PDF. Check browser console.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Total Marks calculated from questions
  const totalAllocatedMarks = useMemo(() => {
    return currentPaperQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
  }, [currentPaperQuestions]);

  // Handle Quick Inline Add Section
  const handleSaveInlineSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper) return;
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can add sections.', 'error');
      return;
    }

    addQuestionPaperSection({
      questionPaperId: activeQuestionPaper.id,
      sectionName: sanitizeInput(secName),
      choiceRule: secChoiceRule,
      questionsToAnswer: secChoiceRule === 'ANY_N' ? Number(secQuestionsToAnswer) : Number(secTotalQuestions),
      totalQuestions: Number(secTotalQuestions),
      instructions: sanitizeInput(secInstructions),
      displayOrder: currentPaperSections.length + 1,
    });

    showMsg(`Section "${secName}" added.`);
    setShowInlineAddSection(false);
    const nextChar = String.fromCharCode(65 + currentPaperSections.length + 1);
    setSecName(`Section ${nextChar}`);
    setSecInstructions(`Answer ALL questions in Section ${nextChar}.`);
  };

  // Open inline question form inside a specific section
  const openInlineAddQuestion = (secId: string) => {
    if (!canManageCourse) return;
    setInlineSectionId(secId);
    const count = currentPaperQuestions.filter((q) => q.sectionId === secId).length;
    setQNumber(`Q${count + 1}`);
    setQIsPart(false);
    setQPartLabel('a');
    setQIsOption(false);
    setQOptionGroup(`OPT_${count + 1}`);
    setQOptionLabel('Option A');
    setQContent('');
    setQImageUrl('');
    setQImageCaption('');
    setQMaxMarks(5);
    setQCoId(currentCourseOutcomes[0]?.id || '');
    setQBlooms('APPLY');
  };

  // Handle Quick Inline Add Question
  const handleSaveInlineQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper || !inlineSectionId) return;
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can add questions.', 'error');
      return;
    }

    let finalQNumber = sanitizeInput(qNumber).trim();
    if (qIsPart && qPartLabel.trim()) {
      finalQNumber = `${finalQNumber}(${sanitizeInput(qPartLabel).trim()})`;
    }
    if (qIsOption && qOptionLabel.trim()) {
      finalQNumber = `${finalQNumber} [${sanitizeInput(qOptionLabel).trim()}]`;
    }

    addQuestion({
      questionPaperId: activeQuestionPaper.id,
      sectionId: inlineSectionId,
      questionNumber: finalQNumber,
      partLabel: qIsPart ? sanitizeInput(qPartLabel).trim() : undefined,
      isOption: qIsOption,
      optionGroup: qIsOption ? sanitizeInput(qOptionGroup).trim() : undefined,
      optionLabel: qIsOption ? sanitizeInput(qOptionLabel).trim() : undefined,
      content: qContent.trim() ? sanitizeInput(qContent).trim() : undefined,
      imageUrl: qImageUrl.trim() ? qImageUrl.trim() : undefined,
      imageCaption: qImageCaption.trim() ? sanitizeInput(qImageCaption).trim() : undefined,
      maxMarks: Number(qMaxMarks) || 5,
      courseOutcomeId: qCoId || currentCourseOutcomes[0]?.id || '',
      bloomsLevel: qBlooms,
      targetThresholdPct: 60,
      displayOrder: currentPaperQuestions.length + 1,
    });

    showMsg(`Question ${finalQNumber} added.`);
    // Auto increment Q number for fast next entry
    const match = qNumber.match(/\d+/);
    const nextNum = match ? parseInt(match[0], 10) + 1 : currentPaperQuestions.length + 2;
    setQNumber(`Q${nextNum}`);
    setQContent('');
    setQImageUrl('');
    setQImageCaption('');
  };

  // Handle Save Current Blueprint as Template (Preserving and Restoring Question-Wise COs)
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper) return;
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can save templates.', 'error');
      return;
    }

    const tplName = newTemplateName.trim() || `${activeQuestionPaper.title} Template`;
    const newTpl: QuestionPaperTemplate = {
      id: `tpl-${Date.now()}`,
      name: tplName,
      description: `Saved from ${activeCourse?.code} - ${activeQuestionPaper.title} (${currentPaperSections.length} sections, ${activeQuestionPaper.totalMarks}M). Preserves question-wise CO mappings.`,
      totalMarks: activeQuestionPaper.totalMarks,
      sections: currentPaperSections.map((sec) => {
        const secQuestions = currentPaperQuestions.filter((q) => q.sectionId === sec.id);
        const avgMarks = secQuestions.length > 0 ? secQuestions[0].maxMarks : 5;
        return {
          id: `sec-${Date.now()}-${sec.id}`,
          sectionName: sec.sectionName,
          instructions: sec.instructions,
          choiceRule: sec.choiceRule,
          questionsToAnswer: sec.questionsToAnswer || secQuestions.length,
          totalQuestions: secQuestions.length || sec.totalQuestions || 5,
          marksPerQuestion: avgMarks,
          hasOptions: secQuestions.some((q) => q.isOption),
          hasParts: secQuestions.some((q) => q.partLabel),
          defaultBlooms: secQuestions[0]?.bloomsLevel || 'APPLY',
          questions: secQuestions.map((q, idx) => {
            const co = currentCourseOutcomes.find((c) => c.id === q.courseOutcomeId);
            return {
              questionNumber: q.questionNumber,
              partLabel: q.partLabel,
              isOption: q.isOption,
              optionGroup: q.optionGroup,
              optionLabel: q.optionLabel,
              content: q.content,
              maxMarks: q.maxMarks,
              coCode: co?.code || 'CO1', // Restores Question-Wise CO!
              bloomsLevel: q.bloomsLevel,
              displayOrder: q.displayOrder || idx + 1,
            };
          }),
        };
      }),
    };

    addQuestionPaperTemplate(newTpl);
    showMsg(`Question paper layout and Question-Wise COs saved as Template "${tplName}"!`);
    setModalType(null);
  };

  // Handle Apply Template
  const handleApplyTemplate = () => {
    if (!activeQuestionPaper || !selectedTemplateId) return;
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can apply templates.', 'error');
      return;
    }
    applyQuestionPaperTemplate(
      selectedTemplateId,
      activeQuestionPaper.id,
      currentCourseOutcomes[0]?.id
    );
    showMsg('Template applied successfully with sections and questions populated.');
    setModalType(null);
  };

  // Handle Save Assessment Window
  const handleSaveWindow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUnlockOrExtendDeadline && !canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators, HODs, or Admins can configure assessment windows.', 'error');
      return;
    }
    const course = courses.find((c) => c.id === windowCourseId) || activeCourse;
    const subComp = scoringSubComponents.find((s) => s.id === windowSubCompId);
    if (!course || !subComp) {
      showMsg('Please select a valid Course and Sub-Component.', 'error');
      return;
    }

    const qp = getOrCreateQuestionPaperForSubComponent(subComp.id, course.id, subComp.name);
    const assignedFac = users.find((u) => u.id === windowFacultyId);
    const section = courseSections.find((s) => s.id === windowSectionId);
    const assignedFacName = assignedFac?.fullName || section?.facultyName || 'Assigned Faculty';

    if (modalType === 'addWindow') {
      addAssessmentWindow({
        courseId: course.id,
        sectionId: windowSectionId || courseSections[0]?.id || '',
        subComponentId: subComp.id,
        subComponentName: subComp.name,
        questionPaperId: qp.id,
        status: 'OPEN',
        facultyId: windowFacultyId || section?.facultyId || undefined,
        facultyName: assignedFacName,
        openDateTime: openDate,
        closeDateTime: closeDate,
      });
      showMsg(`Assessment window created. Mapped to ${assignedFacName} for mark entry.`);
    } else if (modalType === 'editWindow' && editingWindowId) {
      const existing = assessmentWindows.find((w) => w.id === editingWindowId);
      if (existing) {
        extendAssessmentWindowDeadline(
          editingWindowId,
          closeDate,
          windowFacultyId || existing.facultyId,
          extendReason.trim() || `Deadline extended by Admin to ${new Date(closeDate).toLocaleString()}`
        );
        updateAssessmentWindow({
          ...existing,
          courseId: course.id,
          sectionId: windowSectionId,
          subComponentId: subComp.id,
          subComponentName: subComp.name,
          facultyId: windowFacultyId || existing.facultyId,
          facultyName: assignedFacName,
          openDateTime: openDate,
          closeDateTime: closeDate,
          status: 'UNLOCKED_BY_ADMIN',
          unlockAuditReason: extendReason.trim() || 'Deadline extended and window unlocked by Admin',
        });
        showMsg(`Deadline extended and faculty assignment updated for ${assignedFacName}.`);
      }
    }
    setModalType(null);
  };

  // Bulk Upload Columns Definition
  const bulkUploadColumns: BulkUploadColumn[] = [
    { key: 'questionNumber', label: 'Q. Number', required: true, description: 'e.g. Q1, Q2.a' },
    { key: 'sectionName', label: 'Section', required: true, description: 'e.g. Section A' },
    { key: 'maxMarks', label: 'Marks', required: true, type: 'number', description: 'e.g. 5, 10' },
    { key: 'coCode', label: 'Course Outcome Code', required: true, description: 'e.g. CO1, CO2' },
    { key: 'bloomsLevel', label: 'Blooms Taxonomy', required: true, description: 'REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE' },
    { key: 'content', label: 'Question Content (Optional)', description: 'Problem statement text' },
  ];

  const bulkUploadSamples = [
    {
      questionNumber: 'Q1',
      sectionName: 'Section A',
      maxMarks: 2,
      coCode: 'CO1',
      bloomsLevel: 'REMEMBER',
      content: 'Define the asymptotic notations Big-O and Omega.',
    },
    {
      questionNumber: 'Q2',
      sectionName: 'Section A',
      maxMarks: 2,
      coCode: 'CO1',
      bloomsLevel: 'UNDERSTAND',
      content: 'Distinguish between BFS and DFS traversal algorithms.',
    },
    {
      questionNumber: 'Q3',
      sectionName: 'Section B',
      maxMarks: 10,
      coCode: 'CO2',
      bloomsLevel: 'APPLY',
      content: 'Implement Dijkstra shortest path algorithm with dry run.',
    },
  ];

  const handleBulkImportQuestions = (rows: Record<string, any>[]) => {
    if (!activeQuestionPaper) return;

    let targetSec = currentPaperSections[0];
    if (!targetSec) {
      const newSecId = `sec-${Date.now()}`;
      addQuestionPaperSection({
        questionPaperId: activeQuestionPaper.id,
        sectionName: 'Section A',
        choiceRule: 'ALL',
        totalQuestions: rows.length,
        questionsToAnswer: rows.length,
        displayOrder: 1,
      });
      targetSec = {
        id: newSecId,
        questionPaperId: activeQuestionPaper.id,
        sectionName: 'Section A',
        choiceRule: 'ALL',
        displayOrder: 1,
      };
    }

    const newQuestions = rows.map((r, idx) => {
      const coMatch = currentCourseOutcomes.find(
        (c) => c.code.toLowerCase() === String(r.coCode).toLowerCase()
      );
      const bloom = (String(r.bloomsLevel).toUpperCase() in
      { REMEMBER: 1, UNDERSTAND: 1, APPLY: 1, ANALYZE: 1, EVALUATE: 1, CREATE: 1 }
        ? String(r.bloomsLevel).toUpperCase()
        : 'APPLY') as BloomsTaxonomyLevel;

      return {
        questionPaperId: activeQuestionPaper.id,
        sectionId: targetSec.id,
        questionNumber: String(r.questionNumber || `Q${currentPaperQuestions.length + idx + 1}`),
        content: r.content ? String(r.content).trim() : undefined,
        maxMarks: Number(r.maxMarks) || 5,
        courseOutcomeId: coMatch?.id || currentCourseOutcomes[0]?.id || '',
        bloomsLevel: bloom,
        targetThresholdPct: 60,
        displayOrder: currentPaperQuestions.length + idx + 1,
      };
    });

    addQuestionsBatch(newQuestions);
    showMsg(`Successfully imported ${newQuestions.length} questions into active paper!`);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner - Space Optimized */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Question Blueprints &amp; Assessment Windows</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Assessment &amp; Question Papers
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Zero-popup blueprint design with section choice rules, template saving with restored question-wise COs, and admin deadline control.
            </p>
          </div>

          {/* Sub-menu Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto flex-wrap gap-1 shrink-0">
            <button
              onClick={() => switchSubTab('designer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                subTab === 'designer'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Blueprint Designer</span>
            </button>
            <button
              onClick={() => switchSubTab('windows')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                subTab === 'windows'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Windows &amp; Deadlines ({visibleAssessmentWindows.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('templates')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                subTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Templates ({questionPaperTemplates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-800 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* SUB-TAB 1: QUESTION PAPER DESIGNER */}
      {subTab === 'designer' && (
        <div className="space-y-6">
          {/* Top Control Bar: Course, Sub-Component & Actions (Space-Optimized) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Course Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Course:
                </span>
                <span className="text-white font-bold font-mono">
                  {activeCourse?.code}
                </span>
                <span className="text-slate-400 truncate max-w-[150px]">
                  {activeCourse?.title}
                </span>
              </div>

              {/* Sub-Component Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Connected Sub-Component
                </label>
                <select
                  value={selectedSubCompId}
                  onChange={(e) => setSelectedSubCompId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-indigo-300 font-bold text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none cursor-pointer min-w-[220px]"
                >
                  {currentSubComponents.length === 0 ? (
                    <option value="">No Sub-Components for Course</option>
                  ) : (
                    currentSubComponents.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.type} &bull; {sub.maxMarks}M)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Quick Actions: Preview & Print Paper, Save Template, Apply Template, Bulk Upload */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowExamPaperPreview(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold border border-indigo-500 transition-colors shadow-sm"
                title="Preview Official University Examination Paper (with customizable print & PDF download)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview &amp; Print Paper</span>
              </button>

              {canManageCourse ? (
                <>
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                    title="Bulk Upload Questions via CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                    <span>Bulk Upload</span>
                  </button>

                  <button
                    onClick={() => setModalType('applyTemplate')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Apply Template</span>
                  </button>

                  <button
                    onClick={() => {
                      showMsg('✓ Question paper blueprint and question-wise CO allocations safely saved to institution database!');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                    title="Explicitly save blueprint and question allocations to database"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Blueprint</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewTemplateName(`${activeQuestionPaper?.title || 'Course'} Blueprint Template`);
                      setModalType('saveAsTemplate');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    title="Save current sections and questions as a reusable blueprint template"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Save as Template</span>
                  </button>

                  <button
                    onClick={() => setShowInlineAddSection(!showInlineAddSection)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showInlineAddSection ? 'Cancel Section' : '+ New Section'}</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-amber-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Blueprint Governed by Course Coordinator</span>
                </div>
              )}
            </div>
          </div>

          {/* Paper Summary Pill Bar & View Layout Toggle */}
          {activeQuestionPaper && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm">
                  {activeQuestionPaper.title}
                </span>
                <span className="bg-indigo-950 border border-indigo-800 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  Target: {activeQuestionPaper.totalMarks} Marks
                </span>
                <span className="text-slate-400 text-xs">
                  Allocated:{' '}
                  <strong className={totalAllocatedMarks === activeQuestionPaper.totalMarks ? 'text-emerald-400' : 'text-amber-400'}>
                    {totalAllocatedMarks} Marks
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-400 text-[11px] hidden sm:flex">
                  <span>{currentPaperSections.length} Sections</span>
                  <span>&bull;</span>
                  <span>{currentPaperQuestions.length} Questions</span>
                </div>

                {/* View Layout Toggle: Visual Cards vs Rapid Table */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setViewLayout('cards')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs ${
                      viewLayout === 'cards'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Visual view: Visually see Parts questions and Optional Choice dividers"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Visual Cards</span>
                  </button>
                  <button
                    onClick={() => setViewLayout('table')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs ${
                      viewLayout === 'table'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Table view: Rapid inline CO and Bloom's selection"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Quick Table</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INLINE ADD SECTION CARD (No Popup Modal!) */}
          {showInlineAddSection && (
            <div className="bg-slate-900 border border-indigo-600/60 rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white text-sm">Create New Section (Inline)</span>
                </div>
                <button
                  onClick={() => setShowInlineAddSection(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveInlineSection} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Section Name *</label>
                  <input
                    type="text"
                    required
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    placeholder="e.g. Section B"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Choice Rule *</label>
                  <select
                    value={secChoiceRule}
                    onChange={(e) => setSecChoiceRule(e.target.value as 'ALL' | 'ANY_N')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">Answer ALL Questions</option>
                    <option value="ANY_N">Answer ANY N Questions (Choice)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    {secChoiceRule === 'ALL' ? 'Total Questions' : 'Answer N of Total'}
                  </label>
                  <div className="flex items-center gap-2">
                    {secChoiceRule === 'ANY_N' && (
                      <>
                        <input
                          type="number"
                          min="1"
                          max={secTotalQuestions}
                          value={secQuestionsToAnswer}
                          onChange={(e) => setSecQuestionsToAnswer(Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-white text-center font-bold"
                          title="Questions to answer"
                        />
                        <span className="text-slate-500 font-bold">of</span>
                      </>
                    )}
                    <input
                      type="number"
                      min="1"
                      value={secTotalQuestions}
                      onChange={(e) => setSecTotalQuestions(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-white text-center font-bold"
                      title="Total questions available"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm transition-colors"
                  >
                    Save Section
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sections List */}
          {currentPaperSections.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <FileQuestion className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Sections Configured in Blueprint</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click "+ New Section" above to add Section A, or click "Apply Template" to instantly import a pre-structured 2026 Batch blueprint.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentPaperSections.map((sec) => {
                const sectionQuestions = currentPaperQuestions.filter((q) => q.sectionId === sec.id);
                const sectionAllocatedMarks = sectionQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
                const isInlineAddOpen = inlineSectionId === sec.id;

                return (
                  <div
                    key={sec.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                  >
                    {/* Section Header */}
                    <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{sec.sectionName}</span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              sec.choiceRule === 'ALL'
                                ? 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                                : 'bg-amber-950 border border-amber-800 text-amber-300'
                            }`}
                          >
                            {sec.choiceRule === 'ALL'
                              ? 'Answer ALL Questions'
                              : `Answer ANY ${sec.questionsToAnswer} of ${sec.totalQuestions} Questions`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({sectionQuestions.length} Qs &bull; {sectionAllocatedMarks}M)
                          </span>
                        </div>
                        {sec.instructions && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">{sec.instructions}</p>
                        )}
                      </div>

                      {canManageCourse && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isInlineAddOpen) {
                                setInlineSectionId(null);
                              } else {
                                openInlineAddQuestion(sec.id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isInlineAddOpen ? 'Close Form' : '+ Add Question'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Delete ${sec.sectionName} and its ${sectionQuestions.length} questions?`)) {
                                deleteQuestionPaperSection(sec.id);
                                showMsg(`Deleted ${sec.sectionName}.`);
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

                    {/* INLINE ADD QUESTION FORM (No popup modal!) */}
                    {isInlineAddOpen && (
                      <div className="bg-slate-950/90 border-b border-indigo-900/50 p-5 space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Quick Add Question to {sec.sectionName}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Question text is optional &bull; Bloom&apos;s & CO can be changed anytime via dropdowns
                          </span>
                        </div>

                        <form onSubmit={handleSaveInlineQuestion} className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                            <div className="sm:col-span-1">
                              <label className="font-semibold text-slate-300 block mb-1">Q. No *</label>
                              <input
                                type="text"
                                required
                                value={qNumber}
                                onChange={(e) => setQNumber(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold"
                              />
                            </div>

                            <div className="sm:col-span-1">
                              <label className="font-semibold text-slate-300 block mb-1">Marks *</label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={qMaxMarks}
                                onChange={(e) => setQMaxMarks(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-center text-teal-300"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="font-semibold text-slate-300 block mb-1">Course Outcome (CO) *</label>
                              <select
                                value={qCoId}
                                onChange={(e) => setQCoId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-indigo-300 font-mono font-bold"
                              >
                                {currentCourseOutcomes.map((co) => (
                                  <option key={co.id} value={co.id}>
                                    {co.code} - {co.statement?.slice(0, 30)}...
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="font-semibold text-slate-300 block mb-1">Bloom&apos;s Taxonomy *</label>
                              <select
                                value={qBlooms}
                                onChange={(e) => setQBlooms(e.target.value as BloomsTaxonomyLevel)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-semibold"
                              >
                                <option value="REMEMBER">L1 - Remember</option>
                                <option value="UNDERSTAND">L2 - Understand</option>
                                <option value="APPLY">L3 - Apply</option>
                                <option value="ANALYZE">L4 - Analyze</option>
                                <option value="EVALUATE">L5 - Evaluate</option>
                                <option value="CREATE">L6 - Create</option>
                              </select>
                            </div>
                          </div>

                          {/* Quick Toggles: Part Question & Option Question */}
                          <div className="flex flex-wrap items-center gap-4 pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={qIsPart}
                                onChange={(e) => setQIsPart(e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                              />
                              <span>Has Sub-Part (e.g. Q1.a)</span>
                            </label>
                            {qIsPart && (
                              <input
                                type="text"
                                value={qPartLabel}
                                onChange={(e) => setQPartLabel(e.target.value)}
                                placeholder="Part label: a, b"
                                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                              />
                            )}

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={qIsOption}
                                onChange={(e) => setQIsOption(e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                              />
                              <span>Has Option / OR Choice (Option A or B)</span>
                            </label>
                            {qIsOption && (
                              <input
                                type="text"
                                value={qOptionLabel}
                                onChange={(e) => setQOptionLabel(e.target.value)}
                                placeholder="Option A / Option B"
                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                              />
                            )}
                          </div>

                          {/* Rich Question Text, LaTeX Formula Toolbar & Diagram Upload */}
                          <div>
                            <label className="text-slate-300 font-semibold text-xs block mb-1.5">
                              Question Statement, LaTeX Equations & Diagrams:
                            </label>
                            <RichQuestionEditor
                              value={qContent}
                              onChange={setQContent}
                              imageUrl={qImageUrl}
                              onImageUrlChange={setQImageUrl}
                              imageCaption={qImageCaption}
                              onImageCaptionChange={setQImageCaption}
                              placeholder="Type question statement. Use $formula$ for inline math, $$formula$$ for display math, or use the equation toolbar above..."
                              minHeight="120px"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setInlineSectionId(null)}
                              className="px-3 py-1.5 text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm"
                            >
                              Add to {sec.sectionName}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Questions Display (Visual Cards OR Rapid Table) */}
                    {sectionQuestions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No questions in this section yet. Click "+ Add Question" above to insert.
                      </div>
                    ) : viewLayout === 'cards' ? (
                      /* VISUAL CARDS VIEW: Sub-Parts & Optional Choice Dividers */
                      <div className="p-4 space-y-3">
                        {sectionQuestions.map((q, qIdx) => {
                          const prevQ = qIdx > 0 ? sectionQuestions[qIdx - 1] : null;
                          const isSecondOptionInChoice =
                            q.isOption &&
                            prevQ &&
                            prevQ.isOption &&
                            (prevQ.optionGroup === q.optionGroup ||
                              q.optionLabel?.toLowerCase().includes('b') ||
                              prevQ.optionLabel?.toLowerCase().includes('a'));

                          const isSubPart = Boolean(
                            q.partLabel ||
                              (q.questionNumber.includes('(') && q.questionNumber.includes(')'))
                          );
                          const matchedCo = currentCourseOutcomes.find((c) => c.id === q.courseOutcomeId);

                          return (
                            <React.Fragment key={q.id}>
                              {/* Prominent Visual '— OR —' Choice Divider for Optional Questions */}
                              {isSecondOptionInChoice && (
                                <div className="flex items-center my-3 px-2">
                                  <div className="flex-1 border-t-2 border-dashed border-amber-500/40" />
                                  <div className="mx-3 px-4 py-1 rounded-full bg-amber-950/90 border border-amber-600 text-amber-300 font-extrabold text-[11px] tracking-widest shadow-lg flex items-center gap-1.5">
                                    <Split className="w-3.5 h-3.5 text-amber-400" />
                                    <span>— OR — (ALTERNATIVE QUESTION CHOICE)</span>
                                  </div>
                                  <div className="flex-1 border-t-2 border-dashed border-amber-500/40" />
                                </div>
                              )}

                              {/* Question Item Card */}
                              <div
                                className={`rounded-2xl border transition-all ${
                                  isSubPart
                                    ? 'ml-4 sm:ml-8 bg-slate-950/70 border-indigo-900/50 hover:border-indigo-700/60'
                                    : q.isOption
                                    ? 'bg-slate-900/80 border-amber-900/50 hover:border-amber-700/60'
                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                } p-4 space-y-3 shadow-md`}
                              >
                                {/* Header / Tagging Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                      {q.questionNumber}
                                    </span>

                                    {isSubPart && (
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300">
                                        Sub-Part ({q.partLabel || q.questionNumber.split('(')[1]?.replace(')', '') || 'Part'})
                                      </span>
                                    )}

                                    {q.isOption && (
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 flex items-center gap-1">
                                        <Split className="w-3 h-3 text-amber-400" />
                                        <span>{q.optionLabel || 'Choice Option'}</span>
                                        {q.optionGroup && <span className="opacity-70 font-mono">({q.optionGroup})</span>}
                                      </span>
                                    )}

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-mono">
                                      {q.maxMarks} Marks
                                    </span>

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
                                      {matchedCo?.code || 'Course Outcome'}
                                    </span>

                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                      {q.bloomsLevel}
                                    </span>
                                  </div>

                                  {canManageCourse && (
                                    <div className="flex items-center gap-1.5">
                                      {/* Question Reorder Controls */}
                                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveQuestion(q.id, 'up', sectionQuestions)}
                                          disabled={qIdx === 0}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                          title="Move Question Up"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveQuestion(q.id, 'down', sectionQuestions)}
                                          disabled={qIdx === sectionQuestions.length - 1}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                          title="Move Question Down"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => openEditQuestionModal(q)}
                                        className="px-2 py-1 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
                                        title="Edit Question Statement, LaTeX Formulas & Diagrams"
                                      >
                                        <Edit2 className="w-3 h-3 text-indigo-400" />
                                        <span>Edit / Math</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`Delete ${q.questionNumber}?`)) {
                                            deleteQuestion(q.id);
                                            showMsg(`Deleted ${q.questionNumber}.`);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                        title="Delete Question"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Rendered Question Statement with KaTeX & Diagrams */}
                                <div className="text-xs text-slate-200 leading-relaxed pl-0.5">
                                  {q.content || q.imageUrl ? (
                                    <LatexRenderer
                                      content={q.content || ''}
                                      imageUrl={q.imageUrl}
                                      imageCaption={q.imageCaption}
                                      className="space-y-2"
                                    />
                                  ) : (
                                    <span className="text-slate-500 italic text-xs">
                                      (Blueprint placeholder: No statement text. Mapped directly for marks &amp; CO calculation.)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      /* RAPID TABLE VIEW: Bulk CO & Bloom Dropdowns */
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              <th className="px-4 py-2.5 w-24">Q. No</th>
                              <th className="px-4 py-2.5">Question Text / Statement (Optional)</th>
                              <th className="px-4 py-2.5 w-24 text-center">Marks</th>
                              <th className="px-4 py-2.5 w-28 text-center">{canManageCourse ? 'CO (Dropdown)' : 'CO'}</th>
                              <th className="px-4 py-2.5 w-36 text-center">{canManageCourse ? "Bloom's (Dropdown)" : "Bloom's"}</th>
                              {canManageCourse && <th className="px-4 py-2.5 w-24 text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {sectionQuestions.map((q, qIdx) => {
                              const matchedCo = currentCourseOutcomes.find((c) => c.id === q.courseOutcomeId);
                              return (
                                <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                                  {/* Q Number */}
                                  <td className="px-4 py-2.5 font-mono font-bold text-white whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span>{q.questionNumber}</span>
                                      {q.isOption && (
                                        <span className="text-[9px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-1 py-0.5 rounded font-sans">
                                          {q.optionLabel || 'Choice'}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Content (Optional) */}
                                  <td className="px-4 py-2.5 leading-relaxed">
                                    {q.content ? (
                                      <div className="text-slate-200 line-clamp-2">{q.content}</div>
                                    ) : (
                                      <span className="text-slate-600 italic text-[11px]">
                                        (Text optional &bull; Blueprint placeholder)
                                      </span>
                                    )}
                                  </td>

                                  {/* Marks */}
                                  <td className="px-4 py-2.5 text-center">
                                    {canManageCourse ? (
                                      <input
                                        type="number"
                                        min="1"
                                        value={q.maxMarks}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          updateQuestion(q.id, { maxMarks: val });
                                        }}
                                        className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-teal-300 focus:border-teal-500 focus:outline-none"
                                      />
                                    ) : (
                                      <span className="font-mono font-bold text-teal-300">{q.maxMarks}M</span>
                                    )}
                                  </td>

                                  {/* Course Outcome */}
                                  <td className="px-4 py-2.5 text-center">
                                    {canManageCourse ? (
                                      <select
                                        value={q.courseOutcomeId}
                                        onChange={(e) => {
                                          updateQuestion(q.id, { courseOutcomeId: e.target.value });
                                          const matched = currentCourseOutcomes.find((c) => c.id === e.target.value);
                                          showMsg(`Updated ${q.questionNumber} to ${matched?.code || 'CO'}`);
                                        }}
                                        className="bg-slate-950 border border-slate-700 text-indigo-300 font-mono font-bold text-xs rounded-lg px-2 py-1 focus:border-indigo-500 focus:outline-none cursor-pointer"
                                      >
                                        {currentCourseOutcomes.length === 0 ? (
                                          <option value="">No COs Defined</option>
                                        ) : (
                                          currentCourseOutcomes.map((co) => (
                                            <option key={co.id} value={co.id}>
                                              {co.code}
                                            </option>
                                          ))
                                        )}
                                      </select>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-mono font-bold text-xs">
                                        {matchedCo?.code || 'CO'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Bloom's Level */}
                                  <td className="px-4 py-2.5 text-center">
                                    {canManageCourse ? (
                                      <select
                                        value={q.bloomsLevel}
                                        onChange={(e) => {
                                          const bloom = e.target.value as BloomsTaxonomyLevel;
                                          updateQuestion(q.id, { bloomsLevel: bloom });
                                          showMsg(`Updated ${q.questionNumber} Bloom's to ${bloom}`);
                                        }}
                                        className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:border-indigo-500 focus:outline-none cursor-pointer"
                                      >
                                        <option value="REMEMBER">L1 - Remember</option>
                                        <option value="UNDERSTAND">L2 - Understand</option>
                                        <option value="APPLY">L3 - Apply</option>
                                        <option value="ANALYZE">L4 - Analyze</option>
                                        <option value="EVALUATE">L5 - Evaluate</option>
                                        <option value="CREATE">L6 - Create</option>
                                      </select>
                                    ) : (
                                      <span className="text-slate-300 text-xs font-semibold">
                                        {q.bloomsLevel}
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  {canManageCourse && (
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveQuestion(q.id, 'up', sectionQuestions)}
                                          disabled={qIdx === 0}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                          title="Move Question Up"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveQuestion(q.id, 'down', sectionQuestions)}
                                          disabled={qIdx === sectionQuestions.length - 1}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                          title="Move Question Down"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => openEditQuestionModal(q)}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                          title="Edit Question Statement & LaTeX"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`Delete ${q.questionNumber}?`)) {
                                              deleteQuestion(q.id);
                                              showMsg(`Deleted ${q.questionNumber}.`);
                                            }
                                          }}
                                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                          title="Delete Question"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ASSESSMENT WINDOWS & DEADLINES */}
      {subTab === 'windows' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Assessment Submission Windows & Admin Deadlines
              </h2>
              <p className="text-xs text-slate-400">
                Sub-components are dynamically filtered by course. Faculty mark entry strictly locks once the admin deadline passes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={windowsScheduleFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUploadScheduleMatrix}
              />

              <button
                onClick={handleDownloadScheduleMatrix}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                title="Download pre-populated CSV matrix of all Course x Section x Faculty x Assessment combinations"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download Schedule Matrix (CSV)</span>
              </button>

              <button
                onClick={() => windowsScheduleFileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-950/80 hover:bg-teal-900 border border-teal-700 text-teal-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                title="Bulk upload updated submission dates and deadlines"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Bulk Upload Windows</span>
              </button>

              <button
                onClick={handleAutoScheduleAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                title="Auto-schedule all unconfigured combinations with default +14 days submission window"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Auto-Schedule All (+14D)</span>
              </button>

              <button
                onClick={handleBatchExtendActive}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                title="Extend all active deadlines by 7 days"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Batch Extend (+7D)</span>
              </button>

              {(canUnlockOrExtendDeadline || canManageCourse) && (
                <button
                  onClick={() => {
                    const defCourseId = activeCourse?.id || courses[0]?.id || '';
                    const defSubs = scoringSubComponents.filter((s) => !s.courseId || s.courseId === defCourseId);
                    const defSec = courseSections.find((s) => s.courseId === defCourseId);
                    setWindowCourseId(defCourseId);
                    setWindowSubCompId(defSubs[0]?.id || '');
                    setWindowSectionId(defSec?.id || '');
                    setWindowFacultyId(defSec?.facultyId || '');
                    setOpenDate(new Date().toISOString().slice(0, 16));
                    setCloseDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16));
                    setExtendReason('');
                    setEditingWindowId(null);
                    setModalType('addWindow');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Window</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={windowsSearchQuery}
                  onChange={(e) => setWindowsSearchQuery(e.target.value)}
                  placeholder="Search assessment, course, faculty..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={windowsCourseFilter}
                onChange={(e) => setWindowsCourseFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Courses ({displayedCourses.length})</option>
                {displayedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
                {(['ALL', 'OPEN', 'OVERDUE', 'LOCKED', 'EXTENDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setWindowsStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      windowsStatusFilter === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All'
                      : st === 'OPEN'
                      ? 'Open'
                      : st === 'OVERDUE'
                      ? 'Overdue'
                      : st === 'LOCKED'
                      ? 'Locked'
                      : 'Extended'}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredAssessmentWindows.length} of {assessmentWindows.length} windows
            </div>
          </div>

          {filteredAssessmentWindows.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Assessment Windows Match Filters</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No configured submission windows found. Download the schedule matrix CSV to batch-schedule or click "Auto-Schedule All (+14D)".
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleAutoScheduleAll}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Auto-Schedule All (+14D)
                </button>
                <button
                  onClick={handleDownloadScheduleMatrix}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Download Schedule Matrix
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessmentWindows.map((win) => {
                const isOverdue = new Date() > new Date(win.closeDateTime);
                const section = courseSections.find((s) => s.id === win.sectionId);
                const course = courses.find((c) => c.id === win.courseId);

                return (
                  <div
                    key={win.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {course?.code || 'Course'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {win.status === 'UNLOCKED_BY_ADMIN' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                              Admin Extended
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-rose-950 border border-rose-800 text-rose-300'
                                : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            }`}
                          >
                            {isOverdue ? 'Deadline Closed' : 'Entry Open'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2">{win.subComponentName}</h3>

                      {/* Paired Section & Mapped Faculty Container */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Section &amp; Faculty Pair</span>
                          {(canUnlockOrExtendDeadline || canManageCourse) && (
                            <button
                              onClick={() => {
                                setWindowCourseId(win.courseId || activeCourse?.id || '');
                                setWindowSubCompId(win.subComponentId);
                                setWindowSectionId(win.sectionId);
                                setWindowFacultyId(win.facultyId || section?.facultyId || '');
                                setOpenDate(new Date(win.openDateTime).toISOString().slice(0, 16));
                                setCloseDate(new Date(win.closeDateTime).toISOString().slice(0, 16));
                                setExtendReason(win.unlockAuditReason || '');
                                setEditingWindowId(win.id);
                                setModalType('editWindow');
                              }}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold normal-case text-[11px] underline"
                            >
                              Change Faculty
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-bold font-mono text-xs">
                            {section?.name || 'Section A'}
                          </span>
                          <span className="text-slate-500 font-bold">&harr;</span>
                          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{win.facultyName || section?.facultyName || 'Assigned Faculty'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Opens:</span>
                        <span className="text-slate-300">{new Date(win.openDateTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-400 font-semibold">Deadline:</span>
                        <strong className="text-rose-300 font-bold">{new Date(win.closeDateTime).toLocaleString()}</strong>
                      </div>
                    </div>

                    {(canUnlockOrExtendDeadline || canManageCourse) && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <button
                          onClick={() => {
                            setWindowCourseId(win.courseId || activeCourse?.id || '');
                            setWindowSubCompId(win.subComponentId);
                            setWindowSectionId(win.sectionId);
                            setWindowFacultyId(win.facultyId || section?.facultyId || '');
                            setOpenDate(new Date(win.openDateTime).toISOString().slice(0, 16));
                            setCloseDate(new Date(win.closeDateTime).toISOString().slice(0, 16));
                            setExtendReason(win.unlockAuditReason || '');
                            setEditingWindowId(win.id);
                            setModalType('editWindow');
                          }}
                          className="text-indigo-400 hover:underline font-semibold"
                        >
                          Extend Time &amp; Faculty
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this assessment window?')) {
                              deleteAssessmentWindow(win.id);
                              showMsg('Assessment window deleted.');
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: QUESTION PAPER TEMPLATES */}
      {subTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Question Paper Blueprint Templates
              </h2>
              <p className="text-xs text-slate-400">
                Pre-defined blueprints for CIE (50M) and SEE (100M). Save any custom question paper as a template for 1-click reuse across courses.
              </p>
            </div>

            {canManageCourse && (
              <button
                onClick={() => {
                  if (!activeQuestionPaper || currentPaperSections.length === 0) {
                    showMsg('Create sections in the active paper before saving as template.', 'error');
                    return;
                  }
                  setNewTemplateName(`${activeQuestionPaper.title} Template`);
                  setModalType('saveAsTemplate');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
              >
                <Copy className="w-4 h-4" />
                <span>Save Current Paper as Template</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionPaperTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                      {tpl.totalMarks} Marks
                    </span>
                    {canManageCourse && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete template "${tpl.name}"?`)) {
                            deleteQuestionPaperTemplate(tpl.id);
                            showMsg('Template deleted.');
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{tpl.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{tpl.description}</p>

                  <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-3">
                    {tpl.sections.map((sec, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{sec.sectionName}:</span>
                        <strong className="text-slate-400">
                          {sec.choiceRule === 'ALL'
                            ? `${sec.totalQuestions} Questions (All)`
                            : `Any ${sec.questionsToAnswer} of ${sec.totalQuestions}`}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {canManageCourse ? (
                  <button
                    onClick={() => {
                      if (!activeQuestionPaper) return;
                      applyQuestionPaperTemplate(tpl.id, activeQuestionPaper.id, currentCourseOutcomes[0]?.id);
                      showMsg(`Applied template "${tpl.name}" to ${activeQuestionPaper.title}.`);
                      setSubTab('designer');
                    }}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Apply to Active Paper</span>
                  </button>
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-500 italic">
                    Governed blueprint template
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIGURE ASSESSMENT WINDOW (Sub-Component Dropdown based on Course!) */}
      {(modalType === 'addWindow' || modalType === 'editWindow') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addWindow' ? 'Configure Assessment Window' : 'Admin Deadline Extension & Window Reopen'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveWindow} className="p-5 space-y-4 text-xs">
              {/* Course Selector */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Course *</label>
                <select
                  value={windowCourseId}
                  onChange={(e) => {
                    const newCId = e.target.value;
                    setWindowCourseId(newCId);
                    const courseSubs = scoringSubComponents.filter((s) => s.courseId === newCId);
                    setWindowSubCompId(courseSubs[0]?.id || '');
                    const sec = courseSections.find((s) => s.courseId === newCId);
                    setWindowSectionId(sec?.id || '');
                    setWindowFacultyId(sec?.facultyId || '');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Component Dropdown Based on Selected Course */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Sub-Component (Dropdown based on Course) *
                </label>
                <select
                  required
                  value={windowSubCompId}
                  onChange={(e) => setWindowSubCompId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  {scoringSubComponents
                    .filter((s) => !s.courseId || s.courseId === windowCourseId)
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.type} &bull; Max: {sub.maxMarks}M)
                      </option>
                    ))}
                </select>
              </div>

              {/* Section and Its Mapped Faculty (Paired Presentation with Option to Change Faculty) */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs">
                    Target Section &amp; Evaluator Allocation
                  </span>
                  <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                    Paired Configuration
                  </span>
                </div>

                {/* Section Selector */}
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px] font-medium">
                    1. Target Section *
                  </label>
                  <select
                    value={windowSectionId}
                    onChange={(e) => {
                      const secId = e.target.value;
                      setWindowSectionId(secId);
                      const matchedSec = courseSections.find((s) => s.id === secId);
                      if (matchedSec?.facultyId) {
                        setWindowFacultyId(matchedSec.facultyId);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-indigo-500 focus:outline-none"
                  >
                    {courseSections
                      .filter((s) => s.courseId === windowCourseId)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} (Mapped: {sec.facultyName || 'No Faculty'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Current Active Pair Indicator */}
                {(() => {
                  const currentSec = courseSections.find((s) => s.id === windowSectionId);
                  const currentFac = users.find((u) => u.id === windowFacultyId);
                  const isOverridden =
                    currentSec?.facultyId &&
                    windowFacultyId &&
                    currentSec.facultyId !== windowFacultyId;

                  return (
                    <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold font-mono text-[11px]">
                          {currentSec?.name || 'Section'}
                        </span>
                        <span className="text-slate-500 font-bold">&harr;</span>
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          {currentFac?.fullName || currentSec?.facultyName || 'Default Faculty'}
                        </span>
                      </div>
                      {isOverridden && (
                        <span className="text-[10px] bg-purple-950 border border-purple-800 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                          Faculty Changed
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Option to Change to Another Faculty */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-[11px] font-medium">
                      2. Change Assigned Faculty (Optional Override)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const matchedSec = courseSections.find((s) => s.id === windowSectionId);
                        if (matchedSec?.facultyId) setWindowFacultyId(matchedSec.facultyId);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[10px] underline"
                    >
                      Reset to Section Default
                    </button>
                  </div>
                  <select
                    value={windowFacultyId}
                    onChange={(e) => setWindowFacultyId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Keep Section Mapped Faculty --</option>
                    {users
                      .filter((u) => u.role !== 'STUDENT')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) &bull; {u.role.replace('_', ' ')}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Assigned faculty gets full authorization to enter marks for this paired section within the specified assessment dates.
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Opening Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-rose-300 block mb-1">Admin Deadline *</label>
                  <input
                    type="datetime-local"
                    required
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:border-rose-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {modalType === 'editWindow' && (
                <div>
                  <label className="font-semibold text-amber-300 block mb-1">
                    Extension / Unlock Reason (Admin Audit Log) *
                  </label>
                  <input
                    type="text"
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="e.g. Granted 48-hour deadline extension by Admin"
                    className="w-full bg-slate-950 border border-amber-800/80 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Only the assigned faculty can enter question marks within this configured window.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm"
                >
                  {modalType === 'addWindow' ? 'Save & Open Window' : 'Apply Extension & Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE BLUEPRINT AS TEMPLATE */}
      {modalType === 'saveAsTemplate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Save className="w-5 h-5 text-indigo-400" />
              <span>Save Blueprint as Reusable Template</span>
            </h3>
            <p className="text-xs text-slate-400">
              Save current section structure, choice rules (Answer All / Any N), and mark distributions for rapid application on other courses.
            </p>

            <form onSubmit={handleSaveAsTemplate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. CIE 50-Marks Standard Format"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: APPLY TEMPLATE */}
      {modalType === 'applyTemplate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Apply Question Paper Template</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select a pre-configured template. This will generate all sections, question placeholders, Bloom&apos;s mappings, and choices in 1 click.
            </p>

            <div className="space-y-3 text-xs">
              {questionPaperTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-indigo-950/60 border-indigo-600'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{tpl.name}</span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      {tpl.totalMarks} Marks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{tpl.description}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                Apply Selected Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUESTION MODAL (Rich LaTeX Formula & Diagram Editing) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  Edit Question {editingQuestion.questionNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuestion} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-1">
                  <label className="font-semibold text-slate-300 block mb-1">Q. No *</label>
                  <input
                    type="text"
                    required
                    value={editQNumber}
                    onChange={(e) => setEditQNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="font-semibold text-slate-300 block mb-1">Marks *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQMaxMarks}
                    onChange={(e) => setEditQMaxMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-center text-teal-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-300 block mb-1">Course Outcome (CO) *</label>
                  <select
                    value={editQCoId}
                    onChange={(e) => setEditQCoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-indigo-300 font-mono font-bold"
                  >
                    {currentCourseOutcomes.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.code} - {co.statement?.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-300 block mb-1">Bloom&apos;s Taxonomy *</label>
                  <select
                    value={editQBlooms}
                    onChange={(e) => setEditQBlooms(e.target.value as BloomsTaxonomyLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-semibold"
                  >
                    <option value="REMEMBER">L1 - Remember</option>
                    <option value="UNDERSTAND">L2 - Understand</option>
                    <option value="APPLY">L3 - Apply</option>
                    <option value="ANALYZE">L4 - Analyze</option>
                    <option value="EVALUATE">L5 - Evaluate</option>
                    <option value="CREATE">L6 - Create</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Sub-Part and Optional Choice */}
              <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editQIsPart}
                    onChange={(e) => setEditQIsPart(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                  />
                  <span>Has Sub-Part (e.g. Q1.a)</span>
                </label>
                {editQIsPart && (
                  <input
                    type="text"
                    value={editQPartLabel}
                    onChange={(e) => setEditQPartLabel(e.target.value)}
                    placeholder="Part: a, b"
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                  />
                )}

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editQIsOption}
                    onChange={(e) => setEditQIsOption(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                  />
                  <span>Optional Choice (— OR —)</span>
                </label>
                {editQIsOption && (
                  <>
                    <input
                      type="text"
                      value={editQOptionLabel}
                      onChange={(e) => setEditQOptionLabel(e.target.value)}
                      placeholder="Option A / Option B"
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={editQOptionGroup}
                      onChange={(e) => setEditQOptionGroup(e.target.value)}
                      placeholder="Group: OPT_1"
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                  </>
                )}
              </div>

              {/* Rich Question Editor */}
              <div>
                <label className="text-slate-300 font-semibold text-xs block mb-1.5">
                  Question Statement, LaTeX Equations & Diagrams:
                </label>
                <RichQuestionEditor
                  value={editQContent}
                  onChange={setEditQContent}
                  imageUrl={editQImageUrl}
                  onImageUrlChange={setEditQImageUrl}
                  imageCaption={editQImageCaption}
                  onImageCaptionChange={setEditQImageCaption}
                  placeholder="Enter detailed question statement. Supports $formula$ for inline LaTeX, $$formula$$ for block math, and diagrams..."
                  minHeight="140px"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Question Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL UNIVERSITY EXAMINATION PAPER PREVIEW & PRINT MODAL */}
      {showExamPaperPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Toolbar */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>Official University Examination Paper Preview</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Formatted strictly for NBA/NAAC audits, institutional examinations, and PDF print archiving.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPaper}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Open Print Dialog"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Paper</span>
                </button>

                <button
                  onClick={handleDownloadPaperPdf}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  title="Generate Vector PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>

                <button
                  onClick={() => setShowExamPaperPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print & Export Customization Options Bar */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Customizable Document Options:</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOptions.showSignatures}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, showSignatures: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Official Signatures</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOptions.showCoBlooms}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, showCoBlooms: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>CO &amp; Bloom's Tags</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOptions.showInstructions}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, showInstructions: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Candidate Instructions</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOptions.showInstituteHeader}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, showInstituteHeader: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>University Header</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printOptions.showMarks}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, showMarks: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Question Marks</span>
                </label>
              </div>
            </div>

            {/* Scrollable Document Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60">
              {/* THE OFFICIAL PRINTABLE QUESTION PAPER (White Paper Style) */}
              <div
                id="official-exam-paper-container"
                className="bg-white text-slate-900 p-8 sm:p-12 max-w-4xl mx-auto rounded-xl shadow-xl font-serif space-y-6 border border-slate-200"
              >
                {/* Official University Header */}
                {printOptions.showInstituteHeader && (
                  <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-4">
                    <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-950">
                      {tenant?.name || 'Central University of Technology'}
                    </h1>
                    <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700">
                      Faculty of Engineering &bull; Course: {activeCourse ? `${activeCourse.code} - ${activeCourse.title}` : 'Engineering & Technology'}
                    </h2>
                    <div className="text-xs font-bold uppercase text-slate-800 pt-1">
                      {activeQuestionPaper?.title || 'Continuous Internal Assessment Examination'} &bull; Academic Year 2025-26
                    </div>
                  </div>
                )}

                {/* Course & Exam Meta Details Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-300 p-3 bg-slate-50 rounded">
                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">Course Code</span>
                    <span className="font-mono font-bold text-slate-900">{activeCourse?.code}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">Course Name</span>
                    <span className="font-semibold text-slate-900 truncate block">{activeCourse?.title}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">Max Marks</span>
                    <span className="font-bold text-slate-900">{activeQuestionPaper?.totalMarks || totalAllocatedMarks} Marks</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">Duration</span>
                    <span className="font-semibold text-slate-900">3 Hours</span>
                  </div>
                </div>

                {/* Candidate Instructions */}
                {printOptions.showInstructions && (
                  <div className="border border-slate-300 p-3 text-[11px] bg-slate-50/50 rounded space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700">
                      General Instructions to Candidates:
                    </div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-700 leading-normal">
                      <li>Read each question carefully and answer according to the section instructions.</li>
                      <li>Where internal choice is indicated with <strong>[— OR —]</strong>, answer either Option A or Option B.</li>
                      <li>Mathematical equations, symbols, and formulas follow standard scientific conventions.</li>
                      <li>Assume suitable missing data if any, and state assumptions explicitly.</li>
                    </ol>
                  </div>
                )}

                {/* Sections and Questions */}
                <div className="space-y-6 pt-2">
                  {currentPaperSections.map((sec, secIdx) => {
                    const secQuestions = currentPaperQuestions.filter((q) => q.sectionId === sec.id);
                    return (
                      <div key={sec.id} className="space-y-4">
                        {/* Section Header */}
                        <div className="text-center border-b border-slate-400 pb-1.5">
                          <h3 className="font-bold uppercase tracking-wide text-xs text-slate-950">
                            {sec.sectionName}
                          </h3>
                          <div className="text-[11px] text-slate-700 italic">
                            {sec.choiceRule === 'ALL'
                              ? `(Answer ALL questions in this section)`
                              : `(Answer ANY ${sec.questionsToAnswer} of ${sec.totalQuestions} questions)`}
                            {sec.instructions && <span> &bull; {sec.instructions}</span>}
                          </div>
                        </div>

                        {/* Questions inside Section */}
                        <div className="space-y-3">
                          {secQuestions.map((q, qIndex) => {
                            const prevQ = qIndex > 0 ? secQuestions[qIndex - 1] : null;
                            const isChoiceSecond =
                              q.isOption &&
                              prevQ &&
                              prevQ.isOption &&
                              (prevQ.optionGroup === q.optionGroup ||
                                q.optionLabel?.toLowerCase().includes('b') ||
                                prevQ.optionLabel?.toLowerCase().includes('a'));

                            const matchedCo = currentCourseOutcomes.find((c) => c.id === q.courseOutcomeId);

                            return (
                              <React.Fragment key={q.id}>
                                {isChoiceSecond && (
                                  <div className="text-center font-bold text-xs tracking-widest text-slate-800 my-2 py-1 bg-slate-100 border-y border-dashed border-slate-300">
                                    — OR —
                                  </div>
                                )}

                                <div className="flex items-start justify-between gap-4 text-xs leading-relaxed">
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="font-bold font-mono text-slate-950 shrink-0">
                                      {q.questionNumber}.
                                    </span>
                                    <div className="flex-1 space-y-1">
                                      {q.content ? (
                                        <LatexRenderer
                                          content={q.content}
                                          imageUrl={q.imageUrl}
                                          imageCaption={q.imageCaption}
                                          className="text-slate-900 font-serif"
                                        />
                                      ) : (
                                        <span className="italic text-slate-500">
                                          [Question statement pending entry]
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right-aligned Marks and Attainment Tags */}
                                  {(printOptions.showMarks || printOptions.showCoBlooms) && (
                                    <div className="text-right shrink-0 whitespace-nowrap pl-2">
                                      {printOptions.showMarks && (
                                        <span className="font-bold text-slate-900">[{q.maxMarks}M]</span>
                                      )}
                                      {printOptions.showCoBlooms && (
                                        <span className="block text-[10px] text-slate-600 font-sans">
                                          [{matchedCo?.code || 'CO'}, {q.bloomsLevel}]
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Document Sign-Off Footer (Customizable) */}
                {printOptions.showSignatures && (
                  <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-[11px] text-slate-700">
                    <div>
                      <div className="h-8"></div>
                      <div className="border-t border-slate-400 pt-1 font-semibold">Course Instructor</div>
                    </div>
                    <div>
                      <div className="h-8"></div>
                      <div className="border-t border-slate-400 pt-1 font-semibold">Course Coordinator</div>
                    </div>
                    <div>
                      <div className="h-8"></div>
                      <div className="border-t border-slate-400 pt-1 font-semibold">Head of Department</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DATA UPLOAD MODAL */}
      <BulkDataUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Questions & Blueprint Items"
        entityName="Questions"
        columns={bulkUploadColumns}
        sampleRows={bulkUploadSamples}
        onImport={handleBulkImportQuestions}
        notes="Questions will be automatically parsed, verified against SQL injection vectors, and inserted into the active question paper."
      />
    </div>
  );
};
