// src/constants/questions.ts

// Add your real questions here.
// If the list is shorter than 566, the code below will auto-fill the rest for testing.
const MANUAL_QUESTIONS = [
  "Aku merasa sehat-sehat saja.",
  "Nafsu makanku baik.",
  "Aku bangun dengan rasa segar di pagi hari.",
  "Aku suka bekerja sebagai pustakawan.",
  "Aku mudah terbangun oleh suara berisik.",
  "Aku senang membaca berita kejahatan di surat kabar.",
  "Tangan dan kakiku biasanya terasa cukup hangat.",
  "Kehidupanku sehari-hari terisi dengan hal-hal yang menyenangkan.",
  "Aku sanggup bekerja sebagaimana biasanya.",
  "Aku sering merasa seolah-olah ada yang menyumbat di leherku.",
  "Seseorang harus berusaha memahami mimpinya sebagai petunjuk dan peringatan.",
  "Aku senang cerita detektif atau cerita misteri.",
  "Aku bekerja dalam ketegangan yang sangat besar.",
  "Aku suka mencret-mencret sebulan sekali atau lebih.",
  "Kadang-kadang aku merasa ingin memaki-maki orang.",
];

// Helper to generate 566 questions (filling the rest with placeholders)
export const MMPI_QUESTIONS: string[] = Array.from({ length: 566 }, (_, i) => {
  if (i < MANUAL_QUESTIONS.length) {
    return MANUAL_QUESTIONS[i];
  }
  return `Pertanyaan Placeholder Nomor ${i + 1} (Isi database pertanyaan asli di sini)`;
});
