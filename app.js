import * as FB from "./firebase.js";
import * as UI from "./ui.js";
import * as UTILS from "./utils.js";
import { generateLatexWithAI } from "./ai.js";

// --- Global State for Document and UI ---
const DOMElements = UI.DOMElements;
let documentList = []; // Cache of the current document list
let isAILoading = false;
let unsubscribeDocuments = null; // Holds the function to stop the Firestore listener

// Default template for new documents
const DEFAULT_LATEX_CONTENT = `\\documentclass[10pt, a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage[a4paper, margin=1in]{geometry}

\\title{New AI Generated Document}
\\author{User ID: \${FB.userId || 'Authenticated User'}}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This is a new document created by the AI LaTeX Studio. Your user ID is now associated with this document.

\\section{Structure and Tools}
\\subsection{Tables}
Use the 'Table' quick-insert button above for a clean, professional table.

\\subsection{Figures}
Figures are represented by text placeholders since external image files cannot be compiled locally.

\\section{Conclusion}
Thank you for using the AI LaTeX Studio.

\\end{document}`;

// --- Core Document Actions ---

/**
 * Loads a document into the editor and sets it as active.
 * @param {object} doc - Document object with id, name, and content.
 */
function loadDocument(doc) {
    FB.currentDocumentId = doc.id;
    FB.currentDocumentContent = doc.content;
    DOMElements.latexEditor.value = doc.content;
    DOMElements.documentTitleDisplay.textContent = doc.name;
    UTILS.updatePreview(doc.content);

    // Re-render list to highlight active document
    UI.renderDocumentList(documentList, loadDocument);

    // Close sidebar on mobile after loading
    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }
}

/**
 * Updates the preview and saves the document content.
 * This is the function attached to window.updatePreview
 */
function handleUpdatePreviewAndSave(content = DOMElements.latexEditor.value) {
    FB.saveDocument(content);
    UTILS.updatePreview(content);
}

/**
 * Handles AI generation/editing request.
 * @param {string} prompt - The AI command or template prompt.
 */
async function handleAIGenerate(prompt) {
    if (isAILoading) return;
    if (!FB.currentDocumentId) {
        UTILS.showStatusModal("Document Error", "Please create or load a document first.", true);
        return;
    }

    DOMElements.loadingIndicator.classList.remove('hidden');
    DOMElements.aiStatus.textContent = "Requesting AI to process and generate LaTeX...";
    DOMElements.aiGenerateBtn.disabled = true;
    isAILoading = true;

    try {
        const newLatex = await generateLatexWithAI(prompt, FB.currentDocumentContent);

        // Update editor, save, and preview
        DOMElements.latexEditor.value = newLatex;
        FB.saveDocument(newLatex); // Save new content to Firestore
        UTILS.updatePreview(newLatex);

        DOMElements.aiStatus.textContent = "AI generation complete. LaTeX updated and saved.";
        DOMElements.aiPrompt.value = ''; // Clear prompt after success

    } catch (error) {
        console.error("AI Generation Error:", error);
        DOMElements.aiStatus.textContent = `Error: Failed to generate LaTeX. ${error.message}`;
        UTILS.showStatusModal("AI Error", `Failed to communicate with AI: ${error.message}`, true);
    } finally {
        DOMElements.loadingIndicator.classList.add('hidden');
        DOMElements.aiGenerateBtn.disabled = false;
        isAILoading = false;
    }
}

// --- Document Management Wrappers ---

async function createNewDocument(name = 'Untitled Document') {
    if (!FB.isAuthReady || !FB.userId) return;
    try {
        const content = DEFAULT_LATEX_CONTENT.replace(`User ID: \${FB.userId || 'Authenticated User'}`, `User ID: ${FB.userId}`);
        await FB.createNewDocument(name, content);
        // The listener will handle loading the new document
    } catch (e) {
        // Error handled in FB.createNewDocument
    }
}

/**
 * Prompts user for a new name and calls rename function.
 */
window.promptRenameDocument = async function (docId, currentName) {
    const newName = await UTILS.showStatusModal("Rename Document", `Enter a new name for "${currentName}":`, false, true, true);
    if (newName && newName !== currentName) {
        await FB.renameDocument(docId, newName);
    }
};

/**
 * Prompts user for confirmation before deleting.
 */
window.promptDeleteDocument = async function (docId, docName) {
    const confirmation = await UTILS.showStatusModal("Delete Document", `Are you sure you want to permanently delete "${docName}"?`, true, true);
    if (confirmation === true) {
        await FB.deleteExistingDocument(docId);
        if (FB.currentDocumentId === docId) {
            // Deleted active doc, clear state
            FB.currentDocumentId = null;
            FB.currentDocumentContent = '';
            DOMElements.latexEditor.value = 'Click "New Document" to begin.';
            DOMElements.documentTitleDisplay.textContent = 'AI LaTeX Studio';
            UTILS.updatePreview('');
        }
    }
};

// --- AI Quick-Insert Logic ---

