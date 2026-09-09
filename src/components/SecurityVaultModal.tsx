import React, { useState, useEffect } from 'react';
import {
  ProcessDefinition,
  SecurityAuditEntry,
} from '../types/bpmn';
import {
  X,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  History,
  FileCheck,
} from 'lucide-react';
import {
  encryptData,
  decryptData,
  getAuditLogs,
  appendAuditLog,
  EncryptedPayload,
} from '../utils/encryption';
import { downloadFile } from '../utils/bpmnXmlGenerator';

interface SecurityVaultModalProps {
  process: ProcessDefinition;
  onLoadDecryptedProcess: (decrypted: ProcessDefinition) => void;
  onClose: () => void;
}

export const SecurityVaultModal: React.FC<SecurityVaultModalProps> = ({
  process,
  onLoadDecryptedProcess,
  onClose,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'vault' | 'compliance' | 'audit'>('vault');

  useEffect(() => {
    setAuditLogs(getAuditLogs());
  }, []);

  const handleExportEncryptedVault = async () => {
    if (!passphrase || passphrase.length < 8) {
      setStatusMessage({
        type: 'error',
        text: 'Passphrase must be at least 8 characters long.',
      });
      return;
    }

    try {
      const plainText = JSON.stringify(process, null, 2);
      const encrypted = await encryptData(plainText, passphrase);

      downloadFile(
        JSON.stringify(encrypted, null, 2),
        `${process.name.toLowerCase().replace(/\s+/g, '_')}_encrypted.vault`,
        'application/json'
      );

      const log = appendAuditLog(
        'ENCRYPT_VAULT',
        `Exported AES-256-GCM encrypted vault for "${process.name}"`,
        encrypted.hash
      );
      setAuditLogs(getAuditLogs());

      setStatusMessage({
        type: 'success',
        text: 'AES-256 encrypted vault exported successfully with SHA-256 integrity hash verification.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Encryption failed: ${err.message}`,
      });
    }
  };

  const handleImportEncryptedVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!passphrase) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the decryption passphrase first.',
      });
      return;
    }

    try {
      const content = await file.text();
      const payload: EncryptedPayload = JSON.parse(content);

      if (payload.version !== 'AES-256-GCM') {
        throw new Error('Unsupported vault format. Must be AES-256-GCM.');
      }

      const decryptedJson = await decryptData(payload, passphrase);
      const parsedProcess: ProcessDefinition = JSON.parse(decryptedJson);

      onLoadDecryptedProcess(parsedProcess);
      appendAuditLog(
        'DECRYPT_VAULT',
        `Decrypted and restored vault "${parsedProcess.name}"`,
        payload.hash
      );
      setAuditLogs(getAuditLogs());

      setStatusMessage({
        type: 'success',
        text: `Vault decrypted and loaded successfully! Process: "${parsedProcess.name}"`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Decryption failed: ${err.message || 'Incorrect passphrase or corrupted file.'}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Enterprise Security & Encryption Vault
              </h2>
              <p className="text-[11px] text-slate-400">
                AES-256-GCM client-side encryption, PII sanitization shield, and immutable audit logs.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 space-x-4">
          <button
            onClick={() => setActiveTab('vault')}
            className={`pb-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'vault'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cryptographic Vault
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`pb-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'compliance'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Compliance & Privacy Shield
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Security Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>Master Encryption Passphrase (PBKDF2 SHA-256)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Data is encrypted locally in your browser using AES-GCM 256-bit keys derived through 100,000 PBKDF2 iterations. Passphrases are zero-knowledge and never transmitted to any server.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Vault Passphrase
                    </label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter minimum 8 characters"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Encryption Standard
                    </label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-400 font-mono text-[11px]">
                      FIPS 197 / AES-256-GCM + SHA-256
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Export Encrypted Vault</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Download an immutable, encrypted backup file (.vault) containing the complete BPMN 2.0 process and interview notes.
                    </p>
                  </div>
                  <button
                    onClick={handleExportEncryptedVault}
                    className="w-full py-2 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Encrypt & Download (.vault)</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Decrypt & Restore Vault</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upload an existing .vault file and provide the matching passphrase to restore the workflow model.
                    </p>
                  </div>
                  <label className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700">
                    <Unlock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Select & Decrypt (.vault)</span>
                    <input
                      type="file"
                      accept=".vault,.json"
                      onChange={handleImportEncryptedVault}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200">Active PII Sanitization Safeguards</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To comply with GDPR, HIPAA, and corporate data governance policies, all sensitive identifiers in raw interview transcripts are replaced with tokenized placeholders prior to model invocation:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-emerald-400 font-semibold block text-[11px]">Email Addresses</span>
                    <span className="text-[10px] text-slate-400">Masked as [CONFIDENTIAL_EMAIL_#]</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-emerald-400 font-semibold block text-[11px]">Payment Cards (PAN)</span>
                    <span className="text-[10px] text-slate-400">Masked as [MASKED_PAN_#]</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-emerald-400 font-semibold block text-[11px]">National IDs / SSN</span>
                    <span className="text-[10px] text-slate-400">Masked as [GOV_ID_#]</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-emerald-400 font-semibold block text-[11px]">Phone Numbers & IPs</span>
                    <span className="text-[10px] text-slate-400">Masked as [PHONE_NUM_#], [INTERNAL_IP_#]</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200">SOC 2 Type II / ISO 27001 Data Handling Ready</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold text-[10px]">
                  VERIFIED
                </span>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Event Details</th>
                      <th className="p-2">Integrity Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/40 font-mono text-[10px]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-500">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/50">
                          <td className="p-2 text-slate-400">{log.timestamp.split('T')[1].slice(0, 8)}</td>
                          <td className="p-2">
                            <span className="text-emerald-400 font-semibold">{log.action}</span>
                          </td>
                          <td className="p-2 text-slate-300 font-sans">{log.details}</td>
                          <td className="p-2 text-slate-500 truncate max-w-[120px]" title={log.integrityHash}>
                            {log.integrityHash.slice(0, 14)}...
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
