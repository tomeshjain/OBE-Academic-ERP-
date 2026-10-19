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
  Users,
  Target,
} from 'lucide-react';

export const AttainmentDashboard: React.FC<{ onOpenAdminHub?: () => void }> = ({
  onOpenAdminHub,
}) => {
  const {
    courses,
    activeCourseId,
    courseOutcomes,
    programOutcomes,
    coPoMappings,
    questions,
    students,
    marks,
    surveyResponses,
    config,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'co' | 'po' | 'radar' | 'nba'>('co');
  const [selectedPo, setSelectedPo] = useState<PoAttainmentResult | null>(null);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  // Live Attainment Report Calculation
  const report = useMemo(() => {
    if (courseOutcomes.length === 0 || questions.length === 0 || students.length === 0) {
      return null;
    }

    const engine = new ObeAttainmentCalculator({
      targetCutoffPct: config.targetCutoffPct,
      directWeight: config.directWeight,
      indirectWeight: config.indirectWeight,
      defaultTargetLevel: config.defaultTargetLevel,
    });

    return engine.generateFullReport({
      courseId: activeCourse?.id || 'course-1',
      courseCode: activeCourse?.code || 'CS301',
      courseTitle: activeCourse?.title || 'Data Structures & Algorithms',
      sectionName: 'A',
      academicYear: '2026-2027',
      courseOutcomes,
      programOutcomes,
      questions,
      enrollments: students,
      markEntries: marks,
      coPoMappings,
      surveyResponses,
    });
  }, [
    activeCourse,
    courseOutcomes,
    programOutcomes,
    questions,
    students,
    marks,
    coPoMappings,
    surveyResponses,
    config,
  ]);

  // Radar chart coordinates computation
  const radarData = useMemo(() => {
    if (!report || report.poAttainments.length === 0) return null;

    const list = report.poAttainments;
    const totalPoints = list.length;
    const center = 180;
    const radius = 130;
    const maxScale = 3.0; // scale 0 to 3

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

    list.forEach((po, i) => {
      const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;

      const rAttained = (po.attainedLevel / maxScale) * radius;
      const xAtt = center + rAttained * Math.cos(angle);
      const yAtt = center + rAttained * Math.sin(angle);
      pointsAttained.push({ x: xAtt, y: yAtt });

      const rTarget = (po.targetLevel / maxScale) * radius;
      const xTgt = center + rTarget * Math.cos(angle);
      const yTgt = center + rTarget * Math.sin(angle);
      pointsTarget.push({ x: xTgt, y: yTgt });

      const xEnd = center + radius * Math.cos(angle);
      const yEnd = center + radius * Math.sin(angle);
      const lx = center + (radius + 22) * Math.cos(angle);
      const ly = center + (radius + 22) * Math.sin(angle);

      axes.push({ label: po.code, x2: xEnd, y2: yEnd, lx, ly, po });
    });

    const attainedPolygon = pointsAttained.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const targetPolygon = pointsTarget.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return { center, radius, axes, attainedPolygon, targetPolygon, pointsAttained };
  }, [report]);

  // If prerequisites are missing, show friendly guidance
  if (!report) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center mx-auto">
          <TrendingUp className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">OBE Attainment Engine Ready</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            To generate ABET/NBA attainment radar charts and compliance matrices, make sure you have added:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs pt-2">
          <div className={`p-3 rounded-xl border ${courseOutcomes.length > 0 ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
            <div className="font-bold">1. Course Outcomes</div>
            <div className="text-[11px] mt-0.5">{courseOutcomes.length} defined</div>
          </div>
          <div className={`p-3 rounded-xl border ${questions.length > 0 ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
            <div className="font-bold">2. Exam Questions</div>
            <div className="text-[11px] mt-0.5">{questions.length} created</div>
          </div>
          <div className={`p-3 rounded-xl border ${students.length > 0 ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
            <div className="font-bold">3. Enrolled Roster</div>
            <div className="text-[11px] mt-0.5">{students.length} students</div>
          </div>
        </div>

        {onOpenAdminHub && (
          <button
            onClick={onOpenAdminHub}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-2 mt-4"
          >
            <span>Open Admin Data Hub to Setup Items</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-3 py-1 rounded-full">
                OBE Engine &bull; NBA Tier-I Standard
              </span>
              <span className="text-xs text-slate-400">
                Evaluation Snapshot: {new Date(report.evaluatedAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">
              Outcome Attainment & Accreditation Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {report.courseCode}: {report.courseTitle} &bull; Section {report.sectionName} ({report.academicYear})
            </p>
          </div>

          {/* Quick Export Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Exporting NBA SAR Criterion 3 report...')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Export SAR PDF</span>
            </button>
            <button
              onClick={() => alert('Exporting Attainment Articulation Matrix to Excel (.xlsx)...')}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Export Excel Matrix</span>
            </button>
          </div>
        </div>

        {/* 4 Primary KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Overall Course Attainment</span>
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {report.summary.overallCourseAttainment}
              <span className="text-xs text-slate-400 font-normal"> / 3.0</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Target (2.50)
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>CO Mastery Ratio</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {report.summary.cosAttainedCount} / {report.summary.cosTotalCount}
              <span className="text-xs text-slate-400 font-normal"> COs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {report.summary.cosTotalCount > 0
                ? `${((report.summary.cosAttainedCount / report.summary.cosTotalCount) * 100).toFixed(0)}% Met`
                : '0%'}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Direct vs Indirect Ratio</span>
              <Sliders className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {(report.configuration.directWeight * 100).toFixed(0)} :{' '}
              {(report.configuration.indirectWeight * 100).toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Direct: {report.summary.overallDirectAverage} | Survey: {report.summary.overallIndirectAverage}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Program Outcomes Met</span>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {report.summary.posAttainedCount} / {report.summary.posTotalCount}
              <span className="text-xs text-slate-400 font-normal"> PO/PSOs</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Graduate Attributes Analyzed
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('co')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'co'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          1. Course Outcomes (COs) Attainment
        </button>
        <button
          onClick={() => setActiveTab('po')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'po'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          2. PO & PSO Attainment Table
        </button>
        {radarData && (
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'radar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            3. PO Attainment Radar Chart
          </button>
        )}
        <button
          onClick={() => setActiveTab('nba')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'nba'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          4. NBA Criterion 3 Matrix
        </button>
      </div>

      {/* TAB 1: CO ATTAINMENTS */}
      {activeTab === 'co' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Course Outcomes Direct & Indirect Attainment</h3>
            <p className="text-xs text-slate-400">
              Formulas: Direct = (CIE &times; 0.40) + (SEE &times; 0.60) | Overall CO = (0.80 &times; Direct) + (0.20 &times; Exit Survey)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="p-3">CO Code</th>
                  <th className="p-3">Bloom’s Level</th>
                  <th className="p-3 max-w-[280px]">Outcome Statement</th>
                  <th className="p-3 text-center">Direct Score</th>
                  <th className="p-3 text-center">Indirect Score</th>
                  <th className="p-3 text-center bg-indigo-950/30">Overall Score</th>
                  <th className="p-3 text-center">Target</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {report.overallCoAttainments.map((co) => (
                  <tr key={co.courseOutcomeId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-white text-sm">
                      {co.courseOutcomeCode}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300">
                        {co.bloomsLevel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 leading-relaxed max-w-[280px]">
                      {co.statement}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-200">
                      {co.directScore.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-200">
                      {co.indirectScore.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-base text-white bg-indigo-950/20">
                      {co.overallScore.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">
                      {co.targetLevel.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {co.isAttained ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Met (+{co.variance.toFixed(2)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/60 border border-rose-800 text-rose-300">
                          <AlertCircle className="w-3 h-3" /> Gap ({co.variance.toFixed(2)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PO ATTAINMENTS */}
      {activeTab === 'po' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Program Outcomes & Program Specific Outcomes</h3>
            <p className="text-xs text-slate-400">
              Computed via Articulation Matrix: PO_j = [ &Sigma; (CO_i &times; MappingLevel_i,j) ] / [ &Sigma; MappingLevel_i,j ]
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Graduate Attribute Title</th>
                  <th className="p-3 text-center">Mapped COs</th>
                  <th className="p-3 text-center">Total Weight (&Sigma; W)</th>
                  <th className="p-3 text-center">Attained Level (0-3)</th>
                  <th className="p-3 text-center">Target Level</th>
                  <th className="p-3 text-center">% of Target</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {report.poAttainments.map((po) => (
                  <tr key={po.programOutcomeId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-white text-sm">{po.code}</td>
                    <td className="p-3 font-semibold text-slate-100">{po.title}</td>
                    <td className="p-3 text-center font-mono text-slate-300">{po.mappedCoCount}</td>
                    <td className="p-3 text-center font-mono text-slate-300">{po.totalWeight}</td>
                    <td className="p-3 text-center font-mono font-bold text-base text-white bg-indigo-950/20">
                      {po.attainedLevel.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">{po.targetLevel.toFixed(2)}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={po.attainmentPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                        {po.attainmentPercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {po.isAttained ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 border border-emerald-800 text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Met
                        </span>
                      ) : po.mappedCoCount === 0 ? (
                        <span className="text-[10px] text-slate-500 font-mono">Unmapped</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/70 border border-amber-800 text-amber-300">
                          <AlertCircle className="w-3 h-3" /> Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RADAR CHART */}
      {activeTab === 'radar' && radarData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Graduate Attributes Attainment Radar</h3>
              <p className="text-xs text-slate-400">Comparing Attained vs Target Baselines (0.0 to 3.0 scale)</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="relative w-[360px] h-[360px] shrink-0">
              <svg width="360" height="360" className="overflow-visible">
                {[0.33, 0.66, 1.0].map((ratio, idx) => (
                  <circle
                    key={idx}
                    cx={radarData.center}
                    cy={radarData.center}
                    r={radarData.radius * ratio}
                    fill="none"
                    stroke="#334155"
                    strokeDasharray={ratio < 1 ? '3 3' : undefined}
                    strokeWidth="1"
                  />
                ))}

                {radarData.axes.map((axis, i) => (
                  <g key={i}>
                    <line
                      x1={radarData.center}
                      y1={radarData.center}
                      x2={axis.x2}
                      y2={axis.y2}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text
                      x={axis.lx}
                      y={axis.ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[10px] font-mono font-bold fill-slate-300 cursor-pointer hover:fill-emerald-400"
                      onClick={() => setSelectedPo(axis.po)}
                    >
                      {axis.label}
                    </text>
                  </g>
                ))}

                <polygon
                  points={radarData.targetPolygon}
                  fill="rgba(99, 102, 241, 0.08)"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                <polygon
                  points={radarData.attainedPolygon}
                  fill="rgba(16, 185, 129, 0.25)"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />

                {radarData.pointsAttained.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#10b981"
                    stroke="#022c22"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onClick={() => setSelectedPo(report.poAttainments[i])}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NBA MATRIX */}
      {activeTab === 'nba' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">NBA Self Assessment Report (SAR) - Criterion 3 Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border border-slate-800">
              <thead className="bg-slate-950 text-slate-200">
                <tr>
                  <th className="p-2 border border-slate-800 text-left">Course Code</th>
                  <th className="p-2 border border-slate-800">COs</th>
                  {programOutcomes.map((po) => (
                    <th key={po.id} className="p-2 border border-slate-800">{po.code}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {courseOutcomes.map((co) => (
                  <tr key={co.id}>
                    <td className="p-2 border border-slate-800 text-left font-sans font-bold text-white">
                      {activeCourse?.code || 'CS301'}
                    </td>
                    <td className="p-2 border border-slate-800 font-bold text-indigo-300">{co.code}</td>
                    {programOutcomes.map((po) => {
                      const m = coPoMappings.find(
                        (mapping) =>
                          mapping.courseOutcomeId === co.id &&
                          mapping.programOutcomeId === po.id
                      );
                      return (
                        <td key={po.id} className="p-2 border border-slate-800">
                          {m && m.mappingLevel > 0 ? m.mappingLevel : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
