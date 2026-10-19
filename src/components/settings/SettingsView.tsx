import React, { useState } from 'react';
import {
  Settings,
  Cloud,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Code2,
  ExternalLink,
  ShieldCheck,
  Database,
  Check,
} from 'lucide-react';
import type { User, Role } from '../../types';
import { APPS_SCRIPT_CODE } from '../../services/appsScriptTemplate';

interface SettingsViewProps {
  appsScriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  onTriggerSync: () => void;
  isSyncing: boolean;
  currentUser: User | null;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => Promise<{ success: boolean; message: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appsScriptUrl,
  onSaveScriptUrl,
  onTestConnection,
  onTriggerSync,
  isSyncing,
  currentUser,
  onExportBackup,
  onImportBackup,
}) => {
  const [urlInput, setUrlInput] = useState(appsScriptUrl);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveAndTest = async () => {
    onSaveScriptUrl(urlInput.trim());
    setIsTesting(true);
    setTestResult(null);
    const res = await onTestConnection(urlInput.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportStatus('Restoring database from JSON...');
        const res = await onImportBackup(content);
        setImportStatus(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" />
          Cloud Sync & System Settings
        </h1>
        <p className="text-xs text-slate-500">
          Configure Google Apps Script Web App endpoints, test cloud connection, and manage offline data backups
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl">
        {/* Google Cloud & Apps Script Sync Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Google Apps Script & Google Sheets Cloud Backend
                </h2>
                <p className="text-[11px] text-slate-500">
                  Free, serverless relational database running directly inside your Google Drive
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Get `Code.gs` Script</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deployed Google Apps Script Web App URL
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSaveAndTest}
                    disabled={isTesting}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test & Save URL</span>
                    )}
                  </button>

                  <button
                    onClick={onTriggerSync}
                    disabled={isSyncing}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.success ? 'Connection Successful' : 'Connection Error'}
                  </div>
                  <div className="mt-0.5 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local JSON Backup & Migration (Compatible with Timar Qt) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Local JSON Data Migration & Backup
              </h2>
              <p className="text-[11px] text-slate-500">
                Export and import files formatted identically to the C++ Qt Timar desktop app (`timar_data.json`)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onExportBackup}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Export `timar_data.json` Backup</span>
            </button>

            <label className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Import & Restore JSON</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs">
              {importStatus}
            </div>
          )}
        </div>

        {/* User Session & Role Security Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Active Authentication & Role Privileges</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg">
            <div>
              <span className="text-slate-400 block text-[11px]">User Account</span>
              <span className="font-bold text-slate-800">{currentUser?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">System Role</span>
              <span className="font-mono uppercase font-bold text-sky-700">
                {currentUser?.role}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Department</span>
              <span className="text-slate-700">{currentUser?.department}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Code.gs Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Google Apps Script Source Code (`Code.gs`)</h3>
                <p className="text-xs text-slate-500">Copy this into your Google Spreadsheet Apps Script Editor</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre">{APPS_SCRIPT_CODE}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
