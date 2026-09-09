import React, { useState } from 'react';
import {
  FileCode2,
  Download,
  ShieldCheck,
  Share2,
  Sparkles,
  Layers,
  ChevronDown,
  CheckCircle,
  Lock,
  FileText,
  Image,
} from 'lucide-react';
import { ProcessDefinition } from '../types/bpmn';
import { generateBpmn20Xml, downloadFile } from '../utils/bpmnXmlGenerator';
import { BUSINESS_PROCESS_TEMPLATES } from '../data/templates';

interface HeaderProps {
  process: ProcessDefinition;
  onSelectTemplate: (templateId: string) => void;
  onOpenSecurityVault: () => void;
  onOpenPmSync: () => void;
  onExportDoc: () => void;
  isSanitizerActive: boolean;
  onToggleSanitizer: () => void;
  onProcessNameChange: (newName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  process,
  onSelectTemplate,
  onOpenSecurityVault,
  onOpenPmSync,
  onExportDoc,
  isSanitizerActive,
  onToggleSanitizer,
  onProcessNameChange,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(process.name);

  const handleExportXml = () => {
    const xml = generateBpmn20Xml(process);
    downloadFile(xml, `${process.name.toLowerCase().replace(/\s+/g, '_')}.bpmn`, 'application/xml');
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(process, null, 2);
    downloadFile(json, `${process.name.toLowerCase().replace(/\s+/g, '_')}.json`, 'application/json');
    setShowExportMenu(false);
  };

  const handleExportSvg = () => {
    const svgEl = document.getElementById('bpmn-canvas-svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    downloadFile(svgData, `${process.name.toLowerCase().replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
    setShowExportMenu(false);
  };

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onProcessNameChange(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none relative z-30">
      {/* Brand & Process Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/40">
          <FileCode2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              IT Analyst Assistant
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
              BPMN 2.0
            </span>
          </div>

          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="text-sm font-semibold bg-slate-800 text-white px-2 py-0.5 rounded border border-indigo-500 focus:outline-none"
            />
          ) : (
            <h1
              onClick={() => {
                setTitleInput(process.name);
                setIsEditingTitle(true);
              }}
              title="Click to rename process"
              className="text-sm font-semibold text-slate-100 hover:text-indigo-300 cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <span>{process.name}</span>
              <span className="text-xs text-slate-500 font-normal">v{process.version}</span>
            </h1>
          )}
        </div>
      </div>

      {/* Center Actions: Templates & Security Badges */}
      <div className="hidden md:flex items-center space-x-2">
        {/* Template Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Process Templates</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTemplateMenu && (
            <div className="absolute left-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pre-configured BA Processes
              </div>
              {BUSINESS_PROCESS_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    onSelectTemplate(tmpl.id);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition flex flex-col space-y-0.5"
                >
                  <span className="font-medium text-slate-200">{tmpl.name}</span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{tmpl.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Enterprise Shield / Security Badge */}
        <button
          onClick={onOpenSecurityVault}
          className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 transition"
          title="Open Enterprise Encryption & Compliance Vault"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Vault Active</span>
        </button>

        {/* PII Sanitization Toggle */}
        <button
          onClick={onToggleSanitizer}
          className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition ${
            isSanitizerActive
              ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/50'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
          title="Automatically mask personal names, emails, card numbers, and IDs before AI prompt dispatch"
        >
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>PII Shield: {isSanitizerActive ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right Controls: PM Sync & Export Menu */}
      <div className="flex items-center space-x-2">
        {/* PM Sync Button */}
        <button
          onClick={onOpenPmSync}
          className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Sync PM Tasks</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Industry-Standard Formats
              </div>
              <button
                onClick={handleExportXml}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition"
              >
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-medium">BPMN 2.0 XML (.bpmn)</div>
                  <div className="text-[10px] text-slate-400">Camunda / Signavio / draw.io</div>
                </div>
              </button>

              <button
                onClick={handleExportSvg}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition"
              >
                <Image className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-medium">Vector Graphic (.svg)</div>
                  <div className="text-[10px] text-slate-400">Crisp scalable vector</div>
                </div>
              </button>

              <button
                onClick={handleExportJson}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition"
              >
                <FileCode2 className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-medium">JSON Process Model (.json)</div>
                  <div className="text-[10px] text-slate-400">Structured workflow schema</div>
                </div>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  setShowExportMenu(false);
                  onExportDoc();
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-200 flex items-center space-x-2 transition"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-medium">BA Documentation (.md)</div>
                  <div className="text-[10px] text-slate-400">RACI, Stories, Gaps, KPIs</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
