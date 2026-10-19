'use client';

import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminDatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDatabaseManagerModal: React.FC<AdminDatabaseManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    academicScope,
    tenant,
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
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [recordJsonString, setRecordJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Registry of all 22 database tables (memoized unconditionally)
  const tablesRegistry: Record<string, { label: string; data: any[]; icon: string }> = useMemo(() => ({
    users: { label: 'User Accounts (RBAC)', data: users, icon: '👥' },
    faculties: { label: 'Academic Faculties', data: faculties, icon: '🏛️' },
    schools: { label: 'Schools', data: schools, icon: '🏫' },
    departments: { label: 'Departments', data: departments, icon: '🏢' },
    regulations: { label: 'Curriculum Regulations', data: regulations, icon: '📜' },
    programs: { label: 'Degree Programs', data: programs, icon: '🎓' },
    programOutcomes: { label: 'Program Outcomes (POs/PSOs)', data: programOutcomes, icon: '🎯' },
    terms: { label: 'Academic Terms', data: terms, icon: '📅' },
    courses: { label: 'Course Catalog', data: courses, icon: '📚' },
    courseSections: { label: 'Course Sections & Faculty', data: courseSections, icon: '🗂️' },
    courseOutcomes: { label: 'Course Outcomes (COs)', data: courseOutcomes, icon: '🎯' },
    coPoMappings: { label: 'CO-PO Matrix (0-3)', data: coPoMappings, icon: '📊' },
    scoringSchemes: { label: 'Evaluation Schemes', data: scoringSchemes, icon: '⚖️' },
    scoringSubComponents: { label: 'Assessment Sub-Components', data: scoringSubComponents, icon: '📝' },
    assessmentWindows: { label: 'Assessment Windows & Deadlines', data: assessmentWindows, icon: '⏰' },
    questionPapers: { label: 'Question Papers', data: questionPapers, icon: '📄' },
    questionPaperSections: { label: 'Paper Sections', data: questionPaperSections, icon: '📑' },
    questionPaperTemplates: { label: 'Blueprint Templates', data: questionPaperTemplates, icon: '📐' },
    questions: { label: 'Question Items & Blooms', data: questions, icon: '❓' },
    students: { label: 'Student Enrollments', data: students, icon: '🧑‍🎓' },
    marks: { label: 'Student Mark Records', data: marks, icon: '🔢' },
    outgoingEmails: { label: 'Outgoing Email Logs', data: outgoingEmails, icon: '✉️' },
  }), [
    users, faculties, schools, departments, regulations, programs, programOutcomes,
    terms, courses, courseSections, courseOutcomes, coPoMappings, scoringSchemes,
    scoringSubComponents, assessmentWindows, questionPapers, questionPaperSections,
    questionPaperTemplates, questions, students, marks, outgoingEmails
  ]);

  const currentTable = tablesRegistry[activeTableKey] || tablesRegistry.users;
  const tableData: any[] = currentTable.data || [];

  // Filter records by search query across all stringified fields (unconditional useMemo)
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

  // Extract display columns (unconditional useMemo)
  const columns = useMemo(() => {
    if (tableData.length === 0) return ['id'];
    const keys = new Set<string>();
    tableData.slice(0, 10).forEach((row) => {
      Object.keys(row).forEach((k) => keys.add(k));
    });
    const allKeys = Array.from(keys);
    const priority = ['id', 'name', 'code', 'title', 'fullName', 'email', 'role', 'status'];
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

  // Security Gate: Accessible ONLY to Tenant Admins & Super Admins
  if (!isOpen) return null;

  if (!academicScope.isAdmin && currentUser?.role !== 'TENANT_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-slate-900 border border-rose-800 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Access Denied</h3>
          <p className="text-xs text-rose-300">
            The Database Operations & Master Data Hub is strictly restricted to Institutional Administrators.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleEditRecord = (record: any) => {
    setIsCreatingNew(false);
    setEditingRecord(record);
    setRecordJsonString(JSON.stringify(record, null, 2));
    setJsonError(null);
  };

  const handleCreateNewRecord = () => {
    setIsCreatingNew(true);
    const template: Record<string, any> = {
      id: `${activeTableKey.slice(0, 4)}-${Date.now()}`,
    };
    columns.forEach((c) => {
      if (c !== 'id') template[c] = '';
    });
    setEditingRecord(template);
    setRecordJsonString(JSON.stringify(template, null, 2));
    setJsonError(null);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(recordJsonString);
      if (!parsed.id) {
        setJsonError('Record MUST include a unique "id" field.');
        return;
      }
      if (isCreatingNew) {
        addDbTableRecord(activeTableKey, parsed);
        showToast(`Created new record in table "${activeTableKey}" with ID: ${parsed.id}`);
      } else {
        const targetId = editingRecord?.id || parsed.id;
        updateDbTableRecord(activeTableKey, targetId, parsed);
        showToast(`Updated record in "${activeTableKey}" [${targetId}]`);
      }
      setEditingRecord(null);
      setIsCreatingNew(false);
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    if (confirm(`Permanently delete record [${recordId}] from "${activeTableKey}"? This action modifies the live database state.`)) {
      deleteDbTableRecord(activeTableKey, recordId);
      showToast(`Deleted record [${recordId}] from "${activeTableKey}"`);
    }
  };

  const handleClearTable = () => {
    if (confirm(`CRITICAL WARNING: Wipe all records from "${activeTableKey}"? If you clear users, your session user will be preserved.`)) {
      clearDbTable(activeTableKey);
      showToast(`Cleared all records from "${activeTableKey}"`);
    }
  };

  const handleExportTableJson = () => {
    const jsonStr = JSON.stringify(tableData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_${activeTableKey}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${activeTableKey}" table as JSON.`);
  };

  const handleExportFullBackup = () => {
    const fullBackup = exportDatabaseSnapshot();
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Database_Backup_${tenant?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Academic_ERP'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported complete full database snapshot.');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.version && (parsed.tenant || parsed.users)) {
          // Full database snapshot
          const res = importDatabaseSnapshot(parsed);
          showToast(res.message, res.success ? 'success' : 'error');
        } else if (Array.isArray(parsed)) {
          // Table array import: append records with ID
          parsed.forEach((row) => {
            if (row && typeof row === 'object') {
              addDbTableRecord(activeTableKey, row);
            }
          });
          showToast(`Imported ${parsed.length} records into "${activeTableKey}".`);
        } else {
          showToast('Unrecognized JSON format. Expected full DB backup or array of records.', 'error');
        }
      } catch (err: any) {
        showToast(`Failed to parse JSON file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Master Database Management Hub
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                  ADMINISTRATOR EXCLUSIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct raw CRUD interface for all 22 database tables with live state synchronization and JSON backups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFullBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              title="Download Full Database Backup Snapshot (.json)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Full DB Backup</span>
            </button>

            <label
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-colors"
              title="Restore Database or Table from JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Restore / Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1 transition-colors"
              title="Close Database Hub"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
                : 'bg-rose-950 border-rose-800 text-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Main Body: Left Sidebar (Table List) + Right Content (Records Grid) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Tables Navigation Sidebar */}
          <div className="w-64 sm:w-72 border-r border-slate-800 bg-slate-900/40 p-3 overflow-y-auto space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Database Tables ({Object.keys(tablesRegistry).length})
            </div>
            {Object.entries(tablesRegistry).map(([key, info]) => {
              const isActive = activeTableKey === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTableKey(key);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{info.icon}</span>
                    <span className="truncate">{info.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {info.data.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Data View Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
            {/* Table Actions Toolbar */}
            <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search within ${currentTable.label}...`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white text-xs underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3 h-3" />
                    <span>Grid View</span>
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      viewMode === 'json' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>Raw JSON</span>
                  </button>
                </div>

                <button
                  onClick={handleCreateNewRecord}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  title="Add new record to this table"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Row</span>
                </button>

                <button
                  onClick={handleExportTableJson}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
                  title="Export this table as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  onClick={handleClearTable}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-rose-400 rounded-xl text-xs font-medium transition-colors"
                  title="Wipe all records in this table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe</span>
                </button>
              </div>
            </div>

            {/* Content: Grid View or Raw JSON */}
            <div className="flex-1 overflow-auto p-4">
              {viewMode === 'json' ? (
                <div className="h-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 overflow-auto">
                  <pre>{JSON.stringify(filteredRecords, null, 2)}</pre>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                  <Database className="w-10 h-10 text-slate-700" />
                  <p>No records found in table "{activeTableKey}" matching query.</p>
                  <button
                    onClick={handleCreateNewRecord}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 text-xs"
                  >
                    + Insert First Record
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        {columns.map((col) => (
                          <th key={col} className="px-3.5 py-2.5">
                            {col}
                          </th>
                        ))}
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                      {filteredRecords.map((row: any, idx: number) => {
                        const rowId = row.id || `${row.courseOutcomeId}_${row.programOutcomeId}` || `row-${idx}`;
                        return (
                          <tr key={rowId} className="hover:bg-slate-800/40 transition-colors">
                            {columns.map((col) => {
                              const val = row[col];
                              let displayVal = '';
                              if (val === null || val === undefined) displayVal = '—';
                              else if (typeof val === 'object') displayVal = JSON.stringify(val);
                              else displayVal = String(val);

                              return (
                                <td key={col} className="px-3.5 py-2 max-w-[180px] truncate" title={displayVal}>
                                  {col === 'id' ? (
                                    <span className="font-bold text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                                      {displayVal}
                                    </span>
                                  ) : (
                                    displayVal
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3.5 py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditRecord(row)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                  title="Edit Record JSON / Values"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(row.id || rowId)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Summary Bar */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div>
                Showing <strong>{filteredRecords.length}</strong> of <strong>{tableData.length}</strong> records in "{activeTableKey}"
              </div>
              <div>Live Client DB Persistence: Active (Synced with LocalStorage)</div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT / INSERT RECORD (Interactive JSON / Key-Value Editor) */}
      {editingRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  {isCreatingNew ? `Insert New Record in "${activeTableKey}"` : `Edit Record [${editingRecord.id}] in "${activeTableKey}"`}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Raw JSON Record Payload (Modify any field directly):
                </label>
                <textarea
                  rows={14}
                  value={recordJsonString}
                  onChange={(e) => {
                    setRecordJsonString(e.target.value);
                    setJsonError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {jsonError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isCreatingNew ? 'Insert Record' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
