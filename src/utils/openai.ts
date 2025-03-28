import OpenAI from "openai";

// Initialize the OpenAI client
// Note: Make sure to set OPENAI_API_KEY in your .env.local file
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Debounce timeout in milliseconds
const DEBOUNCE_TIMEOUT = 2000;

// Cache for storing recent translations
const translationCache = new Map<string, string>();

// Function to check if text is a complete sentence
function isCompleteSentence(text: string): boolean {
  // Check for common sentence endings
  const sentenceEndings = [".", "!", "?", "。", "！", "？"];
  return sentenceEndings.some((ending) => text.trim().endsWith(ending));
}

// Function to check if text is meaningful enough to translate
function isMeaningfulText(text: string): boolean {
  // Remove common incomplete phrases
  const incompletePhrases = [
    "i",
    "i want",
    "i want to",
    "i would",
    "i would like",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "down",
    "out",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
  ];

  const trimmedText = text.trim().toLowerCase();
  return !incompletePhrases.includes(trimmedText) && trimmedText.length > 3;
}

// Debounced translation function
let translationTimeout: NodeJS.Timeout | null = null;
let pendingText = "";

export async function debouncedTranslate(
  text: string,
  targetLanguage: string,
  onTranslation: (translatedText: string) => void
): Promise<void> {
  // Clear any pending translation
  if (translationTimeout) {
    clearTimeout(translationTimeout);
  }

  // Check cache first
  const cacheKey = `${text}-${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    onTranslation(translationCache.get(cacheKey) || "");
    return;
  }

  // Update pending text
  pendingText = text;

  // Set new timeout
  translationTimeout = setTimeout(async () => {
    if (
      isMeaningfulText(pendingText) &&
      (isCompleteSentence(pendingText) || pendingText.length > 50)
    ) {
      console.log("Translating text:", pendingText);
      try {
        const translatedText = await translateText(pendingText, targetLanguage);
        translationCache.set(cacheKey, translatedText);
        onTranslation(translatedText);
      } catch (error) {
        console.error("Translation error:", error);
      }
    }
  }, DEBOUNCE_TIMEOUT);
}

// Function to transcribe audio using Whisper API
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Convert blob to file
    const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");

    // Make API request
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

// Function to translate text using GPT-4
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    const systemPrompt =
      targetLanguage === "Vietnamese"
        ? `You are a professional Vietnamese translator. Translate the following text to Vietnamese (Tiếng Việt). 
         Preserve the original meaning, tone, and context as much as possible. 
         Use proper Vietnamese grammar and natural expressions. 
         If the text contains names, places, or technical terms, keep them unchanged.`
        : `You are a professional translator. Translate the following text to ${targetLanguage}. 
         Preserve the original meaning, tone, and context as much as possible.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0]?.message.content || "";
  } catch (error) {
    console.error("Error translating text:", error);
    throw error;
  }
}

export default openai;
