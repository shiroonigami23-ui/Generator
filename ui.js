import { currentProjectId, userId } from "./firebase.js";

// --- DOM Element References (Centralized and Corrected) ---
export const DOMElements = {
    // Containers
    appContainer: document.getElementById('appContainer'),
    sidebar: document.getElementById('sidebar'),
    projectList: document.getElementById('projectList'), // CORRECTED ID
    assetList: document.getElementById('assetList'), // NEW: Asset List container
    previewContainer: document.getElementById('previewContainer'),
    // Editor/Input
    latexEditor: document.getElementById('latexEditor'),
    aiPrompt: document.getElementById('aiPrompt'),
    projectTitleDisplay: document.getElementById('projectTitleDisplay'), // CORRECTED ID
    // Buttons
    exportBtn: document.getElementById('exportBtn'),
    aiGenerateBtn: document.getElementById('aiGenerateBtn'),
    newProjectBtn: document.getElementById('newProjectBtn'), // CORRECTED ID
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarToggleBtnMobile: document.getElementById('sidebarToggleBtnMobile'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    insertTableBtn: document.getElementById('insertTableBtn'),
    insertFigureBtn: document.getElementById('insertFigureBtn'),
    insertMathBtn: document.getElementById('insertMathBtn'),
    assetFileInput: document.getElementById('assetFileInput'), // NEW: Input for image upload
    // Status/Display
    userNameDisplay: document.getElementById('userNameDisplay'), // Added for completeness
    userIdDisplay: document.getElementById('userIdDisplay'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    aiStatus: document.getElementById('aiStatus'),
    moonIcon: document.getElementById('moonIcon'),
    sunIcon: document.getElementById('sunIcon'),
};

/**
 * Renders the project list in the sidebar.
 * @param {Array<object>} projects - List of projects from Firestore.
 * @param {function} loadHandler - Function to call when a project is clicked.
 */
export function renderProjectList(projects, loadHandler) {
    DOMElements.projectList.innerHTML = '';
    if (projects.length === 0) {
        DOMElements.projectList.innerHTML = '<p class="text-sm text-gray-500 p-2">No projects found. Click "New Project" to start.</p>';
        return;
    }

    projects.forEach(project => {
        // Renamed documentId to currentProjectId
        const isActive = project.id === currentProjectId;
        const item = document.createElement('div');
        // Renamed document-item to project-item
        item.className = `project-item group ${isActive ? 'active' : 'text-gray-200 hover:text-white'}`;
        item.dataset.id = project.id;

        item.innerHTML = `
            <span class="truncate text-sm font-medium mr-2 max-w-[120px]">${project.name}</span>
            <div class="project-controls flex gap-1 flex-shrink-0">
                <button title="Rename" class="text-gray-400 group-hover:text-blue-200 transition p-1 rounded-full rename-btn" onclick="event.stopPropagation(); window.promptRenameProject('${project.id}', '${project.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button title="Delete" class="text-gray-400 group-hover:text-red-300 transition p-1 rounded-full delete-btn" onclick="event.stopPropagation(); window.promptDeleteProject('${project.id}', '${project.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `;
        item.onclick = () => loadHandler(project);
        DOMElements.projectList.appendChild(item);
    });
}

/**
 * Renders the list of assets for the current project.
 * @param {Array<object>} assets - List of assets { id, name, url, publicId }.
 */
export function renderAssetList(assets) {
    const listContainer = DOMElements.assetList;
    listContainer.innerHTML = '';
    
    if (assets.length === 0) {
        listContainer.innerHTML = '<p class="text-sm text-gray-500 p-2">No assets imported.</p>';
        return;
    }

    assets.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.title = asset.publicId;

        item.innerHTML = `
            <span class="truncate max-w-[80%]">${asset.name}</span>
            <button title="Delete Asset" class="text-red-400 hover:text-red-300 transition p-1 rounded-full" 
                    onclick="event.stopPropagation(); window.promptDeleteAsset('${asset.id}', '${asset.name}', '${asset.publicId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        `;
        listContainer.appendChild(item);
    });
}


/**
 * Initializes and displays the user profile info.
 */
export function initializeProfile() {
    DOMElements.userIdDisplay.textContent = `ID: ${userId}`;
    // Optionally display username if fetched
    // DOMElements.userNameDisplay.textContent = FB.userName || 'Authenticated User';
}

/**
 * Handles the application-wide theme toggle.
 */
export function toggleTheme() {
    // Toggles light-theme on the main appContainer instead of body for better scope control
    const isLight = DOMElements.appContainer.classList.toggle('light-theme');
    
    // Save preference to localStorage
    localStorage.setItem('theme', isLight ? 'light' : 'dark');

    // Toggle icons
    DOMElements.moonIcon.classList.toggle('hidden', isLight);
    DOMElements.sunIcon.classList.toggle('hidden', !isLight);
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
