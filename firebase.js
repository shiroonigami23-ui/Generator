import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    deleteDoc, 
    collection, 
    query, 
    onSnapshot, 
    updateDoc, 
    getDocs, 
    getDoc, 
    serverTimestamp,
    addDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showStatusModal } from "./utils.js";

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Configuration (Using provided global config or hardcoded fallback) ---
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBugNXrZaf4QlLdMjh92iUV8obwaV8-XKI",
    authDomain: "generator-a3655.firebaseapp.com",
    projectId: "generator-a3655",
    storageBucket: "generator-a3655.firebasestorage.app",
    messagingSenderId: "172475259787",
    appId: "1:172475259787:web:f0b66a234e4c2fc5e06d8e"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : FALLBACK_FIREBASE_CONFIG;


let db, auth;
export let userId = null;
export let isAuthReady = false;

// State management for current Project (renamed from document)
export let currentProjectId = null;
export let currentProjectContent = "";

// --- Paths ---
const getUserProjectsCollection = () => {
    if (!userId) throw new Error("User ID is not set. Auth failed.");
    // Renamed 'documents' to 'projects'
    return collection(db, 'artifacts', appId, 'users', userId, 'projects');
};
const getProjectRef = (projectId) => {
    if (!userId) throw new Error("User ID is not set. Auth failed.");
    return doc(db, 'artifacts', appId, 'users', userId, 'projects', projectId);
};
const getProjectAssetsCollection = (projectId) => {
    if (!userId) throw new Error("User ID is not set. Auth failed.");
    return collection(getProjectRef(projectId), 'assets');
};
const getAssetRef = (projectId, assetId) => {
    return doc(getProjectAssetsCollection(projectId), assetId);
};

// --- Initialization ---

/**
 * Initializes Firebase App and services.
 */
export function initFirebase() {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        console.error("Firebase configuration is missing after checks.");
        showStatusModal("Error", "Firebase configuration is missing. Cannot proceed.", true);
        return null;
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Auth logic remains the same (Custom Token priority, then Anonymous fallback)
    if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
            console.error("Custom token sign-in failed:", error);
            signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
        });
    } else {
        signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
    }

    return { db, auth };
}

/**
 * Attaches an observer to the authentication state.
 */
export function observeAuthState(callback) {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    return onAuthStateChanged(auth, (user) => {
        userId = user ? user.uid : null;
        isAuthReady = true;
        callback(user);
    });
}

/**
 * Triggers the Google Sign-In process.
 */
export async function signInWithGoogle() {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        showStatusModal("Sign-In Failed", `Could not sign in with Google: ${error.message}`, true);
    }
}

/**
 * Triggers the sign out process.
 */
export async function signOutUser() {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign-Out Error:", error);
        showStatusModal("Sign-Out Failed", `Could not sign out: ${error.message}`, true);
    }
}


// --- Project CRUD Operations (Renamed from Document) ---

/**
 * Saves the current project content and name (if provided).
 * @param {string} latexContent - The LaTeX content to save.
 * @param {string} [name] - Optional new name for the project.
 */
export async function saveProject(latexContent, name = null) {
    if (!isAuthReady || !currentProjectId) {
        if (isAuthReady) console.warn("Cannot save: No current project ID set.");
        return;
    }

    try {
        const data = {
            content: latexContent,
            updatedAt: serverTimestamp() // Use server timestamp for accuracy
        };
        if (name) {
            data.name = name;
        }

        const projectRef = getProjectRef(currentProjectId);
        await setDoc(projectRef, data, { merge: true });
        currentProjectContent = latexContent;
    } catch (error) {
        console.error("Error saving project:", error);
        showStatusModal("Save Error", `Failed to save project: ${error.message}`, true);
    }
}

/**
 * Creates a new project and sets it as the current active project.
 * @param {string} name - The name of the new project.
 * @param {string} initialContent - The content to start the project with.
 * @returns {Promise<string>} The new project ID.
 */
