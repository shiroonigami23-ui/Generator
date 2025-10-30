// --- Modal Elements ---
const modal = document.getElementById('statusModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalInputContainer = document.getElementById('modalInputContainer');
const modalInput = document.getElementById('modalInput');
const modalContent = document.getElementById('modalContent');

/**
 * Utility to display status/confirmation messages in a custom modal.
 * @param {string} title - Modal title.
 * @param {string} message - Modal body message.
 * @param {boolean} [isError=false] - Whether to show red/error styling.
 * @param {boolean} [isConfirmation=false] - Whether to show a confirm button.
 * @param {boolean} [isInput=false] - Whether to show a text input field.
 * @returns {Promise<string|boolean>} Resolves with input value (if input) or true (if confirmed), or false (if closed.
 */
export function showStatusModal(title, message, isError = false, isConfirmation = false, isInput = false) {
    return new Promise(resolve => {
        // Reset state
        modalInputContainer.classList.add('hidden');
        modalConfirmBtn.classList.add('hidden');
        modalConfirmBtn.onclick = null;
        modalCloseBtn.onclick = null;
        modalInput.value = '';

        // Set content
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Apply styling
        modalContent.classList.remove('border-blue-500', 'border-red-500');
        modalContent.classList.add(isError ? 'border-red-500' : 'border-blue-500');

        if (isConfirmation) {
            modalConfirmBtn.textContent = isInput ? 'Save' : 'Confirm';
            modalConfirmBtn.classList.remove('hidden');
            modalConfirmBtn.onclick = () => {
                modal.classList.add('hidden');
                resolve(isInput ? modalInput.value.trim() : true);
            };
        }

        if (isInput) {
            modalInputContainer.classList.remove('hidden');
            modalInput.focus();
        }

        modalCloseBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(false);
        };

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

/**
 * SIMULATED: Sends LaTeX code to an external compilation API (like Overleaf) 
 * and handles the PDF download flow immediately.
 * @param {string} latexContent - The LaTeX code to compile.
 */
export async function exportPDFToCompiler(latexContent) {
    const COMPILER_API_URL = "https://compiler-api.overleaf-like.com/compile"; // Hypothetical endpoint
    const API_KEY = "YOUR_OVERLEAF_API_KEY_HERE"; // Placeholder for a real API key

    await showStatusModal(
        "Compiling Document...", 
        "Sending document to the external LaTeX compiler (simulated). This process usually takes 2-5 seconds for complex files.", 
        false, 
        false, 
        false
    );

    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    
    // Set UI to loading state
    exportBtn.disabled = true;
    exportBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Compiling`;
    
    // Simulate API call and latency (to match the "seconds" requirement)
    try {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds compilation time

        // --- Simulated API Response ---
        // In a real scenario, this would be a fetch call:
        /*
        const response = await fetch(COMPILER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ source: latexContent, format: 'pdf' })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Compilation failed on server.");
        }
        const result = await response.json(); // Assuming the response contains a PDF URL
        const pdfUrl = result.pdfUrl;
        */
        
        // Use a placeholder URL for the compiled PDF
        const pdfUrl = "https://placehold.co/600x400/1e40af/ffffff?text=Compiled+PDF+Ready";
        
        // Open the PDF in a new tab for immediate viewing/download
        window.open(pdfUrl, '_blank');

        showStatusModal("Export Successful", "Document compiled successfully! Your PDF is opening in a new tab.", false);

    } catch (error) {
        console.error("Compilation Failed:", error);
        // Assuming we could parse a detailed error from a real API response
        const errorMessage = error.message.includes("Compilation failed") 
            ? "Compilation failed. Check your LaTeX syntax for errors (e.g., missing brackets, undefined commands)."
            : `An unknown error occurred: ${error.message}`;
            
        showStatusModal("Compilation Error", errorMessage, true);

    } finally {
        // Reset UI state
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
        modal.classList.add('hidden'); // Hide the modal if the download was successful
    }
}


/**
 * Simple parser to convert LaTeX syntax into styled HTML for the live preview.
 * NOTE: This is a simulation and cannot render complex packages like tikz or pgfplots.
 * @param {string} latex - Raw LaTeX content.
 * @returns {string} - Styled HTML string.
 */
export function simpleLatexToHtml(latex) {
    // 1. Extract content between \begin{document} and \end{document}
    let html = "<p class='text-center text-red-500'>Error: \\begin{document} or \\end{document} not found.</p>";
    let contentMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
    if (contentMatch && contentMatch[1]) {
        html = contentMatch[1];
    } else {
        return html;
    }

    // 2. Extract and format Title Block
    const titleMatch = latex.match(/\\title\{(.*?)\}/i);
    const authorMatch = latex.match(/\\author\{(.*?)\}/i);
    const dateMatch = latex.match(/\\date\{(.*?)\}/i);
    let titleBlock = '';

    if (titleMatch) titleBlock += `<h1>${titleMatch[1]}</h1>`;
    if (authorMatch) titleBlock += `<p class="text-center mb-1 text-gray-500">By: ${authorMatch[1]}</p>`;
    if (dateMatch) titleBlock += `<p class="text-center text-sm mb-6 text-gray-400">${dateMatch[1]}</p>`;

    // Remove \maketitle command from body
    html = html.replace(/\\maketitle/g, '');


    // 3. Structural elements
    html = html.replace(/\\section\{(.*?)\}/g, '<h3>$1</h3>');
    html = html.replace(/\\subsection\{(.*?)\}/g, '<h4>$1</h4>');
    html = html.replace(/\\textbf\{(.*?)\}/g, '<strong>$1</strong>');
    html = html.replace(/\\textit\{(.*?)\}/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');

    // 4. Mathematics: Equations and inline math
    html = html.replace(/\$([^\$]+)\$/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>'); // Inline math
    html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (match, equation) => {
        return `<span class="math-block">${equation.trim().replace(/\\ /g, '')}</span>`;
    });

    // 5. Lists
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, listContent) => {
        const items = listContent.split('\\item').slice(1).map(item =>
            `<li class="list-disc ml-6">${item.trim().replace(/<br>/g, '')}</li>`
        ).join('');
        return `<ul class="my-2">${items}</ul>`;
    });

    // 6. Figures (using \framebox placeholder logic)
    html = html.replace(/\\begin\{figure\}([\s\S]*?)\\end\{figure\}/g, (match, figureContent) => {
        const captionMatch = figureContent.match(/\\caption\{(.*?)\}/i);
        const placeholderTextMatch = figureContent.match(/Image Placeholder: (.*?)\\vspace/i);

        const caption = captionMatch ? captionMatch[1] : 'Figure Caption Missing';
        const placeholderText = placeholderTextMatch ? placeholderTextMatch[1] : 'Image content placeholder';

        return `
            <div class="figure-placeholder">
                <p class="font-semibold text-sm mb-2">Figure Placeholder</p>
                <p class="text-xs text-gray-600">${placeholderText}</p>
            </div>
            <p class="figure-caption text-center">Figure: ${caption}</p>
        `;
    });

    // 7. Tables (handling tabular environment)
    html = html.replace(/\\begin\{tabular\}\{([cl\|]*)\}([\s\S]*?)\\end\{tabular\}/g, (match, alignment, tableContent) => {
        const rows = tableContent.trim().split('\\\\').filter(row => row.trim());
        let tableHtml = '<table>';

        rows.forEach((row, rowIndex) => {
            const rowTag = (row.includes('\\toprule') || row.includes('\\midrule')) ? 'th' : 'td';
            const cellHtml = row.split('&').map(cell => {
                // Remove commands like \toprule, \midrule, \bottomrule
                const cleanedCell = cell.replace(/\\(top|mid|bottom)rule/g, '').trim();
                return `<${rowTag}>${cleanedCell}</${rowTag}>`;
            }).join('');

            if (row.includes('\\toprule') || row.includes('\\midrule') || row.includes('\\bottomrule')) {
                // Skip rows that are just rules, but use the first data row as a header
                if (rowIndex === 0) {
                    tableHtml += `<thead><tr>${cellHtml}</tr></thead><tbody>`;
                }
            } else {
                tableHtml += `<tr>${cellHtml}</tr>`;
            }
        });

        tableHtml += '</tbody></table>';

        // Look for \caption right after the table
        const captionMatch = latex.substring(latex.indexOf(match) + match.length).match(/\\caption\{(.*?)\}/i);
        if (captionMatch) {
            tableHtml += `<caption>Table: ${captionMatch[1]}</caption>`;
        }

        return tableHtml;
    });

    // Final cleanup of extra breaks
    html = html.replace(/<br><br><br>/g, '<br><br>');

    return titleBlock + html;
}

/**
 * Updates the preview and saves the document content.
 * Needs to be exported to be accessible by app.js and window.
 */
export function updatePreview(content = document.getElementById('latexEditor').value) {
    // The actual save logic is handled by app.js when updatePreview is called
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = simpleLatexToHtml(content);
}
