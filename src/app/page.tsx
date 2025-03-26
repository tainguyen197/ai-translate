"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import TabSelector from "@/components/TabSelector";
import VideoTranslator from "@/components/VideoTranslator";
import SpeechTranslator from "@/components/SpeechTranslator";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState("video");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");

  // Define tabs with icons
  const tabs = [
    {
      id: "video",
      name: "Video Translation",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "speech",
      name: "Speech Translation",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
  ];

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    setTargetLanguage(language);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Real-time AI Translation
          </h2>

          <div className="mb-6">
            <TabSelector
              tabs={tabs}
              activeTab={selectedTab}
              onTabChange={handleTabChange}
            />
          </div>

          <div className="mb-6">
            <LanguageSelector
              selectedLanguage={targetLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          <div className="mt-8">
            {selectedTab === "video" ? (
              <VideoTranslator targetLanguage={targetLanguage} />
            ) : (
              <SpeechTranslator targetLanguage={targetLanguage} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            About AI Translate
          </h2>
          <p className="text-gray-600 mb-4">
            AI Translate is a powerful application that uses OpenAI&apos;s
            advanced models to provide real-time translation. You can translate
            video subtitles using OCR technology or convert speech to translated
            text using OpenAI&apos;s Whisper API.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-medium text-blue-800 mb-2">Features:</h3>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Real-time video subtitle translation using OCR</li>
              <li>Speech-to-text translation with Whisper API</li>
              <li>Support for multiple languages</li>
              <li>High-quality translations powered by OpenAI</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
