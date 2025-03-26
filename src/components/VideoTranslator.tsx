import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { debouncedTranslate } from "@/utils/openai";
import Tesseract from "tesseract.js";

type VideoTranslatorProps = {
  targetLanguage: string;
};

const VideoTranslator: React.FC<VideoTranslatorProps> = ({
  targetLanguage,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isWebcam, setIsWebcam] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [lastProcessedText, setLastProcessedText] = useState<string>("hihi");
  const processingRef = useRef<boolean>(false);

  // Function to check if text is meaningful
  const isTextMeaningful = (
    text: string,
    confidence: number
  ): boolean | string => {
    // Clean the text more thoroughly
    const cleanText = text
      .replace(/^[~\-]+|[~\-]+$/g, "") // Remove tildes and dashes at start/end
      .replace(/\[.*?\]/g, "") // Remove anything in square brackets
      .replace(/\n/g, " ") // Replace newlines with spaces
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/[^\w\s.,!?'-]/g, "") // Keep only letters, numbers, basic punctuation
      .replace(/^[.,\s]+|[.,\s]+$/g, "") // Remove punctuation at start/end
      .trim();

    // Text quality criteria
    const minLength = 4; // Minimum text length
    const minConfidence = 65; // Minimum OCR confidence
    const minWordLength = 2; // Minimum word length
    const maxRepeatedChars = 3; // Maximum consecutive repeated characters
    const meaninglessPatterns = [
      /^[0-9\s]*$/, // Only numbers
      /^[.,\/#!$%\^&\*;:{}=\-_`~()\s]*$/, // Only punctuation
      /(.)\1{3,}/, // Repeated characters
      /^[a-zA-Z]{1,2}$/, // Single or double letters
    ];

    // Log the cleaning process
    console.log("Text cleaning:", {
      original: text,
      cleaned: cleanText,
      originalLength: text.length,
      cleanedLength: cleanText.length,
    });

    // Check confidence
    if (confidence < minConfidence) {
      console.log("Text rejected: Low confidence", { confidence });
      return false;
    }

    // Check text length
    if (cleanText.length < minLength) {
      console.log("Text rejected: Too short", { length: cleanText.length });
      return false;
    }

    // Check for meaningless patterns
    if (meaninglessPatterns.some((pattern) => pattern.test(cleanText))) {
      console.log("Text rejected: Matches meaningless pattern", {
        text: cleanText,
      });
      return false;
    }

    // Check word lengths and filter out short words
    const words = cleanText
      .split(/\s+/)
      .filter((word) => word.length >= minWordLength);
    if (words.length === 0) {
      console.log("Text rejected: No valid words after filtering");
      return false;
    }

    // Reconstruct text with only valid words
    const finalText = words.join(" ");
    console.log("Final processed text:", {
      text: finalText,
      confidence,
      wordCount: words.length,
    });

    // Update the extracted text with the cleaned version
    setExtractedText(finalText);
    return finalText;
  };

  // Process frames at regular intervals
  useEffect(() => {
    console.log("Recording state changed:", { isRecording, isWebcam });

    if (isRecording) {
      console.log("Starting video processing...");
      processingRef.current = true;
      processFrame();
    } else {
      console.log("Stopping video processing...");
      processingRef.current = false;
    }

    return () => {
      processingRef.current = false;
      console.log("Cleanup: stopping processing");
    };
  }, [isRecording]);

  const processFrame = async () => {
    if (!processingRef.current) {
      console.log("Processing stopped");
      return;
    }

    let videoElement: HTMLVideoElement | null = null;

    // Get the correct video element based on the source
    if (isWebcam && webcamRef.current) {
      videoElement = webcamRef.current.video as HTMLVideoElement;
      console.log("Processing webcam frame...");
    } else if (!isWebcam && videoRef.current) {
      videoElement = videoRef.current;
      console.log("Processing uploaded video frame...", {
        paused: videoElement.paused,
        currentTime: videoElement.currentTime,
        duration: videoElement.duration,
      });
    }

    if (!videoElement || !canvasRef.current || !processingRef.current) {
      console.log("Video processing skipped:", {
        hasVideoElement: !!videoElement,
        hasCanvas: !!canvasRef.current,
        isProcessing: processingRef.current,
        videoElementDetails: videoElement
          ? {
              readyState: videoElement.readyState,
              paused: videoElement.paused,
              ended: videoElement.ended,
            }
          : null,
      });
      if (processingRef.current) {
        requestAnimationFrame(processFrame);
      }
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.log("Failed to get canvas context");
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      // Draw current video frame on canvas
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      console.log("Starting OCR processing...");
      // Perform OCR on the frame
      const result = await Tesseract.recognize(canvas, "eng", {});

      const extractedText = result.data.text.trim();
      const confidence = result.data.confidence;

      console.log("OCR Result:", {
        text: extractedText,
        confidence: confidence,
        previousText: lastProcessedText,
        hasText: extractedText.length > 0,
      });

      const meaningfulText = isTextMeaningful(extractedText, confidence);

      if (meaningfulText !== lastProcessedText && meaningfulText) {
        console.log("New meaningful text detected, updating states...", {
          meaningfulText,
          lastProcessedText,
          extractedText,
        });
        setLastProcessedText("meaningfulText" as string);
        setExtractedText(meaningfulText as string);

        // Use debounced translation
        console.log("Initiating translation...");
        await debouncedTranslate(
          meaningfulText as string,
          targetLanguage,
          (translatedText: string) => {
            console.log("Translation received:", {
              original: extractedText,
              translated: translatedText,
              targetLanguage,
            });
            setTranslatedText(translatedText);
            setLastProcessedText("meaningfulText" as string);
          }
        );
      } else {
        console.log("Text rejected or unchanged");
      }
    } catch (error) {
      console.error("Error processing frame:", error);
    }

    // Schedule next frame processing if still recording
    if (processingRef.current) {
      requestAnimationFrame(processFrame);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Video file selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsWebcam(false);
      // Reset states when switching to uploaded video
      setExtractedText("");
      setTranslatedText("");
      console.log("handleFileUpload");
      setLastProcessedText("handleFileUpload");
      setIsRecording(false);
      processingRef.current = false;
    }
  };

  const toggleRecording = () => {
    const newState = !isRecording;
    console.log("Toggling recording state:", {
      currentState: isRecording,
      newState,
      isWebcam,
      hasVideo: !!videoRef.current,
      videoSrc,
    });

    setIsRecording(newState);
    if (!newState) {
      // Reset states when stopping recording
      setExtractedText("");
      setTranslatedText("");
      setLastProcessedText("toggleRecording");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            console.log("Switching to webcam mode");
            setIsWebcam(true);
            setVideoSrc("");
            setIsRecording(false);
            processingRef.current = false;
            // Reset states when switching to webcam
            setExtractedText("");
            setTranslatedText("");
            setLastProcessedText("");
          }}
          className={`px-4 py-2 rounded ${
            isWebcam ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Use Webcam
        </button>
        <label className="px-4 py-2 rounded bg-gray-200 text-gray-700 cursor-pointer">
          Upload Video
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="relative">
        {isWebcam ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user",
            }}
            className="rounded-lg"
            onUserMedia={() => console.log("Webcam access granted")}
            onUserMediaError={(error) => console.error("Webcam error:", error)}
          />
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            className="rounded-lg"
            controls
            style={{ width: "640px", height: "480px" }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              console.log("Video metadata loaded:", {
                duration: video.duration,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                readyState: video.readyState,
              });
            }}
            onPlay={() => console.log("Video started playing")}
            onPause={() => console.log("Video paused")}
            onError={(e) => console.error("Video error:", e)}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <button
          onClick={toggleRecording}
          className={`absolute top-4 right-4 px-4 py-2 rounded ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white`}
        >
          {isRecording ? "Stop" : "Start"}
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 rounded-b-lg">
          <p className="text-lg font-medium">{translatedText}</p>
          {extractedText && (
            <p className="text-sm opacity-75 mt-1">{extractedText}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTranslator;
