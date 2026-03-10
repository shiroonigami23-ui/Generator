import Foundation

public enum StrengthEstimator {
    public static func entropyBits(length: Int, poolSize: Int) -> Double {
        guard length > 0, poolSize > 1 else { return 0 }
        return Double(length) * log2(Double(poolSize))
    }

    public static func rating(entropyBits: Double) -> StrengthRating {
        switch entropyBits {
        case ..<40: return .weak
        case 40..<60: return .medium
        case 60..<90: return .strong
        default: return .veryStrong
        }
    }
}
