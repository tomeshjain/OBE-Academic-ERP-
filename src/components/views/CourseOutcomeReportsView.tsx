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
} from 'lucide-react';

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

  // Local config form state
  const [targetCutoffPct, setTargetCutoffPct] = useState(config.targetCutoffPct);
  const [directWeight, setDirectWeight] = useState(config.directWeight);
  const [indirectWeight, setIndirectWeight] = useState(config.indirectWeight);
  const [defaultTargetLevel, setDefaultTargetLevel] = useState(config.defaultTargetLevel);

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === activeCourseId) || courses[0];
  }, [courses, activeCourseId]);

  const activeProgram = useMemo(() => {
    return (
      programs.find((p) => p.id === activeCourse?.programId) ||
      programs.find((p) => p.id === activeProgramId) ||
      programs[0]
    );
  }, [programs, activeCourse, activeProgramId]);

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

  // Live OBE Attainment Computation
  const report = useMemo(() => {
    if (
      courseSpecificOutcomes.length === 0 ||
      questions.length === 0 ||
      students.length === 0
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
      sectionName: 'A',
      academicYear: '2026-2027',
      courseOutcomes: courseSpecificOutcomes,
      programOutcomes: isolatedProgramOutcomes,
      questions,
      enrollments: students,
      markEntries: marks,
      coPoMappings,
      surveyResponses,
    });
  }, [
    activeCourse,
    courseSpecificOutcomes,
    isolatedProgramOutcomes,
    questions,
    students,
    marks,
    coPoMappings,
    surveyResponses,
    config,
  ]);

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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <span>Menu Item 9</span>
              <span>&bull;</span>
              <span>Outcome-Based Education Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Course Outcome Reports
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Multi-tier NBA/ABET attainment engine computing Course Outcome (CO) direct/indirect achievement and Program Outcome (PO/PSO) articulation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Attainment Rules</span>
            </button>

            {/* Sub-menu Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => switchSubTab('co')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'co'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>CO Attainment</span>
              </button>
              <button
                onClick={() => switchSubTab('po')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'po'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>PO/PSO Matrix & Radar</span>
              </button>
              <button
                onClick={() => switchSubTab('accreditation')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'accreditation'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Audit Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Course & Program Selector Filter Bar */}
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
              {courses.length === 0 ? (
                <option value="">No courses created (See Menu 5)</option>
              ) : (
                courses.map((c) => (
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
              {programs.length === 0 ? (
                <option value="">No programs created (See Menu 3)</option>
              ) : (
                programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.batchYear || '2026-2030'})
                  </option>
                ))
              )}
            </select>
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
            1. Defined Course Outcomes in <strong>Menu 5 (Courses)</strong>
            <br />
            2. Prepared Questions in <strong>Menu 7 (Assessment & Question Papers)</strong>
            <br />
            3. Enrolled students and entered marks in <strong>Menu 8 (Filling of Question Wise Marks)</strong>
          </p>
        </div>
      ) : (
        <>
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
                    Each academic program maintains its own isolated POs and PSOs. Navigate to Menu Item 3 (Programs and Program Outcomes) to add POs or load NBA Reference suggestions.
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
            </div>
          )}

          {/* SUB-TAB 3: ACCREDITATION AUDIT SUMMARY */}
          {activeSubTab === 'accreditation' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl print:border-none print:shadow-none print:p-0">
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
                      Outcome-Based Education (OBE) Attainment Compliance Report &bull; Batch 2026
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto print:hidden"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Formal Report</span>
                </button>
              </div>

              {/* Institutional & Course Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Course</span>
                  <span className="text-white font-semibold">{activeCourse?.code} - {activeCourse?.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Program & Cohort</span>
                  <span className="text-white font-semibold">{activeProgram?.name} (2026 Batch)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Regulation</span>
                  <span className="text-white font-semibold">{activeCourse?.regulation || 'R2026'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Accreditation Standard</span>
                  <span className="text-teal-400 font-semibold">NBA Tier-I / ABET EAC / NAAC 2.6.2</span>
                </div>
              </div>

              {/* Summary Stats Table */}
              <div className="pt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-3">Course Outcome Attainment Matrix</h4>
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

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-slate-200">Accreditation Certification:</span> This report certifies that question-level evaluation was conducted under strict freeze-guard security in accordance with institutional outcome-based education standards for the 2026 Batch cohort.
                </div>
              </div>
            </div>
          )}
        </>
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
