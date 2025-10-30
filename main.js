import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global State and Constants ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db, auth, userId;
let isAuthReady = false;
let currentDocument = null; // Stores the currently loaded document { id, title, content }
let allDocuments = [];

// Configuration for the Gemini API is handled in ai.js, but we need the function handleAIGenerate
const { generateLatexWithAI } = window; // Assumes ai.js exports this globally

// --- DOM Elements ---
const DOMElements = {
    editor: document.getElementById('latexEditor'),
    previewContainer: document.getElementById('previewContainer'),
    documentList: document.getElementById('documentList'),
    currentTitle: document.getElementById('currentDocumentTitle'),
    userIdDisplay: document.getElementById('userIdDisplay'),
    aiStatus: document.getElementById('aiStatus'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    statusModal: document.getElementById('statusModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    modalInput: document.getElementById('modalInput'),
    modalActions: document.getElementById('modalActions'),
    sidebar: document.getElementById('sidebar'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
};

// --- Utility Functions ---

function showStatusModal(title, message, options = {}) {
    DOMElements.modalTitle.textContent = title;
    DOMElements.modalMessage.textContent = message;

    // Handle input field visibility
    if (options.input) {
        DOMElements.modalInput.value = options.input.defaultValue || '';
        DOMElements.modalInput.placeholder = options.input.placeholder || '';
        DOMElements.modalInput.classList.remove('hidden');
    } else {
        DOMElements.modalInput.classList.add('hidden');
    }

    // Clear previous actions
    DOMElements.modalActions.innerHTML = '';

    // Add Cancel/Close button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-cancel-btn bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200';
    cancelBtn.textContent = options.cancelText || (options.confirmCallback ? 'Cancel' : 'Close');
    cancelBtn.onclick = () => DOMElements.statusModal.classList.add('hidden');
    DOMElements.modalActions.appendChild(cancelBtn);

    // Add Confirm button if a callback is provided
    if (options.confirmCallback) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-confirm-btn bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white py-2 px-4 rounded-lg transition duration-200';
        confirmBtn.textContent = options.confirmText || 'Confirm';
        confirmBtn.onclick = () => {
            DOMElements.statusModal.classList.add('hidden');
            const inputValue = DOMElements.modalInput.value;
            options.confirmCallback(inputValue);
        };
        DOMElements.modalActions.appendChild(confirmBtn);
    }

    DOMElements.statusModal.classList.remove('hidden');
    DOMElements.statusModal.classList.add('flex');
}

/**
 * Parses a simple subset of LaTeX into basic HTML for a realistic preview.
 */
function simpleLatexToHtml(latex) {
    let content = latex.match(/\\begin{document}([\s\S]*?)\\end{document}/i);
    if (!content) return "<p class='text-center text-red-400 font-bold p-10'>Error: \\begin{document} or \\end{document} not found.</p>";

    let html = content[1];

    // Handle title block
    const titleMatch = latex.match(/\\title\{(.*?)\}/i);
    const authorMatch = latex.match(/\\author\{(.*?)\}/i);
    const dateMatch = latex.match(/\\date\{(.*?)\}/i);
    let titleBlock = '';
    if (titleMatch) titleBlock += `<h1 class="text-3xl font-extrabold text-center mb-1 text-gray-900">${titleMatch[1]}</h1>`;
    if (authorMatch) titleBlock += `<p class="text-center mb-1 text-gray-500">By: ${authorMatch[1]}</p>`;
    if (dateMatch) titleBlock += `<p class="text-center text-sm mb-6 text-gray-600">${dateMatch[1]}</p>`;
    
    html = html.replace(/\\maketitle/i, titleBlock);

    // Replace common LaTeX commands
    html = html.replace(/\\section\{(.*?)\}/g, '<h3 class="text-xl font-bold mt-6 mb-2 text-blue-800 border-b border-blue-200 pb-1">$1</h3>');
    html = html.replace(/\\subsection\{(.*?)\}/g, '<h4 class="text-lg font-semibold mt-4 mb-1 text-gray-800">$1</h4>');
    html = html.replace(/\\textbf\{(.*?)\}/g, '<strong>$1</strong>');
    html = html.replace(/\\textit\{(.*?)\}/g, '<em>$1</em>');
    
    // Inline math (simplified display)
    html = html.replace(/\$([^\$]+)\$/g, '<code class="bg-yellow-100 text-red-700 px-1 rounded font-mono text-sm">$1</code>');

    // Block math environment (simplified display)
    html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (match, eqContent) => 
        `<div class="bg-gray-100 border border-gray-300 p-3 my-4 text-center font-mono overflow-x-auto shadow-inner rounded-lg">$$ ${eqContent.trim()} $$</div>`
    );

    // List items
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, listContent) => {
        const items = listContent.split('\\item').slice(1).map(item =>
            `<li class="list-disc ml-8 text-gray-700">${item.trim()}</li>`
        ).join('');
        return `<ul class="my-3">${items}</ul>`;
    });

    // Tables (complex parsing for a better preview)
    html = html.replace(/\\begin\{tabular\}\{([cl|]+)\}([\s\S]*?)\\end\{tabular\}/g, (match, cols, tableContent) => {
        const rows = tableContent.split('\\\\').map(row => row.trim()).filter(row => row);
        
        const tableHtml = rows.map(row => {
            const cells = row.split('&').map(cell => cell.trim().replace(/\\hline|\n/g, ''));
            const cellTag = cells[0].includes('textbf') || cells[0].includes('section') ? 'th' : 'td';

            return `
                <tr class="border-b border-gray-200 hover:bg-gray-50">
                    ${cells.map(cell => `<${cellTag} class="p-2 text-sm text-gray-700">${cell}</${cellTag}>`).join('')}
                </tr>
            `;
        }).join('');

        return `
            <div class="my-4 overflow-x-auto rounded-lg shadow-md border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tableHtml}
                    </tbody>
                </table>
            </div>
        `;
    });

    // Figures (using simple framebox content)
    html = html.replace(/\\begin\{figure\}([\s\S]*?)\\end\{figure\}/g, (match, figureContent) => {
        const captionMatch = figureContent.match(/\\caption\{(.*?)\}/i);
        const caption = captionMatch ? captionMatch[1] : 'Figure Caption Placeholder';
        const frameboxContent = figureContent.match(/\\framebox.*?\}([\s\S]*?)\}/i)?.[1] || 'Image Placeholder';

        return `
            <div class="my-6 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
                <p class="font-mono text-gray-500 mb-2">Figure Content Area</p>
                <div class="bg-gray-200 p-8 rounded-lg shadow-inner">
                    <p class="text-gray-600">${frameboxContent.trim()}</p>
                </div>
                <p class="mt-2 text-sm text-gray-700">Figure: ${caption}</p>
            </div>
        `;
    });

    // Final clean-up for newlines and control characters
    html = html.replace(/\\(author|date|title|document|framebox|caption|begin|end)\{.*?\}/g, '');
    html = html.replace(/\\(hline|item)/g, '');
    html = html.replace(/\n/g, '<br>');

    return `<div class="p-8">${html}</div>`;
}

