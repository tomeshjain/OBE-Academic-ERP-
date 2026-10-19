'use client';

import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Clock,
  ShieldCheck,
  AlertOctagon,
  History,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { AssessmentWindowRecord, AssessmentWindowStatus } from '@/types/erp';

interface WindowScheduleItem extends AssessmentWindowRecord {
  courseCode: string;
  courseTitle: string;
  section: string;
  totalStudents: number;
  evaluatedCount: number;
}

const mockWindows: WindowScheduleItem[] = [
  {
    id: 'win-mid1',
    sectionId: 'sec-a',
    subComponentId: 'sub-mid1',
    subComponentName: 'Continuous Internal Evaluation (CIE) - Mid-Term Exam 1',
    questionPaperId: 'qp-mid1',
    courseCode: 'CS301',
    courseTitle: 'Advanced Data Structures & Algorithmic Analysis',
    section: 'Section A',
    totalStudents: 15,
    evaluatedCount: 15,
    status: 'DRAFT',
    openDateTime: '2026-10-01T09:00:00Z',
    closeDateTime: '2026-10-30T23:59:59Z',
  },
  {
    id: 'win-mid1-b',
    sectionId: 'sec-b',
    subComponentId: 'sub-mid1',
    subComponentName: 'Continuous Internal Evaluation (CIE) - Mid-Term Exam 1',
    questionPaperId: 'qp-mid1',
    courseCode: 'CS301',
    courseTitle: 'Advanced Data Structures & Algorithmic Analysis',
    section: 'Section B',
    totalStudents: 60,
    evaluatedCount: 60,
    status: 'SUBMITTED',
    openDateTime: '2026-10-01T09:00:00Z',
    closeDateTime: '2026-10-25T23:59:59Z',
    submittedAt: '2026-10-24T14:30:00Z',
    submittedBy: 'Prof. Marcus Vance',
  },
  {
    id: 'win-lab1',
    sectionId: 'sec-a',
    subComponentId: 'sub-lab1',
    subComponentName: 'Lab Practical Continuous Assessment (CIE)',
    questionPaperId: 'qp-lab1',
    courseCode: 'CS301',
    courseTitle: 'Advanced Data Structures & Algorithmic Analysis',
    section: 'Section A',
    totalStudents: 15,
    evaluatedCount: 15,
    status: 'FROZEN',
    openDateTime: '2026-09-15T09:00:00Z',
    closeDateTime: '2026-10-10T23:59:59Z',
    frozenAt: '2026-10-11T10:00:00Z',
    frozenBy: 'Dr. Evelyn Vance (HOD)',
  },
  {
    id: 'win-see',
    sectionId: 'sec-a',
    subComponentId: 'sub-see',
    subComponentName: 'Semester End Examination (SEE) - Autonomous Board',
    questionPaperId: 'qp-see',
    courseCode: 'CS301',
    courseTitle: 'Advanced Data Structures & Algorithmic Analysis',
    section: 'Section A',
    totalStudents: 15,
    evaluatedCount: 0,
    status: 'DRAFT',
    openDateTime: '2026-12-01T09:00:00Z',
    closeDateTime: '2026-12-15T23:59:59Z',
  },
];

const mockAuditLogs = [
  {
    id: 'audit-001',
    action: 'WINDOW_FROZEN',
    entity: 'AssessmentWindow: win-lab1 (Lab Practical)',
    actor: 'Dr. Evelyn Vance (HOD)',
    role: 'HOD',
    timestamp: '2026-10-11 10:00:24 IST',
    reason: 'Regular submission deadline reached. 100% section marks verified and sealed.',
  },
  {
    id: 'audit-002',
    action: 'EMERGENCY_OVERRIDE_UNLOCK',
    entity: 'AssessmentWindow: win-mid1 (Mid-Term Exam 1)',
    actor: 'Prof. Nathan Reed (Tenant Admin)',
    role: 'TENANT_ADMIN',
    timestamp: '2026-10-16 16:45:12 IST',
    reason: 'Approved medical re-test entry for student 2026-AIDS-004 per Dean Office Memo #402.',
  },
  {
    id: 'audit-003',
    action: 'DEADLINE_EXTENSION',
    entity: 'AssessmentWindow: win-mid1-b (Section B)',
    actor: 'Dr. Evelyn Vance (HOD)',
    role: 'HOD',
    timestamp: '2026-10-22 11:20:05 IST',
    reason: 'Extended by 3 calendar days due to university cultural symposium.',
  },
];

export const FreezeGuardManager: React.FC = () => {
  const [windows, setWindows] = useState<WindowScheduleItem[]>(mockWindows);
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);

  const toggleFreeze = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const newStatus: AssessmentWindowStatus =
            w.status === 'FROZEN' ? 'UNLOCKED_BY_ADMIN' : 'FROZEN';
          return {
            ...w,
            status: newStatus,
            frozenAt: newStatus === 'FROZEN' ? new Date().toISOString() : undefined,
          };
        }
        return w;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950 px-3 py-1 rounded-full border border-rose-800">
                Governance & Policy Engine (Module C)
              </span>
              <span className="text-xs text-slate-400">Lock / Freeze Windows & Audit Logs</span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Assessment Submission Windows & Freeze Guard Manager
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Admin & HOD authority center to manage open/close windows, emergency overrides, and immutable compliance audit trails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-950 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>RLS & RBAC Guard Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Assessment Windows Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Active Assessment Schedules & Lock Windows</span>
          </h3>
          <span className="text-xs text-slate-400">Semester IV &bull; Academic Year 2026-2027</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="p-3">Course & Assessment</th>
                <th className="p-3">Section</th>
                <th className="p-3">Submission Window Dates</th>
                <th className="p-3 text-center">Progress</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {windows.map((w) => (
                <tr key={w.id} className="hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="font-bold text-white">{w.courseCode}: {w.subComponentName}</div>
                    <div className="text-[10px] text-slate-400">{w.courseTitle}</div>
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-300">{w.section}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-300">
                    <div>Open: {new Date(w.openDateTime).toLocaleDateString()}</div>
                    <div className="text-amber-400 font-semibold">
                      Close: {new Date(w.closeDateTime).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="font-mono font-bold text-white">
                      {w.evaluatedCount} / {w.totalStudents}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {((w.evaluatedCount / (w.totalStudents || 1)) * 100).toFixed(0)}% Entered
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        w.status === 'FROZEN'
                          ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                          : w.status === 'SUBMITTED'
                          ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                          : w.status === 'UNLOCKED_BY_ADMIN'
                          ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                          : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {w.status === 'FROZEN' ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                      <span>{w.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleFreeze(w.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                        w.status === 'FROZEN'
                          ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-800 text-amber-300'
                          : 'bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-300'
                      }`}
                    >
                      {w.status === 'FROZEN' ? 'Emergency Unlock' : 'Force Freeze'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <span>Immutable Accreditation Audit Trail (ABET / NBA Compliance)</span>
          </h3>
          <span className="text-xs text-slate-400">Cryptographically verifiable log</span>
        </div>

        <div className="divide-y divide-slate-800/60 text-xs">
          {mockAuditLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                    {log.action}
                  </span>
                  <span className="font-semibold text-slate-200">{log.entity}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                <strong className="text-slate-300">Justification:</strong> {log.reason}
              </p>
              <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-0.5">
                <span>Actor: <strong className="text-slate-400">{log.actor}</strong></span>
                <span>&bull;</span>
                <span>Role: <strong className="text-indigo-400">{log.role}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
