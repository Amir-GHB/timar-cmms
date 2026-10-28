import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  User,
  UserCredential,
  SessionRecord,
  Asset,
  SubAsset,
  MaintenanceEvent,
  MaintenanceSchedule,
  StoragePart,
  SyncMutation,
  AssetNote,
  TechnicianReport,
  InboxReadItem,
} from '../types';
import { hashPassword, normalizeUsername } from '../utils/crypto';

export interface TimarDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { 'by-username': string };
  };
  userCredentials: {
    key: string;
    value: UserCredential;
    indexes: { 'by-username': string };
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-tokenHash': string; 'by-user': string };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { 'by-parent': string; 'by-code': string };
  };
  subassets: {
    key: string;
    value: SubAsset;
    indexes: { 'by-asset': string };
  };
  events: {
    key: string;
    value: MaintenanceEvent;
    indexes: { 'by-asset': string; 'by-status': string; 'by-date': string };
  };
  schedules: {
    key: string;
    value: MaintenanceSchedule;
    indexes: { 'by-asset': string; 'by-status': string };
  };
  inventory: {
    key: string;
    value: StoragePart;
    indexes: { 'by-partNumber': string };
  };
  syncQueue: {
    key: string;
    value: SyncMutation;
    indexes: { 'by-timestamp': number };
  };
  settings: {
    key: string;
    value: { key: string; value: any };
  };
  assetNotes: {
    key: string;
    value: AssetNote;
    indexes: { 'by-asset': string; 'by-created': number };
  };
  technicianReports: {
    key: string;
    value: TechnicianReport;
    indexes: { 'by-asset': string; 'by-status': string; 'by-severity': string; 'by-created': number };
  };
  inboxReadState: {
    key: string;
    value: InboxReadItem;
    indexes: { 'by-user': string; 'by-item': string };
  };
}

const DB_NAME = 'timar_cmms_db';
const DB_VERSION = 4; // Upgraded for Asset Notes, Technician Reports & Unified Inbox

let dbPromise: Promise<IDBPDatabase<TimarDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TimarDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TimarDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-username', 'username', { unique: true });
        }
        if (!db.objectStoreNames.contains('userCredentials')) {
          const credStore = db.createObjectStore('userCredentials', { keyPath: 'userId' });
          credStore.createIndex('by-username', 'usernameNormalized', { unique: true });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-tokenHash', 'tokenHash', { unique: true });
          sessionStore.createIndex('by-user', 'userId');
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetStore.createIndex('by-parent', 'parentId');
          assetStore.createIndex('by-code', 'code');
        }
        if (!db.objectStoreNames.contains('subassets')) {
          const subStore = db.createObjectStore('subassets', { keyPath: 'id' });
          subStore.createIndex('by-asset', 'assetId');
        }
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('by-asset', 'assetId');
          eventStore.createIndex('by-status', 'status');
          eventStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('schedules')) {
          const schedStore = db.createObjectStore('schedules', { keyPath: 'id' });
          schedStore.createIndex('by-asset', 'assetId');
          schedStore.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const invStore = db.createObjectStore('inventory', { keyPath: 'id' });
          invStore.createIndex('by-partNumber', 'partNumber');
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('assetNotes')) {
          const notesStore = db.createObjectStore('assetNotes', { keyPath: 'id' });
          notesStore.createIndex('by-asset', 'assetId');
          notesStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('technicianReports')) {
          const repStore = db.createObjectStore('technicianReports', { keyPath: 'id' });
          repStore.createIndex('by-asset', 'assetId');
          repStore.createIndex('by-status', 'status');
          repStore.createIndex('by-severity', 'severity');
          repStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('inboxReadState')) {
          const readStore = db.createObjectStore('inboxReadState', { keyPath: 'id' });
          readStore.createIndex('by-user', 'userId');
          readStore.createIndex('by-item', 'itemId');
        }
      },
    });
  }
  return dbPromise;
}

import { TimeService } from '../utils/timeService';
import { DEFAULT_APPS_SCRIPT_URL } from '../config/constants';

