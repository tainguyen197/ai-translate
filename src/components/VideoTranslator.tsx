import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { GoogleGenerativeAI } from "@google/generative-ai";

type VideoTranslatorProps = {
  targetLanguage: string;
};

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DisplayCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
);

const VideoTranslator: React.FC<VideoTranslatorProps> = ({
  targetLanguage,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isWebcam, setIsWebcam] = useState(true);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const lastProcessedTextRef = useRef<string>("");
  const processingRef = useRef<boolean>(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const textCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const delayRef = useRef<number>(1000);

  // Function to convert canvas to base64 image
  const canvasToBase64 = (canvas: HTMLCanvasElement): string => {
    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  };

  // Combined function to process image and translate text with Gemini AI
  const processAndTranslateWithGemini = async (
    imageBase64: string,
    targetLang: string
  ): Promise<{ extractedText: string; translatedText: string }> => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `First, extract any text visible in the image. Then, translate that text to ${targetLang}. 
      Return the result in the following format ONLY:
      Original: [extracted text]
      Translation: [translated text]
      If there's no clear text, return "Original: " and "Translation: " with empty values.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text().trim();

      // Parse the response using a more compatible regex approach
      const parts = text.split("Translation:");
      const originalPart = parts[0].replace("Original:", "").trim();
      const translationPart = parts[1] ? parts[1].trim() : "";

      if (translationPart) {
        delayRef.current = 1000;
      } else {
        delayRef.current = 5000;
      }

      return {
        extractedText: originalPart,
        translatedText: translationPart,
      };
    } catch (error) {
      console.error("Error processing and translating with Gemini:", error);
      delayRef.current = 5000;
      return { extractedText: "", translatedText: "" };
    }
  };

  const updateCanvas = () => {
    const videoElement = isWebcam ? webcamRef.current?.video : videoRef.current;
    const canvas = canvasRef.current;

    if (!videoElement || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Match canvas size to video display size
    const videoRect = videoElement.getBoundingClientRect();
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;

    // Clear previous content
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (selectionBox) {
      // Draw selection box with game-like style
      const coords = getDisplayCoordinates(selectionBox);

      // Draw semi-transparent background for selection
      context.fillStyle = "rgba(0, 0, 0, 0.3)";
      context.fillRect(coords.left, coords.top, coords.width, coords.height);

      // Draw border with game-like style
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(coords.left, coords.top, coords.width, coords.height);

      // Draw inner border for game-like effect
      context.strokeStyle = "#000000";
      context.lineWidth = 1;
      context.strokeRect(
        coords.left + 2,
        coords.top + 2,
        coords.width - 4,
        coords.height - 4
      );
    }
  };

  // Process frames at regular intervals
  useEffect(() => {
    if (isRecording) {
      processingRef.current = true;
      processFrame();
    } else {
      processingRef.current = false;
    }

    return () => {
      processingRef.current = false;
    };
  }, [isRecording]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow new selection when not recording and no existing selection
    if (!isRecording && !selectionBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      const videoElement = isWebcam
        ? webcamRef.current?.video
        : videoRef.current;

      if (rect && videoElement) {
        const videoRect = videoElement.getBoundingClientRect();

        // Calculate scale factors between video element display size and actual video dimensions
        const scaleX = videoElement.videoWidth / videoRect.width;
        const scaleY = videoElement.videoHeight / videoRect.height;

        // Calculate position relative to the video element
        const x = e.clientX - videoRect.left;
        const y = e.clientY - videoRect.top;

        // Store the actual video coordinates
        setStartPos({
          x: x * scaleX,
          y: y * scaleY,
        });
        setSelectionBox({
          x: x * scaleX,
          y: y * scaleY,
          width: 0,
          height: 0,
        });
        setIsSelecting(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      const videoElement = isWebcam
        ? webcamRef.current?.video
        : videoRef.current;

      if (videoElement) {
        const videoRect = videoElement.getBoundingClientRect();

        // Calculate scale factors
        const scaleX = videoElement.videoWidth / videoRect.width;
        const scaleY = videoElement.videoHeight / videoRect.height;

        // Calculate current position relative to video
        const currentX = (e.clientX - videoRect.left) * scaleX;
        const currentY = (e.clientY - videoRect.top) * scaleY;

        const width = currentX - startPos.x;
        const height = currentY - startPos.y;

        setSelectionBox({
          x: width > 0 ? startPos.x : currentX,
          y: height > 0 ? startPos.y : currentY,
          width: Math.abs(width),
          height: Math.abs(height),
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
      // Ensure selection box has minimum dimensions
      if (
        selectionBox &&
        (selectionBox.width < 50 || selectionBox.height < 50)
      ) {
        setSelectionBox(null);
      } else if (selectionBox) {
        // Update canvas when selection is made
        updateCanvas();
      }
    }
  };

  // Add a function to clear selection
  const clearSelection = () => {
    setSelectionBox(null);
    setIsSelecting(false);
    // Reset canvas to show full frame
    updateCanvas();
  };

  // Update canvas when video source changes
  useEffect(() => {
    updateCanvas();
  }, [isWebcam, videoSrc]);

  const processFrame = async () => {
    if (!processingRef.current || isProcessing) {
      return;
    }

    let videoElement: HTMLVideoElement | null = null;

    if (isWebcam && webcamRef.current) {
      videoElement = webcamRef.current.video as HTMLVideoElement;
    } else if (!isWebcam && videoRef.current) {
      videoElement = videoRef.current;
    }

    if (!videoElement || !canvasRef.current || !processingRef.current) {
      if (processingRef.current) {
        requestAnimationFrame(processFrame);
      }
      return;
    }

    try {
      setIsProcessing(true);

      // Create a temporary canvas for processing
      const tempCanvas = document.createElement("canvas");
      const tempContext = tempCanvas.getContext("2d");

      if (!tempContext) {
        return;
      }

      // Set temp canvas size to video dimensions
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;

      if (selectionBox) {
        // Draw only the selected area
        tempCanvas.width = selectionBox.width;
        tempCanvas.height = selectionBox.height;
        tempContext.drawImage(
          videoElement,
          selectionBox.x,
          selectionBox.y,
          selectionBox.width,
          selectionBox.height,
          0,
          0,
          selectionBox.width,
          selectionBox.height
        );
      } else {
        // Draw the full frame
        tempContext.drawImage(
          videoElement,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );
      }

      // Convert temp canvas to base64 and process with Gemini
      const imageBase64 = canvasToBase64(tempCanvas);
      const { extractedText, translatedText } =
        await processAndTranslateWithGemini(imageBase64, targetLanguage);

      if (extractedText && extractedText !== lastProcessedTextRef.current) {
        lastProcessedTextRef.current = extractedText;
        setExtractedText(extractedText);
        setTranslatedText(translatedText);
      }

      // Update the overlay canvas
      updateCanvas();
    } catch (error) {
      console.error("Error processing frame:", error);
    } finally {
      setIsProcessing(false);

      // Schedule next frame processing if still recording
      if (processingRef.current) {
        // Add a small delay to prevent overwhelming the API
        setTimeout(() => {
          requestAnimationFrame(processFrame);
        }, delayRef.current);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (screenStreamRef.current) {
        stopScreenCapture();
      }
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsWebcam(false);
      setIsScreenShare(false);
      setExtractedText("");
      setTranslatedText("");
      lastProcessedTextRef.current = "";
      setIsRecording(false);
      processingRef.current = false;
      setSelectionBox(null);

      // Ensure video is properly loaded before attempting to play
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch((error) => {
          console.error("Error playing video:", error);
        });
      }
    }
  };

  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load before playing
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        await videoRef.current.play();
      }
      setIsWebcam(false);
      setIsScreenShare(true);
      setVideoSrc("");

      // Handle stream stop
      stream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.error("Error starting screen capture:", err);
    }
  };

  const stopScreenCapture = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsScreenShare(false);
    setIsWebcam(true);
  };

  // Clean up screen capture on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
      lastProcessedTextRef.current = "";
      setSelectionBox(null);
    }
  };

  // Update the selection box display in the video container
  const getDisplayCoordinates = (
    selectionBox: SelectionBox
  ): DisplayCoordinates => {
    const videoElement = isWebcam ? webcamRef.current?.video : videoRef.current;
    if (!videoElement)
      return {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };

    const videoRect = videoElement.getBoundingClientRect();
    const scaleX = videoRect.width / videoElement.videoWidth;
    const scaleY = videoRect.height / videoElement.videoHeight;

    return {
      left: selectionBox.x * scaleX,
      top: selectionBox.y * scaleY,
      width: selectionBox.width * scaleX,
      height: selectionBox.height * scaleY,
    };
  };

  // Function to render text on canvas
  const renderTextToCanvas = (text: string) => {
    const canvas = textCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Increase canvas height for more text
    canvas.width = 400;
    canvas.height = 200; // Increased from 100 to 200

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configure text style
    ctx.fillStyle = "white";
    ctx.font = "18px Arial"; // Slightly smaller font
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw text with word wrapping
    const maxWidth = canvas.width - 40; // Leave some margin
    const lineHeight = 24;
    const words = text.split(" ");
    let line = "";
    let y = 40; // Start a bit lower to center text better

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = words[i] + " ";
        y += lineHeight;

        // If we've exceeded the canvas height, we need to stop
        if (y > canvas.height - 20) break;
      } else {
        line = testLine;
      }
    }

    // Draw the last line
    if (line.trim() !== "") {
      ctx.fillText(line, canvas.width / 2, y);
    }
  };

  // Function to start PiP
  const startPiP = async () => {
    const canvas = textCanvasRef.current;
    const pipVideo = pipVideoRef.current;

    if (!canvas || !pipVideo) return;

    try {
      // Create a stream from the canvas
      const stream = canvas.captureStream();

      // Make sure any previous srcObject is properly cleaned up
      if (pipVideo.srcObject) {
        const oldStream = pipVideo.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }

      // Reset the video element
      pipVideo.pause();
      pipVideo.srcObject = null;

      // Set the new stream and wait for metadata to load
      pipVideo.srcObject = stream;

      // Wait for metadata to load
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          pipVideo.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };

        pipVideo.addEventListener("loadedmetadata", onLoadedMetadata);

        // Handle the case where metadata is already loaded
        if (pipVideo.readyState >= 2) {
          resolve();
        }
      });

      // Only then try to play
      await pipVideo.play();

      // Finally request PiP
      await pipVideo.requestPictureInPicture();
      setIsPiPActive(true);
    } catch (error) {
      console.error("Error starting PiP:", error);
      // Reset PiP state if it fails
      setIsPiPActive(false);
    }
  };

  // Update PiP when translation changes
  useEffect(() => {
    if (translatedText) {
      renderTextToCanvas(translatedText);
    }
  }, [translatedText]);

  // Handle PiP mode changes
  useEffect(() => {
    const pipVideo = pipVideoRef.current;
    if (!pipVideo) return;

    const handlePiPChange = () => {
      setIsPiPActive(document.pictureInPictureElement === pipVideo);
    };

    pipVideo.addEventListener("enterpictureinpicture", handlePiPChange);
    pipVideo.addEventListener("leavepictureinpicture", handlePiPChange);

    return () => {
      pipVideo.removeEventListener("enterpictureinpicture", handlePiPChange);
      pipVideo.removeEventListener("leavepictureinpicture", handlePiPChange);
    };
  }, []);

  // Clean up all media resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up screen capture
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      // Clean up PiP video
      if (pipVideoRef.current) {
        if (pipVideoRef.current.srcObject) {
          const stream = pipVideoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
        pipVideoRef.current.srcObject = null;

        // Exit PiP if active
        if (document.pictureInPictureElement === pipVideoRef.current) {
          document
            .exitPictureInPicture()
            .catch((err) => console.error("Error exiting PiP:", err));
        }
      }

      // Clean up video sources
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.srcObject = null;
        videoRef.current.load();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            // First stop any ongoing recordings
            setIsRecording(false);
            processingRef.current = false;

            // Then clean up resources
            if (screenStreamRef.current) {
              stopScreenCapture();
            }

            // Finally switch to webcam
            setIsWebcam(true);
            setVideoSrc("");
            setExtractedText("");
            setTranslatedText("");
            lastProcessedTextRef.current = "";
            clearSelection();
          }}
          className={`px-4 py-2 rounded ${
            isWebcam ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Use Webcam
        </button>
        <button
          onClick={startScreenCapture}
          className={`px-4 py-2 rounded ${
            isScreenShare
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Share Screen
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
        {selectionBox && !isRecording && (
          <button
            onClick={clearSelection}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Clear Selection
          </button>
        )}
        {!isPiPActive && (
          <button
            onClick={startPiP}
            className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600"
          >
            Show Translation in PiP
          </button>
        )}
      </div>

      <div className="relative w-full">
        <div
          ref={containerRef}
          className="relative w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isWebcam ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: "user",
              }}
              className="rounded-lg w-full"
              onUserMedia={() => console.log("Webcam access granted")}
              onUserMediaError={(error) =>
                console.error("Webcam error:", error)
              }
            />
          ) : (
            <video
              ref={videoRef}
              src={videoSrc}
              className="rounded-lg w-full"
              controls={!isScreenShare}
              autoPlay={false}
              playsInline
              onPlay={() => {
                updateCanvas();
                console.log("Video playing");
              }}
              onPause={() => console.log("Video paused")}
              onError={(e) => console.error("Video error:", e)}
              onLoadedMetadata={() => {
                console.log("Video metadata loaded");
                if (isScreenShare && videoRef.current) {
                  // Add a small delay before trying to play
                  setTimeout(() => {
                    videoRef.current?.play().catch((error) => {
                      console.error("Error playing screen share:", error);
                    });
                  }, 100);
                }
              }}
            />
          )}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ display: "block", objectFit: "contain" }}
          />
          {selectionBox && (
            <div
              className="absolute border border-dashed border-white bg-opacity-30"
              style={{
                ...getDisplayCoordinates(selectionBox),
                pointerEvents: isRecording ? "none" : "auto",
                boxShadow: "0 0 0 1px black",
              }}
            />
          )}
          <button
            onClick={toggleRecording}
            disabled={!selectionBox}
            className={`absolute top-4 right-4 px-4 py-2 rounded ${
              !selectionBox
                ? "bg-gray-500 cursor-not-allowed"
                : isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {isRecording ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      {/* Hidden elements for PiP */}
      <canvas ref={textCanvasRef} className="hidden" width="400" height="100" />
      <video ref={pipVideoRef} className="hidden" playsInline muted />

      <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg max-h-60 overflow-auto">
        {translatedText ? (
          <p className="text-lg font-medium whitespace-pre-wrap">
            {translatedText}
          </p>
        ) : (
          <p className="text-lg font-medium text-gray-400">
            Translation will appear here
          </p>
        )}
        {extractedText && (
          <p className="text-sm opacity-75 mt-1 whitespace-pre-wrap">
            {extractedText}
          </p>
        )}
      </div>
    </div>
  );
};

export default VideoTranslator;
