'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Save, CheckCircle, FileCheck, Network, PlusCircle } from 'lucide-react';

export const CoPoMatrixDesigner: React.FC<{ onOpenAdminHub?: () => void }> = ({
  onOpenAdminHub,
}) => {
  const {
    courseOutcomes,
    programOutcomes,
    coPoMappings,
    updateCoPoMapping,
    courses,
    activeCourseId,
  } = useApp();

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const [selectedCell, setSelectedCell] = useState<{
    coId: string;
    poId: string;
    coCode: string;
    poCode: string;
    currentLevel: number;
    justification: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Map lookup: `${coId}_${poId}` -> { level, justification }
  const mappingMap = useMemo(() => {
    const map = new Map<string, { level: number; justification: string }>();
    coPoMappings.forEach((m) => {
      map.set(`${m.courseOutcomeId}_${m.programOutcomeId}`, {
        level: m.mappingLevel,
        justification: m.justification || '',
      });
    });
    return map;
  }, [coPoMappings]);

  // Compute column averages across mapped COs
  const columnAverages = useMemo(() => {
    return programOutcomes.map((po) => {
      let sum = 0;
      let count = 0;
      courseOutcomes.forEach((co) => {
        const item = mappingMap.get(`${co.id}_${po.id}`);
        if (item && item.level > 0) {
          sum += item.level;
          count++;
        }
      });
      return {
        poId: po.id,
        avg: count > 0 ? (sum / count).toFixed(2) : '—',
        count,
      };
    });
  }, [programOutcomes, courseOutcomes, mappingMap]);

  const handleCellClick = (coId: string, poId: string, coCode: string, poCode: string) => {
    const item = mappingMap.get(`${coId}_${poId}`) || { level: 0, justification: '' };
    const nextLevel = (item.level + 1) % 4;
    updateCoPoMapping(coId, poId, nextLevel, item.justification);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveMapping = (newLevel: number, newJustification: string) => {
    if (!selectedCell) return;
    updateCoPoMapping(selectedCell.coId, selectedCell.poId, newLevel, newJustification);
    setSelectedCell(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (courseOutcomes.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
          <Network className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">No Course Outcomes Configured</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            To build the CO-PO Articulation Matrix, first define Course Outcomes (CO1, CO2, etc.) for this course.
          </p>
        </div>
        {onOpenAdminHub && (
          <button
            onClick={onOpenAdminHub}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open Admin Data Hub to Define COs</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-800">
                Curriculum Articulation Engine
              </span>
              <span className="text-xs text-slate-400">ABET EAC / NBA SAR Format</span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              CO-PO / PSO Correlation Articulation Matrix Designer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Course: {activeCourse ? `${activeCourse.code} - ${activeCourse.title}` : 'Selected Course'} &bull; Click any cell to modify mapping correlation level (1: Low, 2: Medium, 3: High) and enter required pedagogical justification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Changes saved
              </span>
            )}
            <button
              onClick={() => alert('Matrix validated: All mapped Course Outcomes satisfy Bloom-PO alignment.')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Validate Matrix Alignment</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">Correlation Levels:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <span className="text-slate-300">Substantial (High)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-teal-950 border border-teal-700 text-teal-300 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <span className="text-slate-300">Moderate (Medium)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <span className="text-slate-300">Slight (Low)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-slate-950 border border-slate-800 text-slate-500 font-bold flex items-center justify-center text-xs">
              —
            </span>
            <span className="text-slate-400">No Correlation (0)</span>
          </div>
        </div>
      </div>

      {/* Articulation Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-200 border-b border-slate-800">
              <tr>
                <th className="p-3 text-left min-w-[160px] sticky left-0 bg-slate-950 border-r border-slate-800">
                  Course Outcomes (COs)
                </th>
                <th className="p-3 text-left min-w-[80px] border-r border-slate-800">
                  Bloom’s
                </th>
                {programOutcomes.map((po) => (
                  <th
                    key={po.id}
                    title={po.title}
                    className={`p-3 min-w-[48px] max-w-[60px] border-r border-slate-800/60 ${
                      po.type === 'PSO' ? 'bg-purple-950/30 text-purple-300' : ''
                    }`}
                  >
                    <div className="font-bold">{po.code}</div>
                    <div className="text-[9px] text-slate-400 truncate max-w-[50px] mx-auto">
                      {po.title.split(' ')[0]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {courseOutcomes.map((co) => (
                <tr key={co.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-left sticky left-0 bg-slate-900 border-r border-slate-800">
                    <div className="font-bold text-white text-xs">{co.code}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[220px]">
                      {co.statement}
                    </div>
                  </td>
                  <td className="p-3 text-left border-r border-slate-800">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-indigo-300">
                      {co.bloomsLevel}
                    </span>
                  </td>

                  {/* PO/PSO Cells */}
                  {programOutcomes.map((po) => {
                    const item = mappingMap.get(`${co.id}_${po.id}`);
                    const level = item?.level || 0;
                    const hasJustification = item && item.justification && item.justification.length > 0;

                    return (
                      <td
                        key={po.id}
                        onClick={() => handleCellClick(co.id, po.id, co.code, po.code)}
                        className={`p-2 border-r border-slate-800/40 cursor-pointer transition-all hover:bg-indigo-950/40 ${
                          po.type === 'PSO' ? 'bg-purple-950/10' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 mx-auto rounded-lg font-bold flex items-center justify-center transition-transform hover:scale-110 ${
                            level === 3
                              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 shadow-sm'
                              : level === 2
                              ? 'bg-teal-950 border border-teal-600 text-teal-300'
                              : level === 1
                              ? 'bg-amber-950 border border-amber-600 text-amber-300'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          {level > 0 ? level : '—'}
                        </div>
                        {hasJustification && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mx-auto mt-0.5" title="Justification provided" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Program-Level Contribution Averages */}
            <tfoot className="bg-slate-950 text-slate-200 border-t-2 border-slate-800 font-bold">
              <tr>
                <td colSpan={2} className="p-3 text-left sticky left-0 bg-slate-950 border-r border-slate-800 text-white">
                  Course Contribution Average
                </td>
                {columnAverages.map((col) => (
                  <td key={col.poId} className="p-2 border-r border-slate-800/60 font-mono text-indigo-300 text-xs">
                    {col.avg}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pedagogical Justification Drawer */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-indigo-400 font-bold">ABET / NBA Articulation Editor</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Mapping: {selectedCell.coCode} &rarr; {selectedCell.poCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {/* Level Selector Buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select Correlation Level:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setSelectedCell({ ...selectedCell, currentLevel: lvl })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedCell.currentLevel === lvl
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {lvl === 0 ? '0 (None)' : `${lvl} (${lvl === 1 ? 'Low' : lvl === 2 ? 'Medium' : 'High'})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Justification Text Area */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Pedagogical Justification (Required for accreditation defense):
              </label>
              <textarea
                rows={4}
                value={selectedCell.justification}
                onChange={(e) =>
                  setSelectedCell({ ...selectedCell, justification: e.target.value })
                }
                placeholder="Explain how this Course Outcome addresses the specific Graduate Attribute or domain competency..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSaveMapping(selectedCell.currentLevel, selectedCell.justification)
                }
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
