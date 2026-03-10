param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null

$sourceZip = Join-Path $dist ("generator-source-v{0}.zip" -f $Version)
Compress-Archive -Path @("Package.swift", "Sources", "Tests", "scripts", "package", "docs", "README.md", ".gitignore") -DestinationPath $sourceZip -CompressionLevel Optimal
Write-Host "Created source package: $sourceZip"

if ($IsMacOS) {
    swift build -c release
    $artifactDir = Join-Path $root "artifacts"
    New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
    $bin = Join-Path $root ".build/release/generator"
    Copy-Item $bin (Join-Path $artifactDir "generator") -Force
    $tarPath = Join-Path $dist ("generator-macos-universal-v{0}.tar.gz" -f $Version)
    tar -czf $tarPath -C $artifactDir generator
    Write-Host "Created binary package: $tarPath"
}
