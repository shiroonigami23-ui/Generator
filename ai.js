// Configuration for the Gemini API
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const API_KEY = ""; // Canvas environment handles the key

/**
 * Handles exponential backoff for API calls.
 * @param {string} apiUrl - The API endpoint URL.
 * @param {object} payload - The request body payload.
 * @param {number} retries - Maximum number of retries.
 */
async function fetchWithExponentialBackoff(apiUrl, payload, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429 && i < retries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.log(`Rate limit exceeded. Retrying in ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed with status ${response.status}: ${errorText}`);
            }

            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.error("Fetch attempt failed:", error.message);
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Generates or edits LaTeX code using the Gemini API.
 * @param {string} userPrompt - The user's command (or template prompt).
 * @param {string} currentLatex - The full current LaTeX code from the editor.
 * @returns {Promise<string>} - The cleaned, new LaTeX code string.
 */
export async function generateLatexWithAI(userPrompt, currentLatex) {
    // Highly detailed system prompt to enforce strict LaTeX output rules
    const systemPrompt = `You are the LaTeX Master, a world-class code generation AI. Your task is to respond to user requests by outputting ONLY the complete, valid, and clean LaTeX code.

**STRICT RULES:**
1.  **Output Format:** Your response MUST be ONLY the full LaTeX code string, starting with \\documentclass and ending with \\end{document}.
2.  **NEVER** include any conversational text, explanations, or markdown fences (like \`\`\`latex or \`\`\`).
3.  **Use Best Practices:** Always include standard packages like \`inputenc\`, \`fontenc\`, \`amsmath\`, and \`booktabs\` in the preamble.
4.  **Figures/Images:** If the user requests a diagram or image, you MUST use the \`figure\` environment with a \`\framebox\` placeholder instead of \`\includegraphics\`, as external files are unavailable. Example: \`\begin{figure}[h]\n  \centering\n  \framebox{\parbox{0.8\textwidth}{\centering\n    \\vspace{2cm}Image Placeholder: [Image Description]\\vspace{2cm}}}\n  \caption{[Caption Text]}\\label{fig:example}\n\end{figure}\`
5.  **Tables:** Use the \`booktabs\` package for professional, clean table lines (\`\toprule\`, \`\midrule\`, \`\bottomrule\`).

**Current Document Content (for context and editing):**
---
${currentLatex}
---

**User Request:** ${userPrompt}`;

    const userQuery = `Process the user request and generate/edit the full LaTeX document.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ "google_search": {} }], // Enable grounding for current context/information
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const response = await fetchWithExponentialBackoff(apiUrl, payload);
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("AI failed to generate content or the response was empty.");
    }

    // Aggressively clean up the output in case the model added markdown fences or conversational text
    // The regex removes common markdown wrappers and anything before \documentclass or after \end{document}
    const cleanedLatex = text
        .replace(/```latex|```/gs, '')
        .trim()
        // Ensure it starts exactly with \documentclass (or close to it) and ends with \end{document}
        .match(/(\\documentclass[\s\S]*?\\end\{document\})/i)?.[1] || text;

    return cleanedLatex.trim();
}