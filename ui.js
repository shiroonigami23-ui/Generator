import { currentDocumentId, userId } from "./firebase.js";

// --- DOM Element References (Centralized to solve ReferenceError) ---
export const DOMElements = {
    // Containers
    appContainer: document.getElementById('appContainer'),
    sidebar: document.getElementById('sidebar'),
    documentList: document.getElementById('documentList'),
    previewContainer: document.getElementById('previewContainer'),
    // Editor/Input
    latexEditor: document.getElementById('latexEditor'),
    aiPrompt: document.getElementById('aiPrompt'),
    documentTitleDisplay: document.getElementById('documentTitleDisplay'),
    // Buttons
    exportBtn: document.getElementById('exportBtn'),
    aiGenerateBtn: document.getElementById('aiGenerateBtn'),
    newDocumentBtn: document.getElementById('newDocumentBtn'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarToggleBtnMobile: document.getElementById('sidebarToggleBtnMobile'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    insertTableBtn: document.getElementById('insertTableBtn'),
    insertFigureBtn: document.getElementById('insertFigureBtn'),
    insertMathBtn: document.getElementById('insertMathBtn'),
    // Status/Display
    userIdDisplay: document.getElementById('userIdDisplay'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    aiStatus: document.getElementById('aiStatus'),
    moonIcon: document.getElementById('moonIcon'),
    sunIcon: document.getElementById('sunIcon'),
};

/**
 * Renders the document list in the sidebar.
 * @param {Array<object>} documents - List of documents from Firestore.
 * @param {function} loadHandler - Function to call when a document is clicked.
 */
export function renderDocumentList(documents, loadHandler) {
    DOMElements.documentList.innerHTML = '';
    if (documents.length === 0) {
        DOMElements.documentList.innerHTML = '<p class="text-sm text-gray-500 p-2">No documents found. Click "New Document" to start.</p>';
        return;
    }

    documents.forEach(doc => {
        const isActive = doc.id === currentDocumentId;
        const item = document.createElement('div');
        item.className = `document-item group ${isActive ? 'active' : 'text-gray-200 hover:text-white'}`;
        item.dataset.id = doc.id;

        item.innerHTML = `
            <span class="truncate text-sm font-medium mr-2 max-w-[120px]">${doc.name}</span>
            <div class="doc-controls flex gap-1 flex-shrink-0">
                <button title="Rename" class="text-gray-400 group-hover:text-blue-200 transition p-1 rounded-full rename-btn" onclick="event.stopPropagation(); window.promptRenameDocument('${doc.id}', '${doc.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button title="Delete" class="text-gray-400 group-hover:text-red-300 transition p-1 rounded-full delete-btn" onclick="event.stopPropagation(); window.promptDeleteDocument('${doc.id}', '${doc.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `;
        item.onclick = () => loadHandler(doc);
        DOMElements.documentList.appendChild(item);
    });
}

/**
 * Initializes and displays the user profile info.
 */
export function initializeProfile() {
    DOMElements.userIdDisplay.textContent = `ID: ${userId}`;
}

/**
 * Handles the application-wide theme toggle.
 */
export function toggleTheme() {
    const isDark = DOMElements.appContainer.classList.toggle('light-theme');
    // Save preference to localStorage
    localStorage.setItem('theme', isDark ? 'light' : 'dark');

    // Toggle icons
    DOMElements.moonIcon.classList.toggle('hidden', isDark);
    DOMElements.sunIcon.classList.toggle('hidden', !isDark);
}

/**
 * Loads the saved theme preference on startup.
 */
export function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        DOMElements.appContainer.classList.add('light-theme');
        DOMElements.moonIcon.classList.add('hidden');
        DOMElements.sunIcon.classList.remove('hidden');
    } else {
        DOMElements.appContainer.classList.remove('light-theme');
        DOMElements.moonIcon.classList.remove('hidden');
        DOMElements.sunIcon.classList.add('hidden');
    }
}

