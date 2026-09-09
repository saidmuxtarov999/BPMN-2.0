import React, { useState, useEffect } from 'react';
import { ProcessDefinition, BPMNNode } from './types/bpmn';
import { Header } from './components/Header';
import { BpmnCanvas } from './components/BpmnCanvas';
import { ElementInspector } from './components/ElementInspector';
import { AiRequirementsPanel } from './components/AiRequirementsPanel';
import { BusinessAnalystPack } from './components/BusinessAnalystPack';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { PmSyncModal } from './components/PmSyncModal';
import {
  BUSINESS_PROCESS_TEMPLATES,
  KYC_ONBOARDING_PROCESS,
  ITIL_INCIDENT_PROCESS,
  LOAN_UNDERWRITING_PROCESS,
  ORDER_TO_CASH_PROCESS,
} from './data/templates';
import { applyAutoLayout } from './utils/layoutEngine';
import { appendAuditLog } from './utils/encryption';
import {
  Sparkles,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Sliders,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  // Initialize with the KYC Onboarding template with auto-layout applied
  const [process, setProcess] = useState<ProcessDefinition>(() =>
    applyAutoLayout(KYC_ONBOARDING_PROCESS)
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'ai' | 'docs'>('ai');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isSecurityVaultOpen, setIsSecurityVaultOpen] = useState<boolean>(false);
  const [isPmSyncOpen, setIsPmSyncOpen] = useState<boolean>(false);
  const [isSanitizerActive, setIsSanitizerActive] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Requirements text in the prompt editor
  const [requirementsText, setRequirementsText] = useState<string>(
    BUSINESS_PROCESS_TEMPLATES[0].rawRequirements
  );

  // Global Toast / notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    let selected: ProcessDefinition = KYC_ONBOARDING_PROCESS;
    if (templateId === 'itil_incident' || templateId === 'tmpl_itil_incident') {
      selected = ITIL_INCIDENT_PROCESS;
    } else if (templateId === 'loan_underwriting' || templateId === 'tmpl_loan_underwriting') {
      selected = LOAN_UNDERWRITING_PROCESS;
    } else if (templateId === 'order_to_cash' || templateId === 'tmpl_order_to_cash') {
      selected = ORDER_TO_CASH_PROCESS;
    }

    const matchedTemplate = BUSINESS_PROCESS_TEMPLATES.find((t) => t.id === templateId);
    if (matchedTemplate) {
      setRequirementsText(matchedTemplate.rawRequirements);
    }

    const layouted = applyAutoLayout(selected);
    setProcess(layouted);
    setSelectedNodeId(null);
    showToast(`Loaded "${selected.name}" template.`, 'success');
    appendAuditLog('IMPORT_TEMPLATE', `Loaded process template: ${selected.name}`);
  };

  // Generate BPMN via API
  const handleGenerateProcess = async (requirements: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-bpmn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          processName: process.name || 'Automated Business Workflow',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error generating BPMN model.');
      }

      const layouted = applyAutoLayout(data);
      setProcess(layouted);
      setSelectedNodeId(null);
      showToast('BPMN 2.0 workflow generated successfully!', 'success');
      appendAuditLog('GENERATE_BPMN', `Generated workflow for process: ${layouted.name}`);
    } catch (err: any) {
      console.error('Generation failed:', err);
      showToast(
        err.message || 'Failed to connect to AI generator. Falling back to local intelligence synthesis.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Refine BPMN via API
  const handleRefineProcess = async (refinementPrompt: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/refine-bpmn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentProcess: process,
          refinementPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply refinement.');
      }

      const layouted = applyAutoLayout(data);
      setProcess(layouted);
      showToast('Process refined and diagrams re-aligned!', 'success');
      appendAuditLog('REFINE_BPMN', `Refined workflow: ${refinementPrompt.slice(0, 40)}...`);
    } catch (err: any) {
      console.error('Refinement failed:', err);
      showToast(err.message || 'Refinement failed.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Node modifications from Inspector
  const handleUpdateNode = (updatedNode: BPMNNode) => {
    setProcess((prev) => {
      const updatedNodes = prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
      return {
        ...prev,
        nodes: updatedNodes,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    setProcess((prev) => {
      const updatedNodes = prev.nodes.filter((n) => n.id !== nodeId);
      const updatedFlows = prev.flows.filter(
        (f) => f.sourceRef !== nodeId && f.targetRef !== nodeId
      );
      return {
        ...prev,
        nodes: updatedNodes,
        flows: updatedFlows,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
    });
    setSelectedNodeId(null);
    showToast('Element removed from workflow.', 'info');
  };

  const handleProcessNameChange = (newName: string) => {
    setProcess((prev) => ({
      ...prev,
      name: newName,
      pools: prev.pools.map((p, i) => (i === 0 ? { ...p, name: newName } : p)),
      lastUpdated: new Date().toISOString().split('T')[0],
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Application Header */}
      <Header
        process={process}
        onSelectTemplate={handleSelectTemplate}
        onOpenSecurityVault={() => setIsSecurityVaultOpen(true)}
        onOpenPmSync={() => setIsPmSyncOpen(true)}
        onExportDoc={() => setLeftTab('docs')}
        isSanitizerActive={isSanitizerActive}
        onToggleSanitizer={() => {
          setIsSanitizerActive(!isSanitizerActive);
          showToast(`PII Shield ${!isSanitizerActive ? 'Enabled' : 'Disabled'}`, 'info');
        }}
        onProcessNameChange={handleProcessNameChange}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer / Panel */}
        {isLeftPanelOpen ? (
          <div className="w-96 min-w-[320px] max-w-[420px] h-full flex flex-col border-r border-slate-800 bg-slate-900 z-10 transition-all duration-200 shadow-xl">
            {/* Left Panel Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-2 pt-1.5">
              <div className="flex space-x-1">
                <button
                  onClick={() => setLeftTab('ai')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition ${
                    leftTab === 'ai'
                      ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Requirements</span>
                </button>

                <button
                  onClick={() => setLeftTab('docs')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition ${
                    leftTab === 'docs'
                      ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>BA Documentation</span>
                </button>
              </div>

              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                title="Collapse Panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Left Tab Contents */}
            <div className="flex-1 overflow-hidden">
              {leftTab === 'ai' ? (
                <AiRequirementsPanel
                  onGenerate={handleGenerateProcess}
                  onRefine={handleRefineProcess}
                  isGenerating={isGenerating}
                  isSanitizerActive={isSanitizerActive}
                  currentRequirements={requirementsText}
                  onRequirementsChange={setRequirementsText}
                />
              ) : (
                <BusinessAnalystPack process={process} />
              )}
            </div>
          </div>
        ) : (
          /* Expand Left Panel Toggle button when collapsed */
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="absolute left-3 top-3 z-20 p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-lg transition flex items-center space-x-1 text-xs"
            title="Open Requirements & BA Panel"
          >
            <PanelLeft className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-[11px]">Requirements & BA Pack</span>
          </button>
        )}

        {/* Central Interactive BPMN 2.0 Canvas */}
        <div className="flex-1 h-full flex flex-col overflow-hidden relative">
          <BpmnCanvas
            process={process}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          />
        </div>

        {/* Right Element Inspector Drawer */}
        {selectedNodeId && (
          <ElementInspector
            nodeId={selectedNodeId}
            process={process}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Global Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-3.5 py-2 rounded-lg shadow-xl border text-xs animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Enterprise Security Vault Modal */}
      {isSecurityVaultOpen && (
        <SecurityVaultModal
          process={process}
          onLoadDecryptedProcess={(decrypted) => {
            const layouted = applyAutoLayout(decrypted);
            setProcess(layouted);
            setSelectedNodeId(null);
            showToast('Decrypted vault loaded successfully!', 'success');
          }}
          onClose={() => setIsSecurityVaultOpen(false)}
        />
      )}

      {/* PM Task Synchronization Modal */}
      {isPmSyncOpen && (
        <PmSyncModal process={process} onClose={() => setIsPmSyncOpen(false)} />
      )}
    </div>
  );
}
