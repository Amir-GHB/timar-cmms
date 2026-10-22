import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { MaintenanceEvent, Asset } from '../types';
import { formatPersianDate, toPersianDigits, isoToJalali } from './persianDate';

export interface ReportPdfData {
  title: string;
  reportScope: string;
  startDate?: string;
  endDate?: string;
  generatedAt: string;
  generatedBy: string;
  selectedAssetsCount: number;
  totalAssetsCount: number;
  events: MaintenanceEvent[];
  stats: {
    totalEvents: number;
    completedCount: number;
    overdueCount: number;
    totalDurationHours: number;
    totalDowntimeHours: number;
  };
}

export async function generateReportPdf(data: ReportPdfData): Promise<void> {
  // Create an offscreen DOM container styled for Persian RTL report export
  const container = document.createElement('div');
  container.id = 'timar-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '1050px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Vazirmatn, Tahoma, Arial, sans-serif';
  container.style.direction = 'rtl';
  container.style.padding = '32px 36px';
  container.style.boxSizing = 'border-box';

  const dateRangeStr =
    data.startDate && data.endDate
      ? `از تاریخ ${data.startDate} تا ${data.endDate}`
      : data.startDate
      ? `از تاریخ ${data.startDate}`
      : data.endDate
      ? `تا تاریخ ${data.endDate}`
      : 'کل بازه زمانی';

  container.innerHTML = `
    <div style="direction: rtl; font-family: Vazirmatn, Tahoma, sans-serif; color: #1e293b;">
      <!-- Report Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 10px; background: #0369a1; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
            ت
          </div>
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">سامانه نگهداری و تعمیرات تیمار (Timar CMMS)</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">تصفیه‌خانه آب و تاسیسات آبرسانی - گزارش تفصیلی عملکرد نگهداری و تعمیرات</p>
          </div>
        </div>
        <div style="text-align: left; font-size: 11px; color: #475569; line-height: 1.6;">
          <div><strong>تاریخ تهیه گزارش:</strong> ${data.generatedAt}</div>
          <div><strong>تنظیم‌کننده:</strong> ${data.generatedBy}</div>
          <div><strong>بازه زمانی:</strong> ${dateRangeStr}</div>
        </div>
      </div>

      <!-- Scope & Summary Banner -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 13px;">
          <span style="font-weight: bold; color: #0369a1;">دامنه گزارش: </span>
          <span>${data.reportScope}</span>
          <span style="margin: 0 10px; color: #cbd5e1;">|</span>
          <span style="font-weight: bold; color: #0369a1;">تجهیزات هدف: </span>
          <span>${toPersianDigits(data.selectedAssetsCount)} از ${toPersianDigits(data.totalAssetsCount)} دستگاه</span>
        </div>
        <div style="font-size: 12px; color: #64748b;">
          شناسه گزارش: <span style="font-family: monospace;">TMR-${Date.now().toString(36).toUpperCase()}</span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: #166534;">اقدامات انجام‌شده</div>
          <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;">${toPersianDigits(data.stats.completedCount)}</div>
        </div>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: #9f1239;">اقدامات معوق و تاخیردار</div>
          <div style="font-size: 22px; font-weight: 800; color: #be123c; margin-top: 4px;">${toPersianDigits(data.stats.overdueCount)}</div>
        </div>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: #075985;">مجموع ساعت کارکرد نت</div>
          <div style="font-size: 22px; font-weight: 800; color: #0284c7; margin-top: 4px;">${toPersianDigits(data.stats.totalDurationHours)} <span style="font-size: 12px; font-weight: normal;">ساعت</span></div>
        </div>
        <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: #854d0e;">مجموع توقف اضطراری</div>
          <div style="font-size: 22px; font-weight: 800; color: #ca8a04; margin-top: 4px;">${toPersianDigits(data.stats.totalDowntimeHours)} <span style="font-size: 12px; font-weight: normal;">ساعت</span></div>
        </div>
      </div>

      <!-- Events Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin: 0 0 10px 0;">فهرست جزئیات دستورکارها و سوابق نگهداری (${toPersianDigits(data.events.length)} مورد)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 40px; text-align: center;">ردیف</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 90px;">کد تجهیز</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 140px;">نام تجهیز</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">عنوان اقدام و شرح عملیات</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 85px;">نوع رویداد</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 85px;">وضعیت</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 90px;">تاریخ ثبت</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 100px;">مسئول اجرا</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; width: 65px; text-align: center;">کارکرد (h)</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.events.length === 0
                ? `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #94a3b8;">رویدادی مطابق فیلترهای انتخابی یافت نشد.</td></tr>`
                : data.events
                    .map((e, index) => {
                      const isCompleted = e.status === 'completed';
                      const isEmergency = e.type === 'emergency';
                      const typeLabel =
                        e.type === 'preventive'
                          ? 'پیشگیرانه (PM)'
                          : e.type === 'emergency'
                          ? 'اضطراری (EM)'
                          : 'اصلاحی (CM)';
                      const statusLabel =
                        e.status === 'completed'
                          ? 'تکمیل‌شده'
                          : e.status === 'in_progress'
                          ? 'در دست اقدام'
                          : e.status === 'pending_approval'
                          ? 'در انتظار تایید'
                          : e.status === 'pending_request'
                          ? 'درخواست اقدام'
                          : e.status === 'cancelled'
                          ? 'لغوشده'
                          : e.status === 'overdue'
                          ? 'معوق / تاخیر'
                          : e.status === 'missed'
                          ? 'انجام‌نشده'
                          : 'برنامه‌ریزی‌شده';

                      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                      const statusColor = isCompleted ? '#15803d' : isEmergency ? '#b91c1c' : '#b45309';

                      return `
                        <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${toPersianDigits(index + 1)}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0369a1;">${e.assetCode}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${e.assetName}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155;">
                            <div style="font-weight: 600;">${e.title}</div>
                            ${e.description ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${e.description.substring(0, 70)}${e.description.length > 70 ? '...' : ''}</div>` : ''}
                          </td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">${typeLabel}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: ${statusColor};">${statusLabel}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-family: monospace;">${e.date}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">${e.technicianName || '-'}</td>
                          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${toPersianDigits(e.durationHours || 0)}</td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>

      <!-- Report Signatures Footer -->
      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-around; text-align: center; font-size: 12px; color: #475569;">
        <div>
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 40px;">کارشناس نت / ثبت‌کننده</div>
          <div style="font-size: 11px; color: #94a3b8;">امضا و تاریخ</div>
        </div>
        <div>
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 40px;">سرپرست تعمیرات و تاسیسات</div>
          <div style="font-size: 11px; color: #94a3b8;">امضا و تاریخ</div>
        </div>
        <div>
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 40px;">مدیر تصفیه‌خانه آب</div>
          <div style="font-size: 11px; color: #94a3b8;">امضا و تاریخ</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    let renderWidth = pageWidth - 20; // 10mm margins
    let renderHeight = renderWidth / ratio;

    if (renderHeight > pageHeight - 20) {
      renderHeight = pageHeight - 20;
      renderWidth = renderHeight * ratio;
    }

    const xPos = (pageWidth - renderWidth) / 2;
    const yPos = 10;

    pdf.addImage(imgData, 'JPEG', xPos, yPos, renderWidth, renderHeight);

    const safeTitle = `timar_report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(safeTitle);
  } finally {
    document.body.removeChild(container);
  }
}
