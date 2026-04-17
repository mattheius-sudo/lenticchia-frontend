// firebase.js
// Configurazione centralizzata Firebase.
// Tutti i moduli importano da qui — mai chiamare initializeApp altrove.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDJOAAKn9SBWI-yEfZD4xLu3RVKEyY5aWU",
  authDomain: "roma-risparmia.firebaseapp.com",
  projectId: "roma-risparmia",
  storageBucket: "roma-risparmia.appspot.com",
  messagingSenderId: "1028350520233",
  appId: "1:1028350520233:web:26db230805559ea0f9b2b8"
};

// Evita il crash "Firebase App named '[DEFAULT]' already exists"
// che si verifica in dev con React hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Forza la selezione account Google ad ogni login
// (utile se l'utente vuole cambiare account)
googleProvider.setCustomParameters({ prompt: 'select_account' });
