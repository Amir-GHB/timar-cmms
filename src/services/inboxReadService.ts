import { getDB } from './db';
import type { InboxReadItem } from '../types';
import { TimeService } from '../utils/timeService';

const LOCAL_STORAGE_READ_KEY = 'timar_inbox_read_items';

export class InboxReadService {
  /**
   * Loads all read item IDs for the current user/device.
   */
  public static async getReadItemIds(userId?: string): Promise<Set<string>> {
    const readSet = new Set<string>();

    // 1. Try local storage cache for speed
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_READ_KEY}_${userId || 'default'}`);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          arr.forEach((id: string) => readSet.add(id));
        }
      }
    } catch {
      // Fallback
    }

    // 2. Query IndexedDB
    try {
      const db = await getDB();
      const all = await db.getAll('inboxReadState');
      const filtered = userId ? all.filter((r) => r.userId === userId) : all;
      filtered.forEach((r) => readSet.add(r.itemId));
    } catch {
      // Fallback
    }

    return readSet;
  }

  /**
   * Marks an item (request event or report) as read without modifying its business status.
   */
  public static async markAsRead(
    itemId: string,
    itemType: 'request' | 'report',
    userId?: string
  ): Promise<void> {
    const effectiveUser = userId || 'default';
    const readId = `read-${effectiveUser}-${itemId}`;

    try {
      const db = await getDB();
      const record: InboxReadItem = {
        id: readId,
        userId: effectiveUser,
        itemId,
        itemType,
        readAt: TimeService.now(),
      };
      await db.put('inboxReadState', record);
    } catch {
      // Ignore DB error
    }

    // Update local storage cache
    try {
      const key = `${LOCAL_STORAGE_READ_KEY}_${effectiveUser}`;
      const stored = localStorage.getItem(key);
      const arr: string[] = stored ? JSON.parse(stored) : [];
      if (!arr.includes(itemId)) {
        arr.push(itemId);
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch {
      // Ignore local storage error
    }
  }

  /**
   * Marks an item as unread.
   */
  public static async markAsUnread(itemId: string, userId?: string): Promise<void> {
    const effectiveUser = userId || 'default';
    const readId = `read-${effectiveUser}-${itemId}`;

    try {
      const db = await getDB();
      await db.delete('inboxReadState', readId);
    } catch {
      // Ignore
    }

    try {
      const key = `${LOCAL_STORAGE_READ_KEY}_${effectiveUser}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        let arr: string[] = JSON.parse(stored);
        arr = arr.filter((id) => id !== itemId);
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch {
      // Ignore
    }
  }
}
