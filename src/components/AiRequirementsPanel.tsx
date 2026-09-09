import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Lock,
  RotateCw,
  FileText,
  HelpCircle,
  ShieldCheck,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { sanitizePii, SanitizationResult } from '../utils/encryption';

interface AiRequirementsPanelProps {
  onGenerate: (requirements: string) => Promise<void>;
  onRefine: (refinementPrompt: string) => Promise<void>;
  isGenerating: boolean;
  isSanitizerActive: boolean;
  currentRequirements: string;
  onRequirementsChange: (text: string) => void;
}

const SAMPLE_PROMPT_SUGGESTIONS = [
  'Add an SLA timer boundary event that escalates to Senior Manager after 48 hours',
  'Insert a parallel gateway to conduct legal review and financial credit check simultaneously',
  'Add an automated retry loop with exponential backoff if the external payment API fails',
  'Introduce a dedicated Compliance Officer swimlane with manual document sign-off',
];

export const AiRequirementsPanel: React.FC<AiRequirementsPanelProps> = ({
  onGenerate,
  onRefine,
  isGenerating,
  isSanitizerActive,
  currentRequirements,
  onRequirementsChange,
}) => {
  const [refinementInput, setRefinementInput] = useState('');
  const [sanitizationPreview, setSanitizationPreview] = useState<SanitizationResult | null>(null);
  const [showSanitizeDetails, setShowSanitizeDetails] = useState(false);

  // Check PII in real-time when text changes and sanitizer is active
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onRequirementsChange(text);
    if (isSanitizerActive) {
      const res = sanitizePii(text);
      setSanitizationPreview(res);
    } else {
      setSanitizationPreview(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!currentRequirements.trim()) return;

    let payload = currentRequirements;
    if (isSanitizerActive) {
      const res = sanitizePii(currentRequirements);
      payload = res.sanitizedText;
    }

    await onGenerate(payload);
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementInput.trim() || isGenerating) return;

    let payload = refinementInput;
    if (isSanitizerActive) {
      const res = sanitizePii(refinementInput);
      payload = res.sanitizedText;
    }

    await onRefine(payload);
    setRefinementInput('');
  };

  const handleApplySuggestion = (suggestion: string) => {
    setRefinementInput(suggestion);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200 select-none">
      {/* Top Description */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center space-x-2 mb-1">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Requirements & Notes Engine
          </h2>
        </div>
        <p className="text-[11px] text-slate-400">
          Describe the business process or paste stakeholder interview notes. The AI Assistant will construct compliant BPMN 2.0 pools, swimlanes, decision gateways, RACI matrix, and user stories.
        </p>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* Requirements Input Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Plain English Requirements & Interview Notes</span>
            </label>

            {isSanitizerActive && sanitizationPreview && sanitizationPreview.replacementCount > 0 && (
              <button
                type="button"
                onClick={() => setShowSanitizeDetails(!showSanitizeDetails)}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1 hover:bg-emerald-900/60 transition"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{sanitizationPreview.replacementCount} PII Items Masked</span>
              </button>
            )}
          </div>

          <textarea
            rows={8}
            value={currentRequirements}
            onChange={handleTextChange}
            placeholder="e.g. 
- Customer requests onboarding via mobile app.
- Automated service runs identity verification and sanctions scan.
- If risk score > 85%, account is provisioned in Core Banking.
- If between 50-85%, routed to Compliance Officer for manual investigation.
- If rejected, audit record created and user notified..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 font-sans text-xs focus:border-indigo-500 focus:outline-none transition leading-relaxed"
          />
        </div>

        {/* PII Masking preview modal/box if open */}
        {showSanitizeDetails && sanitizationPreview && sanitizationPreview.replacementCount > 0 && (
          <div className="bg-slate-950 border border-emerald-800/80 rounded-lg p-2.5 text-[11px] space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center justify-between">
              <span>Active PII Sanitization Log</span>
              <button
                onClick={() => setShowSanitizeDetails(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {sanitizationPreview.maskingLog.map((item, i) => (
                <div key={i} className="flex items-center justify-between font-mono text-[10px] text-slate-300">
                  <span className="text-amber-400">{item.type}: {item.original}</span>
                  <span className="text-emerald-400 font-semibold">{item.token}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !currentRequirements.trim()}
          className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Synthesizing BPMN 2.0 Model & BA Artifacts...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate BPMN 2.0 Workflow</span>
            </>
          )}
        </button>

        <div className="border-t border-slate-800 my-2" />

        {/* Conversational Refinement Section */}
        <div>
          <div className="flex items-center space-x-1.5 mb-1.5 text-slate-300 font-medium text-[11px]">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Conversational Process Refinement</span>
          </div>

          <form onSubmit={handleRefineSubmit} className="relative">
            <input
              type="text"
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="e.g. Add 24h escalation timer when review stalls..."
              className="w-full bg-slate-950 border border-slate-700 rounded-md pl-2.5 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || !refinementInput.trim()}
              className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded transition"
              title="Apply Refinement"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Prompt chips */}
          <div className="mt-2 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick Refinements:</span>
            <div className="flex flex-col space-y-1">
              {SAMPLE_PROMPT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplySuggestion(sug)}
                  className="text-left px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-indigo-300 border border-slate-700/60 transition line-clamp-1"
                >
                  • {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
