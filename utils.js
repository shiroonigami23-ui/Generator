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
        modalContent.classList.remove('border-blue-500', 'border-red-500', 'border-t-4');
        const borderColor = isError ? 'border-red-500' : 'border-blue-500';
        modalContent.classList.add(borderColor, 'border-t-4');

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
 * SIMULATED: Sends LaTeX code to a dedicated backend compiler and triggers
 * an immediate PDF download, providing a seamless experience.
 * @param {string} latexContent - The LaTeX code to compile.
 * @param {string} documentTitle - The title of the current document.
 */
export async function exportPDFToCompiler(latexContent, documentTitle) {
    if (!latexContent || !latexContent.trim()) {
        showStatusModal("Export Failed", "There is no content to compile. Please add some LaTeX code first.", true);
        return;
    }
    
    // --- UI Setup for Seamless Experience ---
    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    const originalTitle = exportBtn.title;
    
    exportBtn.disabled = true;
    exportBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Compiling...`;
    
    // Show a small status modal that disappears after the process starts
    showStatusModal(
        "Compiling Document", 
        "Sending document to the high-speed compiler. This takes just a few seconds...", 
        false, 
        false, 
        false
    );
    
    // Hide modal after a brief delay so the user focuses on the button animation
    setTimeout(() => { modal.classList.add('hidden'); }, 1500); 

    // --- Simulated API Call and Download ---
    try {
        // 1. Simulate network and compilation latency (3 seconds for a seamless feel)
        await new Promise(resolve => setTimeout(resolve, 3000)); 

        // 2. Simulate PDF content generation (creates a dummy PDF blob)
        // In a real app, this would be: const pdfResponse = await fetch(COMPILER_API_URL, { ... });
        const pdfContent = "Simulated PDF Content"; 
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // 3. Trigger immediate download
        const a = document.createElement('a');
        a.href = url;
        const fileName = documentTitle.replace(/[^a-z0-9]/gi, '_') || 'document';
        a.download = `${fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 4. Update button success state
        exportBtn.innerHTML = originalText;
        exportBtn.title = 'PDF Downloaded!';

    } catch (error) {
        console.error("Compilation Failed:", error);
        showStatusModal("Compilation Error", `PDF export failed in the backend: ${error.message}`, true);
    } finally {
        // 5. Reset button state after animation is complete
        exportBtn.disabled = false;
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.title = originalTitle;
        }, 500);
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
