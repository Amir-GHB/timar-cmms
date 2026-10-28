import { getDB } from './db';
import type { AssetNote, User } from '../types';
import { TimeService } from '../utils/timeService';
import { SyncEngine } from './syncEngine';

export class NotesService {
  public static async getAllNotes(): Promise<AssetNote[]> {
    const db = await getDB();
    const all = await db.getAll('assetNotes');
    return all.filter((n) => !n.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static async getNotesByAsset(assetId: string): Promise<AssetNote[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('assetNotes', 'by-asset', assetId);
    return notes.filter((n) => !n.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static async createNote(
    data: {
      assetId: string;
      subAssetId?: string;
      title: string;
      body: string;
      category: AssetNote['category'];
      attachments?: string[];
      relatedEventId?: string;
      relatedReportId?: string;
    },
    user: User
  ): Promise<AssetNote> {
    const db = await getDB();
    const now = TimeService.now();
    const newId = `note-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const newNote: AssetNote = {
      id: newId,
      assetId: data.assetId,
      subAssetId: data.subAssetId,
      authorId: user.id,
      authorName: user.fullName || user.username,
      title: data.title.trim(),
      body: data.body.trim(),
      category: data.category || 'general',
      attachments: data.attachments || [],
      relatedEventId: data.relatedEventId,
      relatedReportId: data.relatedReportId,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    };

    await db.put('assetNotes', newNote);
    await SyncEngine.queueMutation('notes', 'create', newId, newNote as any);
    return newNote;
  }

  public static async updateNote(
    noteId: string,
    updates: Partial<Pick<AssetNote, 'title' | 'body' | 'category' | 'attachments' | 'isArchived'>>,
    user: User
  ): Promise<AssetNote | null> {
    const db = await getDB();
    const existing = await db.get('assetNotes', noteId);
    if (!existing || existing.isDeleted) return null;

    const now = TimeService.now();
    const updated: AssetNote = {
      ...existing,
      ...updates,
      lastEditedById: user.id,
      lastEditedByName: user.fullName || user.username,
      updatedAt: now,
    };

    await db.put('assetNotes', updated);
    await SyncEngine.queueMutation('notes', 'update', noteId, updated as any);
    return updated;
  }

  public static async toggleArchive(noteId: string, user: User): Promise<AssetNote | null> {
    const db = await getDB();
    const existing = await db.get('assetNotes', noteId);
    if (!existing || existing.isDeleted) return null;

    return this.updateNote(noteId, { isArchived: !existing.isArchived }, user);
  }

  public static async deleteNote(noteId: string): Promise<boolean> {
    const db = await getDB();
    const existing = await db.get('assetNotes', noteId);
    if (!existing) return false;

    const now = TimeService.now();
    const updated: AssetNote = {
      ...existing,
      isDeleted: true,
      updatedAt: now,
    };

    await db.put('assetNotes', updated);
    await SyncEngine.queueMutation('notes', 'delete', noteId, { isDeleted: true });
    return true;
  }
}
