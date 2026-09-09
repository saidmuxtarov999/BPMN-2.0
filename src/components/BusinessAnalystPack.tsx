import React, { useState } from 'react';
import {
  ProcessDefinition,
  RaciItem,
  GapAnalysisItem,
} from '../types/bpmn';
import {
  FileText,
  Copy,
  Check,
  Download,
  AlertOctagon,
  Target,
  Share2,
  Cpu,
  Layers,
  Award,
} from 'lucide-react';
import { downloadFile } from '../utils/bpmnXmlGenerator';

interface BusinessAnalystPackProps {
  process: ProcessDefinition;
}

export const BusinessAnalystPack: React.FC<BusinessAnalystPackProps> = ({ process }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const generateMarkdownDoc = () => {
    let md = `# Business Process Documentation: ${process.name}\n`;
    md += `**Version:** ${process.version} | **Last Updated:** ${process.lastUpdated}\n\n`;
    md += `## 1. Executive Summary\n${process.description}\n\n`;

    md += `## 2. Business Objectives & KPIs\n`;
    if (process.businessObjectives?.length) {
      md += `### Core Objectives\n`;
      process.businessObjectives.forEach((obj) => (md += `- ${obj}\n`));
      md += `\n`;
    }
    if (process.kpis?.length) {
      md += `### Key Performance Indicators\n`;
      md += `| Metric | Baseline | Target |\n|---|---|---|\n`;
      process.kpis.forEach((k) => (md += `| ${k.metric} | ${k.baseline} | ${k.target} |\n`));
      md += `\n`;
    }

    md += `## 3. RACI Accountability Matrix\n`;
    md += `| Task / Activity | Role | Code |\n|---|---|---|\n`;
    process.raciMatrix.forEach((r) => (md += `| ${r.taskName} | ${r.role} | **${r.code}** |\n`));
    md += `\n*R = Responsible, A = Accountable, C = Consulted, I = Informed*\n\n`;

    md += `## 4. User Stories & Acceptance Criteria (Agile Sprint Ready)\n`;
    process.nodes
      .filter((n) => n.userStory)
      .forEach((n) => {
        const us = n.userStory!;
        md += `### US-${n.id}: ${us.title}\n`;
        md += `**As a** ${us.asA || n.assigneeRole || 'User'}, **I want** ${us.iWant || n.name}, **So that** ${us.soThat || 'process proceeds'}.\n\n`;
        md += `**Story Points:** ${n.storyPoints || 3}\n\n`;
        md += `**Acceptance Criteria:**\n`;
        us.acceptanceCriteria.forEach((ac) => (md += `- [ ] ${ac}\n`));
        md += `\n`;
      });

    md += `## 5. Gap Analysis & Architecture Recommendations\n`;
    if (process.gapAnalysis?.length) {
      process.gapAnalysis.forEach((gap) => {
        md += `### [${gap.category}] ${gap.severity} Priority\n`;
        md += `- **Finding:** ${gap.description}\n`;
        md += `- **Recommendation:** ${gap.recommendation}\n\n`;
      });
    }

    md += `## 6. Integration Touchpoints & Systems\n`;
    if (process.integrationTouchpoints?.length) {
      md += `| System Component | Protocol | Direction | Payload Description |\n|---|---|---|---|\n`;
      process.integrationTouchpoints.forEach((it) => {
        md += `| ${it.system} | ${it.protocol} | ${it.direction} | ${it.payloadSummary} |\n`;
      });
    }

    return md;
  };

  const handleDownloadDoc = () => {
    const md = generateMarkdownDoc();
    downloadFile(
      md,
      `${process.name.toLowerCase().replace(/\s+/g, '_')}_BA_Documentation.md`,
      'text/markdown'
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200 select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            BA Process Documentation Pack
          </h2>
        </div>
        <button
          onClick={handleDownloadDoc}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
          title="Download Markdown Documentation Package"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export .md</span>
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Section 1: Executive Summary & Objectives */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Process Scope & Objectives</span>
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">{process.description}</p>

          {process.businessObjectives && process.businessObjectives.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                Target Business Objectives
              </span>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {process.businessObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KPIs */}
          {process.kpis && process.kpis.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                Target Process KPIs
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {process.kpis.map((kpi, i) => (
                  <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="font-medium text-slate-200 text-[11px]">{kpi.metric}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-slate-400">Baseline: {kpi.baseline}</span>
                      <span className="text-emerald-400 font-semibold">Target: {kpi.target}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: RACI Matrix */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>RACI Responsibility Assignment Matrix</span>
            </span>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span><strong className="text-emerald-400">R</strong>=Responsible</span>
              <span><strong className="text-indigo-400">A</strong>=Accountable</span>
              <span><strong className="text-sky-400">C</strong>=Consulted</span>
              <span><strong className="text-slate-400">I</strong>=Informed</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 px-2 font-medium">Activity / Task</th>
                  <th className="py-1.5 px-2 font-medium">Role / Stakeholder</th>
                  <th className="py-1.5 px-2 font-medium text-center">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {process.raciMatrix.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-900/40 transition">
                    <td className="py-1.5 px-2 font-medium text-slate-200">{item.taskName}</td>
                    <td className="py-1.5 px-2 text-slate-300">{item.role}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`inline-block w-5 h-5 rounded text-[10px] font-bold leading-5 ${
                          item.code === 'R'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : item.code === 'A'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : item.code === 'C'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Agile User Stories & Acceptance Criteria */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Sprint User Stories & Acceptance Criteria</span>
            </span>
            <button
              onClick={() => {
                const storiesText = process.nodes
                  .filter((n) => n.userStory)
                  .map(
                    (n) =>
                      `Story: ${n.userStory?.title}\nAs a ${n.userStory?.asA}, I want ${n.userStory?.iWant} so that ${n.userStory?.soThat}.\nAcceptance Criteria:\n${n.userStory?.acceptanceCriteria.map((a) => `- ${a}`).join('\n')}`
                  )
                  .join('\n\n---\n\n');
                handleCopy(storiesText, 'stories');
              }}
              className="text-[10px] flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {copiedSection === 'stories' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied All</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Stories</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5">
            {process.nodes
              .filter((n) => n.userStory)
              .map((node) => {
                const us = node.userStory!;
                return (
                  <div
                    key={node.id}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-100 text-[11px]">{us.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {node.storyPoints || 3} pts
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 italic">
                      "As a {us.asA || node.assigneeRole}, I want {us.iWant || node.name} so that {us.soThat || 'requirements are fulfilled'}."
                    </div>
                    {us.acceptanceCriteria && us.acceptanceCriteria.length > 0 && (
                      <div className="pt-1 text-[10px] space-y-0.5">
                        <span className="text-slate-400 font-semibold block">Acceptance Criteria:</span>
                        {us.acceptanceCriteria.map((ac, idx) => (
                          <div key={idx} className="flex items-start space-x-1 text-slate-300">
                            <span className="text-emerald-400">✓</span>
                            <span>{ac}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section 4: Process Gaps & Risk Analysis */}
        {process.gapAnalysis && process.gapAnalysis.length > 0 && (
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Identified Gaps & Process Risks</span>
              </span>
            </div>

            <div className="space-y-2">
              {process.gapAnalysis.map((gap) => (
                <div
                  key={gap.id}
                  className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-[11px]">
                      {gap.category} Assessment
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        gap.severity === 'High'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : gap.severity === 'Medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {gap.severity} Severity
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{gap.description}</p>
                  <div className="pt-1 text-[10px] text-indigo-300 flex items-start space-x-1">
                    <span className="font-semibold text-indigo-400">Recommendation:</span>
                    <span>{gap.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Integration Touchpoints */}
        {process.integrationTouchpoints && process.integrationTouchpoints.length > 0 && (
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Systems & Integration Architecture</span>
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 px-2 font-medium">System</th>
                    <th className="py-1.5 px-2 font-medium">Protocol</th>
                    <th className="py-1.5 px-2 font-medium">Direction</th>
                    <th className="py-1.5 px-2 font-medium">Payload Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {process.integrationTouchpoints.map((it, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2 font-medium text-slate-200">{it.system}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{it.protocol}</td>
                      <td className="py-1.5 px-2 text-indigo-300">{it.direction}</td>
                      <td className="py-1.5 px-2 text-slate-300">{it.payloadSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
