import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  Archive,
  Edit2,
  Trash2,
  X,
  User,
  Calendar,
  AlertCircle,
  Tag,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Send,
  Wrench,
} from 'lucide-react';
import type {
  Asset,
  SubAsset,
  AssetNote,
  TechnicianReport,
  ReportSeverity,
  ReportCategory,
  NoteCategory,
  User as UserType,
  Role,
} from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';
import { NotesService } from '../../services/notesService';
import { ReportsService } from '../../services/reportsService';

interface AssetNotesAndReportsTabProps {
  asset: Asset;
  subAssets: SubAsset[];
  notes: AssetNote[];
  reports: TechnicianReport[];
  currentUser: UserType | null;
  userRole?: Role;
  onRefreshData: () => Promise<void>;
  onOpenCreateEventFromReport?: (report: TechnicianReport) => void;
}

export const AssetNotesAndReportsTab: React.FC<AssetNotesAndReportsTabProps> = ({
  asset,
  subAssets,
  notes,
  reports,
  currentUser,
  userRole,
  onRefreshData,
  onOpenCreateEventFromReport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'reports'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('all');
  const [reportSeverityFilter, setReportSeverityFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  // Modal states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AssetNote | null>(null);
  const [selectedNoteForView, setSelectedNoteForView] = useState<AssetNote | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportForView, setSelectedReportForView] = useState<TechnicianReport | null>(null);

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general');
  const [noteSubAssetId, setNoteSubAssetId] = useState<string>('');

  // Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('leak');
  const [reportSeverity, setReportSeverity] = useState<ReportSeverity>('medium');
  const [reportSubAssetId, setReportSubAssetId] = useState<string>('');
  const [reportOccurrenceDate, setReportOccurrenceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reportEvidenceNotes, setReportEvidenceNotes] = useState('');

  // Manager review in report view
  const [managerReviewDecision, setManagerReviewDecision] = useState('');
  const [managerReviewNotes, setManagerReviewNotes] = useState('');

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (n.assetId !== asset.id) return false;
    if (noteCategoryFilter !== 'all' && n.category !== noteCategoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (r.assetId !== asset.id) return false;
    if (reportSeverityFilter !== 'all' && r.severity !== reportSeverityFilter) return false;
    if (reportStatusFilter !== 'all' && r.status !== reportStatusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Open note creation/edit
  const handleOpenNoteModal = (note?: AssetNote) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteBody(note.body);
      setNoteCategory(note.category);
      setNoteSubAssetId(note.subAssetId || '');
    } else {
      setEditingNote(null);
      setNoteTitle('');
      setNoteBody('');
      setNoteCategory('general');
      setNoteSubAssetId('');
    }
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !noteTitle.trim() || !noteBody.trim()) return;

    if (editingNote) {
      await NotesService.updateNote(
        editingNote.id,
        {
          title: noteTitle.trim(),
          body: noteBody.trim(),
          category: noteCategory,
        },
        currentUser
      );
    } else {
      await NotesService.createNote(
        {
          assetId: asset.id,
          subAssetId: noteSubAssetId || undefined,
          title: noteTitle.trim(),
          body: noteBody.trim(),
          category: noteCategory,
        },
        currentUser
      );
    }

    setIsNoteModalOpen(false);
    await onRefreshData();
  };

  const handleArchiveNote = async (noteId: string) => {
    if (!currentUser) return;
    await NotesService.toggleArchive(noteId, currentUser);
    await onRefreshData();
  };

  // Open report modal
  const handleOpenReportModal = () => {
    setReportTitle('');
    setReportDescription('');
    setReportCategory('leak');
    setReportSeverity('medium');
    setReportSubAssetId('');
    setReportOccurrenceDate(new Date().toISOString().split('T')[0]);
    setReportEvidenceNotes('');
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reportTitle.trim() || !reportDescription.trim()) return;

    await ReportsService.createReport(
      {
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.code,
        subAssetId: reportSubAssetId || undefined,
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        category: reportCategory,
        severity: reportSeverity,
        occurrenceDate: reportOccurrenceDate,
        evidenceNotes: reportEvidenceNotes.trim() || undefined,
      },
      currentUser
    );

    setIsReportModalOpen(false);
    await onRefreshData();
  };

  const handleManagerDecision = async (status: TechnicianReport['status']) => {
    if (!selectedReportForView || !currentUser || userRole !== 'manager') return;
    await ReportsService.updateReportStatus(
      selectedReportForView.id,
      status,
      currentUser,
      managerReviewNotes,
      managerReviewDecision || `تغییر وضعیت به ${status}`
    );
    setManagerReviewNotes('');
    setManagerReviewDecision('');
    setSelectedReportForView(null);
    await onRefreshData();
  };

  const getSeverityBadge = (severity: ReportSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">بحرانی</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">فوری / بالا</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded">متوسط</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">پایین</span>;
    }
  };

  const getStatusBadge = (status: TechnicianReport['status']) => {
    switch (status) {
      case 'pending_review':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">در انتظار بررسی مدیر</span>;
      case 'action_required':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded">اقدام لازم (صدور کار)</span>;
      case 'monitoring':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">تحت پایش و نظر</span>;
      case 'info_requested':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-800 rounded">نیازمند اطلاعات تکمیلی</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">حل و فصل شده</span>;
      case 'dismissed':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded">رد شده با ذکر دلیل</span>;
    }
  };

  const getCategoryLabel = (category: ReportCategory | NoteCategory) => {
    const labels: Record<string, string> = {
      leak: 'نشتی سیال / گاز',
      vibration: 'ارتعاشات غیرعادی',
      noise: 'صدای سایش / زوزه',
      electrical: 'اشکال برقی / اتصالی',
      pressure: 'افت یا نوسان فشار',
      contamination: 'آلودگی شیمیایی / بستر',
      other: 'سایر موارد فنی',
      observation: 'مشاهده فنی',
      modification: 'تغییرات و نوسازی',
      inspection: 'بازرسی دوره‌ای',
      general: 'عمومی',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Controls: Switcher between Notes and Reports + Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('notes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'notes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>یادداشت‌های تجهیز</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {toPersianDigits(filteredNotes.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>گزارش‌های نقص فنی تکنسین</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {toPersianDigits(filteredReports.length)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'notes' ? (
            <button
              onClick={() => handleOpenNoteModal()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت یادداشت جدید</span>
            </button>
          ) : (
            <button
              onClick={handleOpenReportModal}
              className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت گزارش نقص فنی</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="جستجو در عنوان، شرح یا ثبت‌کننده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          />
        </div>

        {activeSubTab === 'notes' ? (
          <select
            value={noteCategoryFilter}
            onChange={(e) => setNoteCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white cursor-pointer"
          >
            <option value="all">همه دسته‌بندی‌های یادداشت</option>
            <option value="inspection">بازرسی دوره‌ای</option>
            <option value="modification">تغییرات و نوسازی</option>
            <option value="observation">مشاهده فنی</option>
            <option value="general">عمومی</option>
          </select>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={reportSeverityFilter}
              onChange={(e) => setReportSeverityFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white cursor-pointer"
            >
              <option value="all">همه شدت‌ها</option>
              <option value="critical">بحرانی</option>
              <option value="high">فوری / بالا</option>
              <option value="medium">متوسط</option>
              <option value="low">پایین</option>
            </select>

            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white cursor-pointer"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending_review">در انتظار بررسی</option>
              <option value="action_required">اقدام لازم</option>
              <option value="monitoring">تحت پایش</option>
              <option value="resolved">حل و فصل شده</option>
              <option value="dismissed">رد شده</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Area: Notes List or Reports List */}
      {activeSubTab === 'notes' ? (
        filteredNotes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">هیچ یادداشتی برای این تجهیز ثبت نشده است</div>
            <p className="text-[11px] text-slate-500">
              می‌توانید تجارب فنی، مشاهدات بهره‌برداری و تغییرات اعمال‌شده روی تجهیز را در این بخش ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-xl border bg-white shadow-2xs space-y-2.5 transition-all ${
                  note.isArchived ? 'opacity-60 border-dashed border-slate-300 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      {getCategoryLabel(note.category)}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-1">{note.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedNoteForView(note)}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100 cursor-pointer"
                      title="مشاهده کامل"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenNoteModal(note)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                      title="ویرایش"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchiveNote(note.id)}
                      className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 cursor-pointer"
                      title={note.isArchived ? 'خروج از بایگانی' : 'بایگانی'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{note.body}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{note.authorName}</span>
                  </span>
                  <span className="font-mono">
                    {formatPersianDate(note.createdAt, { showMonthName: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredReports.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-700">هیچ گزارش نقصی برای این تجهیز ثبت نشده است</div>
          <p className="text-[11px] text-slate-500">
            تکنسین‌ها می‌توانند هرگونه نشتی، ارتعاش غیرعادی، صدا یا عیب مشکوک را با ثبت گزارش به اطلاع مدیر فنی برسانند.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReportForView(report)}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all cursor-pointer space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(report.severity)}
                  {getStatusBadge(report.status)}
                  <span className="text-[11px] text-slate-500 font-medium">
                    دسته‌بندی: {getCategoryLabel(report.category)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  ثبت: {formatPersianDate(report.createdAt, { showMonthName: true })}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900">{report.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
                  {report.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>تکنسین: {report.reporterName}</span>
                </span>

                {report.relatedEventIds && report.relatedEventIds.length > 0 && (
                  <span className="flex items-center gap-1 text-sky-700 font-bold text-[10px]">
                    <Wrench className="w-3 h-3" />
                    <span>دارای دستورکار متصل ({toPersianDigits(report.relatedEventIds.length)})</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Creation & Edit Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingNote ? 'ویرایش یادداشت فنی' : 'ثبت یادداشت جدید برای تجهیز'}
                </h3>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تجهیز مربوطه
                </label>
                <input
                  type="text"
                  disabled
                  value={`${asset.code} - ${asset.name}`}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              {subAssets.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    زیرمجموعه / قطعه جزء (اختیاری)
                  </label>
                  <select
                    value={noteSubAssetId}
                    onChange={(e) => setNoteSubAssetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="">کل تجهیز</option>
                    {subAssets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.partNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  دسته‌بندی موضوعی
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="observation">مشاهده فنی (Observation)</option>
                  <option value="inspection">بازرسی دوره‌ای (Inspection)</option>
                  <option value="modification">تغییرات / ارتقاء (Modification)</option>
                  <option value="general">عمومی (General)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان یادداشت
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: پایش ارتعاشات شفت، تعویض روغن یا راندمان"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شرح کامل یادداشت یا تجربه فنی
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="شرح جزئیات فنی، اندازه‌گیری‌ها، شرایط محیطی..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs cursor-pointer"
                >
                  ذخیره یادداشت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technician Report Creation Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  ثبت گزارش نقص فنی و اعلام عیب
                </h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سطح فوریت / شدت
                  </label>
                  <select
                    value={reportSeverity}
                    onChange={(e) => setReportSeverity(e.target.value as ReportSeverity)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="low">پایین (Low)</option>
                    <option value="medium">متوسط (Medium)</option>
                    <option value="high">بالا / فوری (High)</option>
                    <option value="critical">بحرانی / توقف خط (Critical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    دسته‌بندی عیب
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="leak">نشتی سیال / گاز</option>
                    <option value="vibration">ارتعاشات غیرعادی</option>
                    <option value="noise">صدای سایش / زوزه</option>
                    <option value="electrical">اشکال برقی / اتصالی</option>
                    <option value="pressure">افت یا نوسان فشار</option>
                    <option value="contamination">آلودگی شیمیایی / بستر</option>
                    <option value="other">سایر عیوب</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان خلاصه گزارش نقص
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نشتی شدید در فلنج خروجی، صدای زوزه بلبرینگ پمپ..."
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شرح دقیق عیب، محل وقوع و شواهد
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="مشاهدات عینی، مقدار اندازه‌گیری‌شده، شرایط بهره‌برداری..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شواهد تکمیلی / یادداشت تست (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثال: دتکتور عدد ۰.۰۸ ppm را نشان داد، با اسپری تست شد..."
                  value={reportEvidenceNotes}
                  onChange={(e) => setReportEvidenceNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال گزارش به کارتابل مدیر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Note Detail Modal */}
      {selectedNoteForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">مشاهده کامل یادداشت</h3>
              </div>
              <button
                onClick={() => setSelectedNoteForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  {getCategoryLabel(selectedNoteForView.category)}
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-1">{selectedNoteForView.title}</h2>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-100">
                {selectedNoteForView.body}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">نویسنده:</span>
                  <span className="font-bold">{selectedNoteForView.authorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاریخ ثبت:</span>
                  <span className="font-mono">{formatPersianDate(selectedNoteForView.createdAt, { showMonthName: true })}</span>
                </div>
                {selectedNoteForView.lastEditedByName && (
                  <div className="col-span-2 pt-1 border-t border-slate-200 text-slate-500">
                    آخرین ویرایش توسط: {selectedNoteForView.lastEditedByName} در تاریخ{' '}
                    {formatPersianDate(selectedNoteForView.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Report Detail & Review Modal */}
      {selectedReportForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  جزئیات گزارش نقص و وضعیت ارزیابی
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(selectedReportForView.severity)}
                  {getStatusBadge(selectedReportForView.status)}
                </div>
                <span className="text-slate-500 font-mono text-[11px]">
                  {formatPersianDate(selectedReportForView.createdAt, { showMonthName: true })}
                </span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">{selectedReportForView.title}</h2>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  تجهیز: {selectedReportForView.assetName} ({selectedReportForView.assetCode}) | تکنسین گزارش‌دهنده: {selectedReportForView.reporterName}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-slate-800 leading-relaxed border border-slate-100">
                <div className="font-bold text-slate-700 mb-1">شرح گزارش نقص:</div>
                <p className="whitespace-pre-wrap">{selectedReportForView.description}</p>
                {selectedReportForView.evidenceNotes && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                    <strong>شواهد فنی:</strong> {selectedReportForView.evidenceNotes}
                  </div>
                )}
              </div>

              {/* Status History */}
              {selectedReportForView.statusHistory && selectedReportForView.statusHistory.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-700 text-[11px]">تاریخچه تصمیمات و ارزیابی:</div>
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedReportForView.statusHistory.map((h, i) => (
                      <div key={i} className="text-[11px] flex items-center justify-between text-slate-600">
                        <span>
                          <strong>{h.changedByName}:</strong> {h.rationale || h.status}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          {formatPersianDate(h.changedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Actions Box */}
              {userRole === 'manager' && (
                <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900 text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    <span>اقدامات ارزیابی و تصمیم‌گیری مدیر فنی:</span>
                  </div>

                  <input
                    type="text"
                    placeholder="شرح تصمیم مدیر (مثال: صدور دستورکار بازرسی، پایش روزانه، رد گزارش...)"
                    value={managerReviewDecision}
                    onChange={(e) => setManagerReviewDecision(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />

                  <textarea
                    rows={2}
                    placeholder="دلایل یا دستورات تکمیلی..."
                    value={managerReviewNotes}
                    onChange={(e) => setManagerReviewNotes(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onOpenCreateEventFromReport && (
                      <button
                        type="button"
                        onClick={() => {
                          const rep = selectedReportForView;
                          setSelectedReportForView(null);
                          onOpenCreateEventFromReport(rep);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>صدور دستورکار از این گزارش</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleManagerDecision('action_required')}
                      className="px-3 py-1.5 text-xs font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 rounded-lg cursor-pointer"
                    >
                      تایید نیاز به اقدام
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManagerDecision('monitoring')}
                      className="px-3 py-1.5 text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 rounded-lg cursor-pointer"
                    >
                      تعیین وضعیت پایش
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManagerDecision('dismissed')}
                      className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg cursor-pointer"
                    >
                      رد گزارش با دلیل
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManagerDecision('resolved')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer"
                    >
                      حل و فصل شده
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
