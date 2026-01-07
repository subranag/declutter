#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== declutter Release Script ===${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo "Install it from: https://bun.sh"
    exit 1
fi

# Prompt for version
echo -e "${YELLOW}Enter the version for this release (e.g., 1.0.0, 0.1.0):${NC}"
read -p "> " VERSION

# Validate version format (basic semantic versioning)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    echo -e "${RED}Error: Invalid version format. Please use semantic versioning (e.g., 1.0.0)${NC}"
    exit 1
fi

# Check if release tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}Error: Release tag v$VERSION already exists${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Building project for all platforms...${NC}\n"

# Build the project
bun run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ Build completed successfully${NC}\n"

# List built binaries
echo -e "${YELLOW}Built binaries:${NC}"
ls -lh dist/ | grep -E '^-' | awk '{print "  - " $9 " (" $5 ")"}'

# Code sign macOS binaries
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "\n${YELLOW}Code signing macOS binaries...${NC}\n"

    # Check if codesign is available
    if ! command -v codesign &> /dev/null; then
        echo -e "${RED}Warning: codesign command not found. Skipping code signing.${NC}"
    else
        # List available signing identities
        IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep -oP '^\s*\K[^\s]+(?=\s)' | head -n 1)

        if [ -z "$IDENTITIES" ]; then
            echo -e "${YELLOW}No code signing certificates found. Using ad-hoc signing...${NC}"
            # Ad-hoc signing (works locally, not for distribution)
            codesign -s - --force --preserve-metadata=entitlements,requirements,flags,runtime dist/declutter-macos-x64
            codesign -s - --force --preserve-metadata=entitlements,requirements,flags,runtime dist/declutter-macos-arm64
        else
            echo -e "${YELLOW}Found code signing identity. Signing binaries...${NC}"
            codesign -s "$IDENTITIES" --force --preserve-metadata=entitlements,requirements,flags,runtime dist/declutter-macos-x64
            codesign -s "$IDENTITIES" --force --preserve-metadata=entitlements,requirements,flags,runtime dist/declutter-macos-arm64
        fi

        # Verify signatures
        echo -e "\n${YELLOW}Verifying code signatures...${NC}"
        codesign -v dist/declutter-macos-x64 && echo -e "${GREEN}✓ Signed: declutter-macos-x64${NC}" || echo -e "${RED}✗ Failed: declutter-macos-x64${NC}"
        codesign -v dist/declutter-macos-arm64 && echo -e "${GREEN}✓ Signed: declutter-macos-arm64${NC}" || echo -e "${RED}✗ Failed: declutter-macos-arm64${NC}"
    fi
else
    echo -e "${YELLOW}Not running on macOS. Skipping code signing.${NC}"
fi

# Create the release
echo -e "\n${YELLOW}Creating GitHub release v$VERSION...${NC}\n"

gh release create "v$VERSION" \
    --title "declutter v$VERSION" \
    --notes "Release v$VERSION of declutter" \
    dist/declutter-windows-x64.exe \
    dist/declutter-macos-x64 \
    dist/declutter-macos-arm64 \
    dist/declutter-linux-x64 \
    dist/declutter-linux-arm64

echo -e "\n${GREEN}✓ Release created successfully!${NC}"
echo -e "${GREEN}✓ Release page: https://github.com/$(gh repo view --json nameWithOwner -q)/releases/tag/v$VERSION${NC}\n"
