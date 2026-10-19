'use client';

import React, { useState, useRef } from 'react';
import { LatexRenderer } from './LatexRenderer';
import {
  Type,
  Image as ImageIcon,
  Eye,
  Edit3,
  HelpCircle,
  X,
  Upload,
  Sparkles,
  Link,
  Trash2,
} from 'lucide-react';

interface RichQuestionEditorProps {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string;
  onImageUrlChange?: (url: string) => void;
  imageCaption?: string;
  onImageCaptionChange?: (caption: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichQuestionEditor: React.FC<RichQuestionEditorProps> = ({
  value,
  onChange,
  imageUrl = '',
  onImageUrlChange,
  imageCaption = '',
  onImageCaptionChange,
  placeholder = 'Type question statement... Use $...$ for inline math or $$...$$ for display formulas.',
  minHeight = '110px',
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showMathPalette, setShowMathPalette] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(imageUrl);
  const [captionInput, setCaptionInput] = useState(imageCaption);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert LaTeX token into cursor position
  const insertToken = (before: string, after: string = '') => {
    if (!textareaRef.current) {
      onChange(`${value} ${before}${after}`);
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selection = value.substring(start, end);
    const replacement = `${before}${selection || 'x'}${after}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + before.length,
          start + before.length + (selection ? selection.length : 1)
        );
      }
    }, 50);
  };

  // Handle local image file upload (converts to Base64 Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setImageUrlInput(dataUrl);
        if (onImageUrlChange) onImageUrlChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyImage = () => {
    if (onImageUrlChange) onImageUrlChange(imageUrlInput.trim());
    if (onImageCaptionChange) onImageCaptionChange(captionInput.trim());
    setShowImagePanel(false);
  };

  const handleRemoveImage = () => {
    setImageUrlInput('');
    setCaptionInput('');
    if (onImageUrlChange) onImageUrlChange('');
    if (onImageCaptionChange) onImageCaptionChange('');
    setShowImagePanel(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Editor Header Toolbar */}
      <div className="bg-slate-950/80 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Quick Formatting & Math Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick LaTeX Math Operators */}
          <button
            type="button"
            onClick={() => insertToken('$', '$')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono font-bold rounded-lg border border-slate-700 transition-colors"
            title="Inline Math: $x$"
          >
            $ Math $
          </button>
          <button
            type="button"
            onClick={() => insertToken('$$\n', '\n$$')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono font-bold rounded-lg border border-slate-700 transition-colors"
            title="Display Math Block: $$ ... $$"
          >
            $$ Block $$
          </button>
          <button
            type="button"
            onClick={() => insertToken('\\frac{', '}{b}')}
            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono rounded-lg border border-slate-700 transition-colors"
            title="Fraction: \frac{a}{b}"
          >
            &frac12; \frac
          </button>
          <button
            type="button"
            onClick={() => insertToken('\\sqrt{', '}')}
            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono rounded-lg border border-slate-700 transition-colors"
            title="Square Root: \sqrt{x}"
          >
            &radic; \sqrt
          </button>
          <button
            type="button"
            onClick={() => insertToken('\\int_{0}^{\\infty} ', ' dx')}
            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono rounded-lg border border-slate-700 transition-colors"
            title="Integral: \int"
          >
            &int; \int
          </button>
          <button
            type="button"
            onClick={() => insertToken('\\sum_{i=1}^{n} ', '')}
            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono rounded-lg border border-slate-700 transition-colors"
            title="Summation: \sum"
          >
            &Sigma; \sum
          </button>

          {/* More Math Palette Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setShowMathPalette(!showMathPalette)}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              showMathPalette
                ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Open Greek & Matrix Palette"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Greek &amp; Matrices</span>
          </button>

          {/* Image & Diagram Options Button */}
          <button
            type="button"
            onClick={() => setShowImagePanel(!showImagePanel)}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              imageUrl || showImagePanel
                ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Add Diagram or Image"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>{imageUrl ? 'Diagram Attached' : '+ Add Diagram'}</span>
          </button>
        </div>

        {/* Right: Write vs Preview Mode Toggle */}
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              activeTab === 'write' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview LaTeX</span>
          </button>
        </div>
      </div>

      {/* Expanded Math & Symbols Palette */}
      {showMathPalette && (
        <div className="bg-slate-950 px-3 py-2.5 border-b border-slate-800 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Click symbol to insert at cursor:
            </span>
            <button
              type="button"
              onClick={() => setShowMathPalette(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'α', code: '\\alpha' },
              { label: 'β', code: '\\beta' },
              { label: 'θ', code: '\\theta' },
              { label: 'λ', code: '\\lambda' },
              { label: 'π', code: '\\pi' },
              { label: 'Δ', code: '\\Delta' },
              { label: 'σ', code: '\\sigma' },
              { label: 'ω', code: '\\omega' },
              { label: '≤', code: '\\le' },
              { label: '≥', code: '\\ge' },
              { label: '≠', code: '\\ne' },
              { label: '≈', code: '\\approx' },
              { label: '±', code: '\\pm' },
              { label: '×', code: '\\times' },
              { label: '÷', code: '\\div' },
              { label: '∈', code: '\\in' },
              { label: '→', code: '\\to' },
              { label: '∞', code: '\\infty' },
              { label: 'x²', code: '^{2}' },
              { label: 'xᵢ', code: '_{i}' },
              { label: '2x2 Matrix', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
            ].map((sym) => (
              <button
                key={sym.code}
                type="button"
                onClick={() => insertToken(sym.code, '')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-indigo-200 border border-slate-800 hover:border-indigo-700 rounded font-mono text-xs transition-colors"
                title={sym.code}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Image / Diagram Attachment Panel */}
      {showImagePanel && (
        <div className="bg-slate-950 px-4 py-3 border-b border-teal-900/40 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              <span>Attach Question Diagram or Formula Figure</span>
            </span>
            <button
              type="button"
              onClick={() => setShowImagePanel(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Option A: Image URL */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Image Web URL:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/circuit-diagram.png"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Option B: Local File Upload */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Or Upload Local Image / Diagram File:
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Diagram (PNG, JPG, SVG)</span>
              </button>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Figure Caption (Optional):
            </label>
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="e.g. Figure 1: Moore State Machine Transition Graph"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            {imageUrlInput ? (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Attached Image</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">No image currently attached</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImagePanel(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyImage}
                className="px-3.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-sm"
              >
                Save Diagram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body: Write Mode or Preview Mode */}
      {activeTab === 'write' ? (
        <div className="p-3">
          <textarea
            ref={textareaRef}
            style={{ minHeight }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs leading-relaxed resize-y font-sans"
          />

          {/* Attached Image Thumbnail in Write Mode */}
          {imageUrl && (
            <div className="mt-2 p-2 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Attached Diagram"
                  className="w-12 h-12 object-contain rounded border border-slate-700 bg-white/5 shrink-0"
                />
                <div className="overflow-hidden">
                  <div className="text-white font-semibold text-xs truncate">
                    {imageCaption || 'Attached Diagram'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Will render below question text
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 text-slate-400 hover:text-rose-400 rounded"
                title="Remove Diagram"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-950/50" style={{ minHeight }}>
          <div className="text-[10px] uppercase font-bold text-indigo-400 mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>Real-time KaTeX LaTeX &amp; Diagram Preview</span>
          </div>

          {value.trim() || imageUrl ? (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <LatexRenderer
                content={value}
                imageUrl={imageUrl}
                imageCaption={imageCaption}
                className="text-white text-xs"
              />
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic py-4 text-center">
              No statement or formula entered yet. Type in Write mode to see live KaTeX rendering.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