// --- Firebase Initialization and Auth ---

async function initFirebase() {
    if (!firebaseConfig) {
        console.error("Firebase configuration is missing.");
        showStatusModal("Error", "Firebase configuration is missing. Cannot save data.");
        return;
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        userId = auth.currentUser.uid;
        DOMElements.userIdDisplay.textContent = `ID: ${userId}`;
        isAuthReady = true;
        console.log("Firebase initialized. User ID:", userId);
        
        // Start listening to documents
        listenToDocuments();

    } catch (error) {
        console.error("Firebase Auth error:", error);
        showStatusModal("Authentication Error", `Could not sign in: ${error.message}`, true);
    }
}

// --- Firestore Document Management ---

function getDocumentCollectionRef() {
    return collection(db, 'artifacts', appId, 'users', userId, 'documents');
}

/**
 * Listens to all documents for the current user and updates the UI.
 */
function listenToDocuments() {
    if (!isAuthReady) return;

    const q = query(getDocumentCollectionRef());
    onSnapshot(q, (snapshot) => {
        allDocuments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDocumentList();

        // If no document is loaded, load the first one or create a new one
        if (!currentDocument && allDocuments.length > 0) {
            loadDocument(allDocuments[0].id);
        } else if (currentDocument && !allDocuments.some(doc => doc.id === currentDocument.id)) {
            // If the current document was just deleted, load the first remaining one
            loadDocument(allDocuments[0]?.id);
        } else if (allDocuments.length === 0) {
            // No documents exist, create a new one
            createNewDocument();
        }
    });
}

/**
 * Renders the list of documents in the sidebar.
 */
