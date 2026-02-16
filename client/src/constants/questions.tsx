// src/api/questions.ts
// (Note: Consider renaming this from 'constants' to 'api' since it relies on network calls now)

export const fetchMMPIQuestions = async (): Promise<string[]> => {
  try {
    const response = await fetch("http://localhost:3000/api/soal");
    if (!response.ok) throw new Error("Failed to fetch questions");

    // Assuming your Node server returns an array of objects: [{ soal: "Aku merasa sehat..." }]
    const data = await response.json();

    // Map it to just an array of strings like your original logic expects
    return data.map((item: { soal: string }) => item.soal);
  } catch (error) {
    console.error("Error loading questions from DB:", error);
    // Fallback or empty array if the server fails
    return [];
  }
};