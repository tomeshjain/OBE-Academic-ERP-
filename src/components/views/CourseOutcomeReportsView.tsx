'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ObeAttainmentCalculator } from '@/lib/attainment-calculator';
import { PoAttainmentResult } from '@/types/obe';
import {
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Sliders,
  Target,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
  GraduationCap,
  Layers,
  Download,
} from 'lucide-react';
import { generateObeAttainmentDossierPdf } from '@/lib/pdf-print-utils';

export const CourseOutcomeReportsView: React.FC = () => {
  const {
    courses,
    activeCourseId,
    setActiveCourseId,
    programs,
    activeProgramId,
    setActiveProgramId,
    courseOutcomes,
    programOutcomes,
    coPoMappings,
    questions,
    students,
    marks,
    surveyResponses,
    config,
    updateConfig,
    tenant,
    activeSubTab: globalSubTab,
    setActiveSubTab: setGlobalSubTab,
    courseSections,
    academicScope,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'co' | 'po' | 'accreditation'>(
    (['co', 'po', 'accreditation'].includes(globalSubTab) ? (globalSubTab as any) : 'co')
  );

  React.useEffect(() => {
    if (['co', 'po', 'accreditation'].includes(globalSubTab)) {
      setActiveSubTab(globalSubTab as any);
    }
  }, [globalSubTab]);

  const switchSubTab = (tab: 'co' | 'po' | 'accreditation') => {
    setActiveSubTab(tab);
    setGlobalSubTab(tab);
  };
  const [selectedPo, setSelectedPo] = useState<PoAttainmentResult | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Local config form state
  const [targetCutoffPct, setTargetCutoffPct] = useState(config.targetCutoffPct);
  const [directWeight, setDirectWeight] = useState(config.directWeight);
  const [indirectWeight, setIndirectWeight] = useState(config.indirectWeight);
  const [defaultTargetLevel, setDefaultTargetLevel] = useState(config.defaultTargetLevel);

  // Customizable Print / PDF Options for Accreditation Dossier
  const [printOptions, setPrintOptions] = useState({
    showSignatures: true,
    showGapAnalysis: true,
    showCqiPlan: true,
    showCoPoMatrix: true,
    showQuestionBreakdown: true,
    showInstituteHeader: true,
  });



  const displayedCourses = academicScope.visibleCourses;
  const activeCourse = useMemo(() => {
    return displayedCourses.find((c) => c.id === activeCourseId) || displayedCourses[0];
  }, [displayedCourses, activeCourseId]);

  const displayedPrograms = academicScope.visiblePrograms;
  const activeProgram = useMemo(() => {
    return (
      displayedPrograms.find((p) => p.id === activeCourse?.programId) ||
      displayedPrograms.find((p) => p.id === activeProgramId) ||
      displayedPrograms[0]
    );
  }, [displayedPrograms, activeCourse, activeProgramId]);

  // Section handling and restriction
  const isSectionFacultyOnly = academicScope.isFaculty && !academicScope.isCoordinator && !academicScope.isHod && !academicScope.isAdmin;
  const courseSectionsForActiveCourse = useMemo(() => {
    return courseSections.filter((s) => s.courseId === activeCourse?.id);
  }, [courseSections, activeCourse]);

  const mappedFacultySections = useMemo(() => {
    return academicScope.mappedSections.filter((s) => s.courseId === activeCourse?.id);
  }, [academicScope, activeCourse]);

  // Default selected section
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');

  // If section faculty, auto-lock to their mapped section
  React.useEffect(() => {
    if (isSectionFacultyOnly) {
      if (mappedFacultySections.length > 0) {
        setSelectedSectionId(mappedFacultySections[0].id);
      } else if (courseSectionsForActiveCourse.length > 0) {
        setSelectedSectionId(courseSectionsForActiveCourse[0].id);
      }
    }
  }, [isSectionFacultyOnly, mappedFacultySections, courseSectionsForActiveCourse]);

  const activeSection = useMemo(() => {
    if (selectedSectionId === 'ALL') return null;
    return courseSectionsForActiveCourse.find((s) => s.id === selectedSectionId) || null;
  }, [courseSectionsForActiveCourse, selectedSectionId]);

  // Filter POs strictly by the active program
  const isolatedProgramOutcomes = useMemo(() => {
    if (!activeProgram) return [];
    return programOutcomes.filter((po) => po.programId === activeProgram.id);
  }, [programOutcomes, activeProgram]);

  // Filter COs strictly by active course
  const courseSpecificOutcomes = useMemo(() => {
    if (!activeCourse) return [];
    return courseOutcomes.filter((co) => co.courseId === activeCourse.id);
  }, [courseOutcomes, activeCourse]);

  // Scoped student enrollments & marks based on section selection
  const scopedEnrollments = useMemo(() => {
    let list = students.filter((s) => !s.courseId || s.courseId === activeCourse?.id);
    if (isSectionFacultyOnly) {
      const targetSecId = selectedSectionId !== 'ALL' ? selectedSectionId : (mappedFacultySections[0]?.id || '');
      if (targetSecId) {
        list = list.filter((s) => s.sectionId === targetSecId);
      }
    } else if (selectedSectionId !== 'ALL') {
      list = list.filter((s) => s.sectionId === selectedSectionId);
    }
    return list;
  }, [students, activeCourse, selectedSectionId, isSectionFacultyOnly, mappedFacultySections]);

  const scopedStudentIds = useMemo(() => new Set(scopedEnrollments.map((s) => s.id)), [scopedEnrollments]);

  const scopedMarks = useMemo(() => {
    return marks.filter((m) => scopedStudentIds.has(m.enrollmentId));
  }, [marks, scopedStudentIds]);

  // Live OBE Attainment Computation
  const report = useMemo(() => {
    if (
      courseSpecificOutcomes.length === 0 ||
      questions.length === 0 ||
      scopedEnrollments.length === 0
    ) {
      return null;
    }

    const engine = new ObeAttainmentCalculator({
      targetCutoffPct: config.targetCutoffPct,
      directWeight: config.directWeight,
      indirectWeight: config.indirectWeight,
      defaultTargetLevel: config.defaultTargetLevel,
    });

    return engine.generateFullReport({
      courseId: activeCourse?.id || 'course-default',
      courseCode: activeCourse?.code || 'CS2026',
      courseTitle: activeCourse?.title || 'Course 2026',
      sectionName: activeSection?.name || (selectedSectionId === 'ALL' ? 'Course-wide (All Sections)' : 'Section A'),
      academicYear: '2026-2027',
      courseOutcomes: courseSpecificOutcomes,
      programOutcomes: isolatedProgramOutcomes,
      questions,
      enrollments: scopedEnrollments,
      markEntries: scopedMarks,
      coPoMappings,
      surveyResponses,
    });
  }, [
    activeCourse,
    activeSection,
    selectedSectionId,
    courseSpecificOutcomes,
    isolatedProgramOutcomes,
    questions,
    scopedEnrollments,
    scopedMarks,
    coPoMappings,
    surveyResponses,
    config,
  ]);

  const handlePrintReport = () => {
    if (!report) {
      alert('OBE Attainment report cannot be printed yet. Please ensure Course Outcomes, question blueprints, and student marks are configured for this course.');
      return;
    }
    generateObeAttainmentDossierPdf({
      tenantName: tenant?.name,
      courseCode: activeCourse?.code || 'COURSE',
      courseTitle: activeCourse?.title || 'Course Title',
      programName: activeProgram?.name || 'Academic Program',
      sectionName: activeSection ? activeSection.name : 'Course-wide Aggregate (All Sections)',
      academicYear: '2026-2027',
      report,
      printOptions,
      action: 'print',
    });
  };

  const handleDownloadPdf = async () => {
    if (!report) {
      alert('OBE Attainment report cannot be exported yet. Please ensure Course Outcomes, question blueprints, and student marks are configured for this course.');
      return;
    }
    try {
      setIsExportingPdf(true);
      generateObeAttainmentDossierPdf({
        tenantName: tenant?.name,
        courseCode: activeCourse?.code || 'COURSE',
        courseTitle: activeCourse?.title || 'Course Title',
        programName: activeProgram?.name || 'Academic Program',
        sectionName: activeSection ? activeSection.name : 'Course-wide Aggregate (All Sections)',
        academicYear: '2026-2027',
        report,
        printOptions,
        action: 'download',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // SVG Radar coordinates computation for Program Outcomes
  const radarData = useMemo(() => {
    if (!report || report.poAttainments.length === 0) return null;

    const list = report.poAttainments;
    const totalPoints = list.length;
    const center = 180;
    const radius = 130;
    const maxScale = 3.0; // scale 0 to 3.0

    const pointsAttained: Array<{ x: number; y: number }> = [];
    const pointsTarget: Array<{ x: number; y: number }> = [];
    const axes: Array<{
      label: string;
      x2: number;
      y2: number;
      lx: number;
      ly: number;
      po: PoAttainmentResult;
    }> = [];

    list.forEach((item, i) => {
      const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
      const x2 = center + radius * Math.cos(angle);
      const y2 = center + radius * Math.sin(angle);

      // Label coordinate slightly outside
      const lx = center + (radius + 24) * Math.cos(angle);
      const ly = center + (radius + 24) * Math.sin(angle);

      axes.push({ label: item.code, x2, y2, lx, ly, po: item });

      // Attained level position
      const rAttained = (Math.min(item.attainedLevel, maxScale) / maxScale) * radius;
      pointsAttained.push({
        x: center + rAttained * Math.cos(angle),
        y: center + rAttained * Math.sin(angle),
      });

      // Target level position
      const rTarget = (Math.min(item.targetLevel, maxScale) / maxScale) * radius;
      pointsTarget.push({
        x: center + rTarget * Math.cos(angle),
        y: center + rTarget * Math.sin(angle),
      });
    });

    const toSvgPath = (pts: Array<{ x: number; y: number }>) =>
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

    return {
      center,
      radius,
      axes,
      attainedPath: toSvgPath(pointsAttained),
      targetPath: toSvgPath(pointsTarget),
    };
  }, [report]);

  const handleSaveConfig = () => {
    updateConfig({
      targetCutoffPct,
      directWeight,
      indirectWeight,
      defaultTargetLevel,
    });
    setShowConfigModal(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              <span>Outcome-Based Education Analytics</span>
              <span>&bull;</span>
              <span>Accreditation Compliance</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Course Outcome Reports</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tier NBA/NAAC/ABET attainment engine computing Course Outcome (CO) achievement, Target vs Attained Gap Analysis, and Continuous Quality Improvement (CQI).
            </p>
          </div>

          {/* Sub-menu Tabs - Placed on Top Right */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto flex-wrap gap-1 shrink-0">
            <button
              onClick={() => switchSubTab('co')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'co'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>CO Attainment</span>
            </button>
            <button
              onClick={() => switchSubTab('po')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'po'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>PO/PSO Matrix &amp; Radar</span>
            </button>
            <button
              onClick={() => switchSubTab('accreditation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'accreditation'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Accreditation Dossier</span>
            </button>
          </div>
        </div>

        {/* Selected Options & Actions Bar - Below Tabs */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Accreditation Engine &bull; NBA Tier-I &bull; NAAC 2.6.2 &bull; ABET EAC
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 rounded-xl text-xs font-semibold shadow-sm transition-colors"
              title="Print Official Attainment Dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              title="Download Ground-Up Vector PDF Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Attainment Rules</span>
            </button>
          </div>
        </div>

        {/* Customizable Report & Print Options Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>Customizable Report &amp; Print Options:</span>
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
                checked={printOptions.showGapAnalysis}
                onChange={(e) => setPrintOptions((p) => ({ ...p, showGapAnalysis: e.target.checked }))}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Gap Analysis</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printOptions.showCqiPlan}
                onChange={(e) => setPrintOptions((p) => ({ ...p, showCqiPlan: e.target.checked }))}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>CQI Action Plan</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printOptions.showCoPoMatrix}
                onChange={(e) => setPrintOptions((p) => ({ ...p, showCoPoMatrix: e.target.checked }))}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>CO-PO Articulation</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printOptions.showQuestionBreakdown}
                onChange={(e) => setPrintOptions((p) => ({ ...p, showQuestionBreakdown: e.target.checked }))}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Question-Level Drilldown</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printOptions.showInstituteHeader}
                onChange={(e) => setPrintOptions((p) => ({ ...p, showInstituteHeader: e.target.checked }))}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Institutional Header</span>
            </label>
          </div>
        </div>

        {/* Course, Program & Section Selector Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Select Course
            </label>
            <select
              value={activeCourse?.id || ''}
              onChange={(e) => setActiveCourseId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {displayedCourses.length === 0 ? (
                <option value="">No courses created (See Courses &amp; Curriculum)</option>
              ) : (
                displayedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title} ({c.regulation || 'R2026'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Select Program (for POs & PSOs)
            </label>
            <select
              value={activeProgram?.id || ''}
              onChange={(e) => setActiveProgramId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {displayedPrograms.length === 0 ? (
                <option value="">No programs created (See Programs &amp; Outcomes)</option>
              ) : (
                displayedPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.batchYear || '2026-2030'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Section Filter / Scoping */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Section Scope
            </label>
            {isSectionFacultyOnly ? (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeSection?.name || mappedFacultySections[0]?.name || 'Assigned Section'}</span>
                <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-1.5 py-0.5 rounded ml-1">
                  Your Section Only
                </span>
              </div>
            ) : (
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Sections (Course-wide Aggregate)</option>
                {courseSectionsForActiveCourse.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.facultyName || 'Faculty'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3 text-slate-400 pt-3 sm:pt-0">
            <span className="bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
              Cutoff: <strong className="text-white">{config.targetCutoffPct}%</strong>
            </span>
            <span className="bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
              Direct: <strong className="text-white">{config.directWeight * 100}%</strong>
            </span>
            <span className="bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
              Target Level: <strong className="text-white">{config.defaultTargetLevel} / 3.0</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Empty State / Notice if prerequisites missing */}
      {!report ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Attainment Data Available Yet</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-lg mx-auto">
            To compute attainment reports, ensure you have:
            <br />
            1. Defined Course Outcomes in <strong>Courses &amp; Curriculum</strong>
            <br />
            2. Prepared Questions in <strong>Assessment &amp; Question Papers</strong>
            <br />
            3. Enrolled students and entered marks in <strong>Mark Entry Matrix</strong>
          </p>
        </div>
      ) : (
        <div id="printable-attainment-report" className="space-y-6">
          {/* Printable Official Header for Attainment Dossier */}
          {printOptions.showInstituteHeader && (
            <div className="p-6 border-b-2 border-slate-900 mb-4 text-center bg-white text-slate-950 font-serif rounded-xl border border-slate-200 shadow-sm">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-slate-950">
                {tenant?.name || 'CENTRAL UNIVERSITY OF TECHNOLOGY'}
              </h1>
              <h2 className="text-sm sm:text-base font-semibold uppercase text-slate-700 mt-1">
                {activeCourse?.code} - {activeCourse?.title} OBE Attainment Dossier
              </h2>
              <div className="text-xs text-slate-600 mt-1">
                Program: {activeProgram?.name} &bull; Scope: {activeSection?.name || (selectedSectionId === 'ALL' ? 'Course-wide Aggregate' : 'Section')} &bull; Academic Year 2026-27
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Accreditation Standards: NBA Tier-I (Criterion 3) &bull; NAAC Criterion 2.6.2 &bull; ABET EAC Criterion 3 &amp; 4
              </div>
            </div>
          )}

          {/* SUB-TAB 1: CO ATTAINMENT ANALYSIS */}
          {activeSubTab === 'co' && (
            <div className="space-y-6">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Assessed COs
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {report.overallCoAttainments.length}
                  </div>
                  <div className="text-[11px] text-indigo-400 mt-1">
                    {activeCourse?.code} &bull; Batch 2026
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    COs Target Achieved
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {report.overallCoAttainments.filter((c) => c.isAttained).length}
                    <span className="text-xs text-slate-500 font-normal">
                      {' '}/ {report.overallCoAttainments.length}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Target Level &ge; {config.defaultTargetLevel}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Questions Assessed
                  </div>
                  <div className="text-2xl font-black text-teal-400 mt-1">
                    {report.questionAttainments.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Across CIE & Assessment Windows
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Enrolled Students Assessed
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {students.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Active Roster (Batch 2026)
                  </div>
                </div>
              </div>

              {/* CO Direct & Indirect Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span>Course Outcome Attainment Rubric (NBA 3-Tier Model)</span>
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Formula: Overall = ({config.directWeight * 100}% &times; Direct) + ({config.indirectWeight * 100}% &times; Indirect)
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="px-4 py-3">CO Code</th>
                        <th className="px-4 py-3 min-w-[220px]">Course Outcome Statement</th>
                        <th className="px-4 py-3">Bloom's</th>
                        <th className="px-4 py-3 text-center">Direct Score (0-3)</th>
                        <th className="px-4 py-3 text-center">Indirect (0-3)</th>
                        <th className="px-4 py-3 text-center">Overall (0-3)</th>
                        <th className="px-4 py-3 text-center">Target</th>
                        <th className="px-4 py-3 text-center">Variance</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {report.overallCoAttainments.map((co) => (
                        <tr key={co.courseOutcomeId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                            {co.courseOutcomeCode}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {co.statement}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              {co.bloomsLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                            {co.directScore.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {co.indirectScore.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-teal-300">
                            {co.overallScore.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {co.targetLevel.toFixed(1)}
                          </td>
                          <td
                            className={`px-4 py-3 text-center font-mono font-bold ${
                              co.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {co.variance >= 0 ? `+${co.variance.toFixed(2)}` : co.variance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                co.isAttained
                                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                                  : 'bg-rose-950 border border-rose-800 text-rose-300'
                              }`}
                            >
                              {co.isAttained ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {co.isAttained ? 'Attained' : 'Action Req'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Question Level Direct Attainment Drilldown */}
              {printOptions.showQuestionBreakdown && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                      <span>Question-Level Direct Attainment Breakdown</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Evaluates students scoring &ge; {config.targetCutoffPct}% of maximum marks for each question item.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3">Question</th>
                          <th className="px-4 py-3">Max Marks</th>
                          <th className="px-4 py-3">Threshold Score</th>
                          <th className="px-4 py-3 text-center">Enrolled</th>
                          <th className="px-4 py-3 text-center">Assessed</th>
                          <th className="px-4 py-3 text-center">Absentees</th>
                          <th className="px-4 py-3 text-center">Students &ge; Threshold</th>
                          <th className="px-4 py-3 text-center">Attainment %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {report.questionAttainments.map((q) => (
                          <tr key={q.questionId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-white">
                              {q.questionNumber}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {q.maxMarks}M
                            </td>
                            <td className="px-4 py-3 text-indigo-300 font-semibold">
                              {q.thresholdScore.toFixed(1)}M ({q.targetThresholdPct}%)
                            </td>
                            <td className="px-4 py-3 text-center text-slate-400">
                              {q.totalEnrolled}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-white">
                              {q.totalAssessed}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500">
                              {q.totalAbsentees}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-400">
                              {q.studentsAttained}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  q.attainmentPercentage >= 70
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : q.attainmentPercentage >= 60
                                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {q.attainmentPercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ACCREDITATION TABLE: TARGET VS ATTAINED GAP ANALYSIS (NBA CRITERION 3) */}
              {printOptions.showGapAnalysis && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>Accreditation Target vs. Attained Gap Analysis (NBA Criterion 3.2)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mandated gap assessment between Program-specified Target Attainment (Scale 0-3.0) and Cumulative Evaluation.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      Target Threshold: {config.defaultTargetLevel.toFixed(1)} / 3.0
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3">CO Code</th>
                          <th className="px-4 py-3 min-w-[220px]">Course Outcome Statement</th>
                          <th className="px-4 py-3 text-center">Target Level</th>
                          <th className="px-4 py-3 text-center">Attained Level</th>
                          <th className="px-4 py-3 text-center">Variance / Gap</th>
                          <th className="px-4 py-3 text-center">Attainment Status</th>
                          <th className="px-4 py-3 text-center">Deficit Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {report.overallCoAttainments.map((co) => {
                          const gap = co.overallScore - co.targetLevel;
                          const gapCategory =
                            gap >= 0
                              ? 'Target Achieved'
                              : gap >= -0.25
                              ? 'Marginal Deficit'
                              : 'Critical Gap';

                          return (
                            <tr key={co.courseOutcomeId} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                                {co.courseOutcomeCode}
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">
                                {co.statement}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-400">
                                {co.targetLevel.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-white">
                                {co.overallScore.toFixed(2)}
                              </td>
                              <td
                                className={`px-4 py-3 text-center font-mono font-bold ${
                                  gap >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    co.isAttained
                                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                                      : 'bg-rose-950 border border-rose-800 text-rose-300'
                                  }`}
                                >
                                  {co.isAttained ? 'Attained' : 'Gap Exists'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    gap >= 0
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                      : gap >= -0.25
                                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                      : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {gapCategory}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ACCREDITATION TABLE: CONTINUOUS QUALITY IMPROVEMENT (CQI) ACTION PLAN (NBA CRITERION 3.3) */}
              {printOptions.showCqiPlan && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                      <span>Continuous Quality Improvement (CQI) Action Plan (NBA Criterion 3.3 / NAAC 2.6.2)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Formal corrective actions mandated by the Department Academic Committee (DAC) for Course Outcomes with learning deficits or attainment gaps.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3 w-24">CO Code</th>
                          <th className="px-4 py-3 w-32 text-center">Status &amp; Gap</th>
                          <th className="px-4 py-3 min-w-[200px]">Diagnostic Root Cause Analysis</th>
                          <th className="px-4 py-3 min-w-[220px]">Corrective / Remedial Action Proposed</th>
                          <th className="px-4 py-3 w-40">Responsible Authority</th>
                          <th className="px-4 py-3 w-32 text-center">Review Timeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {report.overallCoAttainments.map((co) => {
                          const gap = co.overallScore - co.targetLevel;
                          const defaultAction =
                            co.isAttained
                              ? 'Attainment target fulfilled. Continue existing pedagogy, enhance self-learning and open-ended challenge questions.'
                              : gap >= -0.25
                              ? 'Marginal gap detected. Conduct 2 dedicated tutorial sessions, provide structured revision worksheets, and include formative quizzes.'
                              : 'Critical attainment gap. Redesign course delivery module, introduce hands-on laboratory simulation drills, and organize peer-assisted mentoring.';

                          const defaultWeakness =
                            co.isAttained
                              ? 'Cohort demonstrated solid conceptual grasp and consistent threshold achievement.'
                              : gap >= -0.25
                              ? 'Minor drop in higher-order cognitive application questions during continuous internal evaluations.'
                              : 'Difficulty observed in multi-step analytical problem solving and design implementation components.';

                          return (
                            <tr key={co.courseOutcomeId} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                                {co.courseOutcomeCode}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    co.isAttained
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {co.isAttained ? 'Satisfied' : `Gap (${gap.toFixed(2)})`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {defaultWeakness}
                              </td>
                              <td className="px-4 py-3 text-slate-200 text-xs font-medium">
                                {defaultAction}
                              </td>
                              <td className="px-4 py-3 text-slate-300 font-semibold">
                                {activeSection?.facultyName || 'Course Coordinator & Faculty'}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-400 text-xs">
                                Next Academic Cycle
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOCUMENT SIGN-OFF FOOTER (OFFICIAL ACADEMIC SIGNATURES) */}
              {printOptions.showSignatures && (
                <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-lg font-serif">
                  <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-600 mb-6 border-b border-slate-200 pb-2">
                    Official Institutional Accreditation Sign-Off &amp; Academic Committee Endorsement
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-800">
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        Course Coordinator / Lead Faculty
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Primary Course Instructor</div>
                    </div>
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        DAC Convener / Module Lead
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Department Academic Committee</div>
                    </div>
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        Head of Department (HOD)
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Program Chair &amp; Final Approval</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: PO & PSO ATTAINMENT MATRIX & RADAR */}
          {activeSubTab === 'po' && (
            <div className="space-y-6">
              {isolatedProgramOutcomes.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
                  <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">
                    No Program Outcomes for "{activeProgram?.name}"
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                    Each academic program maintains its own isolated POs and PSOs. Navigate to Programs &amp; Outcomes to add POs or load NBA Reference suggestions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: SVG Radar Chart */}
                  <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2 self-start">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span>PO / PSO Attainment Radar (Scale 0.0 - 3.0)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4 self-start">
                      Comparing Target Level vs Attained Level for {activeProgram?.name} (Batch 2026).
                    </p>

                    {radarData ? (
                      <div className="relative">
                        <svg
                          width="360"
                          height="360"
                          viewBox="0 0 360 360"
                          className="overflow-visible"
                        >
                          {/* Background Grid Rings */}
                          {[1, 2, 3].map((level) => {
                            const r = (level / 3.0) * radarData.radius;
                            return (
                              <circle
                                key={level}
                                cx={radarData.center}
                                cy={radarData.center}
                                r={r}
                                fill="none"
                                stroke="#334155"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                            );
                          })}

                          {/* Axes */}
                          {radarData.axes.map((axis, i) => (
                            <g key={i}>
                              <line
                                x1={radarData.center}
                                y1={radarData.center}
                                x2={axis.x2}
                                y2={axis.y2}
                                stroke="#1e293b"
                                strokeWidth="1.5"
                              />
                              <text
                                x={axis.lx}
                                y={axis.ly}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#94a3b8"
                                fontSize="10"
                                fontWeight="bold"
                                className="cursor-pointer hover:fill-white transition-colors"
                                onClick={() => setSelectedPo(axis.po)}
                              >
                                {axis.label}
                              </text>
                            </g>
                          ))}

                          {/* Target Polygon (Dashed Slate) */}
                          <path
                            d={radarData.targetPath}
                            fill="rgba(148, 163, 184, 0.1)"
                            stroke="#64748b"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />

                          {/* Attained Polygon (Glowing Indigo) */}
                          <path
                            d={radarData.attainedPath}
                            fill="rgba(99, 102, 241, 0.25)"
                            stroke="#6366f1"
                            strokeWidth="2.5"
                          />
                        </svg>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
                            <span className="text-slate-300 font-medium">Attained Level</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
                            <span className="text-slate-400">Target Level (2.5)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs py-12">Insufficient data for radar</div>
                    )}
                  </div>

                  {/* Right: PO & PSO Attainment Table */}
                  <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-800">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-teal-400" />
                        <span>Weighted Articulation Attainment Values</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PO values calculated from CO articulation levels and mapped weights.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                            <th className="px-4 py-3">PO / PSO</th>
                            <th className="px-4 py-3 min-w-[180px]">Outcome Title</th>
                            <th className="px-4 py-3 text-center">Mapped COs</th>
                            <th className="px-4 py-3 text-center">Attained</th>
                            <th className="px-4 py-3 text-center">Target</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {report.poAttainments.map((item) => (
                            <tr
                              key={item.programOutcomeId}
                              onClick={() => setSelectedPo(item)}
                              className={`cursor-pointer transition-colors ${
                                selectedPo?.programOutcomeId === item.programOutcomeId
                                  ? 'bg-indigo-950/40'
                                  : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                                {item.code}
                              </td>
                              <td className="px-4 py-3 text-slate-200">
                                {item.title}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-400">
                                {item.mappedCoCount}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-white">
                                {item.attainedLevel.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-400">
                                {item.targetLevel.toFixed(1)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.isAttained
                                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                                      : 'bg-rose-950 border border-rose-800 text-rose-300'
                                  }`}
                                >
                                  {item.isAttained ? 'Attained' : 'Gap Exists'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Continuous Improvement Recommendation Card */}
                    {selectedPo && (
                      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-indigo-300">
                            Accreditation Continuous Improvement Note: {selectedPo.code}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Attainment: {selectedPo.attainedLevel} / {selectedPo.targetLevel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedPo.isAttained
                            ? `Criterion satisfied. The cohort demonstrated mastery of ${selectedPo.code} with an attainment level of ${selectedPo.attainedLevel}. Recommendation: Maintain current pedagogical and assessment practices.`
                            : `Attainment gap detected for ${selectedPo.code} (-${(selectedPo.targetLevel - selectedPo.attainedLevel).toFixed(2)}). Corrective action: Enhance laboratory assignments and conduct remedial tutorial sessions before the next assessment cycle.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CO-PO ARTICULATION MATRIX (NBA CRITERION 3.1 & 3.2) */}
              {printOptions.showCoPoMatrix && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span>Course Articulation Matrix (CO-PO / PSO Mapping &amp; Contribution)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Correlation Levels: <strong>1</strong> (Slight/Low), <strong>2</strong> (Moderate/Medium), <strong>3</strong> (Substantial/High). Formula: &Sigma;(CO Attainment &times; Level) / &Sigma;(Levels).
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="px-3 py-2.5 font-bold text-white w-20">CO Code</th>
                          <th className="px-3 py-2.5 text-center w-16">Target</th>
                          <th className="px-3 py-2.5 text-center w-16">Attained</th>
                          {isolatedProgramOutcomes.map((po) => (
                            <th key={po.id} className="px-2.5 py-2.5 text-center font-mono font-bold text-indigo-300">
                              {po.code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
                        {report.overallCoAttainments.map((co) => (
                          <tr key={co.courseOutcomeId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-white font-sans">{co.courseOutcomeCode}</td>
                            <td className="px-3 py-2.5 text-center text-slate-400">{co.targetLevel.toFixed(1)}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-teal-300">{co.overallScore.toFixed(2)}</td>
                            {isolatedProgramOutcomes.map((po) => {
                              const map = coPoMappings.find(
                                (m) => m.courseOutcomeId === co.courseOutcomeId && m.programOutcomeId === po.id
                              );
                              return (
                                <td key={po.id} className="px-2.5 py-2.5 text-center">
                                  {map && map.mappingLevel > 0 ? (
                                    <span className="font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                                      {map.mappingLevel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* Average Mapping & Attainment Summary Row */}
                        <tr className="bg-slate-950/80 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={3} className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] text-slate-300">
                            PO/PSO Direct Attained Score:
                          </td>
                          {isolatedProgramOutcomes.map((po) => {
                            const poAtt = report.poAttainments.find((p) => p.programOutcomeId === po.id);
                            return (
                              <td key={po.id} className="px-2.5 py-2.5 text-center font-mono text-xs font-black text-amber-300">
                                {poAtt ? poAtt.attainedLevel.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOCUMENT SIGN-OFF FOOTER (OFFICIAL ACADEMIC SIGNATURES) */}
              {printOptions.showSignatures && (
                <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-lg font-serif">
                  <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-600 mb-6 border-b border-slate-200 pb-2">
                    Official Institutional Accreditation Sign-Off &amp; Academic Committee Endorsement
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-800">
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        Course Coordinator / Lead Faculty
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Primary Course Instructor</div>
                    </div>
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        DAC Convener / Module Lead
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Department Academic Committee</div>
                    </div>
                    <div>
                      <div className="h-10"></div>
                      <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                        Head of Department (HOD)
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">Program Chair &amp; Final Approval</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 3: ACCREDITATION AUDIT SUMMARY */}
          {activeSubTab === 'accreditation' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl print:border-none print:shadow-none print:p-0 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {tenant?.name || 'Academic Institution'}
                    </h2>
                    <div className="text-xs text-slate-400">
                      Outcome-Based Education (OBE) Attainment Compliance Dossier &bull; Batch 2026
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto print:hidden"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Formal Dossier</span>
                </button>
              </div>

              {/* Institutional & Course Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Course</span>
                  <span className="text-white font-semibold">{activeCourse?.code} - {activeCourse?.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Program &amp; Cohort</span>
                  <span className="text-white font-semibold">{activeProgram?.name} (2026 Batch)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Regulation</span>
                  <span className="text-white font-semibold">{activeCourse?.regulation || 'R2026'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Accreditation Standards</span>
                  <span className="text-teal-400 font-semibold">NBA Tier-I Criterion 3 &bull; NAAC 2.6.2 &bull; ABET EAC</span>
                </div>
              </div>

              {/* Summary Stats Table */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span>Course Outcome Attainment Matrix</span>
                  </h4>
                  <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="p-3">CO Code</th>
                        <th className="p-3">Direct Score</th>
                        <th className="p-3">Indirect Score</th>
                        <th className="p-3">Overall Attained</th>
                        <th className="p-3">Target</th>
                        <th className="p-3">Outcome Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                      {report.overallCoAttainments.map((co) => (
                        <tr key={co.courseOutcomeId}>
                          <td className="p-3 font-bold text-indigo-300">{co.courseOutcomeCode}</td>
                          <td className="p-3">{co.directScore.toFixed(2)}</td>
                          <td className="p-3">{co.indirectScore.toFixed(2)}</td>
                          <td className="p-3 font-bold text-white">{co.overallScore.toFixed(2)}</td>
                          <td className="p-3 text-slate-400">{co.targetLevel.toFixed(1)}</td>
                          <td className="p-3">
                            <span className={co.isAttained ? 'text-emerald-400' : 'text-rose-400'}>
                              {co.isAttained ? 'ACHIEVED' : 'TARGET NOT MET'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Target vs Attained Gap Analysis Table (Accreditation Tab) */}
                {printOptions.showGapAnalysis && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span>Target vs. Attained Gap Analysis (NBA Criterion 3.2)</span>
                    </h4>
                    <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="p-3">CO Code</th>
                          <th className="p-3">Course Outcome Statement</th>
                          <th className="p-3 text-center">Target Level</th>
                          <th className="p-3 text-center">Attained Level</th>
                          <th className="p-3 text-center">Variance / Gap</th>
                          <th className="p-3 text-center">Compliance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                        {report.overallCoAttainments.map((co) => {
                          const gap = co.overallScore - co.targetLevel;
                          return (
                            <tr key={co.courseOutcomeId}>
                              <td className="p-3 font-bold text-indigo-300">{co.courseOutcomeCode}</td>
                              <td className="p-3 font-sans text-xs text-slate-300">{co.statement}</td>
                              <td className="p-3 text-center text-slate-400">{co.targetLevel.toFixed(2)}</td>
                              <td className="p-3 text-center font-bold text-white">{co.overallScore.toFixed(2)}</td>
                              <td className={`p-3 text-center font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                              </td>
                              <td className="p-3 text-center font-sans">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${co.isAttained ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                                  {co.isAttained ? 'COMPLIANT' : 'DEFICIT'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* CQI Action Plan (Accreditation Tab) */}
                {printOptions.showCqiPlan && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                      <span>Continuous Quality Improvement (CQI) Action Plan (NBA Criterion 3.3)</span>
                    </h4>
                    <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="p-3 w-20">CO Code</th>
                          <th className="p-3 w-28 text-center">Status</th>
                          <th className="p-3">Diagnostic Analysis</th>
                          <th className="p-3">Mandated Corrective Action</th>
                          <th className="p-3 w-36">Timeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 text-xs">
                        {report.overallCoAttainments.map((co) => {
                          const gap = co.overallScore - co.targetLevel;
                          return (
                            <tr key={co.courseOutcomeId}>
                              <td className="p-3 font-mono font-bold text-indigo-300">{co.courseOutcomeCode}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${co.isAttained ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                                  {co.isAttained ? 'Achieved' : `Gap (${gap.toFixed(2)})`}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 text-xs">
                                {co.isAttained
                                  ? 'Satisfied performance standards across continuous internal evaluations and semester examinations.'
                                  : 'Deficit identified in higher-order taxonomy cognitive application questions.'}
                              </td>
                              <td className="p-3 text-slate-200 text-xs">
                                {co.isAttained
                                  ? 'Maintain existing syllabus delivery cadence with advanced case study seminars.'
                                  : 'Schedule 2 specialized tutorial workshops and provide structured remedial problem sets.'}
                              </td>
                              <td className="p-3 font-mono text-slate-400 text-xs">Next Academic Term</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-slate-200">Accreditation Certification:</span> This report certifies that question-level evaluation was conducted under strict freeze-guard security in accordance with institutional outcome-based education standards for the 2026 Batch cohort.
                </div>

                {/* Academic Signatures Block in Accreditation Tab */}
                {printOptions.showSignatures && (
                  <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-lg font-serif mt-6">
                    <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-600 mb-6 border-b border-slate-200 pb-2">
                      Official Institutional Accreditation Sign-Off &amp; Academic Committee Endorsement
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-800">
                      <div>
                        <div className="h-10"></div>
                        <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                          Course Coordinator / Lead Faculty
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">Primary Course Instructor</div>
                      </div>
                      <div>
                        <div className="h-10"></div>
                        <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                          DAC Convener / Module Lead
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">Department Academic Committee</div>
                      </div>
                      <div>
                        <div className="h-10"></div>
                        <div className="border-t-2 border-slate-900 pt-1.5 font-bold uppercase">
                          Head of Department (HOD)
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">Program Chair &amp; Final Approval</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIGURATION RULES MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Attainment Calculation Rules</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Target Cutoff Percentage (% of question marks required to pass threshold)
                </label>
                <input
                  type="number"
                  min="30"
                  max="100"
                  value={targetCutoffPct}
                  onChange={(e) => setTargetCutoffPct(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reference: 60% is standard for NBA Tier-I accreditation.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Direct Attainment Weight (Ratio 0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={directWeight}
                  onChange={(e) => {
                    const dw = Number(e.target.value);
                    setDirectWeight(dw);
                    setIndirectWeight(Number((1 - dw).toFixed(2)));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Currently {directWeight * 100}% Direct, {indirectWeight * 100}% Indirect.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Default Target Attainment Level (Scale 0.0 to 3.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={defaultTargetLevel}
                  onChange={(e) => setDefaultTargetLevel(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reference: 2.5 is typical target for accredited engineering programs.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
