import React, { useState } from 'react';
import {
  ProcessDefinition,
  PMPlatform,
  PMSyncConfig,
  PMSyncItem,
} from '../types/bpmn';
import {
  X,
  Share2,
  Download,
  Send,
  CheckCircle,
  RotateCw,
  AlertCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  extractSyncItemsFromProcess,
  generateJiraCsv,
  generateAzureDevOpsCsv,
  formatPlatformPayload,
} from '../utils/pmSync';
import { downloadFile } from '../utils/bpmnXmlGenerator';
import { appendAuditLog } from '../utils/encryption';

interface PmSyncModalProps {
  process: ProcessDefinition;
  onClose: () => void;
}

export const PmSyncModal: React.FC<PmSyncModalProps> = ({ process, onClose }) => {
  const [platform, setPlatform] = useState<PMPlatform>('jira');
  const [projectKey, setProjectKey] = useState('PROJ');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [syncItems, setSyncItems] = useState<PMSyncItem[]>(() =>
    extractSyncItemsFromProcess(process)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(syncItems.map((i) => i.id))
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === syncItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(syncItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedItems = syncItems.filter((i) => selectedIds.has(i.id));

  const handleExportJiraCsv = () => {
    const csv = generateJiraCsv(selectedItems, projectKey);
    downloadFile(csv, `${projectKey}_Jira_Import.csv`, 'text/csv');
    appendAuditLog('PM_SYNC', `Exported ${selectedItems.length} tasks to Jira CSV format.`);
  };

  const handleExportAzureCsv = () => {
    const csv = generateAzureDevOpsCsv(selectedItems, projectKey);
    downloadFile(csv, `${projectKey}_AzureDevOps_Import.csv`, 'text/csv');
    appendAuditLog('PM_SYNC', `Exported ${selectedItems.length} work items to Azure DevOps CSV.`);
  };

  const handleExportJson = () => {
    const payload = formatPlatformPayload(platform, selectedItems, {
      platform,
      projectKey,
      issueType: 'Story',
      autoSync: false,
    });
    downloadFile(JSON.stringify(payload, null, 2), `${platform}_sync_payload.json`, 'application/json');
    appendAuditLog('PM_SYNC', `Exported ${selectedItems.length} items to ${platform} JSON payload.`);
  };

  const handleDispatchWebhook = async () => {
    if (!webhookUrl.trim()) {
      setDispatchResult({
        success: false,
        message: 'Please enter a valid webhook URL (e.g., Zapier, Jira Automation, or Linear API endpoint).',
      });
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    const payload = formatPlatformPayload(platform, selectedItems, {
      platform,
      projectKey,
      issueType: 'Story',
      webhookUrl,
      autoSync: false,
    });

    try {
      const response = await fetch('/api/sync-pm-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          payload,
          headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success !== false) {
        setDispatchResult({
          success: true,
          message: `Successfully synchronized ${selectedItems.length} work items to ${platform.toUpperCase()} webhook!`,
        });

        // Mark items as synced
        setSyncItems((prev) =>
          prev.map((it) => (selectedIds.has(it.id) ? { ...it, status: 'Synced' } : it))
        );
        appendAuditLog('PM_SYNC', `Dispatched ${selectedItems.length} work items to webhook ${webhookUrl}`);
      } else {
        setDispatchResult({
          success: false,
          message: resData.error || `Webhook responded with status ${resData.statusCode || 'error'}`,
        });
      }
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Network error occurred while contacting webhook dispatcher.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Project Management Task Synchronization</h2>
              <p className="text-[11px] text-slate-400">
                Map BPMN workflow activities into Agile Epics, User Stories, and Technical Tasks for engineering sprints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Platform Picker */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Select Target Platform
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(
                [
                  { id: 'jira', name: 'Jira Software' },
                  { id: 'azure_devops', name: 'Azure DevOps' },
                  { id: 'linear', name: 'Linear' },
                  { id: 'asana', name: 'Asana' },
                  { id: 'github', name: 'GitHub Issues' },
                  { id: 'trello', name: 'Trello' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                    platform === p.id
                      ? 'bg-blue-950/60 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Configuration inputs */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Project Key / Team Key
              </label>
              <input
                type="text"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                placeholder="e.g. CORE, BPMN, SPRINT"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Webhook / REST Endpoint URL (Optional)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://automation.atlassian.com/pro/hooks/... or Zapier/Linear webhook"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Result Alert if any */}
          {dispatchResult && (
            <div
              className={`p-3 rounded-lg border flex items-center space-x-2 ${
                dispatchResult.success
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              {dispatchResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-xs">{dispatchResult.message}</span>
            </div>
          )}

          {/* Work Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === syncItems.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                />
                <span className="font-semibold text-slate-300">
                  Ready to Sync ({selectedIds.size} of {syncItems.length} items selected)
                </span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Item Title</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Assignee Role</th>
                    <th className="p-2 text-center">Points</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                  {syncItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                        />
                      </td>
                      <td className="p-2 font-medium text-slate-200">
                        <div>{item.title}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          {item.description}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-2 text-slate-300">{item.assigneeRole}</td>
                      <td className="p-2 text-center font-semibold text-indigo-400">
                        {item.storyPoints}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            item.status === 'Synced'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJiraCsv}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Download Jira CSV Issue Importer format"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Jira CSV</span>
            </button>

            <button
              onClick={handleExportAzureCsv}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Download Azure DevOps CSV format"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Azure DevOps CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Export formatted JSON payload"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON Payload</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Close
            </button>

            <button
              onClick={handleDispatchWebhook}
              disabled={isDispatching || selectedItems.length === 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition shadow-sm"
            >
              {isDispatching ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Webhook Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
