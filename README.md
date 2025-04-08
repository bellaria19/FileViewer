# File Viewer

A mobile application built with React Native and Expo that allows users to view various file types including text files, images, PDFs, and EPUBs.

## Features

- 📄 View text files (.txt)
- 🖼️ View images (.jpg, .png, etc.)
- 📑 View PDF documents
- 📚 View EPUB e-books
- 🔄 Recent files list
- 📤 Share files
- ⚙️ Cache management

## Tech Stack

- React Native
- Expo
- TypeScript
- expo-router for navigation
- expo-file-system for file operations
- expo-document-picker for selecting files
- react-native-webview for rendering PDFs and EPUBs

## Installation

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```
3. Start the development server
   ```bash
   npm start
   # or
   yarn start
   ```

## Project Structure

```
file-viewer/
├── app/                 # Expo Router app directory
│   ├── _layout.tsx      # Root layout component
│   ├── index.tsx        # Home screen (file selection)
│   ├── viewer.tsx       # File viewer screen
│   └── settings.tsx     # Settings screen
│
├── components/          # Reusable components
│   ├── Header.tsx       # Custom header component
│   ├── TextPreview.tsx  # Text file preview component
│   ├── ImagePreview.tsx # Image preview component
│   └── WebPreview.tsx   # Web-based file preview (PDF, EPUB)
│
├── utils/               # Utility functions
│   ├── fileTypes.ts     # File type utilities
│   └── fileCache.ts     # File cache management
│
└── assets/              # App assets
```

## Usage

1. Launch the app
2. Tap on "Select File" to choose a file from your device
3. The app will display the file using an appropriate viewer
4. Recent files are saved for quick access
5. Use the Settings screen to manage the app's cache

## Supported File Types

- Text files (.txt)
- Images (.jpg, .png, .gif, etc.)
- PDF documents (.pdf)
- EPUB e-books (.epub)
- HTML files (.html)

## License

MIT
