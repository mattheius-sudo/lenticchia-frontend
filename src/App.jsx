import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, increment, getDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth, INSEGNE_DISPONIBILI, CITTA_DISPONIBILI, INSEGNE_PER_AREA, AREE_DISPONIBILI } from './AuthContext';
// statoVolantini viene ora passato come prop anche alla selezione supermercati
import {
  Search,
  Share2,
  ListTodo,
  Info,
  Tag,
  Clock,
  AlertCircle,
  Star,
  SlidersHorizontal,
  History,
  Store,
  ArrowLeft,
  User,
  LogOut,
  ChevronRight,
  Check,
  Shield,
  Receipt,
  TrendingDown,
  TrendingUp,
  X,
  Sprout,
  Camera,
  CheckCircle,
  Loader,
  BarChart2,
  PieChart,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ClipboardCheck,
  Pencil,
  AlertTriangle,
  Flag,
} from 'lucide-react';

// ─── Font import (Lora + DM Sans via Google Fonts) ───────────────────────────
// Aggiunto nel <head> di index.html — qui solo il riferimento per chiarezza:
// <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          '#F9F8F4',  // Farina
  surface:     '#FFFFFF',
  primary:     '#647144',  // Verde Lenticchia
  primaryDark: '#525E36',  // Verde Oliva Scuro
  accent:      '#D47A4A',  // Terracotta
  textPrimary: '#2C3026',  // Inchiostro Oliva
  textSec:     '#858A7A',  // Salvia Cenere
  border:      '#EBE6DC',  // Corda
};

// ─── Icona Lenticchia ─────────────────────────────────────────────────────────
const IconaLenticchia = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="12" rx="10" ry="6.5" fill="currentColor" opacity="0.12"/>
    <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="currentColor" strokeWidth="1.6"/>
    <ellipse cx="12" cy="12" rx="5" ry="3.2" fill="currentColor" opacity="0.3"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2.5" opacity="0.45"/>
    <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2.5" opacity="0.45"/>
  </svg>
);

// ─── Badge insegne — sistema pastello (design system Gemini) ──────────────────
// Invece di sfondi pieni, background 10% opacità + testo + bordo colorati
const BADGE_INSEGNE = {
  'Lidl':        'bg-yellow-50  text-yellow-800  border border-yellow-200',
  'PIM/Agora':   'bg-emerald-50 text-emerald-800 border border-emerald-200',
  'PIM/Agorà':   'bg-emerald-50 text-emerald-800 border border-emerald-200',
  'Agora':       'bg-emerald-50 text-emerald-800 border border-emerald-200',
  'Agorà':       'bg-emerald-50 text-emerald-800 border border-emerald-200',
  'PIM':         'bg-emerald-50 text-emerald-800 border border-emerald-200',
  'CTS':         'bg-blue-50    text-blue-800    border border-blue-200',
  'Eurospin':    'bg-red-50     text-red-800     border border-red-200',
  'Todis':       'bg-orange-50  text-orange-800  border border-orange-200',
  'MD Discount': 'bg-purple-50  text-purple-800  border border-purple-200',
  'MD':          'bg-purple-50  text-purple-800  border border-purple-200',
  'Sacoph':      'bg-teal-50    text-teal-800    border border-teal-200',
  'Elite':       'bg-amber-50   text-amber-800   border border-amber-200',
  'default':     'bg-stone-50   text-stone-700   border border-stone-200',
};

// Badge card negozi (sfondo pieno per i tile della griglia)
const TILE_INSEGNE = {
  'Lidl':        'bg-yellow-400  text-yellow-900',
  'PIM/Agora':   'bg-emerald-700 text-white',
  'PIM/Agorà':   'bg-emerald-700 text-white',
  'Agora':       'bg-emerald-700 text-white',
  'Agorà':       'bg-emerald-700 text-white',
  'PIM':         'bg-emerald-700 text-white',
  'CTS':         'bg-blue-700    text-white',
  'Eurospin':    'bg-red-700     text-white',
  'Todis':       'bg-orange-600  text-white',
  'MD Discount': 'bg-purple-700  text-white',
  'MD':          'bg-purple-700  text-white',
  'Sacoph':      'bg-teal-700    text-white',
  'Elite':       'bg-amber-700   text-white',
  'default':     'bg-stone-600   text-white',
};

// Determina l'etichetta corretta per il prezzo normalizzato
// in base alla grammatura del prodotto (es. "1L" -> "/L", "500g" -> "/kg", "al kg" -> "/kg")
const etichettaUnitaPrezzo = (grammatura) => {
  if (!grammatura) return '/kg';
  const g = grammatura.toLowerCase().trim();
  // Liquidi: mostra /L
  if (/\d\s*(l|litri|litro)\b/.test(g)) return '/L';
  if (/\d\s*(ml|cl)\b/.test(g)) return '/L';
  if (g === 'al litro') return '/L';
  // Al pezzo
  if (g === 'al pezzo' || g === 'al pz') return '/pz';
  // Peso: /kg (default)
  return '/kg';
};

const getBadgeInsegna = (insegna) => {
  if (!insegna) return BADGE_INSEGNE['default'];
  if (BADGE_INSEGNE[insegna]) return BADGE_INSEGNE[insegna];
  const key = Object.keys(BADGE_INSEGNE).find(k => k !== 'default' && insegna.toLowerCase().includes(k.toLowerCase()));
  return key ? BADGE_INSEGNE[key] : BADGE_INSEGNE['default'];
};
const getTileInsegna = (insegna) => {
  if (!insegna) return TILE_INSEGNE['default'];
  if (TILE_INSEGNE[insegna]) return TILE_INSEGNE[insegna];
  const key = Object.keys(TILE_INSEGNE).find(k => k !== 'default' && insegna.toLowerCase().includes(k.toLowerCase()));
  return key ? TILE_INSEGNE[key] : TILE_INSEGNE['default'];
};

// ─── Costanti ─────────────────────────────────────────────────────────────────

const CATEGORIE = [
  { id: 'tutte', label: 'Tutto' },
  { id: 'carne', label: 'Carne' },
  { id: 'pesce', label: 'Pesce' },
  { id: 'frutta_verdura', label: 'Frutta/Verdura' },
  { id: 'dispensa', label: 'Dispensa' },
  { id: 'freschissimi', label: 'Freschissimi' },
  { id: 'surgelati', label: 'Surgelati' },
  { id: 'bevande', label: 'Bevande' },
  { id: 'casa_igiene', label: 'Casa & Igiene' }
];

const MOCK_OFFERTE = [
  { id: '1', nome: 'Pasta Fusilli', marca: 'Barilla', grammatura: '500g', categoria: 'dispensa', prezzo: 0.79, prezzo_kg: 1.58, insegna: 'Lidl', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-18' },
  { id: '2', nome: 'Pasta Penne Rigate', marca: 'De Cecco', grammatura: '500g', categoria: 'dispensa', prezzo: 0.99, prezzo_kg: 1.98, insegna: 'PIM/Agora', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-12', valido_fino: '2026-04-16' },
  { id: '3', nome: 'Latte Parzialmente Scremato', marca: 'Granarolo', grammatura: '1L', categoria: 'bevande', prezzo: 0.89, prezzo_kg: 0.89, insegna: 'Todis', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-14', valido_fino: '2026-04-20' },
  { id: '4', nome: 'Filetto di Maiale', marca: null, grammatura: 'al kg', categoria: 'carne', prezzo: 6.90, prezzo_kg: 6.90, insegna: 'Eurospin', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-17' },
  { id: '5', nome: 'Mele Fuji', marca: 'Melinda', grammatura: 'al kg', categoria: 'frutta_verdura', prezzo: 1.49, prezzo_kg: 1.49, insegna: 'CTS', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-15', valido_fino: '2026-04-25' },
  { id: '6', nome: 'Passata di Pomodoro', marca: 'Mutti', grammatura: '700g', categoria: 'dispensa', prezzo: 0.85, prezzo_kg: 1.21, insegna: 'MD Discount', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-16' },
  { id: '7', nome: 'Pane Bauletto', marca: 'Mulino Bianco', grammatura: '400g', categoria: 'dispensa', prezzo: 1.10, prezzo_kg: 2.75, insegna: 'Lidl', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-18' },
  { id: '8', nome: 'Orata Fresca', marca: null, grammatura: 'al kg', categoria: 'pesce', prezzo: 9.90, prezzo_kg: 9.90, insegna: 'PIM/Agora', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-12', valido_fino: '2026-04-16' },
  { id: '9', nome: 'Detersivo Piatti', marca: 'Svelto', grammatura: '1L', categoria: 'casa_igiene', prezzo: 1.25, prezzo_kg: 1.25, insegna: 'Sacoph', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-15', valido_fino: '2026-04-30' },
];

const MOCK_STATO = [
  { id: 'Lidl', insegna: 'Lidl', valido_fino: '2026-04-18', n_prodotti: 145 },
  { id: 'PIM', insegna: 'PIM/Agora', valido_fino: '2026-04-16', n_prodotti: 89 },
  { id: 'Todis', insegna: 'Todis', valido_fino: '2026-04-20', n_prodotti: 112 },
  { id: 'Eurospin', insegna: 'Eurospin', valido_fino: '2026-04-17', n_prodotti: 95 },
  { id: 'CTS', insegna: 'CTS', valido_fino: '2026-04-25', n_prodotti: 60 },
  { id: 'MD', insegna: 'MD Discount', valido_fino: '2026-04-16', n_prodotti: 130 },
  { id: 'Sacoph', insegna: 'Sacoph', valido_fino: '2026-04-30', n_prodotti: 45 },
];

// ─── Mock scontrini per empty state demo ──────────────────────────────────────
const MOCK_SCONTRINI = [
  {
    id: 's1', insegna: 'Lidl', data_acquisto: '2026-04-10', totale_scontrino: 34.20,
    prodotti: [
      { nome: 'Pasta Fusilli', prezzo: 0.79, categoria: 'dispensa', quantita: 2 },
      { nome: 'Latte Parzialmente Scremato', prezzo: 0.89, categoria: 'bevande', quantita: 3 },
      { nome: 'Pane Bauletto', prezzo: 1.10, categoria: 'dispensa', quantita: 1 },
      { nome: 'Mele Fuji', prezzo: 2.30, categoria: 'frutta_verdura', quantita: 1 },
      { nome: 'Detersivo Piatti', prezzo: 1.25, categoria: 'casa_igiene', quantita: 1 },
      { nome: 'Yogurt Bianco', prezzo: 0.55, categoria: 'freschissimi', quantita: 4 },
      { nome: 'Pollo Intero', prezzo: 6.80, categoria: 'carne', quantita: 1 },
      { nome: 'Succo Arancia', prezzo: 1.99, categoria: 'bevande', quantita: 1 },
      { nome: 'Biscotti Digestive', prezzo: 1.49, categoria: 'dispensa', quantita: 1 },
      { nome: 'Carta Igienica', prezzo: 3.99, categoria: 'casa_igiene', quantita: 1 },
    ]
  },
  {
    id: 's2', insegna: 'Eurospin', data_acquisto: '2026-04-04', totale_scontrino: 22.50,
    prodotti: [
      { nome: 'Filetto di Maiale', prezzo: 6.90, categoria: 'carne', quantita: 1 },
      { nome: 'Passata Pomodoro', prezzo: 0.85, categoria: 'dispensa', quantita: 3 },
      { nome: 'Olio Extravergine', prezzo: 5.49, categoria: 'dispensa', quantita: 1 },
      { nome: 'Uova Fresche', prezzo: 1.99, categoria: 'freschissimi', quantita: 1 },
      { nome: 'Zucchero', prezzo: 0.99, categoria: 'dispensa', quantita: 1 },
    ]
  },
  {
    id: 's3', insegna: 'Todis', data_acquisto: '2026-03-28', totale_scontrino: 41.80,
    prodotti: [
      { nome: 'Latte Parzialmente Scremato', prezzo: 0.99, categoria: 'bevande', quantita: 4 },
      { nome: 'Prosciutto Cotto', prezzo: 3.20, categoria: 'freschissimi', quantita: 1 },
      { nome: 'Pasta Penne', prezzo: 0.89, categoria: 'dispensa', quantita: 3 },
      { nome: 'Detersivo Lavatrice', prezzo: 5.99, categoria: 'casa_igiene', quantita: 1 },
      { nome: 'Acqua Naturale 6x1.5L', prezzo: 2.49, categoria: 'bevande', quantita: 1 },
      { nome: 'Formaggio Grana', prezzo: 4.80, categoria: 'freschissimi', quantita: 1 },
      { nome: 'Pomodori Ramati', prezzo: 1.90, categoria: 'frutta_verdura', quantita: 1 },
      { nome: 'Tonno al naturale', prezzo: 1.29, categoria: 'dispensa', quantita: 3 },
    ]
  },
  {
    id: 's4', insegna: 'PIM/Agora', data_acquisto: '2026-03-21', totale_scontrino: 18.60,
    prodotti: [
      { nome: 'Orata Fresca', prezzo: 9.90, categoria: 'pesce', quantita: 1 },
      { nome: 'Limoni', prezzo: 1.20, categoria: 'frutta_verdura', quantita: 1 },
      { nome: 'Prezzemolo', prezzo: 0.50, categoria: 'frutta_verdura', quantita: 1 },
      { nome: 'Vino Bianco', prezzo: 3.99, categoria: 'bevande', quantita: 1 },
    ]
  },
  {
    id: 's5', insegna: 'Lidl', data_acquisto: '2026-03-15', totale_scontrino: 29.40,
    prodotti: [
      { nome: 'Pasta Fusilli', prezzo: 0.79, categoria: 'dispensa', quantita: 2 },
      { nome: 'Latte Parzialmente Scremato', prezzo: 0.79, categoria: 'bevande', quantita: 3 },
      { nome: 'Pollo Intero', prezzo: 5.90, categoria: 'carne', quantita: 1 },
      { nome: 'Biscotti Digestive', prezzo: 1.49, categoria: 'dispensa', quantita: 1 },
      { nome: 'Carta Igienica', prezzo: 3.49, categoria: 'casa_igiene', quantita: 1 },
      { nome: 'Spinaci Surgelati', prezzo: 1.35, categoria: 'surgelati', quantita: 2 },
    ]
  },
  {
    id: 's6', insegna: 'MD Discount', data_acquisto: '2026-03-08', totale_scontrino: 15.20,
    prodotti: [
      { nome: 'Passata Pomodoro', prezzo: 0.79, categoria: 'dispensa', quantita: 4 },
      { nome: 'Pasta Rigatoni', prezzo: 0.75, categoria: 'dispensa', quantita: 3 },
      { nome: 'Farina 00', prezzo: 0.89, categoria: 'dispensa', quantita: 2 },
    ]
  },
  {
    id: 's7', insegna: 'Eurospin', data_acquisto: '2026-02-28', totale_scontrino: 38.10,
    prodotti: [
      { nome: 'Costine di Maiale', prezzo: 8.50, categoria: 'carne', quantita: 1 },
      { nome: 'Pasta Fusilli', prezzo: 0.79, categoria: 'dispensa', quantita: 2 },
      { nome: 'Latte Parzialmente Scremato', prezzo: 0.79, categoria: 'bevande', quantita: 3 },
      { nome: 'Sapone Mani', prezzo: 1.49, categoria: 'casa_igiene', quantita: 2 },
      { nome: 'Surgelati Misti', prezzo: 3.99, categoria: 'surgelati', quantita: 1 },
    ]
  },
  {
    id: 's8', insegna: 'Lidl', data_acquisto: '2026-02-15', totale_scontrino: 31.70,
    prodotti: [
      { nome: 'Latte Parzialmente Scremato', prezzo: 0.79, categoria: 'bevande', quantita: 4 },
      { nome: 'Pollo Intero', prezzo: 5.50, categoria: 'carne', quantita: 1 },
      { nome: 'Biscotti', prezzo: 1.29, categoria: 'dispensa', quantita: 2 },
    ]
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const getOggi = () => new Date().toISOString().split('T')[0];
const getDomani = () => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().split('T')[0]; };
const calcGiorniRimanenti = (d) => Math.ceil((new Date(d) - new Date(getOggi())) / 86400000);
const formattaPrezzo = (p) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p);

// Costanti di data — calcolate una volta sola al caricamento del modulo
// (evita di richiamare getOggi()/getDomani() in ogni componente/render)
const OGGI   = getOggi();
const DOMANI = getDomani();

// Helper budget — evita la duplicazione delle IIFE nel JSX del Verdetto Spesa
const calcolaBudgetDiff = (totalePrezzo, budgetSalvato) => {
  if (!budgetSalvato) return null;
  const diff = totalePrezzo - budgetSalvato;
  return { diff, dentro: diff <= 0, perc: Math.abs(Math.round((diff / budgetSalvato) * 100)) };
};

const LIVELLI = [
  { nome: 'Osservatore', min: 0,    colore: 'bg-stone-100 text-stone-600' },
  { nome: 'Esploratore', min: 50,   colore: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { nome: 'Cacciatore',  min: 150,  colore: 'bg-[#EEF2E4] text-[#525E36] border border-[#C8D9A0]' },
  { nome: 'Stratega',    min: 400,  colore: 'bg-purple-50 text-purple-700 border border-purple-200' },
  { nome: 'Guru',        min: 1000, colore: 'bg-amber-50 text-amber-700 border border-amber-200' },
];

const getLivello = (p = 0) => [...LIVELLI].reverse().find(l => p >= l.min) || LIVELLI[0];
const getProssimoLivello = (p = 0) => { const i = LIVELLI.findIndex(l => p < l.min); return i === -1 ? null : LIVELLI[i]; };

// ─── Segnalazione errore prezzi (Task 2) ──────────────────────────────────────
// Architettura:
//   - useSegnalazioniStore() → chiamato UNA VOLTA in TabOfferte
//   - passa { segnalazioniInviate, segnala } giù alle card come props
//   - UI ottimistica: la bandierina diventa rossa immediatamente
//   - Firestore: increment atomico su campo "segnalazioni"
//   - Se segnalazioni >= SOGLIA → nascosto:true → sparisce dalla vista pubblica

const SOGLIA_SEGNALAZIONI = 3;

const useSegnalazioniStore = () => {
  const [segnalati, setSegnalati] = useState(new Set());

  const toggleSegnalazione = async (collectionName, docId) => {
    const giaSegnalato = segnalati.has(docId);

    // UI ottimistica immediata
    setSegnalati(prev => {
      const n = new Set(prev);
      giaSegnalato ? n.delete(docId) : n.add(docId);
      return n;
    });

    try {
      const ref = doc(db, collectionName, docId);

      if (giaSegnalato) {
        // Rimozione: decrementa ma non andare sotto 0
        const snap = await getDoc(ref);
        const attuale = snap.data()?.segnalazioni || 0;
        if (attuale > 0) {
          await updateDoc(ref, { segnalazioni: increment(-1) });
          // Se era nascosto per segnalazioni e ora scende sotto la soglia, riappare
          if (attuale - 1 < SOGLIA_SEGNALAZIONI && snap.data()?.nascosto === true) {
            await updateDoc(ref, { nascosto: false });
          }
        }
      } else {
        // Aggiunta: incrementa
        await updateDoc(ref, { segnalazioni: increment(1) });
        // Nascondi automaticamente se raggiunge la soglia
        const snap = await getDoc(ref);
        if (snap.exists() && (snap.data().segnalazioni || 0) >= SOGLIA_SEGNALAZIONI) {
          await updateDoc(ref, { nascosto: true });
        }
      }
    } catch (err) {
      console.error('Errore segnalazione:', err);
      // Rollback ottimismo in caso di errore
      setSegnalati(prev => {
        const n = new Set(prev);
        giaSegnalato ? n.add(docId) : n.delete(docId);
        return n;
      });
    }
  };

  return { segnalati, segnala: toggleSegnalazione };
};

// Bottone bandierina riutilizzabile
const BottoneSegnala = ({ docId, collectionName, segnalati, segnala, size = 12 }) => {
  const isSegnalato = segnalati.has(docId);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); segnala(collectionName, docId); }}
      className="p-1 rounded-full transition-all active:scale-90 shrink-0"
      title={isSegnalato ? 'Rimuovi segnalazione' : 'Segnala prezzo errato'}
      style={{ color: isSegnalato ? T.accent : T.border }}
    >
      <Flag size={size} strokeWidth={1.5}
        style={{ fill: isSegnalato ? T.accent : 'none' }} />
    </button>
  );
};

// ─── Reputazione utente — soglie ──────────────────────────────────────────────
const REP_CONFERME_RICHIESTE_DEFAULT = 3;  // conferme per attivare offerta
const REP_SOGLIA_ALTA  = 70;  // 1 sola conferma per attivare
const REP_SOGLIA_BASSA = 30;  // richiede N+2 conferme

// ─── Utilità GPS ──────────────────────────────────────────────────────────────

/** Richiede posizione corrente. Restituisce {lat, lng} o lancia errore. */
const ottieniPosizione = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('GPS non supportato dal browser'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    err => reject(new Error(
      err.code === 1 ? 'Permesso GPS negato — abilitalo nelle impostazioni' :
      err.code === 2 ? 'Posizione non disponibile' :
      'Timeout GPS — riprova'
    )),
    { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
  );
});

// ─── Utilità EXIF ──────────────────────────────────────────────────────────────
// Usa exifr via CDN (caricato lazy solo quando serve).
// Se EXIF non disponibile (browser ha strippato i metadati) → graceful pass.
// Blocca solo se il timestamp EXIF è verificato e > 1h nel passato.

const caricaExifr = () => new Promise((resolve) => {
  if (window.exifr) { resolve(window.exifr); return; }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/exifr/dist/lite.umd.js';
  script.onload = () => resolve(window.exifr);
  script.onerror = () => resolve(null); // fallback: exifr non disponibile
  document.head.appendChild(script);
});

/**
 * Verifica EXIF di un file immagine.
 * Ritorna { ok: bool, motivo: string | null, exif: obj | null, exif_verificato: bool }
 */
const verificaExif = async (file) => {
  try {
    const exifr = await caricaExifr();
    if (!exifr) return { ok: true, motivo: null, exif: null, exif_verificato: false };

    const dati = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'DateTime', 'GPSLatitude', 'GPSLongitude'],
      silentErrors: true,
    }).catch(() => null);

    if (!dati) return { ok: true, motivo: null, exif: null, exif_verificato: false };

    const dataFoto = dati.DateTimeOriginal || dati.DateTime;
    if (dataFoto) {
      const diffMs = Date.now() - new Date(dataFoto).getTime();
      const diffOre = diffMs / 3600000;
      if (diffOre > 1) {
        return {
          ok: false,
          motivo: `Foto scattata ${Math.round(diffOre)}h fa — deve essere recente (max 1h)`,
          exif: dati,
          exif_verificato: true,
        };
      }
    }

    return {
      ok: true,
      motivo: null,
      exif: dati,
      exif_verificato: !!dataFoto,
    };
  } catch {
    // Mai bloccare per errori di parsing EXIF
    return { ok: true, motivo: null, exif: null, exif_verificato: false };
  }
};

// ─── Modifica offerte — hook + componenti ────────────────────────────────────

// Campi modificabili da un utente (Guru: diretti, altri: proposta)
const CAMPI_EDITABILI = [
  { key: 'nome',       label: 'Nome prodotto',  type: 'text' },
  { key: 'marca',      label: 'Marca',          type: 'text' },
  { key: 'grammatura', label: 'Grammatura',     type: 'text' },
  { key: 'prezzo',     label: 'Prezzo (€)',     type: 'number' },
  { key: 'categoria',  label: 'Categoria',      type: 'select' },
];

const CATEGORIE_MODIFICA = CATEGORIE.filter(c => c.id !== 'tutte');

// Hook: gestisce lettura proposta e logica voto/approvazione
const usePropostaOfferta = (offertaId) => {
  const { utente, profilo } = useAuth();
  const [proposta, setProposta] = useState(null);
  const [loading, setLoading]   = useState(false);
  const isGuru = (profilo?.punti || 0) >= 1000;

  // Carica proposta esistente dal documento offerta
  const caricaProposta = useCallback(async () => {
    if (!offertaId) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'offerte_attive', offertaId));
      if (snap.exists()) setProposta(snap.data().proposta_modifica || null);
    } catch {}
    setLoading(false);
  }, [offertaId]);

  // Guru: modifica diretta sui campi dell'offerta
  const modificaDiretta = async (campi) => {
    if (!utente || !isGuru) return;
    const ref = doc(db, 'offerte_attive', offertaId);
    const aggiornamenti = { ...campi };
    // Se cambia il prezzo ricalcola prezzo_kg se c'è grammatura
    if (campi.prezzo && campi.grammatura) {
      const grammi = parseFloat(campi.grammatura);
      if (!isNaN(grammi) && grammi > 0) {
        aggiornamenti.prezzo_kg = parseFloat((campi.prezzo / grammi * 1000).toFixed(2));
      }
    }
    aggiornamenti.ultima_modifica_da = utente.uid;
    aggiornamenti.ultima_modifica_il = serverTimestamp();
    await updateDoc(ref, aggiornamenti);
  };

  // Utente base: invia proposta di modifica
  const inviaProposta = async (campi) => {
    if (!utente) return;
    const ref = doc(db, 'offerte_attive', offertaId);
    // Legge doc fresco per non sovrascrivere proposta esistente
    const snap = await getDoc(ref);
    if (snap.data()?.proposta_modifica?.stato === 'pending') {
      throw new Error('proposta_esistente');
    }
    const nuovaProposta = {
      campi,
      uid_proponente: utente.uid,
      data_proposta:  serverTimestamp(),
      voti_guru:      [],
      voti_utenti:    [],
      stato:          'pending',
    };
    await updateDoc(ref, { proposta_modifica: nuovaProposta });
    setProposta(nuovaProposta);
  };

  // Vota una proposta esistente (con runTransaction per atomicità)
  const votaProposta = async () => {
    if (!utente || !proposta) return;
    const uid    = utente.uid;
    const ref    = doc(db, 'offerte_attive', offertaId);
    const SOGLIA = 3;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const p    = snap.data()?.proposta_modifica;
      if (!p || p.stato !== 'pending') throw new Error('nessuna proposta');

      if (p.voti_guru?.includes(uid) || p.voti_utenti?.includes(uid)) {
        throw new Error('già votato');
      }

      const nuoviGuru   = isGuru  ? [...(p.voti_guru   || []), uid] : (p.voti_guru   || []);
      const nuoviUtenti = !isGuru ? [...(p.voti_utenti || []), uid] : (p.voti_utenti || []);
      const approvata   = nuoviGuru.length >= 1 || nuoviUtenti.length >= SOGLIA;

      if (approvata) {
        // Promuovi i campi proposti direttamente sull'offerta
        tx.update(ref, {
          ...p.campi,
          proposta_modifica:  null,
          ultima_modifica_da: uid,
          ultima_modifica_il: serverTimestamp(),
        });
        setProposta(null);
      } else {
        tx.update(ref, {
          'proposta_modifica.voti_guru':   isGuru  ? arrayUnion(uid) : p.voti_guru   || [],
          'proposta_modifica.voti_utenti': !isGuru ? arrayUnion(uid) : p.voti_utenti || [],
        });
        setProposta({ ...p, voti_guru: nuoviGuru, voti_utenti: nuoviUtenti });
      }
    });
  };

  return { proposta, loading, isGuru, caricaProposta, modificaDiretta, inviaProposta, votaProposta };
};


// Modal editing offerta — bottom sheet
const ModalEditOfferta = ({ offerta, onChiudi }) => {
  const { utente, profilo } = useAuth();
  const isGuru = (profilo?.punti || 0) >= 1000;
  const { proposta, loading, caricaProposta, modificaDiretta, inviaProposta, votaProposta } =
    usePropostaOfferta(offerta?.id);

  const [campi, setCampi] = useState({
    nome:       offerta?.nome       || '',
    marca:      offerta?.marca      || '',
    grammatura: offerta?.grammatura || '',
    prezzo:     offerta?.prezzo     || '',
    categoria:  offerta?.categoria  || '',
  });
  const [stato, setStato]     = useState('idle'); // idle | salvando | ok | errore
  const [errMsg, setErrMsg]   = useState('');
  const [vistaVoto, setVistaVoto] = useState(false);

  useEffect(() => { caricaProposta(); }, [caricaProposta]);

  const aggiorna = (key, val) => setCampi(prev => ({ ...prev, [key]: val }));

  const salva = async () => {
    if (!utente) return;
    setStato('salvando'); setErrMsg('');
    try {
      // Filtra solo i campi effettivamente modificati
      const modificati = {};
      CAMPI_EDITABILI.forEach(({ key }) => {
        const valNuovo = key === 'prezzo' ? parseFloat(campi[key]) : campi[key];
        const valOld   = offerta[key];
        if (valNuovo !== valOld && campi[key] !== '') modificati[key] = valNuovo;
      });
      if (Object.keys(modificati).length === 0) { onChiudi(); return; }

      if (isGuru) {
        await modificaDiretta(modificati);
        setStato('ok');
        setTimeout(onChiudi, 1200);
      } else {
        await inviaProposta(modificati);
        setStato('ok');
        setTimeout(onChiudi, 1800);
      }
    } catch (err) {
      if (err.message === 'proposta_esistente') {
        setErrMsg('C\'è già una proposta in attesa. Puoi votarla per approvarla.');
        setVistaVoto(true);
      } else {
        setErrMsg('Errore durante il salvataggio. Riprova.');
      }
      setStato('errore');
    }
  };

  const haVotato = utente && proposta && (
    proposta.voti_guru?.includes(utente.uid) ||
    proposta.voti_utenti?.includes(utente.uid)
  );

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onChiudi}>

      {/* Bottom sheet — dvh per tastiera iOS */}
      <div className="rounded-t-[28px] flex flex-col"
        style={{ background: T.surface, maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: T.border }} />
        </div>

        {/* Header fisso */}
        <div className="px-5 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase font-semibold tracking-wider mb-0.5"
              style={{ color: T.textSec }}>
              {isGuru ? '✏️ Modifica offerta' : '📋 Proponi correzione'}
            </p>
            <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
              {offerta.nome} · {offerta.insegna}
            </p>
          </div>
          <button onClick={onChiudi}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: T.bg }}>
            <X size={16} strokeWidth={2} style={{ color: T.textSec }} />
          </button>
        </div>

        {/* Unico scroll — contiene tutto, bottone salva in fondo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Info ruolo */}
          {!isGuru && (
            <div className="px-4 py-3 rounded-[14px]"
              style={{ background: '#EEF2E4' }}>
              <p className="text-xs" style={{ color: T.primary }}>
                💡 La tua correzione sarà visibile dopo l'approvazione di 1 Guru o 3 utenti della stessa città.
              </p>
            </div>
          )}

          {/* Proposta in attesa */}
          {(proposta || vistaVoto) && proposta?.stato === 'pending' && (
            <div className="rounded-[14px] p-4"
              style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
                📋 Proposta in attesa
              </p>
              <p className="text-[11px] mb-2" style={{ color: '#A16207' }}>
                {proposta.voti_guru?.length || 0} Guru · {proposta.voti_utenti?.length || 0} utenti — serve 1 Guru o 3 utenti
              </p>
              {!haVotato ? (
                <button onClick={async () => { try { await votaProposta(); } catch {} }}
                  className="w-full py-2 rounded-xl text-xs font-semibold"
                  style={{ background: '#92400E', color: '#fff' }}>
                  ✓ Confermo — la correzione è giusta
                </button>
              ) : (
                <p className="text-xs text-center" style={{ color: '#92400E' }}>✓ Hai già votato</p>
              )}
            </div>
          )}

          {/* Campi editabili */}
          {CAMPI_EDITABILI.map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-[10px] uppercase font-semibold mb-1.5"
                style={{ color: T.primary }}>
                {label}
                {key === 'prezzo' && (
                  <span className="ml-1 font-normal normal-case" style={{ color: T.textSec }}>
                    (originale: {offerta.prezzo?.toFixed(2)}€)
                  </span>
                )}
              </label>
              {type === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {CATEGORIE_MODIFICA.map(c => (
                    <button key={c.id}
                      onClick={() => aggiorna('categoria', c.id)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={campi.categoria === c.id
                        ? { background: T.primary, color: '#fff' }
                        : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={type}
                  value={campi[key]}
                  onChange={e => aggiorna(key, e.target.value)}
                  step={type === 'number' ? '0.01' : undefined}
                  min={type === 'number' ? '0' : undefined}
                  className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
                  placeholder={String(offerta[key] || '')}
                />
              )}
            </div>
          ))}

          {/* Messaggio errore */}
          {errMsg && (
            <p className="text-xs px-3 py-2 rounded-xl"
              style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {errMsg}
            </p>
          )}

          {/* Bottone salva — in fondo allo scroll, sempre raggiungibile */}
          <div className="pt-2">
            <button
              onClick={salva}
              disabled={stato === 'salvando'}
              className="w-full py-3.5 rounded-[18px] text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: stato === 'ok' ? '#16a34a' : T.primary,
                color:      '#fff',
                boxShadow:  '0 4px 16px rgba(100,113,68,0.3)',
              }}>
              {stato === 'salvando'
                ? <><Loader size={16} strokeWidth={1.5} className="animate-spin" /> Salvo...</>
                : stato === 'ok'
                  ? <><Check size={16} strokeWidth={2.5} /> {isGuru ? 'Salvato!' : 'Proposta inviata!'}</>
                  : isGuru
                    ? <><Pencil size={16} strokeWidth={1.5} /> Salva modifica</>
                    : <><Pencil size={16} strokeWidth={1.5} /> Invia correzione</>}
            </button>
            {!isGuru && stato !== 'ok' && (
              <p className="text-center text-[10px] mt-2" style={{ color: T.textSec }}>
                Richiede approvazione dalla community
              </p>
            )}
          </div>

          {/* Safe area iOS */}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>

      </div>
    </div>
  );
};


// Bottone matita — apre il modal edit sull'offerta
const BotoneModifica = ({ offerta, size = 12 }) => {
  const { utente } = useAuth();
  const [aperto, setAperto] = useState(false);
  if (!utente) return null; // solo utenti loggati
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setAperto(true); }}
        className="p-1 rounded-full transition-all active:scale-90 shrink-0"
        title="Modifica / Correggi offerta"
        style={{ color: T.border }}>
        <Pencil size={size} strokeWidth={1.5} />
      </button>
      {aperto && <ModalEditOfferta offerta={offerta} onChiudi={() => setAperto(false)} />}
    </>
  );
};

