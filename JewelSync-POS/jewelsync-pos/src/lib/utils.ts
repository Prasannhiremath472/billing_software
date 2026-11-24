import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatWeight(grams: number): string {
  return `${formatNumber(grams, 3)} g`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  // Indian Financial Year: April 1 to March 31
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = (fyStart + 1).toString().slice(-2);
  const fyString = `${fyStart}-${fyEnd}`;
  const serial = Math.floor(100 + Math.random() * 900).toString().padStart(4, '0');
  return `SLJ/${fyString}/${serial}`;
}

export function generateItemCode(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `JW${random}`;
}

export function generateBarcode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `JWL-${year}-${random}`;
}

export function generateUniqueBarcode(existingBarcodes: string[] = []): string {
  const set = new Set(existingBarcodes.map(b => b.trim().toUpperCase()));
  const year = new Date().getFullYear();

  // Find the highest existing numeric serial in barcodes
  let highestSerial = 0;
  for (const b of existingBarcodes) {
    const match = b.match(/(\d{4,7})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestSerial && num < 9999999) {
        highestSerial = num;
      }
    }
  }

  // 1. Try sequential assignment first
  let nextSerial = Math.max(highestSerial + 1, 1001);
  let candidate = `JWL-${year}-${nextSerial.toString().padStart(5, '0')}`;

  // 2. If collision exists, increment until a guaranteed free slot is found
  while (set.has(candidate.toUpperCase())) {
    nextSerial++;
    candidate = `JWL-${year}-${nextSerial.toString().padStart(5, '0')}`;
  }

  return candidate;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertLessThanThousand(n % 100) : '');
  };

  const intPart = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - intPart) * 100);
  
  if (intPart === 0 && paise > 0) {
    return convertLessThanThousand(paise) + ' Paise Only';
  }

  let result = '';
  
  if (intPart >= 10000000) {
    result += convertLessThanThousand(Math.floor(intPart / 10000000)) + ' Crore ';
  }
  if (intPart >= 100000) {
    result += convertLessThanThousand(Math.floor((intPart % 10000000) / 100000)) + ' Lakh ';
  }
  if (intPart >= 1000) {
    result += convertLessThanThousand(Math.floor((intPart % 100000) / 1000)) + ' Thousand ';
  }
  
  const remainder = intPart % 1000;
  if (remainder) {
    result += convertLessThanThousand(remainder);
  }

  result = result.trim() + ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result + ' Only';
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