// Default Seed Data for Water Treatment Plant (in authentic Persian matching Timar Qt)
export async function initializeDatabase(): Promise<void> {
  TimeService.initFromStorage();
  const db = await getDB();

  // Ensure default cloud URL is configured while preserving any valid custom URL
  const existingUrlSetting = await db.get('settings', 'appsScriptUrl');
  if (!existingUrlSetting || !existingUrlSetting.value || typeof existingUrlSetting.value !== 'string' || !existingUrlSetting.value.trim()) {
    await db.put('settings', { key: 'appsScriptUrl', value: DEFAULT_APPS_SCRIPT_URL });
  }

  const existingAssets = await db.getAll('assets');

  // Safe migration of existing users: migrate legacy plaintext passwords to userCredentials store
  const existingUsers = await db.getAll('users');
  for (const u of existingUsers) {
    const rawUser = u as any;
    const normalized = normalizeUsername(u.username);
    const existingCred = await db.get('userCredentials', u.id);

    if (rawUser.password) {
      const pHash = await hashPassword(rawUser.password);
      await db.put('userCredentials', {
        userId: u.id,
        usernameNormalized: normalized,
        passwordHash: pHash,
        updatedAt: TimeService.now(),
      });
      delete rawUser.password;
      await db.put('users', u);
    } else if (!existingCred) {
      // Create initial PBKDF2 hash for legacy accounts if credentials store is empty
      const defaultPass = u.role === 'manager' ? 'Admin#2026@Timar' : 'Tech#2026@Timar';
      const pHash = await hashPassword(defaultPass);
      await db.put('userCredentials', {
        userId: u.id,
        usernameNormalized: normalized,
        passwordHash: pHash,
        updatedAt: TimeService.now(),
      });
    }
  }

  // If already seeded with Persian data, ensure schema fields are migrated safely without erasing data
  if (existingAssets.length > 0 && existingAssets[0].name.includes('پمپ')) {
    // 1. Ensure assets have imageUrl
    for (const ast of existingAssets) {
      if (!ast.imageUrl) {
        ast.imageUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
        await db.put('assets', ast);
      }
    }

    // 2. Safe migration: ensure existing events have sideEffectsApplied
    const existingEvents = await db.getAll('events');
    for (const evt of existingEvents) {
      let changed = false;
      if (evt.sideEffectsApplied === undefined) {
        evt.sideEffectsApplied = evt.status === 'completed';
        changed = true;
      }
      if (changed) {
        await db.put('events', evt);
      }
    }

    // 3. Safe migration: ensure existing schedules have lastGeneratedDueDate
    const existingSchedules = await db.getAll('schedules');
    for (const sch of existingSchedules) {
      let changed = false;
      if (sch.lastGeneratedDueDate === undefined) {
        sch.lastGeneratedDueDate = sch.lastPerformedDate || '';
        changed = true;
      }
      if (changed) {
        await db.put('schedules', sch);
      }
    }

    // 4. Safe migration: ensure sample notes and reports exist for demo
    const existingNotes = await db.getAll('assetNotes');
    if (existingNotes.length === 0) {
      await seedDefaultNotesAndReports(db, TimeService.now());
    }

    return;
  }

  // Clear any old English demo rows
  await db.clear('users');
  await db.clear('userCredentials');
  await db.clear('sessions');
  await db.clear('assets');
  await db.clear('subassets');
  await db.clear('events');
  await db.clear('schedules');
  await db.clear('inventory');

  const now = TimeService.now();

  // 1. Users (NO plaintext passwords stored in User records)
  const defaultUsers: User[] = [
    {
      id: 'usr-1',
      username: 'manager',
      fullName: 'مهندس رضا محمدی',
      role: 'manager',
      department: 'مدیریت فنی و مهندسی تصفیه‌خانه',
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'usr-2',
      username: 'tech1',
      fullName: 'علی کریمی',
      role: 'technician',
      department: 'واحد تعمیرات مکانیک',
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'usr-3',
      username: 'tech2',
      fullName: 'سارا تهرانی',
      role: 'technician',
      department: 'واحد برق و ابزار دقیق',
      isActive: true,
      updatedAt: now,
    },
  ];
  for (const u of defaultUsers) await db.put('users', u);

  // Initialize secure PBKDF2 credentials in separate credentials store
  const mgrHash = await hashPassword('Admin#2026@Timar');
  const tech1Hash = await hashPassword('Tech#2026@Timar');
  const tech2Hash = await hashPassword('Tech#2026@Timar');

  await db.put('userCredentials', {
    userId: 'usr-1',
    usernameNormalized: 'manager',
    passwordHash: mgrHash,
    updatedAt: now,
  });
  await db.put('userCredentials', {
    userId: 'usr-2',
    usernameNormalized: 'tech1',
    passwordHash: tech1Hash,
    updatedAt: now,
  });
  await db.put('userCredentials', {
    userId: 'usr-3',
    usernameNormalized: 'tech2',
    passwordHash: tech2Hash,
    updatedAt: now,
  });

  // 2. Inventory / Storage Parts
  const defaultInventory: StoragePart[] = [
    {
      id: 'part-1',
      partName: 'سیل مکانیکی کارتریجی ۴۵ میلی‌متر',
      partNumber: 'MS-45-SIC',
      category: 'آب‌بند و کاسه‌نمد',
      quantityInStock: 8,
      unit: 'عدد',
      minThreshold: 3,
      unitCost: 145.0,
      shelfLocation: 'انبار قطعات A / قفسه ۰۲-B',
      supplier: 'EagleBurgmann Fluid Solutions',
      compatibleAssets: ['P-001', 'P-002'],
      updatedAt: now,
    },
    {
      id: 'part-2',
      partName: 'ممبران ۸ اینچ تصفیه اسمز معکوس',
      partNumber: 'SW30HR-8040',
      category: 'ممبران و فیلتراسیون',
      quantityInStock: 14,
      unit: 'عدد',
      minThreshold: 6,
      unitCost: 480.0,
      shelfLocation: 'انبار تمیز / پالت ۰۱',
      supplier: 'FilmTec / DuPont',
      compatibleAssets: ['RO-301'],
      updatedAt: now,
    },
    {
      id: 'part-3',
      partName: 'بلبرینگ شیار عمیق ۶۳۱۰-2RS',
      partNumber: 'BRG-6310-2RS',
      category: 'بلبرینگ و یاتاقان',
      quantityInStock: 12,
      unit: 'عدد',
      minThreshold: 4,
      unitCost: 38.5,
      shelfLocation: 'انبار A / کشو ۱۴-C',
      supplier: 'SKF Industrial',
      compatibleAssets: ['P-001', 'BL-501'],
      updatedAt: now,
    },
    {
      id: 'part-4',
      partName: 'کارتریج فیلتر ۵ میکرون ۳۰ اینچ',
      partNumber: 'PP-05-30',
      category: 'اقلام مصرفی',
      quantityInStock: 2, // Low stock warning
      unit: 'شاخه',
      minThreshold: 10,
      unitCost: 12.0,
      shelfLocation: 'انبار پیش‌تصفیه / قفسه ۰۳',
      supplier: 'Parker Hannifin',
      compatibleAssets: ['SF-101'],
      updatedAt: now,
    },
    {
      id: 'part-5',
      partName: 'روغن گیربکس سینتتیک ISO 220',
      partNumber: 'OIL-PAO-220',
      category: 'روانکار و مواد شیمیایی',
      quantityInStock: 45,
      unit: 'لیتر',
      minThreshold: 20,
      unitCost: 18.0,
      shelfLocation: 'انبار مواد شیمیایی / درام ۲',
      supplier: 'Mobil SHC 630',
      compatibleAssets: ['BL-501'],
      updatedAt: now,
    },
    {
      id: 'part-6',
      partName: 'الکترود سنسور pH ژلی صنعتی',
      partNumber: 'SEN-PH-GL12',
      category: 'تجهیزات ابزار دقیق',
      quantityInStock: 4,
      unit: 'عدد',
      minThreshold: 2,
      unitCost: 220.0,
      shelfLocation: 'کابینت آزمایشگاه / قفسه ۰۱',
      supplier: 'Endress+Hauser',
      compatibleAssets: ['OZ-201', 'CL-401'],
      updatedAt: now,
    },
  ];
  for (const inv of defaultInventory) await db.put('inventory', inv);

  // 3. Assets Hierarchy (matching Timar Qt createDemoAssets)
  const defaultAssets: Asset[] = [
    {
      id: 'ast-1',
      name: 'پمپ انتقال آب خام ورودی',
      code: 'P-001',
      parentId: null,
      category: 'Pumps & Blowers',
      status: 'operational',
      serialNumber: 'GRUND-CR32-9901',
      model: 'CR 32 Centrifugal Multistage',
      manufacturer: 'Grundfos',
      location: 'ایستگاه پمپاژ آب خام - کانال ورودی',
      capacitySpecs: '۳۵۰ متر مکعب در ساعت @ فشار ۵.۸ بار، توان ۵۵ کیلووات',
      installDate: '2022-04-10',
      operatingHours: 14220,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      notes: 'پمپ اصلی خط انتقال؛ دارای مانیتورینگ آنلاین ارتعاشات و دمای بیرینگ.',
      updatedAt: now,
    },
    {
      id: 'ast-2',
      name: 'پمپ انتقال آب تصفیه شده (آماده به کار)',
      code: 'P-002',
      parentId: null,
      category: 'Pumps & Blowers',
      status: 'operational',
      serialNumber: 'KSB-ETA-150-315',
      model: 'Etabloc 150-315',
      manufacturer: 'KSB Pumps',
      location: 'مخزن آب پاک - خط خروجی',
      capacitySpecs: '۴۰۰ متر مکعب در ساعت @ فشار ۴.۵ بار',
      installDate: '2022-05-15',
      operatingHours: 8190,
      imageUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=600&q=80',
      notes: 'کارکرد به صورت آلترناتیو هفتگی با پمپ اصلی.',
      updatedAt: now,
    },
    {
      id: 'ast-3',
      name: 'فیلتر شنی تحت فشار دو لایه',
      code: 'SF-101',
      parentId: null,
      category: 'Filtration (Sand & Carbon)',
      status: 'under_maintenance',
      serialNumber: 'CUL-SAND-2400',
      model: 'Pressure Sand Filter 2.4m',
      manufacturer: 'Culligan Water',
      location: 'سالن فیلتراسیون فاز یک',
      capacitySpecs: '۱۲۰ متر مکعب در ساعت، لایه‌های سیلیس و آنتراسیت',
      installDate: '2021-11-20',
      operatingHours: 24100,
      imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      notes: 'اختلاف فشار ورودی و خروجی به ۱.۱ بار رسیده و عملیات بک‌واش و تعویض نازل در دست اقدام است.',
      updatedAt: now,
    },
    {
      id: 'ast-4',
      name: 'پکیج ازن‌زنی و تزریق گاز',
      code: 'OZ-201',
      parentId: null,
      category: 'Chemical Dosing & Chlorination',
      status: 'degraded',
      serialNumber: 'OZ-GEN-1000G',
      model: 'Corona Discharge Ozone Generator',
      manufacturer: 'Ozonia Degrémont',
      location: 'ساختمان ضدعفونی و ازن‌زنی',
      capacitySpecs: '۱,۰۰۰ گرم در ساعت ازن گازی با اکسیژن خلوص ۹۳٪',
      installDate: '2023-01-18',
      operatingHours: 11400,
      imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=600&q=80',
      notes: 'راندمان دی‌الکتریک به علت رطوبت هوا اندکی کاهش یافته است؛ نیازمند احیای درایر هوا.',
      updatedAt: now,
    },
    {
      id: 'ast-5',
      name: 'واحد اسمز معکوس (RO) ترین شماره یک',
      code: 'RO-301',
      parentId: null,
      category: 'Membrane Separation (RO)',
      status: 'operational',
      serialNumber: 'SWRO-TRN-1-2022',
      model: 'SWRO 48-Vessel Rack',
      manufacturer: 'IDE Technologies',
      location: 'سالن نمک‌زدایی و ممبران',
      capacitySpecs: '۲,۵۰۰ متر مکعب در روز آب شیرین با حذف نمک ۹۹.۴٪',
      installDate: '2022-09-01',
      operatingHours: 17800,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      notes: 'دبی خروجی پرمیت و فشار غشاها در وضعیت اسمی و استاندارد قرار دارد.',
      updatedAt: now,
    },
    {
      id: 'ast-6',
      name: 'بلوئر هوادهی روتس حوضچه‌ها',
      code: 'BL-501',
      parentId: null,
      category: 'Pumps & Blowers',
      status: 'operational',
      serialNumber: 'AER-DELTA-HYBR-08',
      model: 'Delta Hybrid D 24 S',
      manufacturer: 'Aerzen Machines',
      location: 'ایستگاه دمنده‌ها و هوادهی بیولوژیکی',
      capacitySpecs: '۱,۸۰۰ متر مکعب نرمال در ساعت @ ۸۰۰ میلی‌بار',
      installDate: '2022-03-12',
      operatingHours: 15600,
      imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=600&q=80',
      notes: 'روغن گیربکس هر ۳,۰۰۰ ساعت کارکرد پایش و تعویض می‌گردد.',
      updatedAt: now,
    },
  ];
  for (const ast of defaultAssets) await db.put('assets', ast);

  // 4. SubAssets (matching Timar Qt createDemoAssets)
  const defaultSubAssets: SubAsset[] = [
    {
      id: 'sub-1',
      assetId: 'ast-1',
      name: 'الکتروموتور ۵۵ کیلووات القایی',
      partNumber: 'M3BP-250SMA-4',
      serialNumber: 'ABB-MTR-8812',
      status: 'normal',
      notes: 'جریان مصرفی روی ۹۸ آمپر بالانس است.',
      updatedAt: now,
    },
    {
      id: 'sub-2',
      assetId: 'ast-1',
      name: 'کوپلینگ انعطاف‌پذیر پین و بوش',
      partNumber: 'N-EUPEX-180',
      serialNumber: 'FLN-CPL-09',
      status: 'normal',
      notes: 'لاستیک‌های ضربه‌گیر در سرویس قبلی تعویض شدند.',
      updatedAt: now,
    },
    {
      id: 'sub-3',
      assetId: 'ast-1',
      name: 'سیل مکانیکی کارتریجی سیلیکون کارباید',
      partNumber: 'MS-45-SIC',
      serialNumber: 'EB-2022-901',
      status: 'normal',
      notes: 'آب‌بندی بدون هیچ‌گونه نشتی.',
      updatedAt: now,
    },
    {
      id: 'sub-4',
      assetId: 'ast-1',
      name: 'پروانه استنلس استیل ۳۱۶ بازده بالا',
      partNumber: 'IMP-CR32-316',
      serialNumber: 'IMP-9981',
      status: 'normal',
      notes: 'بدون کاویتاسیون یا خوردگی سطحی.',
      updatedAt: now,
    },
    {
      id: 'sub-5',
      assetId: 'ast-3',
      name: 'نازل‌های ستاره‌ای پلاستیکی کف فیلتر',
      partNumber: 'NZL-STAR-02',
      serialNumber: 'NZL-BATCH-10',
      status: 'worn',
      notes: 'احتمال شکستگی دو عدد نازل در گوشه مخزن.',
      updatedAt: now,
    },
    {
      id: 'sub-6',
      assetId: 'ast-4',
      name: 'دیفیوزر سرامیکی مقاوم به ازن',
      partNumber: 'DIF-CERAMIC-OZ',
      serialNumber: 'DIF-8831',
      status: 'normal',
      notes: 'اندازه حباب‌ها ریز و یکنواخت.',
      updatedAt: now,
    },
  ];
  for (const sub of defaultSubAssets) await db.put('subassets', sub);

  // 5. Maintenance Schedules (in Persian)
  const defaultSchedules: MaintenanceSchedule[] = [
    {
      id: 'sch-1',
      assetId: 'ast-1',
      assetName: 'پمپ انتقال آب خام ورودی',
      assetCode: 'P-001',
      taskTitle: 'گریس‌کاری و روانکاری بیرینگ‌های درایو و نان‌درایو',
      description: 'تزریق ۳۰ گرم گریس پایه پلی‌اوره با گریس‌پمپ دستی و پایش دمای یاتاقان حین کارکرد.',
      intervalType: 'months',
      intervalValue: 1,
      lastPerformedDate: '2026-09-20',
      nextDueDate: '2026-10-20',
      status: 'active',
      assignedRole: 'technician',
      updatedAt: now,
    },
    {
      id: 'sch-2',
      assetId: 'ast-3',
      assetName: 'فیلتر شنی تحت فشار دو لایه',
      assetCode: 'SF-101',
      taskTitle: 'بک‌واش معکوس و بازرسی چشمی بستر سیلیس',
      description: 'شستشوی معکوس با هوا و آب با دبی ۳۰ متر مکعب در ساعت، نمونه‌گیری از کدورت آب خروجی.',
      intervalType: 'weeks',
      intervalValue: 2,
      lastPerformedDate: '2026-09-15',
      nextDueDate: '2026-10-15',
      status: 'overdue',
      assignedRole: 'technician',
      updatedAt: now,
    },
    {
      id: 'sch-3',
      assetId: 'ast-6',
      assetName: 'بلوئر هوادهی روتس حوضچه‌ها',
      assetCode: 'BL-501',
      taskTitle: 'تعویض روغن گیربکس و فیلتر هوای ورودی',
      description: 'تخلیه روغن کهنه ISO 220، شستشوی کارتر، تمیزکاری المنت هوای ورودی و پایش کشش تسمه‌ها.',
      intervalType: 'hours',
      intervalValue: 3000,
      lastPerformedDate: '2026-07-10',
      nextDueDate: '2026-11-15',
      dueOperatingHours: 16000,
      status: 'active',
      assignedRole: 'technician',
      updatedAt: now,
    },
  ];
  for (const sch of defaultSchedules) await db.put('schedules', sch);

  // 6. Maintenance Events (Historical + 1 PENDING APPROVAL for manager testing)
  const defaultEvents: MaintenanceEvent[] = [
    {
      id: 'evt-1',
      assetId: 'ast-1',
      assetName: 'پمپ انتقال آب خام ورودی',
      assetCode: 'P-001',
      title: 'تعویض سیل مکانیکی و هم‌راستاسازی لیزری شفت',
      type: 'emergency',
      status: 'completed',
      date: '2026-09-18',
      technicianId: 'usr-2',
      technicianName: 'علی کریمی',
      durationHours: 4.5,
      description: 'نشتی شدید آب از محفظه کاسه‌نمد پمپ مشاهده شد (حدود ۲ لیتر در دقیقه). پمپ دشارژ و سیل باز شد.',
      solution: 'سیل مکانیکی کارتریجی جدید نصب شد و هم‌راستاسازی لیزری شفت و موتور با دقت ۰.۰۲ میلی‌متر انجام شد.',
      partsUsed: [
        {
          storagePartId: 'part-1',
          partName: 'سیل مکانیکی کارتریجی ۴۵ میلی‌متر',
          partNumber: 'MS-45-SIC',
          quantityUsed: 1,
          unitCost: 145.0,
        },
      ],
      downtimeHours: 5.0,
      approvedBy: 'مهندس رضا محمدی',
      approvalNotes: 'تایید شد. پمپ بدون نشتی و ارتعاش مجدداً راه‌اندازی گردید.',
      approvalDate: '2026-09-19',
      updatedAt: now - 86400000 * 30,
    },
    {
      id: 'evt-2',
      assetId: 'ast-3',
      assetName: 'فیلتر شنی تحت فشار دو لایه',
      assetCode: 'SF-101',
      title: 'شستشوی معکوس و بازرسی نازل‌های تحتانی (در انتظار تایید)',
      type: 'preventive',
      status: 'pending_approval', // Ready for manager approval testing
      date: '2026-10-18',
      technicianId: 'usr-2',
      technicianName: 'علی کریمی',
      durationHours: 2.5,
      description: 'فشار تفاضلی فیلتر به ۱.۱ بار رسیده بود. عملیات هوادهی و بک‌واش انجام و کدورت خروجی ثبت گردید.',
      solution: 'دریچه بازدید منهول باز شد، بستر سیلیس یکنواخت گردید و فیلتر آماده تست نهایی است.',
      partsUsed: [
        {
          storagePartId: 'part-4',
          partName: 'کارتریج فیلتر ۵ میکرون ۳۰ اینچ',
          partNumber: 'PP-05-30',
          quantityUsed: 2,
          unitCost: 12.0,
        },
      ],
      downtimeHours: 3.0,
      updatedAt: now - 3600000,
    },
  ];
  for (const evt of defaultEvents) await db.put('events', evt);

  // 7. Seed Default Notes & Reports for Water Treatment Plant
  await seedDefaultNotesAndReports(db, now);

  // 8. Settings (Persian by default as requested!)
  await db.put('settings', { key: 'language', value: 'fa' });
  await db.put('settings', { key: 'calendarType', value: 'persian' });
  await db.put('settings', { key: 'currentUser', value: defaultUsers[0] });
  await db.put('settings', { key: 'appsScriptUrl', value: '' });
  await db.put('settings', { key: 'lastSyncTimestamp', value: 0 });
}

