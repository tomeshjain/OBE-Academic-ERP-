'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  X,
  RefreshCw,
  Code2,
  Table as TableIcon,
  ShieldAlert,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Eye,
  Copy,
} from 'lucide-react';

export const AdminDatabaseManagerView: React.FC = () => {
  const {
    currentUser,
    academicScope,
    tenant,
    activeSubTab,
    setActiveSubTab,
    users,
    faculties,
    schools,
    departments,
    regulations,
    programs,
    programOutcomes,
    terms,
    courses,
    courseSections,
    courseOutcomes,
    coPoMappings,
    scoringSchemes,
    scoringSubComponents,
    assessmentWindows,
    questionPapers,
    questionPaperSections,
    questionPaperTemplates,
    questions,
    students,
    marks,
    outgoingEmails,
    updateDbTableRecord,
    deleteDbTableRecord,
    addDbTableRecord,
    clearDbTable,
    exportDatabaseSnapshot,
    importDatabaseSnapshot,
  } = useApp();

  const [activeTableKey, setActiveTableKey] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineRowData, setInlineRowData] = useState<Record<string, any>>({});
  const [isAddingNewRow, setIsAddingNewRow] = useState<boolean>(false);
  const [newRowDraft, setNewRowDraft] = useState<Record<string, any>>({});
  const [jsonModalRecord, setJsonModalRecord] = useState<any | null>(null);
  const [jsonModalText, setJsonModalText] = useState<string>('');
  const [jsonModalError, setJsonModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Registry of all 22 database tables (memoized unconditionally)
  const tablesRegistry: Record<
    string,
    { label: string; group: string; data: any[]; icon: string; description: string }
  > = useMemo(
    () => ({
      users: {
        label: 'User Accounts (RBAC)',
        group: 'Institutional Hierarchy',
        data: users,
        icon: '👥',
        description: 'Authentication credentials, email mappings, and role-based clearance levels.',
      },
      faculties: {
        label: 'Academic Faculties',
        group: 'Institutional Hierarchy',
        data: faculties,
        icon: '🏛️',
        description: 'Top-tier faculty divisions headed by Faculty Deans / HoFs.',
      },
      schools: {
        label: 'Schools',
        group: 'Institutional Hierarchy',
        data: schools,
        icon: '🏫',
        description: 'Inter-disciplinary schools headed by Heads of School (HoS).',
      },
      departments: {
        label: 'Departments',
        group: 'Institutional Hierarchy',
        data: departments,
        icon: '🏢',
        description: 'Academic departments managed by Heads of Department (HODs).',
      },
      outgoingEmails: {
        label: 'Outgoing Email Logs',
        group: 'Institutional Hierarchy',
        data: outgoingEmails,
        icon: '✉️',
        description: 'System audit logs for OTPs, deadline alerts, and notifications.',
      },

      regulations: {
        label: 'Curriculum Regulations',
        group: 'Curriculum & Governance',
        data: regulations,
        icon: '📜',
        description: 'Academic regulation frameworks (e.g., R2026 160-Credits).',
      },
      programs: {
        label: 'Degree Programs',
        group: 'Curriculum & Governance',
        data: programs,
        icon: '🎓',
        description: 'Undergraduate and postgraduate degree programs (e.g., B.Tech CSE).',
      },
      programOutcomes: {
        label: 'Program Outcomes (POs/PSOs)',
        group: 'Curriculum & Governance',
        data: programOutcomes,
        icon: '🎯',
        description: 'NBA Graduate Attributes (PO1–PO12) and Program Specific Outcomes.',
      },
      terms: {
        label: 'Academic Terms',
        group: 'Curriculum & Governance',
        data: terms,
        icon: '📅',
        description: 'Semesters and trimesters with active date bounds.',
      },

      courses: {
        label: 'Course Catalog',
        group: 'Courses & Allocation',
        data: courses,
        icon: '📚',
        description: 'Accredited courses with credits, hours, and coordinator mappings.',
      },
      courseSections: {
        label: 'Course Sections & Faculty',
        group: 'Courses & Allocation',
        data: courseSections,
        icon: '🗂️',
        description: 'Class divisions (Sec A, B) mapped to course instructors.',
      },
      courseOutcomes: {
        label: 'Course Outcomes (COs)',
        group: 'Courses & Allocation',
        data: courseOutcomes,
        icon: '🎯',
        description: 'Course-level educational objectives with Blooms taxonomy levels.',
      },
      coPoMappings: {
        label: 'CO-PO Matrix (0-3)',
        group: 'Courses & Allocation',
        data: coPoMappings,
        icon: '📊',
        description: 'Substantive correlation matrices between COs and POs/PSOs.',
      },

      scoringSchemes: {
        label: 'Evaluation Schemes',
        group: 'Examinations & Question Papers',
        data: scoringSchemes,
        icon: '⚖️',
        description: 'Weightage configurations for Continuous Internal (CIE) and Semester End (SEE).',
      },
      scoringSubComponents: {
        label: 'Assessment Sub-Components',
        group: 'Examinations & Question Papers',
        data: scoringSubComponents,
        icon: '📝',
        description: 'Quizzes, Midterms, Lab Assessments, and Final Exams.',
      },
      assessmentWindows: {
        label: 'Assessment Windows & Deadlines',
        group: 'Examinations & Question Papers',
        data: assessmentWindows,
        icon: '⏰',
        description: 'Time windows, lock statuses, and emergency extension audit records.',
      },
      questionPapers: {
        label: 'Question Papers',
        group: 'Examinations & Question Papers',
        data: questionPapers,
        icon: '📄',
        description: 'Authoritative exam papers linked to scoring components.',
      },
      questionPaperSections: {
        label: 'Paper Sections',
        group: 'Examinations & Question Papers',
        data: questionPaperSections,
        icon: '📑',
        description: 'Paper sections with ALL or ANY_N choice rules.',
      },
      questionPaperTemplates: {
        label: 'Blueprint Templates',
        group: 'Examinations & Question Papers',
        data: questionPaperTemplates,
        icon: '📐',
        description: 'Standard question paper blueprints and mark allocations.',
      },
      questions: {
        label: 'Question Items & Blooms',
        group: 'Examinations & Question Papers',
        data: questions,
        icon: '❓',
        description: 'Individual assessment questions mapped to Blooms levels and COs.',
      },

      students: {
        label: 'Student Enrollments',
        group: 'Student Marks & Rosters',
        data: students,
        icon: '🧑‍🎓',
        description: 'Enrolled students with Roll Numbers, USNs, and section allotments.',
      },
      marks: {
        label: 'Student Mark Records',
        group: 'Student Marks & Rosters',
        data: marks,
        icon: '🔢',
        description: 'Question-wise marks awarded to students with status codes.',
      },
    }),
    [
      users,
      faculties,
      schools,
      departments,
      regulations,
      programs,
      programOutcomes,
      terms,
      courses,
      courseSections,
      courseOutcomes,
      coPoMappings,
      scoringSchemes,
      scoringSubComponents,
      assessmentWindows,
      questionPapers,
      questionPaperSections,
      questionPaperTemplates,
      questions,
      students,
      marks,
      outgoingEmails,
    ]
  );

  const currentTable = tablesRegistry[activeTableKey] || tablesRegistry.users;
  const tableData: any[] = currentTable.data || [];

  // Filter records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const q = searchQuery.toLowerCase().trim();
    return tableData.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(q);
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [tableData, searchQuery]);

  // Extract display columns (first 7 meaningful columns)
  const columns = useMemo(() => {
    if (tableData.length === 0) return ['id'];
    const keys = new Set<string>();
    tableData.slice(0, 15).forEach((row) => {
      Object.keys(row).forEach((k) => keys.add(k));
    });
    const allKeys = Array.from(keys);
    const priority = ['id', 'code', 'name', 'title', 'fullName', 'email', 'role', 'status', 'term', 'credits'];
    allKeys.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return allKeys.slice(0, 7);
  }, [tableData]);

  // Security Gate
  if (!academicScope.isAdmin && currentUser?.role !== 'TENANT_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-slate-950 border border-rose-900/50 rounded-3xl max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Access Restricted: Administrator Only</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          The Master Database Explorer provides live database manipulation, schema introspection, and raw record modification. It is strictly guarded for Institutional Administrators.
        </p>
      </div>
    );
  }

  // --- Inline Row Editing Handlers ---
  const handleStartInlineEdit = (record: any) => {
    setEditingRowId(record.id);
    setInlineRowData({ ...record });
    setIsAddingNewRow(false);
  };

  const handleCancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineRowData({});
  };

  const handleSaveInlineEdit = (recordId: string) => {
    try {
      updateDbTableRecord(activeTableKey, recordId, inlineRowData);
      setEditingRowId(null);
      setInlineRowData({});
      showMsg(`Saved row modifications for record [${recordId}].`);
    } catch (err: any) {
      showMsg(`Error saving row: ${err.message}`, 'error');
    }
  };

  // --- Inline Add Row Handlers ---
  const handleStartAddRow = () => {
    setIsAddingNewRow(true);
    setEditingRowId(null);
    const draft: Record<string, any> = {
      id: `${activeTableKey.slice(0, 4)}-${Date.now()}`,
    };
    columns.forEach((col) => {
      if (col !== 'id') draft[col] = '';
    });
    setNewRowDraft(draft);
  };

  const handleCancelAddRow = () => {
    setIsAddingNewRow(false);
    setNewRowDraft({});
  };

  const handleSaveNewRow = () => {
    if (!newRowDraft.id || !String(newRowDraft.id).trim()) {
      showMsg('A unique ID is required to insert a record.', 'error');
      return;
    }
    try {
      addDbTableRecord(activeTableKey, newRowDraft);
      setIsAddingNewRow(false);
      setNewRowDraft({});
      showMsg(`Successfully inserted new record [${newRowDraft.id}] into table "${activeTableKey}".`);
    } catch (err: any) {
      showMsg(`Error inserting record: ${err.message}`, 'error');
    }
  };

  // --- Row Delete ---
  const handleDeleteRow = (recordId: string) => {
    if (confirm(`Permanently delete row [${recordId}] from "${activeTableKey}"? This updates the live database immediately.`)) {
      deleteDbTableRecord(activeTableKey, recordId);
      showMsg(`Deleted row [${recordId}] from "${activeTableKey}".`);
    }
  };

  // --- JSON Deep Edit Modal Handlers ---
  const handleOpenJsonModal = (record: any) => {
    setJsonModalRecord(record);
    setJsonModalText(JSON.stringify(record, null, 2));
    setJsonModalError(null);
  };

  const handleSaveJsonModal = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonModalText);
      if (!parsed.id) {
        setJsonModalError('Record must contain a unique "id" field.');
        return;
      }
      const targetId = jsonModalRecord?.id || parsed.id;
      updateDbTableRecord(activeTableKey, targetId, parsed);
      setJsonModalRecord(null);
      showMsg(`Updated record [${targetId}] via JSON editor.`);
    } catch (err: any) {
      setJsonModalError(`JSON Syntax Error: ${err.message}`);
    }
  };

  // --- Table Actions ---
  const handleClearCurrentTable = () => {
    if (confirm(`CRITICAL WARNING: Wipe all ${tableData.length} records in table "${activeTableKey}"? If you wipe users, your active administrative session will be safely preserved.`)) {
      clearDbTable(activeTableKey);
      showMsg(`Wiped all records in "${activeTableKey}".`);
    }
  };

  const handleExportTableJson = () => {
    const jsonStr = JSON.stringify(tableData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-erp-${activeTableKey}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg(`Exported ${tableData.length} records from "${activeTableKey}" as JSON.`);
  };

  const handleExportFullDatabase = () => {
    const snapshotStr = exportDatabaseSnapshot();
    const blob = new Blob([snapshotStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-erp-full-database-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg('Full institutional database snapshot downloaded successfully.');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = importDatabaseSnapshot(text);
        if (res.success) {
          showMsg(res.message);
        } else {
          showMsg(res.message, 'error');
        }
      } catch (err: any) {
        showMsg(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const currentSubTab = activeSubTab === 'backup' ? 'backup' : 'explorer';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-900/40 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold bg-indigo-950/80 border border-indigo-700/60 px-2.5 py-0.5 rounded-md">
                Master Database Operations
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>22 Active Entity Tables</span>
              </span>
              <span className="text-xs text-slate-500">&bull;</span>
              <span className="text-xs text-emerald-400 font-medium">Administrator Clearance Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-7 h-7 text-indigo-400" />
              <span>Institutional Master Database Explorer</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Full-fidelity visual explorer and row-level manipulation hub for all institutional collections. View schemas, edit row records inline, execute atomic updates, or perform disaster recovery snapshots.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveSubTab('explorer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentSubTab === 'explorer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Database Explorer</span>
            </button>
            <button
              onClick={() => setActiveSubTab('backup')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentSubTab === 'backup'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Backup & Disaster Recovery</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DATABASE EXPLORER */}
      {currentSubTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 22 Tables Sidebar */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Select Collection
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
                  {Object.keys(tablesRegistry).length} Tables
                </span>
              </div>

              <div className="space-y-1 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(tablesRegistry).map(([key, info]) => {
                  const isActive = activeTableKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveTableKey(key);
                        setEditingRowId(null);
                        setIsAddingNewRow(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{info.icon}</span>
                        <span className="truncate">{info.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {info.data.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Table Viewer & Row-Wise Actions */}
          <div className="lg:col-span-9 space-y-4">
            {/* Control Bar */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search within ${currentTable.label} (${tableData.length} records)...`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded-xl shrink-0">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      viewMode === 'json' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Raw JSON</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleStartAddRow}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
                <button
                  onClick={handleExportTableJson}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Export Current Table as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleClearCurrentTable}
                  className="p-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-rose-400 transition-colors"
                  title="Wipe table records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table Meta Card */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentTable.icon}</span>
                <span className="font-bold text-white">{currentTable.label}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-400 text-[11px]">{currentTable.description}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Showing {filteredRecords.length} of {tableData.length} records
              </span>
            </div>

            {/* MAIN CONTENT: TABLE VIEW vs RAW JSON VIEW */}
            {viewMode === 'table' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto max-h-[580px] custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="px-4 py-3 font-bold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-bold whitespace-nowrap">Row Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {/* INLINE ADD NEW ROW DRAFT */}
                      {isAddingNewRow && (
                        <tr className="bg-indigo-950/40 border-b-2 border-indigo-500/80 animate-in fade-in">
                          {columns.map((col) => (
                            <td key={col} className="px-3 py-2">
                              <input
                                type="text"
                                value={newRowDraft[col] !== undefined ? String(newRowDraft[col]) : ''}
                                onChange={(e) =>
                                  setNewRowDraft({ ...newRowDraft, [col]: e.target.value })
                                }
                                placeholder={`Enter ${col}...`}
                                className="w-full bg-slate-950 border border-indigo-700/80 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={handleSaveNewRow}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                title="Insert New Row"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={handleCancelAddRow}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* DATA ROWS */}
                      {filteredRecords.length === 0 && !isAddingNewRow ? (
                        <tr>
                          <td colSpan={columns.length + 1} className="text-center py-12 text-slate-500">
                            No records found in table "{currentTable.label}". Click "+ Add Row" to insert data.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((row) => {
                          const isEditing = editingRowId === row.id;

                          if (isEditing) {
                            // INLINE ROW EDITING MODE
                            return (
                              <tr key={row.id} className="bg-indigo-950/50 border-y border-indigo-600">
                                {columns.map((col) => (
                                  <td key={col} className="px-3 py-2">
                                    {col === 'id' ? (
                                      <span className="font-mono text-slate-400 text-[11px] block px-2 py-1 bg-slate-950/80 rounded border border-slate-800">
                                        {row.id}
                                      </span>
                                    ) : (
                                      <input
                                        type="text"
                                        value={
                                          inlineRowData[col] !== undefined
                                            ? typeof inlineRowData[col] === 'object'
                                              ? JSON.stringify(inlineRowData[col])
                                              : String(inlineRowData[col])
                                            : ''
                                        }
                                        onChange={(e) => {
                                          let val: any = e.target.value;
                                          if (typeof row[col] === 'number') {
                                            const parsedNum = Number(val);
                                            if (!isNaN(parsedNum)) val = parsedNum;
                                          } else if (typeof row[col] === 'boolean') {
                                            val = val === 'true';
                                          }
                                          setInlineRowData({ ...inlineRowData, [col]: val });
                                        }}
                                        className="w-full bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                                      />
                                    )}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleSaveInlineEdit(row.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                      title="Save Row Edits"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={handleCancelInlineEdit}
                                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                      title="Cancel Edit"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          // NORMAL DISPLAY ROW
                          return (
                            <tr key={row.id} className="hover:bg-slate-800/40 transition-colors group">
                              {columns.map((col) => {
                                const val = row[col];
                                const isId = col === 'id';
                                const isCode = col === 'code';
                                const isRole = col === 'role';

                                return (
                                  <td key={col} className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate">
                                    {isId ? (
                                      <span className="font-mono text-indigo-400 font-semibold text-[11px]">
                                        {String(val)}
                                      </span>
                                    ) : isCode ? (
                                      <span className="font-mono font-bold text-teal-300 bg-teal-950/70 border border-teal-800/60 px-1.5 py-0.5 rounded text-[11px]">
                                        {String(val)}
                                      </span>
                                    ) : isRole ? (
                                      <span className="text-[10px] font-mono font-bold uppercase bg-indigo-950/80 border border-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded">
                                        {String(val).replace('_', ' ')}
                                      </span>
                                    ) : typeof val === 'object' && val !== null ? (
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded">
                                        {Array.isArray(val) ? `[${val.length} items]` : '{object}'}
                                      </span>
                                    ) : val === null || val === undefined ? (
                                      <span className="text-slate-600 text-[10px] italic">null</span>
                                    ) : (
                                      <span>{String(val)}</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* ROW-WISE ACTIONS */}
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleStartInlineEdit(row)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white transition-colors flex items-center gap-1"
                                    title="Edit Row Inline"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenJsonModal(row)}
                                    className="p-1 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                                    title="Edit Raw Record JSON"
                                  >
                                    <Code2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="p-1 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-500 hover:text-rose-400 transition-colors"
                                    title="Delete Row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // RAW JSON PREVIEW FOR ENTIRE TABLE
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-mono text-slate-400">
                    JSON Array &bull; {filteredRecords.length} Records
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(filteredRecords, null, 2));
                      showMsg('Table JSON copied to clipboard.');
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="font-mono text-xs text-teal-300 bg-slate-900/80 p-4 rounded-xl overflow-x-auto max-h-[500px] custom-scrollbar">
                  {JSON.stringify(filteredRecords, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BACKUP & DISASTER RECOVERY */}
      {currentSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Full Institutional Database Backup</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Download a cryptographically sound, monolithic JSON snapshot of all 22 database collections (users, hierarchy, curriculum, blueprint templates, enrollments, and question-wise marks).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Collections Included:</span>
                <span className="font-mono font-bold text-indigo-400">22 Tables</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Total Stored Entities:</span>
                <span className="font-mono font-bold text-white">
                  {Object.values(tablesRegistry).reduce((acc, t) => acc + t.data.length, 0)} Records
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Target Institution:</span>
                <span className="font-mono text-slate-400">{tenant?.name || 'Academic Institution'}</span>
              </div>
            </div>
            <button
              onClick={handleExportFullDatabase}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Generate &amp; Download Full Database Snapshot (.json)</span>
            </button>
          </div>

          {/* Import / Restore Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Restore Database Snapshot</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Restore institutional state from a verified snapshot JSON. Reconstructs all faculties, departments, courses, rubrics, and examination mark rosters seamlessly.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
              <strong>Caution:</strong> Importing a snapshot replaces existing live records. Ensure you download a backup snapshot beforehand.
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-teal-600/50 hover:border-teal-500 text-teal-300 hover:text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Select Snapshot JSON File to Restore</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: JSON DEEP RECORD EDITOR */}
      {jsonModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  JSON Deep Record Editor &bull; {activeTableKey} [{jsonModalRecord.id}]
                </h3>
              </div>
              <button
                onClick={() => setJsonModalRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {jsonModalError && (
              <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs font-mono">
                {jsonModalError}
              </div>
            )}

            <form onSubmit={handleSaveJsonModal} className="space-y-4">
              <textarea
                value={jsonModalText}
                onChange={(e) => setJsonModalText(e.target.value)}
                rows={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-teal-300 font-mono focus:border-indigo-500 focus:outline-none custom-scrollbar"
                spellCheck={false}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJsonModalRecord(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Record JSON</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