function renderDocumentList() {
    DOMElements.documentList.innerHTML = '';
    
    if (allDocuments.length === 0) {
        DOMElements.documentList.innerHTML = '<p class="text-sm text-[var(--text-muted)] p-2">No documents found. Create a new one!</p>';
        return;
    }

    allDocuments.forEach(doc => {
        const isActive = currentDocument?.id === doc.id;
        const listItem = document.createElement('div');
        listItem.className = `document-item flex items-center justify-between p-3 rounded-lg cursor-pointer transition duration-150 ${isActive ? 'bg-[var(--primary)] text-white shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--hover-bg)]'}`;
        listItem.setAttribute('data-doc-id', doc.id);

        listItem.innerHTML = `
            <div class="flex items-center gap-3 truncate flex-grow" onclick="window.loadDocument('${doc.id}')">
                <i data-lucide="file-text" class="w-5 h-5 ${isActive ? 'text-white' : 'text-[var(--primary)]'}"></i>
                <span class="truncate text-sm font-medium">${doc.title || 'Untitled Document'}</span>
            </div>
            <div class="flex gap-1 ml-2 flex-shrink-0">
                <button title="Rename" onclick="window.promptRenameDocument('${doc.id}', '${doc.title}')" class="p-1 rounded hover:bg-opacity-75 ${isActive ? 'text-white hover:bg-white/20' : 'text-[var(--primary)] hover:bg-[var(--hover-bg)]'}">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button title="Delete" onclick="window.promptDeleteDocument('${doc.id}', '${doc.title}')" class="p-1 rounded hover:bg-opacity-75 ${isActive ? 'text-white hover:bg-white/20' : 'text-red-500 hover:bg-[var(--hover-bg)]'}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        DOMElements.documentList.appendChild(listItem);
        lucide.createIcons(); // Re-render icons after adding new HTML
    });
}

/**
 * Loads a document into the editor.
 */
window.loadDocument = function(docId) {
    const docToLoad = allDocuments.find(d => d.id === docId);
    if (docToLoad) {
        currentDocument = docToLoad;
        DOMElements.currentTitle.textContent = currentDocument.title;
        DOMElements.editor.value = currentDocument.content;
        updatePreview();
        renderDocumentList(); // Update active state
    }
}

/**
 * Saves the current document content to Firestore.
 */
async function saveCurrentDocument() {
    if (!currentDocument || !isAuthReady) {
        console.warn("Cannot save: No document loaded or Auth not ready.");
        return;
    }
    try {
        const docRef = doc(getDocumentCollectionRef(), currentDocument.id);
        const content = DOMElements.editor.value;
        await updateDoc(docRef, {
            content: content,
            updatedAt: new Date().toISOString()
        });
        currentDocument.content = content; // Update local state immediately
        DOMElements.aiStatus.textContent = `Saved: ${currentDocument.title}`;
    } catch (error) {
        console.error("Error saving document:", error);
        DOMElements.aiStatus.textContent = "Error saving document.";
    }
}

/**
 * Creates a new, blank LaTeX document.
 */
window.createNewDocument = async function() {
    if (!isAuthReady) return;
    
    const newDocData = {
        title: `Untitled Document ${allDocuments.length + 1}`,
        content: `\\documentclass[10pt, a4paper]{article}
\\usepackage{amsmath}
\\usepackage{booktabs}

\\title{New Document}
\\author{${userId.substring(0, 8)}...}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Getting Started}
This is your new document created by the AI LaTeX Studio.

Use the AI Prompt above to ask Gemini to generate complex content, or use the Quick Insert Tools for common elements.

\\section{A Table Example}
\\begin{tabular}{lcl}
    \\toprule
    Header 1 & Header 2 & Header 3 \\\\
    \\midrule
    Data 1 & Data 2 & Data 3 \\\\
    More & Data & Here \\\\
    \\bottomrule
\\end{tabular}

\\end{document}`,
        createdAt: new Date().toISOString()
    };

    try {
        const docRef = await addDoc(getDocumentCollectionRef(), newDocData);
        loadDocument(docRef.id); // Automatically load the new document
    } catch (error) {
        console.error("Error creating new document:", error);
        showStatusModal("Error", "Could not create new document.", true);
    }
}

/**
 * Renames the current document.
 */
window.promptRenameDocument = function(docId, oldTitle) {
    showStatusModal("Rename Document", `Enter a new name for "${oldTitle}"`, {
        input: { defaultValue: oldTitle, placeholder: 'New document title' },
        confirmText: 'Rename',
        confirmCallback: async (newTitle) => {
            if (!newTitle.trim()) {
                showStatusModal("Error", "Title cannot be empty.", true);
                return;
            }
            try {
                const docRef = doc(getDocumentCollectionRef(), docId);
                await updateDoc(docRef, { title: newTitle });
                if (currentDocument.id === docId) {
                    currentDocument.title = newTitle;
                    DOMElements.currentTitle.textContent = newTitle;
                }
            } catch (error) {
                console.error("Error renaming document:", error);
                showStatusModal("Error", "Could not rename document.", true);
            }
        }
    });
}

/**
 * Deletes a document after confirmation.
 */
window.promptDeleteDocument = function(docId, title) {
    showStatusModal("Confirm Delete", `Are you sure you want to delete "${title}"? This cannot be undone.`, {
        confirmText: 'Delete',
        confirmCallback: async () => {
            try {
                await deleteDoc(doc(getDocumentCollectionRef(), docId));
                DOMElements.aiStatus.textContent = `Deleted: ${title}`;
                if (currentDocument?.id === docId) {
                    currentDocument = null;
                }
            } catch (error) {
                console.error("Error deleting document:", error);
                showStatusModal("Error", "Could not delete document.", true);
            }
        }
    });
}


// --- Editor and Preview Logic ---

window.updatePreview = function() {
    const latexContent = DOMElements.editor.value;
    DOMElements.previewContainer.innerHTML = simpleLatexToHtml(latexContent);
    saveCurrentDocument(); // Save on every input change
}

// --- AI Interaction Logic ---

window.insertAITemplate = async function(templateType) {
    let prompt;
    const currentContent = DOMElements.editor.value;

    if (!currentDocument) {
        showStatusModal("Error", "Please create or load a document before using AI tools.", true);
        return;
    }

    switch (templateType) {
        case 'table':
            prompt = "Generate a 4-column, 5-row LaTeX table using the 'booktabs' package with descriptive header titles and some sample data.";
            break;
        case 'figure':
            prompt = "Generate a LaTeX 'figure' environment that includes a placeholder using '\\framebox' for a complex diagram, and a corresponding caption and label. Ensure the placeholder is 3 inches wide.";
            break;
        case 'math':
            prompt = "Generate a LaTeX 'equation' environment for the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$";
            break;
        default:
            return;
    }

    // Call the external AI function defined in ai.js
    const newLatexContent = await generateLatexWithAI(currentContent, prompt, DOMElements.loadingIndicator, DOMElements.aiStatus);

    if (newLatexContent) {
        DOMElements.editor.value = newLatexContent;
        updatePreview();
    }
}


// --- Export/PDF Simulation Logic ---

window.exportPDF = async function() {
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = true;
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i data-lucide="loader" class="animate-spin w-5 h-5"></i> Compiling...';
    DOMElements.aiStatus.textContent = "Compiling LaTeX code...";

    const latexContent = DOMElements.editor.value;
    const apiUrl = 'https://your-serverless-function.com/compile-latex-to-pdf'; // Placeholder URL

    try {
        // Simulate waiting for a server compilation process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real app, you would make a fetch call here:
        /*
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex: latexContent, format: 'pdf' })
        });
        if (!response.ok) throw new Error('Compilation failed on server.');
        const result = await response.json();
        const pdfUrl = result.pdfUrl; // The URL to the compiled PDF
        */
        
        // SIMULATION: Directly trigger a download with a dummy file
        const dummyPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        window.open(dummyPdfUrl, '_blank');
        
        DOMElements.aiStatus.textContent = "PDF compiled and download initiated!";

    } catch (error) {
        console.error("PDF Export Error:", error);
        DOMElements.aiStatus.textContent = `Export failed. Server error: ${error.message}`;
    } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
        lucide.createIcons();
    }
}

// --- Theme Toggling ---

window.toggleTheme = function() {
    const isDark = document.body.classList.toggle('light-theme');
    
    // Update local storage
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    
    // Update icon
    DOMElements.themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        DOMElements.themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        DOMElements.themeIcon.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
}

// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    applyInitialTheme();
    initFirebase();
    
    // Editor and Preview
    DOMElements.editor.addEventListener('input', updatePreview);
    
    // AI and Insert Buttons
    document.getElementById('aiGenerateBtn').addEventListener('click', () => {
        // Main AI button uses the text input
        generateLatexWithAI(DOMElements.editor.value, document.getElementById('aiPrompt').value, DOMElements.loadingIndicator, DOMElements.aiStatus).then(newContent => {
            if (newContent) {
                DOMElements.editor.value = newContent;
                updatePreview();
            }
        });
    });
    document.getElementById('insertTableBtn').addEventListener('click', () => insertAITemplate('table'));
    document.getElementById('insertFigureBtn').addEventListener('click', () => insertAITemplate('figure'));
    document.getElementById('insertMathBtn').addEventListener('click', () => insertAITemplate('math'));
    
    // File Management
    document.getElementById('newDocumentBtn').addEventListener('click', createNewDocument);
    document.getElementById('exportBtn').addEventListener('click', exportPDF);
    
    // Theme and Sidebar
    DOMElements.themeToggleBtn.addEventListener('click', toggleTheme);
    document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
        DOMElements.sidebar.classList.toggle('hidden');
    });

    // Handle initial state if no document loads immediately
    if (!currentDocument) {
        DOMElements.editor.value = "Loading documents or creating new...";
    }
});

// Expose functions globally for HTML calls
window.loadDocument = loadDocument;
window.promptRenameDocument = promptRenameDocument;
window.promptDeleteDocument = promptDeleteDocument;