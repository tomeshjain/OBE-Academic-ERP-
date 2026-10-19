'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { validateAgainstSqlInjection, sanitizeInput } from '@/lib/security';

export interface BulkUploadColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number';
  description?: string;
  example?: string;
}

interface BulkDataUploadModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  entityName?: string;
  description?: string;
  sampleFileName?: string;
  columns: BulkUploadColumn[];
  sampleRows?: Record<string, string | number>[];
  onImport: (rows: Record<string, any>[]) => void;
  notes?: string;
}

export const BulkDataUploadModal: React.FC<BulkDataUploadModalProps> = ({
  isOpen = true,
  onClose,
  title,
  entityName = 'Data',
  description,
  sampleFileName,
  columns,
  sampleRows,
  onImport,
  notes,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<{ data: Record<string, any>; errors: string[] }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threatWarning, setThreatWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isOpen === false) return null;

  // 1. Download Sample CSV
  const handleDownloadTemplate = () => {
    const headers = columns.map((c) => c.key).join(',');
    const effectiveRows =
      sampleRows && sampleRows.length > 0
        ? sampleRows
        : [
            columns.reduce((acc, c) => {
              acc[c.key] = c.example !== undefined ? c.example : `${c.label} 1`;
              return acc;
            }, {} as Record<string, any>),
          ];

    const rows = effectiveRows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] !== undefined ? String(row[c.key]) : '';
          return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const downloadFileName =
      sampleFileName ||
      `${entityName.toLowerCase().replace(/\s+/g, '_')}_template_2026.csv`;
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse CSV text
  const parseCsvText = (text: string) => {
    setThreatWarning(null);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const headerLine = lines[0];
    const rawHeaders = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    const parsed: Array<{ data: Record<string, any>; errors: string[] }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // RFC-4180 simple regex splitter for commas inside quotes
      const values: string[] = [];
      let inQuotes = false;
      let currentVal = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^"|"$/g, ''));

      const rowObj: Record<string, any> = {};
      const rowErrors: string[] = [];

      columns.forEach((col) => {
        const headerIdx = rawHeaders.indexOf(col.key);
        let val = headerIdx !== -1 && values[headerIdx] !== undefined ? values[headerIdx] : '';

        // Security SQLi Check
        const sqliCheck = validateAgainstSqlInjection(val);
        if (!sqliCheck.isValid) {
          rowErrors.push(sqliCheck.detectedThreat || 'Potential SQL Injection pattern detected');
          setThreatWarning(sqliCheck.detectedThreat || 'SQL Injection attack payload intercepted and neutralized.');
        }

        val = sanitizeInput(val);

        if (col.required && (!val || val.trim().length === 0)) {
          rowErrors.push(`${col.label} is required`);
        }

        if (col.type === 'number') {
          const num = Number(val);
          rowObj[col.key] = isNaN(num) ? 0 : num;
        } else {
          rowObj[col.key] = val;
        }
      });

      parsed.push({ data: rowObj, errors: rowErrors });
    }

    setParsedRows(parsed);
  };

  // 3. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvText(text);
      setIsProcessing(false);
    };
    reader.readAsText(selected);
  };

  // 4. Confirm Import
  const validRows = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.data);

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;
    onImport(validRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400">
                {description ||
                  `Bulk import ${entityName} using standard CSV / Excel templates with automated schema & SQLi verification.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {threatWarning && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{threatWarning}</span>
            </div>
          )}

          {/* Action Row: Download Template & Upload Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Step 1 &bull; Download Template
                </span>
                <h4 className="text-sm font-bold text-white mt-1">Get Standard CSV Structure</h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Includes formatted column headers, validation rules, and sample Batch 2026 reference records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">
                  Step 2 &bull; Select CSV File
                </span>
                <h4 className="text-sm font-bold text-white mt-1">Upload Populated Sheet</h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Accepts `.csv` exported from MS Excel, Google Sheets, or LibreOffice Calc.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>{file ? file.name : 'Choose CSV File...'}</span>
                </button>
              </div>
            </div>
          </div>

          {notes && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl text-slate-300 text-[11px] leading-relaxed flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{notes}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">
                  Parsed Data Preview ({parsedRows.length} rows loaded,{' '}
                  <span className="text-emerald-400">{validRows.length} valid</span>)
                </span>
                {parsedRows.length !== validRows.length && (
                  <span className="text-rose-400 text-[11px] font-semibold">
                    {parsedRows.length - validRows.length} invalid rows detected
                  </span>
                )}
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">Status</th>
                      {columns.map((c) => (
                        <th key={c.key} className="px-3 py-2 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {parsedRows.slice(0, 30).map((row, idx) => {
                      const isValid = row.errors.length === 0;
                      return (
                        <tr
                          key={idx}
                          className={isValid ? 'hover:bg-slate-800/30' : 'bg-rose-950/20 hover:bg-rose-950/30'}
                        >
                          <td className="px-3 py-2 text-center">
                            {isValid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                            ) : (
                              <span title={row.errors.join(', ')}>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mx-auto" />
                              </span>
                            )}
                          </td>
                          {columns.map((c) => (
                            <td key={c.key} className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                              {String(row.data[c.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setParsedRows([]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset File</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validRows.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none shadow-sm transition-colors"
            >
              Import {validRows.length} {entityName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
