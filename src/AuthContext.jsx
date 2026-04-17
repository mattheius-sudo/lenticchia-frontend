// AuthContext.jsx
// Gestisce tutto lo stato di autenticazione dell'app.
// Wrappa l'intera app — qualsiasi componente può chiamare useAuth().

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

// ─── Contesto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
};

// ─── Profilo utente default ──────────────────────────────────────────────────
// Questi sono TUTTI i campi che useremo, inclusi quelli futuri (piano, punti...).
// Crearli subito evita di fare migration del DB in seguito.

const creaProfilo = (user) => ({
  uid: user.uid,
  email: user.email,
  nome: user.displayName || '',
  avatar: user.photoURL || '',
  piano: 'free',                     // 'free' | 'premium' — per il freemium futuro
  piano_scadenza: null,              // Timestamp, null = free/lifetime
  piano_origine: 'organic',          // 'organic' | 'punti' | 'stripe'
  punti: 0,
  livello: 'Osservatore',            // vedi tabella livelli in architettura
  scontrini_questa_settimana: 0,     // rate limit: max 2/giorno, 10/settimana
  scontrini_totali: 0,
  ultimo_reset_contatore: null,      // Timestamp del lunedì scorso
  data_iscrizione: serverTimestamp(),
  ultimo_accesso: serverTimestamp(),
  onboarding_completato: false,      // mostra la privacy screen al primo accesso
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);       // oggetto Firebase Auth User
  const [profilo, setProfilo] = useState(null);     // documento Firestore users/{uid}/profilo
  const [loading, setLoading] = useState(true);     // true finché non sappiamo se loggato o no
  const [erroreAuth, setErroreAuth] = useState(null);

  // ── Listener Auth: si attiva ad ogni cambio sessione ──────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUtente(firebaseUser);
        await caricaOCreaProfiloUtente(firebaseUser);
      } else {
        setUtente(null);
        setProfilo(null);
      }
      setLoading(false);
    });

    return unsubscribe; // cleanup alla dismount
  }, []);

  // ── Carica profilo Firestore, lo crea se è il primo accesso ───────────────
  const caricaOCreaProfiloUtente = async (firebaseUser) => {
    try {
      const profiloRef = doc(db, 'users', firebaseUser.uid, 'private', 'profilo');
      const profiloSnap = await getDoc(profiloRef);

      if (profiloSnap.exists()) {
        // Utente esistente: aggiorna solo ultimo_accesso
        const datiEsistenti = profiloSnap.data();
        await setDoc(profiloRef, { ultimo_accesso: serverTimestamp() }, { merge: true });
        setProfilo(datiEsistenti);
      } else {
        // Primo accesso: crea il profilo completo
        const nuovoProfilo = creaProfilo(firebaseUser);
        await setDoc(profiloRef, nuovoProfilo);
        setProfilo(nuovoProfilo);
      }
    } catch (err) {
      console.error('Errore caricamento profilo:', err);
      // Non blocchiamo l'app per un errore Firestore —
      // l'utente è comunque autenticato, il profilo si recupererà
    }
  };

  // ── Login con Google ──────────────────────────────────────────────────────
  const loginGoogle = async () => {
    setErroreAuth(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged gestisce il resto automaticamente
    } catch (err) {
      // Errori comuni: popup bloccato dal browser, utente chiude il popup
      if (err.code !== 'auth/popup-closed-by-user') {
        setErroreAuth('Accesso non riuscito. Riprova.');
        console.error('Errore login:', err);
      }
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Errore logout:', err);
    }
  };

  // ── Marca onboarding come completato ─────────────────────────────────────
  const completaOnboarding = async () => {
    if (!utente) return;
    try {
      const profiloRef = doc(db, 'users', utente.uid, 'private', 'profilo');
      await setDoc(profiloRef, { onboarding_completato: true }, { merge: true });
      setProfilo(prev => ({ ...prev, onboarding_completato: true }));
    } catch (err) {
      console.error('Errore aggiornamento onboarding:', err);
    }
  };

  // ── Valore esposto al resto dell'app ──────────────────────────────────────
  const value = {
    utente,             // Firebase User (uid, email, displayName, photoURL)
    profilo,            // documento Firestore con piano, punti, ecc.
    loading,            // true durante il check iniziale della sessione
    erroreAuth,
    isLoggedIn: !!utente,
    isPremium: profilo?.piano === 'premium',
    loginGoogle,
    logout,
    completaOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
