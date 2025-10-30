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
import { getFirestore, doc, setDoc, deleteDoc, collection, query, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showStatusModal } from "./utils.js";

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Configuration (Using provided global config or hardcoded fallback) ---
// The Canvas environment provides configuration via __firebase_config. 
// We use the hardcoded version as a reliable fallback.
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

// State management for current document
export let currentDocumentId = null;
export let currentDocumentContent = "";

// --- Paths ---
export const getUserDocumentsCollection = () => {
    if (!userId) throw new Error("User ID is not set. Auth failed.");
    return collection(db, 'artifacts', appId, 'users', userId, 'documents');
};
const getDocumentRef = (docId) => {
    if (!userId) throw new Error("User ID is not set. Auth failed.");
    return doc(db, 'artifacts', appId, 'users', userId, 'documents', docId);
};

// --- Initialization ---

/**
 * Initializes Firebase App and services. Does NOT handle sign-in directly.
 * The sign-in process is handled by the onAuthStateChanged listener in app.js
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
    
    // Check for custom token and use it if present
    if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
            console.error("Custom token sign-in failed:", error);
            // Fallback to anonymous sign-in if custom token fails (for local testing)
            signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
        });
    } else {
        // Fallback for environments without custom token
        signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
    }

    // Export the necessary objects
    return { db, auth };
}

/**
 * Attaches an observer to the authentication state.
 * @param {function} callback - Function to run on auth state change.
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
        // Auth state observer handles UI update
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
        // Auth state observer handles UI update
    } catch (error) {
        console.error("Sign-Out Error:", error);
        showStatusModal("Sign-Out Failed", `Could not sign out: ${error.message}`, true);
    }
}


// --- CRUD Operations (Rest of the file remains the same) ---

/**
 * Saves the current document content and name (if provided).
 * @param {string} latexContent - The LaTeX content to save.
 * @param {string} [name] - Optional new name for the document.
 */
export async function saveDocument(latexContent, name = null) {
    if (!isAuthReady || !currentDocumentId) {
        // Only warn if we are trying to save but aren't ready/haven't created a doc yet.
        if (isAuthReady) console.warn("Cannot save: No current document ID set.");
        return;
    }

    try {
        const data = {
            content: latexContent,
            updatedAt: new Date().toISOString()
        };
        if (name) {
            data.name = name;
        }

        const docRef = getDocumentRef(currentDocumentId);
        await setDoc(docRef, data, { merge: true });
        currentDocumentContent = latexContent;
        // console.log(`Document ${currentDocumentId} saved successfully.`);

    } catch (error) {
        console.error("Error saving document:", error);
        showStatusModal("Save Error", `Failed to save document: ${error.message}`, true);
    }
}

/**
 * Creates a new document and sets it as the current active document.
 * @param {string} name - The name of the new document.
 * @param {string} initialContent - The content to start the document with.
 * @returns {Promise<string>} The new document ID.
 */
export async function createNewDocument(name, initialContent) {
    if (!isAuthReady) throw new Error("Firebase not ready for document creation.");
    try {
        const newDocRef = doc(getUserDocumentsCollection());
        await setDoc(newDocRef, {
            name: name,
            content: initialContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        currentDocumentId = newDocRef.id;
        currentDocumentContent = initialContent;
        return newDocRef.id;
    } catch (error) {
        console.error("Error creating document:", error);
        showStatusModal("Creation Error", `Failed to create new document: ${error.message}`, true);
        throw error;
    }
}

/**
 * Deletes the specified document.
 * @param {string} docId - The ID of the document to delete.
 */
export async function deleteExistingDocument(docId) {
    if (!isAuthReady) throw new Error("Firebase not ready for deletion.");
    try {
        await deleteDoc(getDocumentRef(docId));
        // console.log(`Document ${docId} deleted successfully.`);
    } catch (error) {
        console.error("Error deleting document:", error);
        showStatusModal("Deletion Error", `Failed to delete document: ${error.message}`, true);
    }
}

/**
 * Renames the specified document.
 * @param {string} docId - The ID of the document to rename.
 * @param {string} newName - The new name for the document.
 */
export async function renameDocument(docId, newName) {
    if (!isAuthReady) throw new Error("Firebase not ready for rename.");
    try {
        await updateDoc(getDocumentRef(docId), {
            name: newName,
            updatedAt: new Date().toISOString()
        });
        // console.log(`Document ${docId} renamed to ${newName}.`);
    } catch (error) {
        console.error("Error renaming document:", error);
        showStatusModal("Rename Error", `Failed to rename document: ${error.message}`, true);
    }
}


/**
 * Sets up the real-time listener for the document list.
 * @param {function} callback - Function to run on document changes.
 */
export function listenForDocuments(callback) {
    if (!auth || !userId) {
        console.error("User not authenticated or listener called too early.");
        // Return a dummy function to unsubscribe
        return () => {}; 
    }
    try {
        const docQuery = query(getUserDocumentsCollection());
        return onSnapshot(docQuery, (snapshot) => {
            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by most recently updated
            documents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            callback(documents);
        }, (error) => {
            console.error("Firestore Listener Error:", error);
            showStatusModal("Data Error", `Failed to fetch documents in real-time: ${error.message}`, true);
        });
    } catch (e) {
        console.error("Failed to initialize listener:", e);
        return () => {}; 
    }
}