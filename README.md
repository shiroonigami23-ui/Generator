# ⚡ The Generator

![Status](https://img.shields.io/badge/Status-Live-success)
![Type](https://img.shields.io/badge/Type-Utility-orange)
![Security](https://img.shields.io/badge/Security-Client_Side-green)

> **A robust, client-side tool for generating secure passwords, tokens, and random data instantly.**

**The Generator** is a minimalist web application designed to help users create strong, unbreakable passwords and random strings. Unlike online tools that send data to a server, this tool runs entirely in your browser, ensuring that your generated secrets remain 100% private and secure.

---

## 🔗 Live Demo

**Generate secure keys now:**
### [🔑 Launch The Generator](https://shiroonigami23-ui.github.io/Generator/)

---

## ✨ Key Features

### 🔐 Secure Password Generation
- **Customizable Length:** Slider to adjust password length (8 to 128 characters).
- **Character Control:** Toggles for:
  - Uppercase Letters (A-Z)
  - Lowercase Letters (a-z)
  - Numbers (0-9)
  - Special Symbols (!@#$%)
- **Entropy Logic:** Uses cryptographically strong random number generation (Web Crypto API) instead of `Math.random()` for maximum security.

### 🛡️ Strength Analysis
- **Visual Strength Meter:** Real-time indicator showing if your password is Weak, Medium, or Strong.
- **Crack Time Estimation:** (Optional) Displays how long it would take a computer to brute-force the generated string.

### ⚡ User Experience
- **One-Click Copy:** Instantly copy the generated string to your clipboard.
- **History Log:** Temporarily view the last 5 generated passwords (cleared on refresh for security).
- **Dark Mode:** Sleek interface that respects your system's color preferences.

---

## 🎮 How to Use

1. **Set Preferences:** Use the checkboxes to select which characters you want to include (e.g., enable Symbols for higher security).
2. **Adjust Length:** Drag the slider to set your desired password length (recommended: 16+).
3. **Generate:** Click the **"Generate"** button (or press Spacebar).
4. **Copy:** Click the Copy icon to save it to your clipboard.
5. **Use:** Paste it into your login form or password manager.

---

## 📸 Screenshots

| Desktop View | Mobile View |
|:---:|:---:|
| *Full configuration panel* | *Responsive layout* |

---

## 💻 Local Installation

To run this tool offline or locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/shiroonigami23-ui/Generator.git](https://github.com/shiroonigami23-ui/Generator.git)
   
