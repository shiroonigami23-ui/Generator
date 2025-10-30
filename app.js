import * as FB from "./firebase.js";
import * as UI from "./ui.js";
import * as UTILS from "./utils.js";
import { generateLatexWithAI } from "./ai.js";

// --- Global State for Project and UI ---
const DOMElements = UI.DOMElements;
let projectList = []; // Cache of the current project list
let currentProjectAssets = []; // Cache of the current project's assets
let isAILoading = false;
let unsubscribeProjects = null; // Holds the function to stop the Firestore listener

// Default template for new projects
const DEFAULT_LATEX_CONTENT = `\\documentclass[10pt, a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage{graphicx} % IMPORTANT: Added for image inclusion
\\usepackage[a4paper, margin=1in]{geometry}

\\title{New AI Project}
\\author{User ID: \${FB.userId || 'Authenticated User'}}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This project utilizes AI to generate LaTeX code and client-side Base64 images for the preview.

\\section{Assets (Images)}
To insert an image, use the 'Import Asset' button in the sidebar, then use the command:
\\begin{figure}[h!]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{my_chart.png}
  \\caption{Example Asset Placeholder.}
\\end{figure}

\\section{Conclusion}
Thank you for using the AI LaTeX Studio.

\\end{document}`;

// --- Core Project Actions ---

/**
 * Loads a project into the editor, fetches its assets, and sets it as active.
 * @param {object} project - Project object with id, name, and content.
 */
async function loadProject(project) {
    if (!project || !project.id) return;
    
    FB.currentProjectId = project.id;
    FB.currentProjectContent = project.content;
    DOMElements.latexEditor.value = project.content;
    DOMElements.projectTitleDisplay.textContent = project.name;
    
    DOMElements.aiStatus.textContent = "Loading project assets...";
    
    // 1. Fetch assets for the new project
    currentProjectAssets = await FB.getAssets(project.id);
    
    // 2. Update preview with content AND assets
    UTILS.updatePreview(project.content, currentProjectAssets);
    
    // 3. Re-render list to highlight active project and asset list
    UI.renderProjectList(projectList, loadProject);
    UI.renderAssetList(currentProjectAssets);

    DOMElements.aiStatus.textContent = "Project loaded and assets synchronized.";

    // Close sidebar on mobile after loading
    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }
}

/**
 * Updates the preview and saves the project content.
 * This is the function attached to window.updatePreview
 */
function handleUpdatePreviewAndSave(content = DOMElements.latexEditor.value) {
    FB.saveProject(content);
    // Use the cached assets when updating the preview
    UTILS.updatePreview(content, currentProjectAssets); 
}

/**
 * Handles AI generation/editing request.
 * @param {string} prompt - The AI command or template prompt.
 */
