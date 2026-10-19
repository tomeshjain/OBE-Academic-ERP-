'use client';

import React, { useState, useMemo } from 'react';
import {
  StudentEnrollment,
  QuestionItem,
  MarkEntryRecord,
  AssessmentWindowRecord,
  MarkEntryStatusCode,
  UserRole,
} from '@/types/erp';
import { useApp } from '@/context/AppContext';
import { FreezeGuardEngine } from '@/lib/freeze-guard';
import { ObeAttainmentCalculator } from '@/lib/attainment-calculator';
import {
  Lock,
  Unlock,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import {
  downloadMarkEntryTemplate,
  exportCompletedMarksToExcel,
  parseMarksFromExcel,
} from '@/lib/excel-utils';


interface MarkEntryMatrixProps {
  currentUserRole: UserRole;
  onViewAttainmentReport?: () => void;
  onOpenAdminHub?: () => void;
}

export const MarkEntryMatrix: React.FC<MarkEntryMatrixProps> = ({
  currentUserRole,
  onViewAttainmentReport,
  onOpenAdminHub,
}) => {
  const {
    students,
    questions,
    marks,
    updateMarkEntry,
    importMarksBatch,
    assessmentWindows,
    updateAssessmentWindow,
    courseOutcomes,
    courses,
    activeCourseId,
  } = useApp();

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const defaultWindow: AssessmentWindowRecord = assessmentWindows[0] || {
    id: 'win-default',
    sectionId: 'sec-a',
    subComponentId: 'sub-default',
    subComponentName: 'Continuous Internal Evaluation (CIE) - Assessment 1',
    questionPaperId: 'qp-1',
    status: 'DRAFT',
    openDateTime: new Date().toISOString(),
    closeDateTime: new Date(Date.now() + 30 * 86400000).toISOString(),
  };

  const [windowState, setWindowState] = useState<AssessmentWindowRecord>(defaultWindow);
  const [unlockReason, setUnlockReason] = useState<string>('');
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const marksExcelInputRef = React.useRef<HTMLInputElement>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Sync window changes if context updates
  React.useEffect(() => {
    if (assessmentWindows[0]) {
      setWindowState(assessmentWindows[0]);
    }
  }, [assessmentWindows]);

  const handleDownloadTemplate = () => {
    downloadMarkEntryTemplate(students, questions, windowState.subComponentName);
    setActionMessage({
      type: 'success',
      text: `Downloaded Excel marksheet template for "${windowState.subComponentName}". Populate offline and bulk import!`,
    });
  };

  const handleExportMarks = () => {
    exportCompletedMarksToExcel(students, questions, marks, windowState.subComponentName);
    setActionMessage({
      type: 'success',
      text: `Exported complete marks matrix to Excel!`,
    });
  };

  const handleMarksExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!editPermission.allowed) {
      setActionMessage({ type: 'error', text: `Cannot import marks: ${editPermission.message}` });
      if (e.target) e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const entries = await parseMarksFromExcel(file, questions, students, windowState.id);
      if (entries.length === 0) {
        setActionMessage({
          type: 'error',
          text: 'No valid marks could be matched. Ensure student Roll Numbers and Question headers (e.g. Q1, Q2) match the template.',
        });
      } else {
        importMarksBatch(entries);
        setActionMessage({
          type: 'success',
          text: `Successfully imported ${entries.length} mark scores from Excel! Attainment scores updated automatically.`,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Excel parse error: ${err.message || 'Check template format and column headers.'}`,
      });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // Mark lookup table: key = `${enrollmentId}_${questionId}`
  const markMap = useMemo(() => {
    const map = new Map<string, MarkEntryRecord>();
    marks.forEach((entry) => {
      map.set(`${entry.enrollmentId}_${entry.questionId}`, entry);
    });
    return map;
  }, [marks]);

  // Evaluate current freeze guard permission
  const editPermission = useMemo(() => {
    return FreezeGuardEngine.canEditMarks(windowState, currentUserRole);
  }, [windowState, currentUserRole]);

  // Calculate live question-level attainment
  const attainmentEngine = useMemo(() => new ObeAttainmentCalculator(), []);

  const questionAttainments = useMemo(() => {
    return attainmentEngine.calculateQuestionAttainments(questions, students, marks);
  }, [attainmentEngine, questions, students, marks]);

  // Calculate live Course Outcome direct attainment preview
  const coDirectAttainments = useMemo(() => {
    return attainmentEngine.calculateCoDirectAttainment(courseOutcomes, questionAttainments);
  }, [attainmentEngine, courseOutcomes, questionAttainments]);

  // Total possible question paper marks
  const totalMaxMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.maxMarks, 0);
  }, [questions]);

  // Handle Mark Change
  const handleScoreChange = (
    enrollmentId: string,
    questionId: string,
    valueStr: string,
    maxMarks: number
  ) => {
    if (!editPermission.allowed) {
      setActionMessage({ type: 'error', text: editPermission.message });
      return;
    }

    if (valueStr === '') {
      updateMarkEntry(enrollmentId, questionId, 'PRESENT', null);
      return;
    }

    const num = parseFloat(valueStr);
    const validation = FreezeGuardEngine.validateMarkInput(num, maxMarks, 'PRESENT');

    if (!validation.allowed) {
      setActionMessage({ type: 'error', text: `${validation.message} (Max: ${maxMarks})` });
      return;
    }

    setActionMessage(null);
    updateMarkEntry(enrollmentId, questionId, 'PRESENT', num);
  };

  // Toggle Special Status Code
  const handleStatusChange = (
    enrollmentId: string,
    questionId: string,
    status: MarkEntryStatusCode
  ) => {
    if (!editPermission.allowed) {
      setActionMessage({ type: 'error', text: editPermission.message });
      return;
    }

    let defaultMarks: number | null = null;
    if (status === 'MALPRACTICE') defaultMarks = 0;
    if (status === 'PRESENT') defaultMarks = 0;

    updateMarkEntry(enrollmentId, questionId, status, defaultMarks);
  };

  // State Transition Handlers
  const handleStateTransition = (target: AssessmentWindowRecord['status']) => {
    const transition = FreezeGuardEngine.validateStateTransition({
      currentStatus: windowState.status,
      targetStatus: target,
      userRole: currentUserRole,
      reason: unlockReason,
    });

    if (!transition.allowed) {
      setActionMessage({ type: 'error', text: transition.message });
      return;
    }

    const updated: AssessmentWindowRecord = {
      ...windowState,
      status: target,
      frozenAt: target === 'FROZEN' ? new Date().toISOString() : windowState.frozenAt,
      submittedAt: target === 'SUBMITTED' ? new Date().toISOString() : windowState.submittedAt,
      emergencyCloseDate:
        target === 'UNLOCKED_BY_ADMIN'
          ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
          : windowState.emergencyCloseDate,
    };

    setWindowState(updated);
    updateAssessmentWindow(updated);
    setShowUnlockModal(false);
    setUnlockReason('');
    setActionMessage({
      type: 'success',
      text: `Window status transitioned to ${target}. ${transition.message}`,
    });
  };

  // If there are 0 students or 0 questions, show friendly guidance
  if (students.length === 0 || questions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {students.length === 0 && questions.length === 0
              ? 'No Students or Questions Configured Yet'
              : students.length === 0
              ? 'No Students Enrolled Yet'
              : 'No Exam Questions Created Yet'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            As the administrator, you can enroll your students (individual or batch CSV upload) and define exam questions mapped to Course Outcomes.
          </p>
        </div>

        {onOpenAdminHub && (
          <button
            onClick={onOpenAdminHub}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open Admin Data Hub to Add Roster & Questions</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Assessment Window Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-full">
                Assessment Matrix (CIE)
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Deadline: {new Date(windowState.closeDateTime).toLocaleDateString()}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {activeCourse ? `${activeCourse.code}: ${activeCourse.title}` : 'Course Assessment Matrix'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Enrolled: {students.length} students &bull; Max Score: {totalMaxMarks} Marks &bull; OBE Cutoff: 60%
            </p>
          </div>

          {/* Status Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                windowState.status === 'FROZEN'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  : windowState.status === 'SUBMITTED'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : windowState.status === 'UNLOCKED_BY_ADMIN'
                  ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              }`}
            >
              {windowState.status === 'FROZEN' ? (
                <Lock className="w-3.5 h-3.5" />
              ) : windowState.status === 'UNLOCKED_BY_ADMIN' ? (
                <Unlock className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>STATUS: {windowState.status}</span>
            </div>

            {/* Transition Buttons */}
            {windowState.status === 'DRAFT' && (
              <button
                onClick={() => handleStateTransition('SUBMITTED')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Marks</span>
              </button>
            )}

            {windowState.status === 'SUBMITTED' && (
              <>
                <button
                  onClick={() => handleStateTransition('DRAFT')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <span>Revert to Draft</span>
                </button>
                <button
                  onClick={() => handleStateTransition('FROZEN')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Freeze Marks</span>
                </button>
              </>
            )}

            {windowState.status === 'FROZEN' && (
              <button
                onClick={() => setShowUnlockModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Admin Emergency Unlock</span>
              </button>
            )}

            {onViewAttainmentReport && (
              <button
                onClick={onViewAttainmentReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>View OBE Attainment</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback alert */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between ${
              actionMessage.type === 'error'
                ? 'bg-rose-950/70 border border-rose-800/80 text-rose-200'
                : 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs hover:underline text-slate-400"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Real-Time CO Live Attainment Tracker Cards */}
      {coDirectAttainments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {coDirectAttainments.map((co) => {
            const isAttained = co.attainmentLevel >= 2;
            return (
              <div
                key={co.courseOutcomeId}
                className={`p-3 rounded-xl border transition-all ${
                  isAttained
                    ? 'bg-slate-900/80 border-emerald-700/50 hover:border-emerald-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-amber-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{co.courseOutcomeCode}</span>
                  <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                    {co.bloomsLevel}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-lg font-extrabold text-white">
                    {co.averageStudentAttainmentPct}%
                  </div>
                  <div
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      co.attainmentLevel === 3
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : co.attainmentLevel === 2
                        ? 'bg-teal-900/60 text-teal-300'
                        : co.attainmentLevel === 1
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-rose-900/60 text-rose-300'
                    }`}
                  >
                    L{co.attainmentLevel}
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAttained ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, co.averageStudentAttainmentPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Excel Integration Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Offline Excel Marksheet Operations</span>
              <span className="text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                .XLSX &bull; .CSV
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Download standard OBE matrix templates, bulk upload faculty scores offline, or export accredited records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={marksExcelInputRef}
            onChange={handleMarksExcelUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={!editPermission.allowed || isImporting}
          />

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors shadow-sm"
            title="Download formatted Excel sheet containing current student roll numbers and question columns"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Template</span>
          </button>

          <button
            onClick={() => marksExcelInputRef.current?.click()}
            disabled={!editPermission.allowed || isImporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            title="Bulk import marks from filled Excel template"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Importing Scores...' : 'Bulk Import Excel'}</span>
          </button>

          <button
            onClick={handleExportMarks}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors shadow-sm"
            title="Export all marks with totals, statuses, and percentages to Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Marksheet (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Matrix Spreadsheet Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300">
              <tr className="border-b border-slate-800">
                <th className="sticky left-0 z-30 bg-slate-950 p-3 min-w-[200px] border-r border-slate-800">
                  <div className="font-semibold text-white">Student Roster</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Roll No &bull; Full Name
                  </div>
                </th>

                {/* Question Columns */}
                {questions.map((q) => {
                  const qAtt = questionAttainments.find((qa) => qa.questionId === q.id);
                  const attPct = qAtt ? qAtt.attainmentPercentage : 0;
                  const mappedCo = courseOutcomes.find((c) => c.id === q.courseOutcomeId);
                  return (
                    <th
                      key={q.id}
                      className="p-3 min-w-[125px] max-w-[145px] text-center border-r border-slate-800/60"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-white text-xs">{q.questionNumber}</span>
                        <span className="text-[10px] bg-indigo-950 border border-indigo-800/60 text-indigo-300 px-1.5 py-0.2 rounded">
                          {mappedCo?.code || 'CO1'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Max: <span className="font-semibold text-slate-200">{q.maxMarks}M</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">
                        {q.bloomsLevel}
                      </div>

                      <div className="mt-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Att: <span className={attPct >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{attPct}%</span>
                      </div>
                    </th>
                  );
                })}

                <th className="p-3 min-w-[110px] text-center bg-slate-950 border-r border-slate-800">
                  <div className="font-bold text-white">Total Marks</div>
                  <div className="text-[10px] text-slate-400">Out of {totalMaxMarks}M</div>
                </th>
                <th className="p-3 min-w-[110px] text-center bg-slate-950">
                  <div className="font-bold text-white">Status / Actions</div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {students.map((student, idx) => {
                let studentTotalMarks = 0;
                let hasAbsent = false;
                let hasMalpractice = false;

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-900/20'
                    } hover:bg-slate-800/40`}
                  >
                    {/* Sticky Student Identifier */}
                    <td className="sticky left-0 z-10 bg-slate-900/95 p-3 border-r border-slate-800 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-xs font-sans">
                            {student.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {student.rollNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Question Input Cells */}
                    {questions.map((q) => {
                      const entry = markMap.get(`${student.id}_${q.id}`);
                      const status = entry?.statusCode || 'PRESENT';
                      const score = entry?.marksObtained ?? null;

                      if (status === 'PRESENT' && score !== null) {
                        studentTotalMarks += score;
                      } else if (status === 'ABSENT') {
                        hasAbsent = true;
                      } else if (status === 'MALPRACTICE') {
                        hasMalpractice = true;
                      }

                      const isAttained =
                        status === 'PRESENT' &&
                        score !== null &&
                        score >= (q.targetThresholdPct / 100) * q.maxMarks;

                      const isInvalid = score !== null && (score < 0 || score > q.maxMarks);

                      return (
                        <td
                          key={q.id}
                          className="p-2 text-center border-r border-slate-800/40 relative group"
                        >
                          {status === 'PRESENT' ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={q.maxMarks}
                                disabled={!editPermission.allowed}
                                value={score === null ? '' : score}
                                onChange={(e) =>
                                  handleScoreChange(student.id, q.id, e.target.value, q.maxMarks)
                                }
                                placeholder="—"
                                className={`w-16 h-8 text-center text-xs font-mono font-semibold rounded-md border transition-all ${
                                  !editPermission.allowed
                                    ? 'bg-slate-950/40 border-slate-800 text-slate-400 cursor-not-allowed'
                                    : isInvalid
                                    ? 'bg-rose-950/60 border-rose-600 text-rose-200 ring-2 ring-rose-500/30'
                                    : isAttained
                                    ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                    : 'bg-slate-950 border-slate-700/80 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                }`}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                                  status === 'ABSENT'
                                    ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                                    : status === 'MALPRACTICE'
                                    ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                                    : 'bg-purple-950/70 border-purple-800 text-purple-300'
                                }`}
                              >
                                {status === 'ABSENT' ? 'ABSENT' : status === 'MALPRACTICE' ? 'MALPRAC (0)' : 'EXEMPT'}
                              </span>
                            </div>
                          )}

                          {/* Quick Status Menu */}
                          {editPermission.allowed && (
                            <div className="absolute right-0 top-1 hidden group-hover:flex items-center gap-0.5 bg-slate-950 border border-slate-700 rounded shadow-lg p-0.5 z-30">
                              <button
                                title="Mark Present"
                                onClick={() => handleStatusChange(student.id, q.id, 'PRESENT')}
                                className="px-1 py-0.5 text-[9px] hover:bg-slate-800 text-slate-300 rounded"
                              >
                                P
                              </button>
                              <button
                                title="Mark Absent"
                                onClick={() => handleStatusChange(student.id, q.id, 'ABSENT')}
                                className="px-1 py-0.5 text-[9px] hover:bg-amber-900 text-amber-300 rounded"
                              >
                                AB
                              </button>
                              <button
                                title="Mark Malpractice (0)"
                                onClick={() => handleStatusChange(student.id, q.id, 'MALPRACTICE')}
                                className="px-1 py-0.5 text-[9px] hover:bg-rose-900 text-rose-300 rounded"
                              >
                                MP
                              </button>
                              <button
                                title="Mark Exempted"
                                onClick={() => handleStatusChange(student.id, q.id, 'EXEMPTED')}
                                className="px-1 py-0.5 text-[9px] hover:bg-purple-900 text-purple-300 rounded"
                              >
                                EX
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Student Total Score */}
                    <td className="p-3 text-center border-r border-slate-800 bg-slate-950/40">
                      <div className="font-mono font-bold text-sm text-white">
                        {hasMalpractice ? (
                          <span className="text-rose-400">0.0</span>
                        ) : hasAbsent && studentTotalMarks === 0 ? (
                          <span className="text-amber-400 text-xs">ABSENT</span>
                        ) : (
                          studentTotalMarks.toFixed(1)
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {totalMaxMarks > 0
                          ? `${((studentTotalMarks / totalMaxMarks) * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </td>

                    {/* Status Flag */}
                    <td className="p-3 text-center">
                      {hasMalpractice ? (
                        <span className="text-[10px] text-rose-400 font-semibold">Flagged</span>
                      ) : totalMaxMarks > 0 && studentTotalMarks >= 0.6 * totalMaxMarks ? (
                        <span className="text-[10px] text-emerald-400 font-semibold">Target Met</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Administrative Window Unlock</h3>
            <p className="text-xs text-slate-300">
              Provide a reason for administrative unlock in compliance with audit requirements.
            </p>
            <textarea
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Approved medical re-test entry..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStateTransition('UNLOCKED_BY_ADMIN')}
                disabled={unlockReason.trim().length < 10}
                className="px-3 py-1.5 bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                Confirm Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