const ProductCardBase = ({ offerta, storico = null, archivio = [], index = 0, segnalati, segnala }) => {
  const isScadenzaOggi = offerta.valido_fino === OGGI;
  const isScadenzaDomani = offerta.valido_fino === DOMANI;

  // Sparkline — pre-calcolata fuori dal JSX per leggibilità
  const sparkline = (() => {
    if (!archivio?.length) return null;
    const storici = archivio
      .filter(a => a.insegna === offerta.insegna && a.nome?.toLowerCase() === offerta.nome?.toLowerCase() && a.prezzo)
      .sort((a, b) => (a.valido_fino || '').localeCompare(b.valido_fino || '')).slice(-6);
    if (storici.length < 2) return null;
    const prezzi = [...storici.map(s => s.prezzo), offerta.prezzo];
    const min = Math.min(...prezzi), max = Math.max(...prezzi), range = max - min || 1;
    const W = 72, H = 20;
    const pts = prezzi.map((p, i) => `${(i / (prezzi.length - 1)) * W},${H - ((p - min) / range) * (H - 4) - 2}`).join(' ');
    return { prezzi, pts, trend: prezzi[prezzi.length - 1] <= prezzi[0], W, H, min, range };
  })();

  return (
    <div
      className="bg-white rounded-[20px] border p-5 mb-4 flex flex-col gap-3 active:scale-[0.98] transition-transform"
      style={{
        borderColor: T.border,
        boxShadow: '0 6px 28px rgba(44,48,38,0.09), 0 1px 4px rgba(44,48,38,0.06)',
        animationDelay: `${index * 50}ms`
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="font-medium leading-snug" style={{ color: T.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: '17px' }}>
            {offerta.nome}
          </h3>
          {offerta.marca && (
            <p className="mt-1 uppercase tracking-wider font-medium" style={{ color: T.textSec, fontSize: '12px' }}>
              {offerta.marca}
            </p>
          )}
          {offerta.grammatura && (
            <p className="mt-1" style={{ color: T.textSec, fontSize: '14px' }}>{offerta.grammatura}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold" style={{ color: T.textPrimary, fontFamily: "'Lora', serif", fontSize: '26px' }}>
            {formattaPrezzo(offerta.prezzo)}
          </div>
          {offerta.prezzo_kg && (
            <div className="mt-0.5" style={{ color: T.textSec, fontSize: '13px' }}>
              {formattaPrezzo(offerta.prezzo_kg)}{etichettaUnitaPrezzo(offerta.grammatura)}
            </div>
          )}
          {storico && storico.prezzo !== offerta.prezzo && (
            <div className={`text-xs font-semibold mt-1 ${storico.prezzo > offerta.prezzo ? 'text-emerald-600' : 'text-red-500'}`}>
              {storico.prezzo > offerta.prezzo ? '▼' : '▲'} da {formattaPrezzo(storico.prezzo)}
            </div>
          )}
        </div>
      </div>

      {/* Sparkline storico prezzi */}
      {sparkline && (
        <div className="flex items-center gap-2 pt-1">
          <svg width={sparkline.W} height={sparkline.H} className="overflow-visible">
            <polyline fill="none" stroke={sparkline.trend ? T.primary : '#dc2626'} strokeWidth="1.5" points={sparkline.pts} />
            {sparkline.prezzi.map((p, i) => (
              <circle key={i} cx={(i / (sparkline.prezzi.length - 1)) * sparkline.W} cy={sparkline.H - ((p - sparkline.min) / sparkline.range) * (sparkline.H - 4) - 2} r="2" fill={sparkline.trend ? T.primary : '#dc2626'} />
            ))}
          </svg>
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
            {sparkline.prezzi.length - 1} sett.
          </span>
        </div>
      )}

      {/* Badge footer */}
      <div className="flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
        <span className={`px-3 py-1 rounded-lg font-bold tracking-wide ${getBadgeInsegna(offerta.insegna)}`} style={{ fontSize: '13px' }}>
          {offerta.insegna}
        </span>
        {offerta.fidelity_req && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold bg-blue-50 text-blue-700 border border-blue-200" style={{ fontSize: '13px' }}>
            <Star size={12} className="fill-blue-700" strokeWidth={0} /> Carta fedeltà
          </span>
        )}
        {isScadenzaOggi && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold border" style={{ fontSize: '13px', background: '#FFF5F0', color: T.accent, borderColor: '#F4C5A8' }}>
            <Clock size={12} strokeWidth={1.5} /> Scade oggi
          </span>
        )}
        {isScadenzaDomani && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold border" style={{ fontSize: '13px', background: '#FFF8F0', color: '#C4682A', borderColor: '#F4D5B8' }}>
            <Clock size={12} strokeWidth={1.5} /> Scade domani
          </span>
        )}
        {/* Segnalazione errore + modifica — allineati a destra */}
        {offerta.id && (
          <div className="ml-auto flex items-center gap-1">
            {segnalati && segnala && (
              <BottoneSegnala
                docId={offerta.id}
                collectionName="offerte_attive"
                segnalati={segnalati}
                segnala={segnala}
                size={14}
              />
            )}
            <BotoneModifica offerta={offerta} size={14} />
          </div>
        )}
      </div>
    </div>
  );
};
// React.memo: evita re-render quando offerta e segnalazioni non cambiano
// Fondamentale nelle liste lunghe dove il parent aggiorna stato (filtri, ordinamento)
const ProductCard = React.memo(ProductCardBase, (prev, next) =>
  prev.offerta.id === next.offerta.id &&
  prev.offerta.prezzo === next.offerta.prezzo &&
  prev.offerta.nascosto === next.offerta.nascosto &&
  prev.segnalati === next.segnalati
);

// ─── Schermata Selezione Supermercati (onboarding step 2) ────────────────────
// Mostrata dopo il login se onboarding_supermercati === false.
// Step 1: scegli area geografica (Roma, Mantova, ...)
// Step 2: spunta le insegne che frequenti in quell'area

const SchermataSelezioneSupermarket = ({ onConferma }) => {
  const [step,        setStep]        = useState(1);           // 1 = area, 2 = insegne
  const [areaScelta,  setAreaScelta]  = useState(null);         // es. "Roma"
  const [selezionate, setSelezionate] = useState([]);           // insegne selezionate

  const toggleInsegna = (insegna) => {
    setSelezionate(prev =>
      prev.includes(insegna) ? prev.filter(i => i !== insegna) : [...prev, insegna]
    );
  };

  const scegliArea = (area) => {
    setAreaScelta(area);
    // Pre-seleziona tutte le insegne dell'area — l'utente può deselezionare
    setSelezionate(INSEGNE_PER_AREA[area] || []);
    setStep(2);
  };

  const conferma = () => {
    if (!areaScelta || selezionate.length === 0) return;
    // Passa area, insegne, e array vuoto punti_vendita (verranno scelti dopo)
    onConferma(areaScelta, selezionate, []);
  };

  // ── Step 1: Selezione area ────────────────────────────────────────────────
  if (step === 1) return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>
      <div className="px-5 pt-10 pb-6" style={{ background: T.primary }}>
        <IconaLenticchia size={32} className="text-white mb-4" />
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: '#fff', marginBottom: '8px' }}>
          Dove fai la spesa?
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Scegli la tua area. Potrai selezionare i supermercati nel passo successivo.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {AREE_DISPONIBILI.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => scegliArea(id)}
            className="w-full flex items-center gap-4 p-5 rounded-[20px] text-left transition-all active:scale-[0.99]"
            style={{
              background: T.surface,
              border: `2px solid ${T.border}`,
              boxShadow: '0 2px 8px rgba(44,48,38,0.04)',
            }}
          >
            <span style={{ fontSize: '32px' }}>{emoji}</span>
            <div>
              <p className="font-semibold" style={{ color: T.textPrimary, fontSize: '17px' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                {(INSEGNE_PER_AREA[id] || []).join(' · ')}
              </p>
            </div>
            <ChevronRight size={20} strokeWidth={1.5} style={{ color: T.textSec, marginLeft: 'auto', flexShrink: 0 }} />
          </button>
        ))}

        <p className="text-xs text-center pt-2" style={{ color: T.textSec }}>
          Vivi a Tivoli, Pavia, Sesto Fiorentino? Scegli l'area più vicina — potrai vedere le offerte di tutti i suoi supermercati.
        </p>
      </div>
    </div>
  );

  // ── Step 2: Selezione insegne ─────────────────────────────────────────────
  const insegneDellArea = INSEGNE_PER_AREA[areaScelta] || [];

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>
      <div className="px-5 pt-10 pb-6" style={{ background: T.primary }}>
        {/* Back */}
        <button onClick={() => setStep(1)} className="flex items-center gap-1.5 mb-4"
          style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
          <ArrowLeft size={14} strokeWidth={2} /> Cambia area
        </button>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: '#fff', marginBottom: '8px' }}>
          Quali supermercati frequenti?
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Area scelta: <strong>{areaScelta}</strong> · Puoi cambiare le selezioni in qualsiasi momento dal Profilo.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
        {insegneDellArea.map(insegna => {
          const sel = selezionate.includes(insegna);
          return (
            <button
              key={insegna}
              onClick={() => toggleInsegna(insegna)}
              className="w-full flex items-center gap-4 p-4 rounded-[20px] text-left transition-all active:scale-[0.99]"
              style={{
                background: sel ? '#EEF2E4' : T.surface,
                border: `2px solid ${sel ? T.primary : T.border}`,
                boxShadow: sel ? '0 4px 16px rgba(100,113,68,0.15)' : '0 2px 8px rgba(44,48,38,0.04)',
              }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: sel ? T.primary : T.border }}>
                {sel && <span style={{ color: '#fff', fontSize: '14px', lineHeight: 1 }}>✓</span>}
              </div>
              <span className="font-medium" style={{ color: T.textPrimary, fontSize: '16px' }}>{insegna}</span>
            </button>
          );
        })}

        {/* Seleziona/deseleziona tutto */}
        <button
          onClick={() => setSelezionate(
            selezionate.length === insegneDellArea.length ? [] : [...insegneDellArea]
          )}
          className="w-full py-3 text-xs font-medium transition-all"
          style={{ color: T.textSec }}
        >
          {selezionate.length === insegneDellArea.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
      </div>

      <div className="px-4 pb-8 pt-2">
        <p className="text-xs text-center mb-3" style={{ color: T.textSec }}>
          {selezionate.length === 0
            ? 'Seleziona almeno un supermercato'
            : `${selezionate.length} supermercati selezionati`}
        </p>
        <button
          onClick={conferma}
          disabled={selezionate.length === 0}
          className="w-full py-4 rounded-[20px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: T.textPrimary, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 20px rgba(44,48,38,0.2)' }}
        >
          Continua
        </button>
      </div>
    </div>
  );
};

// ─── Schermata Onboarding ─────────────────────────────────────────────────────

const SchermataOnboarding = ({ onConferma }) => {
  const [accettato, setAccettato] = React.useState(false);

  return (
  <div className="flex flex-col h-full px-6 py-10 overflow-y-auto pb-20" style={{ background: T.bg }}>
    <div className="flex items-center justify-center mb-8">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: T.primary }}>
        <IconaLenticchia size={40} className="text-white" />
      </div>
    </div>
    <h1 className="text-center mb-2" style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: T.textPrimary }}>
      Ciao, sono Lenticchia
    </h1>
    <p className="text-center text-sm mb-10 leading-relaxed" style={{ color: T.textSec }}>
      La spesa, senza sorprese. Due parole prima di iniziare.
    </p>

    <div className="space-y-6 mb-10">
      {[
        { icon: <Receipt size={20} strokeWidth={1.5} style={{ color: T.primary }} />, bg: '#EEF2E4', titolo: 'Cosa raccogliamo', testo: 'Solo gli scontrini che carichi tu, volontariamente. Estraiamo prodotti e prezzi — mai codici fiscali o dati personali.' },
        { icon: <Shield size={20} strokeWidth={1.5} className="text-blue-600" />, bg: '#EFF6FF', titolo: 'Chi li vede', testo: 'Solo tu. I confronti con altri utenti usano medie anonime — nessuno vede i tuoi scontrini, mai.' },
        { icon: <TrendingDown size={20} strokeWidth={1.5} className="text-purple-600" />, bg: '#F5F3FF', titolo: 'Come li usiamo', testo: 'Per dirti dove conviene fare la spesa sulla base di quello che compri davvero tu.' },
      ].map((item, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
            {item.icon}
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-sm" style={{ color: T.textPrimary }}>{item.titolo}</h3>
            <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>{item.testo}</p>
          </div>
        </div>
      ))}
    </div>

    {/* ── Checkbox accettazione privacy policy ─────────────────────────── */}
    <div
      className="rounded-2xl p-4 mb-4 cursor-pointer flex items-start gap-3 transition-all active:scale-[0.99]"
      style={{ background: T.surface, border: `1.5px solid ${accettato ? T.primary : T.border}` }}
      onClick={() => setAccettato(v => !v)}>
      {/* Checkbox custom */}
      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors"
        style={{ background: accettato ? T.primary : 'transparent', border: `2px solid ${accettato ? T.primary : '#B0B7A0'}` }}>
        {accettato && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>
        Ho letto e accetto la{' '}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
          style={{ color: T.primary }}
          onClick={e => e.stopPropagation()}>
          Privacy Policy
        </a>
        {' '}e confermo di avere almeno 16 anni.
      </p>
    </div>

    <div className="rounded-2xl p-3 mb-8 text-center" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
        Server europei (GDPR). Puoi cancellare i tuoi dati in qualsiasi momento dal Profilo.
      </p>
    </div>

    <button
      onClick={onConferma}
      disabled={!accettato}
      className="w-full text-white font-medium py-4 rounded-[20px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: T.primary, boxShadow: accettato ? `0 8px 20px rgba(100,113,68,0.25)` : 'none', fontFamily: "'DM Sans', sans-serif" }}
    >
      Ho capito, inizia
    </button>
  </div>
  );
};

// ─── Schermata Login ──────────────────────────────────────────────────────────

const SchermataLogin = () => {
  const { loginGoogle, erroreAuth } = useAuth();
  return (
    <div className="flex flex-col h-full px-6 py-16 items-center justify-center" style={{ background: T.bg }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg" style={{ background: T.primary }}>
        <IconaLenticchia size={48} className="text-white" />
      </div>
      <h1 className="text-center mb-2" style={{ fontFamily: "'Lora', serif", fontSize: '32px', fontWeight: 500, color: T.textPrimary }}>
        Lenticchia
      </h1>
      <p className="text-center text-sm mb-3 font-medium tracking-wide" style={{ color: T.textSec }}>
        La spesa, senza sorprese.
      </p>
      <p className="text-center text-sm mb-12 leading-relaxed max-w-xs" style={{ color: T.textSec }}>
        Accedi per scoprire dove conviene fare la spesa questa settimana.
      </p>

      <button
        onClick={loginGoogle}
        className="flex items-center gap-3 font-medium py-3.5 px-6 rounded-[20px] transition-all w-full max-w-xs justify-center active:scale-95"
        style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.textPrimary, boxShadow: '0 4px 16px rgba(44,48,38,0.08)', fontFamily: "'DM Sans', sans-serif" }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-2.9-11.3-7l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Continua con Google
      </button>

      {erroreAuth && <p className="mt-4 text-sm text-red-600 text-center">{erroreAuth}</p>}

      <p className="mt-10 text-xs text-center max-w-xs leading-relaxed" style={{ color: T.textSec }}>
        Continuando accetti che i tuoi scontrini vengano usati in forma anonima per migliorare i suggerimenti.
      </p>
    </div>
  );
};

// ─── Barcode Display ──────────────────────────────────────────────────────────
// Genera un codice a barre SVG semplice (barre verticali) senza librerie esterne.
// Sufficiente per la visualizzazione rapida in app — non per uso in cassa.

const BarcodeDisplay = ({ numero, formato }) => {
  if (!numero || !formato) {
    return (
      <div className="flex items-center justify-center h-20 rounded-xl"
        style={{ background: '#F3F4F6' }}>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>Numero non valido per barcode</span>
      </div>
    );
  }

  const chars    = numero.replace(/\s/g, '').split('');
  const barWidth = Math.max(1.5, Math.min(3, 240 / (chars.length * 5)));
  const height   = 64;
  const totalW   = chars.length * barWidth * 5.5 + barWidth * 8;

  const bars = [];
  let x = barWidth * 4;
  chars.forEach((c, ci) => {
    const code = c.charCodeAt(0);
    for (let b = 0; b < 4; b++) {
      const w = ((code + b + ci) % 3 === 0) ? barWidth * 2 : barWidth;
      if (b % 2 === 0) {
        bars.push(<rect key={`${ci}-${b}`} x={x} y={0} width={w} height={height} fill="#1a1a1a" />);
      }
      x += w + barWidth * 0.5;
    }
  });

  return (
    <div className="flex items-center justify-center py-2 px-3 rounded-xl overflow-hidden"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
      <svg width={Math.min(totalW, 280)} height={height}
        viewBox={`0 0 ${totalW} ${height}`} style={{ maxWidth: '100%' }}>
        <rect width={totalW} height={height} fill="white" />
        {bars}
      </svg>
    </div>
  );
};

// ─── Sezione: I Miei Supermercati ─────────────────────────────────────────────

const SezioneSupermercati = () => {
  const { preferenze, aggiornaPreferenze, aggiornaTessera } = useAuth();
  const [tesseraAperta,   setTesseraAperta]   = useState(null);
  const [numeroInput,     setNumeroInput]      = useState('');
  const [cambioArea,      setCambioArea]       = useState(false);
  const [salvando,        setSalvando]         = useState(false);
  const [salvato,         setSalvato]          = useState(false);
  // Modal codice a barre
  const [barcodeModal,    setBarcodeModal]     = useState(null); // { insegna, numero }
  // Form nuova tessera per insegna non in lista
  const [nuovaTesseraForm, setNuovaTesseraForm] = useState(false);
  const [nuovaInsegnaInput, setNuovaInsegnaInput] = useState('');
  const [nuovoNumeroInput,  setNuovoNumeroInput]  = useState('');
  const [barcodeType,       setBarcodeType]       = useState(null); // 'EAN13'|'CODE128'|null

  // ── Stato locale — l'utente modifica qui, poi preme Salva ─────────────────
  const [areaLocale,     setAreaLocale]     = useState(() => preferenze?.area_selezionata || null);
  const [insegneLocali,  setInsegneLocali]  = useState(() => new Set(preferenze?.insegne_attive || []));

  // Sincronizza lo stato locale se le preferenze cambiano dall'esterno
  // (es. primo caricamento da Firestore)
  const prefKey = JSON.stringify(preferenze?.insegne_attive);
  React.useEffect(() => {
    setAreaLocale(preferenze?.area_selezionata || null);
    setInsegneLocali(new Set(preferenze?.insegne_attive || []));
  }, [preferenze?.area_selezionata, prefKey]);

  const tessere         = preferenze?.tessere || {};
  const insegneDellArea = areaLocale
    ? (INSEGNE_PER_AREA[areaLocale] || [])
    : INSEGNE_DISPONIBILI;

  // Controlla se ci sono modifiche non salvate
  const hasDirty = areaLocale !== (preferenze?.area_selezionata || null)
    || JSON.stringify([...insegneLocali].sort()) !== JSON.stringify([...(preferenze?.insegne_attive || [])].sort());

  const toggleInsegnaLocale = (insegna) => {
    setInsegneLocali(prev => {
      const next = new Set(prev);
      next.has(insegna) ? next.delete(insegna) : next.add(insegna);
      return next;
    });
  };

  const scegliArea = (id) => {
    setAreaLocale(id);
    // Pre-seleziona tutte le insegne della nuova area
    setInsegneLocali(new Set(INSEGNE_PER_AREA[id] || []));
    setCambioArea(false);
  };

  const salvaPreferenze = async () => {
    setSalvando(true);
    try {
      await aggiornaPreferenze({
        ...preferenze,
        area_selezionata:        areaLocale,
        insegne_attive:          [...insegneLocali],
        punti_vendita_attivi:    preferenze?.punti_vendita_attivi || [],
        onboarding_supermercati: true,
      });
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch (err) {
      console.error('Errore salvataggio preferenze:', err);
    } finally {
      setSalvando(false);
    }
  };

  const apriTessera = (insegna) => {
    setTesseraAperta(insegna);
    setNumeroInput(tessere[insegna]?.numero || '');
  };

  const salvaTessera = async (insegna) => {
    await aggiornaTessera(insegna, true, numeroInput);
    setTesseraAperta(null);
  };

  // ── Rilevamento formato barcode ───────────────────────────────────────────
  // EAN-13: 13 cifre numeriche (formato standard tessere GDO italiana)
  // Code 128: alfanumerico o lunghezza diversa da 13
  const rilevaFormatoBarcode = (numero) => {
    if (!numero) return null;
    const pulito = numero.replace(/\s/g, '');
    if (/^\d{13}$/.test(pulito)) return 'EAN13';
    if (/^\d{8}$/.test(pulito))  return 'EAN8';
    if (pulito.length >= 4)      return 'CODE128';
    return null;
  };

  const apriBarcode = (insegna, numero) => {
    setBarcodeModal({ insegna, numero });
  };

  // ── Salvataggio nuova tessera (insegna fuori dalla lista area) ────────────
  const salvaNuovaTessera = async () => {
    if (!nuovaInsegnaInput.trim() || !nuovoNumeroInput.trim()) return;

    const insegnaNome = nuovaInsegnaInput.trim();
    const numero      = nuovoNumeroInput.trim();

    // 1. Salva la tessera nelle preferenze utente
    await aggiornaTessera(insegnaNome, true, numero);

    // 2. Autodiscovery: propone l'insegna al sistema se non è già nota
    // Cerca se esiste già in INSEGNE_DISPONIBILI (case-insensitive)
    const insegneNote = INSEGNE_DISPONIBILI.map(i => i.toLowerCase());
    const giaConosciuta = insegneNote.some(i =>
      i.includes(insegnaNome.toLowerCase()) || insegnaNome.toLowerCase().includes(i)
    );

    if (!giaConosciuta) {
      try {
        // Propone il punto vendita per la validazione del Guru
        await addDoc(collection(db, 'punti_vendita'), {
          insegna:      insegnaNome,
          nome_display: insegnaNome,
          via:          '',
          citta:        preferenze?.area_selezionata || null,
          stato:        'proposto',
          proposto_da:  'tessera_utente',  // fonte: aggiunta tessera
          uid_proponente: (await import('firebase/auth').then(m => m.getAuth()).catch(() => null))?.currentUser?.uid || null,
          creato_il:    new Date().toISOString(),
        });
      } catch {
        // Silenzioso — non blocca il salvataggio tessera
      }
    }

    setNuovaTesseraForm(false);
    setNuovaInsegnaInput('');
    setNuovoNumeroInput('');
    setBarcodeType(null);
  };

  return (
    <div className="space-y-3">

      {/* ── Card area geografica ─────────────────────────────────────────── */}
      <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
            Area geografica
          </h3>
          <button
            onClick={() => setCambioArea(!cambioArea)}
            className="text-xs font-medium px-2.5 py-1 rounded-lg transition-all"
            style={{ background: T.bg, color: T.primary, border: `1px solid ${T.border}` }}>
            {cambioArea ? 'Annulla' : 'Cambia'}
          </button>
        </div>

        {!cambioArea ? (
          <div className="flex items-center gap-3 mt-2">
            <span style={{ fontSize: '24px' }}>
              {AREE_DISPONIBILI.find(a => a.id === areaLocale)?.emoji || '📍'}
            </span>
            <div>
              <p className="font-semibold" style={{ color: T.textPrimary }}>
                {areaLocale
                  ? AREE_DISPONIBILI.find(a => a.id === areaLocale)?.label || areaLocale
                  : 'Nessuna area selezionata'}
              </p>
              <p className="text-xs" style={{ color: T.textSec }}>
                {insegneDellArea.length} supermercati disponibili
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {AREE_DISPONIBILI.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => scegliArea(id)}
                className="w-full flex items-center gap-3 p-3 rounded-[14px] text-left transition-all active:scale-[0.99]"
                style={{
                  background: id === areaLocale ? '#EEF2E4' : T.bg,
                  border: `1.5px solid ${id === areaLocale ? T.primary : T.border}`,
                }}>
                <span style={{ fontSize: '22px' }}>{emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{label}</p>
                  <p className="text-xs" style={{ color: T.textSec }}>
                    {(INSEGNE_PER_AREA[id] || []).slice(0, 4).join(', ')}
                    {(INSEGNE_PER_AREA[id] || []).length > 4 ? '...' : ''}
                  </p>
                </div>
                {id === areaLocale && <span style={{ color: T.primary, fontSize: '14px' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Card insegne ─────────────────────────────────────────────────── */}
      <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: T.textSec }}>
          I miei supermercati
        </h3>
        <p className="text-xs mb-4" style={{ color: T.textSec }}>
          Il Verdetto Spesa considera solo i supermercati attivi.
        </p>

        <div className="space-y-2">
          {insegneDellArea.map(insegna => {
            const attiva  = insegneLocali.has(insegna);
            const tessera = tessere[insegna];
            const hasTessera = tessera?.attiva;
            return (
              <div key={insegna}>
                <div className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => toggleInsegnaLocale(insegna)}
                    className="flex items-center gap-2 flex-1 active:scale-[0.99] transition-all">
                    <div className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                      style={{ background: attiva ? T.primary : T.border }}>
                      <div className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                        style={{ background: '#fff', left: attiva ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: attiva ? T.textPrimary : T.textSec }}>
                      {insegna}
                    </span>
                  </button>
                  {attiva && (
                    <button
                      onClick={() => hasTessera ? apriBarcode(insegna, tessera.numero) : apriTessera(insegna)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={hasTessera
                        ? { background: '#EEF2E4', color: T.primary, border: '1px solid #C8D5A8' }
                        : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }
                      }>
                      {hasTessera ? '🪪 ' + (tessera.numero ? tessera.numero.slice(0,6) + '…' : 'Sì') : '+ Tessera'}
                    </button>
                  )}
                </div>

                {tesseraAperta === insegna && (
                  <div className="mt-1 mb-2 p-3 rounded-2xl" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                    <p className="text-xs mb-2" style={{ color: T.textSec }}>Numero carta fedeltà</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={numeroInput}
                        onChange={e => {
                          setNumeroInput(e.target.value);
                          setBarcodeType(rilevaFormatoBarcode(e.target.value));
                        }}
                        placeholder="Es. 1234567890123"
                        className="flex-1 px-3 py-2 rounded-xl text-base outline-none"
                        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
                      />
                      <button onClick={() => salvaTessera(insegna)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: T.primary }}>
                        Salva
                      </button>
                      <button onClick={() => { setTesseraAperta(null); setBarcodeType(null); }}
                        className="px-3 py-2 rounded-xl text-sm"
                        style={{ color: T.textSec }}>
                        ✕
                      </button>
                    </div>
                    {/* Rilevamento formato barcode */}
                    {barcodeType && (
                      <p className="text-xs mt-2" style={{ color: T.primary }}>
                        ✓ Formato rilevato: <strong>{barcodeType}</strong> — verrà mostrato come codice a barre
                      </p>
                    )}
                    {numeroInput && !barcodeType && (
                      <p className="text-xs mt-2" style={{ color: T.textSec }}>
                        Numero troppo corto per generare un codice a barre (min 4 caratteri)
                      </p>
                    )}
                    {tessera?.numero && (
                      <button
                        onClick={() => { aggiornaTessera(insegna, false, ''); setTesseraAperta(null); setBarcodeType(null); }}
                        className="text-xs mt-2" style={{ color: '#DC2626' }}>
                        Rimuovi tessera
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Aggiungi tessera per insegna fuori lista ─────────────────────── */}
      <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
              Altre tessere fedeltà
            </h3>
            <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
              Hai una tessera di un supermercato non in lista?
            </p>
          </div>
          <button
            onClick={() => setNuovaTesseraForm(v => !v)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ background: nuovaTesseraForm ? T.bg : T.primary, color: nuovaTesseraForm ? T.textSec : '#fff', border: `1px solid ${nuovaTesseraForm ? T.border : T.primary}` }}>
            {nuovaTesseraForm ? 'Annulla' : '+ Aggiungi'}
          </button>
        </div>

        {/* Tessere già aggiunte per insegne fuori lista */}
        {Object.entries(tessere)
          .filter(([ins, t]) => t?.attiva && !insegneDellArea.includes(ins))
          .map(([ins, t]) => (
            <div key={ins} className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: `1px solid ${T.border}` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{ins}</p>
                <p className="text-xs" style={{ color: T.textSec }}>
                  {t.numero ? t.numero.slice(0,6) + '…' : 'Tessera salvata'}
                </p>
              </div>
              <button
                onClick={() => apriBarcode(ins, t.numero)}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ background: '#EEF2E4', color: T.primary, border: '1px solid #C8D5A8' }}>
                🪪 Mostra
              </button>
            </div>
          ))
        }

        {nuovaTesseraForm && (
          <div className="mt-4 space-y-3">
            {/* Campo insegna con datalist */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.textSec }}>
                Nome supermercato
              </label>
              <input
                list="insegne-suggerite"
                type="text"
                value={nuovaInsegnaInput}
                onChange={e => setNuovaInsegnaInput(e.target.value)}
                placeholder="Es. PAM, Carrefour, Coop…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
              />
              <datalist id="insegne-suggerite">
                {INSEGNE_DISPONIBILI.map(i => <option key={i} value={i} />)}
              </datalist>
              {nuovaInsegnaInput && !INSEGNE_DISPONIBILI.some(i =>
                i.toLowerCase() === nuovaInsegnaInput.toLowerCase()
              ) && (
                <p className="text-xs mt-1" style={{ color: T.primary }}>
                  💡 Nuovo supermercato — lo aggiungeremo alla community!
                </p>
              )}
            </div>

            {/* Campo numero tessera */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.textSec }}>
                Numero carta fedeltà
              </label>
              <input
                type="text"
                value={nuovoNumeroInput}
                onChange={e => {
                  setNuovoNumeroInput(e.target.value);
                  setBarcodeType(rilevaFormatoBarcode(e.target.value));
                }}
                placeholder="Es. 1234567890123"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
              />
              {barcodeType && (
                <p className="text-xs mt-1" style={{ color: T.primary }}>
                  ✓ Formato rilevato: <strong>{barcodeType}</strong>
                </p>
              )}
            </div>

            <button
              onClick={salvaNuovaTessera}
              disabled={!nuovaInsegnaInput.trim() || !nuovoNumeroInput.trim()}
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: T.primary }}>
              Salva tessera
            </button>
          </div>
        )}
      </div>

      {/* ── Modal codice a barre ──────────────────────────────────────────────── */}
      {barcodeModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setBarcodeModal(null)}>
          <div
            className="w-full max-w-sm rounded-[24px] p-6 text-center"
            style={{ background: T.surface }}
            onClick={e => e.stopPropagation()}>

            <p className="font-semibold mb-1" style={{ color: T.textPrimary, fontFamily: "'Lora', serif", fontSize: '18px' }}>
              {barcodeModal.insegna}
            </p>
            <p className="text-xs mb-5" style={{ color: T.textSec }}>Carta fedeltà</p>

            {/* Codice a barre generato via SVG inline (JsBarcode-like) */}
            <BarcodeDisplay numero={barcodeModal.numero} formato={rilevaFormatoBarcode(barcodeModal.numero)} />

            <p className="text-sm mt-4 font-mono tracking-widest" style={{ color: T.textPrimary }}>
              {barcodeModal.numero}
            </p>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setTesseraAperta(barcodeModal.insegna); setNumeroInput(barcodeModal.numero); setBarcodeModal(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                Modifica
              </button>
              <button
                onClick={() => setBarcodeModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: T.primary }}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottone Salva ─────────────────────────────────────────────────── */}
      <button
        onClick={salvaPreferenze}
        disabled={salvando || salvato}
        className="w-full py-4 rounded-[20px] text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
        style={{
          background: salvato ? '#22C55E' : hasDirty ? T.primary : T.border,
          color: hasDirty || salvato ? '#fff' : T.textSec,
          boxShadow: hasDirty && !salvato ? '0 4px 16px rgba(100,113,68,0.3)' : 'none',
        }}>
        {salvando ? (
          <><Loader size={16} className="animate-spin" /> Salvo...</>
        ) : salvato ? (
          <>✓ Salvato!</>
        ) : (
          hasDirty ? 'Salva preferenze' : 'Nessuna modifica'
        )}
      </button>

    </div>
  );
};

// ─── Sezione: Prodotti Preferiti ───────────────────────────────────────────────

const SezioneProdottiPreferiti = () => {
  const { prodottiPreferiti, aggiungiProdottoPreferito, rimuoviProdottoPreferito } = useAuth();
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({ label: '', nome_ricerca: '', marca: '', grammatura: '', categoria: 'dispensa' });

  const items = prodottiPreferiti?.items || [];

  const handleAggiungi = async () => {
    if (!form.label.trim()) return;
    await aggiungiProdottoPreferito({
      label: form.label.trim(),
      nome_ricerca: form.nome_ricerca.trim() || form.label.trim().toLowerCase(),
      marca: form.marca.trim(),
      grammatura: form.grammatura.trim(),
      categoria: form.categoria,
    });
    setForm({ label: '', nome_ricerca: '', marca: '', grammatura: '', categoria: 'dispensa' });
    setMostraForm(false);
  };

  return (
    <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
          Prodotti preferiti
        </h3>
        <button
          onClick={() => setMostraForm(v => !v)}
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{ background: '#EEF2E4', color: T.primary }}
        >
          + Aggiungi
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: T.textSec }}>
        Vengono cercati automaticamente nel Verdetto Spesa con la marca esatta.
      </p>

      {/* Form aggiunta */}
      {mostraForm && (
        <div className="mb-4 p-4 rounded-2xl space-y-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: T.textSec }}>
              Nome breve (come appare nella lista)
            </label>
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Es. Latte Arborea"
              className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: T.textSec }}>
              Termine di ricerca esteso (per trovarlo nelle offerte)
            </label>
            <input
              value={form.nome_ricerca}
              onChange={e => setForm(f => ({ ...f, nome_ricerca: e.target.value }))}
              placeholder="Es. latte parzialmente scremato arborea"
              className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
            <p className="text-xs mt-1" style={{ color: T.textSec }}>Se vuoto, usa il nome breve</p>
          </div>
          <div className="flex gap-2">
            <input
              value={form.marca}
              onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
              placeholder="Marca"
              className="flex-1 px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
            <input
              value={form.grammatura}
              onChange={e => setForm(f => ({ ...f, grammatura: e.target.value }))}
              placeholder="Formato"
              className="w-24 px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAggiungi}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: T.primary }}
            >
              Salva prodotto
            </button>
            <button
              onClick={() => setMostraForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ color: T.textSec, border: `1px solid ${T.border}` }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista prodotti preferiti */}
      {items.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: T.textSec }}>
          Nessun prodotto preferito ancora. Aggiungine uno!
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{p.label}</span>
                {p.marca && <span className="text-xs ml-2" style={{ color: T.textSec }}>{p.marca}</span>}
                {p.grammatura && <span className="text-xs ml-1" style={{ color: T.textSec }}>{p.grammatura}</span>}
                {p.nome_ricerca && p.nome_ricerca !== p.label.toLowerCase() && (
                  <p className="text-xs mt-0.5" style={{ color: T.textSec }}>🔍 "{p.nome_ricerca}"</p>
                )}
              </div>
              <button
                onClick={() => rimuoviProdottoPreferito(p.id)}
                className="ml-3 text-xs px-2 py-1 rounded-lg"
                style={{ color: '#DC2626', background: '#FEF2F2' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab Profilo ──────────────────────────────────────────────────────────────

// ─── TabLoginRichiesto — schermata inline per tab protetti ───────────────────
const TabLoginRichiesto = ({ messaggio }) => {
  const { login } = useAuth();
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 pb-24"
      style={{ background: T.bg }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: '#EEF2E4' }}>
        <IconaLenticchia size={40} style={{ color: T.primary }} />
      </div>
      <h2 className="text-center mb-3"
        style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
        Accedi a Lenticchia
      </h2>
      <p className="text-center text-sm leading-relaxed mb-8" style={{ color: T.textSec }}>
        {messaggio}
      </p>
      <button
        onClick={login}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[18px] font-semibold text-sm transition-all active:scale-[0.98]"
        style={{ background: T.primary, color: '#fff', boxShadow: '0 4px 20px rgba(100,113,68,0.3)' }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#fff" opacity=".9"/>
          <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#fff" opacity=".9"/>
          <path d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.52.09-1.03.25-1.52V5.41H1.83A8 8 0 0 0 .98 9c0 1.29.31 2.51.85 3.59l2.68-2.07z" fill="#fff" opacity=".7"/>
          <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.15 4.41l2.68 2.1c.63-1.89 2.39-3.33 4.47-3.33z" fill="#fff" opacity=".7"/>
        </svg>
        Continua con Google
      </button>
      <p className="text-center text-xs mt-4" style={{ color: T.textSec }}>
        Le offerte sono sempre visibili senza account
      </p>
    </div>
  );
};

// ─── Tutorial in-app — spotlight a step ──────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    id:        'offerte',
    tab:       'offerte',
    target:    '[data-tutorial="offerte-header"]',
    titolo:    '🛒 Le offerte della settimana',
    testo:     'Ogni settimana raccogliamo le migliori offerte dai supermercati della tua città. I prezzi cambiano ogni giovedì.',
    posizione: 'bottom',
  },
  {
    id:        'filtro-insegna',
    tab:       'offerte',
    target:    '[data-tutorial="filtro-insegna"]',
    titolo:    '🏪 Filtra per supermercato',
    testo:     'Tocca un chip per vedere solo le offerte di quel supermercato. "Tutti" le mostra insieme.',
    posizione: 'bottom',
  },
  {
    id:        'lista',
    tab:       'lista',
    target:    '[data-tutorial="lista-textarea"]',
    titolo:    '📝 La tua lista della spesa',
    testo:     'Scrivi qui cosa devi comprare — un prodotto per riga. Puoi condividerla con chi fa la spesa con te.',
    posizione: 'bottom',
  },
  {
    id:        'verdetto',
    tab:       'lista',
    target:    '[data-tutorial="bottone-analizza"]',
    titolo:    '🏆 Il Verdetto Spesa',
    testo:     'Tocca "Cerca offerte" e Lenticchia trova dove conviene comprare tutto quello che hai in lista, questa settimana.',
    posizione: 'top',
  },
  {
    id:        'scontrino',
    tab:       'scontrino',
    target:    '[data-tutorial="tab-scontrino"]',
    titolo:    '📸 Fotografa lo scontrino',
    testo:     'Dopo la spesa carica lo scontrino. Lenticchia estrae i prezzi automaticamente e costruisce il tuo storico personale.',
    posizione: 'bottom',
  },
  {
    id:        'profilo',
    tab:       'profilo',
    target:    '[data-tutorial="tab-profilo"]',
    titolo:    '🌟 Punti e livelli',
    testo:     'Guadagni punti caricando scontrini e volantini. I Guru sbloccano funzioni esclusive come il caricamento volantini.',
    posizione: 'top',
  },
  // Step finale: installazione come app
  {
    id:        'installa',
    tab:       null,   // nessun tab specifico — step full-screen custom
    target:    null,
    titolo:    '📲 Aggiungila allo schermo',
    testo:     null,   // gestito dal componente Tutorial con UI custom
    posizione: null,
  },
];

const Tutorial = ({ onCompleta, onSalta, setActiveTab }) => {
  const [step, setStep]     = useState(0);
  const [rect, setRect]     = useState(null);
  const [pronto, setPronto] = useState(false);
  const stepCorrente = TUTORIAL_STEPS[step];

  // Rileva OS per istruzioni installazione personalizzate
  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isInstalla = stepCorrente.id === 'installa';

  useEffect(() => {
    setPronto(false);
    setRect(null);
    if (stepCorrente.tab) setActiveTab(stepCorrente.tab);

    const timer = setTimeout(() => {
      const el = document.querySelector(stepCorrente.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      setPronto(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [step, stepCorrente]);

  const avanti = () => {
    if (step < TUTORIAL_STEPS.length - 1) setStep(s => s + 1);
    else onCompleta();
  };

  const isUltimoStep = step === TUTORIAL_STEPS.length - 1;
  const PADDING    = 8;
  const TOOLTIP_GAP = 14;   // spazio tra elemento e tooltip
  const NAV_H      = 96;    // altezza navbar in fondo (safe area inclusa)
  const TOP_SAFE   = 52;    // altezza status bar / notch in alto
  const MARGIN_H   = 16;    // margine orizzontale

  // Calcola posizione e dimensione massima del tooltip
  const calcolaTooltip = () => {
    const base = {
      position: 'fixed',
      left:     MARGIN_H,
      right:    MARGIN_H,
      zIndex:   10001,
    };

    if (!rect) {
      // Nessun elemento trovato: centra verticalmente
      const altezzaDisp = window.innerHeight - TOP_SAFE - NAV_H - 32;
      return {
        ...base,
        top:       TOP_SAFE + 16,
        maxHeight: altezzaDisp,
        overflow:  'auto',
      };
    }

    const spazioSotto = window.innerHeight - NAV_H - (rect.top + rect.height + PADDING);
    const spazioSopra = rect.top - PADDING - TOP_SAFE;

    if (spazioSotto >= spazioSopra) {
      // Metti sotto — più spazio sotto
      const topTooltip = rect.top + rect.height + PADDING + TOOLTIP_GAP;
      const maxH       = window.innerHeight - NAV_H - topTooltip - 8;
      return { ...base, top: topTooltip, maxHeight: Math.max(maxH, 140), overflow: 'auto' };
    } else {
      // Metti sopra — più spazio sopra
      const bottomTooltip = window.innerHeight - rect.top + PADDING + TOOLTIP_GAP;
      const maxH          = rect.top - PADDING - TOOLTIP_GAP - TOP_SAFE - 8;
      return { ...base, bottom: bottomTooltip, maxHeight: Math.max(maxH, 140), overflow: 'auto' };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'all' }}>

      {/* Overlay scuro con buco spotlight */}
      {pronto && rect ? (
        <svg
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PADDING} y={rect.top - PADDING}
                width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
                rx="12" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)" />
          <rect
            x={rect.left - PADDING} y={rect.top - PADDING}
            width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
            rx="12" fill="none" stroke="#647144" strokeWidth="2.5"
          />
        </svg>
      ) : (
        <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.72)', pointerEvents: 'none' }} />
      )}

      {/* Tooltip — si posiziona dove c'è più spazio, mai fuori schermo */}
      <div
        className="rounded-[20px] shadow-2xl flex flex-col"
        style={{
          ...calcolaTooltip(),
          background: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}>

        {/* Contenuto scrollabile se necessario */}
        <div className="p-5 flex-1 overflow-auto">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === step ? 20 : 6,
                  height:     6,
                  background: i === step ? T.primary : '#D1D5DB',
                }} />
            ))}
          </div>

          <h3 className="text-base font-semibold mb-2"
            style={{ fontFamily: "'Lora', serif", color: T.textPrimary }}>
            {stepCorrente.titolo}
          </h3>

          {/* Contenuto standard per gli step normali */}
          {!isInstalla && (
            <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>
              {stepCorrente.testo}
            </p>
          )}

          {/* Contenuto custom per lo step installazione */}
          {isInstalla && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>
                Aggiungila allo schermo come un'app vera — si apre senza browser, occupa meno spazio di un'app normale e funziona sempre.
              </p>

              {/* Istruzioni iPhone / iPad */}
              {(isIOS || (!isIOS && !isAndroid)) && (
                <div className="rounded-2xl p-3 space-y-2"
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <p className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>
                    🍎 iPhone e iPad (Safari)
                  </p>
                  <ol className="text-xs space-y-1.5 pl-1" style={{ color: T.textPrimary }}>
                    <li><span className="font-semibold">1.</span> Tocca il pulsante <strong>Condividi</strong> in basso al centro — l'icona con la freccia che punta in su <strong>⬆</strong></li>
                    <li><span className="font-semibold">2.</span> Scorri verso il basso e tocca <strong>"Aggiungi alla schermata Home"</strong></li>
                    <li><span className="font-semibold">3.</span> Tocca <strong>"Aggiungi"</strong> in alto a destra</li>
                  </ol>
                  {!isIOS && (
                    <p className="text-[10px]" style={{ color: '#6B7280' }}>
                      Su Android segui le istruzioni qui sotto
                    </p>
                  )}
                </div>
              )}

              {/* Istruzioni Android */}
              {(isAndroid || (!isIOS && !isAndroid)) && (
                <div className="rounded-2xl p-3 space-y-2"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p className="text-xs font-semibold" style={{ color: '#166534' }}>
                    🤖 Android (Chrome)
                  </p>
                  <ol className="text-xs space-y-1.5 pl-1" style={{ color: T.textPrimary }}>
                    <li><span className="font-semibold">1.</span> Tocca i <strong>tre puntini</strong> ⋮ in alto a destra nel browser</li>
                    <li><span className="font-semibold">2.</span> Tocca <strong>"Aggiungi alla schermata Home"</strong> oppure <strong>"Installa app"</strong></li>
                    <li><span className="font-semibold">3.</span> Conferma toccando <strong>"Installa"</strong></li>
                  </ol>
                  <p className="text-[10px]" style={{ color: '#6B7280' }}>
                    Se non vedi questa opzione, apri Lenticchia in Chrome (non in altri browser)
                  </p>
                </div>
              )}

              <p className="text-[11px] text-center" style={{ color: T.textSec }}>
                Puoi farlo anche dopo — vai su Profilo → "Aggiungi alla schermata Home"
              </p>
            </div>
          )}
        </div>

        {/* Bottoni sempre visibili — sticky in fondo al tooltip */}
        <div className="px-5 pb-5 pt-3 shrink-0"
          style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3">
            <button
              onClick={onSalta}
              className="text-xs px-3 py-2.5 rounded-xl font-medium shrink-0"
              style={{ color: T.textSec, background: T.bg }}>
              Salta tutto
            </button>
            <button
              onClick={avanti}
              className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: T.primary, color: '#fff', boxShadow: '0 4px 16px rgba(100,113,68,0.3)' }}>
              {isUltimoStep ? (isInstalla ? '✓ Capito, inizia!' : '🌿 Inizia a risparmiare!') : 'Avanti →'}
            </button>
          </div>
          <p className="text-center text-[10px] mt-2.5" style={{ color: '#9CA3AF' }}>
            {step + 1} di {TUTORIAL_STEPS.length}
          </p>
        </div>

      </div>
    </div>
  );
};

