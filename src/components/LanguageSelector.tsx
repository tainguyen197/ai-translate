import React from "react";

type LanguageSelectorProps = {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
};

// Common languages to translate to
const languages = [
  { code: "English", name: "English" },
  { code: "Vietnamese", name: "Tiếng Việt" },
  { code: "Spanish", name: "Spanish" },
  { code: "French", name: "French" },
  { code: "German", name: "German" },
  { code: "Italian", name: "Italian" },
  { code: "Portuguese", name: "Portuguese" },
  { code: "Russian", name: "Russian" },
  { code: "Japanese", name: "Japanese" },
  { code: "Korean", name: "Korean" },
  { code: "Chinese", name: "Chinese" },
  { code: "Arabic", name: "Arabic" },
  { code: "Hindi", name: "Hindi" },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <label
        htmlFor="language-select"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Translate to:
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
