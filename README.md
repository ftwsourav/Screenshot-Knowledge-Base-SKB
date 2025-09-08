# Screenshot Knowledge Base (SKB)

Local-first, privacy-respecting screenshot search and organization system.

## Features

- **OCR Processing**: Extract text from screenshots using Tesseract.js
- **Full-Text Search**: Fast keyword search with SQLite FTS5
- **File Import**: Drag & drop upload and folder watching
- **Gallery UI**: Clean Next.js interface with search and filters
- **Desktop App**: Electron wrapper for native experience
- **Local-First**: No cloud dependencies, all data stored locally

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Tesseract OCR (install via package manager)

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Windows
# Download from https://github.com/UB-Mannheim/tesseract/wiki
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd screenshot-knowledge-base

# Install dependencies
pnpm install

# Install Tesseract language packs (optional, English is default)
# tesseract --list-langs
```

### Development

Start all services simultaneously:

```bash
pnpm dev
```

This will start:
- API Server on http://localhost:5656
- Web UI on http://localhost:3000
- Electron Desktop App

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

1. **Import Screenshots**: Use the web UI to upload files or watch folders
2. **Search**: Type keywords to find screenshots by their text content
3. **Browse**: View gallery with thumbnails and metadata

## Architecture

```
apps/
├── web/          # Next.js frontend
└── desktop/      # Electron wrapper

packages/
├── common/       # Shared types and utilities
├── db/           # SQLite database layer
├── ocr/          # Tesseract OCR wrapper
├── search/       # FTS search utilities
└── server/       # Express API server
```

## Configuration

Environment variables:

- `SKB_DB_PATH`: Database file location (default: ~/.skb/database.db)
- `SKB_IMAGES_PATH`: Images storage directory (default: ~/.skb/images)
- `SKB_PORT`: API server port (default: 5656)
- `SKB_LOG_LEVEL`: Logging level (default: info)
- `SKB_ENCRYPTION`: Enable SQLCipher encryption (default: false)
- `SKB_ENCRYPTION_KEY`: Encryption key for SQLCipher

## Building for Production

```bash
# Build all packages
pnpm build

# Build desktop app
pnpm --filter @skb/desktop build:electron
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @skb/common test
```

## Security

- Optional SQLCipher encryption for the database
- All OCR processing happens locally
- No data is sent to external services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.