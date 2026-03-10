import Foundation

public final class SecretGenerator {
    public init() {}

    public func generatePassword(profile: GenerationProfile) -> GeneratedSecret {
        let chars = profile.pool
        var rng = SystemRandomNumberGenerator()
        var output = String()
        output.reserveCapacity(profile.length)

        for _ in 0..<profile.length {
            let idx = Int.random(in: 0..<chars.count, using: &rng)
            output.append(chars[idx])
        }

        let entropy = StrengthEstimator.entropyBits(length: profile.length, poolSize: chars.count)
        let rating = StrengthEstimator.rating(entropyBits: entropy)
        return GeneratedSecret(value: output, entropyBits: entropy, strength: rating)
    }

    public func generateHexToken(byteCount: Int) -> String {
        let n = max(1, min(byteCount, 4096))
        var bytes = [UInt8](repeating: 0, count: n)
        for i in 0..<n {
            bytes[i] = UInt8.random(in: UInt8.min...UInt8.max)
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    public func generateBase64Token(byteCount: Int) -> String {
        let n = max(1, min(byteCount, 4096))
        var bytes = [UInt8](repeating: 0, count: n)
        for i in 0..<n {
            bytes[i] = UInt8.random(in: UInt8.min...UInt8.max)
        }
        return Data(bytes).base64EncodedString()
    }

    public func generatePassphrase(wordCount: Int, separator: String = "-") -> String {
        let words = BuiltinWordlist.words
        let count = max(2, min(wordCount, 20))
        var rng = SystemRandomNumberGenerator()
        var selected: [String] = []
        selected.reserveCapacity(count)

        for _ in 0..<count {
            let idx = Int.random(in: 0..<words.count, using: &rng)
            selected.append(words[idx])
        }
        return selected.joined(separator: separator)
    }
}
