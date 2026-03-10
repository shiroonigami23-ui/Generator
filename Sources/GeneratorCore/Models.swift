import Foundation

public struct GeneratedSecret: Equatable {
    public let value: String
    public let entropyBits: Double
    public let strength: StrengthRating

    public init(value: String, entropyBits: Double, strength: StrengthRating) {
        self.value = value
        self.entropyBits = entropyBits
        self.strength = strength
    }
}

public enum StrengthRating: String, Equatable {
    case weak
    case medium
    case strong
    case veryStrong = "very-strong"
}
