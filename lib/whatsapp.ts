export function normalizePakistanPhone(phone?: string | null) {
  if (!phone) return "";

  let number = phone.replace(/[^0-9]/g, "");

  // 00923001234567 -> 923001234567
  if (number.startsWith("0092")) {
    number = "92" + number.slice(4);
  }

  // 03001234567 -> 923001234567
  if (number.startsWith("03") && number.length === 11) {
    number = "92" + number.slice(1);
  }

  // 3001234567 -> 923001234567
  if (number.startsWith("3") && number.length === 10) {
    number = "92" + number;
  }

  // +92 already becomes 92 after cleanup, so no change needed
  return number;
}

export function createWhatsAppLink(phone: string, message: string) {
  const number = normalizePakistanPhone(phone);

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function createFeeReminderMessage({
  studentName,
  month,
  academyName,
}: {
  studentName: string;
  month: string;
  academyName: string;
}) {
  return `Assalam o Alaikum, ${studentName} ki ${month} fee pending hai. Kindly fee clear kar dein. Regards, ${academyName}`;
}