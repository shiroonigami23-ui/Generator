import Foundation

public struct GenerationProfile: Equatable {
    public var length: Int
    public var useUppercase: Bool
    public var useLowercase: Bool
    public var useDigits: Bool
    public var useSymbols: Bool

    public init(
        length: Int = 16,
        useUppercase: Bool = true,
        useLowercase: Bool = true,
        useDigits: Bool = true,
        useSymbols: Bool = true
    ) {
        self.length = max(1, min(length, 512))
        self.useUppercase = useUppercase
        self.useLowercase = useLowercase
        self.useDigits = useDigits
        self.useSymbols = useSymbols
    }

    public var pool: [Character] {
        let upper = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        let lower = Array("abcdefghijklmnopqrstuvwxyz")
        let digits = Array("0123456789")
        let symbols = Array("!@#$%^&*()-_=+[]{}<>?/|~")

        var result: [Character] = []
        if useUppercase { result += upper }
        if useLowercase { result += lower }
        if useDigits { result += digits }
        if useSymbols { result += symbols }

        if result.isEmpty {
            result = lower + digits
        }
        return result
    }
}
