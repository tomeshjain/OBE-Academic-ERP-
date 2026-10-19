'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicProgram, ProgramOutcomeItem } from '@/types/erp';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  GraduationCap,
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Sliders,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';

export const ProgramsAndOutcomesView: React.FC = () => {
  const {
    programs,
    activeProgramId,
    setActiveProgramId,
    addProgram,
    addProgramsBatch,
    updateProgram,
    deleteProgram,
    programOutcomes,
    addProgramOutcome,
    addProgramOutcomesBatch,
    updateProgramOutcome,
    deleteProgramOutcome,
    loadStandardNbaReferencePos,
    departments,
    regulations,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const [subTab, setSubTab] = useState<'programs' | 'pos' | 'psos'>(
    (['programs', 'pos', 'psos'].includes(activeSubTab) ? (activeSubTab as any) : 'programs')
  );

  React.useEffect(() => {
    if (['programs', 'pos', 'psos'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'programs' | 'pos' | 'psos') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };

  const [showBulkModal, setShowBulkModal] = useState<'programs' | 'pos' | 'psos' | null>(null);

  const displayedPrograms = academicScope.visiblePrograms;
  const activeProgram = displayedPrograms.find((p) => p.id === activeProgramId) || displayedPrograms[0] || null;

  // Modals state
  const [modalType, setModalType] = useState<
    'addProgram' | 'editProgram' | 'addPO' | 'editPO' | 'addPSO' | 'editPSO' | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Program form states
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [deptId, setDeptId] = useState('');
  const [degreeType, setDegreeType] = useState('UNDERGRADUATE');
  const [totalTerms, setTotalTerms] = useState(8);
  const [batchYear, setBatchYear] = useState('2026-2030');
  const [regulationId, setRegulationId] = useState('');

  // Outcome form states
  const [outcomeCode, setOutcomeCode] = useState('');
  const [outcomeTitle, setOutcomeTitle] = useState('');
  const [outcomeDesc, setOutcomeDesc] = useState('');
  const [targetThresholdPct, setTargetThresholdPct] = useState(60);
  const [targetLevel, setTargetLevel] = useState(2.5);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  // Program Modals
  const openAddProgram = () => {
    if (!academicScope.canCreateProgram) {
      showMsg('Access Restricted: Only Admin, Head of Faculty, Head of School, or HOD can create programs.', 'error');
      return;
    }
    setProgCode(`BTECH-CSE-2026`);
    setProgName('');
    const defaultDeptId = academicScope.isHod && academicScope.ledDepartment
      ? academicScope.ledDepartment.id
      : (academicScope.visibleDepartments[0]?.id || departments[0]?.id || '');
    setDeptId(defaultDeptId);
    setDegreeType('UNDERGRADUATE');
    setTotalTerms(8);
    setBatchYear('2026-2030');
    setRegulationId(regulations[0]?.id || '');
    setEditingId(null);
    setModalType('addProgram');
  };

  const openEditProgram = (p: AcademicProgram) => {
    setProgCode(p.code);
    setProgName(p.name);
    setDeptId(p.departmentId);
    setDegreeType(p.degreeType);
    setTotalTerms(p.totalTerms);
    setBatchYear(p.batchYear || '2026-2030');
    setRegulationId(p.regulationId || '');
    setEditingId(p.id);
    setModalType('editProgram');
  };

  // PO Modals
  const currentProgramPos = programOutcomes.filter(
    (po) => po.programId === activeProgram?.id && po.type === 'PO'
  );
  const currentProgramPsos = programOutcomes.filter(
    (po) => po.programId === activeProgram?.id && po.type === 'PSO'
  );

  const openAddPO = () => {
    if (!activeProgram) {
      showMsg('Please select or create an Academic Program first.', 'error');
      return;
    }
    setOutcomeCode(`PO${currentProgramPos.length + 1}`);
    setOutcomeTitle('');
    setOutcomeDesc('');
    setTargetThresholdPct(60);
    setTargetLevel(2.5);
    setEditingId(null);
    setModalType('addPO');
  };

  const openEditPO = (po: ProgramOutcomeItem) => {
    setOutcomeCode(po.code);
    setOutcomeTitle(po.title);
    setOutcomeDesc(po.description);
    setTargetThresholdPct(po.targetThresholdPct);
    setTargetLevel(po.targetLevel);
    setEditingId(po.id);
    setModalType('editPO');
  };

  const openAddPSO = () => {
    if (!activeProgram) {
      showMsg('Please select or create an Academic Program first.', 'error');
      return;
    }
    setOutcomeCode(`PSO${currentProgramPsos.length + 1}`);
    setOutcomeTitle('');
    setOutcomeDesc('');
    setTargetThresholdPct(60);
    setTargetLevel(2.5);
    setEditingId(null);
    setModalType('addPSO');
  };

  const openEditPSO = (pso: ProgramOutcomeItem) => {
    setOutcomeCode(pso.code);
    setOutcomeTitle(pso.title);
    setOutcomeDesc(pso.description);
    setTargetThresholdPct(pso.targetThresholdPct);
    setTargetLevel(pso.targetLevel);
    setEditingId(pso.id);
    setModalType('editPSO');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
  };

  // Form submit
  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progCode.trim() || !progName.trim()) return;

    if (modalType === 'addProgram') {
      addProgram({
        code: progCode.trim().toUpperCase(),
        name: progName.trim(),
        departmentId: deptId || departments[0]?.id || 'dept-default',
        degreeType,
        totalTerms: Number(totalTerms) || 8,
        batchYear: batchYear.trim(),
        regulationId: regulationId || undefined,
      });
      showMsg('Academic Program registered successfully.');
    } else if (modalType === 'editProgram' && editingId) {
      updateProgram(editingId, {
        code: progCode.trim().toUpperCase(),
        name: progName.trim(),
        departmentId: deptId,
        degreeType,
        totalTerms: Number(totalTerms) || 8,
        batchYear: batchYear.trim(),
        regulationId: regulationId || undefined,
      });
      showMsg('Academic Program updated successfully.');
    }
    closeModal();
  };

  const handleSaveOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProgram || !outcomeCode.trim() || !outcomeTitle.trim()) return;

    const isPSO = modalType === 'addPSO' || modalType === 'editPSO';
    const type = isPSO ? 'PSO' : 'PO';

    if (modalType === 'addPO' || modalType === 'addPSO') {
      addProgramOutcome({
        programId: activeProgram.id,
        code: outcomeCode.trim().toUpperCase(),
        type,
        title: outcomeTitle.trim(),
        description: outcomeDesc.trim(),
        targetThresholdPct: Number(targetThresholdPct) || 60,
        targetLevel: Number(targetLevel) || 2.5,
      });
      showMsg(`${type} outcome defined for ${activeProgram.code}.`);
    } else if ((modalType === 'editPO' || modalType === 'editPSO') && editingId) {
      updateProgramOutcome(editingId, {
        code: outcomeCode.trim().toUpperCase(),
        title: outcomeTitle.trim(),
        description: outcomeDesc.trim(),
        targetThresholdPct: Number(targetThresholdPct) || 60,
        targetLevel: Number(targetLevel) || 2.5,
      });
      showMsg(`${type} outcome updated.`);
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
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800/80">
                Menu Item 3
              </span>
              <span className="text-xs text-slate-400">Curriculum & Outcome-Based Architecture &bull; Batch 2026</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">
              Programs & Outcomes (POs / PSOs)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Every academic program manages its own isolated Graduate Attributes (POs) and Program Specific Outcomes (PSOs).
            </p>
          </div>

          {/* Program Selector & Action */}
          <div className="flex flex-wrap items-center gap-2">
            {displayedPrograms.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <span className="text-slate-400 font-semibold">Active Program:</span>
                <select
                  value={activeProgram?.id || ''}
                  onChange={(e) => setActiveProgramId(e.target.value)}
                  className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer"
                >
                  {displayedPrograms.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {subTab === 'programs' && academicScope.canCreateProgram && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal('programs')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddProgram}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Program</span>
                </button>
              </div>
            )}

            {subTab === 'pos' && activeProgram && academicScope.canCreateProgram && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal('pos')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload POs</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Populate standard NBA Reference PO1–PO12 for ${activeProgram.code}?`)) {
                      loadStandardNbaReferencePos(activeProgram.id);
                      showMsg(`Generated standard NBA reference POs & PSOs for ${activeProgram.code}.`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  title="Optionally populate standard NBA reference PO1-PO12 for this program"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Suggest NBA Reference POs</span>
                </button>
                <button
                  onClick={openAddPO}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add PO</span>
                </button>
              </div>
            )}

            {subTab === 'psos' && activeProgram && academicScope.canCreateProgram && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal('psos')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload PSOs</span>
                </button>
                <button
                  onClick={openAddPSO}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add PSO</span>
                </button>
              </div>
            )}
          </div>
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
            onClick={() => switchSubTab('programs')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'programs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Academic Programs ({programs.length})</span>
          </button>
          <button
            onClick={() => switchSubTab('pos')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'pos' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>
              Program Outcomes (POs) &bull; {activeProgram ? activeProgram.code : 'None'} ({currentProgramPos.length})
            </span>
          </button>
          <button
            onClick={() => switchSubTab('psos')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              subTab === 'psos' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>
              Program Specific Outcomes (PSOs) ({currentProgramPsos.length})
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PROGRAMS LIST */}
      {subTab === 'programs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {programs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Academic Programs Configured</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add degree programs admitted for the 2026 Batch (e.g. B.Tech Computer Science & Engineering, Batch 2026-2030).
              </p>
              <button
                onClick={openAddProgram}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Program (Batch 2026)</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {displayedPrograms.map((p) => {
                const dept = departments.find((d) => d.id === p.departmentId);
                const posCount = programOutcomes.filter((po) => po.programId === p.id && po.type === 'PO').length;
                const psosCount = programOutcomes.filter((po) => po.programId === p.id && po.type === 'PSO').length;
                const isSelected = activeProgram?.id === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isSelected ? 'bg-purple-950/20 border-l-4 border-purple-500' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-purple-300 bg-purple-950 border border-purple-800 px-2.5 py-0.5 rounded">
                          {p.code}
                        </span>
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                            Active Scope
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        <span>Dept: <strong className="text-slate-200">{dept?.name || 'General Engineering'}</strong></span>
                        <span>&bull;</span>
                        <span>Level: <strong className="text-slate-200">{p.degreeType}</strong></span>
                        <span>&bull;</span>
                        <span>Terms: <strong className="text-slate-200">{p.totalTerms} Semesters</strong></span>
                        <span>&bull;</span>
                        <span>Cohort: <strong className="text-slate-200">{p.batchYear || '2026-2030'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="bg-slate-800 text-purple-300 px-2 py-0.5 rounded text-[11px] font-mono">
                          {posCount} POs Defined
                        </span>
                        <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded text-[11px] font-mono">
                          {psosCount} PSOs Defined
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          setActiveProgramId(p.id);
                          setSubTab('pos');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                      >
                        Manage Outcomes
                      </button>
                      {academicScope.canCreateProgram && (
                        <>
                          <button
                            onClick={() => openEditProgram(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="Edit Program"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete program "${p.name}"? This also removes its mapped POs/PSOs.`)) {
                                deleteProgram(p.id);
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            title="Delete Program"
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

      {/* SUBTAB 2: PROGRAM OUTCOMES (POs) - SPECIFIC TO ACTIVE PROGRAM */}
      {subTab === 'pos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {!activeProgram ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Please select or create an academic program first.
            </div>
          ) : currentProgramPos.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Target className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                No Program Outcomes Defined for {activeProgram.code}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Each program must have its own isolated Graduate Attributes. Add PO1, PO2, etc., or load standard NBA Tier-I reference guidelines.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    loadStandardNbaReferencePos(activeProgram.id);
                    showMsg(`Generated standard NBA reference POs for ${activeProgram.code}.`);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Load NBA Reference POs</span>
                </button>
                <button
                  onClick={openAddPO}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Define Custom PO</span>
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 min-w-[90px]">PO Code</th>
                  <th className="p-4 min-w-[200px]">Outcome Title</th>
                  <th className="p-4">Graduate Attribute Description</th>
                  <th className="p-4 text-center min-w-[120px]">OBE Threshold</th>
                  <th className="p-4 text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {currentProgramPos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-purple-300">{po.code}</td>
                    <td className="p-4 font-bold text-white">{po.title}</td>
                    <td className="p-4 text-slate-300 leading-relaxed max-w-xl">{po.description}</td>
                    <td className="p-4 text-center">
                      <div className="inline-block bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono">
                        Target: <span className="text-emerald-400 font-bold">{po.targetLevel} / 3.0</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditPO(po)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="Edit PO"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Program Outcome "${po.code}"?`)) deleteProgramOutcome(po.id);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete PO"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SUBTAB 3: PROGRAM SPECIFIC OUTCOMES (PSOs) */}
      {subTab === 'psos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {!activeProgram ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Please select or create an academic program first.
            </div>
          ) : currentProgramPsos.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Compass className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                No Program Specific Outcomes (PSOs) Defined for {activeProgram.code}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Define 2 to 4 domain-specific competencies (PSO1, PSO2) formulated by the Department Academic Council.
              </p>
              <button
                onClick={openAddPSO}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Define First PSO</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 min-w-[90px]">PSO Code</th>
                  <th className="p-4 min-w-[200px]">Competency Title</th>
                  <th className="p-4">Specialization Description</th>
                  <th className="p-4 text-center min-w-[120px]">Target Level</th>
                  <th className="p-4 text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {currentProgramPsos.map((pso) => (
                  <tr key={pso.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-teal-300">{pso.code}</td>
                    <td className="p-4 font-bold text-white">{pso.title}</td>
                    <td className="p-4 text-slate-300 leading-relaxed max-w-xl">{pso.description}</td>
                    <td className="p-4 text-center">
                      <div className="inline-block bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono">
                        Target: <span className="text-emerald-400 font-bold">{pso.targetLevel} / 3.0</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditPSO(pso)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="Edit PSO"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Program Specific Outcome "${pso.code}"?`)) {
                              deleteProgramOutcome(pso.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete PSO"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL DIALOGS */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>
                {modalType === 'addProgram'
                  ? 'Add Degree Program (2026 Batch)'
                  : modalType === 'editProgram'
                  ? 'Edit Degree Program'
                  : modalType === 'addPO'
                  ? `Define Program Outcome for ${activeProgram?.code}`
                  : modalType === 'editPO'
                  ? 'Edit Program Outcome'
                  : modalType === 'addPSO'
                  ? `Define Program Specific Outcome for ${activeProgram?.code}`
                  : 'Edit Program Specific Outcome'}
              </span>
            </h3>

            {/* Program Form */}
            {modalType.includes('Program') && (
              <form onSubmit={handleSaveProgram} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Program Code *</label>
                    <input
                      type="text"
                      required
                      value={progCode}
                      onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                      placeholder="e.g. BTECH-CSE-2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Admitted Cohort Batch</label>
                    <input
                      type="text"
                      required
                      value={batchYear}
                      onChange={(e) => setBatchYear(e.target.value)}
                      placeholder="e.g. 2026-2030"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Program Name *</label>
                  <input
                    type="text"
                    required
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    placeholder="e.g. B.Tech in Computer Science & Engineering"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Department *</label>
                    {academicScope.isHod && academicScope.ledDepartment ? (
                      <div className="w-full bg-slate-950/80 border border-amber-800/60 rounded-xl p-2.5 text-amber-300 flex items-center justify-between">
                        <span>{academicScope.ledDepartment.code}: {academicScope.ledDepartment.name}</span>
                        <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded border border-amber-800 font-mono text-amber-400">Your Governed Dept</span>
                      </div>
                    ) : (
                      <select
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      >
                        {academicScope.visibleDepartments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code}: {d.name}
                          </option>
                        ))}
                        {academicScope.visibleDepartments.length === 0 && <option value="">No departments created yet</option>}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Degree Type</label>
                    <select
                      value={degreeType}
                      onChange={(e) => setDegreeType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="UNDERGRADUATE">UNDERGRADUATE (B.Tech / B.E.)</option>
                      <option value="POSTGRADUATE">POSTGRADUATE (M.Tech / M.S.)</option>
                      <option value="DOCTORAL">DOCTORAL (Ph.D.)</option>
                    </select>
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
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-sm"
                  >
                    Save Program
                  </button>
                </div>
              </form>
            )}

            {/* Outcome (PO / PSO) Form */}
            {(modalType.includes('PO') || modalType.includes('PSO')) && (
              <form onSubmit={handleSaveOutcome} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Outcome Code *</label>
                    <input
                      type="text"
                      required
                      value={outcomeCode}
                      onChange={(e) => setOutcomeCode(e.target.value.toUpperCase())}
                      placeholder={modalType.includes('PSO') ? 'e.g. PSO1' : 'e.g. PO1'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Target Level (0 to 3.0) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1.0}
                      max={3.0}
                      required
                      value={targetLevel}
                      onChange={(e) => setTargetLevel(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Short Competency Title *</label>
                  <input
                    type="text"
                    required
                    value={outcomeTitle}
                    onChange={(e) => setOutcomeTitle(e.target.value)}
                    placeholder={
                      modalType.includes('PSO')
                        ? 'e.g. Enterprise Cloud & Intelligent Systems'
                        : 'e.g. Engineering Knowledge'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Graduate Attribute Statement *</label>
                  <textarea
                    rows={4}
                    required
                    value={outcomeDesc}
                    onChange={(e) => setOutcomeDesc(e.target.value)}
                    placeholder={
                      modalType.includes('PSO')
                        ? 'e.g. Demonstrate specialized proficiency in architecting real-time distributed platforms and machine intelligence pipelines.'
                        : 'e.g. Apply mathematics, science, engineering fundamentals, and computing principles to solve complex engineering problems.'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs leading-relaxed"
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
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-sm"
                  >
                    Save Outcome
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showBulkModal === 'programs' && (
        <BulkDataUploadModal
          title="Bulk Upload Academic Programs (CSV)"
          description="Upload multiple academic degree programs in batch for 2026 Batch onwards."
          sampleFileName="academic_programs_template.csv"
          columns={[
            { key: 'code', label: 'Program Code', required: true, example: 'BTECH-CSE-2026' },
            { key: 'name', label: 'Program Name', required: true, example: 'B.Tech in Computer Science and Engineering' },
            { key: 'degreeType', label: 'Degree Type', required: false, example: 'UNDERGRADUATE' },
            { key: 'totalTerms', label: 'Total Terms', required: false, example: '8' },
            { key: 'batchYear', label: 'Batch Year', required: false, example: '2026-2030' },
          ]}
          onImport={(rows) => {
            const parsed = rows.map((r) => ({
              code: r.code.toUpperCase().trim(),
              name: r.name.trim(),
              departmentId: departments[0]?.id || 'dept-default',
              degreeType: r.degreeType?.trim() || 'UNDERGRADUATE',
              totalTerms: Number(r.totalTerms) || 8,
              batchYear: r.batchYear?.trim() || '2026-2030',
              regulationId: regulations[0]?.id || undefined,
            }));
            addProgramsBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} academic programs.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}

      {(showBulkModal === 'pos' || showBulkModal === 'psos') && activeProgram && (
        <BulkDataUploadModal
          title={`Bulk Upload ${showBulkModal === 'psos' ? 'Program Specific Outcomes (PSOs)' : 'Program Outcomes (POs)'}`}
          description={`Upload outcomes for program: ${activeProgram.code} - ${activeProgram.name}`}
          sampleFileName={`${showBulkModal}_${activeProgram.code}.csv`}
          columns={[
            { key: 'code', label: 'Outcome Code', required: true, example: showBulkModal === 'psos' ? 'PSO1' : 'PO1' },
            { key: 'title', label: 'Short Title', required: true, example: showBulkModal === 'psos' ? 'Enterprise Systems' : 'Engineering Knowledge' },
            { key: 'description', label: 'Statement', required: true, example: 'Apply foundational knowledge to complex engineering problems' },
            { key: 'targetThresholdPct', label: 'Target Threshold %', required: false, example: '60' },
            { key: 'targetLevel', label: 'Target Level (1-3)', required: false, example: '2.5' },
          ]}
          onImport={(rows) => {
            const isPSO = showBulkModal === 'psos';
            const parsed = rows.map((r) => ({
              programId: activeProgram.id,
              code: r.code.toUpperCase().trim(),
              type: (isPSO ? 'PSO' : 'PO') as 'PO' | 'PSO',
              title: r.title.trim(),
              description: r.description.trim(),
              targetThresholdPct: Number(r.targetThresholdPct) || 60,
              targetLevel: Number(r.targetLevel) || 2.5,
            }));
            addProgramOutcomesBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} outcomes for ${activeProgram.code}.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}
    </div>
  );
};
