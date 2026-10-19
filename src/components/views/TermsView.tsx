'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicTerm } from '@/types/erp';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export const TermsView: React.FC = () => {
  const {
    terms,
    activeTermId,
    setActiveTermId,
    addTerm,
    addTermsBatch,
    updateTerm,
    deleteTerm,
    programs,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const canManageTerms = academicScope.isAdmin || academicScope.isHeadOfFaculty;

  const [subTab, setSubTab] = useState<'terms' | 'timeline'>(
    (['terms', 'timeline'].includes(activeSubTab) ? (activeSubTab as any) : 'terms')
  );

  React.useEffect(() => {
    if (['terms', 'timeline'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'terms' | 'timeline') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [termNumber, setTermNumber] = useState(1);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-12-15');
  const [programId, setProgramId] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const openAdd = () => {
    if (!canManageTerms) return;
    setCode(`TERM-2026-SEM${terms.length + 1}`);
    setName(`Semester ${terms.length + 1} (Batch 2026)`);
    setAcademicYear('2026-2027');
    setTermNumber(terms.length + 1);
    setStartDate('2026-08-01');
    setEndDate('2026-12-15');
    setProgramId(programs[0]?.id || '');
    setEditingId(null);
    setModalType('add');
  };

  const openEdit = (t: AcademicTerm) => {
    if (!canManageTerms) return;
    setCode(t.code);
    setName(t.name);
    setAcademicYear(t.academicYear);
    setTermNumber(t.termNumber);
    setStartDate(t.startDate);
    setEndDate(t.endDate);
    setProgramId(t.programId || '');
    setEditingId(t.id);
    setModalType('edit');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTerms || !code.trim() || !name.trim()) return;

    if (modalType === 'add') {
      addTerm({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        termNumber: Number(termNumber) || 1,
        startDate,
        endDate,
        programId: programId || undefined,
      });
      showMsg('Academic Term created successfully.');
    } else if (modalType === 'edit' && editingId) {
      updateTerm(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        termNumber: Number(termNumber) || 1,
        startDate,
        endDate,
        programId: programId || undefined,
      });
      showMsg('Academic Term updated successfully.');
    }
    closeModal();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/80">
                Menu Item 4
              </span>
              <span className="text-xs text-slate-400">Academic Sessions & Calendars &bull; Batch 2026</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">Academic Terms & Semesters</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure semesters, instructional periods, and examination windows for the 2026 Batch.
            </p>
          </div>

          {canManageTerms ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Upload CSV</span>
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Term</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Institutional Calendar Governance (Read-Only)</span>
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
            onClick={() => switchSubTab('terms')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'terms' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Academic Terms ({terms.length})</span>
          </button>
          <button
            onClick={() => switchSubTab('timeline')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'timeline' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2026 Batch Instructional Timeline</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: TERMS LIST */}
      {subTab === 'terms' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {terms.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Academic Terms Defined Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create the first semester for the 2026 Batch (e.g. Semester I, Aug 2026 to Dec 2026).
              </p>
              {canManageTerms && (
                <button
                  onClick={openAdd}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Semester I (Batch 2026)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {terms.map((t) => {
                const prog = programs.find((p) => p.id === t.programId);
                const isSelected = activeTermId === t.id;

                return (
                  <div
                    key={t.id}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isSelected ? 'bg-amber-950/20 border-l-4 border-amber-500' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-amber-300 bg-amber-950 border border-amber-800 px-2.5 py-0.5 rounded">
                          {t.code}
                        </span>
                        <span className="font-bold text-white text-sm">{t.name}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                          AY: {t.academicYear}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                            Active Scope
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        <span>Term Index: <strong className="text-slate-200">Semester {t.termNumber}</strong></span>
                        <span>&bull;</span>
                        <span>Program: <strong className="text-slate-200">{prog ? prog.code : 'All Programs'}</strong></span>
                        <span>&bull;</span>
                        <span>Start: <strong className="text-slate-200">{t.startDate}</strong></span>
                        <span>&bull;</span>
                        <span>End: <strong className="text-slate-200">{t.endDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setActiveTermId(t.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Set as Active'}
                      </button>
                      {canManageTerms && (
                        <>
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="Edit Term"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete academic term "${t.name}"?`)) deleteTerm(t.id);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            title="Delete Term"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: INSTRUCTIONAL TIMELINE */}
      {subTab === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Academic Calendar Structure (2026 Cohort)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                Odd Semester (Fall 2026)
              </span>
              <h4 className="text-white font-bold text-sm">Instructional Cycle: August – December 2026</h4>
              <p className="text-slate-400 leading-relaxed">
                Covers 90 working instruction days, continuous assessment assessments (CIE-1 & CIE-2), practical examination vivas, and Semester End Examinations (SEE).
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded">
                Even Semester (Spring 2027)
              </span>
              <h4 className="text-white font-bold text-sm">Instructional Cycle: January – May 2027</h4>
              <p className="text-slate-400 leading-relaxed">
                Semester II for the 2026 Batch. Culminates in summer internship credits, course exit survey reviews, and annual NBA compliance audit filings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{modalType === 'add' ? 'Add Academic Term' : 'Edit Academic Term'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Term Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TERM-2026-SEM1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Semester Number *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={termNumber}
                    onChange={(e) => setTermNumber(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Term Title / Description *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Semester I - Fall 2026 (Batch 2026)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Target Program</label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">All Institutional Programs</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}: {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Term Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Term End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Academic Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <BulkDataUploadModal
          title="Bulk Upload Academic Terms / Semesters (CSV)"
          description="Upload semesters, instructional schedules, and examination windows for Batch 2026."
          sampleFileName="academic_terms_template.csv"
          columns={[
            { key: 'code', label: 'Term Code', required: true, example: 'SEM-1-2026' },
            { key: 'name', label: 'Term Name', required: true, example: 'Semester I (Batch 2026)' },
            { key: 'academicYear', label: 'Academic Year', required: false, example: '2026-2027' },
            { key: 'termNumber', label: 'Term Number', required: false, example: '1' },
            { key: 'startDate', label: 'Start Date (YYYY-MM-DD)', required: false, example: '2026-08-01' },
            { key: 'endDate', label: 'End Date (YYYY-MM-DD)', required: false, example: '2026-12-15' },
          ]}
          onImport={(rows) => {
            const parsed = rows.map((r) => ({
              code: r.code.toUpperCase().trim(),
              name: r.name.trim(),
              academicYear: r.academicYear?.trim() || '2026-2027',
              termNumber: Number(r.termNumber) || 1,
              startDate: r.startDate?.trim() || '2026-08-01',
              endDate: r.endDate?.trim() || '2026-12-15',
              programId: programs[0]?.id || undefined,
            }));
            addTermsBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} academic terms.`);
            setShowBulkModal(false);
          }}
          onClose={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
};
