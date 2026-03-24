import Foundation
import GeneratorCore

struct CLI {
    private let generator = SecretGenerator()

    func run(args: [String]) -> Int32 {
        guard args.count > 1 else {
            printHelp()
            return 1
        }

        let command = args[1].lowercased()
        let options = Array(args.dropFirst(2))

        switch command {
        case "password":
            return runPassword(options: options)
        case "token":
            return runToken(options: options)
        case "passphrase":
            return runPassphrase(options: options)
        case "help", "--help", "-h":
            printHelp()
            return 0
        default:
            fputs("Unknown command: \(command)\n", stderr)
            printHelp()
            return 2
        }
    }

    private func runPassword(options: [String]) -> Int32 {
        let length = intValue(of: "--length", in: options) ?? 16
        let upper = options.contains("--upper") || !options.contains("--no-upper")
        let lower = options.contains("--lower") || !options.contains("--no-lower")
        let digits = options.contains("--digits") || !options.contains("--no-digits")
        let symbols = options.contains("--symbols") || !options.contains("--no-symbols")

        let profile = GenerationProfile(
            length: length,
            useUppercase: upper,
            useLowercase: lower,
            useDigits: digits,
            useSymbols: symbols
        )

        let secret = generator.generatePassword(profile: profile)
        print(secret.value)
        print("entropy_bits=\(String(format: "%.2f", secret.entropyBits))")
        print("strength=\(secret.strength.rawValue)")
        return 0
    }

    private func runToken(options: [String]) -> Int32 {
        let bytes = intValue(of: "--bytes", in: options) ?? 32
        let format = stringValue(of: "--format", in: options)?.lowercased() ?? "hex"

        switch format {
        case "hex":
            print(generator.generateHexToken(byteCount: bytes))
            return 0
        case "base64":
            print(generator.generateBase64Token(byteCount: bytes))
            return 0
        default:
            fputs("Invalid token format. Use hex or base64.\n", stderr)
            return 2
        }
    }

    private func runPassphrase(options: [String]) -> Int32 {
        let words = intValue(of: "--words", in: options) ?? 4
        let sep = stringValue(of: "--separator", in: options) ?? "-"
        print(generator.generatePassphrase(wordCount: words, separator: sep))
        return 0
    }

    private func intValue(of key: String, in options: [String]) -> Int? {
        guard let i = options.firstIndex(of: key), i + 1 < options.count else { return nil }
        return Int(options[i + 1])
    }

    private func stringValue(of key: String, in options: [String]) -> String? {
        guard let i = options.firstIndex(of: key), i + 1 < options.count else { return nil }
        return options[i + 1]
    }

    private func printHelp() {
        let help = """
        Generator CLI (Swift)

        Usage:
          generator password [--length N] [--no-upper] [--no-lower] [--no-digits] [--no-symbols]
          generator token [--bytes N] [--format hex|base64]
          generator passphrase [--words N] [--separator SEP]

        Examples:
          generator password --length 24 --symbols
          generator token --bytes 32 --format base64
          generator passphrase --words 5 --separator -
        """
        print(help)
    }
}

let cli = CLI()
exit(cli.run(args: CommandLine.arguments))