async function handleAIGenerate(prompt) {
    if (isAILoading) return;
    if (!FB.currentProjectId) {
        UTILS.showStatusModal("Project Error", "Please create or load a project first.", true);
        return;
    }

    DOMElements.loadingIndicator.classList.remove('hidden');
    DOMElements.aiStatus.textContent = "Requesting AI to process and generate LaTeX...";
    DOMElements.aiGenerateBtn.disabled = true;
    isAILoading = true;

    try {
        const newLatex = await generateLatexWithAI(prompt, FB.currentProjectContent);

        // Update editor, save, and preview (Assets remain the same unless reloaded)
        DOMElements.latexEditor.value = newLatex;
        FB.saveProject(newLatex); // Save new content to Firestore
        UTILS.updatePreview(newLatex, currentProjectAssets);

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

/**
 * Reads a file from input, converts it to Base64, and saves it as an asset.
 * @param {File} file - The file uploaded by the user.
 */
async function handleImageImport(file) {
    if (!FB.currentProjectId) {
        UTILS.showStatusModal("Import Error", "Please load a project before importing assets.", true);
        return;
    }
    
    // Use FileReader to convert File to Base64
    const reader = new FileReader();
    reader.onload = async function(event) {
        const base64Data = event.target.result;
        try {
            await FB.saveAsset(file.name, base64Data);
            // Re-fetch and update UI
            currentProjectAssets = await FB.getAssets(FB.currentProjectId);
            UI.renderAssetList(currentProjectAssets);
            handleUpdatePreviewAndSave(); // Re-render preview to show new asset if used
            DOMElements.aiStatus.textContent = `Asset "${file.name}" uploaded. Insert via \\includegraphics{${file.name}}`;
        } catch (e) {
            // Error handled in FB.saveAsset
        }
    };
    reader.onerror = () => UTILS.showStatusModal("File Error", "Failed to read file.", true);
    reader.readAsDataURL(file);
}


// --- Project Management Wrappers (Renamed from Document) ---

async function createNewProject(name = 'Untitled Project') {
    if (!FB.isAuthReady || !FB.userId) return;
    try {
        const content = DEFAULT_LATEX_CONTENT.replace(`User ID: \${FB.userId || 'Authenticated User'}`, `User ID: ${FB.userId}`);
        await FB.createNewProject(name, content);
        // The listener will handle loading the new project
    } catch (e) {
        // Error handled in FB.createNewProject
    }
}

/**
 * Prompts user for a new name and calls rename function.
 */
window.promptRenameProject = async function (projectId, currentName) {
    const newName = await UTILS.showStatusModal("Rename Project", `Enter a new name for "${currentName}":`, false, true, true);
    if (newName && newName !== currentName) {
        await FB.renameProject(projectId, newName);
    }
};

/**
 * Prompts user for confirmation before deleting a project.
 */
window.promptDeleteProject = async function (projectId, projectName) {
    const confirmation = await UTILS.showStatusModal("Delete Project", `Are you sure you want to permanently delete "${projectName}"? All assets will be lost.`, true, true);
    if (confirmation === true) {
        await FB.deleteExistingProject(projectId);
        if (FB.currentProjectId === projectId) {
            // Deleted active project, clear state
            FB.currentProjectId = null;
            FB.currentProjectContent = '';
            currentProjectAssets = [];
            DOMElements.latexEditor.value = 'Click "New Project" to begin.';
            DOMElements.projectTitleDisplay.textContent = 'AI LaTeX Studio';
            UTILS.updatePreview('');
            UI.renderAssetList([]);
        }
    }
};

/**
 * Deletes an asset and updates the UI.
 */
window.promptDeleteAsset = async function (assetId, assetName) {
    const confirmation = await UTILS.showStatusModal("Delete Asset", `Are you sure you want to delete the asset "${assetName}"?`, true, true);
    if (confirmation === true) {
        await FB.deleteAsset(FB.currentProjectId, assetId);
        // Re-fetch and update UI
        currentProjectAssets = await FB.getAssets(FB.currentProjectId);
        UI.renderAssetList(currentProjectAssets);
        handleUpdatePreviewAndSave(); // Re-render preview to remove image
    }
}


// --- AI Quick-Insert Logic ---

function insertAITemplate(templateType) {
    let prompt;

    switch (templateType) {
        case 'table':
            prompt = `Insert a complex, well-formatted LaTeX table using booktabs package. The table should have 3 columns: Item, Quantity, and Price. Fill it with five rows of sample data. Keep the document structure intact, just insert the new table in the main body.`;
            break;
        case 'figure':
            prompt = `Insert a new figure environment using \\includegraphics{my_diagram.png} and the graphicx package. Set the caption to "Conceptual Diagram of the Project Structure."`;
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

function startProjectListener() {
    if (unsubscribeProjects) {
        unsubscribeProjects(); // Stop previous listener if one exists
    }
    // Renamed listenForDocuments to listenForProjects
    unsubscribeProjects = FB.listenForProjects(async (projects) => {
        projectList = projects;
        
        // Update profile info immediately
        UI.initializeProfile();

        // 1. If no projects exist, create the first one automatically
        if (projects.length === 0) {
            createNewProject('First Project');
            return; // Listener will fire again with the new project
        }

        // 2. If we don't have an active project yet, or if the active one was deleted, load the most recent one
        if (!FB.currentProjectId || !projects.find(p => p.id === FB.currentProjectId)) {
            await loadProject(projects[0]);
        } else {
            // If the active project already exists, just re-render the project list
            UI.renderProjectList(projectList, loadProject);
            // Re-render assets just in case they were changed in another tab (though assets are not real-time listener-driven here)
            if (FB.currentProjectId) {
                currentProjectAssets = await FB.getAssets(FB.currentProjectId);
                UI.renderAssetList(currentProjectAssets);
                UTILS.updatePreview(FB.currentProjectContent, currentProjectAssets);
            }
        }
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
        
        // Start project listener for the new user
        startProjectListener();
        
    } else {
        // Not Authenticated
        appContainer.classList.add('hidden');
        
        // Stop any active listener when logging out
        if (unsubscribeProjects) {
            unsubscribeProjects();
            unsubscribeProjects = null;
            projectList = [];
            currentProjectAssets = [];
        }
        
        // Show splash screen
        splashScreen.classList.remove('hidden');
        setTimeout(() => splashScreen.classList.remove('opacity-0'), 10);
        
        // Clear UI/state
        DOMElements.latexEditor.value = 'Sign in to start creating projects.';
        DOMElements.projectTitleDisplay.textContent = 'AI LaTeX Studio';
        DOMElements.projectList.innerHTML = '<p class="text-sm text-gray-500 p-2">Sign in to view projects.</p>';
        UI.renderAssetList([]);
        UTILS.updatePreview('');
    }
}


function setupEventListeners() {
    // Main AI Button
    DOMElements.aiGenerateBtn.addEventListener('click', () => handleAIGenerate(DOMElements.aiPrompt.value));

    // Export and File Management
    DOMElements.exportBtn.addEventListener('click', () => {
        const title = DOMElements.projectTitleDisplay.textContent;
        UTILS.exportHTMLToPDF(title);
    });
    
    // Renamed newDocumentBtn to newProjectBtn
    DOMElements.newProjectBtn.addEventListener('click', () => createNewProject('New Project ' + (projectList.length + 1)));

    // Asset File Input Handler (New)
    DOMElements.assetFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImageImport(file);
        }
        // Clear file input so the 'change' event fires again if the same file is selected
        event.target.value = ''; 
    });


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
    window.loadProject = loadProject; // Exposed loadProject globally
    window.promptRenameProject = window.promptRenameProject;
    window.promptDeleteProject = window.promptDeleteProject;
    window.promptDeleteAsset = window.promptDeleteAsset; // New: Exposed delete asset
}


async function initApp() {
    // 1. Load Theme
    UI.loadThemePreference();

    // 2. Init Firebase App
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
