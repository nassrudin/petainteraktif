import html2pdf from 'html2pdf.js';
import { ActiveStudent, StudentJourney } from '../../types';
import { StageAnswer } from '../../types';

export interface PdfExportOptions {
  student: ActiveStudent;
  journey: StudentJourney;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate PDF from ResultView slides
 */
export const generateResultPDF = async (
  elementId: string,
  options: PdfExportOptions
): Promise<Blob> => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    throw new Error('Element not found');
  }

  const opt = {
    margin:       10, // mm
    filename:     `Growth_Mindset_${options.student.name.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' as 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
  };
  
  return await (html2pdf().set(opt).from(element) as any).toBlob();
};

/**
 * Upload PDF to Google Drive
 */
export const uploadPDFToGoogleDrive = async (
  pdfBlob: Blob,
  googleApiKey: string,
  folderId: string,
  fileName: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', pdfBlob, fileName);
  formData.append('parents', folderId);
  formData.append('key', googleApiKey);

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&parents=${folderId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload: ${response.statusText}`);
  }

  const data = await response.json();
  return data.webViewLink; // Public URL to access the PDF
};

/**
 * Create Google Docs with PDF content preview
 */
export const createGoogleDocFromContent = async (
  student: ActiveStudent,
  journey: StudentJourney,
  docName: string
): Promise<string> => {
  const docContent = generateDocContent(student, journey);

  const response = await fetch(
    'https://docs.google.com/feeds/default/documents/basic/list',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_GOOGLE_APPS_SCRIPT_API_KEY`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: docName,
        mimeType: 'application/vnd.google-apps.document',
        parents: [{ id: 'YOUR_FOLDER_ID' }]
      }),
    }
  );

  const data = await response.json();
  return data.id;
};

/**
 * Generate plain text content from journey data for Google Docs
 */
const generateDocContent = (student: ActiveStudent, journey: StudentJourney): string => {
  let content = `GROWTH MINDSET JOURNEY MAP - PERCAYA DIRI\n`;
  content += `=".=".repeat(50)\n\n`;
  content += `Peserta: ${student.name}\n`;
  content += `Kelas: ${student.class}\n`;
  content += `No. Absen: ${student.absentNumber}\n`;
  content += `Tanggal: ${journey.updatedAt?.replace('T', ' ') || '-'}\n\n`;
  content += `=".=".repeat(50)\n\n`;

  Object.entries(journey.stages).forEach(([stageIdStr, stageData]: [string, any]) => {
    const stageId = parseInt(stageIdStr);
    if (!stageData.completed) return;
    
    content += `\nPOS ${stageIdStr.toUpperCase()}: ${getStageTitle(stageId)}\n`;
    content += `-${"─".repeat(40)}\n`;
    content += `Status: ${stageData.completed ? '✓ Selesai' : 'Belum'}\n`;
    content += `Tanggal: ${stageData.completedAt?.replace('T', ' ') || '-'}\n\n`;

    Object.entries(stageData.answers).forEach(([fieldId, value]) => {
      const fieldLabel = getFieldValueLabel(stageId, fieldId);
      content += `${fieldLabel}\n`;
      content += `  • ${value || '-'}\n\n`;
    });
  });

  return content;
};

const getStageTitle = (stageId: number): string => {
  const titles: Record<number, string> = {
    1: 'Potret Percaya Diri Saya (Titik Mulai)',
    2: 'Tantangan yang Saya Pilih (Challenge)',
    3: 'Hambatan di Jalan Saya (Obstacles)',
    4: 'Langkah Kecil Saya (Effort)',
    5: 'Saat Saya Dikritik (Critiques)',
    6: 'Belajar dari Orang Lain (Success of Others)',
    7: 'Melihat Kembali Usaha Saya (Refleksi)',
    8: 'Komitmen dan Target Saya (Garis Akhir)',
  };
  return titles[stageId] || 'Pos Tidak Diketahui';
};

const getFieldValueLabel = (stageId: number, fieldId: string): string => {
  const labels: Record<number, Record<string, string>> = {
    1: {
      confidence_scale: 'Skala percaya diri:',
      situation: 'Situasi:',
      thought: 'Saya berpikir:',
      feeling: 'Saya merasa:',
      action: 'Saya lalu:',
    },
    5: {
      received_criticism: 'Masukan yang saya terima:',
      what_i_improve: 'Yang saya ambil/perbaiki:',
      response_strategy: 'Respons saya ke depan:',
    },
  };
  return labels[stageId]?.[fieldId] || fieldId.replace(/_/g, ' ');
};