function insertAITemplate(templateType) {
    let prompt;

    switch (templateType) {
        case 'table':
            prompt = `Insert a complex, well-formatted LaTeX table using booktabs package. The table should have 3 columns: Item, Quantity, and Price. Fill it with five rows of sample data. Keep the document structure intact, just insert the new table in the main body.`;
            break;
        case 'figure':
            prompt = `Insert a new figure environment in the document body. Use the \\framebox placeholder technique as per instructions. Set the caption to "Conceptual Diagram of the Document Structure."`;
            break;
        case 'math':
            prompt = `Insert a multi-line equation block using the align environment from amsmath. Include a complex integral or summation example.`;
            break;
        default:
            return;
    }
    handleAIGenerate(prompt);
}

// --- Authentication and UI Flow ---

function startDocumentListener() {
    if (unsubscribeDocuments) {
        unsubscribeDocuments(); // Stop previous listener if one exists
    }
    unsubscribeDocuments = FB.listenForDocuments((documents) => {
        documentList = documents;
        
        // Update profile info immediately
        UI.initializeProfile();

        // 1. If no documents exist, create the first one automatically
        if (documents.length === 0) {
            createNewDocument('First Document');
            return; // Listener will fire again with the new doc
        }

        // 2. If we don't have an active document yet, load the most recent one
        if (!FB.currentDocumentId || !documents.find(d => d.id === FB.currentDocumentId)) {
            loadDocument(documents[0]);
        }

        // 3. Re-render the list regardless
        UI.renderDocumentList(documentList, loadDocument);
    });
}


/**
 * Handles the main authentication state change.
 * @param {object|null} user - The authenticated user object or null.
 */
function handleAuthChange(user) {
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');

    if (user) {
        // Authenticated
        splashScreen.classList.add('opacity-0', 'hidden');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('opacity-100');
        
        // Update profile with user info
        DOMElements.userNameDisplay.textContent = user.displayName || 'Authenticated User';
        DOMElements.userIdDisplay.textContent = `ID: ${user.uid.substring(0, 8)}...`;
        
        // Start document listener for the new user
        startDocumentListener();
        
    } else {
        // Not Authenticated
        appContainer.classList.add('hidden');
        
        // Stop any active listener when logging out
        if (unsubscribeDocuments) {
            unsubscribeDocuments();
            unsubscribeDocuments = null;
            documentList = [];
        }
        
        // Show splash screen
        splashScreen.classList.remove('hidden');
        setTimeout(() => splashScreen.classList.remove('opacity-0'), 10);
        
        // Clear UI/state
        DOMElements.latexEditor.value = 'Sign in to start creating documents.';
        DOMElements.documentTitleDisplay.textContent = 'AI LaTeX Studio';
        DOMElements.documentList.innerHTML = '<p class="text-sm text-gray-500 p-2">Sign in to view documents.</p>';
        UTILS.updatePreview('');
    }
}


function setupEventListeners() {
    // Main AI Button
    DOMElements.aiGenerateBtn.addEventListener('click', () => handleAIGenerate(DOMElements.aiPrompt.value));

    // Export and File Management
    DOMElements.exportBtn.addEventListener('click', () => {
        const title = DOMElements.documentTitleDisplay.textContent;
        // Call the seamless, simulated API function
        UTILS.exportPDFToCompiler(FB.currentDocumentContent, title);
    });
    
    DOMElements.newDocumentBtn.addEventListener('click', () => createNewDocument('New Document ' + (documentList.length + 1)));

    // Sidebar and Theme
    DOMElements.themeToggleBtn.addEventListener('click', UI.toggleTheme);
    
    // Layout Fix: Toggle the sidebar visibility using the 'transform' class
    DOMElements.sidebarToggleBtn.addEventListener('click', () => DOMElements.sidebar.classList.toggle('-translate-x-full'));
    DOMElements.sidebarToggleBtnMobile.addEventListener('click', () => DOMElements.sidebar.classList.toggle('-translate-x-full'));


    // AI Quick-Insert
    DOMElements.insertTableBtn.addEventListener('click', () => insertAITemplate('table'));
    DOMElements.insertFigureBtn.addEventListener('click', () => insertAITemplate('figure'));
    DOMElements.insertMathBtn.addEventListener('click', () => insertAITemplate('math'));
    
    // Auth Event Listeners
    document.getElementById('googleSignInBtn').addEventListener('click', FB.signInWithGoogle);
    document.getElementById('signOutBtn').addEventListener('click', FB.signOutUser);
    
    // Set global update function for HTML oninput call
    window.updatePreview = handleUpdatePreviewAndSave;

    // Expose functions globally for HTML calls
    window.loadDocument = loadDocument; // Expose loadDocument globally
    window.promptRenameDocument = window.promptRenameDocument;
    window.promptDeleteDocument = window.promptDeleteDocument;
}


async function initApp() {
    // 1. Load Theme
    UI.loadThemePreference();

    // 2. Init Firebase App (but not authentication flow)
    const firebaseContext = FB.initFirebase();
    if (!firebaseContext) return; 

    // 3. Set up Auth State Observer
    FB.observeAuthState(handleAuthChange);
    
    // CRITICAL LAYOUT FIX: Ensure sidebar is hidden on small screens initially
    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }

    // 4. Setup all click/input handlers
    setupEventListeners();
}

// Kick off the application
document.addEventListener('DOMContentLoaded', initApp);
