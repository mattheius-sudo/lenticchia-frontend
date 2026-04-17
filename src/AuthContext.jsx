// AuthContext.jsx
// Gestisce autenticazione + tutti i dati personali dell'utente:
//   - profilo (punti, piano, livello)
//   - lista_spesa (sincronizzata su cloud)
//   - preferenze (insegne attive + tessere fedeltà)
//   - prodotti_preferiti (prodotti con marca specifica)

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

// ─── Contesto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
};

// ─── Insegne disponibili ───────────────────────────────────────────────────────

export const INSEGNE_DISPONIBILI = [
  'Lidl', 'PIM/Agora', 'CTS', 'Eurospin',
  'Todis', 'MD Discount', 'Sacoph', 'Elite'
];

// ─── Profilo default ───────────────────────────────────────────────────────────

const creaProfilo = (user) => ({
  uid: user.uid,
  email: user.email,
  nome: user.displayName || '',
  avatar: user.photoURL || '',
  piano: 'free',
  piano_scadenza: null,
  piano_origine: 'organic',
  punti: 0,
  livello: 'Osservatore',
  scontrini_questa_settimana: 0,
  scontrini_totali: 0,
  ultimo_reset_contatore: null,
  data_iscrizione: serverTimestamp(),
  ultimo_accesso: serverTimestamp(),
  onboarding_completato: false,
});

// ─── Defaults documenti utente ────────────────────────────────────────────────

const DEFAULT_LISTA_SPESA = {
  items: ['pane', 'latte', 'pasta'],
  ultima_modifica: null,
};

const DEFAULT_PREFERENZE = {
  // Tutte le insegne attive per default — l'utente disattiva quelle che non vuole
  insegne_attive: [...INSEGNE_DISPONIBILI],
  // Tessere: { "Lidl": { attiva: true, numero: "1234567" }, "CTS": { attiva: true, numero: "" } }
  tessere: {},
  ultima_modifica: null,
};

