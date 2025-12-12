import { Bookmark } from '../types';

// Declare global libraries loaded via script tags
declare const window: any;
const XLSX = window.XLSX;
const pdfjsLib = window.pdfjsLib;

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

export interface ImportedData {
  title: string;
  url: string;
}

// Helper to clean and extract URLs from text
const extractLinksFromText = (text: string): ImportedData[] => {
  const matches = text.match(URL_REGEX) || [];
  // Remove duplicates
  const uniqueUrls = [...new Set(matches)];
  
  return uniqueUrls.map(url => ({
    title: new URL(url).hostname, // Default title to hostname
    url: url
  }));
};

export const parseFile = async (file: File): Promise<ImportedData[]> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  switch (fileType) {
    case 'json':
      return parseJson(file);
    case 'csv':
    case 'txt':
      return parseTextOrCsv(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    case 'pdf':
      return parsePdf(file);
    default:
      throw new Error('Unsupported file format');
  }
};

const parseJson = async (file: File): Promise<ImportedData[]> => {
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        title: item.title || item.name || new URL(item.url).hostname,
        url: item.url
      })).filter(item => item.url);
    }
    return [];
  } catch (e) {
    throw new Error('Invalid JSON format');
  }
};

const parseTextOrCsv = async (file: File): Promise<ImportedData[]> => {
  const text = await file.text();
  // Simple extraction: look for URLs anywhere in the text
  return extractLinksFromText(text);
};

const parseExcel = async (file: File): Promise<ImportedData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to array of arrays to scan all cells
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        const links: ImportedData[] = [];
        
        // Strategy: Scan every cell for a URL.
        // If we find a URL, try to find a title in the same row (previous column usually).
        json.forEach(row => {
          row.forEach((cell, index) => {
            if (typeof cell === 'string' && cell.match(URL_REGEX)) {
              // It's a URL
              let title = '';
              // Try to find a title in the previous column or next column
              if (index > 0 && row[index - 1] && typeof row[index - 1] === 'string') {
                title = row[index - 1];
              } else if (index < row.length - 1 && row[index + 1] && typeof row[index + 1] === 'string') {
                title = row[index + 1];
              } else {
                title = new URL(cell).hostname;
              }
              
              links.push({ title, url: cell });
            }
          });
        });
        
        resolve(links);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

const parsePdf = async (file: File): Promise<ImportedData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + ' ';
        }

        resolve(extractLinksFromText(fullText));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const exportToCsv = (bookmarks: Bookmark[]) => {
  const headers = ['Title', 'URL', 'Category', 'Status', 'Created At'];
  const rows = bookmarks.map(b => [
    `"${b.title.replace(/"/g, '""')}"`, // Escape quotes
    `"${b.url}"`,
    `"${b.category}"`,
    b.status,
    new Date(b.createdAt).toLocaleDateString()
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

export const exportToJson = (bookmarks: Bookmark[]) => {
  const jsonContent = JSON.stringify(bookmarks, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
};
