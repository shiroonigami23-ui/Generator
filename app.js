
import * as FB from "./firebase.js";
import * as UI from "./ui.js";
import * as UTILS from "./utils.js";
import { generateLatexWithAI } from "./ai.js";

// --- Cloudinary Configuration (Unsigned Upload) ---
// IMPORTANT: These are set using YOUR Cloud Name and Upload Preset from the provided screenshots
const CLOUDINARY_CLOUD_NAME = "dv5pajfhh"; 
const CLOUDINARY_UPLOAD_PRESET = "Pdf-Generator"; 
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// --- Global State for Project and UI ---
const DOMElements = UI.DOMElements;
let projectList = []; 
let currentProjectAssets = []; 
let isAILoading = false;
let unsubscribeProjects = null; 

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
This project uses Cloudinary for external image hosting.

\\section{Assets (Images)}
To insert an image, use the 'Import Asset' button in the sidebar, then use the command:
\\begin{figure}[h!]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{my_chart.png}
  \\caption{Example Asset Placeholder. Replace my\_chart.png with your asset filename.}
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
    
    // 1. Fetch asset URLs from Firestore
    currentProjectAssets = await FB.getAssets(project.id);
    
    // 2. Update preview with content AND asset URLs
    UTILS.updatePreview(project.content, currentProjectAssets);
    
    // 3. Re-render list to highlight active project and asset list
    UI.renderProjectList(projectList, loadProject);
    UI.renderAssetList(currentProjectAssets);

    DOMElements.aiStatus.textContent = "Project loaded and assets synchronized.";

    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }
}

/**
 * Updates the preview and saves the project content.
 */
function handleUpdatePreviewAndSave(content = DOMElements.latexEditor.value) {
    FB.saveProject(content);
    UTILS.updatePreview(content, currentProjectAssets); 
}

/**
 * Handles AI generation/editing request.
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

        // Update editor, save, and preview
        DOMElements.latexEditor.value = newLatex;
        FB.saveProject(newLatex);
        UTILS.updatePreview(newLatex, currentProjectAssets);

        DOMElements.aiStatus.textContent = "AI generation complete. LaTeX updated and saved.";
        DOMElements.aiPrompt.value = '';

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
 * Uploads a file to Cloudinary and saves the resulting URL to Firestore.
 * @param {File} file - The file uploaded by the user.
 */
