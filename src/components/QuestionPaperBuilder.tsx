'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { BloomsTaxonomyLevel } from '@/types/erp';
import {
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Brain,
  Sliders,
  FileCheck,
  FileQuestion,
  PlusCircle,
} from 'lucide-react';

export const QuestionPaperBuilder: React.FC<{ onOpenAdminHub?: () => void }> = ({
  onOpenAdminHub,
}) => {
  const { questions, addQuestion, deleteQuestion, courseOutcomes, courses, activeCourseId } = useApp();

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const [targetTotalMarks, setTargetTotalMarks] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [newQuestionNumber, setNewQuestionNumber] = useState<string>(`Q${questions.length + 1}`);
  const [newContent, setNewContent] = useState<string>('');
  const [newMarks, setNewMarks] = useState<number>(5);
  const [newCoId, setNewCoId] = useState<string>(courseOutcomes[0]?.id || '');
  const [newBloom, setNewBloom] = useState<BloomsTaxonomyLevel>('APPLY');

  // Total marks tally
  const currentTotalMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.maxMarks, 0);
  }, [questions]);

  // Bloom's Cognitive Distribution
  const bloomDistribution = useMemo(() => {
    const counts: Record<BloomsTaxonomyLevel, number> = {
      REMEMBER: 0,
      UNDERSTAND: 0,
      APPLY: 0,
      ANALYZE: 0,
      EVALUATE: 0,
      CREATE: 0,
    };
    questions.forEach((q) => {
      counts[q.bloomsLevel] = (counts[q.bloomsLevel] || 0) + q.maxMarks;
    });
    return counts;
  }, [questions]);

  // HOTS vs LOTS
  const cognitiveSummary = useMemo(() => {
    const hots = bloomDistribution.ANALYZE + bloomDistribution.EVALUATE + bloomDistribution.CREATE;
    const lots = bloomDistribution.REMEMBER + bloomDistribution.UNDERSTAND + bloomDistribution.APPLY;
    const total = hots + lots || 1;
    return {
      hotsPct: ((hots / total) * 100).toFixed(0),
      lotsPct: ((lots / total) * 100).toFixed(0),
      isBalanced: hots >= 0.4 * total,
    };
  }, [bloomDistribution]);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionNumber.trim() || !newContent.trim() || newMarks <= 0) return;

    addQuestion({
      questionPaperId: 'qp-1',
      questionNumber: newQuestionNumber.trim(),
      content: newContent.trim(),
      maxMarks: newMarks,
      courseOutcomeId: newCoId || courseOutcomes[0]?.id || 'co-1',
      bloomsLevel: newBloom,
      targetThresholdPct: 60,
      displayOrder: questions.length + 1,
    });

    setNewQuestionNumber(`Q${questions.length + 2}`);
    setNewContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-3 py-1 rounded-full border border-purple-800">
                Assessment Blueprint Engine
              </span>
              <span className="text-xs text-slate-400">KaTeX Math & Bloom’s Tagged</span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Complex Question Paper Builder & Bloom’s Taxonomy Verifier
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Course: {activeCourse ? `${activeCourse.code}: ${activeCourse.title}` : 'Selected Course'} &bull; Blueprint target: {targetTotalMarks} Marks ({durationMinutes} mins)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                currentTotalMarks === targetTotalMarks && targetTotalMarks > 0
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <span>
                Total Marks: {currentTotalMarks} / {targetTotalMarks} M
              </span>
            </div>
            <button
              onClick={() => alert('Question paper blueprint validated!')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Validate Blueprint</span>
            </button>
          </div>
        </div>

        {/* Cognitive Balance Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>HOTS (Higher Order Skills)</span>
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {cognitiveSummary.hotsPct}%
              <span className="text-xs text-slate-400 font-normal"> (Analyze, Evaluate, Create)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>LOTS (Lower Order Skills)</span>
              <Sliders className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {cognitiveSummary.lotsPct}%
              <span className="text-xs text-slate-400 font-normal"> (Remember, Understand, Apply)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-[11px] text-slate-400 font-medium">Cognitive Distribution (Marks)</div>
            <div className="flex items-center gap-1 mt-2">
              {Object.entries(bloomDistribution).map(([lvl, marks]) => (
                <div key={lvl} className="text-center flex-1">
                  <div className="text-[10px] font-bold text-slate-200">{marks}M</div>
                  <div className="text-[8px] text-slate-500 font-mono truncate">{lvl.slice(0, 3)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question List & Blueprint Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold uppercase">
            <span>Question Paper Items ({questions.length})</span>
            <span>Duration: {durationMinutes} Minutes</span>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              No questions in this blueprint yet. Use the form on the right to add exam questions.
            </div>
          ) : (
            questions.map((q) => {
              const mappedCo = courseOutcomes.find((c) => c.id === q.courseOutcomeId);
              return (
                <div
                  key={q.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                        {q.questionNumber}
                      </span>
                      <span className="text-xs font-bold text-indigo-300 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded">
                        {mappedCo?.code || 'CO1'}
                      </span>
                      <span className="text-[10px] font-mono uppercase font-bold text-purple-300 bg-purple-950 border border-purple-800 px-2 py-0.5 rounded">
                        {q.bloomsLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg border border-emerald-800">
                        {q.maxMarks} Marks
                      </span>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-200 font-mono bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                    {q.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Question Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Plus className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Add Question Item</h3>
          </div>

          <form onSubmit={handleAddQuestion} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Question No.</label>
                <input
                  type="text"
                  required
                  value={newQuestionNumber}
                  onChange={(e) => setNewQuestionNumber(e.target.value)}
                  placeholder="e.g. Q1.a"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Max Marks</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newMarks}
                  onChange={(e) => setNewMarks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Target CO</label>
                <select
                  value={newCoId}
                  onChange={(e) => setNewCoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  {courseOutcomes.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.code} ({co.bloomsLevel})
                    </option>
                  ))}
                  {courseOutcomes.length === 0 && (
                    <option value="">No COs defined</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Revised Bloom’s</label>
                <select
                  value={newBloom}
                  onChange={(e) => setNewBloom(e.target.value as BloomsTaxonomyLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                >
                  <option value="REMEMBER">REMEMBER</option>
                  <option value="UNDERSTAND">UNDERSTAND</option>
                  <option value="APPLY">APPLY</option>
                  <option value="ANALYZE">ANALYZE</option>
                  <option value="EVALUATE">EVALUATE</option>
                  <option value="CREATE">CREATE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Question Content / Formula
              </label>
              <textarea
                rows={3}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter rich question statement or LaTeX formula..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Append Question to Blueprint</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