export async function seedDefaultNotesAndReports(
  db: IDBPDatabase<TimarDB>,
  now: number
): Promise<void> {
  const defaultNotes: AssetNote[] = [
    {
      id: 'note-1',
      assetId: 'ast-1',
      subAssetId: 'sub-1',
      authorId: 'usr-2',
      authorName: 'علی کریمی',
      title: 'پایش ارتعاشات دوره‌ای یاتاقان درایو',
      body: 'اندازه‌گیری ارتعاشات افقی و عمودی با دستگاه ارتعاش‌سنج پرتابل نشان داد مقدار موثر سرعت (RMS Velocity) روی ۱.۸ میلی‌متر بر ثانیه تثبیت شده که در محدوده کاملاً استاندارد و مطلوب (ناحیه A استاندارد بین‌المللی ISO 10816) قرار دارد. نوبت روانکاری بعدی طبق تقویم انجام شود.',
      category: 'inspection',
      createdAt: now - 3 * 86400000,
      updatedAt: now - 3 * 86400000,
    },
    {
      id: 'note-2',
      assetId: 'ast-3',
      authorId: 'usr-1',
      authorName: 'مهندس رضا محمدی',
      title: 'ثبت مشخصات سیلیس شارژ شده در بستر فیلتر',
      body: 'در عملیات نوسازی اخیر، ۱۰ کیسه سیلیس مرغوب دانه‌بندی ۰.۸ الی ۱.۲ میلی‌متر با ضریب یکنواختی ۱.۴ به مخزن اضافه شد و ارتفاع بستر به حد اسمی رسید. نتایج بک‌واش بعدی باید جهت سنجش شسته شدن ریزدانه‌ها بررسی گردد.',
      category: 'modification',
      createdAt: now - 10 * 86400000,
      updatedAt: now - 10 * 86400000,
    },
    {
      id: 'note-3',
      assetId: 'ast-5',
      authorId: 'usr-3',
      authorName: 'سارا تهرانی',
      title: 'ثبت نرخ بازیافت و فشار کاری اسمی واحد اسمز معکوس',
      body: 'فشار هدر ورودی پرشر وسل‌ها روی ۱۲.۲ بار و هدایت الکتریکی (EC) خروجی روی ۳۸۰ میکروزیمنس تثبیت گردید. شستشوی شیمیایی ممبران‌ها (CIP) طبق برنامه ۶ ماهه بعدی در نظر گرفته شود.',
      category: 'observation',
      createdAt: now - 15 * 86400000,
      updatedAt: now - 15 * 86400000,
    },
  ];

  for (const note of defaultNotes) {
    await db.put('assetNotes', note);
  }

  const defaultReports: TechnicianReport[] = [
    {
      id: 'rep-1',
      assetId: 'ast-4',
      assetName: 'پکیج ازن‌زنی و تزریق گاز',
      assetCode: 'OZ-201',
      reporterId: 'usr-3',
      reporterName: 'سارا تهرانی',
      title: 'نشتی جزئی گاز در اتصال شیلنگ تفلونی انژکتور ازن',
      description: 'در حین بازرسی دوره‌ای شیفت صبح، بوی رقیق گاز ازن در مجاورت انژکتور تزریق آب خام استشمام شد. دتکتور پرتابل عدد ۰.۰۸ ppm را ثبت نمود. احتمال خرابی یا شل‌شدن اتصالات تفلونی و نیاز به بررسی گیج فشار وجود دارد.',
      category: 'leak',
      severity: 'high',
      occurrenceDate: '2026-10-23',
      evidenceNotes: 'بوی گاز در فاصله یک متری انژکتور حس می‌شود و محل اتصال با کف صابون تست شد که حباب‌زایی خفیف داشت.',
      status: 'pending_review',
      statusHistory: [
        {
          status: 'pending_review',
          changedAt: now - 2 * 3600000,
          changedById: 'usr-3',
          changedByName: 'سارا تهرانی',
          rationale: 'ثبت اولیه گزارش عیب توسط تکنسین شیفت',
        },
      ],
      relatedEventIds: [],
      createdAt: now - 2 * 3600000,
      updatedAt: now - 2 * 3600000,
    },
    {
      id: 'rep-2',
      assetId: 'ast-6',
      assetName: 'بلوئر هوادهی روتس حوضچه‌ها',
      assetCode: 'BL-501',
      reporterId: 'usr-2',
      reporterName: 'علی کریمی',
      title: 'صدای غیرعادی و ارتعاش در دور کاری بالای الکتروموتور',
      description: 'در بار نامی و فرکانس کاری بالای ۴۸ هرتز، صدای سایش خفیف و ارتعاش متناوب در سمت یاتاقان خروجی کوپلینگ بلوئر شنیده می‌شود. نیازمند بررسی فوری کوپلینگ و تست بلبرینگ‌ها.',
      category: 'noise',
      severity: 'medium',
      occurrenceDate: '2026-10-22',
      evidenceNotes: 'صدا با استتوسکوپ صنعتی ثبت و شنود شد.',
      status: 'action_required',
      reviewedBy: 'مهندس رضا محمدی',
      reviewedById: 'usr-1',
      reviewedAt: now - 24 * 3600000,
      reviewDecision: 'صدور دستورکار بازرسی کوپلینگ و یاتاقان',
      reviewNotes: 'با توجه به اهمیت هوادهی حوضچه‌ها، دستورکار بازدید فنی صادر شد و برای تکنسین ارسال گردید.',
      statusHistory: [
        {
          status: 'pending_review',
          changedAt: now - 36 * 3600000,
          changedById: 'usr-2',
          changedByName: 'علی کریمی',
          rationale: 'ثبت گزارش نقص',
        },
        {
          status: 'action_required',
          changedAt: now - 24 * 3600000,
          changedById: 'usr-1',
          changedByName: 'مهندس رضا محمدی',
          rationale: 'تایید لزوم اقدام فنی سریع',
        },
      ],
      relatedEventIds: [],
      createdAt: now - 36 * 3600000,
      updatedAt: now - 24 * 3600000,
    },
    {
      id: 'rep-3',
      assetId: 'ast-1',
      assetName: 'پمپ انتقال آب خام ورودی',
      assetCode: 'P-001',
      reporterId: 'usr-2',
      reporterName: 'علی کریمی',
      title: 'نوسان دمای هوزینگ یاتاقان سمت موتور',
      description: 'دمای هوزینگ یاتاقان در اوج کارکرد بعدازظهر به ۶۸ درجه سانتی‌گراد رسید. با توجه به آستانه مجاز ۷۵ درجه، فعلاً نیازمند پایش مستمر است.',
      category: 'vibration',
      severity: 'low',
      occurrenceDate: '2026-10-21',
      evidenceNotes: 'دما توسط ترمومتر لیزری کالیبره‌شده ثبت گردید.',
      status: 'monitoring',
      reviewedBy: 'مهندس رضا محمدی',
      reviewedById: 'usr-1',
      reviewedAt: now - 48 * 3600000,
      reviewDecision: 'پایش و تحت نظر گرفتن دما در شیفت‌های کاری',
      reviewNotes: 'ثبت دمای یاتاقان هر ۴ ساعت یک‌بار در لاگ‌بوک ایستگاه پمپاژ توسط تکنسین شیفت.',
      statusHistory: [
        {
          status: 'pending_review',
          changedAt: now - 52 * 3600000,
          changedById: 'usr-2',
          changedByName: 'علی کریمی',
        },
        {
          status: 'monitoring',
          changedAt: now - 48 * 3600000,
          changedById: 'usr-1',
          changedByName: 'مهندس رضا محمدی',
          rationale: 'دما در محدوده هشدار اولیه است، نیازمند پایش مستمر تا تثبیت شرایط',
        },
      ],
      relatedEventIds: [],
      createdAt: now - 52 * 3600000,
      updatedAt: now - 48 * 3600000,
    },
  ];

  for (const rep of defaultReports) {
    await db.put('technicianReports', rep);
  }
}
