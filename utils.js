import { currentProjectId } from "./firebase.js";

// --- Modal Elements ---
const modal = document.getElementById('statusModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalInputContainer = document.getElementById('modalInputContainer');
const modalInput = document.getElementById('modalInput');
const modalContent = document.getElementById('modalContent');
const previewContainer = document.getElementById('previewContainer'); // Make sure this is globally accessible here

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
 * Executes a seamless, client-side conversion of the Live Preview HTML into a PDF.
 * Uses html2pdf.js to convert the visible HTML output.
 * @param {string} projectTitle - The title of the current project.
 */
export async function exportHTMLToPDF(projectTitle) {
    if (!previewContainer.innerHTML.trim() || previewContainer.textContent.includes('Error')) {
        showStatusModal("Export Failed", "The preview content is empty or contains an error.", true);
        return;
    }
    
    // --- UI Setup for Seamless Experience ---
    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    const fileName = (projectTitle.replace(/[^a-z0-9]/gi, '_') || 'project') + '.pdf';
    
    exportBtn.disabled = true;
    exportBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating PDF...`;
    
    showStatusModal(
        "Generating PDF", 
        "Converting the live preview into a PDF document instantly.", 
        false, 
        false, 
        false
    );
    
    // Hide modal after a brief delay
    setTimeout(() => { modal.classList.add('hidden'); }, 1500); 

    // --- HTML to PDF Conversion ---
    try {
        // We configure html2pdf to use A4 paper size and keep the original padding (margins)
        const opt = {
            margin: 0, // Margin is defined by the CSS padding of the preview container
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Use the global html2pdf object (loaded via CDN)
        await html2pdf().set(opt).from(previewContainer).save();

        // Update button success state
        exportBtn.title = 'PDF Downloaded!';

    } catch (error) {
        console.error("PDF Generation Failed:", error);
        showStatusModal("PDF Generation Error", `Conversion failed: ${error.message}`, true);
    } finally {
        // Reset button state
        exportBtn.disabled = false;
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.title = 'Export PDF';
        }, 500);
    }
}


/**
 * Simple parser to convert LaTeX syntax into styled HTML for the live preview.
 * NEW: Now handles \includegraphics{filename} by replacing it with Base64 image data.
 * @param {string} latex - Raw LaTeX content.
 * @param {Array<object>} assets - List of assets { name, data (Base64) }.
 * @returns {string} - Styled HTML string.
 */
export function simpleLatexToHtml(latex, assets = []) {
    // Convert asset array to a map for quick filename lookup
    const assetMap = new Map();
    assets.forEach(asset => assetMap.set(asset.name, asset.data));

    // 1. Extract content between \begin{document} and \end{document}
    let html = "<p class='text-center text-red-500'>Error: \\begin{document} or \\end{document} not found.</p>";
    let contentMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
    if (contentMatch && contentMatch[1]) {
        html = contentMatch[1];
    } else {
        return html;
    }

    // 2. Extract and format Title Block (Same as before)
    const titleMatch = latex.match(/\\title\{(.*?)\}/i);
    const authorMatch = latex.match(/\\author\{(.*?)\}/i);
    const dateMatch = latex.match(/\\date\{(.*?)\}/i);
    let titleBlock = '';

    if (titleMatch) titleBlock += `<h1>${titleMatch[1]}</h1>`;
    if (authorMatch) titleBlock += `<p class="text-center mb-1 text-gray-500">By: ${authorMatch[1]}</p>`;
    if (dateMatch) titleBlock += `<p class="text-center text-sm mb-6 text-gray-400">${dateMatch[1]}</p>`;

    // Remove \maketitle command from body
    html = html.replace(/\\maketitle/g, '');


    // 3. Structural elements (Same as before)
    html = html.replace(/\\section\{(.*?)\}/g, '<h3>$1</h3>');
    html = html.replace(/\\subsection\{(.*?)\}/g, '<h4>$1</h4>');
    html = html.replace(/\\textbf\{(.*?)\}/g, '<strong>$1</strong>');
    html = html.replace(/\\textit\{(.*?)\}/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');

    // 4. Mathematics: Equations and inline math (Same as before)
    html = html.replace(/\$([^\$]+)\$/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>'); // Inline math
    html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (match, equation) => {
        return `<span class="math-block">${equation.trim().replace(/\\ /g, '')}</span>`;
    });

    // 5. Lists (Same as before)
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, listContent) => {
        const items = listContent.split('\\item').slice(1).map(item =>
            `<li class="list-disc ml-6">${item.trim().replace(/<br>/g, '')}</li>`
        ).join('');
        return `<ul class="my-2">${items}</ul>`;
    });

    // 6. Figures and Images (UPDATED: Handle \includegraphics)
    // The regex matches \includegraphics followed by optional parameters in [...] and the mandatory filename in {}
    html = html.replace(/\\begin\{figure\}([\s\S]*?)\\end\{figure\}/g, (match, figureContent) => {
        const captionMatch = figureContent.match(/\\caption\{(.*?)\}/i);
        const includeGraphicsMatch = figureContent.match(/\\includegraphics\[.*?\]\{(.*?)\}/i) || figureContent.match(/\\includegraphics\{(.*?)\}/i);
        
        const caption = captionMatch ? captionMatch[1] : 'Figure Caption Missing';
        let imageHtml = '';

        if (includeGraphicsMatch) {
            const fileName = includeGraphicsMatch[1];
            const base64Data = assetMap.get(fileName);

            if (base64Data) {
                // Replace with actual Base64 image
                imageHtml = `<img src="${base64Data}" alt="Figure: ${caption}" class="asset-image" />`;
            } else {
                // Image not found in assets list
                imageHtml = `
                    <div class="image-not-found">
                        [IMAGE NOT FOUND: ${fileName}]<br>
                        <span class="text-xs font-normal">Please import this asset or update the LaTeX command.</span>
                    </div>`;
            }
        } else {
            // No \includegraphics found, use a generic placeholder
            imageHtml = `
                <div class="figure-placeholder">
                    <p class="font-semibold text-sm mb-2">Figure Placeholder</p>
                    <p class="text-xs text-gray-600">No \\includegraphics command found.</p>
                </div>`;
        }

        return `
            <div class="my-4">
                ${imageHtml}
                <p class="figure-caption text-center">Figure: ${caption}</p>
            </div>
        `;
    });


    // 7. Tables (Same as before)
    // NOTE: This table parsing is still basic and doesn't handle complex alignment/booktabs rules perfectly in HTML
    html = html.replace(/\\begin\{tabular\}\{([cl\|]*)\}([\s\S]*?)\\end\{tabular\}/g, (match, alignment, tableContent) => {
        const rows = tableContent.trim().split('\\\\').filter(row => row.trim());
        let tableHtml = '<table>';

        // Simplified logic: treat the first non-rule row as header
        let inHeader = true;

        rows.forEach((row) => {
            // Remove rules and newlines
            if (row.includes('\\toprule') || row.includes('\\midrule') || row.includes('\\bottomrule') || row.trim() === '') {
                return; 
            }
            
            const rowTag = inHeader ? 'th' : 'td';
            const cellHtml = row.split('&').map(cell => {
                const cleanedCell = cell.replace(/\\(top|mid|bottom)rule/g, '').trim();
                return `<${rowTag}>${cleanedCell}</${rowTag}>`;
            }).join('');

            if (inHeader) {
                tableHtml += `<thead><tr>${cellHtml}</tr></thead><tbody>`;
                inHeader = false; // Switch to body after the first row
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
 * Updates the preview and saves the project content.
 * Needs to be exported to be accessible by app.js and window.
 * @param {string} content - The LaTeX content.
 * @param {Array<object>} assets - The list of project assets.
 */
export function updatePreview(content, assets = []) {
    // The actual save logic is handled by app.js when updatePreview is called
    // Ensure content and assets are passed to the HTML parser
    previewContainer.innerHTML = simpleLatexToHtml(content, assets);
}
