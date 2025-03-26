# AI Translate

AI Translate is a powerful web application that provides real-time translation for both video content and speech. The application uses OpenAI's advanced models for high-quality translations.

## Features

- **Video Translation**: Translate subtitles from videos in real-time using OCR technology
- **Speech-to-Text Translation**: Convert spoken words to translated text using OpenAI's Whisper API
- **Multiple Languages**: Support for various languages
- **Real-time Processing**: Get translations as you speak or as video plays
- **Modern UI**: Clean and intuitive user interface

## Tech Stack

- **Frontend**: Next.js with TypeScript and TailwindCSS
- **OCR**: Tesseract.js for extracting text from video frames
- **Speech Recognition**: Web Audio API and MediaRecorder API
- **AI Translation**: OpenAI GPT-4 for text translation
- **Speech-to-Text**: OpenAI Whisper API

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn
- OpenAI API key

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-translate.git
cd ai-translate
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up your environment variables:

Create a `.env.local` file in the root directory based on the `.env.local.example` file:

```
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

4. Start the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How to Use

### Video Translation

1. Select the "Video Translation" tab
2. Choose between using your webcam or uploading a video
3. Select your target language
4. Click "Start Processing" to begin translating
5. The translated text will appear as an overlay on the video

### Speech Translation

1. Select the "Speech Translation" tab
2. Select your target language
3. Click "Start Recording" and speak
4. Click "Stop Recording" when you're done
5. The app will transcribe your speech and translate it to the selected language

## Project Structure

```
ai-translate/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main application page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── Header.tsx        # Application header
│   │   ├── TabSelector.tsx   # Tab navigation component
│   │   ├── VideoTranslator.tsx # Video translation component
│   │   ├── SpeechTranslator.tsx # Speech translation component
│   │   └── LanguageSelector.tsx # Language selection component
│   └── utils/
│       ├── openai.ts         # OpenAI API utilities
│       └── ocr.ts            # OCR utilities
├── public/                  # Static assets
└── .env.local.example       # Example environment variables
```

## Limitations

- Video translation requires clear, readable text in the video for OCR to work effectively
- Speech translation works best in quiet environments with clear speech
- API rate limits may apply based on your OpenAI subscription

## License

MIT

## Acknowledgements

- [OpenAI](https://openai.com/) for providing the GPT-4 and Whisper APIs
- [Next.js](https://nextjs.org/) for the React framework
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR capabilities
- [TailwindCSS](https://tailwindcss.com/) for styling
