import { createWorker } from "tesseract.js";

// Function to extract text from image using OCR
export async function extractTextFromImage(imageData: string): Promise<string> {
  try {
    // Initialize Tesseract worker with proper API usage
    const worker = await createWorker("eng");

    // Recognize text
    const { data } = await worker.recognize(imageData);

    // Terminate worker
    await worker.terminate();

    return data.text;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return "";
  }
}

// Function to extract text from video frame
export async function extractTextFromVideoFrame(
  videoElement: HTMLVideoElement
): Promise<string> {
  try {
    // Create canvas and draw video frame
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }

    // Draw the video frame onto the canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Get the image data from the canvas
    const imageData = canvas.toDataURL("image/png");

    // Extract text using OCR
    return await extractTextFromImage(imageData);
  } catch (error) {
    console.error("Error extracting text from video frame:", error);
    return "";
  }
}