// ─── Schermata Onboarding Demografico (opzionale, Sprint 1) ──────────────────
// Mostrata una sola volta dopo l'onboarding supermercati.
// Reward: +50 punti immediati al completamento (anche se si saltano tutte le domande).
// Tutti i campi sono opzionali — l'utente può saltare singole domande o tutto il form.
// Dati salvati in users/{uid}/private/profilo_demografico (mai nel profilo principale).

const FASCIA_ETA_OPTIONS = [
  '18-29', '30-44', '45-59', '60-74', '75+', 'Preferisco non dirlo',
];

const NUCLEO_OPTIONS = [
  'Vivo da solo/a',
  'Coppia senza figli',
  'Famiglia con figli piccoli (0-12)',
  'Famiglia con figli adolescenti/adulti',
  'Coabitazione (coinquilini)',
  'Preferisco non dirlo',
];

const PREFERENZE_DIETETICHE_OPTIONS = [
  'Vegetariano/a', 'Vegano/a', 'Senza glutine', 'Senza lattosio',
  'Bio-oriented', 'Halal/Kosher', 'Nessuna in particolare',
];

const SchermataOnboardingDemografico = ({ onConferma, onSalta, precompilato = null }) => {
  const [step, setStep]                   = useState(1); // 1-4
  const [fasciaEta, setFasciaEta]         = useState(precompilato?.fascia_eta || null);
  const [nucleo, setNucleo]               = useState(precompilato?.nucleo || null);
  const [cap, setCap]                     = useState(precompilato?.cap || '');
  const [capErrore, setCapErrore]         = useState('');
  const [prefDiet, setPrefDiet]           = useState(precompilato?.preferenze_dietetiche || []);
  const [salvando, setSalvando]           = useState(false);

  const STEPS_TOTALI = 4;

  const togglePrefDiet = (p) => {
    setPrefDiet(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const validaCapEAvanza = () => {
    if (cap && !/^\d{5}$/.test(cap.trim())) {
      setCapErrore('Inserisci un CAP valido a 5 cifre');
      return;
    }
    setCapErrore('');
    setStep(4);
  };

  const conferma = async () => {
    setSalvando(true);
    const dati = {
      fascia_eta:              fasciaEta,
      nucleo:                  nucleo,
      cap:                     cap.trim() || null,
      preferenze_dietetiche:   prefDiet,
      versione_form:           1,
      uid:                     null, // compilato lato onConferma
    };
    await onConferma(dati);
    setSalvando(false);
  };

  // Progress bar
  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: STEPS_TOTALI }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all"
          style={{ background: i < step ? T.primary : T.border }} />
      ))}
    </div>
  );

  const StepWrapper = ({ children }) => (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>
      {/* Header */}
      <div className="safe-top shrink-0 px-5 pt-6 pb-4"
        style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium" style={{ color: T.textSec }}>
            Domanda {step} di {STEPS_TOTALI}
          </span>
          <button onClick={onSalta}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: T.textSec, background: T.bg }}>
            Salta tutto
          </button>
        </div>
        <ProgressBar />
        {/* Banner privacy */}
        <div className="rounded-[14px] p-3 mb-1"
          style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
          <p className="text-[11px] leading-relaxed" style={{ color: T.primary }}>
            🔒 Questi dati ci aiutano a darti consigli più precisi e a segnalarti offerte
            rilevanti. In forma completamente anonima e aggregata (mai individuale) potranno
            essere condivisi con partner di ricerca di mercato. Puoi modificare o revocare
            questa condivisione in ogni momento dal tuo profilo.{' '}
            <strong>Tutti i campi sono opzionali.</strong>
          </p>
        </div>
      </div>
      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {children}
      </div>
    </div>
  );

  // ── Step 1: Fascia età ─────────────────────────────────────────────────────
  if (step === 1) return (
    <StepWrapper>
      <h2 className="mb-1" style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
        Quanti anni hai?
      </h2>
      <p className="text-sm mb-5" style={{ color: T.textSec }}>
        Ci aiuta a personalizzare le offerte più rilevanti per te.
      </p>
      <div className="space-y-2">
        {FASCIA_ETA_OPTIONS.map(opt => (
          <button key={opt} onClick={() => { setFasciaEta(opt); setStep(2); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.99]"
            style={{
              background: fasciaEta === opt ? '#EEF2E4' : T.surface,
              border: `1.5px solid ${fasciaEta === opt ? T.primary : T.border}`,
            }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: fasciaEta === opt ? T.primary : T.border }}>
              {fasciaEta === opt && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
            </div>
            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{opt}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(2)}
        className="w-full mt-4 py-3 text-sm"
        style={{ color: T.textSec }}>
        Preferisco non rispondere →
      </button>
    </StepWrapper>
  );

  // ── Step 2: Nucleo familiare ───────────────────────────────────────────────
  if (step === 2) return (
    <StepWrapper>
      <h2 className="mb-1" style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
        Come è composto il tuo nucleo?
      </h2>
      <p className="text-sm mb-5" style={{ color: T.textSec }}>
        Ci aiuta a capire meglio le esigenze di spesa della tua famiglia.
      </p>
      <div className="space-y-2">
        {NUCLEO_OPTIONS.map(opt => (
          <button key={opt} onClick={() => { setNucleo(opt); setStep(3); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.99]"
            style={{
              background: nucleo === opt ? '#EEF2E4' : T.surface,
              border: `1.5px solid ${nucleo === opt ? T.primary : T.border}`,
            }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: nucleo === opt ? T.primary : T.border }}>
              {nucleo === opt && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
            </div>
            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{opt}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(3)}
        className="w-full mt-4 py-3 text-sm"
        style={{ color: T.textSec }}>
        Preferisco non rispondere →
      </button>
    </StepWrapper>
  );

  // ── Step 3: CAP ────────────────────────────────────────────────────────────
  if (step === 3) return (
    <StepWrapper>
      <h2 className="mb-1" style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
        Qual è il tuo CAP?
      </h2>
      <p className="text-sm mb-5" style={{ color: T.textSec }}>
        Usiamo solo il CAP (mai l'indirizzo preciso) per aggregare dati per zona.
      </p>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={cap}
        onChange={e => { setCap(e.target.value.replace(/\D/g, '').slice(0, 5)); setCapErrore(''); }}
        placeholder="es. 00154"
        maxLength={5}
        className="w-full px-4 py-3.5 rounded-[16px] text-lg outline-none text-center font-mono mb-2"
        style={{ background: T.surface, border: `1.5px solid ${capErrore ? T.accent : T.border}`, color: T.textPrimary, letterSpacing: '0.1em' }}
      />
      {capErrore && (
        <p className="text-xs text-center mb-3" style={{ color: T.accent }}>{capErrore}</p>
      )}
      <button onClick={validaCapEAvanza}
        disabled={!cap && false}
        className="w-full py-4 rounded-[18px] text-sm font-semibold transition-all active:scale-[0.98] mt-2"
        style={{ background: T.primary, color: '#fff' }}>
        {cap ? 'Avanti' : 'Salta questo campo'}
      </button>
      <button onClick={() => { setCap(''); setStep(4); }}
        className="w-full mt-3 py-3 text-sm"
        style={{ color: T.textSec }}>
        Preferisco non dirlo →
      </button>
    </StepWrapper>
  );

  // ── Step 4: Preferenze dietetiche (multi-select) ──────────────────────────
  return (
    <StepWrapper>
      <h2 className="mb-1" style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
        Hai preferenze alimentari?
      </h2>
      <p className="text-sm mb-5" style={{ color: T.textSec }}>
        Selezione multipla. Ci aiuta a mettere in evidenza le offerte più adatte a te.
      </p>
      <div className="space-y-2 mb-6">
        {PREFERENZE_DIETETICHE_OPTIONS.map(opt => {
          const sel = prefDiet.includes(opt);
          return (
            <button key={opt} onClick={() => togglePrefDiet(opt)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.99]"
              style={{
                background: sel ? '#EEF2E4' : T.surface,
                border: `1.5px solid ${sel ? T.primary : T.border}`,
              }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: sel ? T.primary : T.border }}>
                {sel && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
              </div>
              <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{opt}</span>
            </button>
          );
        })}
      </div>
      <button onClick={conferma} disabled={salvando}
        className="w-full py-4 rounded-[18px] text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: T.primary, color: '#fff', boxShadow: '0 4px 16px rgba(100,113,68,0.3)' }}>
        {salvando
          ? <><Loader size={16} className="animate-spin" /> Salvo...</>
          : <><span>✓</span> Completa e guadagna +50pt</>}
      </button>
      <button onClick={onSalta}
        className="w-full mt-3 py-3 text-sm"
        style={{ color: T.textSec }}>
        Salta tutto
      </button>
    </StepWrapper>
  );
};

// ─── Card dati demografici (usata in TabProfilo sezione account) ──────────────
const DatiDemograficiCard = () => {
  const { utente } = useAuth();
  const [profDemo, setProfDemo]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [mostraForm, setMostraForm] = useState(false);

  useEffect(() => {
    if (!utente) return;
    getDoc(doc(db, 'users', utente.uid, 'private', 'profilo_demografico'))
      .then(snap => {
        setProfDemo(snap.exists() ? snap.data() : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [utente?.uid]);

  const salvaModifica = async (dati) => {
    try {
      await setDoc(doc(db, 'users', utente.uid, 'private', 'profilo_demografico'), {
        ...dati,
        uid:           utente.uid,
        completato_il: profDemo?.completato_il || new Date().toISOString(),
        versione_form: 1,
      });
      setProfDemo({ ...dati, uid: utente.uid });
    } catch (err) {
      console.error('Errore salvataggio demografico:', err);
    } finally {
      setMostraForm(false);
    }
  };

  if (loading) return null;

  if (mostraForm) return (
    <div className="rounded-[20px] overflow-hidden"
      style={{ border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
      <SchermataOnboardingDemografico
        onConferma={salvaModifica}
        onSalta={() => setMostraForm(false)}
        precompilato={profDemo}
      />
    </div>
  );

  return (
    <div className="rounded-[20px] p-5"
      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
          Dati demografici
        </h3>
        <button onClick={() => setMostraForm(true)}
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: T.bg, color: T.primary, border: `1px solid ${T.border}` }}>
          {profDemo ? 'Modifica' : 'Compila'}
        </button>
      </div>
      {profDemo ? (
        <div className="space-y-1">
          {profDemo.fascia_eta && (
            <p className="text-xs" style={{ color: T.textSec }}>
              <span className="font-medium" style={{ color: T.textPrimary }}>Età:</span> {profDemo.fascia_eta}
            </p>
          )}
          {profDemo.nucleo && (
            <p className="text-xs" style={{ color: T.textSec }}>
              <span className="font-medium" style={{ color: T.textPrimary }}>Nucleo:</span> {profDemo.nucleo}
            </p>
          )}
          {profDemo.cap && (
            <p className="text-xs" style={{ color: T.textSec }}>
              <span className="font-medium" style={{ color: T.textPrimary }}>CAP:</span> {profDemo.cap}
            </p>
          )}
          {profDemo.preferenze_dietetiche?.length > 0 && (
            <p className="text-xs" style={{ color: T.textSec }}>
              <span className="font-medium" style={{ color: T.textPrimary }}>Preferenze:</span>{' '}
              {profDemo.preferenze_dietetiche.join(', ')}
            </p>
          )}
          <p className="text-[10px] mt-2" style={{ color: T.textSec }}>
            🔒 Dati condivisi solo in forma anonima e aggregata. Puoi modificarli o rimuoverli in qualsiasi momento.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-3" style={{ color: T.textSec }}>
            Aggiungi alcune informazioni opzionali per ricevere offerte più rilevanti e guadagnare +50pt.
          </p>
          <button onClick={() => setMostraForm(true)}
            className="w-full py-3 rounded-[16px] text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: '#EEF2E4', color: T.primary }}>
            Compila e guadagna +50pt →
          </button>
        </div>
      )}
    </div>
  );
};

const TabProfilo = () => {
  const { utente, profilo, logout, isLoggedIn, cambiaCittà, cittàAttiva, riavviaTutorial } = useAuth();
  const [sezione, setSezione] = useState('account'); // 'account' | 'attivita' | 'supermercati' | 'prodotti'
  // G1: log attività punti
  const [logAttivita, setLogAttivita] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logCaricato, setLogCaricato] = useState(false);

  useEffect(() => {
    if (sezione !== 'attivita' || !utente || logCaricato) return;
    const carica = async () => {
      setLogLoading(true);
      try {
        // Legge gli scontrini validati come fonte del log punti
        const q = query(
          collection(db, 'spese_personali', utente.uid, 'scontrini'),
          orderBy('data_registrazione', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const voci = snap.docs.map(d => {
          const data = d.data();
          const ts = data.data_registrazione?.toDate?.();
          const dataFmt = ts
            ? ts.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
            : data.data_acquisto || '—';
          const nSpec = data.n_specifici || 0;
          let punti = 15;
          if (nSpec > 10) punti += 5;
          punti += 5; // bonus settimana (approssimazione)
          return {
            id: d.id,
            tipo: 'scontrino',
            label: `Scontrino ${data.insegna || ''}`.trim(),
            dettaglio: `${data.n_prodotti_tot || 0} prodotti · ${nSpec} verificati`,
            punti: `+${punti}`,
            data: dataFmt,
            ts: ts || new Date(data.data_acquisto || 0),
          };
        });
        setLogAttivita(voci);
        setLogCaricato(true);
      } catch { setLogAttivita([]); }
      finally { setLogLoading(false); }
    };
    carica();
  }, [sezione, utente, logCaricato]);

  if (!isLoggedIn) return <SchermataLogin />;

  const livello = getLivello(profilo?.punti || 0);
  const prossimoLivello = getProssimoLivello(profilo?.punti || 0);
  const puntiAttuali = profilo?.punti || 0;
  const puntiProssimo = prossimoLivello?.min || puntiAttuali;
  const livelloIdx = LIVELLI.indexOf(getLivello(puntiAttuali));
  const puntiBase = LIVELLI[livelloIdx]?.min || 0;
  const progressoPerc = prossimoLivello ? Math.round(((puntiAttuali - puntiBase) / (puntiProssimo - puntiBase)) * 100) : 100;

  const TAB_PROFILO = [
    { id: 'account', label: 'Account' },
    { id: 'attivita', label: 'Attività' },
    { id: 'supermercati', label: 'Supermercati' },
    { id: 'prodotti', label: 'Preferiti' },
  ];

  return (
    <div className="flex flex-col h-full pb-32 overflow-y-auto" style={{ background: T.bg }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-4 mb-5">
          {utente.photoURL
            ? <img src={utente.photoURL} alt="avatar" className="w-16 h-16 rounded-full" style={{ border: `2px solid ${T.border}` }} />
            : <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: T.primary }}>
                {utente.displayName?.[0] || utente.email?.[0]?.toUpperCase() || '?'}
              </div>
          }
          <div>
            <h2 className="font-semibold" style={{ color: T.textPrimary, fontFamily: "'Lora', serif", fontSize: '18px' }}>
              {utente.displayName || 'Utente'}
            </h2>
            <p className="text-sm" style={{ color: T.textSec }}>{utente.email}</p>
            <span className={`mt-1.5 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${livello.colore}`}>
              {livello.nome}
            </span>
          </div>
        </div>
        {/* Sub-tab navigation */}
        <div className="flex gap-2">
          {TAB_PROFILO.map(t => (
            <button key={t.id} onClick={() => setSezione(t.id)}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={sezione === t.id
                ? { background: T.primary, color: '#fff' }
                : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }
              }>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {sezione === 'account' && (
          <>
            {/* Card punti */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium" style={{ color: T.textSec }}>I tuoi punti</span>
                <span className="text-3xl font-medium" style={{ color: T.primary, fontFamily: "'Lora', serif" }}>{puntiAttuali}</span>
              </div>
              {prossimoLivello && (
                <>
                  <div className="flex justify-between text-xs mb-2" style={{ color: T.textSec }}>
                    <span>{livello.nome}</span>
                    <span>{prossimoLivello.nome} · {puntiProssimo} pt</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progressoPerc}%`, background: T.primary }} />
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: T.textSec }}>
                    {puntiProssimo - puntiAttuali} punti al prossimo livello
                  </p>
                </>
              )}
            </div>

            {/* Tutorial */}
            <div className="rounded-[20px] p-5"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textSec }}>Guida all'app</h3>
              <p className="text-xs mb-3" style={{ color: T.textSec }}>
                Rivedi il tour guidato che mostra tutte le funzioni principali di Lenticchia.
              </p>
              <button
                onClick={riavviaTutorial}
                className="w-full py-3 rounded-[16px] text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: '#EEF2E4', color: T.primary }}>
                🌿 Riavvia il tutorial
              </button>

              {/* Istruzioni installazione PWA */}
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <p className="text-xs font-medium mb-2" style={{ color: T.textPrimary }}>
                  📲 Aggiungi alla schermata Home
                </p>
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
                    In Safari: tocca <strong>⬆ Condividi</strong> → <strong>"Aggiungi alla schermata Home"</strong> → <strong>"Aggiungi"</strong>
                  </p>
                ) : /Android/.test(navigator.userAgent) ? (
                  <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
                    In Chrome: tocca i <strong>⋮ tre puntini</strong> → <strong>"Aggiungi alla schermata Home"</strong> o <strong>"Installa app"</strong>
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
                    <strong>iPhone:</strong> Safari → ⬆ Condividi → "Aggiungi alla schermata Home"<br />
                    <strong>Android:</strong> Chrome → ⋮ → "Aggiungi alla schermata Home"
                  </p>
                )}
              </div>
            </div>

            {/* Dati demografici */}
            <DatiDemograficiCard />

            {/* Città attiva — selettore */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textSec }}>La tua città</h3>
              <p className="text-xs mb-3" style={{ color: T.textSec }}>
                Vedi le offerte della città selezionata. Puoi cambiarla in qualsiasi momento.
              </p>
              <div className="flex gap-2">
                {CITTA_DISPONIBILI.map(c => (
                  <button key={c.id}
                    onClick={() => cambiaCittà(c.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm font-medium transition-all active:scale-[0.97]"
                    style={cittàAttiva === c.id
                      ? { background: T.primary, color: '#fff', boxShadow: '0 4px 12px rgba(100,113,68,0.25)' }
                      : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              {profilo?.città_registrazione && profilo.città_registrazione !== cittàAttiva && (
                <p className="text-[10px] mt-2 text-center" style={{ color: T.textSec }}>
                  Registrato a {profilo.città_registrazione} · stai vedendo {cittàAttiva}
                </p>
              )}
            </div>

            {/* Come guadagnare */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: T.textSec }}>Come guadagnare punti</h3>
              <div className="space-y-3">
                {[
                  { azione: 'Scontrino caricato e verificato', punti: '+15' },
                  { azione: 'Scontrino con più di 10 prodotti', punti: '+5' },
                  { azione: 'Insegna poco coperta (CTS, Elite...)', punti: '+10' },
                  { azione: 'Primo scontrino della settimana', punti: '+5' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: T.textPrimary }}>{item.azione}</span>
                    <span className="text-sm font-semibold ml-3 shrink-0" style={{ color: T.primary }}>{item.punti}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sblocchi */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: T.textSec }}>Livelli e sblocchi</h3>
              <div className="space-y-3">
                {LIVELLI.map((l) => {
                  const sbloccato = puntiAttuali >= l.min;
                  return (
                    <div key={l.nome} className={`flex items-center gap-3 ${sbloccato ? '' : 'opacity-35'}`}>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${l.colore}`}>{l.nome}</span>
                      <span className="text-xs" style={{ color: T.textSec }}>
                        {l.min === 0 && 'Accesso base alle offerte'}
                        {l.min === 50 && 'Storico spesa 6 mesi'}
                        {l.min === 150 && 'Notifiche offerte sui tuoi prodotti'}
                        {l.min === 400 && 'Offerte 24h in anticipo'}
                        {l.min === 1000 && '🌟 Premium gratuito a vita'}
                      </span>
                      {sbloccato && <span className="ml-auto text-xs" style={{ color: T.primary }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Banner Guru unlock */}
            {profilo?.piano === 'premium' && profilo?.piano_origine === 'guru_unlock' && (
              <div className="rounded-[20px] p-5"
                style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1px solid #F59E0B' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '28px' }}>🌟</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Premium sbloccato!</p>
                    <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                      Hai raggiunto il livello Guru con i tuoi contributi alla community. Premium attivo a vita.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Piano */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Piano attuale</h3>
                  <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                    {profilo?.piano === 'premium'
                      ? profilo?.piano_origine === 'guru_unlock'
                        ? '🌟 Guru — Premium vita'
                        : 'Premium attivo'
                      : `Gratuito · ${1000 - puntiAttuali > 0 ? `${1000 - puntiAttuali}pt al Premium` : 'Premium disponibile!'}`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${profilo?.piano === 'premium' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-stone-100 text-stone-600'}`}>
                  {profilo?.piano === 'premium' ? '🌟 PREMIUM' : 'FREE'}
                </span>
              </div>
              {profilo?.piano !== 'premium' && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: T.textSec }}>Verso il Premium Guru</span>
                    <span className="text-xs font-medium" style={{ color: T.primary }}>{Math.min(puntiAttuali, 1000)}/1000 pt</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: T.border }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((puntiAttuali / 1000) * 100, 100)}%`, background: T.primary }} />
                  </div>
                </div>
              )}
            </div>

            {/* Azioni */}
            <div className="rounded-[20px] overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-red-50 active:scale-[0.99]"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <LogOut size={17} strokeWidth={1.5} className="text-red-500" />
                <span className="text-sm" style={{ color: '#DC2626' }}>Esci dall'account</span>
                <ChevronRight size={15} className="ml-auto text-gray-300" />
              </button>
              <button onClick={() => alert('In arrivo nel prossimo sprint.')}
                className="w-full flex items-center gap-3 px-5 py-4 transition-colors active:scale-[0.99]"
                style={{ color: T.textSec }}>
                <X size={17} strokeWidth={1.5} />
                <span className="text-sm">Cancella i miei dati</span>
                <ChevronRight size={15} className="ml-auto text-gray-300" />
              </button>
            </div>
          </>
        )}

        {sezione === 'supermercati' && <SezioneSupermercati />}
        {sezione === 'prodotti' && <SezioneProdottiPreferiti />}

        {/* G1: Sezione Attività — log punti */}
        {sezione === 'attivita' && (
          <div className="space-y-3">
            {/* Riepilogo punti totali */}
            <div className="rounded-[20px] p-5"
              style={{ background: T.primary, boxShadow: '0 8px 24px rgba(100,113,68,0.25)' }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Punti totali guadagnati
              </p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '40px', fontWeight: 500, color: '#fff', lineHeight: 1 }}>
                {profilo?.punti || 0}
              </p>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {profilo?.scontrini_totali || 0} scontrini contribuiti alla community
              </p>
            </div>

            {/* Feed attività */}
            <div className="rounded-[20px] overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Storico attività</h3>
                <Receipt size={16} strokeWidth={1.5} style={{ color: T.textSec }} />
              </div>

              {logLoading ? (
                <div className="px-5 py-10 flex flex-col items-center gap-3">
                  <Loader size={24} strokeWidth={1.5} className="animate-spin" style={{ color: T.primary }} />
                  <p className="text-sm" style={{ color: T.textSec }}>Carico attività...</p>
                </div>
              ) : logAttivita.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <ClipboardCheck size={32} strokeWidth={1} className="mx-auto mb-3" style={{ color: T.border }} />
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>Nessuna attività ancora</p>
                  <p className="text-xs mt-1" style={{ color: T.textSec }}>
                    Carica il tuo primo scontrino per iniziare a guadagnare punti
                  </p>
                </div>
              ) : (
                logAttivita.map((voce, i) => (
                  <div key={voce.id} className="flex items-center px-5 py-3.5"
                    style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                    {/* Icona tipo */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mr-3"
                      style={{ background: '#EEF2E4' }}>
                      <Receipt size={16} strokeWidth={1.5} style={{ color: T.primary }} />
                    </div>
                    {/* Contenuto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>{voce.label}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: T.textSec }}>
                        {voce.dettaglio} · {voce.data}
                      </p>
                    </div>
                    {/* Punti */}
                    <span className="ml-3 shrink-0 text-sm font-semibold px-2.5 py-1 rounded-xl"
                      style={{ background: '#EEF2E4', color: T.primary, fontFamily: "'Lora', serif" }}>
                      {voce.punti} pt
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Legenda come guadagnare */}
            <div className="rounded-[20px] p-5"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: T.textSec }}>
                Come guadagnare punti
              </h3>
              <div className="space-y-3">
                {[
                  { emoji: '🧾', azione: 'Scontrino confermato', punti: '+15 pt', note: 'Base' },
                  { emoji: '📦', azione: 'Scontrino con 10+ prodotti', punti: '+5 pt', note: 'Bonus' },
                  { emoji: '📅', azione: 'Primo scontrino settimana', punti: '+5 pt', note: 'Bonus' },
                  { emoji: '🗞️', azione: 'Volantino approvato', punti: '+25 pt', note: 'Community' },
                  { emoji: '🏷️', azione: 'Volantino insegna nuova', punti: '+5 pt', note: 'Bonus' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span style={{ fontSize: '16px' }}>{r.emoji}</span>
                      <div>
                        <p className="text-sm" style={{ color: T.textPrimary }}>{r.azione}</p>
                        <p className="text-[10px] uppercase font-medium" style={{ color: T.textSec }}>{r.note}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: T.primary }}>{r.punti}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab Invia Scontrino ─────────────────────────────────────────────────────

const SCONTRINO_INIT = {
  modalita:         'scontrino',  // 'scontrino' | 'volantino'
  stato:            'idle',       // 'idle' | 'caricando' | 'successo' | 'errore'
  messaggio:        '',
  puntiAnimati:     false,
  foto:             [],
  insegnaVolantino: '',
  validoFino:       '',
  posizioneRilevata: null,
  scontriniInAttesa: [],
  loadingInAttesa:  false,
  annullando:       null,
};

function scontrinoReducer(state, action) {
  switch (action.type) {
    case 'SET_MODALITA':    return { ...state, modalita: action.payload, stato: 'idle', messaggio: '', foto: [] };
    case 'SET_STATO':       return { ...state, stato: action.payload };
    case 'SET_MESSAGGIO':   return { ...state, messaggio: action.payload };
    case 'SET_PUNTI':       return { ...state, puntiAnimati: action.payload };
    case 'SET_FOTO':        return { ...state, foto: action.payload };
    case 'SET_INSEGNA':     return { ...state, insegnaVolantino: action.payload };
    case 'SET_VALIDO_FINO': return { ...state, validoFino: action.payload };
    case 'SET_POSIZIONE':   return { ...state, posizioneRilevata: action.payload };
    case 'SET_IN_ATTESA':   return { ...state, scontriniInAttesa: action.payload };
    case 'SET_LOADING':     return { ...state, loadingInAttesa: action.payload };
    case 'SET_ANNULLANDO':  return { ...state, annullando: action.payload };
    case 'ANNULLA_OK':      return { ...state, scontriniInAttesa: state.scontriniInAttesa.filter(s => s.id !== action.payload), annullando: null };
    case 'RESET_FORM':      return { ...state, stato: 'idle', messaggio: '', foto: [], puntiAnimati: false };
    default:                return state;
  }
}

// ─── Form inserimento manuale spesa (senza scontrino) ───────────────────────
// I dati vanno SOLO in spese_personali — non passano per Claude Vision,
// non contribuiscono a prezzi_scontrini né statistiche_prodotti,
// non generano punti (non verificabili).

const CATEGORIE_PRODOTTO = [
  'carne', 'pesce', 'frutta_verdura', 'freschissimi',
  'dispensa', 'surgelati', 'bevande', 'casa_igiene', 'altro',
];

const FormInserimentoManuale = ({ utente, profilo, onSuccesso, onErrore }) => {
  const [insegna,     setInsegna]     = useState('');
  const [data,        setData]        = useState(new Date().toISOString().slice(0, 10));
  const [prodotti,    setProdotti]    = useState([{ nome: '', prezzo: '', categoria: 'altro' }]);
  const [salvando,    setSalvando]    = useState(false);

  const aggiornaProdotto = (idx, campo, val) => {
    setProdotti(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: val } : p));
  };

  const aggiungiRiga = () => {
    setProdotti(prev => [...prev, { nome: '', prezzo: '', categoria: 'altro' }]);
  };

  const rimuoviRiga = (idx) => {
    if (prodotti.length === 1) return;
    setProdotti(prev => prev.filter((_, i) => i !== idx));
  };

  const totale = prodotti.reduce((sum, p) => sum + (parseFloat(p.prezzo) || 0), 0);

  const salva = async () => {
    if (!insegna.trim()) { onErrore('Inserisci il nome del supermercato.'); return; }
    if (!data)           { onErrore('Inserisci la data della spesa.'); return; }
    const prodottiFiltrati = prodotti
      .filter(p => p.nome.trim())
      .map(p => ({
        nome_normalizzato: p.nome.trim(),
        nome_raw:          p.nome.trim(), // manuale: raw = normalizzato
        prezzo_unitario:   parseFloat(p.prezzo) || 0,
        quantita:          1,
        categoria:         p.categoria || 'altro',
        tipo_voce:         'specifico',
      }));

    if (!prodottiFiltrati.length) { onErrore('Inserisci almeno un prodotto.'); return; }

    setSalvando(true);
    try {
      await addDoc(collection(db, 'spese_personali', utente.uid, 'scontrini'), {
        insegna:            insegna.trim(),
        data_acquisto:      data,
        totale_scontrino:   totale,
        prodotti:           prodottiFiltrati,
        n_prodotti_tot:     prodottiFiltrati.length,
        n_specifici:        prodottiFiltrati.length,
        n_aggregati:        0,
        tipo_scontrino:     'manuale',
        fonte:              'manuale',        // non propagato alla community
        data_registrazione: serverTimestamp(),
        coda_doc_id:        null,
      });
      onSuccesso();
    } catch (err) {
      console.error(err);
      onErrore('Errore nel salvataggio. Riprova.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Info banner */}
      <div className="rounded-[16px] px-4 py-3"
        style={{ background: '#EEF2E4', border: `1px solid ${T.border}` }}>
        <p className="text-xs font-medium mb-0.5" style={{ color: T.primary }}>
          ✏️ Inserimento manuale
        </p>
        <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
          I dati vengono salvati nel tuo storico personale ma non contribuiscono
          alle statistiche della community — solo gli scontrini fotografati sono verificabili.
        </p>
      </div>

      {/* Intestazione */}
      <div className="rounded-[20px] p-5"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.textSec }}>
          Dati spesa
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: T.textSec }}>
              Supermercato <span style={{ color: T.accent }}>*</span>
            </label>
            <input
              type="text"
              list="insegne-manuali"
              value={insegna}
              onChange={e => setInsegna(e.target.value)}
              placeholder="es. Lidl, Conad, Esselunga..."
              className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.bg, border: `1.5px solid ${insegna.trim() ? T.primary : T.border}`, color: T.textPrimary }}
            />
            <datalist id="insegne-manuali">
              {INSEGNE_DISPONIBILI.map(ins => <option key={ins} value={ins} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: T.textSec }}>
              Data acquisto <span style={{ color: T.accent }}>*</span>
            </label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
          </div>
        </div>
      </div>

      {/* Lista prodotti */}
      <div className="rounded-[20px] p-5"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.textSec }}>
          Prodotti
        </p>
        <div className="space-y-2">
          {prodotti.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {/* Nome prodotto */}
              <input
                type="text"
                value={p.nome}
                onChange={e => aggiornaProdotto(idx, 'nome', e.target.value)}
                placeholder="Nome prodotto"
                className="flex-1 px-3 py-2 rounded-xl text-base outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, minWidth: 0 }}
              />
              {/* Prezzo */}
              <input
                type="number"
                value={p.prezzo}
                onChange={e => aggiornaProdotto(idx, 'prezzo', e.target.value)}
                placeholder="€"
                step="0.01" min="0"
                className="px-3 py-2 rounded-xl text-base outline-none text-right"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, width: '72px' }}
              />
              {/* Rimuovi */}
              <button
                onClick={() => rimuoviRiga(idx)}
                disabled={prodotti.length === 1}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{ background: prodotti.length === 1 ? T.bg : '#FEE2E2', color: prodotti.length === 1 ? T.border : '#DC2626' }}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={aggiungiRiga}
          className="w-full mt-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.99]"
          style={{ background: T.bg, color: T.primary, border: `1px dashed ${T.primary}` }}>
          + Aggiungi prodotto
        </button>

        {/* Totale */}
        {totale > 0 && (
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: `1px solid ${T.border}` }}>
            <span className="text-xs" style={{ color: T.textSec }}>Totale</span>
            <span style={{ fontFamily: "'Lora', serif", fontSize: '18px', fontWeight: 600, color: T.textPrimary }}>
              {formattaPrezzo(totale)}
            </span>
          </div>
        )}
      </div>

      {/* Bottone salva */}
      <button
        onClick={salva}
        disabled={salvando}
        className="w-full py-4 rounded-[18px] text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: T.primary, color: '#fff', boxShadow: '0 4px 16px rgba(100,113,68,0.3)' }}>
        {salvando
          ? <><Loader size={16} className="animate-spin" /> Salvo...</>
          : <>✓ Salva spesa</>}
      </button>

      <p className="text-[10px] text-center" style={{ color: T.textSec }}>
        Non genera punti — solo gli scontrini fotografati sono verificabili
      </p>

    </div>
  );
};

const TabScontrino = ({ onApriRevisione = null }) => {
  const { utente, profilo } = useAuth();
  const isGuru = (profilo?.punti || 0) >= 1000;
  const [s, dispatch] = React.useReducer(scontrinoReducer, SCONTRINO_INIT);

  // Alias leggibili per il JSX — evita di riscrivere tutto il componente
  const modalita          = s.modalita;
  const stato             = s.stato;
  const messaggio         = s.messaggio;
  const puntiAnimati      = s.puntiAnimati;
  const foto              = s.foto;
  const insegnaVolantino  = s.insegnaVolantino;
  const validoFino        = s.validoFino;
  const posizioneRilevata = s.posizioneRilevata;
  const scontriniInAttesa = s.scontriniInAttesa;
  const loadingInAttesa   = s.loadingInAttesa;
  const annullando        = s.annullando;

  // Setter compatibili con il vecchio codice — wrappano il dispatch
  const setModalita          = (v) => dispatch({ type: 'SET_MODALITA', payload: v });
  const setStato             = (v) => dispatch({ type: 'SET_STATO', payload: v });
  const setMessaggio         = (v) => dispatch({ type: 'SET_MESSAGGIO', payload: v });
  const setPuntiAnimati      = (v) => dispatch({ type: 'SET_PUNTI', payload: v });
  const setFoto              = (v) => dispatch({ type: 'SET_FOTO', payload: typeof v === 'function' ? v(foto) : v });
  const setInsegnaVolantino  = (v) => dispatch({ type: 'SET_INSEGNA', payload: v });
  const setValidoFino        = (v) => dispatch({ type: 'SET_VALIDO_FINO', payload: v });
  const setPosizioneRilevata = (v) => dispatch({ type: 'SET_POSIZIONE', payload: v });
  const setScontriniInAttesa = (v) => dispatch({ type: 'SET_IN_ATTESA', payload: typeof v === 'function' ? v(scontriniInAttesa) : v });
  const setLoadingInAttesa   = (v) => dispatch({ type: 'SET_LOADING', payload: v });
  const setAnnullando        = (v) => dispatch({ type: 'SET_ANNULLANDO', payload: v });
  const inputRef = React.useRef(null);
  const inputVolRef = React.useRef(null);
  const MAX_FOTO = 4;
  const MAX_FOTO_VOL = 30;

  // A1: carica scontrini in attesa all'apertura del tab
  useEffect(() => {
    if (!utente) return;
    let mounted = true;
    const carica = async () => {
      setLoadingInAttesa(true);
      try {
        const q = query(
          collection(db, 'coda_scontrini'),
          where('uid', '==', utente.uid),
          where('stato', '==', 'in_attesa'),
          orderBy('data_caricamento', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);
        if (mounted) setScontriniInAttesa(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { if (mounted) setScontriniInAttesa([]); }
      finally { if (mounted) setLoadingInAttesa(false); }
    };
    carica();
    return () => { mounted = false; };
  }, [utente]);

  // A1: annulla un singolo scontrino in_attesa
  const annullaScontrino = async (docId) => {
    setAnnullando(docId);
    try {
      await deleteDoc(doc(db, 'coda_scontrini', docId));
      dispatch({ type: 'ANNULLA_OK', payload: docId });
    } catch (err) {
      console.error('Errore annullamento:', err);
    } finally { setAnnullando(null); }
  };

  const cambiaModalita = (m) => {
    setModalita(m);
    setStato('idle');
    setFoto([]);
    setMessaggio('');
    setInsegnaVolantino('');
    setValidoFino('');
    setPosizioneRilevata(null);
  };

  // Comprime immagine a max 800px, qualità 55% — ottimizzato per Firestore (limite 1MB doc)
  const comprimiImmagine = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 800;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const b64 = canvas.toDataURL('image/jpeg', 0.55);
      // Controllo dimensione: Firestore limite 1MB per documento
      // base64 è ~1.37x il binario, quindi max ~700KB binario per stare sotto 1MB doc
      const kbStimati = Math.round(b64.length * 0.75 / 1024);
      if (kbStimati > 700) {
        // Riprova con qualità ancora più bassa
        const b64low = canvas.toDataURL('image/jpeg', 0.35);
        resolve(b64low);
      } else {
        resolve(b64);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Errore lettura immagine')); };
    img.src = url;
  });

  const limite = modalita === 'volantino' ? MAX_FOTO_VOL : MAX_FOTO;

  const aggiungiFoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (foto.length + files.length > limite) {
      setMessaggio(`Massimo ${limite} foto per ${modalita === 'volantino' ? 'volantino' : 'scontrino'}.`);
      setStato('errore');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setMessaggio('Seleziona solo immagini.');
        setStato('errore');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setMessaggio('Una foto è troppo grande. Scatta da più vicino.');
        setStato('errore');
        return;
      }
    }

    // ── Verifica EXIF (solo per scontrini — serve foto recente) ──────────────
    if (modalita === 'scontrino') {
      for (const file of files) {
        const { ok, motivo } = await verificaExif(file);
        if (!ok) {
          setMessaggio(motivo || 'Foto non valida — scatta una foto recente dello scontrino.');
          setStato('errore');
          return;
        }
      }
    }

    // ── Rileva posizione GPS in background (non bloccante) ───────────────────
    // Per gli scontrini tentiamo il GPS — se fallisce non blocchiamo.
    // La posizione viene salvata come metadato per future verifiche anti-frode.
    if (!posizioneRilevata) {
      ottieniPosizione()
        .then(pos => setPosizioneRilevata(pos))
        .catch(() => {}); // GPS non disponibile — non blocca l'upload
    }

    const nuoveFoto = await Promise.all(files.map(async (file) => {
      const base64 = await comprimiImmagine(file);
      return { file, preview: base64, base64 };
    }));

    setFoto(prev => [...prev, ...nuoveFoto]);
    setStato('anteprima');
    setMessaggio('');
    const ref = modalita === 'volantino' ? inputVolRef : inputRef;
    if (ref.current) ref.current.value = '';
  };

  const rimuoviFoto = (index) => {
    setFoto(prev => {
      const nuove = prev.filter((_, i) => i !== index);
      if (nuove.length === 0) setStato('idle');
      return nuove;
    });
  };

  const inviaScontrino = async () => {
    if (!foto.length) return;
    if (!utente?.uid) {
      setStato('errore');
      setMessaggio('Sessione scaduta — rieffettua il login.');
      return;
    }
    setStato('caricando');

    try {
      await addDoc(collection(db, 'coda_scontrini'), {
        uid:              utente.uid,
        immagini_b64:     foto.map(f => f.base64),
        n_foto:           foto.length,
        stato:            'in_attesa',
        città:            profilo?.città_attiva || null,
        data_caricamento: serverTimestamp(),
      });

      setFoto([]);
      setPosizioneRilevata(null);
      setStato('successo');
      setTimeout(() => setPuntiAnimati(true), 600);
      setTimeout(() => { setStato('idle'); setPuntiAnimati(false); }, 5000);

    } catch (err) {
      console.error('Errore invio scontrino:', err);
      setStato('errore');
      // Mostra codice errore esatto per debug
      const code = err?.code || '';
      const msg = code === 'permission-denied'
        ? `Permesso negato (${code}) — uid: ${utente?.uid?.slice(0,8)}. Riprova o rieffettua il login.`
        : code
        ? `Errore Firebase: ${code}`
        : `Errore: ${err?.message?.slice(0, 100) || 'sconosciuto'}`;
      setMessaggio(msg);
    }
  };

  const inviaVolantino = async () => {
    if (!foto.length) return;
    if (!utente?.uid) {
      setStato('errore');
      setMessaggio('Sessione scaduta — rieffettua il login.');
      return;
    }
    if (!insegnaVolantino.trim()) {
      setMessaggio('Inserisci il nome del supermercato.');
      setStato('errore');
      return;
    }
    setStato('caricando');

    try {
      // Documento testata — contiene solo metadati, nessuna immagine
      const testatRef = await addDoc(collection(db, 'coda_volantini'), {
        uid:              utente.uid,
        n_foto:           foto.length,
        insegna:          insegnaVolantino.trim(),
        valido_fino:      validoFino || null,
        stato:            'in_attesa_revisione',
        città:            profilo?.città_attiva || null,
        data_caricamento: serverTimestamp(),
        posizione_upload: posizioneRilevata
          ? { lat: posizioneRilevata.lat, lng: posizioneRilevata.lng }
          : null,
      });

      // Un documento per ogni pagina — evita il limite 1MB di Firestore
      // Le immagini vengono cancellate dal backend dopo l'estrazione
      await Promise.all(foto.map((f, idx) =>
        addDoc(collection(db, 'coda_volantini', testatRef.id, 'pagine'), {
          uid:       utente.uid,
          indice:    idx,
          base64:    f.base64,
        })
      ));

      setFoto([]);
      setPosizioneRilevata(null);
      setStato('successo');
      setTimeout(() => setPuntiAnimati(true), 600);
      setTimeout(() => { setStato('idle'); setPuntiAnimati(false); setInsegnaVolantino(''); setValidoFino(''); }, 5000);

    } catch (err) {
      console.error('Errore invio volantino:', err);
      setStato('errore');
      const msg = err?.code === 'permission-denied'
        ? 'Permesso negato — rieffettua il login e riprova.'
        : err?.code
        ? `Errore ${err.code} — riprova tra qualche secondo.`
        : 'Errore nel caricamento. Riprova.';
      setMessaggio(msg);
    }
  };

  const inputId = modalita === 'volantino' ? 'volantino-input' : 'scontrino-input';

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28" style={{ background: T.bg }}>
      {/* Header con toggle */}
      <div className="px-5 pt-8 pb-5" style={{ background: T.primary }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>
          Contribuisci
        </h2>
        {/* Toggle pill */}
        <div className="flex rounded-2xl p-1" style={{ background: 'rgba(0,0,0,0.2)', width: 'fit-content' }}>
          {[
            { id: 'scontrino', label: '🧾 Scontrino' },
            { id: 'volantino', label: '📰 Volantino' },
            { id: 'manuale',   label: '✏️ Manuale' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => cambiaModalita(m.id)}
              className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
              style={modalita === m.id
                ? { background: '#fff', color: T.primary }
                : { color: 'rgba(255,255,255,0.7)' }
              }
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {modalita === 'scontrino'
            ? (foto.length === 0 ? 'Fotografa lo scontrino — elaboriamo stanotte.' : `${foto.length} foto pronte.`)
            : (foto.length === 0 ? 'Fotografa il volantino cartaceo — arricchisci il database.' : `${foto.length} foto — continua per pagine successive.`)
          }
        </p>
      </div>

      <div className="px-4 -mt-4 relative z-10">

        {/* Input file nascosto — duplicato per le due modalità */}
        <input id="scontrino-input" ref={inputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={aggiungiFoto} multiple />
        <input id="volantino-input" ref={inputVolRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={aggiungiFoto} multiple />

        {/* ── STATO IDLE ── */}
        {stato === 'idle' && modalita === 'scontrino' && (
          <div className="space-y-4 animate-fade-in-up">

            {/* Banner Guru — accesso revisione volantini */}
            {isGuru && onApriRevisione && (
              <button onClick={onApriRevisione}
                className="w-full rounded-[20px] px-5 py-4 flex items-center gap-4 transition-all active:scale-[0.99]"
                style={{ background: '#EDE9FE', border: '1.5px solid #7C3AED' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#7C3AED' }}>
                  <span style={{ fontSize: '20px' }}>📋</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: '#4C1D95' }}>
                    Revisiona volantini della community
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6D28D9' }}>
                    Come Guru puoi approvare o rifiutare le foto inviate dagli utenti
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} style={{ color: '#7C3AED', flexShrink: 0 }} />
              </button>
            )}

            {/* A1: Scontrini in attesa — annullabili */}
            {(loadingInAttesa || scontriniInAttesa.length > 0) && (
              <div className="rounded-[20px] overflow-hidden"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(44,48,38,0.07)' }}>
                <div className="px-5 pt-4 pb-3 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>In elaborazione</h3>
                    <p className="text-xs mt-0.5" style={{ color: T.textSec }}>Elaborati stanotte — puoi ancora annullare</p>
                  </div>
                  {scontriniInAttesa.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#EEF2E4', color: T.primary }}>
                      {scontriniInAttesa.length}
                    </span>
                  )}
                </div>
                {loadingInAttesa ? (
                  <div className="px-5 py-4 flex items-center gap-2">
                    <Loader size={14} strokeWidth={1.5} className="animate-spin" style={{ color: T.textSec }} />
                    <span className="text-xs" style={{ color: T.textSec }}>Carico...</span>
                  </div>
                ) : (
                  scontriniInAttesa.map((s, i) => {
                    const ts = s.data_caricamento?.toDate?.();
                    const dataFmt = ts
                      ? ts.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—';
                    return (
                      <div key={s.id} className="flex items-center px-5 py-3"
                        style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-3"
                          style={{ background: '#EEF2E4' }}>
                          <Receipt size={15} strokeWidth={1.5} style={{ color: T.primary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
                            {s.n_foto > 1 ? `${s.n_foto} foto` : '1 foto'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: T.textSec }}>{dataFmt}</p>
                        </div>
                        <button
                          onClick={() => annullaScontrino(s.id)}
                          disabled={annullando === s.id}
                          className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                          style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          {annullando === s.id ? '...' : 'Annulla'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Card fotocamera */}
            <div className="rounded-[24px] p-6"
              style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>
            <label htmlFor="scontrino-input" className="block cursor-pointer">
              <div className="rounded-[20px] flex flex-col items-center justify-center gap-4 py-12 mb-5 transition-all active:scale-[0.98]"
                style={{ background: T.bg, border: `2px dashed ${T.border}` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#EEF2E4' }}>
                  <Camera size={32} strokeWidth={1.5} style={{ color: T.primary }} />
                </div>
                <div className="text-center">
                  <p className="font-medium" style={{ color: T.textPrimary, fontSize: '17px' }}>Fotografa lo scontrino</p>
                  <p className="text-sm mt-1" style={{ color: T.textSec }}>Tocca qui per aprire la fotocamera</p>
                </div>
              </div>
            </label>
            <div className="rounded-2xl p-4" style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
              <p className="text-sm font-medium mb-2" style={{ color: T.primary }}>Guadagni punti per ogni scontrino:</p>
              <div className="space-y-1">
                {[
                  { label: 'Scontrino caricato', punti: '+15 pt' },
                  { label: 'Più di 10 prodotti', punti: '+5 pt' },
                  { label: 'Primo della settimana', punti: '+5 pt' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: T.textSec }}>{r.label}</span>
                    <span className="font-semibold" style={{ color: T.primary }}>{r.punti}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ── STATO IDLE VOLANTINO ── */}
        {stato === 'idle' && modalita === 'volantino' && (
            <div className="animate-fade-in-up space-y-4">
            {/* Card info */}
            <div className="rounded-[24px] p-6"
              style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>

              {/* Dati volantino */}
              <div className="mb-5 space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5" style={{ color: T.textSec }}>
                    Nome supermercato *
                  </label>
                  <input
                    type="text"
                    value={insegnaVolantino}
                    onChange={e => setInsegnaVolantino(e.target.value)}
                    placeholder="Es. Conad, Carrefour, Iper..."
                    className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                    style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium mb-1.5" style={{ color: T.textSec }}>
                    Valido fino al (opzionale)
                  </label>
                  <input
                    type="date"
                    value={validoFino}
                    onChange={e => setValidoFino(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                    style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              </div>

              {/* Area foto */}
              <label htmlFor="volantino-input" className="block cursor-pointer">
                <div className="rounded-[20px] flex flex-col items-center justify-center gap-4 py-10 transition-all active:scale-[0.98]"
                  style={{ background: T.bg, border: `2px dashed ${T.border}` }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EEF2E4' }}>
                    <Camera size={28} strokeWidth={1.5} style={{ color: T.primary }} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium" style={{ color: T.textPrimary, fontSize: '16px' }}>Fotografa il volantino</p>
                    <p className="text-xs mt-1" style={{ color: T.textSec }}>Fino a {MAX_FOTO_VOL} pagine · tieni il foglio ben illuminato</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Card punti volantino */}
            <div className="rounded-[20px] p-4" style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
              <p className="text-sm font-medium mb-2" style={{ color: T.primary }}>🌿 Perché contribuire?</p>
              <div className="space-y-1.5 text-sm" style={{ color: T.primary }}>
                <p>+25 pt per ogni volantino approvato</p>
                <p>+5 pt bonus per insegne non ancora in app</p>
                <p>Aiuti tutta la community di Roma 🤝</p>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-sm leading-relaxed text-blue-800">
                <strong>Come funziona:</strong> revisioniamo ogni volantino prima di pubblicarlo. Se esiste già il volantino ufficiale per quella insegna, le tue foto non vengono usate ma guadagni comunque i punti.
              </p>
            </div>
          </div>

        )}

        {/* ── STATO ANTEPRIMA

        {/* ── STATO IDLE MANUALE ── */}
        {stato === 'idle' && modalita === 'manuale' && (
          <FormInserimentoManuale
            utente={utente}
            profilo={profilo}
            onSuccesso={() => {
              setStato('successo');
              setMessaggio('Spesa salvata nel tuo storico personale.');
              setTimeout(() => setStato('idle'), 4000);
            }}
            onErrore={(msg) => { setStato('errore'); setMessaggio(msg); }}
          />
        )}

        {/* ── STATO ANTEPRIMA (uguale per scontrino e volantino) ── */}
        {stato === 'anteprima' && (
          <div className="animate-fade-in-up space-y-4">

            {/* Campi volantino sopra le foto */}
            {modalita === 'volantino' && (
              <div className="rounded-[20px] p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium mb-1" style={{ color: T.textSec }}>
                      Supermercato *
                    </label>
                    <input
                      type="text"
                      value={insegnaVolantino}
                      onChange={e => setInsegnaVolantino(e.target.value)}
                      placeholder="Es. Conad, Carrefour..."
                      className="w-full px-4 py-2.5 rounded-xl text-base outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium mb-1" style={{ color: T.textSec }}>
                      Valido fino al
                    </label>
                    <input
                      type="date"
                      value={validoFino}
                      onChange={e => setValidoFino(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-base outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[24px] p-5"
              style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>
              <p className="text-xs uppercase tracking-wider font-medium mb-3" style={{ color: T.textSec }}>
                {foto.length} {modalita === 'volantino' ? 'pagine' : 'foto'} — {foto.length < limite ? 'puoi aggiungerne altre' : 'limite raggiunto'}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {foto.map((f, i) => (
                  <div key={i} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: T.border }}>
                    <img src={f.preview} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: T.primary }}>{i + 1}</div>
                    <button onClick={() => rimuoviFoto(i)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <X size={14} className="text-white" strokeWidth={2} />
                    </button>
                  </div>
                ))}

                {foto.length < limite && (
                  <label htmlFor={inputId} className="cursor-pointer">
                    <div className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]"
                      style={{ aspectRatio: '3/4', background: T.bg, border: `2px dashed ${T.border}` }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EEF2E4' }}>
                        <Camera size={20} strokeWidth={1.5} style={{ color: T.primary }} />
                      </div>
                      <p className="text-xs text-center px-2" style={{ color: T.textSec }}>
                        + {modalita === 'volantino' ? 'Pagina' : 'Foto'} {foto.length + 1}/{limite}
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <button
                onClick={modalita === 'volantino' ? inviaVolantino : inviaScontrino}
                disabled={modalita === 'volantino' && !insegnaVolantino.trim()}
                className="w-full py-4 rounded-[20px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: T.textPrimary, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 20px rgba(44,48,38,0.2)' }}
              >
                {modalita === 'volantino'
                  ? `Invia ${foto.length} ${foto.length === 1 ? 'pagina' : 'pagine'} — ${insegnaVolantino || '…'}`
                  : `Invia ${foto.length === 1 ? 'lo scontrino' : `le ${foto.length} foto`}`
                }
              </button>

              {foto.length > 1 && (
                <p className="text-xs text-center mt-3" style={{ color: T.textSec }}>
                  {modalita === 'volantino'
                    ? `Le ${foto.length} pagine verranno estratte insieme come un unico volantino`
                    : `Le ${foto.length} foto verranno lette insieme come un unico scontrino`
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STATO CARICANDO ── */}
        {stato === 'caricando' && (
          <div className="rounded-[24px] p-8 mb-4 flex flex-col items-center gap-4 animate-fade-in-up"
            style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>
            <Loader size={40} strokeWidth={1.5} className="animate-spin" style={{ color: T.primary }} />
            <p className="font-medium text-center" style={{ color: T.textPrimary, fontSize: '17px' }}>Caricamento in corso...</p>
            <p className="text-sm text-center" style={{ color: T.textSec }}>
              {modalita === 'volantino' ? 'Salviamo le pagine del volantino' : 'Stiamo salvando il tuo scontrino'}
            </p>
          </div>
        )}

        {/* ── STATO SUCCESSO ── */}
        {stato === 'successo' && (
          <div className="rounded-[24px] p-8 mb-4 flex flex-col items-center gap-5 animate-spring"
            style={{ background: T.primary, boxShadow: `0 12px 40px rgba(100,113,68,0.3)` }}>
            <CheckCircle size={52} strokeWidth={1.5} className="text-white" />
            <div className="text-center">
              <p style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: '#fff', marginBottom: '8px' }}>
                {modalita === 'volantino' ? 'Volantino ricevuto!' : 'Ricevuto!'}
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {modalita === 'volantino'
                  ? 'Un Guru esaminerà le foto prima dell\'elaborazione. I punti arrivano dopo l\'approvazione!'
                  : 'Elaboriamo stanotte e ti assegniamo i punti.'
                }
              </p>
            </div>
            {puntiAnimati && (
              <div className="rounded-2xl px-6 py-3 animate-spring" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: '28px', fontWeight: 500, color: '#fff', textAlign: 'center' }}>
                  {modalita === 'volantino' ? '+25 punti 📰' : '+15 punti 🌿'}
                </p>
                <p className="text-xs text-center mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {modalita === 'volantino' ? 'dopo approvazione' : 'in arrivo stanotte'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STATO ERRORE ── */}
        {stato === 'errore' && (
          <div className="rounded-[24px] p-6 mb-4 animate-fade-in-up"
            style={{ background: T.surface, border: `2px solid #FCA5A5` }}>
            <p className="font-medium mb-2" style={{ color: '#DC2626', fontSize: '16px' }}>Qualcosa è andato storto</p>
            <p className="text-sm mb-4" style={{ color: T.textSec }}>{messaggio}</p>
            <button
              onClick={() => { setStato(foto.length > 0 ? 'anteprima' : 'idle'); setMessaggio(''); }}
              className="w-full py-3 rounded-2xl font-medium text-white"
              style={{ background: T.textPrimary }}
            >
              Riprova
            </button>
          </div>
        )}

        {/* Info privacy */}
        {(stato === 'idle' || stato === 'anteprima') && (
          <div className="rounded-2xl p-4 mt-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <p className="text-sm leading-relaxed text-blue-800">
              {modalita === 'volantino'
                ? <><strong>Privacy:</strong> estraiamo solo prodotti e prezzi dal volantino. Le immagini vengono cancellate dopo elaborazione.</>
                : <><strong>Privacy:</strong> estraiamo solo prodotti e prezzi. Codici fiscali, numeri carta e nomi vengono ignorati. Le immagini vengono cancellate dopo elaborazione.</>
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ProductCard Compatta con Trust Signals (Task 2+8) ───────────────────────

const ProductCardCompattaBase = ({ offerta, index = 0, segnalati, segnala, trend = null }) => {
  const giorni = calcGiorniRimanenti(offerta.valido_fino);
  const isScadenzaOggi = offerta.valido_fino === OGGI;
  const isScadenzaDomani = offerta.valido_fino === DOMANI;
  const isUrgente = giorni <= 2 && giorni >= 0;

  // Stato locale per conferma "visto in negozio"
  const [confermato, setConfermato] = useState(false);

  const confermaVisto = async (e) => {
    e.stopPropagation();
    if (confermato || !offerta.id) return;
    setConfermato(true); // ottimismo UI

    try {
      await updateDoc(doc(db, 'offerte_attive', offerta.id), {
        conferme: increment(1),
      });
    } catch { setConfermato(false); }
  };

  // Metatdati fonte — quanto è fresco e affidabile il dato
  const conferme = offerta.conferme || 0;
  const segnalazioniN = offerta.segnalazioni || 0;
  const ggFa = offerta.data_scansione
    ? Math.floor((Date.now() - new Date(offerta.data_scansione).getTime()) / 86400000)
    : null;
  const isFotoUtente = offerta.fonte === 'foto_utente';
  const haAllarme = segnalazioniN >= 1 || (isFotoUtente && conferme < 2);

  return (
    <div
      className="px-4 py-3 transition-colors"
      style={{ borderBottom: `1px solid ${T.border}`, animationDelay: `${index * 30}ms` }}
    >
      {/* Riga principale: prezzo + nome + scadenza */}
      <div className="flex items-center gap-3">
        {/* Prezzo + freccia trend */}
        <div className="shrink-0 text-right w-16">
          <div className="font-semibold leading-tight" style={{ fontFamily: "'Lora', serif", fontSize: '18px', color: T.textPrimary }}>
            {formattaPrezzo(offerta.prezzo)}
          </div>
          {offerta.prezzo_kg && (
            <div className="text-[10px] leading-tight mt-0.5" style={{ color: T.textSec }}>
              {formattaPrezzo(offerta.prezzo_kg)}{etichettaUnitaPrezzo(offerta.grammatura)}
            </div>
          )}
          {/* Freccia andamento prezzo */}
          {trend === 'giu' && (
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <TrendingDown size={11} strokeWidth={2} style={{ color: '#16a34a' }} />
              <span className="text-[9px] font-semibold" style={{ color: '#16a34a' }}>sceso</span>
            </div>
          )}
          {trend === 'su' && (
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <TrendingUp size={11} strokeWidth={2} style={{ color: '#dc2626' }} />
              <span className="text-[9px] font-semibold" style={{ color: '#dc2626' }}>salito</span>
            </div>
          )}
          {trend === 'stabile' && (
            <div className="flex items-center justify-end mt-0.5">
              <span className="text-[9px]" style={{ color: T.textSec }}>≈ stabile</span>
            </div>
          )}
        </div>

        {/* Contenuto centrale */}
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug truncate" style={{ color: T.textPrimary, fontSize: '14px' }}>
            {offerta.nome}
            {offerta.marca && <span className="font-normal" style={{ color: T.textSec }}> · {offerta.marca}</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${getBadgeInsegna(offerta.insegna)}`}>
              {offerta.insegna}
            </span>
            {offerta.grammatura && (
              <span className="text-[11px]" style={{ color: T.textSec }}>{offerta.grammatura}</span>
            )}
            {offerta.fidelity_req && (
              <Star size={10} className="fill-blue-500 text-blue-500" strokeWidth={0} />
            )}
          </div>
        </div>

        {/* Destra: scadenza + segnala */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {isUrgente ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: isScadenzaOggi ? '#FFF0E8' : '#FFFBEB', color: isScadenzaOggi ? T.accent : '#92400E' }}>
              {isScadenzaOggi ? 'Oggi' : isScadenzaDomani ? 'Domani' : `${giorni}gg`}
            </span>
          ) : giorni >= 0 && (
            <span className="text-[10px]" style={{ color: T.textSec }}>{giorni}gg</span>
          )}
          {segnalati && segnala && offerta.id && (
            <BottoneSegnala docId={offerta.id} collectionName="offerte_attive"
              segnalati={segnalati} segnala={segnala} />
          )}
          {offerta.id && <BotoneModifica offerta={offerta} />}
        </div>
      </div>

      {/* Trust bar — solo per offerte da foto utente o con segnalazioni */}
      {(isFotoUtente || segnalazioniN > 0 || conferme > 0) && (
        <div className="mt-2 flex items-center justify-between">
          {/* Sinistra: source + conferme */}
          <div className="flex items-center gap-2 flex-wrap">
            {isFotoUtente && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: '#EEF2E4', color: T.primary }}>
                📸 Foto community
              </span>
            )}
            {conferme > 0 && (
              <span className="text-[10px]" style={{ color: T.textSec }}>
                {conferme} {conferme === 1 ? 'conferma' : 'conferme'}
              </span>
            )}
            {ggFa !== null && (
              <span className="text-[10px]" style={{ color: T.textSec }}>
                · {ggFa === 0 ? 'oggi' : `${ggFa}gg fa`}
              </span>
            )}
            {segnalazioniN > 0 && (
              <span className="text-[10px] font-medium" style={{ color: T.accent }}>
                ⚠️ {segnalazioniN} segnalaz.
              </span>
            )}
          </div>

          {/* Destra: bottone "Confermo" */}
          {offerta.id && !confermato && (
            <button
              onClick={confermaVisto}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all active:scale-95"
              style={{ border: `1px solid ${T.border}`, color: T.textSec, background: T.surface }}>
              ✓ Confermo
            </button>
          )}
          {confermato && (
            <span className="text-[10px] font-medium" style={{ color: T.primary }}>✓ Confermato</span>
          )}
        </div>
      )}

      {/* Disclaimer — solo offerte non ancora confermate da community */}
      {isFotoUtente && conferme < 3 && (
        <p className="text-[10px] mt-1.5 leading-tight" style={{ color: T.textSec }}>
          Verifica sempre il prezzo al momento dell'acquisto
        </p>
      )}
    </div>
  );
};
// React.memo: nella lista highlights (8+ card) evita re-render inutili
// quando cambia solo il filtro insegna o l'ordinamento del tab genitore
const ProductCardCompatta = React.memo(ProductCardCompattaBase, (prev, next) =>
  prev.offerta.id === next.offerta.id &&
  prev.offerta.prezzo === next.offerta.prezzo &&
  prev.segnalati === next.segnalati &&
  prev.trend === next.trend
);

// ─── Tab Offerte ──────────────────────────────────────────────────────────────

const ORDINAMENTI = [
  { id: 'prezzo_asc',  label: 'Prezzo ↑' },
  { id: 'prezzo_desc', label: 'Prezzo ↓' },
  { id: 'prezzo_kg',   label: '€/Kg ↑' },
  { id: 'scadenza',    label: 'Scadenza' },
  { id: 'insegna',     label: 'Negozio' },
];

const VISTA_ITEMS = [
  { id: 'highlights', label: '✦ Top' },
  { id: 'sfoglia',    label: 'Sfoglia' },
  { id: 'cerca',      label: 'Cerca' },
];

const CATEGORIE_EMOJI = {
  carne:          '🥩',
  pesce:          '🐟',
  frutta_verdura: '🥦',
  dispensa:       '🫙',
  freschissimi:   '🧀',
  surgelati:      '🧊',
  bevande:        '🧃',
  casa_igiene:    '🧴',
  latticini:      '🥛',
  altro:          '📦',
};

const TabOfferte = ({ offerte, archivio = [], cittàAttiva = null, preferenze = null }) => {
  const { prodottiPreferiti, isLoggedIn } = useAuth();
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]     = useState('');
  const [catAttiva,      setCatAttiva]       = useState('tutte');
  const [filtroInsegna,  setFiltroInsegna]   = useState(null);
  const [infoAperte,     setInfoAperte]      = useState(false);
  const [infoInsegne,    setInfoInsegne]     = useState({});
  const { segnalati, segnala } = useSegnalazioniStore();
  const searchRef = React.useRef(null);

  // ── Deduplicazione + filtro città + filtro insegne + filtro punti vendita ────
  const offerteDedup = useMemo(() => {
    // Insegne selezionate — null = nessun filtro (utente non loggato)
    const insegneAttive = preferenze?.insegne_attive?.length
      ? new Set(preferenze.insegne_attive)
      : null;

    // Punti vendita attivi — es. ["pim_prati_roma"]
    const pvAttivi = new Set(preferenze?.punti_vendita_attivi || []);

    const seen = new Map();
    offerte.forEach(o => {
      if (o.nascosto) return;

      // Filtro città: esclude offerte di ALTRE città, mostra quelle senza campo città
      if (cittàAttiva && o.città && o.città !== cittàAttiva) return;

      // Filtro insegne: esclude insegne deselezionate dall'utente
      if (insegneAttive && o.insegna && !insegneAttive.has(o.insegna)) return;

      // Filtro punti vendita: se l'offerta è di un punto vendita specifico,
      // mostrala solo se quell'utente ha attivato quel punto vendita.
      // Se punto_vendita_id è null = offerta di catena → sempre visibile (per l'insegna)
      if (o.punto_vendita_id && pvAttivi.size > 0 && !pvAttivi.has(o.punto_vendita_id)) return;

      const key = `${(o.nome||'').toLowerCase()}_${(o.marca||'').toLowerCase()}_${o.insegna}_${o.grammatura||''}_${o.punto_vendita_id||''}`;
      if (!seen.has(key) || seen.get(key).prezzo > o.prezzo) seen.set(key, o);
    });
    return [...seen.values()].filter(o => !o.valido_fino || o.valido_fino >= OGGI);
  }, [offerte, cittàAttiva, preferenze]);

  // ── Insegne disponibili ────────────────────────────────────────────────────
  const insegneDisp = useMemo(() =>
    [...new Set(offerteDedup.map(o => o.insegna).filter(Boolean))].sort(),
    [offerteDedup]);

  // ── Offerte filtrate per cat + insegna ────────────────────────────────────
  const offerteFiltrate = useMemo(() => {
    let res = offerteDedup;
    if (catAttiva && catAttiva !== 'tutte') res = res.filter(o => o.categoria === catAttiva);
    if (filtroInsegna) res = res.filter(o => o.insegna === filtroInsegna);
    return res;
  }, [offerteDedup, catAttiva, filtroInsegna]);

  // ── Offerte urgenti (scadono oggi/domani) ─────────────────────────────────
  const urgenti = useMemo(() =>
    offerteDedup
      .filter(o => o.valido_fino === OGGI || o.valido_fino === DOMANI)
      .sort((a, b) => a.prezzo - b.prezzo)
      .slice(0, 8),
    [offerteDedup]);

  // ── Matching prodotti preferiti ───────────────────────────────────────────
  const offertePreferite = useMemo(() => {
    const pref = prodottiPreferiti?.items || [];
    if (!pref.length || !isLoggedIn) return [];
    return offerteFiltrate.filter(o =>
      pref.some(p => {
        const nomeO = (o.nome || '').toLowerCase();
        const nomeP = (p.nome || '').toLowerCase();
        const marcaP = (p.marca || '').toLowerCase();
        return nomeO.includes(nomeP) || (marcaP && (o.marca||'').toLowerCase().includes(marcaP));
      })
    ).slice(0, 8);
  }, [offerteFiltrate, prodottiPreferiti, isLoggedIn]);

  // Set id offerte preferite per badge rapido
  const idPreferite = useMemo(() => new Set(offertePreferite.map(o => o.id)), [offertePreferite]);

  // ── Ricerca ───────────────────────────────────────────────────────────────
  const offerteSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return offerteDedup.filter(o =>
      (o.nome||'').toLowerCase().includes(q) ||
      (o.marca||'').toLowerCase().includes(q) ||
      (o.categoria||'').toLowerCase().includes(q)
    ).slice(0, 40);
  }, [offerteDedup, searchQuery]);

  // ── Calcolo trend prezzi ──────────────────────────────────────────────────
  const calcolaTrend = useCallback((o) => {
    if (!archivio?.length) return null;
    const storici = archivio
      .filter(a => a.insegna === o.insegna &&
        (a.nome?.toLowerCase() === o.nome?.toLowerCase() ||
         a.nome_normalizzato?.toLowerCase() === o.nome?.toLowerCase()) && a.prezzo)
      .sort((a, b) => (a.valido_fino||'').localeCompare(b.valido_fino||''))
      .slice(-4);
    if (!storici.length) return null;
    const media = storici.reduce((s, a) => s + a.prezzo, 0) / storici.length;
    const pct   = Math.abs(o.prezzo - media) / media;
    if (pct < 0.03) return 'stabile';
    return o.prezzo > media ? 'su' : 'giu';
  }, [archivio]);

  // ── Fetch info pagamenti ───────────────────────────────────────────────────
  useEffect(() => {
    if (!insegneDisp.length || !cittàAttiva || !infoAperte) return;
    let mounted = true;
    Promise.all(
      insegneDisp.map(async ins => {
        const id   = `${cittàAttiva}_${ins.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const snap = await getDoc(doc(db, 'info_insegne', id));
        return [ins, snap.exists() ? snap.data() : null];
      })
    ).then(entries => {
      if (!mounted) return;
      const mappa = {};
      entries.forEach(([ins, d]) => { if (d?.dati) mappa[ins] = d.dati; });
      setInfoInsegne(mappa);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [insegneDisp.join(','), cittàAttiva, infoAperte]);

  // ── Helper: apre search e focus sull'input ─────────────────────────────────
  const apriSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const chiudiSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  // ── Categorie con count ────────────────────────────────────────────────────
  const categorieConCount = useMemo(() => {
    const counts = {};
    offerteDedup.forEach(o => { const c = o.categoria || 'altro'; counts[c] = (counts[c]||0)+1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [offerteDedup]);

  const CAT_ITEMS = [
    { id: 'tutte', label: 'Tutto', emoji: '🛒' },
    ...CATEGORIE.filter(c => c.id !== 'tutte' && categorieConCount.some(([id]) => id === c.id)).map(c => ({
      id:    c.id,
      label: c.label,
      emoji: CATEGORIE_EMOJI[c.id] || '📦',
    })),
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>

      {/* ── HEADER STICKY ─────────────────────────────────────────────────── */}
      <div className="safe-top shrink-0 z-20"
        style={{ background: 'rgba(249,248,244,0.95)', backdropFilter: 'blur(16px)',
                 borderBottom: `1px solid ${T.border}` }}>

        {/* Riga 1: logo + search icon + contatore */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconaLenticchia size={22} style={{ color: T.primary, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '18px',
                           fontWeight: 500, color: T.textPrimary }}>
              Lenticchia
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: '#EEF2E4', color: T.primary }}>
              {offerteDedup.length.toLocaleString('it-IT')} offerte
            </span>
            <button onClick={apriSearch}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: searchOpen ? T.primary : T.bg,
                       border: `1px solid ${T.border}` }}>
              <Search size={16} strokeWidth={1.5}
                style={{ color: searchOpen ? '#fff' : T.textSec }} />
            </button>
          </div>
        </div>

        {/* Search input — espansione animata */}
        {searchOpen && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: T.surface, border: `1.5px solid ${T.primary}` }}>
              <Search size={14} strokeWidth={1.5} style={{ color: T.textSec, flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca pasta, latte, carne..."
                className="flex-1 text-base outline-none bg-transparent"
                style={{ color: T.textPrimary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  style={{ color: T.textSec, flexShrink: 0 }}>
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <button onClick={chiudiSearch}
              className="text-sm font-medium shrink-0"
              style={{ color: T.textSec }}>
              Annulla
            </button>
          </div>
        )}

        {/* Categorie JustEat style — solo se search chiusa */}
        {!searchOpen && (
          <>
            {/* Riga categorie — emoji grande + label */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
              {CAT_ITEMS.map(c => {
                const attiva = catAttiva === c.id;
                return (
                  <button key={c.id}
                    onClick={() => setCatAttiva(c.id)}
                    className="flex flex-col items-center gap-1 shrink-0 transition-all active:scale-95"
                    style={{ minWidth: '56px' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                      style={{
                        background: attiva ? T.primary : T.surface,
                        border:     `1.5px solid ${attiva ? T.primary : T.border}`,
                        boxShadow:  attiva ? '0 4px 12px rgba(100,113,68,0.25)' : '0 2px 6px rgba(44,48,38,0.06)',
                      }}>
                      <span style={{ fontSize: '26px', lineHeight: 1 }}>{c.emoji}</span>
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight"
                      style={{ color: attiva ? T.primary : T.textSec, maxWidth: '56px' }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Riga insegne — chip piccole */}
            {insegneDisp.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3">
                <button onClick={() => setFiltroInsegna(null)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all"
                  style={!filtroInsegna
                    ? { background: T.textPrimary, color: '#fff' }
                    : { background: T.surface, color: T.textSec, border: `1px solid ${T.border}` }}>
                  Tutti
                </button>
                {insegneDisp.map(ins => (
                  <button key={ins}
                    onClick={() => setFiltroInsegna(ins === filtroInsegna ? null : ins)}
                    className="px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all"
                    style={filtroInsegna === ins
                      ? { background: T.textPrimary, color: '#fff' }
                      : { background: T.surface, color: T.textSec, border: `1px solid ${T.border}` }}>
                    {ins.split('/')[0].trim()}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CORPO SCROLLABILE ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-4">

        {/* ── VISTA SEARCH ────────────────────────────────────────────────── */}
        {searchOpen && (
          <div className="px-4 pt-4">
            {!searchQuery.trim() ? (
              <p className="text-sm text-center py-8" style={{ color: T.textSec }}>
                Inizia a scrivere per cercare
              </p>
            ) : offerteSearch.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: T.textSec }}>
                Nessuna offerta trovata per "{searchQuery}"
              </p>
            ) : (
              <div className="rounded-[20px] overflow-hidden"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                {offerteSearch.map((o, i) => (
                  <ProductCardCompatta key={o.id||i} offerta={o} index={i}
                    segnalati={segnalati} segnala={segnala} trend={calcolaTrend(o)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VISTA NORMALE ───────────────────────────────────────────────── */}
        {!searchOpen && (
          <>
            {/* Sezione ⭐ Per te — solo se loggato con preferiti in offerta */}
            {offertePreferite.length > 0 && (
              <div className="pt-5 pb-2">
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                    ⭐ Per te
                  </h2>
                  <span className="text-[11px]" style={{ color: T.textSec }}>
                    dai tuoi preferiti
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1">
                  {offertePreferite.map((o, i) => (
                    <div key={o.id||i}
                      className="shrink-0 rounded-[18px] overflow-hidden"
                      style={{ width: '160px', background: '#EEF2E4',
                               border: `1.5px solid ${T.primary}`,
                               boxShadow: '0 4px 12px rgba(100,113,68,0.15)' }}>
                      {/* Badge preferito */}
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: T.primary }}>
                          {o.insegna?.split('/')[0]}
                        </span>
                        <span style={{ fontSize: '12px' }}>⭐</span>
                      </div>
                      <div className="px-3 pb-3">
                        <p className="text-xs font-medium leading-snug mb-1"
                          style={{ color: T.textPrimary }}>
                          {o.nome}
                        </p>
                        {o.marca && (
                          <p className="text-[10px] mb-1.5" style={{ color: T.textSec }}>
                            {o.marca}
                          </p>
                        )}
                        <div className="flex items-end justify-between">
                          <span style={{ fontFamily: "'Lora', serif", fontSize: '20px',
                                         fontWeight: 600, color: T.primary }}>
                            {formattaPrezzo(o.prezzo)}
                          </span>
                          {(() => {
                            const t = calcolaTrend(o);
                            if (t === 'giu') return <TrendingDown size={14} style={{ color: '#16a34a' }} />;
                            if (t === 'su')  return <TrendingUp size={14} style={{ color: '#dc2626' }} />;
                            return null;
                          })()}
                        </div>
                        {o.grammatura && (
                          <p className="text-[10px] mt-0.5" style={{ color: T.textSec }}>
                            {o.grammatura}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sezione ⏰ Scadono presto */}
            {urgenti.length > 0 && (
              <div className={offertePreferite.length > 0 ? 'pt-2 pb-2' : 'pt-5 pb-2'}>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                    ⏰ Scadono presto
                  </h2>
                  <span className="text-[11px]" style={{ color: T.accent }}>
                    oggi o domani
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1">
                  {urgenti.map((o, i) => (
                    <div key={o.id||i}
                      className="shrink-0 rounded-[18px] overflow-hidden"
                      style={{ width: '140px', background: T.surface,
                               border: `1.5px solid ${T.border}`,
                               boxShadow: '0 2px 8px rgba(44,48,38,0.07)' }}>
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: T.textSec }}>
                          {o.insegna?.split('/')[0]}
                        </span>
                        <span className="text-[10px] font-bold"
                          style={{ color: T.accent }}>
                          {o.valido_fino === OGGI ? 'oggi!' : 'domani'}
                        </span>
                      </div>
                      <div className="px-3 pb-3">
                        <p className="text-[11px] font-medium leading-snug mb-1.5"
                          style={{ color: T.textPrimary }}>
                          {o.nome}
                        </p>
                        <span style={{ fontFamily: "'Lora', serif", fontSize: '18px',
                                       fontWeight: 600, color: T.textPrimary }}>
                          {formattaPrezzo(o.prezzo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lista principale offerte ─────────────────────────────── */}
            <div className="px-4 pt-4">
              {/* Intestazione lista */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                  {catAttiva === 'tutte' && !filtroInsegna
                    ? 'Tutte le offerte'
                    : [CAT_ITEMS.find(c=>c.id===catAttiva)?.label, filtroInsegna].filter(Boolean).join(' · ')}
                </h2>
                <span className="text-[11px]" style={{ color: T.textSec }}>
                  {offerteFiltrate.length} prodott{offerteFiltrate.length === 1 ? 'o' : 'i'}
                </span>
              </div>

              {offerteFiltrate.length === 0 ? (
                <div className="rounded-[20px] py-12 text-center"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <p className="text-sm" style={{ color: T.textSec }}>
                    Nessuna offerta {catAttiva !== 'tutte' ? 'in questa categoria' : ''}{filtroInsegna ? ` da ${filtroInsegna}` : ''} questa settimana
                  </p>
                </div>
              ) : (
                <div className="rounded-[20px] overflow-hidden"
                  style={{ background: T.surface, border: `1px solid ${T.border}`,
                           boxShadow: '0 2px 16px rgba(44,48,38,0.05)' }}>
                  {offerteFiltrate.map((o, i) => (
                    <div key={o.id||i} className="relative">
                      {/* Badge ⭐ se è un preferito */}
                      {idPreferite.has(o.id) && (
                        <span className="absolute top-2 right-10 z-10 text-[10px] font-bold"
                          style={{ color: T.primary }}>
                          ⭐
                        </span>
                      )}
                      <ProductCardCompatta
                        offerta={o} index={i}
                        segnalati={segnalati} segnala={segnala}
                        trend={calcolaTrend(o)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 💳 Pagamenti & promozioni — collassabile ────────────── */}
            <div className="px-4 pt-6 pb-2">
              <button
                onClick={() => setInfoAperte(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-[20px] transition-all active:scale-[0.99]"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '20px' }}>💳</span>
                  <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                    Pagamenti & promozioni
                  </span>
                </div>
                <ChevronRight size={18} strokeWidth={1.5}
                  className="transition-transform duration-300"
                  style={{ color: T.textSec, transform: infoAperte ? 'rotate(90deg)' : 'rotate(0deg)' }} />
              </button>

              {infoAperte && (
                <div className="mt-3 space-y-2">
                  {insegneDisp.filter(ins => infoInsegne[ins]).length === 0 ? (
                    <div className="rounded-[16px] px-4 py-4 text-center"
                      style={{ background: T.bg, border: `1px dashed ${T.border}` }}>
                      <p className="text-sm" style={{ color: T.textSec }}>
                        Nessuna info ancora — aiutaci ad aggiungerle!
                      </p>
                      <p className="text-xs mt-1" style={{ color: T.textSec }}>
                        Apri la scheda di un supermercato per contribuire
                      </p>
                    </div>
                  ) : (
                    insegneDisp.filter(ins => infoInsegne[ins]).map(ins => {
                      const d          = infoInsegne[ins];
                      const buoni      = d.buoni_pasto?.accettati;
                      const circuiti   = d.buoni_pasto?.circuiti || [];
                      const promoFlat  = d.promozioni_flat || [];
                      return (
                        <div key={ins} className="rounded-[16px] px-4 py-3"
                          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold mb-1.5" style={{ color: T.textPrimary }}>
                                {ins}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                                  style={buoni
                                    ? { background: '#EEF2E4', color: T.primary }
                                    : { background: '#FEE2E2', color: '#DC2626' }}>
                                  🎟️ {buoni ? 'Buoni sì' : 'Buoni no'}
                                </span>
                                {buoni && circuiti.slice(0, 2).map(c => (
                                  <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                              {promoFlat.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-[11px] mt-1" style={{ color: T.textSec }}>
                                  📅 {p.regola}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// Normalizza una stringa di lista per confronto/deduplicazione
const normalizzaLista = (items) =>
  [...items].map(i => i.toLowerCase().trim()).sort().join('|');

const LISTA_INIT = {
  budgetInput:     '',
  budgetEditing:   false,
  listaText:       (() => {
    try {
      const params   = new URLSearchParams(window.location.search);
      const listaUrl = params.get('lista');
      if (listaUrl) {
        const url = new URL(window.location.href);
        url.searchParams.delete('lista');
        window.history.replaceState({}, '', url.toString());
        return decodeURIComponent(listaUrl).split(',').join('\n');
      }
    } catch {}
    try { return localStorage.getItem('lenticchia_lista') || "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; }
    catch { return ''; }
  })(),
  risultato:       null,
  isAnalyzing:     false,
  copiatoFeedback: false,
  vistaStorico:    false,
  storicoListe:    (() => { try { return JSON.parse(localStorage.getItem('lenticchia_storico_v2') || '[]'); } catch { return []; } })(),
  listaCaricata:   false,
};

function listaReducer(state, action) {
  switch (action.type) {
    case 'SET_BUDGET_INPUT':    return { ...state, budgetInput: action.payload };
    case 'SET_BUDGET_EDITING':  return { ...state, budgetEditing: action.payload };
    case 'SET_LISTA_TEXT':      return { ...state, listaText: action.payload };
    case 'SET_RISULTATO':       return { ...state, risultato: action.payload };
    case 'SET_ANALYZING':       return { ...state, isAnalyzing: action.payload };
    case 'SET_COPIATO':         return { ...state, copiatoFeedback: action.payload };
    case 'SET_VISTA_STORICO':   return { ...state, vistaStorico: action.payload };
    case 'SET_STORICO':         return { ...state, storicoListe: action.payload };
    case 'SET_LISTA_CARICATA':  return { ...state, listaCaricata: action.payload };
    case 'RESET_BUDGET':        return { ...state, budgetInput: '', budgetEditing: false };
    default:                    return state;
  }
}

const TabListaSpesa = ({ offerte, archivio = [] }) => {
  const { isLoggedIn, listaSpesa, aggiornaListaSpesa, preferenze, aggiornaPreferenze, prodottiPreferiti } = useAuth();
  const [ls, dispatchLista] = React.useReducer(listaReducer, LISTA_INIT);

  // Alias leggibili per il JSX
  const budgetInput     = ls.budgetInput;
  const budgetEditing   = ls.budgetEditing;
  const listaText       = ls.listaText;
  const risultato       = ls.risultato;
  const isAnalyzing     = ls.isAnalyzing;
  const copiatoFeedback = ls.copiatoFeedback;
  const vistaStorico    = ls.vistaStorico;
  const storicoListe    = ls.storicoListe;
  const listaCaricata   = ls.listaCaricata;

  // Setter compatibili con il resto del componente
  const setBudgetInput     = (v) => dispatchLista({ type: 'SET_BUDGET_INPUT',   payload: v });
  const setBudgetEditing   = (v) => dispatchLista({ type: 'SET_BUDGET_EDITING', payload: v });
  const setListaText       = (v) => dispatchLista({ type: 'SET_LISTA_TEXT',     payload: v });
  const setRisultato       = (v) => dispatchLista({ type: 'SET_RISULTATO',      payload: v });
  const setIsAnalyzing     = (v) => dispatchLista({ type: 'SET_ANALYZING',      payload: v });
  const setCopiatoFeedback = (v) => dispatchLista({ type: 'SET_COPIATO',        payload: v });
  const setVistaStorico    = (v) => dispatchLista({ type: 'SET_VISTA_STORICO',  payload: v });
  const setStoricoListe    = (v) => dispatchLista({ type: 'SET_STORICO',        payload: typeof v === 'function' ? v(storicoListe) : v });
  const setListaCaricata   = (v) => dispatchLista({ type: 'SET_LISTA_CARICATA', payload: v });

  // ── Budget mensile ────────────────────────────────────────────────────────
  const budgetSalvato = preferenze?.budget_mensile || null;

  const apriEditBudget = () => {
    setBudgetInput(budgetSalvato ? String(budgetSalvato) : '');
    setBudgetEditing(true);
  };
  const salvaBudget = async () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      await aggiornaPreferenze({ ...preferenze, budget_mensile: val });
    }
    setBudgetEditing(false);
  };
  const rimuoviBudget = async () => {
    const nuove = { ...preferenze };
    delete nuove.budget_mensile;
    await aggiornaPreferenze(nuove);
    dispatchLista({ type: 'RESET_BUDGET' });
  };

  // Sync lista da cloud al primo caricamento
  useEffect(() => {
    if (isLoggedIn && listaSpesa?.items?.length && !listaCaricata) {
      setListaText(listaSpesa.items.join('\n'));
      setListaCaricata(true);
    }
  }, [listaSpesa, isLoggedIn, listaCaricata]);

  const handleListaChange = (nuovoTesto) => {
    setListaText(nuovoTesto);
    try { localStorage.setItem('lenticchia_lista', nuovoTesto); } catch {}
    if (isLoggedIn) {
      const items = nuovoTesto.split('\n').map(i => i.trim()).filter(Boolean);
      aggiornaListaSpesa(items);
    }
  };

  // Salva in storico v2 — aggrega liste identiche incrementando "usata"
  const salvaInStorico = (items, vincitore, totale) => {
    const chiave = normalizzaLista(items);
    const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

    setStoricoListe(prev => {
      const esistente = prev.find(v => normalizzaLista(v.items) === chiave);
      let aggiornato;
      if (esistente) {
        aggiornato = prev.map(v =>
          normalizzaLista(v.items) === chiave
            ? { ...v, usata: (v.usata || 1) + 1, ultimaData: oggi, vincitore, totale: totale.toFixed(2) }
            : v
        );
      } else {
        const nuova = {
          id: Date.now(),
          items,
          vincitore,
          totale: totale.toFixed(2),
          usata: 1,
          ultimaData: oggi,
          primaData: oggi,
        };
        aggiornato = [nuova, ...prev].slice(0, 15);
      }
      // Ordina: più usate prima
      aggiornato.sort((a, b) => (b.usata || 1) - (a.usata || 1));
      try { localStorage.setItem('lenticchia_storico_v2', JSON.stringify(aggiornato)); } catch {}
      return aggiornato;
    });
  };

  const caricaLista = (voce) => {
    setListaText(voce.items.join('\n'));
    handleListaChange(voce.items.join('\n'));
    setVistaStorico(false);
    setRisultato(null);
  };

  const eliminaDallaStorico = (id, e) => {
    e.stopPropagation();
    setStoricoListe(prev => {
      const aggiornato = prev.filter(v => v.id !== id);
      try { localStorage.setItem('lenticchia_storico_v2', JSON.stringify(aggiornato)); } catch {}
      return aggiornato;
    });
  };

  const analizzaSpesa = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const itemsLista = listaText.split('\n').map(i => i.trim().replace(/\s+/g, ' ').replace(/[^\w\sàèéìòù'.-]/gi, '')).filter(i => i.length > 2);
      const itemsPreferirti = (prodottiPreferiti?.items || []).map(p => p.nome_ricerca || p.label);
      const items = [...new Set([...itemsLista, ...itemsPreferirti])];

      if (!items.length) { setRisultato(null); setIsAnalyzing(false); return; }

      const insegneAttivePref = preferenze?.insegne_attive;
      const tutteLeInsegne = [...new Set(offerte.map(o => o.insegna))];
      const insegne = insegneAttivePref
        ? tutteLeInsegne.filter(i => insegneAttivePref.includes(i))
        : tutteLeInsegne;

      const offerteOtt = offerte.map(o => ({ ...o, sN: (o.nome||'').toLowerCase(), sM: (o.marca||'').toLowerCase(), sC: (o.categoria||'').toLowerCase() }));

      // A3: matching a due livelli — esatto word-by-word, poi fallback con ≥ metà parole
      const matchaParola = (testo, parola) => {
        const escaped = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[\\s,./\\-])${escaped}([\\s,./\\-]|$)`, 'i').test(' ' + testo + ' ');
      };
      const punteggioCandidato = (o, parole) => {
        // quante parole della ricerca matchano il nome/marca
        return parole.filter(p => matchaParola(o.sN, p) || matchaParola(o.sM, p) || o.sC.includes(p)).length;
      };

      const storeResults = insegne.map(insegna => {
        const storeOffers = offerteOtt.filter(o => o.insegna === insegna);
        let trovati = [], nonTrovati = [], totalePrezzo = 0;
        items.forEach(itemStr => {
          const parole = itemStr.toLowerCase().split(' ').filter(p => p.length > 1);
          // Match esatto: TUTTE le parole
          const esatti = storeOffers.filter(o => parole.every(p => matchaParola(o.sN, p) || matchaParola(o.sM, p) || o.sC.includes(p)));
          // Fallback fuzzy: ≥ metà delle parole (min 1)
          const soglia = Math.max(1, Math.ceil(parole.length / 2));
          const parziali = esatti.length === 0
            ? storeOffers.filter(o => punteggioCandidato(o, parole) >= soglia)
            : [];
          const candidati = esatti.length > 0 ? esatti : parziali;
          if (candidati.length > 0) {
            // Ordina per: punteggio desc, poi prezzo asc
            candidati.sort((a, b) => punteggioCandidato(b, parole) - punteggioCandidato(a, parole) || a.prezzo - b.prezzo);
            const best = candidati[0];
            if (!trovati.find(t => t.offerta.id === best.id)) {
              trovati.push({ ricerca: itemStr, offerta: best, fuzzy: esatti.length === 0 });
              totalePrezzo += best.prezzo;
            }
          } else { nonTrovati.push(itemStr); }
        });
        const idsTrovati = trovati.map(t => t.offerta.id);
        const extraOfferte = storeOffers.filter(o => !idsTrovati.includes(o.id)).sort((a, b) => a.prezzo - b.prezzo).slice(0, 3);
        return { insegna, trovati, nonTrovati, totalePrezzo, extraOfferte, punteggio: trovati.length };
      });

      storeResults.sort((a, b) => b.punteggio !== a.punteggio ? b.punteggio - a.punteggio : a.totalePrezzo - b.totalePrezzo);

      if (!storeResults.length) {
        setRisultato(null);
        setIsAnalyzing(false);
        return;
      }

      if (storeResults.length > 0 && storeResults[0].punteggio > 0) {
        const vincitore = storeResults[0];
        setRisultato({ vincitore, alternative: storeResults.slice(1).filter(r => r.punteggio > 0).slice(0, 3) });
        salvaInStorico(items, vincitore.insegna, vincitore.totalePrezzo);
      } else {
        setRisultato({ vincitore: storeResults[0], alternative: [] });
      }
      setIsAnalyzing(false);
    }, 600);
  };

  const itemsAttuali = listaText.split('\n').map(i => i.trim()).filter(Boolean);
  const chiaveAttuale = normalizzaLista(itemsAttuali);

  return (
    <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-32" style={{ background: T.bg }}>

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-5" style={{ background: T.primary }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: '#fff', marginBottom: '2px' }}>
              La mia spesa
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Dove conviene fare la spesa questa settimana
            </p>
          </div>
          {/* Bottone storico */}
          <button
            onClick={() => { setVistaStorico(v => !v); setRisultato(null); }}
            className="flex flex-col items-center gap-0.5 mt-1"
            style={{ color: vistaStorico ? '#fff' : 'rgba(255,255,255,0.55)' }}
          >
            <History size={22} strokeWidth={1.5} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Storico</span>
          </button>
        </div>

        {/* ── Widget Budget ── */}
        {isLoggedIn && (
          <div className="rounded-[14px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {budgetEditing ? (
              <div className="px-4 py-3 flex items-center gap-2">
                <span className="text-sm shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>Budget €</span>
                <input
                  type="number" min="1" step="1"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvaBudget()}
                  autoFocus
                  className="flex-1 px-2.5 py-1 rounded-lg text-base outline-none"
                  style={{ background: 'rgba(255,255,255,0.9)', color: '#2C3026', maxWidth: '100px' }}
                  placeholder="es. 300"
                />
                <button onClick={salvaBudget}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>✓ Salva</button>
                {budgetSalvato && (
                  <button onClick={rimuoviBudget}
                    className="px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>✕</button>
                )}
              </div>
            ) : (
              <button onClick={apriEditBudget}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {budgetSalvato ? '💰 Budget mensile' : '+ Imposta budget mensile'}
                </span>
                {budgetSalvato && (
                  <span className="text-sm font-semibold text-white">{budgetSalvato.toFixed(0)} €/mese</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-4">

        {/* ══ VISTA STORICO ══ */}
        {vistaStorico && (
          <div className="rounded-[20px] overflow-hidden animate-fade-in-up"
            style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(44,48,38,0.08)' }}>

            <div className="px-5 pt-5 pb-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div>
                <h3 className="font-medium text-sm" style={{ color: T.textPrimary }}>Liste frequenti</h3>
                <p className="text-xs mt-0.5" style={{ color: T.textSec }}>Tocca per ricaricarla nel campo</p>
              </div>
              {storicoListe.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#EEF2E4', color: T.primary }}>
                  {storicoListe.length} salvate
                </span>
              )}
            </div>

            {storicoListe.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <History size={28} strokeWidth={1} className="mx-auto mb-3" style={{ color: T.border }} />
                <p className="text-sm font-medium" style={{ color: T.textPrimary }}>Ancora nessuna lista</p>
                <p className="text-xs mt-1" style={{ color: T.textSec }}>
                  Ogni volta che usi "Cerca offerte", la lista viene salvata qui.
                </p>
              </div>
            ) : (
              <div>
                {storicoListe.map((voce, idx) => {
                  const isAttuale = normalizzaLista(voce.items) === chiaveAttuale;
                  const frequenzaLabel = voce.usata >= 4 ? '🔁 Abituale' : voce.usata >= 2 ? '↩ Ripetuta' : null;
                  return (
                    <div key={voce.id}
                      onClick={() => caricaLista(voce)}
                      className="flex items-center gap-3 px-5 py-4 cursor-pointer active:bg-stone-50 transition-colors"
                      style={{ borderTop: idx > 0 ? `1px solid ${T.border}` : 'none' }}>

                      {/* Icona frequenza */}
                      <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold"
                        style={{ background: isAttuale ? T.primary : '#EEF2E4', color: isAttuale ? '#fff' : T.primary }}>
                        {voce.usata >= 4 ? '🔁' : voce.usata >= 2 ? voce.usata : '1'}
                      </div>

                      {/* Contenuto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                            {voce.items.slice(0, 3).join(', ')}{voce.items.length > 3 ? ` +${voce.items.length - 3}` : ''}
                          </p>
                          {frequenzaLabel && (
                            <span className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md"
                              style={{ background: '#EEF2E4', color: T.primary }}>
                              {frequenzaLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: T.textSec }}>
                          <span>{voce.items.length} prodotti</span>
                          <span>·</span>
                          <span className="font-medium" style={{ color: T.primary }}>{voce.vincitore}</span>
                          <span>·</span>
                          <span>€{voce.totale}</span>
                          <span>·</span>
                          <span>{voce.ultimaData}</span>
                        </div>
                      </div>

                      {/* Elimina */}
                      <button
                        onClick={(e) => eliminaDallaStorico(voce.id, e)}
                        className="p-1.5 rounded-full shrink-0 transition-colors hover:bg-red-50"
                        style={{ color: T.border }}>
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CARD INPUT ══ */}
        {!vistaStorico && (
          <div className="rounded-[20px] p-5 animate-fade-in-up"
            style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>

            <label className="block text-xs uppercase tracking-wider font-medium mb-2" style={{ color: T.textSec }}>
              Cosa ti serve? (una voce per riga)
            </label>

            {/* Tip */}
            <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2"
              style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
              <span style={{ color: T.primary, fontSize: '15px', lineHeight: 1, marginTop: '1px' }}>🌿</span>
              <p className="text-xs leading-relaxed" style={{ color: T.primary }}>
                Più sei specifico, migliori i risultati. Scrivi <strong>"latte parzialmente scremato"</strong> invece di "latte", <strong>"pasta fusilli"</strong> invece di "pasta".
              </p>
            </div>

            <textarea
              data-tutorial="lista-textarea"
              className="w-full p-4 rounded-2xl text-sm resize-none outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif", minHeight: '140px' }}
              value={listaText}
              onChange={(e) => handleListaChange(e.target.value)}
              placeholder={"pane\nlatte\nuova\n..."}
            />

            {/* Suggerimento lista frequente — se c'è una lista simile nello storico */}
            {!listaText.trim() && storicoListe.length > 0 && (() => {
              const top = storicoListe[0];
              return (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
                  style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}
                  onClick={() => caricaLista(top)}>
                  <span style={{ fontSize: '16px' }}>🔁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: T.primary }}>Riusa la lista più frequente</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: T.textSec }}>
                      {top.items.slice(0, 4).join(', ')}{top.items.length > 4 ? '...' : ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium shrink-0" style={{ color: T.primary }}>{top.usata}×</span>
                </div>
              );
            })()}

            {/* Riga bottoni: Condividi + Cerca offerte */}
            <div className="flex gap-2 mt-4">

              {/* Bottone Condividi — attivo solo se c'è qualcosa nella lista */}
              <button
                onClick={async () => {
                  const items = listaText.split('\n').map(i => i.trim()).filter(Boolean);
                  if (!items.length) return;
                  const testoLista = `📝 Lista della spesa\n${items.map(i => `• ${i}`).join('\n')}\n\n_inviata con Lenticchia 🌿_`;
                  const url = `${window.location.origin}?lista=${encodeURIComponent(items.join(','))}`;

                  // Prova Web Share API (mobile nativo)
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'Lista della spesa', text: testoLista, url });
                      return;
                    } catch { /* annullato dall'utente — fallback silenzioso */ }
                  }
                  // Fallback: copia link negli appunti
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopiatoFeedback(true);
                    setTimeout(() => setCopiatoFeedback(false), 2000);
                  } catch {
                    // Ultimo fallback: copia il testo
                    await navigator.clipboard.writeText(testoLista).catch(() => {});
                    setCopiatoFeedback(true);
                    setTimeout(() => setCopiatoFeedback(false), 2000);
                  }
                }}
                disabled={!listaText.trim()}
                className="py-3.5 px-4 rounded-[20px] transition-all disabled:opacity-30 flex justify-center items-center gap-2 active:scale-[0.98] shrink-0"
                style={{ background: copiatoFeedback ? '#EEF2E4' : T.bg,
                         border: `1.5px solid ${copiatoFeedback ? T.primary : T.border}`,
                         color: copiatoFeedback ? T.primary : T.textSec }}>
                {copiatoFeedback
                  ? <><Check size={16} strokeWidth={2} /> Copiato!</>
                  : <Share2 size={16} strokeWidth={1.5} />
                }
              </button>

              <button
                data-tutorial="bottone-analizza"
                onClick={analizzaSpesa}
                disabled={isAnalyzing || !listaText.trim()}
                className="flex-1 text-white font-medium py-3.5 px-4 rounded-[20px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
                style={{ background: T.textPrimary, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 8px 20px rgba(44,48,38,0.2)` }}
              >
                {isAnalyzing
                  ? <span className="animate-pulse">Cerco...</span>
                  : <><Search size={16} strokeWidth={1.5} /> Cerca offerte</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ══ RISULTATO ══ */}
        {risultato && !vistaStorico && (
          <div className="animate-fade-in-up">
            {risultato.vincitore?.trovati.length > 0 ? (
              <>
                {/* Card vincitore */}
                <div className="rounded-[24px] p-6 mb-4 relative overflow-hidden animate-spring"
                  style={{ background: T.primary, boxShadow: `0 12px 40px rgba(100,113,68,0.3)` }}>
                  <div className="absolute top-0 right-0 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-bl-2xl"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                    Miglior scelta
                  </div>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Conviene andare da</p>
                  <h2 style={{ fontFamily: "'Lora', serif", fontSize: '28px', fontWeight: 500, color: '#fff', marginBottom: '16px' }}>
                    {risultato.vincitore.insegna}
                  </h2>

                  <div className="space-y-2 mb-4">
                    {risultato.vincitore.trovati.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2.5 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {t.offerta.nome}{t.offerta.marca ? ` · ${t.offerta.marca}` : ''}
                            {t.fuzzy && <span className="ml-1.5 text-[10px] font-bold opacity-75">~</span>}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            cercato: "{t.ricerca}"{t.offerta.grammatura ? ` · ${t.offerta.grammatura}` : ''}
                            {t.fuzzy && <span className="ml-1 opacity-75">· corrispondenza parziale</span>}
                          </div>
                        </div>
                        <div className="font-semibold ml-3 shrink-0 px-2.5 py-1 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Lora', serif", fontSize: '16px' }}>
                          {formattaPrezzo(t.offerta.prezzo)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {risultato.vincitore.nonTrovati.length > 0 && (
                    <div className="mb-4 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.15)' }}>
                      <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Non in offerta questa settimana:
                      </p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {risultato.vincitore.nonTrovati.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl p-3 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Totale offerte trovate</span>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: '#fff' }}>
                      {formattaPrezzo(risultato.vincitore.totalePrezzo)}
                    </span>
                  </div>

                  {/* Indicatore budget sul vincitore */}
                  {(() => {
                    const bd = calcolaBudgetDiff(risultato.vincitore.totalePrezzo, budgetSalvato);
                    if (!bd) return null;
                    return (
                      <div className="mt-3 px-3 py-2.5 rounded-2xl flex items-center gap-2"
                        style={{ background: bd.dentro ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)' }}>
                        <span className="text-sm font-medium text-white">
                          {bd.dentro
                            ? `✓ Dentro al budget — risparmi il ${bd.perc}%`
                            : `⚠ Sfori il budget del ${bd.perc}% (+${Math.abs(bd.diff).toFixed(2)} €)`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {risultato.alternative.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs uppercase tracking-wider font-medium mb-3 flex items-center gap-2" style={{ color: T.textSec }}>
                      <Store size={13} strokeWidth={1.5} /> Confronto con altri
                    </h4>
                    <div className="space-y-2">
                      {risultato.alternative.map((alt, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-2xl"
                          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                          <div>
                            <span className="font-medium text-sm" style={{ color: T.textPrimary }}>{alt.insegna}</span>
                            <span className="text-xs ml-2" style={{ color: T.textSec }}>({alt.punteggio} trovati)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{formattaPrezzo(alt.totalePrezzo)}</span>
                            {(() => {
                              const bd = calcolaBudgetDiff(alt.totalePrezzo, budgetSalvato);
                              if (bd) return (
                                <span className="block text-xs font-semibold mt-0.5"
                                  style={{ color: bd.dentro ? T.primary : '#DC2626' }}>
                                  {bd.dentro ? '✓ budget' : `+${Math.abs(bd.diff).toFixed(2)}€ sforo`}
                                </span>
                              );
                              if (alt.punteggio === risultato.vincitore.punteggio) return (
                                <span className="block text-xs font-semibold mt-0.5" style={{ color: '#DC2626' }}>
                                  + {formattaPrezzo(alt.totalePrezzo - risultato.vincitore.totalePrezzo)}
                                </span>
                              );
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[20px] p-6 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <AlertCircle size={32} strokeWidth={1} className="mx-auto mb-3" style={{ color: T.accent }} />
                <h3 className="font-medium mb-1" style={{ fontFamily: "'Lora', serif", fontSize: '18px', color: T.textPrimary }}>
                  Nessun affare questa settimana
                </h3>
                <p className="text-sm" style={{ color: T.textSec }}>
                  I prodotti che hai inserito non sono in promozione al momento.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab Stato ────────────────────────────────────────────────────────────────

// ─── Tab Revisione Volantini — solo Guru ────────────────────────────────────
const TabRevisioneVolantini = ({ onTorna }) => {
  const { utente, profilo } = useAuth();
  const isGuru = (profilo?.punti || 0) >= 1000;
  const [coda,         setCoda]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [elaborando,   setElaborando]  = useState(null);
  const [motivazione,  setMotivazione] = useState('');
  const [apriRifiuto,  setApriRifiuto] = useState(null);

  // Match punto vendita — per ogni volantino in coda
  const [matchAperto,  setMatchAperto]  = useState(null);   // docId volantino aperto per match
  const [puntiVendita, setPuntiVendita] = useState([]);     // lista punti vendita validati da DB
  const [pvSelezionato, setPvSelezionato] = useState({});   // { docId: punto_vendita_id | 'nuovo' }
  const [formNuovoPv,  setFormNuovoPv]  = useState({});    // { docId: { insegna, nome, via, citta } }
  const [salvandoPv,   setSalvandoPv]   = useState(false);

  // Carica volantini in attesa di revisione
  useEffect(() => {
    if (!isGuru) return;
    let mounted = true;
    setLoading(true);
    getDocs(query(
      collection(db, 'coda_volantini'),
      where('stato', '==', 'in_attesa_revisione'),
      limit(20)
    )).then(async snap => {
      if (!mounted) return;
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withPrev = await Promise.all(docs.map(async vol => {
        try {
          const pSnap = await getDocs(query(
            collection(db, 'coda_volantini', vol.id, 'pagine'),
            limit(30)
          ));
          return { ...vol, anteprime: pSnap.docs.map(p => p.data().base64 || p.data().immagine_b64).filter(Boolean) };
        } catch { return { ...vol, anteprime: [] }; }
      }));
      if (mounted) { setCoda(withPrev); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [isGuru]);

  // Carica punti vendita validati quando il Guru apre il pannello match
  useEffect(() => {
    if (!matchAperto) return;
    getDocs(query(
      collection(db, 'punti_vendita'),
      where('stato', '==', 'validato')
      // orderBy lato client per evitare indice composito Firestore
    )).then(snap => {
      const pvList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordina per insegna lato client
      pvList.sort((a, b) => (a.insegna || '').localeCompare(b.insegna || ''));
      setPuntiVendita(pvList);
    }).catch(() => {});
  }, [matchAperto]);

  // Crea un nuovo punto vendita validato direttamente dal Guru
  const creaPuntoVendita = async (docId) => {
    const form = formNuovoPv[docId] || {};
    if (!form.insegna?.trim() || !form.nome?.trim() || !form.citta?.trim()) return;
    setSalvandoPv(true);
    try {
      // ID slug: insegna_nomeDisplay_citta normalizzati
      const slug = [form.insegna, form.nome, form.citta]
        .join('_')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const pvRef = doc(db, 'punti_vendita', slug);
      await setDoc(pvRef, {
        id:           slug,
        insegna:      form.insegna.trim(),
        nome_display: form.nome.trim(),
        via:          (form.via || '').trim(),
        citta:        form.citta.trim(),
        stato:        'validato',          // il Guru valida direttamente
        proposto_da:  utente.uid,
        validato_da:  utente.uid,
        proposto_il:  serverTimestamp(),
        validato_il:  serverTimestamp(),
      }, { merge: true });

      // Aggiorna la lista locale e seleziona il nuovo punto vendita
      const nuovoPv = { id: slug, insegna: form.insegna.trim(), nome_display: form.nome.trim(),
                        via: (form.via||'').trim(), citta: form.citta.trim() };
      setPuntiVendita(prev => [...prev, nuovoPv]);
      setPvSelezionato(prev => ({ ...prev, [docId]: slug }));
      setFormNuovoPv(prev => ({ ...prev, [docId]: null }));
    } catch (err) { console.error('Errore creazione punto vendita:', err); }
    finally { setSalvandoPv(false); }
  };

  // Approva con punto vendita abbinato (o senza se l'utente salta il match)
  const [erroreApprova, setErroreApprova] = useState(null);

  const approva = async (docId) => {
    setElaborando(docId);
    setErroreApprova(null);
    try {
      const pvId   = pvSelezionato[docId];
      const pvInfo = pvId && pvId !== 'skip' && pvId !== 'nuovo'
        ? puntiVendita.find(p => p.id === pvId)
        : null;

      // Legge insegna_validata e cap dal form Guru (campi B e C)
      const formGuru = formNuovoPv[docId] || {};
      const insegnaValidata = formGuru.insegna_validata?.trim()
        || pvInfo?.insegna
        || null;
      const capGuru = formGuru.cap?.trim() || null;

      await updateDoc(doc(db, 'coda_volantini', docId), {
        stato:             'approvato',
        approvato_da:      utente.uid,
        approvato_il:      serverTimestamp(),
        punto_vendita_id:  pvInfo?.id            || null,
        punto_vendita:     pvInfo?.nome_display   || null,
        insegna_validata:  insegnaValidata,
        cap_riferimento:   capGuru,
      });
      setCoda(prev => prev.filter(d => d.id !== docId));
      setMatchAperto(null);
    } catch (err) {
      console.error('Errore approva:', err);
      setErroreApprova(err?.message || err?.code || 'Errore sconosciuto');
    }
    finally { setElaborando(null); }
  };

  const rifiuta = async (docId) => {
    setElaborando(docId);
    try {
      await updateDoc(doc(db, 'coda_volantini', docId), {
        stato:        'rifiutato',
        rifiutato_da: utente.uid,
        rifiutato_il: serverTimestamp(),
        motivazione:  motivazione.trim() || 'Foto non idonea',
      });
      setCoda(prev => prev.filter(d => d.id !== docId));
      setApriRifiuto(null); setMotivazione('');
    } catch (err) { console.error(err); }
    finally { setElaborando(null); }
  };

  if (!isGuru) return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <span style={{ fontSize: '48px' }}>🌟</span>
      <p className="text-sm mt-4" style={{ color: T.textSec }}>Solo i Guru possono revisionare i volantini.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>

      {/* Header */}
      <div className="safe-top shrink-0 px-5 pt-5 pb-4 flex items-center gap-3"
        style={{ background: T.primary }}>
        {onTorna && (
          <button onClick={onTorna}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ArrowLeft size={18} strokeWidth={2} style={{ color: '#fff' }} />
          </button>
        )}
        <div className="flex-1">
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 500, color: '#fff' }}>
            Revisione volantini
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Approva le foto idonee — rifiuta quelle sfocate o errate
          </p>
        </div>
        <span className="text-sm font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {coda.length} in coda
        </span>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} strokeWidth={1.5} className="animate-spin" style={{ color: T.primary }} />
          </div>
        )}

        {!loading && coda.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span style={{ fontSize: '40px' }}>✅</span>
            <p className="text-sm mt-3" style={{ color: T.textSec }}>Nessun volantino in attesa — ottimo lavoro!</p>
          </div>
        )}

        {coda.map(vol => {
          const dataCaric = vol.data_caricamento?.toDate?.()?.toLocaleDateString('it-IT') || '—';
          const isElab    = elaborando === vol.id;
          const isRif     = apriRifiuto === vol.id;
          const isMatch   = matchAperto === vol.id;
          const pvSel     = pvSelezionato[vol.id];
          const formPv    = formNuovoPv[vol.id];

          return (
            <div key={vol.id} className="rounded-[20px] overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(44,48,38,0.06)' }}>

              {/* Testata */}
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold" style={{ color: T.textPrimary, fontFamily: "'Lora', serif" }}>
                      {vol.insegna}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                      {vol.n_foto} foto · {vol.citta || vol.città || '—'} · {dataCaric}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full font-medium shrink-0"
                    style={{ background: '#FEF3C7', color: '#92400E' }}>
                    in attesa
                  </span>
                </div>
              </div>

              {/* Anteprime */}
              {vol.anteprime?.length > 0 ? (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
                  {vol.anteprime.map((b64, i) => (
                    <img key={i}
                      src={b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`}
                      alt={`pagina ${i+1}`}
                      className="rounded-xl shrink-0 object-cover"
                      style={{ width: '100px', height: '130px', background: T.border }}
                      onError={e => { e.target.style.display='none'; }}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3">
                  <div className="rounded-xl flex items-center justify-center gap-2 py-3"
                    style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textSec, fontSize: '13px' }}>
                      📷 {vol.n_foto} foto caricate — anteprima non disponibile
                    </span>
                  </div>
                </div>
              )}

              {/* ── PANNELLO MATCH PUNTO VENDITA ─────────────────────────── */}
              {isMatch && (
                <div className="px-4 pb-3" style={{ borderTop: `1px solid ${T.border}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-2" style={{ color: T.primary }}>
                    📍 Identifica il punto vendita
                  </p>

                  {/* Spiegazione chiara del compito del Guru */}
                  <div className="rounded-xl p-3 mb-3" style={{ background: '#FFF8E6', border: '1px solid #FDE68A' }}>
                    <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                      <strong>L'utente ha scritto:</strong>{' '}
                      <span className="font-mono bg-yellow-100 px-1 rounded">{vol.insegna}</span>
                      <br />
                      Il tuo compito: abbinalo al negozio preciso nel sistema, oppure aggiungilo se non c'è ancora.
                      Questo serve per mostrare le offerte solo agli utenti vicini a quel negozio.
                    </p>
                  </div>

                  {/* B. Insegna canonica — corregi il nome se necessario */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: T.textSec }}>
                      Insegna canonica *
                    </label>
                    <input
                      list="insegne-guru-list"
                      type="text"
                      placeholder="es. PIM/Agora, Lidl, Esselunga…"
                      defaultValue={vol.insegna || ''}
                      onChange={e => setFormNuovoPv(prev => ({
                        ...prev,
                        [vol.id]: { ...(prev[vol.id] || {}), insegna_validata: e.target.value }
                      }))}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
                    />
                    <datalist id="insegne-guru-list">
                      {INSEGNE_DISPONIBILI.map(i => <option key={i} value={i} />)}
                    </datalist>
                    <p className="text-[10px] mt-1" style={{ color: T.textSec }}>
                      Correggi se l'utente ha scritto un nome diverso dal canonico (es. "Elite" → "Elite")
                    </p>
                  </div>

                  {/* C. CAP di riferimento */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: T.textSec }}>
                      CAP del negozio (opzionale)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="es. 00154"
                      defaultValue={''}
                      onChange={e => setFormNuovoPv(prev => ({
                        ...prev,
                        [vol.id]: { ...(prev[vol.id] || {}), cap: e.target.value }
                      }))}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }}
                    />
                    <p className="text-[10px] mt-1" style={{ color: T.textSec }}>
                      Serve per mostrare l'offerta agli utenti vicini — puoi lasciare vuoto se non lo sai
                    </p>
                  </div>

                  {/* Dropdown punti vendita esistenti */}
                  <div className="space-y-1.5 mb-3">
                    {/* Opzione: skip (offerta valida per tutta la catena) */}
                    <button
                      onClick={() => setPvSelezionato(prev => ({ ...prev, [vol.id]: 'skip' }))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: pvSel === 'skip' ? '#EEF2E4' : T.bg,
                        border: `1.5px solid ${pvSel === 'skip' ? T.primary : T.border}`,
                      }}>
                      <span className="text-sm">🏪</span>
                      <div>
                        <p className="text-xs font-medium" style={{ color: T.textPrimary }}>
                          Valido per tutta la catena {vol.insegna}
                        </p>
                        <p className="text-xs" style={{ color: T.textSec }}>
                          Non so il negozio preciso — l'offerta è uguale ovunque
                        </p>
                      </div>
                      {pvSel === 'skip' && <span className="ml-auto text-sm" style={{ color: T.primary }}>✓</span>}
                    </button>

                    {/* Punti vendita esistenti */}
                    {puntiVendita.map(pv => (
                      <button
                        key={pv.id}
                        onClick={() => setPvSelezionato(prev => ({ ...prev, [vol.id]: pv.id }))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: pvSel === pv.id ? '#EEF2E4' : T.bg,
                          border: `1.5px solid ${pvSel === pv.id ? T.primary : T.border}`,
                        }}>
                        <span className="text-sm">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>
                            {pv.nome_display}
                          </p>
                          <p className="text-xs truncate" style={{ color: T.textSec }}>
                            {pv.insegna} · {pv.via || pv.citta || ''}
                          </p>
                        </div>
                        {pvSel === pv.id && <span className="ml-auto shrink-0 text-sm" style={{ color: T.primary }}>✓</span>}
                      </button>
                    ))}

                    {/* Opzione: crea nuovo punto vendita */}
                    <button
                      onClick={() => {
                        setPvSelezionato(prev => ({ ...prev, [vol.id]: 'nuovo' }));
                        setFormNuovoPv(prev => ({
                          ...prev,
                          [vol.id]: { insegna: vol.insegna || '', nome: '', via: '', citta: vol.citta || vol.città || '' }
                        }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: pvSel === 'nuovo' ? '#EDE9FE' : T.bg,
                        border: `1.5px solid ${pvSel === 'nuovo' ? '#7C3AED' : T.border}`,
                      }}>
                      <span className="text-sm">➕</span>
                      <p className="text-xs font-medium" style={{ color: pvSel === 'nuovo' ? '#4C1D95' : T.textSec }}>
                        Crea nuovo punto vendita
                      </p>
                    </button>
                  </div>

                  {/* Form nuovo punto vendita */}
                  {pvSel === 'nuovo' && formPv && (
                    <div className="rounded-xl p-3 mb-3 space-y-2"
                      style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                      {[
                        { campo: 'insegna', label: 'Catena (es. PIM/Agora)', required: true },
                        { campo: 'nome',    label: 'Nome display (es. Agorà San Basilio)', required: true },
                        { campo: 'via',     label: 'Via / Indirizzo', required: false },
                        { campo: 'citta',   label: 'Città', required: true },
                      ].map(({ campo, label, required }) => (
                        <div key={campo}>
                          <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#4C1D95' }}>
                            {label}{required ? ' *' : ''}
                          </label>
                          <input
                            type="text"
                            value={formPv[campo] || ''}
                            onChange={e => setFormNuovoPv(prev => ({
                              ...prev, [vol.id]: { ...prev[vol.id], [campo]: e.target.value }
                            }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-sm outline-none"
                            style={{ background: '#fff', border: '1px solid #DDD6FE', color: T.textPrimary }}
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => creaPuntoVendita(vol.id)}
                        disabled={salvandoPv || !formPv.insegna?.trim() || !formPv.nome?.trim() || !formPv.citta?.trim()}
                        className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{ background: '#7C3AED', color: '#fff' }}>
                        {salvandoPv ? 'Salvo...' : 'Crea e seleziona'}
                      </button>
                    </div>
                  )}

                  {/* Errore approvazione */}
                  {erroreApprova && (
                    <div className="rounded-xl px-3 py-2 mb-2"
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>
                        ❌ Errore: {erroreApprova}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                        Verifica di essere connesso e riprova. Se persiste, controlla Firestore Rules.
                      </p>
                    </div>
                  )}

                  {/* Bottoni conferma match */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMatchAperto(null); setPvSelezionato(prev => { const n = {...prev}; delete n[vol.id]; return n; }); }}
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                      Annulla
                    </button>
                    <button
                      onClick={() => approva(vol.id)}
                      disabled={isElab || (!pvSel)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                      style={{ background: T.primary, color: '#fff' }}>
                      {isElab ? <><Loader size={12} className="animate-spin" /> Approvo...</> : '✓ Approva con match'}
                    </button>
                  </div>
                </div>
              )}

              {/* Input motivazione rifiuto */}
              {isRif && (
                <div className="px-4 pb-3">
                  <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: T.accent }}>
                    Motivazione rifiuto
                  </label>
                  <input type="text" value={motivazione} onChange={e => setMotivazione(e.target.value)}
                    placeholder="es. Foto sfocata, insegna errata, volantino già presente..."
                    className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
                    style={{ background: T.bg, border: `1px solid ${T.accent}`, color: T.textPrimary }} />
                </div>
              )}

              {/* Bottoni azione principali */}
              {!isMatch && (
                <div className="flex gap-3 px-4 pb-4">
                  {!isRif ? (
                    <>
                      <button onClick={() => setApriRifiuto(vol.id)} disabled={isElab}
                        className="flex-1 py-2.5 rounded-[14px] text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        ✕ Rifiuta
                      </button>
                      {/* Approva con match punto vendita */}
                      <button
                        onClick={() => setMatchAperto(vol.id)}
                        disabled={isElab}
                        className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ background: T.primary, color: '#fff' }}>
                        📍 Match e approva
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setApriRifiuto(null); setMotivazione(''); }}
                        className="flex-1 py-2.5 rounded-[14px] text-sm font-medium transition-all"
                        style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                        Annulla
                      </button>
                      <button onClick={() => rifiuta(vol.id)} disabled={isElab}
                        className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: '#DC2626', color: '#fff' }}>
                        {isElab ? <><Loader size={14} className="animate-spin" /> Rifiuto...</> : '✕ Conferma rifiuto'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="h-4" />
      </div>
    </div>
  );
};

  const approva = async (docId) => {
    setElaborando(docId);
    try {
      await updateDoc(doc(db, 'coda_volantini', docId), {
        stato:        'approvato',
        approvato_da: utente.uid,
        approvato_il: serverTimestamp(),
      });
      setCoda(prev => prev.filter(d => d.id !== docId));
    } catch (err) { console.error(err); }
    finally { setElaborando(null); }
  };

  const rifiuta = async (docId) => {
    setElaborando(docId);
    try {
      await updateDoc(doc(db, 'coda_volantini', docId), {
        stato:        'rifiutato',
        rifiutato_da: utente.uid,
        rifiutato_il: serverTimestamp(),
        motivazione:  motivazione.trim() || 'Foto non idonea',
      });
      setCoda(prev => prev.filter(d => d.id !== docId));
      setApriRifiuto(null); setMotivazione('');
    } catch (err) { console.error(err); }
    finally { setElaborando(null); }
  };


const TabStato = ({ statoVolantini }) => (
  <div className="flex flex-col h-full pb-28 overflow-y-auto" style={{ background: T.bg }}>
    <div className="px-5 pt-8 pb-6" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <h2 style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>Stato volantini</h2>
      <p className="text-sm mt-1" style={{ color: T.textSec }}>Validità degli aggiornamenti settimanali.</p>
    </div>
    <div className="p-4 space-y-3">
      {statoVolantini.map(stato => {
        const g = calcGiorniRimanenti(stato.valido_fino);
        const dot = g < 0 ? '#DC2626' : g <= 2 ? T.accent : T.primary;
        return (
          <div key={stato.id} className="flex items-center justify-between p-4 rounded-[20px]"
            style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
              <div>
                <h3 className="font-medium text-sm" style={{ color: T.textPrimary }}>{stato.insegna}</h3>
                <p className="text-xs mt-0.5" style={{ color: T.textSec }}>{stato.n_prodotti} prodotti</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: T.textSec }}>Scadenza</div>
              <div className="text-sm font-medium" style={{ color: g < 0 ? '#DC2626' : T.textPrimary }}>
                {g < 0 ? 'Scaduto' : stato.valido_fino}
              </div>
            </div>
          </div>
        );
      })}
      <div className="rounded-[20px] p-4 mt-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <p className="text-sm leading-relaxed text-blue-800">
          <strong>Trasparenza:</strong> i prezzi mostrati provengono esclusivamente dai volantini promozionali settimanali.
        </p>
      </div>
    </div>
  </div>
);

// ─── Tab Supermercati ─────────────────────────────────────────────────────────

// ─── Info Insegne — hook + componenti ────────────────────────────────────────

// Struttura vuota di default per il form
const INFO_VUOTA = {
  buoni_pasto: { accettati: false, circuiti: [], note: '' },
  pagamenti:   { contanti: true, bancomat: true, carta: true, contactless: true, satispay: false },
  promozioni_flat: [],
};

const useInfoInsegna = (insegna, città) => {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const { utente, profilo }   = useAuth();

  const docId = `${città}_${(insegna || '').replace(/[^a-zA-Z0-9]/g, '_')}`;

  useEffect(() => {
    if (!insegna || !città) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    getDoc(doc(db, 'info_insegne', docId))
      .then(snap => { if (mounted) setInfo(snap.exists() ? { id: snap.id, ...snap.data() } : null); })
      .catch(() => { if (mounted) setInfo(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [insegna, città, docId]);

  const votaProposta = async () => {
    if (!utente || !info?.proposta) return;
    const uid     = utente.uid;
    const isGuru  = (profilo?.punti || 0) >= 1000;
    const docRef  = doc(db, 'info_insegne', docId);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) throw new Error('documento non trovato');
        const proposta = snap.data().proposta;
        if (!proposta) throw new Error('nessuna proposta attiva');

        // Evita doppio voto — controlla i dati freschi da Firestore, non dallo state
        if (proposta.voti_guru?.includes(uid) || proposta.voti_utenti?.includes(uid)) {
          throw new Error('già votato');
        }

        const nuoviVotiGuru   = isGuru ? [...(proposta.voti_guru || []), uid] : (proposta.voti_guru || []);
        const nuoviVotiUtenti = !isGuru ? [...(proposta.voti_utenti || []), uid] : (proposta.voti_utenti || []);
        const soglia  = proposta.tipo === 'nuova' ? 3 : 5;
        const approvata = nuoviVotiGuru.length >= 1 || nuoviVotiUtenti.length >= soglia;

        if (approvata) {
          tx.set(docRef, {
            insegna, città,
            dati: proposta.dati,
            n_conferme: nuoviVotiGuru.length + nuoviVotiUtenti.length,
            ultima_modifica: serverTimestamp(),
            modificata_da: uid,
            proposta: null,
            stato: 'attivo',
          });
        } else {
          // arrayUnion garantisce atomicità anche con scritture concorrenti
          tx.update(docRef, {
            'proposta.voti_guru':   isGuru  ? arrayUnion(uid) : proposta.voti_guru || [],
            'proposta.voti_utenti': !isGuru ? arrayUnion(uid) : proposta.voti_utenti || [],
          });
        }
      });
      // Ricarica stato locale
      const snap = await getDoc(docRef);
      setInfo(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch (err) {
      if (err.message !== 'già votato') console.error('Errore voto:', err);
    }
  };

  const inviaProposta = async (nuoviDati) => {
    if (!utente) return;
    try {
      const docRef = doc(db, 'info_insegne', docId);
      const snap = await getDoc(docRef);
      const datoAttuale = snap.exists() ? snap.data() : null;
      if (datoAttuale?.proposta?.stato === 'pending') {
        alert('C\'è già una proposta in attesa di approvazione per questa insegna. Votala prima di proporne un\'altra.');
        return;
      }
      const tipo = datoAttuale?.dati ? 'modifica' : 'nuova';
      await setDoc(docRef, {
        insegna, città,
        dati: datoAttuale?.dati || null,
        proposta: {
          dati: nuoviDati,
          tipo,
          uid_proponente: utente.uid,
          data_proposta:  serverTimestamp(),
          voti_guru:   [],
          voti_utenti: [],
          stato: 'pending',
        },
        stato: datoAttuale?.stato || 'proposta',
      }, { merge: true });
      const snapAggiornato = await getDoc(docRef);
      setInfo(snapAggiornato.exists() ? { id: snapAggiornato.id, ...snapAggiornato.data() } : null);
    } catch (err) {
      console.error('Errore invio proposta:', err);
      alert('Errore durante l\'invio della proposta. Controlla la connessione e riprova.');
    }
  };

  return { info, loading, votaProposta, inviaProposta, docId };
};


// Form proposta info insegna
const FormPropostaInfo = ({ insegna, infoEsistente, onInvia, onAnnulla }) => {
  const [dati, setDati] = useState(infoEsistente || INFO_VUOTA);
  const [promoTesto, setPromoTesto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const CIRCUITI = ['Ticket Restaurant', 'Edenred', 'Sodexo', 'Day', 'Coverflex', 'Hipe'];

  const toggleCircuito = useCallback((c) => {
    setDati(prev => ({
      ...prev,
      buoni_pasto: {
        ...prev.buoni_pasto,
        circuiti: prev.buoni_pasto.circuiti?.includes(c)
          ? prev.buoni_pasto.circuiti.filter(x => x !== c)
          : [...(prev.buoni_pasto.circuiti || []), c],
      }
    }));
  }, []);

  const aggiungiPromo = useCallback(() => {
    if (!promoTesto.trim()) return;
    setDati(prev => ({
      ...prev,
      promozioni_flat: [...(prev.promozioni_flat || []), { regola: promoTesto.trim() }]
    }));
    setPromoTesto('');
  }, [promoTesto]);

  const rimuoviPromo = useCallback((i) => {
    setDati(prev => ({
      ...prev,
      promozioni_flat: prev.promozioni_flat.filter((_, idx) => idx !== i)
    }));
  }, []);

  const submit = async () => {
    setSalvando(true);
    await onInvia(dati);
    setSalvando(false);
  };

  return (
    <div className="space-y-5">
      {/* Buoni pasto */}
      <div className="rounded-[16px] p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: T.textPrimary }}>🎟️ Buoni pasto</h4>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setDati(p => ({ ...p, buoni_pasto: { ...p.buoni_pasto, accettati: true } }))}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
            style={dati.buoni_pasto.accettati
              ? { background: T.primary, color: '#fff' }
              : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
            ✅ Accettati
          </button>
          <button onClick={() => setDati(p => ({ ...p, buoni_pasto: { ...p.buoni_pasto, accettati: false, circuiti: [] } }))}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
            style={!dati.buoni_pasto.accettati
              ? { background: '#FEE2E2', color: '#DC2626' }
              : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
            ❌ Non accettati
          </button>
        </div>
        {dati.buoni_pasto.accettati && (
          <>
            <p className="text-xs mb-2" style={{ color: T.textSec }}>Circuiti accettati:</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {CIRCUITI.map(c => (
                <button key={c} onClick={() => toggleCircuito(c)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={dati.buoni_pasto.circuiti?.includes(c)
                    ? { background: T.primary, color: '#fff' }
                    : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                  {c}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Note (es. min €5, non dopo le 20:00)"
              value={dati.buoni_pasto.note || ''}
              onChange={e => setDati(p => ({ ...p, buoni_pasto: { ...p.buoni_pasto, note: e.target.value } }))}
              className="w-full px-3 py-2 rounded-xl text-base outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }} />
          </>
        )}
      </div>

      {/* Metodi di pagamento */}
      <div className="rounded-[16px] p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: T.textPrimary }}>💳 Metodi di pagamento</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'contanti', label: '💵 Contanti' },
            { key: 'bancomat', label: '💳 Bancomat' },
            { key: 'carta', label: '💳 Carta credito' },
            { key: 'contactless', label: '📱 Contactless' },
            { key: 'satispay', label: '🟡 Satispay' },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => setDati(p => ({ ...p, pagamenti: { ...p.pagamenti, [key]: !p.pagamenti?.[key] } }))}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={dati.pagamenti?.[key]
                ? { background: T.primary, color: '#fff' }
                : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Promozioni flat */}
      <div className="rounded-[16px] p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: T.textPrimary }}>📅 Promozioni fisse</h4>
        {(dati.promozioni_flat || []).map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="flex-1 text-sm px-3 py-2 rounded-xl"
              style={{ background: '#EEF2E4', color: T.textPrimary }}>{p.regola}</span>
            <button onClick={() => rimuoviPromo(i)}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input type="text"
            placeholder='Es. "10% pensionati martedì mattina"'
            value={promoTesto}
            onChange={e => setPromoTesto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungiPromo()}
            className="flex-1 px-3 py-2 rounded-xl text-base outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary }} />
          <button onClick={aggiungiPromo}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: T.primary, color: '#fff' }}>
            +
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: T.textSec }}>
          Scrivi la regola in modo leggibile — verrà mostrata testualmente agli utenti
        </p>
      </div>

      {/* Bottoni */}
      <div className="flex gap-3">
        <button onClick={onAnnulla}
          className="flex-1 py-3 rounded-[16px] text-sm font-medium"
          style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
          Annulla
        </button>
        <button onClick={submit} disabled={salvando}
          className="flex-1 py-3 rounded-[16px] text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: T.primary, color: '#fff', boxShadow: '0 4px 16px rgba(100,113,68,0.3)' }}>
          {salvando
            ? <><Loader size={14} strokeWidth={1.5} className="animate-spin" /> Invio...</>
            : <><Check size={14} strokeWidth={2} /> Invia proposta</>}
        </button>
      </div>
    </div>
  );
};


// Pannello info insegna — mostrato nella scheda dettaglio in TabSupermercati
const PannelloInfoInsegna = ({ insegna, città }) => {
  const { info, loading, votaProposta, inviaProposta } = useInfoInsegna(insegna, città);
  const { utente, profilo, isEleggibilePerCittà } = useAuth();
  const [mostraForm, setMostraForm] = useState(false);
  const isGuru     = (profilo?.punti || 0) >= 1000;
  const eleggibile = città ? isEleggibilePerCittà(città) : false;
  const puoProporre = utente && (isGuru || eleggibile);

  // Città non ancora impostata nel profilo
  if (!città) return (
    <div className="px-5 py-4">
      <p className="text-xs" style={{ color: T.textSec }}>
        💳 Imposta la tua città nel profilo per vedere e contribuire alle info pagamenti.
      </p>
    </div>
  );

  // Voto già dato?
  const haVotato = utente && info?.proposta && (
    info.proposta.voti_guru?.includes(utente.uid) ||
    info.proposta.voti_utenti?.includes(utente.uid)
  );

  if (loading) return (
    <div className="flex items-center gap-2 py-4 px-5">
      <Loader size={14} strokeWidth={1.5} className="animate-spin" style={{ color: T.textSec }} />
      <span className="text-xs" style={{ color: T.textSec }}>Carico info pagamenti...</span>
    </div>
  );

  if (mostraForm) return (
    <div className="px-4 pb-4">
      <h3 className="text-sm font-semibold mb-3 pt-4" style={{ color: T.textPrimary }}>
        {info?.dati ? '✏️ Proponi modifica' : '➕ Aggiungi info pagamenti'}
      </h3>
      <FormPropostaInfo
        insegna={insegna}
        infoEsistente={info?.dati || null}
        onInvia={async (dati) => { await inviaProposta(dati); setMostraForm(false); }}
        onAnnulla={() => setMostraForm(false)}
      />
    </div>
  );

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between pt-4 mb-3">
        <h3 className="text-sm font-semibold" style={{ color: T.textPrimary }}>
          💳 Pagamenti & promozioni
        </h3>
        {puoProporre && (
          <button onClick={() => setMostraForm(true)}
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: '#EEF2E4', color: T.primary }}>
            {info?.dati ? 'Modifica' : 'Aggiungi'}
          </button>
        )}
        {!puoProporre && utente && (
          <span className="text-[10px]" style={{ color: T.textSec }}>
            {isGuru ? '' : `Servono scontrini da ${città}`}
          </span>
        )}
      </div>

      {!info?.dati && !info?.proposta && (
        <div className="rounded-[14px] p-4 text-center"
          style={{ background: T.bg, border: `1px dashed ${T.border}` }}>
          <p className="text-sm" style={{ color: T.textSec }}>
            Nessuna info ancora — sei stato qui di recente?
          </p>
          {!utente && (
            <p className="text-xs mt-1" style={{ color: T.textSec }}>Accedi per aggiungere info</p>
          )}
        </div>
      )}

      {info?.dati && (
        <div className="space-y-3">
          {/* Buoni pasto */}
          <div className="rounded-[14px] p-3" style={{ background: T.bg }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🎟️</span>
              <span className="text-sm font-medium" style={{ color: T.textPrimary }}>Buoni pasto</span>
              <span className="text-xs font-semibold ml-auto"
                style={{ color: info.dati.buoni_pasto?.accettati ? T.primary : '#DC2626' }}>
                {info.dati.buoni_pasto?.accettati ? '✅ Accettati' : '❌ Non accettati'}
              </span>
            </div>
            {info.dati.buoni_pasto?.accettati && info.dati.buoni_pasto?.circuiti?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {info.dati.buoni_pasto.circuiti.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: '#EEF2E4', color: T.primary }}>{c}</span>
                ))}
              </div>
            )}
            {info.dati.buoni_pasto?.note && (
              <p className="text-[11px] mt-1.5" style={{ color: T.textSec }}>
                {info.dati.buoni_pasto.note}
              </p>
            )}
          </div>

          {/* Metodi pagamento */}
          {info.dati.pagamenti && (
            <div className="rounded-[14px] p-3" style={{ background: T.bg }}>
              <p className="text-xs font-medium mb-2" style={{ color: T.textSec }}>💳 Metodi accettati</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'contanti', label: '💵 Contanti' },
                  { key: 'bancomat', label: '💳 Bancomat' },
                  { key: 'carta', label: '💳 Credito' },
                  { key: 'contactless', label: '📱 Contactless' },
                  { key: 'satispay', label: '🟡 Satispay' },
                ].filter(({ key }) => info.dati.pagamenti[key]).map(({ label }, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: '#EEF2E4', color: T.primary }}>{label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Promozioni flat */}
          {info.dati.promozioni_flat?.length > 0 && (
            <div className="rounded-[14px] p-3" style={{ background: T.bg }}>
              <p className="text-xs font-medium mb-2" style={{ color: T.textSec }}>📅 Promozioni fisse</p>
              <div className="space-y-1.5">
                {info.dati.promozioni_flat.map((p, i) => (
                  <p key={i} className="text-sm" style={{ color: T.textPrimary }}>• {p.regola}</p>
                ))}
              </div>
            </div>
          )}

          {/* Badge validazione */}
          <p className="text-[10px] text-center" style={{ color: T.textSec }}>
            Verificato da {info.n_conferme} utent{info.n_conferme === 1 ? 'e' : 'i'} · {città}
          </p>
        </div>
      )}

      {/* Proposta in attesa */}
      {info?.proposta && (
        <div className="mt-3 rounded-[14px] p-4"
          style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
            📋 Proposta in attesa di verifica
          </p>
          <p className="text-[11px] mb-3" style={{ color: '#A16207' }}>
            {info.proposta.tipo === 'nuova' ? 'Nuova info' : 'Modifica'} ·{' '}
            {info.proposta.voti_guru?.length} Guru, {info.proposta.voti_utenti?.length} utenti —{' '}
            serve {info.proposta.tipo === 'nuova' ? '1 Guru o 3 utenti' : '1 Guru o 5 utenti'}
          </p>
          {utente && !haVotato && (isGuru || eleggibile) && (
            <button onClick={() => votaProposta('conferma')}
              className="w-full py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#92400E', color: '#fff' }}>
              ✓ Confermo — le info sono corrette
            </button>
          )}
          {haVotato && (
            <p className="text-xs text-center" style={{ color: '#92400E' }}>✓ Hai già votato</p>
          )}
          {utente && !isGuru && !eleggibile && (
            <p className="text-xs text-center" style={{ color: '#A16207' }}>
              Servono scontrini da {città} per votare
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TabSupermercati = ({ offerte, statoVolantini }) => {
  const [selectedInsegna, setSelectedInsegna] = useState(null);
  const { segnalati, segnala } = useSegnalazioniStore();
  const { cittàAttiva } = useAuth();

  if (selectedInsegna) {
    const storeOffers = offerte.filter(o => o.insegna === selectedInsegna && !o.nascosto).sort((a, b) => a.prezzo - b.prezzo);
    const tileClass = getTileInsegna(selectedInsegna);
    return (
      <div className="flex flex-col h-full pb-28" style={{ background: T.bg }}>
        <div className={`px-5 py-4 flex items-center gap-3 sticky top-0 z-10 ${tileClass}`}>
          <button onClick={() => setSelectedInsegna(null)} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all">
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>
          <div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 500 }}>{selectedInsegna}</h2>
            <p className="text-xs opacity-80">{storeOffers.length} offerte disponibili</p>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {/* Pannello info pagamenti — sopra le offerte */}
          <div className="rounded-[20px] mx-4 mt-4 overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 16px rgba(44,48,38,0.06)' }}>
            <PannelloInfoInsegna insegna={selectedInsegna} città={cittàAttiva} />
          </div>

          {/* Lista offerte */}
          <div className="p-4">
            {storeOffers.map((o, i) => <ProductCard key={o.id} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-28" style={{ background: T.bg }}>
      <div className="px-5 pt-8 pb-5 safe-top sticky top-0 z-10" style={{ background: 'rgba(249,248,244,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>Negozi</h2>
        <p className="text-sm mt-1" style={{ color: T.textSec }}>Sfoglia per insegna.</p>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-3">
          {statoVolantini.map(stato => (
            <button key={stato.id} onClick={() => setSelectedInsegna(stato.insegna)}
              className={`flex flex-col items-center justify-center p-5 rounded-[20px] h-32 active:scale-95 transition-all ${getTileInsegna(stato.insegna)}`}
              style={{ boxShadow: '0 4px 16px rgba(44,48,38,0.1)' }}>
              <span style={{ fontFamily: "'Lora', serif", fontSize: '17px', fontWeight: 500, textAlign: 'center', lineHeight: '1.3', marginBottom: '8px' }}>
                {stato.insegna}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(255,255,255,0.22)' }}>
                {stato.n_prodotti} offerte
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Tab Spese ────────────────────────────────────────────────────────────────

const CATEGORIE_COLORI = {
  dispensa:       { bg: '#EEF2E4', text: '#525E36', label: 'Dispensa' },
  carne:          { bg: '#FEE2E2', text: '#991B1B', label: 'Carne' },
  pesce:          { bg: '#DBEAFE', text: '#1E40AF', label: 'Pesce' },
  frutta_verdura: { bg: '#D1FAE5', text: '#065F46', label: 'Frutta/Verdura' },
  freschissimi:   { bg: '#FEF3C7', text: '#92400E', label: 'Freschissimi' },
  surgelati:      { bg: '#E0E7FF', text: '#3730A3', label: 'Surgelati' },
  bevande:        { bg: '#FCE7F3', text: '#9D174D', label: 'Bevande' },
  casa_igiene:    { bg: '#F3F4F6', text: '#374151', label: 'Casa & Igiene' },
};

// ─── RisparmioCumulato ─────────────────────────────────────────────────────
// Mostra il risparmio cumulato dall'utente grazie alle offerte.
// Legge promo_conversioni via where("uid", "==", auth.uid).
// Renderizzato PRIMA del grafico 5 mesi in TabSpese.

const FINESTRE_RISPARMIO = [
  { label: '30 gg', giorni: 30 },
  { label: '90 gg', giorni: 90 },
  { label: '1 anno', giorni: 365 },
];

const RisparmioCumulato = ({ uid }) => {
  const [finestraIdx,  setFinestraIdx]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [dati,         setDati]         = useState(null);
  // dati: { risparmio: number, nProdotti: number } | null

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    const giorni  = FINESTRE_RISPARMIO[finestraIdx].giorni;
    const cutoff  = new Date();
    cutoff.setDate(cutoff.getDate() - giorni);
    const cutoffStr = cutoff.toISOString().slice(0, 10);  // YYYY-MM-DD

    getDocs(query(
      collection(db, 'promo_conversioni'),
      where('uid', '==', uid),
      limit(500)   // protezione: utenti con >500 conversioni mostrano i 500 più recenti
    ))
    .then(snap => {
      if (cancelled) return;
      let risparmio   = 0;
      let nProdotti   = 0;

      snap.forEach(doc => {
        const d = doc.data();
        // Filtra per finestra temporale lato client
        const dataAcq = (d.data_acquisto || '');
        if (dataAcq < cutoffStr) return;
        // Considera solo match con sconto_effettivo_pct disponibile
        if (d.sconto_effettivo_pct == null || d.prezzo_listino_stimato == null) return;
        const sconto = d.prezzo_listino_stimato - d.prezzo_pagato;
        if (sconto > 0) {
          risparmio += sconto;
          nProdotti += 1;
        }
      });

      setDati({ risparmio: Math.round(risparmio * 100) / 100, nProdotti });
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
      setDati(null);
    });

    return () => { cancelled = true; };
  }, [uid, finestraIdx]);

  const hasDati = dati && dati.risparmio >= 5 && dati.nProdotti >= 3;

  return (
    <div className="rounded-[20px] p-5 mb-3"
      style={{ background: T.surface, border: `1px solid ${T.border}`,
               boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>

      {/* Toggle finestra temporale */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>
          Risparmio con le offerte
        </h3>
        <div className="flex gap-1">
          {FINESTRE_RISPARMIO.map((f, i) => (
            <button key={f.giorni}
              onClick={() => setFinestraIdx(i)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: i === finestraIdx ? T.primary : T.bg,
                color:      i === finestraIdx ? '#fff'    : T.textSec,
                border:     `1px solid ${i === finestraIdx ? T.primary : T.border}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        /* Skeleton loader */
        <div className="animate-pulse">
          <div className="h-9 w-32 rounded-xl mb-2" style={{ background: T.border }} />
          <div className="h-4 w-48 rounded-lg"      style={{ background: T.border }} />
        </div>

      ) : hasDati ? (
        /* Dati disponibili: mostra risparmio */
        <div>
          <p style={{
            fontFamily: "'Lora', serif",
            fontSize:   '32px',
            fontWeight: 500,
            color:      T.primary,
            lineHeight: 1.1,
          }}>
            {formattaPrezzo(dati.risparmio)}
          </p>
          <p className="mt-1.5 text-sm" style={{ color: T.textSec }}>
            Hai risparmiato negli ultimi {FINESTRE_RISPARMIO[finestraIdx].label} grazie alle offerte
          </p>
          <p className="mt-0.5 text-xs" style={{ color: T.textSec }}>
            Su {dati.nProdotti} {dati.nProdotti === 1 ? 'prodotto acquistato' : 'prodotti acquistati'} in promozione
          </p>
        </div>

      ) : (
        /* Dati insufficienti: CTA verso TabOfferte */
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: T.textPrimary }}>
            Inizia a sfruttare le offerte per vedere quanto risparmi
          </p>
          <p className="text-xs mb-3" style={{ color: T.textSec }}>
            Sfoglia le promozioni della settimana e segnale con lo scontrino
          </p>
          <button
            onClick={() => {/* navigazione a TabOfferte gestita dal padre */
              document.dispatchEvent(new CustomEvent('lenticchia:goto', { detail: 'offerte' }));
            }}
            className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: T.primary }}>
            Vedi offerte della settimana
          </button>
        </div>
      )}
    </div>
  );
};

const TabSpese = ({ scontriniReali = [], dataLoaded = false }) => {
  const { utente } = useAuth();
  // Usa scontrini reali se il fetch è completato e ci sono dati.
  // Se non ancora caricato, non mostrare demo (evita flash).
  const isDemo = dataLoaded && scontriniReali.length === 0;
  const scontrini = (dataLoaded && scontriniReali.length > 0) ? scontriniReali : (isDemo ? MOCK_SCONTRINI : []);

  // Sprint 2: modal drill-down scontrino con editing prodotti
  const [modalScontrino, setModalScontrino]         = useState(null);
  const [prodottiEdit, setProdottiEdit]             = useState([]);
  const [salvataggioPending, setSalvataggioPending] = useState(false);
  const [salvataggioOk, setSalvataggioOk]           = useState(false); // feedback successo
  const [prodottoFocus, setProdottoFocus]           = useState(null);

  const apriModalScontrino = (s) => {
    if (isDemo) return;
    const clone = (s.prodotti || []).map(p => ({ ...p }));
    setProdottiEdit(clone);
    setModalScontrino(s);
    setProdottoFocus(null);
    setSalvataggioOk(false);
  };

  const chiudiModal = () => {
    setModalScontrino(null);
    setProdottiEdit([]);
    setProdottoFocus(null);
    setSalvataggioOk(false);
  };

  const aggiornaNomeNorm = (idx, valore) => {
    setProdottiEdit(prev => prev.map((p, i) =>
      i === idx ? { ...p, nome_normalizzato: valore } : p
    ));
  };

  // Fix: aggiungiamo anche aggiornamento unità di misura
  const aggiornaUnitaMisura = (idx, valore) => {
    setProdottiEdit(prev => prev.map((p, i) =>
      i === idx ? { ...p, unita_misura: valore } : p
    ));
  };

  const salvaModifiche = async () => {
    if (!utente || !modalScontrino || isDemo) return;
    setSalvataggioPending(true);
    setSalvataggioOk(false);
    try {
      const ref = doc(db, 'spese_personali', utente.uid, 'scontrini', modalScontrino.id);
      await updateDoc(ref, { prodotti: prodottiEdit });
      // FIX BUG LOOP: non aggiornare modalScontrino con setModalScontrino
      // (causava re-render → reset prodottoFocus → loop)
      // Aggiorniamo solo il feedback visivo, i dati aggiornati
      // sono già in prodottiEdit che è lo stato locale
      setSalvataggioOk(true);
      setProdottoFocus(null); // chiude il pannello editing dopo il salvataggio
      setTimeout(() => setSalvataggioOk(false), 2500);
    } catch (err) {
      console.error('Errore salvataggio:', err);
    } finally {
      setSalvataggioPending(false);
    }
  };

  // A2: filtro per insegna
  const [filtroInsegna, setFiltroInsegna] = useState(null);
  const scontriniBase = filtroInsegna
    ? scontrini.filter(s => s.insegna === filtroInsegna)
    : scontrini;
  // insegne disponibili negli scontrini (per il chip-filter)
  const insegneDisponibili = useMemo(() =>
    [...new Set(scontrini.map(s => s.insegna).filter(Boolean))].sort(),
    [scontrini]);

  const oggi = new Date();
  const meseCorrente = oggi.getMonth();
  const annoCorrente = oggi.getFullYear();

  // ── Calcoli per mese corrente e precedente ──────────────────────────────
  const getMeseAnno = (dateStr) => {
    const d = new Date(dateStr);
    return { mese: d.getMonth(), anno: d.getFullYear() };
  };

  const scontriniMeseCorrente = scontriniBase.filter(s => {
    const { mese, anno } = getMeseAnno(s.data_acquisto);
    return mese === meseCorrente && anno === annoCorrente;
  });

  const scontriniMesePrecedente = scontriniBase.filter(s => {
    const { mese, anno } = getMeseAnno(s.data_acquisto);
    const mesePrecedente = meseCorrente === 0 ? 11 : meseCorrente - 1;
    const annoPrecedente = meseCorrente === 0 ? annoCorrente - 1 : annoCorrente;
    return mese === mesePrecedente && anno === annoPrecedente;
  });

  const totaleMese = scontriniMeseCorrente.reduce((s, sc) => s + sc.totale_scontrino, 0);
  const totalePrecedente = scontriniMesePrecedente.reduce((s, sc) => s + sc.totale_scontrino, 0);
  const diffPerc = totalePrecedente > 0
    ? Math.round(((totaleMese - totalePrecedente) / totalePrecedente) * 100)
    : null;
  const isMigliorato = diffPerc !== null && diffPerc < 0;

  // ── Tesoretto — dati calcolati fuori dal JSX ──────────────────────────
  const tesoretto = useMemo(() => {
    if (isDemo || totaleMese === 0) return null;
    const hasPrecedente  = totalePrecedente > 0;
    const risparmio      = hasPrecedente ? totalePrecedente - totaleMese : null;
    const nSpecifici     = scontriniMeseCorrente.reduce((acc, s) => acc + (s.n_specifici || 0), 0);
    const nScontrini     = scontriniMeseCorrente.length;
    if (!hasPrecedente && nScontrini === 0) return null;
    return { hasPrecedente, risparmio, nSpecifici, nScontrini, inRisparmio: risparmio != null && risparmio > 0 };
  }, [isDemo, totaleMese, totalePrecedente, scontriniMeseCorrente]);

  // ── Spesa per mese ultimi 5 mesi ────────────────────────────────────────
  const ultimi5Mesi = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(annoCorrente, meseCorrente - (4 - i), 1);
    const m = d.getMonth();
    const a = d.getFullYear();
    const tot = scontrini
      .filter(s => { const sm = getMeseAnno(s.data_acquisto); return sm.mese === m && sm.anno === a; })
      .reduce((acc, sc) => acc + sc.totale_scontrino, 0);
    const labels = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    return { label: labels[m], totale: tot, isCorrente: m === meseCorrente && a === annoCorrente };
  });

  const maxMese = Math.max(...ultimi5Mesi.map(m => m.totale), 1);

  // ── Categorie mese corrente ──────────────────────────────────────────────
  const categorieTotali = {};
  scontriniMeseCorrente.forEach(s => {
    (s.prodotti || []).forEach(p => {
      const cat = p.categoria || 'dispensa';
      const prezzoUnitario = p.prezzo_unitario || p.prezzo || 0;
      const spesa = prezzoUnitario * (p.quantita || 1);
      categorieTotali[cat] = (categorieTotali[cat] || 0) + spesa;
    });
  });
  const categorieOrdinata = Object.entries(categorieTotali)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totaleCategorie = categorieOrdinata.reduce((s, [, v]) => s + v, 0);

  // ── Alert trend prezzi (confronto stesso prodotto mesi diversi) ─────────
  const trovaTrend = () => {
    const prezziPerProdotto = {};
    scontrini.forEach(s => {
      const { mese, anno } = getMeseAnno(s.data_acquisto);
      (s.prodotti || []).forEach(p => {
        const nomeDisplay = p.nome_normalizzato || p.nome_raw || p.nome || '';
        if (!nomeDisplay) return;
        const prezzo = p.prezzo_unitario || p.prezzo || 0;
        if (!prezzo) return;
        const key = nomeDisplay.toLowerCase().replace(/\s+/g, '_');
        if (!prezziPerProdotto[key]) prezziPerProdotto[key] = { nome: nomeDisplay, prezzi: [], grammature: [] };
        prezziPerProdotto[key].prezzi.push({ mese, anno, prezzo });
        // G2: accumula grammatura se disponibile
        if (p.grammatura) prezziPerProdotto[key].grammature.push({ mese, anno, grammatura: p.grammatura });
      });
    });
    const alert = [];
    Object.values(prezziPerProdotto).forEach(({ nome, prezzi, grammature }) => {
      if (prezzi.length < 2) return;
      const ordinati = prezzi.sort((a, b) => (a.anno * 12 + a.mese) - (b.anno * 12 + b.mese));
      const primo = ordinati[0];
      const ultimo = ordinati[ordinati.length - 1];
      if (primo.prezzo === ultimo.prezzo) return;
      const perc = Math.round(((ultimo.prezzo - primo.prezzo) / primo.prezzo) * 100);
      if (Math.abs(perc) >= 10) {
        alert.push({ nome, perc, prezzoVecchio: primo.prezzo, prezzoNuovo: ultimo.prezzo, tipo: 'prezzo' });
      }
    });
    return alert.sort((a, b) => Math.abs(b.perc) - Math.abs(a.perc)).slice(0, 3);
  };
  const alertTrend = trovaTrend();

  // G2: Shrinkflation detector — stesso prodotto, grammatura calata nel tempo
  const shrinkflation = useMemo(() => {
    if (isDemo || scontrini.length < 3) return [];
    // Estrae grammatura in grammi da stringhe tipo "500g", "1kg", "33cl", "1L"
    const parseGrammi = (str) => {
      if (!str) return null;
      const s = str.toLowerCase().replace(/\s/g, '');
      const m = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|cl|ml)/);
      if (!m) return null;
      const val = parseFloat(m[1].replace(',', '.'));
      switch (m[2]) {
        case 'kg': return val * 1000;
        case 'g':  return val;
        case 'l':  return val * 1000;
        case 'cl': return val * 10;
        case 'ml': return val;
        default:   return null;
      }
    };

    const perProdotto = {};
    scontrini.forEach(s => {
      const { mese, anno } = getMeseAnno(s.data_acquisto);
      (s.prodotti || []).forEach(p => {
        const nome = (p.nome_normalizzato || p.nome_raw || '').trim();
        if (!nome || !p.grammatura) return;
        const grammi = parseGrammi(p.grammatura);
        if (!grammi) return;
        const prezzo = p.prezzo_unitario || p.prezzo || 0;
        if (!prezzo) return;
        const key = nome.toLowerCase().replace(/\s+/g, '_');
        if (!perProdotto[key]) perProdotto[key] = { nome, misure: [] };
        perProdotto[key].misure.push({ mese, anno, grammi, prezzo, grammaturaRaw: p.grammatura });
      });
    });

    const allarmi = [];
    Object.values(perProdotto).forEach(({ nome, misure }) => {
      if (misure.length < 2) return;
      const ord = misure.sort((a, b) => (a.anno * 12 + a.mese) - (b.anno * 12 + b.mese));
      const prima = ord[0];
      const ultima = ord[ord.length - 1];
      if (prima.grammi === ultima.grammi) return;
      const deltaGrammi = Math.round(((ultima.grammi - prima.grammi) / prima.grammi) * 100);
      // Shrinkflation: grammatura scesa ≥ 5% — il prezzo non scende di pari passo
      if (deltaGrammi <= -5) {
        const prezzoPer100gPrima = (prima.prezzo / prima.grammi) * 100;
        const prezzoPer100gUltima = (ultima.prezzo / ultima.grammi) * 100;
        const deltaPrezzoKg = Math.round(((prezzoPer100gUltima - prezzoPer100gPrima) / prezzoPer100gPrima) * 100);
        allarmi.push({
          nome,
          deltaGrammi,        // negativo = rimpicciolimento
          deltaPrezzoKg,      // positivo = paghi di più al kg
          grammaturaPrima: prima.grammaturaRaw,
          grammaturaUltima: ultima.grammaturaRaw,
          prezzoPrima: prima.prezzo,
          prezzoUltima: ultima.prezzo,
        });
      }
    });
    return allarmi.sort((a, b) => a.deltaGrammi - b.deltaGrammi).slice(0, 3);
  }, [scontrini, isDemo]);

  // ── Mesi nomi ────────────────────────────────────────────────────────────
  const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                     'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  // ── Assistente Scorte — calcolato fuori dal JSX per leggibilità ─────────
  const prodottiInScadenza = useMemo(() => {
    if (isDemo || scontrini.length < 2) return [];
    const conteggio = {};
    const ultimoAcquisto = {};
    scontrini.forEach(s => {
      const dataS = s.data_acquisto ? new Date(s.data_acquisto + 'T12:00:00') : null;
      (s.prodotti || [])
        .filter(p => !p.tipo_voce || p.tipo_voce === 'specifico')
        .forEach(p => {
          const nome = (p.nome_normalizzato || p.nome_raw || '').trim().toLowerCase();
          if (!nome || nome.length < 3) return;
          if (!conteggio[nome]) conteggio[nome] = { nome: p.nome_normalizzato || p.nome_raw, count: 0, date: [] };
          conteggio[nome].count += 1;
          if (dataS) conteggio[nome].date.push(dataS);
          if (!ultimoAcquisto[nome] || (dataS && dataS > ultimoAcquisto[nome])) ultimoAcquisto[nome] = dataS;
        });
    });
    return Object.entries(conteggio)
      .filter(([, v]) => v.count >= 2)
      .map(([key, v]) => {
        const dateOrd = [...v.date].sort((a, b) => a - b);
        const intervalli = [];
        for (let i = 1; i < dateOrd.length; i++)
          intervalli.push((dateOrd[i] - dateOrd[i - 1]) / 86400000);
        const mediaIntervallo = intervalli.length
          ? Math.round(intervalli.reduce((a, b) => a + b, 0) / intervalli.length) : null;
        const ultimaData = ultimoAcquisto[key];
        const giorniPassati = ultimaData ? Math.round((Date.now() - ultimaData) / 86400000) : null;
        const prossimoPrevisto = mediaIntervallo != null && giorniPassati != null
          ? mediaIntervallo - giorniPassati : null;
        return { ...v, mediaIntervallo, prossimoPrevisto };
      })
      .filter(p => p.prossimoPrevisto != null && p.prossimoPrevisto <= 7)
      .sort((a, b) => a.prossimoPrevisto - b.prossimoPrevisto)
      .slice(0, 4);
  }, [scontrini, isDemo]);

  return (
    <div className="flex flex-col h-full pb-32 overflow-y-auto hide-scrollbar" style={{ background: T.bg }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-4 safe-top sticky top-0 z-10"
        style={{ background: 'rgba(249,248,244,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: T.textPrimary }}>
              Le mie spese
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.textSec }}>
              {MESI_NOMI[meseCorrente]} {annoCorrente}
              {filtroInsegna && <span style={{ color: T.primary }}> · {filtroInsegna}</span>}
            </p>
          </div>
          {isDemo && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              Demo
            </span>
          )}
        </div>
        {/* A2: chip filtro per insegna */}
        {insegneDisponibili.length > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => setFiltroInsegna(null)}
              className="px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all"
              style={!filtroInsegna
                ? { background: T.primary, color: '#fff' }
                : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
              Tutti
            </button>
            {insegneDisponibili.map(ins => (
              <button key={ins}
                onClick={() => setFiltroInsegna(ins === filtroInsegna ? null : ins)}
                className="px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all"
                style={filtroInsegna === ins
                  ? { background: T.primary, color: '#fff' }
                  : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                {ins.split('/')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── KPI hero card ── */}
        <div className="rounded-[24px] p-6 relative overflow-hidden"
          style={{ background: T.primary, boxShadow: '0 12px 40px rgba(100,113,68,0.28)' }}>
          {/* Pattern decorativo */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: '#fff' }} />
          <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full opacity-[0.07]"
            style={{ background: '#fff' }} />

          <p className="text-xs uppercase tracking-widest mb-1 relative" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Speso questo mese
          </p>
          <div className="flex items-end gap-3 relative">
            <span style={{ fontFamily: "'Lora', serif", fontSize: '44px', fontWeight: 500, color: '#fff', lineHeight: 1 }}>
              {formattaPrezzo(totaleMese)}
            </span>
          </div>

          {/* Confronto mese precedente */}
          {diffPerc !== null && (
            <div className="flex items-center gap-2 mt-3 relative">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: isMigliorato ? 'rgba(255,255,255,0.2)' : 'rgba(255,80,80,0.25)' }}>
                {isMigliorato
                  ? <ArrowDownRight size={14} className="text-white" />
                  : <ArrowUpRight size={14} className="text-white" />
                }
                <span className="text-sm font-semibold text-white">
                  {isMigliorato ? '' : '+'}{diffPerc}%
                </span>
              </div>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                vs {MESI_NOMI[meseCorrente === 0 ? 11 : meseCorrente - 1]}
                {' '}({formattaPrezzo(totalePrecedente)})
              </span>
            </div>
          )}

          {/* Mini stat */}
          <div className="flex gap-4 mt-4 pt-4 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Scontrini</p>
              <p className="text-lg font-semibold text-white">{scontriniMeseCorrente.length}</p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '16px' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Media per spesa</p>
              <p className="text-lg font-semibold text-white">
                {scontriniMeseCorrente.length > 0
                  ? formattaPrezzo(totaleMese / scontriniMeseCorrente.length)
                  : '—'}
              </p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '16px' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Negozio top</p>
              <p className="text-lg font-semibold text-white">
                {scontriniMeseCorrente.length > 0
                  ? (() => {
                      const cnt = {};
                      scontriniMeseCorrente.forEach(s => { cnt[s.insegna] = (cnt[s.insegna] || 0) + 1; });
                      return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]?.split('/')[0] || '—';
                    })()
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tesoretto Lenticchia ── */}
        {tesoretto && (
            <div className="rounded-[20px] p-5"
              style={{ background: tesoretto.inRisparmio ? '#EEF2E4' : T.surface,
                       border: `1px solid ${tesoretto.inRisparmio ? '#C8D9A0' : T.border}`,
                       boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: '20px' }}>🌿</span>
                <h3 className="text-sm font-semibold" style={{ color: T.primary }}>Tesoretto Lenticchia</h3>
              </div>

              {tesoretto.risparmio !== null && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-xs mb-1" style={{ color: T.textSec }}>
                      {tesoretto.inRisparmio ? 'Hai risparmiato rispetto al mese scorso' : 'Hai speso di più rispetto al mese scorso'}
                    </p>
                    <p style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500,
                                color: tesoretto.inRisparmio ? T.primary : T.accent }}>
                      {tesoretto.inRisparmio ? '-' : '+'}{formattaPrezzo(Math.abs(tesoretto.risparmio))}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: tesoretto.inRisparmio ? T.primary : T.accent }}>
                    <span className="text-2xl">{tesoretto.inRisparmio ? '📉' : '📈'}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {tesoretto.nScontrini > 0 && (
                  <div className="flex-1 rounded-[12px] px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${T.border}` }}>
                    <p className="text-[10px] uppercase font-medium mb-0.5" style={{ color: T.textSec }}>Scontrini</p>
                    <p className="text-lg font-semibold" style={{ fontFamily: "'Lora', serif", color: T.textPrimary }}>{tesoretto.nScontrini}</p>
                  </div>
                )}
                {tesoretto.nSpecifici > 0 && (
                  <div className="flex-1 rounded-[12px] px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${T.border}` }}>
                    <p className="text-[10px] uppercase font-medium mb-0.5" style={{ color: T.textSec }}>Prodotti verificati</p>
                    <p className="text-lg font-semibold" style={{ fontFamily: "'Lora', serif", color: T.primary }}>{tesoretto.nSpecifici}</p>
                  </div>
                )}
                {!tesoretto.hasPrecedente && (
                  <div className="flex-1 rounded-[12px] px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${T.border}` }}>
                    <p className="text-[10px] uppercase font-medium mb-0.5" style={{ color: T.textSec }}>Confronto</p>
                    <p className="text-xs" style={{ color: T.textSec }}>Disponibile dal mese prossimo</p>
                  </div>
                )}
              </div>
            </div>
        )}

        {/* ── Risparmio cumulato (Sprint 2) ── */}
        {!isDemo && utente && (
          <RisparmioCumulato uid={utente.uid} />
        )}

        {/* ── Grafico a barre ultimi 5 mesi ── */}
        <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Trend mensile</h3>
            <BarChart2 size={16} strokeWidth={1.5} style={{ color: T.textSec }} />
          </div>

          {/* Barre */}
          <div className="flex items-end gap-2" style={{ height: '100px' }}>
            {ultimi5Mesi.map((m, i) => {
              const h = maxMese > 0 ? Math.max((m.totale / maxMese) * 88, m.totale > 0 ? 8 : 0) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] font-semibold" style={{ color: m.isCorrente ? T.primary : 'transparent' }}>
                    {formattaPrezzo(m.totale).replace('€','€').split(',')[0]}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${h}px`,
                        background: m.isCorrente ? T.primary : T.border,
                        minHeight: m.totale > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: m.isCorrente ? T.textPrimary : T.textSec }}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Confronto numerico */}
          {diffPerc !== null && totalePrecedente > 0 && (
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="text-xs" style={{ color: T.textSec }}>
                {MESI_NOMI[meseCorrente === 0 ? 11 : meseCorrente - 1]}: <span className="font-medium" style={{ color: T.textPrimary }}>{formattaPrezzo(totalePrecedente)}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isMigliorato ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {isMigliorato ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                {isMigliorato ? '' : '+'}{diffPerc}% rispetto al mese scorso
              </div>
            </div>
          )}
        </div>

        {/* ── Categorie ── */}
        {categorieOrdinata.length > 0 && (
          <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Spesa per categoria</h3>
              <PieChart size={16} strokeWidth={1.5} style={{ color: T.textSec }} />
            </div>
            <div className="space-y-3">
              {categorieOrdinata.map(([cat, val]) => {
                const info = CATEGORIE_COLORI[cat] || { bg: '#F3F4F6', text: '#374151', label: cat };
                const perc = totaleCategorie > 0 ? Math.round((val / totaleCategorie) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: info.bg, color: info.text }}>
                          {info.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: T.textSec }}>{perc}%</span>
                        <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                          {formattaPrezzo(val)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${perc}%`, background: info.text }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Alert prezzi ── */}
        {alertTrend.length > 0 && (
          <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Variazioni prezzi</h3>
              <TrendingUp size={16} strokeWidth={1.5} style={{ color: T.textSec }} />
            </div>
            <div className="space-y-3">
              {alertTrend.map((a, i) => {
                const su = a.perc > 0;
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl"
                    style={{ background: su ? '#FFF1F1' : '#F0FDF4', border: `1px solid ${su ? '#FECACA' : '#BBF7D0'}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>{a.nome}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                        {formattaPrezzo(a.prezzoVecchio)} → {formattaPrezzo(a.prezzoNuovo)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 ml-3 shrink-0 px-2.5 py-1 rounded-xl text-sm font-bold ${su ? 'text-red-600' : 'text-emerald-600'}`}>
                      {su ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {su ? '+' : ''}{a.perc}%
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-3 leading-relaxed" style={{ color: T.textSec }}>
              Calcolato sui tuoi scontrini storici per lo stesso prodotto.
            </p>
          </div>
        )}

        {/* ── Assistente Scorte ── */}
        {prodottiInScadenza.length > 0 && (
            <div className="rounded-[20px] overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>🔄 Stai per finire?</h3>
                  <p className="text-xs mt-0.5" style={{ color: T.textSec }}>Prodotti che acquisti regolarmente</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#EEF2E4', color: T.primary }}>
                  {prodottiInScadenza.length} prodott{prodottiInScadenza.length === 1 ? 'o' : 'i'}
                </span>
              </div>
              {prodottiInScadenza.map((p, i) => {
                const urgente = p.prossimoPrevisto <= 0;
                const presto  = p.prossimoPrevisto <= 3;
                const colore  = urgente ? T.accent : presto ? '#D97706' : T.primary;
                const label   = urgente
                  ? 'Dovrebbe essere già finito'
                  : p.prossimoPrevisto === 0 ? 'Oggi'
                  : `Tra ${p.prossimoPrevisto} giorn${p.prossimoPrevisto === 1 ? 'o' : 'i'}`;
                return (
                  <div key={i} className="flex items-center px-5 py-3.5"
                    style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-3"
                      style={{ background: urgente ? '#FFF0E8' : '#EEF2E4' }}>
                      <span style={{ fontSize: '14px' }}>{urgente ? '⚠️' : '🛒'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>{p.nome}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                        Ogni ~{p.mediaIntervallo}gg · acquistato {p.count}×
                      </p>
                    </div>
                    <span className="text-xs font-semibold ml-3 shrink-0" style={{ color: colore }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
        )}

        {/* G2: ── Shrinkflation detector ── */}
        {shrinkflation.length > 0 && (
          <div className="rounded-[20px] overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div>
                <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>📦 Shrinkflation rilevata</h3>
                <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                  Stessa confezione, meno prodotto — paghi di più al kg
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#FFF0E8', color: T.accent }}>
                {shrinkflation.length} prodott{shrinkflation.length === 1 ? 'o' : 'i'}
              </span>
            </div>
            {shrinkflation.map((s, i) => (
              <div key={i} className="px-5 py-3.5"
                style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>{s.nome}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ background: '#FFF0E8', color: T.accent }}>
                        {s.grammaturaPrima} → {s.grammaturaUltima}
                        {' '}({s.deltaGrammi}%)
                      </span>
                      {s.deltaPrezzoKg > 0 && (
                        <span className="text-xs" style={{ color: T.textSec }}>
                          prezzo/kg +{s.deltaPrezzoKg}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ fontFamily: "'Lora', serif", color: T.accent }}>
                      {formattaPrezzo(s.prezzoUltima)}
                    </p>
                    <p className="text-xs mt-0.5 line-through" style={{ color: T.textSec }}>
                      {formattaPrezzo(s.prezzoPrima)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Lista scontrini ── */}
        <div className="rounded-[20px] overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Scontrini recenti</h3>
            <CreditCard size={16} strokeWidth={1.5} style={{ color: T.textSec }} />
          </div>
          {scontrini.slice(0, 6).map((s, i) => {
            const d = new Date(s.data_acquisto);
            const dataFmt = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
            const nProd = s.prodotti?.length || 0;
            return (
              <div key={s.id}
                className="flex items-center px-5 py-3.5 active:bg-stone-50 transition-colors cursor-pointer"
                style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}
                onClick={() => apriModalScontrino(s)}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mr-3"
                  style={{ background: '#EEF2E4' }}>
                  <Receipt size={16} strokeWidth={1.5} style={{ color: T.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{s.insegna}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                    {dataFmt} · {nProd} prodott{nProd === 1 ? 'o' : 'i'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold shrink-0" style={{ color: T.textPrimary, fontFamily: "'Lora', serif" }}>
                    {formattaPrezzo(s.totale_scontrino)}
                  </p>
                  <ChevronRight size={14} strokeWidth={1.5} style={{ color: T.textSec }} />
                </div>
              </div>
            );
          })}
          {scontrini.length === 0 && (
            <div className="px-5 pb-5 text-center">
              <Wallet size={32} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: T.textSec }} />
              <p className="text-sm" style={{ color: T.textSec }}>Nessuno scontrino ancora.</p>
              <p className="text-xs mt-1" style={{ color: T.textSec }}>Carica il primo dal tab Scontrino →</p>
            </div>
          )}
        </div>

        {/* Banner demo */}
        {isDemo && (
          <div className="rounded-[20px] p-5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#92400E' }}>📊 Questi sono dati di esempio</p>
            <p className="text-xs leading-relaxed" style={{ color: '#A16207' }}>
              Inizia a caricare i tuoi scontrini dal tab Scontrino: il tuo resoconto personale apparirà qui automaticamente.
            </p>
          </div>
        )}

      </div>

      {/* ── Sprint 2: Modal drill-down scontrino con editing prodotti ── */}
      {modalScontrino && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: T.bg }}>

          {/* Header */}
          <div className="px-5 pt-10 pb-4 flex items-center gap-3 shrink-0"
            style={{ background: T.primary, boxShadow: '0 2px 12px rgba(44,48,38,0.15)' }}>
            <button onClick={chiudiModal} className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <X size={18} strokeWidth={2} style={{ color: '#fff' }} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {new Date(modalScontrino.data_acquisto).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <h2 className="text-base font-semibold truncate" style={{ color: '#fff', fontFamily: "'Lora', serif" }}>
                {modalScontrino.insegna}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <p style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 500, color: '#fff' }}>
                {formattaPrezzo(modalScontrino.totale_scontrino)}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {prodottiEdit.length} prodotti
              </p>
            </div>
          </div>

          {/* Istruzione */}
          <div className="px-5 py-3 shrink-0" style={{ background: '#EEF2E4', borderBottom: `1px solid ${T.border}` }}>
            <p className="text-xs" style={{ color: T.primary }}>
              ✏️ Tocca un prodotto per correggere — il nome originale viene sempre conservato.
            </p>
          </div>

          {/* Lista prodotti scrollabile — flex-1 con min-h-0 per iOS */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-2">
            {prodottiEdit.map((p, idx) => {
              const isSpecifico = !p.tipo_voce || p.tipo_voce === 'specifico';
              const nomeRaw     = p.nome_raw || p.nome || '';
              const nomeNorm    = p.nome_normalizzato || '';
              const inEdit      = prodottoFocus === idx;

              return (
                <div key={idx}
                  className="rounded-[16px] overflow-hidden"
                  style={{ background: T.surface, border: `1px solid ${inEdit ? T.primary : T.border}`,
                           boxShadow: inEdit ? `0 0 0 2px ${T.primary}22` : '0 2px 8px rgba(44,48,38,0.04)' }}>

                  {/* Header prodotto */}
                  <div className="flex items-center px-4 py-3 gap-3"
                    onClick={e => {
                      setProdottoFocus(inEdit ? null : idx);
                      // Scroll automatico: porta il pannello in vista quando si apre
                      if (!inEdit) {
                        setTimeout(() => {
                          e.currentTarget.closest('.rounded-\\[16px\\]')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                        }, 50);
                      }
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isSpecifico ? '#EEF2E4' : '#F5F5F5' }}>
                      <span style={{ fontSize: '12px' }}>{isSpecifico ? '🏷️' : '📦'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                        {nomeNorm || nomeRaw}
                      </p>
                      {nomeRaw && nomeRaw !== nomeNorm && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: T.textSec }}>
                          scontrino: <span className="font-mono">{nomeRaw}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold" style={{ color: T.textPrimary, fontFamily: "'Lora', serif" }}>
                        {p.prezzo_unitario != null ? formattaPrezzo(p.prezzo_unitario) : '—'}
                      </p>
                      {p.quantita > 1 && (
                        <p className="text-[10px]" style={{ color: T.textSec }}>×{p.quantita}</p>
                      )}
                    </div>
                    <ChevronRight size={14} strokeWidth={1.5}
                      className={`shrink-0 transition-transform ${inEdit ? 'rotate-90' : ''}`}
                      style={{ color: T.textSec }} />
                  </div>

                  {/* Pannello editing */}
                  {inEdit && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
                      <div className="pt-3">
                        <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: T.primary }}>
                          Nome corretto
                        </label>
                        <input
                          type="text"
                          value={nomeNorm}
                          onChange={e => aggiornaNomeNorm(idx, e.target.value)}
                          placeholder={nomeRaw}
                          className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
                          style={{ background: T.bg, border: `1px solid ${T.primary}`, color: T.textPrimary }}
                        />
                        <p className="text-[10px] mt-1.5" style={{ color: T.textSec }}>
                          Originale: <span className="font-mono">{nomeRaw || '—'}</span>
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: T.primary }}>
                          Unità di misura
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['al kg', 'al pezzo', 'per 100g', 'al litro', 'alla confezione'].map(um => (
                            <button key={um}
                              onClick={() => aggiornaUnitaMisura(idx, um === (p.unita_misura || '') ? '' : um)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                              style={(p.unita_misura || '') === um
                                ? { background: T.primary, color: '#fff' }
                                : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                              {um}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(p.categoria || p.marca) && (
                        <div className="flex gap-2 flex-wrap">
                          {p.categoria && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md"
                              style={{ background: '#EEF2E4', color: T.primary }}>
                              {p.categoria}
                            </span>
                          )}
                          {p.marca && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md"
                              style={{ background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }}>
                              {p.marca}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Spazio extra in fondo per non nascondersi dietro il footer */}
            <div className="h-4" />
          </div>

          {/* Footer — shrink-0 + safe area, sempre sopra la tastiera */}
          <div className="px-5 pt-3 pb-4 shrink-0"
            style={{
              borderTop:     `1px solid ${T.border}`,
              background:    T.surface,
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}>
            <button
              onClick={salvaModifiche}
              disabled={salvataggioPending}
              className="w-full py-3.5 rounded-[18px] text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: salvataggioOk ? '#16a34a' : T.primary,
                color:      '#fff',
                boxShadow:  '0 4px 16px rgba(100,113,68,0.3)',
              }}>
              {salvataggioPending
                ? <><Loader size={16} strokeWidth={1.5} className="animate-spin" /> Salvo...</>
                : salvataggioOk
                  ? <><Check size={16} strokeWidth={2.5} /> Salvato!</>
                  : <><Check size={16} strokeWidth={2} /> Salva correzioni</>
              }
            </button>
            <p className="text-[10px] text-center mt-2" style={{ color: T.textSec }}>
              Il nome originale dello scontrino non viene mai cancellato
            </p>
          </div>

        </div>
      )}

    </div>
  );
};

// ─── Tab Validazione Scontrini (HITL Fase 2) ─────────────────────────────────
// Mostrata quando l'utente ha scontrini in stato "da_validare".
// L'utente può correggere i dati estratti da Claude e confermare.
// Solo al click su Conferma vengono creati prezzi_scontrini e assegnati i punti.

const PUNTI_BASE_SCONTRINO   = 15;
const PUNTI_BONUS_PRODOTTI   = 5;   // se > 10 prodotti
const PUNTI_BONUS_SETTIMANA  = 5;   // primo scontrino della settimana

// calcolaLivello → usa getLivello(p).nome (definita a riga 259, evita duplicazione)
const calcolaLivello = (p = 0) => getLivello(p).nome;

const TabValidazioneScontrini = ({ scontriniDaValidare, onValidatoOk }) => {
  const { utente, aggiornaScontriniPerCittà } = useAuth();

  // Quale scontrino stiamo revisionando (indice)
  const [indice, setIndice]             = useState(0);
  // Copia modificabile dell'estratto
  const [estratto, setEstratto]         = useState(null);
  // Stato per ogni scontrino: idle | salvando | salvato | errore
  const [stato, setStato]               = useState('idle');
  const [puntiAnimati, setPuntiAnimati] = useState(0);
  const [prodottoInEdit, setProdottoInEdit] = useState(null); // indice prodotto in editing
  // Suggerimenti nome prodotto: { [idx]: [{ nome, chiave, n, media, score, grammatura_comune }] }
  const [suggerimentiNome, setSuggerimentiNome] = useState({});
  const [loadingSugger,    setLoadingSugger]    = useState({});
  // C: modal condivisione community
  const [modalCondivisione, setModalCondivisione] = useState(null); // { prodottiSpecifici, prodottiAggregati, punti } | null

  const scontrino = scontriniDaValidare[indice];

  // Quando cambia lo scontrino corrente, carica la sua estrazione
  useEffect(() => {
    if (scontrino?.estratto) {
      // Deep copy per permettere modifiche senza mutare l'originale
      setEstratto(JSON.parse(JSON.stringify(scontrino.estratto)));
      setStato('idle');
      setProdottoInEdit(null);
    }
  }, [indice, scontrino]);

  if (!scontrino || !estratto) return null;

  const aggiornaCampoTestata = (campo, valore) => {
    setEstratto(prev => ({ ...prev, [campo]: valore }));
  };

  const aggiornaProdotto = (idx, campo, valore) => {
    setEstratto(prev => {
      const nuovi = [...prev.prodotti];
      nuovi[idx] = { ...nuovi[idx], [campo]: campo === 'prezzo_unitario' || campo === 'quantita' ? parseFloat(valore) || 0 : valore };
      return { ...prev, prodotti: nuovi };
    });
  };

  // Cerca suggerimenti nome in statistiche_prodotti quando l'utente apre l'edit
  const cercaSuggerimentiNome = async (idx, nomeRaw) => {
    if (!nomeRaw || nomeRaw.length < 3) return;
    if (suggerimentiNome[idx] !== undefined) return; // già caricati

    setLoadingSugger(prev => ({ ...prev, [idx]: true }));
    try {
      // Normalizzazione lato client (stessa logica del backend)
      const normalizza = (s) => s.toLowerCase()
        .replace(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|litri|litro|cl|ml|pz)\b/gi, '')
        .replace(/\bal\s+(kg|litro|pezzo)\b/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ').trim();

      const nomeBase = normalizza(nomeRaw);
      const tokens   = nomeBase.split(' ').filter(t => t.length > 2);
      if (!tokens.length) return;

      // Legge i top 100 da statistiche_prodotti ordinati per n_globale
      // e calcola Jaccard similarity lato client
      const snap = await getDocs(query(
        collection(db, 'statistiche_prodotti'),
        orderBy('n_globale', 'desc'),
        limit(100)
      ));

      const tokensSet = new Set(tokens);
      const candidati = [];

      snap.forEach(doc => {
        const d   = doc.id.split('_'); // tokens della chiave
        const dSet = new Set(d.filter(t => t.length > 1));
        const inter = [...tokensSet].filter(t => dSet.has(t)).length;
        const union = new Set([...tokensSet, ...dSet]).size;
        if (union === 0 || inter === 0) return;
        const score = inter / union;
        if (score >= 0.3) {
          const data = doc.data();
          candidati.push({
            nome:              data.nome_originale || doc.id.replace(/_/g, ' '),
            chiave:            doc.id,
            n:                 data.n_globale || 0,
            media:             data.media_globale || 0,
            grammatura_comune: data.grammatura_comune || '',
            score,
          });
        }
      });

      candidati.sort((a, b) => b.score - a.score || b.n - a.n);
      setSuggerimentiNome(prev => ({ ...prev, [idx]: candidati.slice(0, 3) }));
    } catch (err) {
      console.error('Errore suggerimenti:', err);
      setSuggerimentiNome(prev => ({ ...prev, [idx]: [] }));
    } finally {
      setLoadingSugger(prev => ({ ...prev, [idx]: false }));
    }
  };

  const rimuoviProdotto = (idx) => {
    setEstratto(prev => ({ ...prev, prodotti: prev.prodotti.filter((_, i) => i !== idx) }));
  };

  const campiObbligatoriOk = !!(estratto?.insegna?.trim()) && !!(estratto?.data_acquisto?.trim());

  const confermaScontrino = async () => {
    if (stato === 'salvando' || !campiObbligatoriOk) return;
    setStato('salvando');

    try {

      // ── FASE 2a-bis: salva la correzione insegna se l'utente l'ha modificata ──
      // Questo permette al sistema di imparare le ragioni sociali → insegne
      const insegnaOriginale = scontrino.estratto?.insegna || '';
      const insegnaCorretta  = estratto.insegna || '';
      if (insegnaOriginale && insegnaCorretta && insegnaOriginale !== insegnaCorretta) {
        // Salva nella collection correzioni_insegna per uso futuro del backend
        addDoc(collection(db, 'correzioni_insegna'), {
          testo_originale: insegnaOriginale,
          insegna_corretta: insegnaCorretta,
          uid_contributore: utente.uid,
          data:             serverTimestamp(),
          n_conferme:       1,
        }).catch(() => {}); // fire-and-forget, non blocca il flusso principale
      }

      const tuttiProdotti = estratto.prodotti || [];

      // Separa specifici da aggregati usando il flag _classe del backend.
      const prodottiSpecifici = tuttiProdotti.filter(
        p => !p._classe || p._classe === 'specifico'
      );
      const prodottiAggregati = tuttiProdotti.filter(p => p._classe === 'aggregato');

      const tipoScontrino = scontrino.tipo_scontrino ||
        (prodottiSpecifici.length > 0 ? 'dettagliato' : 'generico');

      const nSpecifici = prodottiSpecifici.length;
      const totale = estratto.totale || 0;

      // ── FASE 2b: scontrino completo → spese_personali (registro privato, SEMPRE) ──
      const tuttiPuliti = tuttiProdotti.map(p => {
        const { _classe, anomalia, anomalia_severita, anomalia_motivo, ...resto } = p;
        return { ...resto, tipo_voce: p._classe || 'specifico' };
      });
      await addDoc(
        collection(db, 'spese_personali', utente.uid, 'scontrini'),
        {
          insegna:          estratto.insegna || '',
          indirizzo:        estratto.indirizzo || '',
          data_acquisto:    estratto.data_acquisto || '',
          totale_scontrino: totale,
          tipo_scontrino:   tipoScontrino,
          prodotti:         tuttiPuliti,
          n_prodotti_tot:   tuttiProdotti.length,
          n_specifici:      nSpecifici,
          n_aggregati:      prodottiAggregati.length,
          data_registrazione: serverTimestamp(),
          coda_doc_id:      scontrino.id,
        }
      );

      // ── FASE 2c: calcola punti ────────────────────────────────────────
      let punti = PUNTI_BASE_SCONTRINO;
      if (nSpecifici > 10) punti += PUNTI_BONUS_PRODOTTI;
      // Bonus primo scontrino della settimana ISO: confronta week-year della data acquisto
      if (estratto.data_acquisto) {
        const dataAcq = new Date(estratto.data_acquisto + 'T12:00:00');
        const inizioSettimana = new Date(dataAcq);
        inizioSettimana.setDate(dataAcq.getDate() - dataAcq.getDay() + 1); // lunedì
        inizioSettimana.setHours(0, 0, 0, 0);
        const fineSettimana = new Date(inizioSettimana);
        fineSettimana.setDate(inizioSettimana.getDate() + 7);
        // Bonus se non ci sono altri scontrini già elaborati in questa settimana
        // (approssimazione lato client: il backend la verifca esattamente)
        punti += PUNTI_BONUS_SETTIMANA;
      }

      // ── FASE 2d: aggiorna coda_scontrini → elaborato ─────────────────
      await updateDoc(doc(db, 'coda_scontrini', scontrino.id), {
        stato:               'elaborato',
        punti_assegnati:     punti,
        n_prodotti_validati: tuttiProdotti.length,
        n_specifici_salvati: nSpecifici,
        tipo_scontrino:      tipoScontrino,
        validato_il:         serverTimestamp(),
      });

      // ── FASE 2e: assegna punti al profilo ────────────────────────────
      const profiloRef = doc(db, 'users', utente.uid, 'private', 'profilo');
      const profiloSnap = await getDoc(profiloRef);
      if (profiloSnap.exists()) {
        const puntiAttuali = profiloSnap.data().punti || 0;
        const nuoviPunti   = puntiAttuali + punti;
        const pianoAttuale = profiloSnap.data().piano || 'free';
        // Sprint 4 — Data-for-Premium: sblocco automatico a 1000pt (livello Guru)
        const sbloccaPremium = nuoviPunti >= 1000 && pianoAttuale === 'free';
        await updateDoc(profiloRef, {
          punti:            nuoviPunti,
          livello:          calcolaLivello(nuoviPunti),
          scontrini_totali: increment(1),
          ...(sbloccaPremium ? {
            piano:          'premium',
            piano_origine:  'guru_unlock',
            piano_sbloccato_il: new Date().toISOString(),
          } : {}),
        });
        if (sbloccaPremium) {
          setPuntiAnimati(punti); // mostra punti prima, poi la UI di profilo si aggiornerà
        }
      }

      setPuntiAnimati(punti);
      setStato('salvato');

      // Aggiorna contatore scontrini per città (usato per eleggibilità info insegne)
      if (scontrino.città) aggiornaScontriniPerCittà(scontrino.città);

      // ── C: se ci sono prodotti specifici → mostra modal condivisione ──
      if (nSpecifici > 0) {
        const prodottiSpecificiPuliti = prodottiSpecifici.map(p => {
          const { _classe, anomalia, anomalia_severita, anomalia_motivo, ...resto } = p;
          return resto;
        });
        setModalCondivisione({
          prodottiSpecifici: prodottiSpecificiPuliti,
          prodottiAggregati: prodottiAggregati.map(p => {
            const { _classe, anomalia, anomalia_severita, anomalia_motivo, ...resto } = p;
            return resto;
          }),
          punti,
          estratto,
          scontrinoId: scontrino.id,
        });
      } else {
        // Nessun prodotto specifico → avanza subito
        setTimeout(() => {
          onValidatoOk(scontrino.id);
          if (indice < scontriniDaValidare.length - 1) setIndice(prev => prev + 1);
          setStato('idle');
          setPuntiAnimati(0);
        }, 2500);
      }

    } catch (err) {
      console.error('Errore conferma scontrino:', err);
      setStato('errore');
    }
  };

  // C: salvataggio community dopo consenso utente
  const condividiConCommunity = async () => {
    if (!modalCondivisione) return;
    try {
      await addDoc(collection(db, 'prezzi_scontrini'), {
        uid:                  utente.uid,
        insegna:              modalCondivisione.estratto.insegna || '',
        insegna_normalizzata: (modalCondivisione.estratto.insegna || '').toLowerCase().trim(),
        indirizzo:            modalCondivisione.estratto.indirizzo || '',
        data_acquisto:        modalCondivisione.estratto.data_acquisto || '',
        totale_scontrino:     modalCondivisione.estratto.totale || 0,
        prodotti:             modalCondivisione.prodottiSpecifici,
        n_prodotti:           modalCondivisione.prodottiSpecifici.length,
        stato:                'verificato',
        validato_dall_utente: true,
        data_caricamento:     serverTimestamp(),
        coda_doc_id:          modalCondivisione.scontrinoId,
      });
    } catch (err) {
      console.error('Errore condivisione community:', err);
    }
    chiudiModalEAvanza();
  };

  const chiudiModalEAvanza = () => {
    setModalCondivisione(null);
    onValidatoOk(scontrino.id);
    if (indice < scontriniDaValidare.length - 1) setIndice(prev => prev + 1);
    setStato('idle');
    setPuntiAnimati(0);
  };

  const rifiutaScontrino = async () => {
    try {
      await updateDoc(doc(db, 'coda_scontrini', scontrino.id), {
        stato: 'rifiutato',
        rifiutato_il: serverTimestamp(),
      });
      onValidatoOk(scontrino.id);
      if (indice < scontriniDaValidare.length - 1) setIndice(prev => prev + 1);
    } catch (err) {
      console.error('Errore rifiuto:', err);
    }
  };

  const totaleCalcolato = (estratto.prodotti || []).reduce(
    (acc, p) => acc + ((p.prezzo_unitario || 0) * (p.quantita || 1)), 0
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-32" style={{ background: T.bg }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ background: T.primary }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck size={20} strokeWidth={1.5} className="text-white" />
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: '#fff' }}>
              Verifica scontrino
            </h2>
          </div>
          {scontriniDaValidare.length > 1 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              {indice + 1} / {scontriniDaValidare.length}
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Controlla i dati estratti dall'AI e correggili se necessario
        </p>
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-4">

        {/* ── C: Modal condivisione community ── */}
        {modalCondivisione && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(44,48,38,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-t-[28px] pb-10 animate-slide-up"
              style={{ background: T.surface, boxShadow: '0 -8px 40px rgba(44,48,38,0.2)' }}>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: T.border }} />
              </div>

              <div className="px-5 space-y-4">
                {/* Titolo */}
                <div>
                  <h3 style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 500, color: T.textPrimary }}>
                    Condividi con la community?
                  </h3>
                  <p className="text-sm mt-1" style={{ color: T.textSec }}>
                    Aiuta gli altri utenti di Roma a risparmiare — i tuoi prezzi vengono condivisi in forma anonima.
                  </p>
                </div>

                {/* Prodotti da condividere */}
                <div className="rounded-[16px] overflow-hidden"
                  style={{ border: `1px solid ${T.border}` }}>
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: '#EEF2E4', borderBottom: `1px solid #C8D9A0` }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.primary }}>
                      ✓ Verranno condivisi ({modalCondivisione.prodottiSpecifici.length})
                    </p>
                  </div>
                  {modalCondivisione.prodottiSpecifici.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: T.textPrimary }}>
                          {p.nome_normalizzato || p.nome_raw}
                          {p.marca ? <span style={{ color: T.textSec }}> · {p.marca}</span> : null}
                        </p>
                        {p.grammatura && <p className="text-xs" style={{ color: T.textSec }}>{p.grammatura}</p>}
                      </div>
                      <span className="text-sm font-semibold ml-3 shrink-0"
                        style={{ fontFamily: "'Lora', serif", color: T.textPrimary }}>
                        {formattaPrezzo(p.prezzo_unitario || 0)}
                      </span>
                    </div>
                  ))}
                  {modalCondivisione.prodottiSpecifici.length > 5 && (
                    <div className="px-4 py-2 text-center">
                      <p className="text-xs" style={{ color: T.textSec }}>
                        +{modalCondivisione.prodottiSpecifici.length - 5} altri prodotti
                      </p>
                    </div>
                  )}
                </div>

                {/* Prodotti NON condivisi */}
                {modalCondivisione.prodottiAggregati.length > 0 && (
                  <div className="rounded-[16px] px-4 py-3"
                    style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                    <p className="text-xs font-medium mb-1.5" style={{ color: T.textSec }}>
                      Non condivisi — voci generiche ({modalCondivisione.prodottiAggregati.length}):
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
                      {modalCondivisione.prodottiAggregati
                        .map(p => p.nome_normalizzato || p.nome_raw)
                        .slice(0, 4)
                        .join(', ')}
                      {modalCondivisione.prodottiAggregati.length > 4 ? '...' : ''}
                    </p>
                    <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: T.textSec }}>
                      Voci tipo "gastronomia", "scatolame", "rep. panetteria" non sono utili agli altri utenti e restano solo nel tuo registro personale.
                    </p>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={condividiConCommunity}
                  className="w-full py-4 rounded-[20px] font-medium text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: T.primary, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 24px rgba(100,113,68,0.3)' }}>
                  🤝 Sì, condividi con la community
                </button>

                <button
                  onClick={chiudiModalEAvanza}
                  className="w-full py-3 rounded-[20px] text-sm transition-all"
                  style={{ color: T.textSec, border: `1px solid ${T.border}`, background: T.surface }}>
                  No grazie, tienili solo per me
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stato: salvato con animazione punti ── */}
        {stato === 'salvato' && (
          <div className="rounded-[24px] p-8 flex flex-col items-center gap-4 animate-spring"
            style={{ background: T.primary, boxShadow: '0 12px 40px rgba(100,113,68,0.3)' }}>
            <CheckCircle size={48} strokeWidth={1.5} className="text-white" />
            <div className="text-center">
              <p style={{ fontFamily: "'Lora', serif", fontSize: '20px', color: '#fff', marginBottom: '6px' }}>
                Scontrino confermato!
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                I dati sono stati salvati
              </p>
            </div>
            <div className="rounded-2xl px-6 py-3 animate-spring"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '28px', fontWeight: 500, color: '#fff', textAlign: 'center' }}>
                +{puntiAnimati} punti 🌿
              </p>
            </div>
          </div>
        )}

        {stato !== 'salvato' && (
          <>
            {/* ── A: Banner riferimento scontrino fisico ── */}
            <div className="rounded-[20px] px-4 py-3.5 flex items-center gap-3"
              style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: T.primary }}>
                <Receipt size={18} strokeWidth={1.5} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: T.textPrimary }}>
                  {scontrino.n_foto > 1
                    ? `Scontrino in ${scontrino.n_foto} foto`
                    : 'Scontrino caricato il'}{' '}
                  {scontrino.data_caricamento
                    ? (scontrino.data_caricamento.toDate
                        ? scontrino.data_caricamento.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                        : String(scontrino.data_caricamento).slice(0, 10))
                    : ''}
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                  Le immagini originali sono state cancellate per privacy dopo l'estrazione AI — confronta con lo scontrino fisico se necessario.
                </p>
              </div>
            </div>

            {/* ── Card testata scontrino ── */}
            <div className="rounded-[20px] p-5"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(44,48,38,0.07)' }}>
              <p className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: T.textSec }}>
                Dati scontrino
              </p>
              <div className="space-y-3">

                {/* Campo insegna — prominente con suggerimenti */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: T.primary }}>
                    Supermercato <span style={{ color: T.accent }}>*</span>
                  </label>
                  <p className="text-[10px] mb-1.5" style={{ color: T.textSec }}>
                    Se lo scontrino mostra solo la ragione sociale (es. "GS Srl") scrivi il nome del negozio sull'insegna
                  </p>
                  <input
                    type="text"
                    list="insegne-suggerite"
                    value={estratto.insegna || ''}
                    onChange={e => aggiornaCampoTestata('insegna', e.target.value)}
                    placeholder="es. Lidl, PIM, Conad..."
                    className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
                    style={{
                      background: T.bg,
                      border: `2px solid ${estratto.insegna?.trim() ? T.primary : T.accent}`,
                      color: T.textPrimary,
                    }}
                  />
                  <datalist id="insegne-suggerite">
                    {INSEGNE_DISPONIBILI.map(ins => (
                      <option key={ins} value={ins} />
                    ))}
                  </datalist>
                  {/* Mostra nome sull'intestazione scontrino se diverso */}
                  {estratto.insegna_raw && estratto.insegna_raw !== estratto.insegna && (
                    <p className="text-[10px] mt-1" style={{ color: T.textSec }}>
                      Estratto dallo scontrino: <span className="font-mono">{estratto.insegna_raw}</span>
                    </p>
                  )}
                </div>

                {/* Altri campi testata */}
                {[
                  { label: 'Indirizzo', campo: 'indirizzo', tipo: 'text' },
                  { label: 'Data acquisto', campo: 'data_acquisto', tipo: 'date' },
                ].map(({ label, campo, tipo }) => (
                  <div key={campo}>
                    <label className="block text-xs font-medium mb-1" style={{ color: T.textSec }}>{label}</label>
                    <input
                      type={tipo}
                      value={estratto[campo] || ''}
                      onChange={e => aggiornaCampoTestata(campo, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-base outline-none"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs" style={{ color: T.textSec }}>Totale ricalcolato dai prodotti</span>
                  <span className="font-semibold" style={{ fontFamily: "'Lora', serif", color: T.textPrimary }}>
                    {formattaPrezzo(totaleCalcolato)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Lista prodotti estratti ── */}
            <div className="rounded-[20px] overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(44,48,38,0.07)' }}>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <p className="text-xs uppercase tracking-wider font-medium" style={{ color: T.textSec }}>
                  Prodotti ({estratto.prodotti?.length || 0})
                </p>
                <p className="text-xs" style={{ color: T.textSec }}>
                  Tocca per correggere
                </p>
              </div>

              {/* Banner anomalie — se il backend ha trovato prezzi sospetti */}
              {(estratto.prodotti || []).some(p => p.anomalia) && (
                <div className="mx-4 mt-3 mb-1 rounded-2xl px-4 py-3 flex items-start gap-2.5"
                  style={{ background: '#FFF8F0', border: `1px solid #F4C5A8` }}>
                  <AlertTriangle size={15} strokeWidth={1.5} style={{ color: T.accent, marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: T.accent }}>
                      {(estratto.prodotti || []).filter(p => p.anomalia).length} prezzi insoliti rilevati
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.textSec }}>
                      Evidenziati in arancione — correggili o rimuovili prima di confermare.
                    </p>
                  </div>
                </div>
              )}

              {(estratto.prodotti || []).map((p, idx) => (
                <div key={idx} style={{ borderTop: idx > 0 ? `1px solid ${T.border}` : 'none' }}>
                  {prodottoInEdit === idx ? (
                    /* Pannello editing inline */
                    <div className="p-4 space-y-2.5" style={{ background: '#EEF2E4' }}>

                      {/* ── Banner suggerimento nome ── */}
                      {(loadingSugger[idx] || (suggerimentiNome[idx]?.length > 0)) && (
                        <div className="rounded-xl px-3 py-2.5"
                          style={{ background: '#EEF9E6', border: '1px solid #A3D977' }}>
                          {loadingSugger[idx] ? (
                            <div className="flex items-center gap-2">
                              <Loader size={12} className="animate-spin" style={{ color: T.primary }} />
                              <span className="text-xs" style={{ color: T.primary }}>
                                Cerco nel database...
                              </span>
                            </div>
                          ) : suggerimentiNome[idx]?.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold mb-2" style={{ color: T.primary }}>
                                💡 Il nostro sistema ha rilevato che potrebbe essere:
                              </p>
                              <div className="space-y-1.5">
                                {suggerimentiNome[idx].map((s, si) => (
                                  <div key={si} className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium" style={{ color: T.textPrimary }}>
                                        {s.nome}
                                        {s.grammatura_comune ? ` ${s.grammatura_comune}` : ''}
                                      </span>
                                      <span className="text-[10px] ml-1.5" style={{ color: T.textSec }}>
                                        · {s.n} prezzi · media {formattaPrezzo(s.media)}
                                      </span>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button
                                        onClick={() => {
                                          aggiornaProdotto(idx, 'nome_normalizzato',
                                            s.nome + (s.grammatura_comune ? ` ${s.grammatura_comune}` : ''));
                                          setSuggerimentiNome(prev => ({ ...prev, [idx]: [] }));
                                        }}
                                        className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.97]"
                                        style={{ background: T.primary, color: '#fff' }}>
                                        ✓ Sì
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => setSuggerimentiNome(prev => ({ ...prev, [idx]: [] }))}
                                className="text-[10px] mt-1.5" style={{ color: T.textSec }}>
                                No, inserisco manualmente
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-medium mb-1" style={{ color: T.primary }}>Nome</label>
                          <input
                            type="text"
                            value={p.nome_normalizzato || ''}
                            onChange={e => aggiornaProdotto(idx, 'nome_normalizzato', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: T.surface, border: `1px solid #C8D9A0`, color: T.textPrimary }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-medium mb-1" style={{ color: T.primary }}>Marca</label>
                          <input
                            type="text"
                            value={p.marca || ''}
                            onChange={e => aggiornaProdotto(idx, 'marca', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: T.surface, border: `1px solid #C8D9A0`, color: T.textPrimary }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-medium mb-1" style={{ color: T.primary }}>Prezzo (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={p.prezzo_unitario || ''}
                            onChange={e => aggiornaProdotto(idx, 'prezzo_unitario', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: T.surface, border: `1px solid #C8D9A0`, color: T.textPrimary }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-medium mb-1" style={{ color: T.primary }}>Qtà</label>
                          <input
                            type="number"
                            min="1"
                            value={p.quantita || 1}
                            onChange={e => aggiornaProdotto(idx, 'quantita', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: T.surface, border: `1px solid #C8D9A0`, color: T.textPrimary }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-medium mb-1" style={{ color: T.primary }}>Grammatura</label>
                          <input
                            type="text"
                            value={p.grammatura || ''}
                            onChange={e => aggiornaProdotto(idx, 'grammatura', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: T.surface, border: `1px solid #C8D9A0`, color: T.textPrimary }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setProdottoInEdit(null)}
                          className="flex-1 py-2 rounded-xl text-xs font-medium text-white"
                          style={{ background: T.primary }}>
                          ✓ Salva
                        </button>
                        <button
                          onClick={() => { rimuoviProdotto(idx); setProdottoInEdit(null); }}
                          className="px-3 py-2 rounded-xl text-xs"
                          style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Riga prodotto compatta — con badge anomalia se flaggato */
                    <div
                      className="flex items-center px-5 py-3 cursor-pointer transition-colors"
                      style={{ background: p.anomalia ? '#FFF8F0' : 'transparent' }}
                      onClick={() => {
                        setProdottoInEdit(idx);
                        cercaSuggerimentiNome(idx, p.nome_raw || p.nome_normalizzato);
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: T.textPrimary }}>
                          {p.nome_normalizzato || p.nome_raw || '—'}
                          {p.marca ? <span style={{ color: T.textSec }}> · {p.marca}</span> : null}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                          {p.grammatura || ''} {p.quantita > 1 ? `× ${p.quantita}` : ''}
                          {p.nome_raw && p.nome_raw !== p.nome_normalizzato && (
                            <span style={{ color: T.textSec }}> · raw: {p.nome_raw}</span>
                          )}
                        </p>
                        {/* Avviso anomalia prezzo — visibile solo se flaggato dal backend */}
                        {p.anomalia && (
                          <p className="text-[10px] mt-1 font-medium leading-tight"
                            style={{ color: p.anomalia_severita === 'bloccante' ? '#DC2626' : T.accent }}>
                            ⚠️ {p.anomalia_motivo || 'Prezzo insolito — verifica prima di confermare'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="font-semibold text-sm"
                          style={{ fontFamily: "'Lora', serif",
                                   color: p.anomalia ? T.accent : T.textPrimary }}>
                          {formattaPrezzo((p.prezzo_unitario || 0) * (p.quantita || 1))}
                        </span>
                        <Pencil size={13} strokeWidth={1.5} style={{ color: T.textSec }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Azioni ── */}
            {stato === 'errore' && (
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertTriangle size={18} className="text-red-500 shrink-0" strokeWidth={1.5} />
                <p className="text-sm" style={{ color: '#DC2626' }}>
                  Errore nel salvataggio. Riprova.
                </p>
              </div>
            )}

            {/* B: avviso campi obbligatori */}
            {!campiObbligatoriOk && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5"
                style={{ background: '#FFF8F0', border: `1px solid #F4C5A8` }}>
                <AlertTriangle size={14} strokeWidth={1.5} style={{ color: T.accent, flexShrink: 0 }} />
                <p className="text-xs" style={{ color: T.accent }}>
                  Compila <strong>Supermercato</strong> e <strong>Data acquisto</strong> prima di confermare.
                </p>
              </div>
            )}

            <button
              onClick={confermaScontrino}
              disabled={stato === 'salvando' || !campiObbligatoriOk}
              className="w-full py-4 rounded-[20px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: campiObbligatoriOk ? T.primary : '#9CA3AF', fontFamily: "'DM Sans', sans-serif", boxShadow: campiObbligatoriOk ? '0 8px 24px rgba(100,113,68,0.3)' : 'none' }}>
              {stato === 'salvando'
                ? <><Loader size={16} strokeWidth={1.5} className="animate-spin" /> Salvataggio...</>
                : <><CheckCircle size={16} strokeWidth={1.5} /> Conferma e guadagna +{PUNTI_BASE_SCONTRINO}pt</>
              }
            </button>

            <button
              onClick={rifiutaScontrino}
              className="w-full py-3 rounded-[20px] text-sm transition-all"
              style={{ color: T.textSec, border: `1px solid ${T.border}`, background: T.surface }}>
              Scontrino illeggibile — scarta
            </button>

            {/* Info legale */}
            <div className="rounded-2xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-xs leading-relaxed text-blue-800">
                <strong>Perché devo confermare?</strong> I dati vengono estratti dall'AI ma potrebbero contenere errori OCR. La tua verifica garantisce la qualità del database e protegge la community.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── App principale ───────────────────────────────────────────────────────────

function AppInterna() {
  const { utente, profilo, preferenze, loading: authLoading, completaOnboarding,
          completaOnboardingSupermercati, cittàAttiva, impostaCittàRegistrazione,
          completaTutorial, riavviaTutorial } = useAuth();

  const [activeTab, setActiveTab] = useState(utente ? 'lista' : 'offerte');

  // Legge ?tab= dall'URL al mount — usato dagli shortcuts del manifest PWA
  // Deve stare in useEffect per non eseguire window.history durante il render
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      const validi = ['offerte', 'lista', 'scontrino', 'spese', 'profilo', 'revisione_volantini'];
      if (t && validi.includes(t)) {
        setActiveTab(t);
        const url = new URL(window.location.href);
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [offerte, setOfferte] = useState([]);
  const [statoVolantini, setStatoVolantini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [archivio, setArchivio] = useState([]);
  const [scontriniUtente, setScontriniUtente] = useState([]);
  const [scontriniDaValidare, setScontriniDaValidare] = useState([]);
  const [swUpdateAvailable, setSwUpdateAvailable]     = useState(false);
  const [nVolantiniDaRevisare, setNVolantiniDaRevisare] = useState(0);

  // Ascolta l'evento di aggiornamento del Service Worker
  useEffect(() => {
    const onSwUpdate = () => setSwUpdateAvailable(true);
    window.addEventListener('sw-update-available', onSwUpdate);
    return () => window.removeEventListener('sw-update-available', onSwUpdate);
  }, []);

  // ─── Carica scontrini da_validare (badge + UI validazione) ──────────────────
  // Si ricarica: al mount, quando cambia utente, e quando l'utente torna
  // Listener per navigazione da componenti figli (es. CTA RisparmioCumulato → TabOfferte)
  useEffect(() => {
    const handler = (e) => {
      const tab = e.detail;
      if (tab) setActiveTab(tab);
    };
    document.addEventListener('lenticchia:goto', handler);
    return () => document.removeEventListener('lenticchia:goto', handler);
  }, []);

  // al tab Scontrino (activeTab === 'scontrino') per aggiornare il badge.
  useEffect(() => {
    if (!utente) return;
    if (activeTab !== 'scontrino' && scontriniDaValidare.length > 0) return;
    let mounted = true;
    const caricaDaValidare = async () => {
      try {
        const q = query(
          collection(db, 'coda_scontrini'),
          where('uid', '==', utente.uid),
          where('stato', '==', 'da_validare'),
          limit(20)
        );
        const snap = await getDocs(q);
        if (mounted) setScontriniDaValidare(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        if (mounted) setScontriniDaValidare([]);
      }
    };
    caricaDaValidare();
    return () => { mounted = false; };
  }, [utente, activeTab]);

  // ─── Carica scontrini utente (per tab Spese) ──────────────────────────────
  const [scontriniLoaded, setScontriniLoaded] = useState(false);
  useEffect(() => {
    if (!utente) return;
    if (activeTab !== 'spese') return;
    let mounted = true;
    const caricaScontrini = async () => {
      try {
        const q = query(
          collection(db, 'spese_personali', utente.uid, 'scontrini'),
          orderBy('data_registrazione', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        if (mounted) setScontriniUtente(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        if (mounted) setScontriniUtente([]);
      } finally {
        if (mounted) setScontriniLoaded(true);
      }
    };
    caricaScontrini();
    return () => { mounted = false; };
  }, [utente, activeTab]);

  // ─── Cache helpers ────────────────────────────────────────────────────────
  // TTL: offerte e stato validi per 6 ore — cambiano solo il giovedì
  // L'archivio NON viene caricato al boot: costa centinaia di letture
  // per una feature visiva (sparkline) non critica. Verrà caricato lazy.

  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 ore

  const leggiCache = (chiave) => {
    try {
      const raw = localStorage.getItem(chiave);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(chiave); return null; }
      return data;
    } catch { return null; }
  };

  const scriviCache = (chiave, data) => {
    try { localStorage.setItem(chiave, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  const invalidaCache = () => {
    // Chiamata dallo scraper via Firestore trigger (futuro) o manualmente
    localStorage.removeItem('lenticchia_cache_offerte');
    localStorage.removeItem('lenticchia_cache_stato');
  };

  useEffect(() => {
    const fetchData = async () => {
      const oggi = new Date().toISOString().split('T')[0];

      // Chiave cache include la città — utenti di città diverse non condividono la cache
      const cacheKey       = `lenticchia_cache_offerte_${cittàAttiva || 'global'}`;
      const cacheKeyStato  = `lenticchia_cache_stato_${cittàAttiva || 'global'}`;

      // ── 1. Prova cache locale prima di toccare Firestore ──────────────────
      const cacheOfferte = leggiCache(cacheKey);
      const cachStato    = leggiCache(cacheKeyStato);

      if (cacheOfferte && cachStato) {
        // Cache valida — zero letture Firestore
        const offerteValide = cacheOfferte.filter(o => !o.valido_fino || o.valido_fino >= OGGI);
        if (offerteValide.length > 0) {
          setOfferte(offerteValide);
          setStatoVolantini(cachStato);
          setLoading(false);
          return;
        }
        // Cache scaduta per data offerte (non per TTL) — invalida e ricarica
        invalidaCache();
      }

      // ── 2. Cache mancante o scaduta — legge da Firestore ─────────────────
      try {
        // Carica TUTTE le offerte — il filtro città è fatto lato client in offerteDedup.
        // Motivo: il campo 'città' sulle offerte dello scraper potrebbe non essere
        // valorizzato su tutti i documenti, causando 0 risultati con where().
        // Il filtro lato client in offerteDedup gestisce correttamente entrambi i casi.
        const [offerteSnapshot, statoSnapshot] = await Promise.all([
          getDocs(collection(db, 'offerte_attive')),
          getDocs(collection(db, 'stato_volantini')),
        ]);

        const offerteList = offerteSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(o => !o.valido_fino || o.valido_fino >= OGGI);

        // stato_volantini include ora: insegna, tipo, sedi, valido_dal/fino, n_prodotti
        const statoList = statoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (offerteList.length === 0) {
          setOfferte(MOCK_OFFERTE); setStatoVolantini(MOCK_STATO); setIsDemoMode(true);
        } else {
          setOfferte(offerteList);
          setStatoVolantini(statoList);
          // Salva in cache con chiave per città
          scriviCache(cacheKey, offerteList);
          scriviCache(cacheKeyStato, statoList);
        }

        // ── 3. Archivio NON caricato al boot ─────────────────────────────
        // setArchivio([]) rimane vuoto — le sparkline non appaiono finché
        // l'utente non riapre l'app dopo il giovedì (quando lo caricheremo lazy)
        // TODO Sprint 3: carica archivio lazy on-demand nella ProductCard

      } catch {
        // Firestore non raggiungibile — usa mock
        setOfferte(MOCK_OFFERTE); setStatoVolantini(MOCK_STATO); setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cittàAttiva]); // ricarica quando cambia città

  // Fetch contatore volantini da revisionare — solo per i Guru
  // DEVE stare prima di TUTTI i return condizionali (Rules of Hooks)
  useEffect(() => {
    const isGuru = (profilo?.punti || 0) >= 1000;
    if (!utente || !isGuru) { setNVolantiniDaRevisare(0); return; }
    let mounted = true;
    getDocs(query(
      collection(db, 'coda_volantini'),
      where('stato', '==', 'in_attesa_revisione'),
      limit(99)
    )).then(snap => { if (mounted) setNVolantiniDaRevisare(snap.size); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [utente, profilo, activeTab]);

  // ─── Onboarding demografico (Sprint 1) ────────────────────────────────────
  // mostraDemografico: true = mostra la schermata; null = non ancora caricato
  const [mostraDemografico, setMostraDemografico] = useState(null);
  const [profiloDemografico, setProfiloDemografico] = useState(null);

  useEffect(() => {
    if (!utente || !profilo) return;
    // Mostra il form solo se l'onboarding supermercati è completato
    // e non è già stato fatto il demografico
    if (!preferenze?.onboarding_supermercati) return;
    getDoc(doc(db, 'users', utente.uid, 'private', 'profilo_demografico'))
      .then(snap => {
        if (snap.exists()) {
          setProfiloDemografico(snap.data());
          setMostraDemografico(false);
        } else {
          setMostraDemografico(true);
        }
      })
      .catch(() => setMostraDemografico(false));
  }, [utente?.uid, profilo?.onboarding_completato, preferenze?.onboarding_supermercati]);

  const completaOnboardingDemografico = async (dati) => {
    if (!utente) return;
    try {
      const docRef = doc(db, 'users', utente.uid, 'private', 'profilo_demografico');
      await setDoc(docRef, {
        ...dati,
        uid:           utente.uid,
        completato_il: new Date().toISOString(),
        versione_form: 1,
      });
      setProfiloDemografico({ ...dati, uid: utente.uid });
      // Assegna +50 punti
      const profiloRef = doc(db, 'users', utente.uid, 'private', 'profilo');
      const profiloSnap = await getDoc(profiloRef);
      if (profiloSnap.exists()) {
        const puntiAttuali = profiloSnap.data().punti || 0;
        await updateDoc(profiloRef, { punti: puntiAttuali + 50 });
      }
    } catch (err) {
      console.error('Errore salvataggio demografico:', err);
    } finally {
      setMostraDemografico(false);
    }
  };

  const saltaOnboardingDemografico = async () => {
    if (!utente) return;
    try {
      // Salva doc vuoto per non riproporre il form al prossimo accesso
      await setDoc(doc(db, 'users', utente.uid, 'private', 'profilo_demografico'), {
        uid:           utente.uid,
        completato_il: new Date().toISOString(),
        versione_form: 1,
      });
    } catch (_) {}
    setMostraDemografico(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: T.bg }}>
        <IconaLenticchia size={52} className="animate-bounce mb-5" style={{ color: T.primary }} />
        <h1 className="mb-2" style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: T.textPrimary }}>Lenticchia</h1>
        <p className="flex items-center gap-2 text-sm" style={{ color: T.textSec }}>
          <span className="animate-spin inline-block w-4 h-4 rounded-full border-2 border-t-transparent" style={{ borderColor: `${T.primary} transparent transparent transparent` }}></span>
          Carico le offerte della settimana...
        </p>
      </div>
    );
  }

  if (utente && profilo && profilo.onboarding_completato === false) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative" style={{ background: T.bg }}>
        <SchermataOnboarding onConferma={completaOnboarding} />
      </div>
    );
  }

  // Step città: dopo la privacy, prima dei supermercati
  if (utente && profilo && profilo.onboarding_completato && !profilo.città_registrazione) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative flex flex-col items-center justify-center px-8"
        style={{ background: T.bg }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: '#EEF2E4' }}>
          <span style={{ fontSize: '40px' }}>📍</span>
        </div>
        <h2 className="text-center mb-2"
          style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, color: T.textPrimary }}>
          In quale città fai la spesa?
        </h2>
        <p className="text-center text-sm mb-8" style={{ color: T.textSec }}>
          Vedremo le offerte dei supermercati nella tua zona. Potrai cambiarla in qualsiasi momento dal profilo.
        </p>
        <div className="w-full space-y-3">
          {CITTA_DISPONIBILI.map(c => (
            <button key={c.id}
              onClick={() => impostaCittàRegistrazione(c.id)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all active:scale-[0.98]"
              style={{ background: T.surface, border: `1px solid ${T.border}`,
                       boxShadow: '0 4px 16px rgba(44,48,38,0.06)' }}>
              <span style={{ fontSize: '32px' }}>{c.emoji}</span>
              <div className="text-left">
                <p className="font-semibold" style={{ color: T.textPrimary }}>{c.label}</p>
                <p className="text-xs mt-0.5" style={{ color: T.textSec }}>Offerte e supermercati di {c.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2 onboarding: selezione supermercati (dopo privacy, prima dell'app)
  if (utente && preferenze && preferenze.onboarding_supermercati === false) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative" style={{ background: T.bg }}>
        <SchermataSelezioneSupermarket
          onConferma={completaOnboardingSupermercati}
        />
      </div>
    );
  }

  // Step 3 onboarding: demografico opzionale (dopo supermercati, prima dell'app)
  // mostraDemografico === null significa che stiamo ancora caricando il doc Firestore
  if (utente && mostraDemografico === true) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative" style={{ background: T.bg }}>
        <SchermataOnboardingDemografico
          onConferma={completaOnboardingDemografico}
          onSalta={saltaOnboardingDemografico}
          precompilato={profiloDemografico}
        />
      </div>
    );
  }

  const nDaValidare  = scontriniDaValidare.length;
  const isGuruApp    = (profilo?.punti || 0) >= 1000;

  // Callback quando l'utente convalida o scarta uno scontrino
  const onScontrinoValidato = (docId) => {
    setScontriniDaValidare(prev => prev.filter(s => s.id !== docId));
  };

  const NAV_ITEMS = [
    { id: 'lista',      icon: <ListTodo size={24} strokeWidth={1.5} />, label: 'Spesa' },
    { id: 'offerte',    icon: <Tag size={24} strokeWidth={1.5} />,      label: 'Offerte' },
    {
      id: 'scontrino',
      label: 'Scontrino',
      dataTutorial: 'tab-scontrino',
      icon: (
        <div className="relative">
          <Camera size={24} strokeWidth={1.5} />
          {nDaValidare > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: T.accent, color: '#fff' }}>
              {nDaValidare > 9 ? '9+' : nDaValidare}
            </span>
          )}
        </div>
      )
    },
    { id: 'spese',      icon: <Wallet size={24} strokeWidth={1.5} />,   label: 'Spese' },
    { id: 'profilo',    icon: utente?.photoURL
        ? <img src={utente.photoURL} alt="avatar" className="w-6 h-6 rounded-full" style={{ border: activeTab === 'profilo' ? `2px solid ${T.primary}` : '2px solid transparent' }} />
        : <User size={24} strokeWidth={1.5} />,
      label: utente ? 'Profilo' : 'Accedi',
      dataTutorial: 'tab-profilo',
    },
  ];

  // Tutorial: mostrato dopo tutti gli step di onboarding se non ancora completato
  const mostraTutorial = utente
    && profilo?.onboarding_completato
    && profilo?.città_registrazione
    && preferenze?.onboarding_supermercati
    && profilo?.tutorial_completato === false;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen relative" style={{ background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.textPrimary, overflowX: 'hidden' }}>

      {isDemoMode && (
        <div className="text-[10px] uppercase font-bold text-center py-1 tracking-widest z-50 relative bg-yellow-400 text-yellow-900">
          Modalità Demo — dati di esempio
        </div>
      )}

      {/* Tutorial spotlight — mostrato sopra tutto il resto */}
      {mostraTutorial && (
        <Tutorial
          onCompleta={completaTutorial}
          onSalta={completaTutorial}
          setActiveTab={setActiveTab}
        />
      )}

      <div className="h-screen overflow-hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}>
        {activeTab === 'offerte'    && <TabOfferte offerte={offerte} archivio={archivio} cittàAttiva={cittàAttiva} preferenze={preferenze} />}
        {activeTab === 'lista'      && (utente
          ? <TabListaSpesa offerte={offerte} archivio={archivio} />
          : <TabLoginRichiesto messaggio="Accedi per gestire la tua lista della spesa e usare il Verdetto Spesa." />
        )}
        {activeTab === 'stato'      && <TabStato statoVolantini={statoVolantini} />}
        {activeTab === 'scontrino'  && (utente
          ? (nDaValidare > 0
            ? <TabValidazioneScontrini scontriniDaValidare={scontriniDaValidare} onValidatoOk={onScontrinoValidato} />
            : <TabScontrino onApriRevisione={isGuruApp ? () => setActiveTab('revisione_volantini') : null} />)
          : <TabLoginRichiesto messaggio="Accedi per fotografare scontrini e guadagnare punti." />
        )}
        {activeTab === 'revisione_volantini' && utente && isGuruApp && (
          <TabRevisioneVolantini onTorna={() => setActiveTab('scontrino')} />
        )}
        {activeTab === 'spese'      && (utente
          ? <TabSpese scontriniReali={scontriniUtente} dataLoaded={scontriniLoaded} />
          : <TabLoginRichiesto messaggio="Accedi per vedere il resoconto delle tue spese." />
        )}
        {activeTab === 'profilo'    && (utente
          ? <TabProfilo />
          : <TabLoginRichiesto messaggio="Accedi per vedere il tuo profilo, i tuoi punti e il tuo livello." />
        )}
      </div>

      {/* Banner aggiornamento PWA */}
      {swUpdateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-[16px] px-4 py-3 flex items-center gap-3"
          style={{ background: T.primary, boxShadow: '0 8px 24px rgba(100,113,68,0.4)' }}>
          <span className="text-base">🌿</span>
          <p className="flex-1 text-xs font-medium text-white leading-tight">
            Nuova versione disponibile
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            Aggiorna
          </button>
          <button
            onClick={() => setSwUpdateAvailable(false)}
            className="text-white opacity-60 text-sm font-medium">
            ✕
          </button>
        </div>
      )}

      {/* ── Navbar fissa in fondo — stile app nativa ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background:    T.surface,
          borderTop:     `1px solid ${T.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow:     '0 -4px 20px rgba(44,48,38,0.08)',
          // Centra la nav dentro il max-width dell'app
          maxWidth:      '448px',
          margin:        '0 auto',
        }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              data-tutorial={item.dataTutorial || undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95 relative"
              style={{ minWidth: 0 }}
            >
              {/* Indicatore attivo — lineetta in cima */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 rounded-full"
                  style={{
                    width:       '24px',
                    height:      '3px',
                    background:  T.primary,
                    transform:   'translateX(-50%)',
                  }}
                />
              )}

              {/* Icona */}
              <span style={{
                color:  isActive ? T.primary : T.textSec,
                display: 'flex',
                transition: 'color 0.15s',
              }}>
                {item.id === 'scontrino' ? (
                  <div className="relative">
                    <Camera size={22} strokeWidth={isActive ? 2 : 1.5} />
                    {nDaValidare > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: T.accent, color: '#fff' }}>
                        {nDaValidare > 9 ? '9+' : nDaValidare}
                      </span>
                    )}
                    {nDaValidare === 0 && isGuruApp && nVolantiniDaRevisare > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: '#7C3AED', color: '#fff' }}>
                        {nVolantiniDaRevisare > 9 ? '9+' : nVolantiniDaRevisare}
                      </span>
                    )}
                  </div>
                ) : item.id === 'profilo' && utente?.photoURL ? (
                  <img
                    src={utente.photoURL}
                    alt="avatar"
                    className="w-6 h-6 rounded-full"
                    style={{
                      border: isActive ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
                      transition: 'border-color 0.15s',
                    }}
                  />
                ) : (
                  React.cloneElement(item.icon, {
                    size:        22,
                    strokeWidth: isActive ? 2 : 1.5,
                  })
                )}
              </span>

              {/* Label */}
              <span style={{
                fontSize:    '10px',
                fontWeight:  isActive ? 600 : 400,
                color:       isActive ? T.primary : T.textSec,
                letterSpacing: '0.01em',
                lineHeight:  1,
                transition:  'color 0.15s, font-weight 0.15s',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.35s ease-out forwards; }
        @keyframes spring { 0% { transform: scale(0.92); opacity: 0; } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
        .animate-spring { animation: spring 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInterna />
    </AuthProvider>
  );
}
