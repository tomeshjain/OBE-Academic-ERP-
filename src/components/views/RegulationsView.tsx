'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicRegulation } from '@/types/erp';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  Scale,
  Calendar,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export const RegulationsView: React.FC = () => {
  const {
    regulations,
    addRegulation,
    addRegulationsBatch,
    updateRegulation,
    deleteRegulation,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const canManageRegulations = academicScope.isAdmin || academicScope.isHeadOfFaculty;

  const [subTab, setSubTab] = useState<'regulations' | 'framework'>(
    (['regulations', 'framework'].includes(activeSubTab) ? (activeSubTab as any) : 'regulations')
  );

  React.useEffect(() => {
    if (['regulations', 'framework'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'regulations' | 'framework') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [yearOfInception, setYearOfInception] = useState(2026);
  const [totalCredits, setTotalCredits] = useState(160);
  const [gradeSystem, setGradeSystem] = useState('10-Point Relative Grading (Batch 2026)');
  const [description, setDescription] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const openAdd = () => {
    if (!canManageRegulations) return;
    setCode('R2026');
    setName('');
    setYearOfInception(2026);
    setTotalCredits(160);
    setGradeSystem('10-Point Relative Grading (Batch 2026)');
    setDescription('');
    setEditingId(null);
    setModalType('add');
  };

  const openEdit = (reg: AcademicRegulation) => {
    if (!canManageRegulations) return;
    setCode(reg.code);
    setName(reg.name);
    setYearOfInception(reg.yearOfInception);
    setTotalCredits(reg.totalCredits);
    setGradeSystem(reg.gradeSystem);
    setDescription(reg.description || '');
    setEditingId(reg.id);
    setModalType('edit');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRegulations || !code.trim() || !name.trim()) return;

    if (modalType === 'add') {
      addRegulation({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        yearOfInception: Number(yearOfInception) || 2026,
        totalCredits: Number(totalCredits) || 160,
        gradeSystem: gradeSystem.trim(),
        description: description.trim(),
      });
      showMsg('Academic Regulation created successfully.');
    } else if (modalType === 'edit' && editingId) {
      updateRegulation(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        yearOfInception: Number(yearOfInception) || 2026,
        totalCredits: Number(totalCredits) || 160,
        gradeSystem: gradeSystem.trim(),
        description: description.trim(),
      });
      showMsg('Academic Regulation updated successfully.');
    }

    closeModal();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800/80">
                Academic Regulations
              </span>
              <span className="text-xs text-slate-400">Curricular Framework & Statutory Policies &bull; Batch 2026</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">Academic Regulations</h1>
            <p className="text-xs text-slate-400 mt-1">
              Govern credit requirements, grading policies, and assessment rules across autonomous batches.
            </p>
          </div>

          {canManageRegulations ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                title="Bulk Upload CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>Bulk Upload</span>
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Regulation</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-teal-300">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Institutional Governance (Read-Only)</span>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-800 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800 pt-4 overflow-x-auto text-xs">
          <button
            onClick={() => switchSubTab('regulations')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'regulations' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Regulations List ({regulations.length})</span>
          </button>
          <button
            onClick={() => switchSubTab('framework')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'framework' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2026 Batch Credit Framework</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: REGULATIONS LIST */}
      {subTab === 'regulations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {regulations.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Regulations Configured Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Define the institutional academic regulation such as R2026 Autonomous Regulations with total graduation credits and grading criteria.
              </p>
              {canManageRegulations && (
                <button
                  onClick={openAdd}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Regulation (e.g., R2026)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {regulations.map((r) => (
                <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-teal-300 bg-teal-950/80 border border-teal-800/80 px-2.5 py-0.5 rounded">
                        {r.code}
                      </span>
                      <span className="font-bold text-white text-sm">{r.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        Inception: {r.yearOfInception}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                      <span>Total Graduation Credits: <strong className="text-slate-200">{r.totalCredits}</strong></span>
                      <span>&bull;</span>
                      <span>Grading System: <strong className="text-slate-200">{r.gradeSystem}</strong></span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">{r.description}</p>
                    )}
                  </div>

                  {canManageRegulations && (
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                        title="Edit Regulation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete regulation "${r.code}"?`)) deleteRegulation(r.id);
                        }}
                        className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                        title="Delete Regulation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: 2026 BATCH FRAMEWORK REFERENCE */}
      {subTab === 'framework' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>UGC CBCS Guidelines (2026 Batch)</span>
            </div>
            <h3 className="text-sm font-bold text-white">Credit Structure Breakdown</h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
              <li>Core Professional Subjects: 68–72 Credits</li>
              <li>Basic Sciences & Mathematics: 24–28 Credits</li>
              <li>Engineering Sciences & Skills: 20–24 Credits</li>
              <li>Professional & Open Electives: 18–22 Credits</li>
              <li>Capstone Project & Internships: 16 Credits</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              <span>Assessment & Evaluation Policy</span>
            </div>
            <h3 className="text-sm font-bold text-white">40:60 Continuous Evaluation</h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
              <li>Continuous Internal Evaluation (CIE): 40% weightage</li>
              <li>Semester End Examination (SEE): 60% weightage</li>
              <li>Mandatory 60% OBE threshold cutoff for direct attainment</li>
              <li>Revised Bloom&apos;s Taxonomy Level 1 to Level 6 coverage</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Academic Cohort Calendar</span>
            </div>
            <h3 className="text-sm font-bold text-white">Four-Year Cohort: 2026–2030</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard 8-semester cycle commencing August 2026. Every semester includes two internal evaluation cycles (CIE-1 & CIE-2), practical laboratories, and final comprehensive assessments.
            </p>
          </div>
        </div>
      )}

      {/* MODAL DIALOG */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-teal-400" />
              <span>{modalType === 'add' ? 'Add Academic Regulation' : 'Edit Academic Regulation'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Regulation Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. R2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Year of Inception *</label>
                  <input
                    type="number"
                    required
                    min={2020}
                    max={2035}
                    value={yearOfInception}
                    onChange={(e) => setYearOfInception(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Full Regulation Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Autonomous Academic Regulations 2026 (Batch 2026-2030)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Total Graduation Credits *</label>
                  <input
                    type="number"
                    required
                    min={60}
                    max={240}
                    value={totalCredits}
                    onChange={(e) => setTotalCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Grading System</label>
                  <input
                    type="text"
                    value={gradeSystem}
                    onChange={(e) => setGradeSystem(e.target.value)}
                    placeholder="e.g. 10-Point Relative Grading System"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Description / CBCS Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Applicable for undergraduate four-year engineering programs admitted in academic year 2026-2027 onwards."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Regulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DATA UPLOAD MODAL */}
      <BulkDataUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Academic Regulations"
        entityName="Regulations"
        columns={[
          { key: 'code', label: 'Regulation Code', required: true, description: 'e.g. R2026' },
          { key: 'name', label: 'Regulation Title', required: true, description: 'e.g. Autonomous Academic Regulations 2026' },
          { key: 'yearOfInception', label: 'Year', required: true, type: 'number', description: 'e.g. 2026' },
          { key: 'totalCredits', label: 'Total Credits', required: true, type: 'number', description: 'e.g. 160' },
          { key: 'gradeSystem', label: 'Grading System', required: true, description: 'e.g. 10-Point Relative Grading' },
        ]}
        sampleRows={[
          {
            code: 'R2026',
            name: 'Autonomous Academic Regulations 2026',
            yearOfInception: 2026,
            totalCredits: 160,
            gradeSystem: '10-Point Relative Grading (Batch 2026)',
          },
          {
            code: 'R2026-PG',
            name: 'Postgraduate M.Tech Regulations 2026',
            yearOfInception: 2026,
            totalCredits: 68,
            gradeSystem: '10-Point Relative Grading',
          },
        ]}
        onImport={(rows) => {
          addRegulationsBatch(
            rows.map((r) => ({
              code: String(r.code).toUpperCase(),
              name: String(r.name),
              yearOfInception: Number(r.yearOfInception) || 2026,
              totalCredits: Number(r.totalCredits) || 160,
              gradeSystem: String(r.gradeSystem || '10-Point Relative Grading'),
              description: `Batch 2026 autonomous academic regulation imported via CSV.`,
            }))
          );
          showMsg(`Successfully imported ${rows.length} Academic Regulations.`);
        }}
      />
    </div>
  );
};
