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
  ShieldCheck,
  Database,
  Check,
} from 'lucide-react';
import type { User } from '../../types';
import { APPS_SCRIPT_CODE } from '../../services/appsScriptTemplate';

interface SettingsSectionViewProps {
  appsScriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  onTriggerSync: () => void;
  isSyncing: boolean;
  currentUser: User | null;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => Promise<{ success: boolean; message: string }>;
}

export const SettingsSectionView: React.FC<SettingsSectionViewProps> = ({
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
        setImportStatus('در حال بازیابی اطلاعات پایگاه‌داده...');
        const res = await onImportBackup(content);
        setImportStatus(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#fafafa]" dir="rtl">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" />
          تنظیمات سیستم و همگام‌سازی ابری
        </h1>
        <p className="text-xs text-slate-500">
          پیکربندی اتصال به گوگل اپ اسکریپت، پشتیبان‌گیری فایل JSON و مدیریت دسترسی‌ها
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Google Apps Script Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-sky-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  اتصال به سرور ابری (Google Apps Script & Sheets)
                </h2>
                <p className="text-[11px] text-slate-500">
                  ذخیره‌سازی اطلاعات در گوگل درایو با API وب اپلیکیشن رایگان
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>مشاهده و کپی کدهای `Code.gs`</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                آدرس وب‌اپلیکیشن منتشرشده (Web App URL)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSaveAndTest}
                    disabled={isTesting}
                    className="flex-1 sm:flex-none px-4 py-2 font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>در حال بررسی...</span>
                      </>
                    ) : (
                      <span>تست و ذخیره</span>
                    )}
                  </button>

                  <button
                    onClick={onTriggerSync}
                    disabled={isSyncing}
                    className="flex-1 sm:flex-none px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                    <span>همگام‌سازی</span>
                  </button>
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2.5 ${
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
                    {testResult.success ? 'ارتباط موفقیت‌آمیز بود' : 'خطا در برقراری ارتباط'}
                  </div>
                  <div className="mt-0.5 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local JSON Migration & Backup */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                پشتیبان‌گیری محلی و انتقال اطلاعات (`timar_data.json`)
              </h2>
              <p className="text-[11px] text-slate-500">
                کاملاً سازگار با نسخه دسکتاپ C++ Qt تیمار جهت خروجی گرفتن و بازیابی بدون نیاز به اینترنت
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onExportBackup}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-700" />
              <span>خروجی فایل `timar_data.json`</span>
            </button>

            <label className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-700" />
              <span>بازیابی از فایل JSON</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs">
              {importStatus}
            </div>
          )}
        </div>

        {/* User Account / Role summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">کاربر فعال و سطح اختیارات</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg">
            <div>
              <span className="text-slate-400 block text-[11px]">نام کاربر</span>
              <span className="font-bold text-slate-800">{currentUser?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">سطح دسترسی</span>
              <span className="font-bold text-sky-700">
                {currentUser?.role === 'manager' ? 'مدیر فنی (دسترسی کامل)' : 'تکنسین عملیات (ثبت و گزارش)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">واحد سازمانی</span>
              <span className="text-slate-700">{currentUser?.department}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Code.gs Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">کدهای سرور Google Apps Script (`Code.gs`)</h3>
                <p className="text-xs text-slate-500">
                  این کدها را در ویرایشگر Apps Script شیت گوگل خود جای‌گذاری نمایید
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'کپی شد!' : 'کپی کل کد'}</span>
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed" dir="ltr">
              <pre className="whitespace-pre">{APPS_SCRIPT_CODE}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
