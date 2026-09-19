/**
 * Currency and Indian numbering utilities
 */

export function calculateAmountInWords(num: number): string {
  if (isNaN(num) || num <= 0) return '';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    if (n >= 100) {
      result += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += units[n] + ' ';
    }
    return result.trim();
  };

  if (num === 0) return 'Zero Rupees Only';

  let remaining = Math.floor(num);
  let words = '';

  // Crores
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    words += convertLessThanOneThousand(crores) + ' Crore ';
    remaining %= 10000000;
  }

  // Lakhs
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    words += convertLessThanOneThousand(lakhs) + ' Lakh ';
    remaining %= 100000;
  }

  // Thousands
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    words += convertLessThanOneThousand(thousands) + ' Thousand ';
    remaining %= 1000;
  }

  // Remaining < 1000
  if (remaining > 0) {
    words += convertLessThanOneThousand(remaining) + ' ';
  }

  return `${words.trim()} Rupees Only`;
}

export function formatIndianCurrency(num: number): string {
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
}
