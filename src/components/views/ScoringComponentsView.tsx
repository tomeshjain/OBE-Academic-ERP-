'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ScoringScheme, ScoringSubComponent } from '@/types/erp';
import { BulkDataUploadModal, BulkUploadColumn } from '@/components/BulkDataUploadModal';
import {
  Sliders,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  CheckSquare,
  Award,
  FileQuestion,
  BookOpen,
  ArrowUpRight,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export const ScoringComponentsView: React.FC = () => {
  const {
    courses,
    activeCourseId,
    setActiveCourseId,
    scoringSchemes,
    addScoringScheme,
    addScoringSchemesBatch,
    updateScoringScheme,
    deleteScoringScheme,
    scoringSubComponents,
    addScoringSubComponent,
    addScoringSubComponentsBatch,
    updateScoringSubComponent,
    deleteScoringSubComponent,
    questionPapers,
    getOrCreateQuestionPaperForSubComponent,
    activeSubTab,
    setActiveSubTab,
    academicScope,
  } = useApp();

  const displayedCourses = academicScope.visibleCourses;
  const activeCourse = displayedCourses.find((c) => c.id === activeCourseId) || displayedCourses[0] || null;
  const canManageCourse = academicScope.canManageCourse(activeCourse?.id);

  const [subTab, setSubTab] = useState<'schemes' | 'subcomponents'>(
    (['schemes', 'subcomponents'].includes(activeSubTab) ? (activeSubTab as any) : 'schemes')
  );

  React.useEffect(() => {
    if (['schemes', 'subcomponents'].includes(activeSubTab)) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const switchSubTab = (tab: 'schemes' | 'subcomponents') => {
    setSubTab(tab);
    setActiveSubTab(tab);
  };
  const [showBulkModal, setShowBulkModal] = useState<'schemes' | 'subcomponents' | null>(null);
  const [modalType, setModalType] = useState<
    'addScheme' | 'editScheme' | 'addSubComp' | 'editSubComp' | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Scheme form states
  const [schemeCode, setSchemeCode] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [cieWeight, setCieWeight] = useState(40);
  const [seeWeight, setSeeWeight] = useState(60);

  // SubComp form states
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [subCompName, setSubCompName] = useState('');
  const [subCompType, setSubCompType] = useState<'CIE' | 'SEE'>('CIE');
  const [maxMarks, setMaxMarks] = useState(20);
  const [weightPercentage, setWeightPercentage] = useState(15);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filter schemes & subcomponents connected to active course
  const currentCourseSchemes = scoringSchemes.filter(
    (s) => !s.courseId || s.courseId === activeCourse?.id
  );

  const currentCourseSubComponents = scoringSubComponents.filter(
    (sub) => !sub.courseId || sub.courseId === activeCourse?.id
  );

  const openAddScheme = () => {
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can create scoring schemes.', 'error');
      return;
    }
    if (!activeCourse) {
      showMsg('Please create or select a Course first.', 'error');
      return;
    }
    setSchemeCode(`SCHEME-${activeCourse.code}-THEORY`);
    setSchemeName(`Continuous & End-Term Evaluation (${activeCourse.code})`);
    setCieWeight(40);
    setSeeWeight(60);
    setEditingId(null);
    setModalType('addScheme');
  };

  const openEditScheme = (s: ScoringScheme) => {
    if (!canManageCourse) return;
    setSchemeCode(s.code);
    setSchemeName(s.name);
    setCieWeight(s.cieWeight);
    setSeeWeight(s.seeWeight);
    setEditingId(s.id);
    setModalType('editScheme');
  };

  const openAddSubComp = () => {
    if (!canManageCourse) {
      showMsg('Unauthorized: Only Course Coordinators and Heads can add sub-components.', 'error');
      return;
    }
    if (!activeCourse) {
      showMsg('Please select a Course first.', 'error');
      return;
    }
    setSelectedSchemeId(currentCourseSchemes[0]?.id || '');
    setSubCompName('Continuous Internal Evaluation 1 (CIE-1)');
    setSubCompType('CIE');
    setMaxMarks(50);
    setWeightPercentage(20);
    setEditingId(null);
    setModalType('addSubComp');
  };

  const openEditSubComp = (sub: ScoringSubComponent) => {
    if (!canManageCourse) return;
    setSelectedSchemeId(sub.schemeId);
    setSubCompName(sub.name);
    setSubCompType(sub.type);
    setMaxMarks(sub.maxMarks);
    setWeightPercentage(sub.weightPercentage);
    setEditingId(sub.id);
    setModalType('editSubComp');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
  };

  const handleSaveScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCourse || !schemeCode.trim() || !schemeName.trim() || !activeCourse) return;

    if (Number(cieWeight) + Number(seeWeight) !== 100) {
      showMsg('CIE Weight and SEE Weight must sum to 100%.', 'error');
      return;
    }

    if (modalType === 'addScheme') {
      addScoringScheme({
        courseId: activeCourse.id,
        code: schemeCode.trim().toUpperCase(),
        name: schemeName.trim(),
        cieWeight: Number(cieWeight) || 40,
        seeWeight: Number(seeWeight) || 60,
      });
      showMsg(`Evaluation Scheme created for course ${activeCourse.code}.`);
    } else if (modalType === 'editScheme' && editingId) {
      updateScoringScheme(editingId, {
        code: schemeCode.trim().toUpperCase(),
        name: schemeName.trim(),
        cieWeight: Number(cieWeight) || 40,
        seeWeight: Number(seeWeight) || 60,
      });
      showMsg('Evaluation Scheme updated.');
    }
    closeModal();
  };

  const handleSaveSubComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCourse || !subCompName.trim() || !activeCourse) return;

    if (modalType === 'addSubComp') {
      addScoringSubComponent({
        courseId: activeCourse.id,
        schemeId: selectedSchemeId || currentCourseSchemes[0]?.id || 'scheme-default',
        type: subCompType,
        name: subCompName.trim(),
        maxMarks: Number(maxMarks) || 50,
        weightPercentage: Number(weightPercentage) || 20,
      });
      showMsg(`Sub-Component added with an automatically generated Question Paper blueprint.`);
    } else if (modalType === 'editSubComp' && editingId) {
      updateScoringSubComponent(editingId, {
        schemeId: selectedSchemeId,
        type: subCompType,
        name: subCompName.trim(),
        maxMarks: Number(maxMarks) || 50,
        weightPercentage: Number(weightPercentage) || 20,
      });
      showMsg('Sub-Component updated.');
    }
    closeModal();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <span>Course-Connected Evaluation Framework</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Scoring Components
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure course-specific evaluation schemes (CIE / SEE) and sub-components. Each sub-component is linked to a dedicated question paper.
            </p>
          </div>

          {/* Sub-menu Tabs */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => switchSubTab('schemes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                subTab === 'schemes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Evaluation Schemes ({currentCourseSchemes.length})</span>
            </button>
            <button
              onClick={() => switchSubTab('subcomponents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                subTab === 'subcomponents'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Assessment Sub-Components ({currentCourseSubComponents.length})</span>
            </button>
          </div>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                Connected Course:
              </span>
              <select
                value={activeCourse?.id || ''}
                onChange={(e) => setActiveCourseId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white font-medium rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title} ({c.regulation || 'R2026'})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-400 text-xs">
              Configuring scoring schemes & sub-components for <strong>{activeCourse?.code}</strong>
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-800 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: EVALUATION SCHEMES */}
      {subTab === 'schemes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Evaluation Schemes ({activeCourse?.code})
              </h2>
              <p className="text-xs text-slate-400">
                Split of Continuous Internal Evaluation (CIE) vs Semester End Exam (SEE) for this course.
              </p>
            </div>
            {canManageCourse ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal('schemes')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddScheme}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Scoring Scheme</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Managed by Course Coordinator</span>
              </div>
            )}
          </div>

          {currentCourseSchemes.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Scoring Scheme for {activeCourse?.code}</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Click "Add Scoring Scheme" above to define the CIE:SEE ratio (e.g. 40%:60% or 50%:50%) for this course.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCourseSchemes.map((scheme) => (
                <div
                  key={scheme.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                        {scheme.code}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{scheme.name}</h3>
                    </div>
                    {canManageCourse && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditScheme(scheme)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete scoring scheme ${scheme.code}?`)) {
                              deleteScoringScheme(scheme.id);
                              showMsg(`Deleted scheme ${scheme.code}.`);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visual Weight Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-indigo-400">CIE: {scheme.cieWeight}%</span>
                      <span className="text-teal-400">SEE: {scheme.seeWeight}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden flex">
                      <div
                        style={{ width: `${scheme.cieWeight}%` }}
                        className="bg-indigo-500 h-full"
                      />
                      <div
                        style={{ width: `${scheme.seeWeight}%` }}
                        className="bg-teal-500 h-full"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <span>Connected Course:</span>
                    <strong className="text-slate-200">{activeCourse?.code}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ASSESSMENT SUB-COMPONENTS */}
      {subTab === 'subcomponents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Assessment Sub-Components ({activeCourse?.code})
              </h2>
              <p className="text-xs text-slate-400">
                Discrete evaluation events (CIE-1, CIE-2, Lab Test, Assignments). Each sub-component is linked to a dedicated Question Paper.
              </p>
            </div>
            {canManageCourse ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal('subcomponents')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bulk Upload CSV</span>
                </button>
                <button
                  onClick={openAddSubComp}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Sub-Component</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Managed by Course Coordinator</span>
              </div>
            )}
          </div>

          {currentCourseSubComponents.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Sub-Components for {activeCourse?.code}</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {canManageCourse
                  ? 'Click "Add Sub-Component" above to add CIE-1, CIE-2, or Semester End Exam. A Question Paper is automatically generated for each one.'
                  : 'Sub-components have not yet been configured by the Course Coordinator for this course.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCourseSubComponents.map((sub) => {
                const qp =
                  questionPapers.find((p) => p.subComponentId === sub.id) ||
                  (activeCourse
                    ? getOrCreateQuestionPaperForSubComponent(sub.id, activeCourse.id, sub.name)
                    : null);

                return (
                  <div
                    key={sub.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sub.type === 'CIE'
                              ? 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                              : 'bg-teal-950 border border-teal-800 text-teal-300'
                          }`}
                        >
                          {sub.type}
                        </span>
                        <h3 className="text-sm font-bold text-white leading-snug">{sub.name}</h3>
                      </div>

                      {canManageCourse && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSubComp(sub)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit Sub-Component"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete sub-component ${sub.name}?`)) {
                                deleteScoringSubComponent(sub.id);
                                showMsg(`Deleted sub-component ${sub.name}.`);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Sub-Component"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Max Examination Marks:</span>
                        <strong className="text-white font-mono">{sub.maxMarks} Marks</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Final Weight Contribution:</span>
                        <strong className="text-indigo-400 font-mono">{sub.weightPercentage}%</strong>
                      </div>
                    </div>

                    {/* Associated Question Paper Card */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Associated Question Paper</span>
                        </span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                          Ready
                        </span>
                      </div>
                      <div className="text-white font-medium truncate">
                        {qp?.title || `${sub.name} Blueprint`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Total Marks: {qp?.totalMarks || sub.maxMarks}M &bull; Configured in Assessment &amp; Question Papers
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHEME */}
      {(modalType === 'addScheme' || modalType === 'editScheme') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addScheme' ? `Add Scoring Scheme (${activeCourse?.code})` : 'Edit Scoring Scheme'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveScheme} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Scheme Code *</label>
                <input
                  type="text"
                  required
                  value={schemeCode}
                  onChange={(e) => setSchemeCode(e.target.value)}
                  placeholder="e.g. SCHEME-CS2601-THEORY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Scheme Name *</label>
                <input
                  type="text"
                  required
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  placeholder="e.g. Standard Theory Evaluation (Batch 2026)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">CIE Weight (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={cieWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCieWeight(val);
                      setSeeWeight(100 - val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">SEE Weight (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={seeWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSeeWeight(val);
                      setCieWeight(100 - val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
                Sum: <strong className="text-white">{Number(cieWeight) + Number(seeWeight)}%</strong> (must equal 100%)
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUB-COMPONENT */}
      {(modalType === 'addSubComp' || modalType === 'editSubComp') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addSubComp' ? `Add Sub-Component (${activeCourse?.code})` : 'Edit Sub-Component'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSubComp} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Sub-Component Name *</label>
                <input
                  type="text"
                  required
                  value={subCompName}
                  onChange={(e) => setSubCompName(e.target.value)}
                  placeholder="e.g. Continuous Internal Evaluation 1 (CIE-1), Lab Exam"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Component Type</label>
                  <select
                    value={subCompType}
                    onChange={(e) => setSubCompType(e.target.value as 'CIE' | 'SEE')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CIE">CIE (Internal Assessment)</option>
                    <option value="SEE">SEE (Semester End Exam)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Max Exam Marks *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Weight Percentage (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={weightPercentage}
                  onChange={(e) => setWeightPercentage(Number(e.target.value))}
                  placeholder="e.g. 20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Contribution of this event to final course grade.
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>An associated Question Paper blueprint will be linked automatically.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Save Sub-Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal === 'schemes' && activeCourse && (
        <BulkDataUploadModal
          title={`Bulk Upload Scoring Schemes (${activeCourse.code})`}
          description={`Upload evaluation schemes defining CIE:SEE split for ${activeCourse.code}`}
          sampleFileName={`scoring_schemes_${activeCourse.code}.csv`}
          columns={[
            { key: 'code', label: 'Scheme Code', required: true, example: `SCHEME-${activeCourse.code}-THEORY` },
            { key: 'name', label: 'Scheme Name', required: true, example: 'Continuous & End-Term Evaluation' },
            { key: 'cieWeight', label: 'CIE Weight %', required: false, example: '40' },
            { key: 'seeWeight', label: 'SEE Weight %', required: false, example: '60' },
          ]}
          onImport={(rows) => {
            const parsed = rows.map((r) => ({
              courseId: activeCourse.id,
              code: r.code.toUpperCase().trim(),
              name: r.name.trim(),
              cieWeight: Number(r.cieWeight) || 40,
              seeWeight: Number(r.seeWeight) || 60,
            }));
            addScoringSchemesBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} scoring schemes for ${activeCourse.code}.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}

      {showBulkModal === 'subcomponents' && activeCourse && (
        <BulkDataUploadModal
          title={`Bulk Upload Assessment Sub-Components (${activeCourse.code})`}
          description={`Upload discrete evaluation events for ${activeCourse.code}. Question Papers will be automatically provisioned.`}
          sampleFileName={`subcomponents_${activeCourse.code}.csv`}
          columns={[
            { key: 'name', label: 'Sub-Component Name', required: true, example: 'CIE Assessment 1' },
            { key: 'type', label: 'Type (CIE or SEE)', required: false, example: 'CIE' },
            { key: 'maxMarks', label: 'Max Marks', required: false, example: '50' },
            { key: 'weightPercentage', label: 'Weight % in Course', required: false, example: '15' },
          ]}
          onImport={(rows) => {
            const defaultScheme = currentCourseSchemes[0];
            const parsed = rows.map((r) => ({
              courseId: activeCourse.id,
              schemeId: defaultScheme?.id || 'scheme-default',
              name: r.name.trim(),
              type: (r.type?.toUpperCase().trim() === 'SEE' ? 'SEE' : 'CIE') as 'CIE' | 'SEE',
              maxMarks: Number(r.maxMarks) || 50,
              weightPercentage: Number(r.weightPercentage) || 15,
            }));
            addScoringSubComponentsBatch(parsed);
            showMsg(`Successfully imported ${parsed.length} sub-components with linked Question Papers.`);
            setShowBulkModal(null);
          }}
          onClose={() => setShowBulkModal(null)}
        />
      )}
    </div>
  );
};
