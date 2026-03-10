import XCTest
@testable import GeneratorCore

final class GeneratorCoreTests: XCTestCase {
    func testPasswordLengthAndStrength() {
        let gen = SecretGenerator()
        let profile = GenerationProfile(length: 20, useUppercase: true, useLowercase: true, useDigits: true, useSymbols: false)
        let secret = gen.generatePassword(profile: profile)

        XCTAssertEqual(secret.value.count, 20)
        XCTAssertTrue(secret.entropyBits > 0)
    }

    func testHexTokenLength() {
        let gen = SecretGenerator()
        let token = gen.generateHexToken(byteCount: 32)
        XCTAssertEqual(token.count, 64)
    }

    func testPassphraseWordCount() {
        let gen = SecretGenerator()
        let phrase = gen.generatePassphrase(wordCount: 4, separator: "-")
        XCTAssertEqual(phrase.split(separator: "-").count, 4)
    }
}
