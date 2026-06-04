
import { DocumentStatus } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizePlate = (plate: string): string => {
  if (!plate) return "";
  return String(plate)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

export const normalizeStr = (str: string): string => {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/_/g, ' ') 
    .replace(/\s+/g, ' ') 
    .trim();
};

export const calculateStatus = (expiryDate: string): DocumentStatus => {
  if (!expiryDate) return 'expired';
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime()) || expiry.getFullYear() < 1900) return 'expired';
  
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays >= 0 && diffDays <= 14) return 'critical';
  if (diffDays >= 15 && diffDays <= 29) return 'warning';
  return 'active';
};

export const getDaysDiff = (expiryDate: string): number => {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return 0;
  
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'No disponible';
  const clean = String(dateString).trim();
  
  // if it's already in dd/mm/yy format, just make sure day/month/year are formatted properly
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    if (year.length === 4) {
      year = year.slice(-2);
    }
    return `${day}/${month}/${year}`;
  }

  // If it's YYYY-MM-DD or YY-MM-DD
  const dashMatch = clean.match(/^(\d{2,4})-(\d{1,2})-(\d{2,4})$/);
  if (dashMatch) {
    let year = dashMatch[1];
    if (year.length === 4) {
      year = year.slice(-2);
    }
    const month = dashMatch[2].padStart(2, '0');
    const day = dashMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  try {
    const date = new Date(clean);
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = String(date.getUTCFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  
  return clean;
};

export const formatDateToDDMMAA = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  try {
    const parts = clean.split('-');
    if (parts.length === 3) {
      // Assuming YYYY-MM-DD
      const year = parts[0].slice(-2);
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = String(d.getUTCFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  return clean;
};

export const getDriveDirectLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:image')) return cleanUrl;
  if (!cleanUrl.includes('drive.google.com') && !cleanUrl.includes('docs.google.com')) return cleanUrl;
  
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, 
    /id=([a-zA-Z0-9_-]+)/, 
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/file\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      // thumbnail?id= is very reliable for public/shared Drive files
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return cleanUrl;
};

export const isImageLink = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('data:image') || url.includes('drive.google.com') || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(url);
};

export const processImageWithWatermark = (
  base64Str: string, 
  text: string, 
  coords?: { lat: number, lng: number },
  customDate?: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 2048; 
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);
      ctx.drawImage(img, 0, 0, width, height);
      
      const padding = width * 0.03;
      const boxWidth = width * 0.55; 
      const boxHeight = height * 0.22; 
      const x = width - boxWidth - padding;
      const y = height - boxHeight - padding;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(x, y, boxWidth, boxHeight);
      
      // Use custom date if provided, otherwise use current date
      // We use T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
      const dateToUse = customDate ? new Date(customDate + "T12:00:00") : new Date();
      const timestamp = dateToUse.toLocaleDateString('es-CO', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(width * 0.05)}px Inter, sans-serif`; 
      ctx.fillText(text.toUpperCase(), x + 25, y + 50);
      
      ctx.font = `${Math.round(width * 0.035)}px Inter, sans-serif`; 
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(timestamp, x + 25, y + 100);
      
      if (coords) {
        ctx.fillStyle = '#818cf8';
        ctx.fillText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, x + 25, y + 145);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.95)); 
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const compressImage = (base64Str: string, maxWidth = 1920): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const createMosaic = async (base64Array: string[], title?: string): Promise<string> => {
  if (base64Array.length === 0) return "";
  
  const images = await Promise.all(base64Array.map(base64 => {
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback for broken images
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, 100, 100);
        }
        const fallbackImg = new Image();
        fallbackImg.src = canvas.toDataURL();
        resolve(fallbackImg);
      };
    });
  }));

  const numImages = images.length;
  let cols = 2;
  let rows = 1;

  if (numImages === 1) { cols = 1; rows = 1; }
  else if (numImages === 2) { cols = 2; rows = 1; }
  else if (numImages <= 4) { cols = 2; rows = 2; }
  else if (numImages <= 6) { cols = 3; rows = 2; }
  else {
    cols = Math.ceil(Math.sqrt(numImages));
    rows = Math.ceil(numImages / cols);
  }

  const canvas = document.createElement('canvas');
  // Reducir la resolución del collage para evitar exceder el límite de 10MB de Google Apps Script
  const cellWidth = 800; 
  const cellHeight = 600;
  const headerHeight = title ? 80 : 0;

  canvas.width = cols * cellWidth;
  canvas.height = (rows * cellHeight) + headerHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return base64Array[0];

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Title Header
  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, headerHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(headerHeight * 0.45)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, headerHeight / 2);
  }

  images.forEach((img, i) => {
    const x = (i % cols) * cellWidth;
    const y = Math.floor(i / cols) * cellHeight + headerHeight;
    
    // Draw cell background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, cellWidth, cellHeight);

    // Calculate aspect ratio to fit image in cell with padding
    const padding = 20;
    const innerWidth = cellWidth - (padding * 2);
    const innerHeight = cellHeight - (padding * 2);
    
    const imgRatio = img.width / img.height;
    const innerRatio = innerWidth / innerHeight;
    
    let drawWidth = innerWidth;
    let drawHeight = innerHeight;
    let offsetX = padding;
    let offsetY = padding;

    if (imgRatio > innerRatio) {
      drawHeight = innerWidth / imgRatio;
      offsetY = padding + (innerHeight - drawHeight) / 2;
    } else {
      drawWidth = innerHeight * imgRatio;
      offsetX = padding + (innerWidth - drawWidth) / 2;
    }

    // Shadow effect for images
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
  });

  // Reducir la calidad de compresión a 0.8 para ahorrar peso
  return canvas.toDataURL('image/jpeg', 0.8); 
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const extractNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};