export async function createNewProject(name, initialContent) {
    if (!isAuthReady) throw new Error("Firebase not ready for project creation.");
    try {
        const newProjectRef = doc(getUserProjectsCollection());
        await setDoc(newProjectRef, {
            name: name,
            content: initialContent,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        currentProjectId = newProjectRef.id;
        currentProjectContent = initialContent;
        return newProjectRef.id;
    } catch (error) {
        console.error("Error creating project:", error);
        showStatusModal("Creation Error", `Failed to create new project: ${error.message}`, true);
        throw error;
    }
}

/**
 * Deletes the specified project.
 * @param {string} projectId - The ID of the project to delete.
 */
export async function deleteExistingProject(projectId) {
    if (!isAuthReady) throw new Error("Firebase not ready for deletion.");
    try {
        await deleteDoc(getProjectRef(projectId));
    } catch (error) {
        console.error("Error deleting project:", error);
        showStatusModal("Deletion Error", `Failed to delete project: ${error.message}`, true);
    }
}

/**
 * Renames the specified project.
 * @param {string} projectId - The ID of the project to rename.
 * @param {string} newName - The new name for the project.
 */
export async function renameProject(projectId, newName) {
    if (!isAuthReady) throw new Error("Firebase not ready for rename.");
    try {
        await updateDoc(getProjectRef(projectId), {
            name: newName,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        showStatusModal("Rename Error", `Failed to rename project: ${error.message}`, true);
    }
}

/**
 * Sets up the real-time listener for the project list.
 * @param {function} callback - Function to run on project changes.
 */
export function listenForProjects(callback) {
    if (!auth || !userId) {
        console.error("User not authenticated or listener called too early.");
        return () => {}; 
    }
    try {
        const projectsQuery = query(getUserProjectsCollection());
        return onSnapshot(projectsQuery, (snapshot) => {
            const projects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by most recently updated
            projects.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
            callback(projects);
        }, (error) => {
            console.error("Firestore Project Listener Error:", error);
            showStatusModal("Data Error", `Failed to fetch projects in real-time: ${error.message}`, true);
        });
    } catch (e) {
        console.error("Failed to initialize project listener:", e);
        return () => {}; 
    }
}

// --- Asset Management Operations (NEW) ---

/**
 * Saves an image file as a Base64 string asset under the current project.
 * @param {string} fileName - The original file name.
 * @param {string} base64Data - The Base64 representation of the image.
 * @returns {Promise<void>}
 */
export async function saveAsset(fileName, base64Data) {
    if (!currentProjectId) throw new Error("Cannot save asset: No current project loaded.");
    if (!isAuthReady) throw new Error("Firebase not ready for asset upload.");

    try {
        // Use the filename to ensure uniqueness for now, or you could use doc() for a random ID
        const assetRef = doc(getProjectAssetsCollection(currentProjectId), fileName);
        await setDoc(assetRef, {
            name: fileName,
            data: base64Data, // Store Base64 string directly
            uploadedAt: serverTimestamp(),
            projectId: currentProjectId
        });
        showStatusModal("Asset Saved", `Asset "${fileName}" uploaded successfully.`, false);

    } catch (error) {
        console.error("Error saving asset:", error);
        showStatusModal("Asset Error", `Failed to upload asset: ${error.message}`, true);
        throw error;
    }
}

/**
 * Fetches all assets for the given project ID.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<Array<object>>} - List of assets { id, name, data, uploadedAt }.
 */
export async function getAssets(projectId) {
    if (!isAuthReady) return [];
    try {
        const q = query(getProjectAssetsCollection(projectId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching assets:", error);
        showStatusModal("Asset Error", `Failed to fetch assets for project.`, true);
        return [];
    }
}

/**
 * Deletes a specific asset from the project.
 * @param {string} projectId - The project ID.
 * @param {string} assetId - The asset ID (filename).
 */
export async function deleteAsset(projectId, assetId) {
    if (!isAuthReady) throw new Error("Firebase not ready for asset deletion.");
    try {
        await deleteDoc(getAssetRef(projectId, assetId));
        showStatusModal("Asset Deleted", `Asset "${assetId}" removed successfully.`, false);
    } catch (error) {
        console.error("Error deleting asset:", error);
        showStatusModal("Deletion Error", `Failed to delete asset: ${error.message}`, true);
    }
}
