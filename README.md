# Screenshot Knowledge Base (SKB)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0+-orange.svg)](https://pnpm.io/)

Local-first, privacy-respecting screenshot search and organization system built with modern web technologies.

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **OCR Processing**: Extract text from screenshots using Tesseract.js for searchable content
- **Full-Text Search**: Fast keyword search across all screenshots using SQLite FTS5
- **File Import**: Drag & drop upload and automatic folder watching for new screenshots
- **Gallery UI**: Clean, responsive Next.js web interface with search, filters, and thumbnails
- **Desktop App**: Native Electron application for seamless desktop integration
- **Local-First**: No cloud dependencies - all data stored locally on your device
- **Privacy-Focused**: All processing happens locally, no data sent to external services
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Extensible**: Modular architecture with separate packages for easy customization

## Screenshots

*Coming soon - screenshots of the web interface and desktop app will be added here.*

## Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **Tesseract OCR** - Required for text extraction from images

#### Installing Tesseract

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract tesseract-lang

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH after installation
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd screenshot-knowledge-base

# Install dependencies
pnpm install

# Optional: Install additional Tesseract language packs
tesseract --list-langs
```

### Development

Start all services simultaneously:

```bash
pnpm dev
```

This will start:
- **API Server** on http://localhost:5656
- **Web UI** on http://localhost:3000
- **Electron Desktop App**

### Individual Services

```bash
# Start only the server
pnpm --filter @skb/server dev

# Start only the web app
pnpm --filter @skb/web dev

# Start only the desktop app
pnpm --filter @skb/desktop dev
```

## Usage

1. **Import Screenshots**: Use the web UI to upload files or configure folder watching
2. **Search**: Type keywords to find screenshots by their extracted text content
3. **Browse**: View your screenshot gallery with thumbnails, metadata, and filters
4. **Organize**: Use tags and metadata to categorize your screenshots

### Folder Watching

Configure automatic import from directories:

```bash
# Via API
curl -X POST http://localhost:5656/api/import/folder \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/screenshots/folder"}'
```

## API Documentation

The SKB server provides a REST API for programmatic access.

### Base URL
```
http://localhost:5656/api
```

### Endpoints

#### Import Screenshot
```http
POST /api/import
```

Upload a single screenshot file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response:**
```json
{
  "success": true,
  "screenshotId": "1640995200000"
}
```

#### Search Screenshots
```http
GET /api/screenshots
```

Search and retrieve screenshots with optional filters.

**Query Parameters:**
- `q` (string): Search query for full-text search
- `tag` (string): Filter by tag
- `from` (number): Start date timestamp
- `to` (number): End date timestamp
- `limit` (number): Maximum results (default: 50)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "screenshots": [
    {
      "id": "1640995200000",
      "filePath": "/path/to/image.png",
      "createdAt": 1640995200000,
      "width": 1920,
      "height": 1080,
      "sourceApp": "Screenshot App",
      "mime": "image/png",
      "ocrConfidence": 0.95
    }
  ],
  "total": 1
}
```

#### Get Screenshot Details
```http
GET /api/screenshots/{id}
```

Retrieve details for a specific screenshot.

**Response:**
```json
{
  "id": "1640995200000",
  "filePath": "/path/to/image.png",
  "fileHash": "abc123...",
  "createdAt": 1640995200000,
  "importedAt": 1640995200000,
  "width": 1920,
  "height": 1080,
  "sourceApp": "Screenshot App",
  "mime": "image/png",
  "ocrConfidence": 0.95
}
```

#### Watch Folder
```http
POST /api/import/folder
```

Configure automatic import from a directory.

**Request:**
```json
{
  "path": "/path/to/watch/folder"
}
```

**Response:**
```json
{
  "success": true
}
```

## Architecture

```
apps/
├── web/          # Next.js frontend with React
└── desktop/      # Electron wrapper for native desktop app

packages/
├── common/       # Shared TypeScript types, utilities, and configuration
├── db/           # SQLite database layer with migrations
├── ocr/          # Tesseract OCR wrapper and text extraction
├── search/       # Full-text search utilities using SQLite FTS5
└── server/       # Express.js API server with file upload and CORS
```

### Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite with FTS5 for full-text search
- **OCR**: Tesseract.js for client-side text extraction
- **Desktop**: Electron for cross-platform desktop app
- **Build Tool**: pnpm for efficient monorepo management
- **Testing**: Jest for unit and integration tests

## Configuration

Configure SKB using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SKB_DB_PATH` | Database file location | `~/.skb/database.db` |
| `SKB_IMAGES_PATH` | Images storage directory | `~/.skb/images` |
| `SKB_PORT` | API server port | `5656` |
| `SKB_LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` |
| `SKB_ENCRYPTION` | Enable SQLCipher encryption | `false` |
| `SKB_ENCRYPTION_KEY` | Encryption key for SQLCipher | - |

Create a `.env` file in the project root:

```bash
SKB_DB_PATH=./data/database.db
SKB_IMAGES_PATH=./data/images
SKB_PORT=5656
SKB_LOG_LEVEL=info
```

## Building for Production

```bash
# Build all packages
pnpm build

# Build desktop app for distribution
pnpm --filter @skb/desktop build:electron

# Start production server
pnpm --filter @skb/server start
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @skb/common test
pnpm --filter @skb/server test

# Run tests with coverage
pnpm test -- --coverage
```

## Security

- **Local Processing**: All OCR and data processing happens locally
- **No External Data**: No screenshots or text data is sent to external services
- **Optional Encryption**: Database can be encrypted using SQLCipher
- **Secure Defaults**: Sensible security defaults with configurable options

## Troubleshooting

### Common Issues

#### Tesseract Not Found
```
Error: Tesseract not found
```

**Solution**: Ensure Tesseract is installed and in your PATH:
```bash
# Check installation
tesseract --version

# On Windows, add Tesseract to PATH
# C:\Program Files\Tesseract-OCR
```

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5656
```

**Solution**: Change the port using environment variable:
```bash
SKB_PORT=5657 pnpm --filter @skb/server dev
```

#### Database Permission Issues
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution**: Check file permissions and ensure the directory exists:
```bash
mkdir -p ~/.skb
chmod 755 ~/.skb
```

#### OCR Quality Issues
If OCR results are poor:
- Ensure good image quality and resolution
- Check that the correct language pack is installed
- Try different image preprocessing if needed

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page for known problems
- Create a new issue with detailed information about your setup and error logs

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with proper TypeScript types and tests
4. **Test** your changes: `pnpm test`
5. **Lint** your code: `pnpm lint`
6. **Commit** with clear messages: `git commit -m "Add: your feature description"`
7. **Push** to your branch: `git push origin feature/your-feature-name`
8. **Create** a Pull Request with detailed description

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Screenshot Knowledge Base