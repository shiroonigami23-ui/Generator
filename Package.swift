// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Generator",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "GeneratorCore",
            targets: ["GeneratorCore"]
        ),
        .executable(
            name: "generator",
            targets: ["GeneratorCLI"]
        )
    ],
    targets: [
        .target(
            name: "GeneratorCore"
        ),
        .executableTarget(
            name: "GeneratorCLI",
            dependencies: ["GeneratorCore"]
        ),
        .testTarget(
            name: "GeneratorCoreTests",
            dependencies: ["GeneratorCore"]
        )
    ]
)
