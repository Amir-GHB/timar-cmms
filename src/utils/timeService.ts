/**
 * Centralized Authoritative Time & Timezone Service for Timar CMMS
 * All shared maintenance operations use Asia/Tehran as the business timezone.
 * Uses a monotonic clock anchor from Google Apps Script server responses.
 */

import type { MaintenanceSchedule, MaintenanceEvent, IntervalType } from '../types';

export interface ServerTimeAnchor {
  serverTimestamp: number;   // Server UTC epoch ms
  perfAnchorMs: number;      // performance.now() at reception
  wallClockAnchorMs: number; // Date.now() at reception
  isConfirmed: boolean;      // True if recently verified from cloud
}

export class TimeService {
  private static anchor: ServerTimeAnchor | null = null;

  public static readonly TIMEZONE = 'Asia/Tehran';

  /**
   * Initializes or updates the server-time anchor from a trusted cloud response
   */
  public static setServerAnchor(serverTimestamp: number): void {
    const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
    const wallNow = Date.now();

    this.anchor = {
      serverTimestamp,
      perfAnchorMs: perfNow,
      wallClockAnchorMs: wallNow,
      isConfirmed: true,
    };

    // Store in localStorage for quick fallback across reloads
    try {
      localStorage.setItem(
        'timar_server_time_anchor',
        JSON.stringify({
          serverTimestamp,
          wallClockAnchorMs: wallNow,
          savedAt: Date.now(),
        })
      );
    } catch {
      // Storage unavailable or disabled
    }
  }

