import { getDB } from './db';
import type { TechnicianReport, ReportStatus, ReportSeverity, ReportCategory, User } from '../types';
import { TimeService } from '../utils/timeService';
import { SyncEngine } from './syncEngine';

export class ReportsService {
  public static async getAllReports(): Promise<TechnicianReport[]> {
    const db = await getDB();
    const all = await db.getAll('technicianReports');
    return all.filter((r) => !r.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static async getReportsByAsset(assetId: string): Promise<TechnicianReport[]> {
    const db = await getDB();
    const reports = await db.getAllFromIndex('technicianReports', 'by-asset', assetId);
    return reports.filter((r) => !r.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static async createReport(
    data: {
      assetId: string;
      assetName: string;
      assetCode: string;
      subAssetId?: string;
      title: string;
      description: string;
      category: ReportCategory;
      severity: ReportSeverity;
      occurrenceDate?: string;
      evidenceNotes?: string;
    },
    user: User
  ): Promise<TechnicianReport> {
    const db = await getDB();
    const now = TimeService.now();
    const newId = `rep-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const newReport: TechnicianReport = {
      id: newId,
      assetId: data.assetId,
      assetName: data.assetName,
      assetCode: data.assetCode,
      subAssetId: data.subAssetId,
      reporterId: user.id,
      reporterName: user.fullName || user.username,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      severity: data.severity,
      occurrenceDate: data.occurrenceDate || TimeService.getTehranDateString(now),
      evidenceNotes: data.evidenceNotes ? data.evidenceNotes.trim() : undefined,
      status: 'pending_review',
      statusHistory: [
        {
          status: 'pending_review',
          changedAt: now,
          changedById: user.id,
          changedByName: user.fullName || user.username,
          rationale: 'ثبت اولیه گزارش عیب توسط تکنسین',
        },
      ],
      relatedEventIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.put('technicianReports', newReport);
    await SyncEngine.queueMutation('reports', 'create', newId, newReport as any);
    return newReport;
  }

  public static async updateReportStatus(
    reportId: string,
    newStatus: ReportStatus,
    user: User,
    rationale?: string,
    reviewDecision?: string
  ): Promise<TechnicianReport | null> {
    const db = await getDB();
    const existing = await db.get('technicianReports', reportId);
    if (!existing || existing.isDeleted) return null;

    const now = TimeService.now();
    const historyItem = {
      status: newStatus,
      changedAt: now,
      changedById: user.id,
      changedByName: user.fullName || user.username,
      rationale: rationale?.trim() || `تغییر وضعیت به ${newStatus}`,
    };

    const updated: TechnicianReport = {
      ...existing,
      status: newStatus,
      reviewedBy: user.fullName || user.username,
      reviewedById: user.id,
      reviewedAt: now,
      reviewDecision: reviewDecision || rationale || existing.reviewDecision,
      reviewNotes: rationale || existing.reviewNotes,
      statusHistory: [...(existing.statusHistory || []), historyItem],
      updatedAt: now,
    };

    await db.put('technicianReports', updated);
    await SyncEngine.queueMutation('reports', 'update', reportId, updated as any);
    return updated;
  }

  /**
   * Idempotently links a maintenance event to a report and vice versa without duplicates
   */
  public static async linkEventToReport(
    reportId: string,
    eventId: string,
    user?: User | { id?: string; fullName?: string; username?: string } | null,
    autoTransitionToActionRequired: boolean = true
  ): Promise<TechnicianReport | null> {
    const db = await getDB();
    const report = await db.get('technicianReports', reportId);
    if (!report || report.isDeleted) return null;

    const currentEvents = report.relatedEventIds || [];
    if (!currentEvents.includes(eventId)) {
      const now = TimeService.now();
      const updatedEvents = [...currentEvents, eventId];
      const newStatus = autoTransitionToActionRequired && report.status === 'pending_review'
        ? 'action_required'
        : report.status;

      const userId = user?.id || 'usr-1';
      const userName = user?.fullName || user?.username || 'مدیر فنی';

      const historyItem = {
        status: newStatus,
        changedAt: now,
        changedById: userId,
        changedByName: userName,
        rationale: `ایجاد و اتصال دستورکار تعمیراتی مربوطه (کد: ${eventId})`,
      };

      const updatedReport: TechnicianReport = {
        ...report,
        status: newStatus,
        relatedEventIds: updatedEvents,
        reviewedBy: userName,
        reviewedById: userId,
        reviewedAt: now,
        reviewDecision: `صدور دستورکار فنی پیگیری (${eventId})`,
        statusHistory: [...(report.statusHistory || []), historyItem],
        updatedAt: now,
      };

      await db.put('technicianReports', updatedReport);
      await SyncEngine.queueMutation('reports', 'update', reportId, updatedReport as any);

      // Also ensure the maintenance event has the reverse link
      const event = await db.get('events', eventId);
      if (event && event.relatedReportId !== reportId) {
        const updatedEvent = {
          ...event,
          relatedReportId: reportId,
          updatedAt: now,
        };
        await db.put('events', updatedEvent);
        await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
      }

      return updatedReport;
    }

    return report;
  }

  public static async deleteReport(reportId: string): Promise<boolean> {
    const db = await getDB();
    const existing = await db.get('technicianReports', reportId);
    if (!existing) return false;

    const now = TimeService.now();
    const updated: TechnicianReport = {
      ...existing,
      isDeleted: true,
      updatedAt: now,
    };

    await db.put('technicianReports', updated);
    await SyncEngine.queueMutation('reports', 'delete', reportId, { isDeleted: true });
    return true;
  }
}