const DEFAULT_PRODOTTI_PREFERITI = {
  items: [],
  // Struttura item: { id, label, nome_ricerca, categoria, marca, grammatura }
  ultima_modifica: null,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [listaSpesa, setListaSpesa] = useState(DEFAULT_LISTA_SPESA);
  const [preferenze, setPreferenze] = useState(DEFAULT_PREFERENZE);
  const [prodottiPreferiti, setProdottiPreferiti] = useState(DEFAULT_PRODOTTI_PREFERITI);
  const [loading, setLoading] = useState(true);
  const [erroreAuth, setErroreAuth] = useState(null);

  // Ref per il debounce del salvataggio lista spesa
  const debounceListaRef = useRef(null);

  // ── Listener Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUtente(firebaseUser);
        await caricaTuttiIDatiUtente(firebaseUser);
      } else {
        setUtente(null);
        setProfilo(null);
        setListaSpesa(DEFAULT_LISTA_SPESA);
        setPreferenze(DEFAULT_PREFERENZE);
        setProdottiPreferiti(DEFAULT_PRODOTTI_PREFERITI);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Carica tutti i documenti dell'utente in parallelo ─────────────────────
  const caricaTuttiIDatiUtente = async (firebaseUser) => {
    const uid = firebaseUser.uid;
    const refs = {
      profilo:           doc(db, 'users', uid, 'private', 'profilo'),
      lista_spesa:       doc(db, 'users', uid, 'private', 'lista_spesa'),
      preferenze:        doc(db, 'users', uid, 'private', 'preferenze'),
      prodotti_preferiti: doc(db, 'users', uid, 'private', 'prodotti_preferiti'),
    };

    try {
      // Carica tutti in parallelo — una sola roundtrip
      const [profiloSnap, listaSnap, prefSnap, prodSnap] = await Promise.all([
        getDoc(refs.profilo),
        getDoc(refs.lista_spesa),
        getDoc(refs.preferenze),
        getDoc(refs.prodotti_preferiti),
      ]);

      // Profilo
      if (profiloSnap.exists()) {
        setProfilo(profiloSnap.data());
        await setDoc(refs.profilo, { ultimo_accesso: serverTimestamp() }, { merge: true });
      } else {
        const nuovoProfilo = creaProfilo(firebaseUser);
        await setDoc(refs.profilo, nuovoProfilo);
        setProfilo(nuovoProfilo);
      }

      // Lista spesa — migra da localStorage se è il primo accesso
      if (listaSnap.exists()) {
        setListaSpesa(listaSnap.data());
      } else {
        // Prima volta: prova a migrare da localStorage
        let itemsLocali = DEFAULT_LISTA_SPESA.items;
        try {
          const locale = localStorage.getItem('lenticchia_lista');
          if (locale) {
            itemsLocali = locale.split('\n').map(i => i.trim()).filter(Boolean);
          }
        } catch {}
        const nuovaLista = { items: itemsLocali, ultima_modifica: serverTimestamp() };
        await setDoc(refs.lista_spesa, nuovaLista);
        setListaSpesa(nuovaLista);
      }

      // Preferenze insegne + tessere
      if (prefSnap.exists()) {
        setPreferenze(prefSnap.data());
      } else {
        await setDoc(refs.preferenze, DEFAULT_PREFERENZE);
        setPreferenze(DEFAULT_PREFERENZE);
      }

      // Prodotti preferiti
      if (prodSnap.exists()) {
        setProdottiPreferiti(prodSnap.data());
      } else {
        await setDoc(refs.prodotti_preferiti, DEFAULT_PRODOTTI_PREFERITI);
        setProdottiPreferiti(DEFAULT_PRODOTTI_PREFERITI);
      }

    } catch (err) {
      console.error('Errore caricamento dati utente:', err);
    }
  };

  // ── Lista spesa — aggiorna con debounce (non scrive ad ogni tasto) ─────────
  const aggiornaListaSpesa = (nuoviItems) => {
    // Aggiorna UI immediatamente
    setListaSpesa(prev => ({ ...prev, items: nuoviItems }));

    // Salva su Firestore dopo 1.5s di inattività
    if (debounceListaRef.current) clearTimeout(debounceListaRef.current);
    debounceListaRef.current = setTimeout(async () => {
      if (!utente) return;
      try {
        await setDoc(
          doc(db, 'users', utente.uid, 'private', 'lista_spesa'),
          { items: nuoviItems, ultima_modifica: serverTimestamp() },
          { merge: true }
        );
      } catch (err) {
        console.error('Errore salvataggio lista:', err);
      }
    }, 1500);
  };

  // ── Preferenze insegne ────────────────────────────────────────────────────
  const aggiornaPreferenze = async (nuovePreferenze) => {
    setPreferenze(nuovePreferenze);
    if (!utente) return;
    try {
      await setDoc(
        doc(db, 'users', utente.uid, 'private', 'preferenze'),
        { ...nuovePreferenze, ultima_modifica: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('Errore salvataggio preferenze:', err);
    }
  };

  const toggleInsegna = async (insegna) => {
    const attive = preferenze.insegne_attive || [...INSEGNE_DISPONIBILI];
    const nuoveAttive = attive.includes(insegna)
      ? attive.filter(i => i !== insegna)
      : [...attive, insegna];
    await aggiornaPreferenze({ ...preferenze, insegne_attive: nuoveAttive });
  };

  const aggiornaTessera = async (insegna, attiva, numero = '') => {
    const tessere = { ...(preferenze.tessere || {}) };
    if (!attiva && !numero) {
      delete tessere[insegna];
    } else {
      tessere[insegna] = { attiva, numero: numero.trim() };
    }
    await aggiornaPreferenze({ ...preferenze, tessere });
  };

  // ── Prodotti preferiti ────────────────────────────────────────────────────
  const aggiungiProdottoPreferito = async (prodotto) => {
    const nuovoId = `pref_${Date.now()}`;
    const nuovoProdotto = { id: nuovoId, ...prodotto };
    const nuoviItems = [...(prodottiPreferiti.items || []), nuovoProdotto];
    setProdottiPreferiti(prev => ({ ...prev, items: nuoviItems }));
    if (!utente) return;
    try {
      await setDoc(
        doc(db, 'users', utente.uid, 'private', 'prodotti_preferiti'),
        { items: nuoviItems, ultima_modifica: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('Errore salvataggio prodotto preferito:', err);
    }
  };

  const rimuoviProdottoPreferito = async (id) => {
    const nuoviItems = (prodottiPreferiti.items || []).filter(p => p.id !== id);
    setProdottiPreferiti(prev => ({ ...prev, items: nuoviItems }));
    if (!utente) return;
    try {
      await setDoc(
        doc(db, 'users', utente.uid, 'private', 'prodotti_preferiti'),
        { items: nuoviItems, ultima_modifica: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('Errore rimozione prodotto preferito:', err);
    }
  };

  // ── Login / Logout ────────────────────────────────────────────────────────
  const loginGoogle = async () => {
    setErroreAuth(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErroreAuth('Accesso non riuscito. Riprova.');
        console.error('Errore login:', err);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Errore logout:', err);
    }
  };

  const completaOnboarding = async () => {
    if (!utente) return;
    try {
      const profiloRef = doc(db, 'users', utente.uid, 'private', 'profilo');
      await setDoc(profiloRef, { onboarding_completato: true }, { merge: true });
      setProfilo(prev => ({ ...prev, onboarding_completato: true }));
    } catch (err) {
      console.error('Errore onboarding:', err);
    }
  };

  // ── Valore esposto ────────────────────────────────────────────────────────
  const value = {
    // Auth
    utente,
    profilo,
    loading,
    erroreAuth,
    isLoggedIn: !!utente,
    isPremium: profilo?.piano === 'premium',
    loginGoogle,
    logout,
    completaOnboarding,

    // Lista spesa
    listaSpesa,
    aggiornaListaSpesa,

    // Preferenze insegne + tessere
    preferenze,
    toggleInsegna,
    aggiornaTessera,

    // Prodotti preferiti
    prodottiPreferiti,
    aggiungiProdottoPreferito,
    rimuoviProdottoPreferito,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
