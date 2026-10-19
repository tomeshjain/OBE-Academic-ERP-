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
  BookOpen,
  Calendar,
  Save,
  Check,
  User,
} from 'lucide-react';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import { sanitizeInput } from '@/lib/security';

export const AssessmentQuestionsView: React.FC = () => {
  const {
    courses,
    activeCourseId,
    setActiveCourseId,
    scoringSubComponents,
    assessmentWindows,
    activeWindowId,
    setActiveWindowId,
    addAssessmentWindow,
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

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0] || null;

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
  const currentPaperSections = questionPaperSections.filter(
    (s) => s.questionPaperId === activeQuestionPaper?.id
  );

  // Questions of the active Question Paper
  const currentPaperQuestions = questions.filter(
    (q) => q.questionPaperId === activeQuestionPaper?.id
  );

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
  const [qMaxMarks, setQMaxMarks] = useState(5);
  const [qCoId, setQCoId] = useState('');
  const [qBlooms, setQBlooms] = useState<BloomsTaxonomyLevel>('APPLY');

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

  // Rich Text Helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    setQContent((prev) => `${prev} ${prefix}math_expression${suffix}`);
  };

  // Total Marks calculated from questions
  const totalAllocatedMarks = useMemo(() => {
    return currentPaperQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
  }, [currentPaperQuestions]);

  // Handle Quick Inline Add Section
  const handleSaveInlineSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper) return;

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
    setInlineSectionId(secId);
    const count = currentPaperQuestions.filter((q) => q.sectionId === secId).length;
    setQNumber(`Q${count + 1}`);
    setQIsPart(false);
    setQPartLabel('a');
    setQIsOption(false);
    setQOptionGroup(`OPT_${count + 1}`);
    setQOptionLabel('Option A');
    setQContent('');
    setQMaxMarks(5);
    setQCoId(currentCourseOutcomes[0]?.id || '');
    setQBlooms('APPLY');
  };

  // Handle Quick Inline Add Question
  const handleSaveInlineQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper || !inlineSectionId) return;

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
      content: qContent.trim() ? sanitizeInput(qContent).trim() : undefined, // Text is optional!
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
  };

  // Handle Save Current Blueprint as Template (Preserving and Restoring Question-Wise COs)
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionPaper) return;

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
    <div className="space-y-5">
      {/* Header Banner - Space Optimized */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4.5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Module 7</span>
              <span>&bull;</span>
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
              <span>Windows &amp; Deadlines ({assessmentWindows.length})</span>
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

            {/* Quick Actions: Save Template, Apply Template, Bulk Upload */}
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          {/* Paper Summary Pill Bar */}
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

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span>{currentPaperSections.length} Sections</span>
                <span>&bull;</span>
                <span>{currentPaperQuestions.length} Questions</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-medium">Auto-saved to Course</span>
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

                          {/* Optional Question Text & Formula Toolbar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-400 font-semibold text-[11px]">
                                Question Statement / Formula (Optional):
                              </label>
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => insertFormatting('\\int_0^\\infty f(x)dx')}
                                  className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                                >
                                  &int; Integral
                                </button>
                                <button
                                  type="button"
                                  onClick={() => insertFormatting('\\sum_{i=1}^n x_i')}
                                  className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                                >
                                  &Sigma; Sum
                                </button>
                                <button
                                  type="button"
                                  onClick={() => insertFormatting('\\frac{a}{b}')}
                                  className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                                >
                                  &frac12; Fraction
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={qContent}
                              onChange={(e) => setQContent(e.target.value)}
                              placeholder="Type question text or leave blank if building structure only..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none text-xs"
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

                    {/* Questions Table with Direct Dropdowns for CO and Bloom's Level */}
                    {sectionQuestions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No questions in this section yet. Click "+ Add Question" above to insert.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              <th className="px-4 py-2.5 w-24">Q. No</th>
                              <th className="px-4 py-2.5">Question Text / Statement (Optional)</th>
                              <th className="px-4 py-2.5 w-24 text-center">Marks</th>
                              <th className="px-4 py-2.5 w-28 text-center">CO (Dropdown)</th>
                              <th className="px-4 py-2.5 w-36 text-center">Bloom&apos;s (Dropdown)</th>
                              <th className="px-4 py-2.5 w-16 text-right">Delete</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {sectionQuestions.map((q) => {
                              return (
                                <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                                  {/* Q Number */}
                                  <td className="px-4 py-2.5 font-mono font-bold text-white whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span>{q.questionNumber}</span>
                                      {q.isOption && (
                                        <span className="text-[9px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-1 py-0.2 rounded font-sans">
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

                                  {/* Marks (Inline editable) */}
                                  <td className="px-4 py-2.5 text-center">
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
                                  </td>

                                  {/* Course Outcome (Direct Dropdown) */}
                                  <td className="px-4 py-2.5 text-center">
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
                                  </td>

                                  {/* Bloom's Level (Direct Dropdown) */}
                                  <td className="px-4 py-2.5 text-center">
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
                                  </td>

                                  {/* Delete */}
                                  <td className="px-4 py-2.5 text-right">
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
                                  </td>
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
              <span>Configure Assessment Window</span>
            </button>
          </div>

          {assessmentWindows.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Assessment Windows Configured</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Configure submission deadlines for Continuous Internal Evaluations (CIE) or Semester End Examinations (SEE).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessmentWindows.map((win) => {
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