  /**
   * Restores anchor from persisted storage on app initialization
   */
  public static initFromStorage(): void {
    if (this.anchor) return;
    try {
      const raw = localStorage.getItem('timar_server_time_anchor');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.serverTimestamp === 'number') {
          const elapsed = Date.now() - parsed.wallClockAnchorMs;
          // Only trust persisted anchor if elapsed time is non-negative and less than 7 days
          if (elapsed >= 0 && elapsed < 7 * 86400000) {
            const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
            this.anchor = {
              serverTimestamp: parsed.serverTimestamp + elapsed,
              perfAnchorMs: perfNow,
              wallClockAnchorMs: Date.now(),
              isConfirmed: false, // Estimated offline
            };
            return;
          }
        }
      }
    } catch {
      // Fallback below
    }

    // Default fallback to device clock until cloud sync ping
    const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
    this.anchor = {
      serverTimestamp: Date.now(),
      perfAnchorMs: perfNow,
      wallClockAnchorMs: Date.now(),
      isConfirmed: false,
    };
  }

  /**
   * Returns authoritative or monotonic estimated server timestamp (epoch ms)
   */
  public static now(): number {
    if (!this.anchor) {
      this.initFromStorage();
    }
    const a = this.anchor!;
    if (typeof performance !== 'undefined' && a.perfAnchorMs > 0) {
      const elapsedMonotonic = performance.now() - a.perfAnchorMs;
      if (elapsedMonotonic >= 0) {
        return Math.floor(a.serverTimestamp + elapsedMonotonic);
      }
    }

    // Monotonic fallback to wall-clock delta
    const elapsedWall = Date.now() - a.wallClockAnchorMs;
    return Math.floor(a.serverTimestamp + (elapsedWall >= 0 ? elapsedWall : 0));
  }

  /**
   * Whether current time is confirmed from server within a freshness threshold
   */
  public static isServerTimeConfirmed(): boolean {
    return !!this.anchor && this.anchor.isConfirmed;
  }

  /**
   * Returns current calendar date string in Asia/Tehran timezone: "YYYY-MM-DD"
   */
  public static getTehranDateString(timestampMs?: number): string {
    const target = timestampMs ?? this.now();
    try {
      const d = new Date(target);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d); // Returns YYYY-MM-DD
    } catch {
      // Fallback
      return new Date(target).toISOString().split('T')[0];
    }
  }

  /**
   * Centralized recurrence calculation:
   * Computes the next due date given a base date, interval type, and interval value.
   */
  public static calculateNextDueDate(
    baseDateStr: string,
    intervalType: IntervalType,
    intervalValue: number
  ): string {
    if (!baseDateStr) return this.getTehranDateString();

    const parts = baseDateStr.split('-');
    if (parts.length !== 3) {
      return this.getTehranDateString();
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));

    if (isNaN(date.getTime())) {
      return this.getTehranDateString();
    }

    const val = Math.max(1, intervalValue);

    switch (intervalType) {
      case 'days':
        date.setUTCDate(date.getUTCDate() + val);
        break;
      case 'weeks':
        date.setUTCDate(date.getUTCDate() + val * 7);
        break;
      case 'months': {
        const originalDay = date.getUTCDate();
        date.setUTCMonth(date.getUTCMonth() + val);
        // Handle end-of-month rollover (e.g. Jan 31 -> Feb 28)
        if (date.getUTCDate() < originalDay) {
          date.setUTCDate(0); // Last day of preceding month
        }
        break;
      }
      case 'hours': {
        const daysEquivalent = Math.max(1, Math.ceil(val / 24));
        date.setUTCDate(date.getUTCDate() + daysEquivalent);
        break;
      }
    }

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Generates deterministic ID for automated PM events:
   * Prevents duplicates across clients, retries, and offline reconciliations.
   */
  public static makeAutomatedEventId(scheduleId: string, occurrenceDate: string): string {
    return `evt-pm-${scheduleId}-${occurrenceDate}`;
  }

  /**
   * Evaluates all active maintenance schedules and events against current Tehran date.
   * 1. Automatically transitions expired manual events to 'missed'.
   * 2. Automatically transitions previous unresolved schedule occurrences to 'missed' when next interval arrives.
   * 3. Generates new PM occurrences for current interval.
   */
  public static evaluateSchedules(
    schedules: MaintenanceSchedule[],
    existingEvents: MaintenanceEvent[]
  ): {
    newEvents: MaintenanceEvent[];
    updatedEvents: MaintenanceEvent[];
    updatedSchedules: MaintenanceSchedule[];
  } {
    const todayTehran = this.getTehranDateString();
    const existingIds = new Set(existingEvents.map((e) => e.id));
    const newEvents: MaintenanceEvent[] = [];
    const updatedEvents: MaintenanceEvent[] = [];
    const updatedSchedules: MaintenanceSchedule[] = [];
    const nowMs = this.now();

    // 1. Reconcile Expired Manual Events -> 'missed'
    for (const evt of existingEvents) {
      if (evt.isDeleted) continue;
      // Completed, cancelled, and pending requests/approvals are NEVER marked missed
      if (
        evt.status === 'completed' ||
        evt.status === 'cancelled' ||
        evt.status === 'missed' ||
        evt.status === 'pending_approval' ||
        evt.status === 'pending_request'
      ) {
        continue;
      }

      const isManual = !evt.isAutomatedPM && !evt.originatingScheduleId;
      if (isManual) {
        const deadline = evt.deadlineDate || (evt.hasDeadline ? evt.date : '');
        if (deadline && deadline < todayTehran) {
          // Permitted maintenance window expired without completion -> missed
          const missedEvt: MaintenanceEvent = {
            ...evt,
            status: 'missed',
            updatedAt: nowMs,
          };
          updatedEvents.push(missedEvt);
        }
      }
    }

    // 2. Reconcile Recurring Schedules and Occurrences
    for (const sch of schedules) {
      if (sch.isDeleted) continue;

      // Paused schedules must NOT generate new events
      if (sch.status === 'paused') continue;

      let scheduleUpdated = false;
      let currentNextDueDate = sch.nextDueDate;

      // Check if the previous interval has arrived at its subsequent interval date
      const subsequentIntervalDate = this.calculateNextDueDate(
        currentNextDueDate,
        sch.intervalType,
        sch.intervalValue
      );

      if (todayTehran >= subsequentIntervalDate) {
        // Find previous occurrence event for currentNextDueDate
        const prevOccurrence = existingEvents.find(
          (e) =>
            !e.isDeleted &&
            (e.originatingScheduleId === sch.id || e.id === this.makeAutomatedEventId(sch.id, currentNextDueDate)) &&
            e.scheduleOccurrenceDate === currentNextDueDate
        );

        if (
          prevOccurrence &&
          (prevOccurrence.status === 'scheduled' || prevOccurrence.status === 'in_progress')
        ) {
          const missedOccurrence: MaintenanceEvent = {
            ...prevOccurrence,
            status: 'missed',
            updatedAt: nowMs,
          };
          updatedEvents.push(missedOccurrence);
        }

        // Advance schedule's nextDueDate to the new interval
        currentNextDueDate = subsequentIntervalDate;
        scheduleUpdated = true;
      }

      const isDueOrOverdue = currentNextDueDate <= todayTehran;
      const deterministicEventId = this.makeAutomatedEventId(sch.id, currentNextDueDate);

      // Check overdue status of schedule
      let newStatus = sch.status;
      if (isDueOrOverdue && currentNextDueDate < todayTehran && sch.status !== 'overdue') {
        newStatus = 'overdue';
        scheduleUpdated = true;
      } else if (!isDueOrOverdue && sch.status === 'overdue') {
        newStatus = 'active';
        scheduleUpdated = true;
      }

      // Check if event for this current occurrence already exists
      const alreadyHasEvent =
        existingIds.has(deterministicEventId) ||
        (sch.lastGeneratedDueDate && sch.lastGeneratedDueDate === currentNextDueDate) ||
        existingEvents.some(
          (e) =>
            (e.originatingScheduleId === sch.id || e.scheduleId === sch.id) &&
            (e.scheduleOccurrenceDate === currentNextDueDate || e.deadlineDate === currentNextDueDate)
        );

      if (isDueOrOverdue && !alreadyHasEvent) {
        const automatedEvent: MaintenanceEvent = {
          id: deterministicEventId,
          assetId: sch.assetId,
          assetName: sch.assetName,
          assetCode: sch.assetCode,
          title: `سرویس دوره‌ای PM: ${sch.taskTitle}`,
          type: 'preventive',
          status: 'scheduled',
          date: currentNextDueDate,
          hasDeadline: true,
          deadlineDate: currentNextDueDate,
          originatingScheduleId: sch.id,
          scheduleId: sch.id,
          scheduleOccurrenceDate: currentNextDueDate,
          affectedScheduleId: sch.id,
          isAutomatedPM: true,
          sideEffectsApplied: false,
          technicianId: sch.assignedRole === 'technician' ? 'usr-2' : 'usr-1',
          technicianName: sch.assignedRole === 'technician' ? 'واحد تعمیرات مکانیک' : 'مدیر فنی',
          durationHours: 0,
          downtimeHours: 0,
          description: sch.description || `انجام بازرسی و سرویس دوره‌ای برنامه نت ${sch.taskTitle}`,
          partsUsed: [],
          updatedAt: nowMs,
        };

        newEvents.push(automatedEvent);
        existingIds.add(deterministicEventId);

        sch.lastGeneratedDueDate = currentNextDueDate;
        scheduleUpdated = true;
      }

      if (scheduleUpdated) {
        updatedSchedules.push({
          ...sch,
          nextDueDate: currentNextDueDate,
          status: newStatus,
          lastGeneratedDueDate: sch.lastGeneratedDueDate,
          updatedAt: nowMs,
        });
      }
    }

    return { newEvents, updatedEvents, updatedSchedules };
  }
}
