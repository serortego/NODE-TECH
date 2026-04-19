// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTXHsgPLdDXXL18QwLMJVRaaBrweFWKT0",
    authDomain: "node-tech.firebaseapp.com",
    projectId: "node-tech",
    storageBucket: "node-tech.firebasestorage.app",
    messagingSenderId: "44554000445",
    appId: "1:44554000445:web:189ca0acafce6913c1b254"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