async function handleImageImport(file) {
    if (!FB.currentProjectId) {
        UTILS.showStatusModal("Import Error", "Please load a project before importing assets.", true);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    // Use the user's ID as a folder for organization
    formData.append('folder', `latex-studio/${FB.userId}`); 

    DOMElements.aiStatus.textContent = `Uploading ${file.name} to Cloudinary...`;

    try {
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Cloudinary upload failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // 1. Save the asset URL and Public ID to Firestore
        await FB.saveAsset(file.name, data.secure_url, data.public_id);
        
        // 2. Update local state and UI
        currentProjectAssets = await FB.getAssets(FB.currentProjectId);
        UI.renderAssetList(currentProjectAssets);
        handleUpdatePreviewAndSave(); 
        DOMElements.aiStatus.textContent = `Asset "${file.name}" uploaded successfully. Use \\includegraphics{${file.name}}`;

    } catch (error) {
        console.error("Cloudinary/Asset Upload Error:", error);
        UTILS.showStatusModal("Upload Failed", `Could not upload asset: ${error.message}`, true);
    }
}

/**
 * Deletes an asset from Cloudinary and removes its reference from Firestore.
 * IMPORTANT: Client-side Cloudinary deletion without a server is insecure and requires a signed API call.
 * For this simple app, we're just deleting the Firestore reference and notifying the user.
 * For a production app, this would involve a Firebase Cloud Function or similar backend to securely delete from Cloudinary.
 */
window.promptDeleteAsset = async function (assetId, assetName, publicId) {
    const confirmation = await UTILS.showStatusModal("Delete Asset", `Are you sure you want to delete the asset "${assetName}"? This will remove its reference from your project. (Note: Actual file might remain on Cloudinary without a secure server-side delete).`, true, true);
    
    if (confirmation === true) {
        // 1. Delete reference from Firestore
        await FB.deleteAsset(FB.currentProjectId, assetId);
        
        // 2. Notify the user about manual Cloudinary cleanup
        UTILS.showStatusModal("Asset Deleted (Cloudinary Note)", `The image reference for "${assetName}" was removed. Due to security, the actual file (Public ID: ${publicId}) might still be in your Cloudinary account. You may need to delete it manually there.`, false);


        // 3. Update local state and UI
        currentProjectAssets = await FB.getAssets(FB.currentProjectId);
        UI.renderAssetList(currentProjectAssets);
        handleUpdatePreviewAndSave(); 
    }
}


// --- Project Management Wrappers ---

async function createNewProject(name = 'Untitled Project') {
    if (!FB.isAuthReady || !FB.userId) return;
    try {
        const content = DEFAULT_LATEX_CONTENT.replace(`User ID: \${FB.userId || 'Authenticated User'}`, `User ID: ${FB.userId}`);
        await FB.createNewProject(name, content);
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
    const confirmation = await UTILS.showStatusModal("Delete Project", `Are you sure you want to permanently delete "${projectName}"? Note: Linked images will remain on Cloudinary without a secure server-side delete.`, true, true);
    if (confirmation === true) {
        await FB.deleteExistingProject(projectId);
        if (FB.currentProjectId === projectId) {
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
        unsubscribeProjects(); 
    }
    FB.listenForProjects(async (projects) => {
        projectList = projects;
        
        UI.initializeProfile();

        if (projects.length === 0) {
            createNewProject('First Project');
            return; 
        }

        if (!FB.currentProjectId || !projects.find(p => p.id === FB.currentProjectId)) {
            await loadProject(projects[0]);
        } else {
            UI.renderProjectList(projectList, loadProject);
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
 */
function handleAuthChange(user) {
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');

    if (user) {
        splashScreen.classList.add('opacity-0', 'hidden');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('opacity-100');
        
        DOMElements.userNameDisplay.textContent = user.displayName || 'Authenticated User';
        DOMElements.userIdDisplay.textContent = `ID: ${user.uid.substring(0, 8)}...`;
        
        startProjectListener();
        
    } else {
        appContainer.classList.add('hidden');
        
        if (unsubscribeProjects) {
            unsubscribeProjects();
            unsubscribeProjects = null;
            projectList = [];
            currentProjectAssets = [];
        }
        
        splashScreen.classList.remove('hidden');
        setTimeout(() => splashScreen.classList.remove('opacity-0'), 10);
        
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
    
    DOMElements.newProjectBtn.addEventListener('click', () => createNewProject('New Project ' + (projectList.length + 1)));

    // Asset File Input Handler (New)
    DOMElements.assetFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImageImport(file);
        }
        event.target.value = ''; 
    });


    // Sidebar and Theme
    DOMElements.themeToggleBtn.addEventListener('click', UI.toggleTheme);
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
    window.loadProject = loadProject; 
    window.promptRenameProject = window.promptRenameProject;
    window.promptDeleteProject = window.promptDeleteProject;
    window.promptDeleteAsset = window.promptDeleteAsset; 
}


async function initApp() {
    // 1. Load Theme
    UI.loadThemePreference();

    // 2. Init Firebase App
    const firebaseContext = FB.initFirebase();
    if (!firebaseContext) return; 

    // 3. Set up Auth State Observer
    FB.observeAuthState(handleAuthChange);
    
    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }

    // 4. Setup all click/input handlers
    setupEventListeners();
}

// Kick off the application
document.addEventListener('DOMContentLoaded', initApp);
