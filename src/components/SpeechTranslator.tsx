import React, { useState, useRef, useEffect } from "react";
import { transcribeAudio, debouncedTranslate } from "@/utils/openai";

type SpeechTranslatorProps = {
  targetLanguage: string;
};

const SpeechTranslator: React.FC<SpeechTranslatorProps> = ({
  targetLanguage,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [sourceText, setSourceText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          setSourceText(transcribedText);

          // Use debounced translation
          await debouncedTranslate(
            transcribedText,
            targetLanguage,
            (translatedText: string) => {
              setTranslatedText(translatedText);
            }
          );
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-6 py-3 rounded-full ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white font-medium transition-colors`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Original Text</h3>
            <p className="mt-2 text-gray-600">
              {sourceText || "No text yet..."}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Translation</h3>
            <p className="mt-2 text-gray-600">
              {translatedText || "No translation yet..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechTranslator;
