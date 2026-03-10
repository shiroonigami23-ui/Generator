# Generator (Swift)

Generator is a Swift-native toolkit for producing secure random outputs from the command line.

## Features
- Password generation with configurable length and character sets
- Token generation in `hex` or `base64`
- Human-readable passphrase generation
- Entropy and strength rating for generated passwords

## Tech Stack
- Swift Package Manager
- `GeneratorCore` library target
- `generator` CLI executable target
- XCTest test suite

## Project Layout
- `Package.swift`
- `Sources/GeneratorCore/` - core generation logic
- `Sources/GeneratorCLI/` - command-line entrypoint
- `Tests/GeneratorCoreTests/` - automated tests
- `scripts/package.ps1` - source packaging script
- `.github/workflows/` - CI and release automation

## CLI Usage
```bash
generator password --length 24 --no-symbols
generator token --bytes 32 --format base64
generator passphrase --words 5 --separator -
```

## Build
```bash
swift build -c release
```

## Test
```bash
swift test
```

## Package
```powershell
./scripts/package.ps1
```
Creates `dist/generator-source-v1.0.0.zip`.

## Security Note
Generation uses Swift's system random APIs and does not depend on browser-side randomness.
