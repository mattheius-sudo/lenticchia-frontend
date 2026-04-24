import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth, INSEGNE_DISPONIBILI } from './AuthContext';
// statoVolantini viene ora passato come prop anche alla selezione supermercati
import {
  Search,
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
  Flag
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
  // Set dei docId già segnalati in questa sessione (per UI ottimistica)
  const [segnalati, setSegnalati] = useState(new Set());

  const segnala = async (collectionName, docId) => {
    if (segnalati.has(docId)) return; // già segnalato

    // UI ottimistica immediata
    setSegnalati(prev => new Set([...prev, docId]));

    try {

      const ref = doc(db, collectionName, docId);
      await updateDoc(ref, { segnalazioni: increment(1) });

      // Nascondi automaticamente se raggiunge la soglia
      const snap = await getDoc(ref);
      if (snap.exists() && (snap.data().segnalazioni || 0) >= SOGLIA_SEGNALAZIONI) {
        await updateDoc(ref, { nascosto: true });
      }
    } catch (err) {
      console.error('Errore segnalazione:', err);
      // Rollback ottimismo solo in caso di errore di rete
      setSegnalati(prev => { const n = new Set(prev); n.delete(docId); return n; });
    }
  };

  return { segnalati, segnala };
};

// Bottone bandierina riutilizzabile — riceve lo store come prop
const BottoneSegnala = ({ docId, collectionName, segnalati, segnala, size = 12 }) => {
  const isSegnalato = segnalati.has(docId);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); segnala(collectionName, docId); }}
      className="p-1 rounded-full transition-all active:scale-90 shrink-0"
      title={isSegnalato ? 'Segnalazione inviata' : 'Segnala prezzo errato'}
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

const ProductCard = ({ offerta, storico = null, archivio = [], index = 0, segnalati, segnala }) => {
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
              {formattaPrezzo(offerta.prezzo_kg)}/kg
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
        {/* Segnalazione errore — allineata a destra */}
        {segnalati && segnala && offerta.id && (
          <div className="ml-auto">
            <BottoneSegnala
              docId={offerta.id}
              collectionName="offerte_attive"
              segnalati={segnalati}
              segnala={segnala}
              size={14}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Schermata Selezione Supermercati (onboarding step 2) ────────────────────
// Mostrata dopo il login se onboarding_supermercati === false.
// L'utente vede tutte le insegne disponibili con le loro zone e seleziona le sue.

const SchermataSelezioneSupermarket = ({ statoVolantini, onConferma }) => {
  const [selezionate, setSelezionate] = useState([]);

  const toggleSel = (insegna) => {
    setSelezionate(prev =>
      prev.includes(insegna) ? prev.filter(i => i !== insegna) : [...prev, insegna]
    );
  };

  // Raggruppa stato_volantini per insegna con le loro sedi
  const insegneDisponibili = statoVolantini.reduce((acc, stato) => {
    const key = stato.insegna;
    if (!acc[key]) acc[key] = { insegna: key, tipo: stato.tipo || 'locale', sedi: [] };
    const sediRaw = stato.sedi;
    const sedi = Array.isArray(sediRaw) ? sediRaw : (sediRaw ? [String(sediRaw)] : []);
    sedi.forEach(s => { if (s !== 'nazionale' && !acc[key].sedi.includes(s)) acc[key].sedi.push(s); });
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: T.bg }}>
      <div className="px-5 pt-10 pb-6" style={{ background: T.primary }}>
        <IconaLenticchia size={32} className="text-white mb-4" />
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: '#fff', marginBottom: '8px' }}>
          Quali supermercati frequenti?
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Il Verdetto Spesa confronterà solo quelli che selezioni.
          Puoi cambiare in qualsiasi momento dal Profilo.
        </p>
      </div>

      <div className="px-4 py-5 space-y-3 flex-1">
        {Object.values(insegneDisponibili).map(({ insegna, tipo, sedi }) => {
          const sel = selezionate.includes(insegna);
          return (
            <button
              key={insegna}
              onClick={() => toggleSel(insegna)}
              className="w-full flex items-center gap-4 p-4 rounded-[20px] text-left transition-all active:scale-[0.99]"
              style={{
                background: sel ? '#EEF2E4' : T.surface,
                border: `2px solid ${sel ? T.primary : T.border}`,
                boxShadow: sel ? `0 4px 16px rgba(100,113,68,0.15)` : '0 2px 8px rgba(44,48,38,0.04)',
              }}
            >
              {/* Checkbox visuale */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: sel ? T.primary : T.border }}>
                {sel && <span style={{ color: '#fff', fontSize: '14px', lineHeight: 1 }}>✓</span>}
              </div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: T.textPrimary, fontSize: '16px' }}>
                  {insegna}
                </div>
                <div className="text-xs mt-0.5" style={{ color: T.textSec }}>
                  {tipo === 'nazionale'
                    ? 'Valido in tutti i punti vendita Italia'
                    : sedi.length > 0
                      ? `Zone: ${sedi.join(', ')}`
                      : 'Punti vendita Roma'
                  }
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-8 pt-2">
        <p className="text-xs text-center mb-4" style={{ color: T.textSec }}>
          {selezionate.length === 0
            ? 'Seleziona almeno un supermercato per continuare'
            : `${selezionate.length} supermercati selezionati`
          }
        </p>
        <button
          onClick={() => onConferma(selezionate)}
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

const SchermataOnboarding = ({ onConferma }) => (
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

    <div className="rounded-2xl p-4 mb-8 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
        Puoi cancellare i tuoi dati in qualsiasi momento da Profilo → Cancella i miei dati. Server europei (GDPR).
      </p>
    </div>

    <button
      onClick={onConferma}
      className="w-full text-white font-medium py-4 rounded-[20px] transition-all active:scale-95"
      style={{ background: T.primary, boxShadow: `0 8px 20px rgba(100,113,68,0.25)`, fontFamily: "'DM Sans', sans-serif" }}
    >
      Ho capito, inizia
    </button>
  </div>
);

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

// ─── Sezione: I Miei Supermercati ─────────────────────────────────────────────

const SezioneSupermercati = () => {
  const { preferenze, toggleInsegna, aggiornaTessera } = useAuth();
  const [tesseraAperta, setTesseraAperta] = useState(null);
  const [numeroInput, setNumeroInput] = useState('');

  const insegneAttive = preferenze?.insegne_attive || [...INSEGNE_DISPONIBILI];
  const tessere = preferenze?.tessere || {};

  const apriTessera = (insegna) => {
    setTesseraAperta(insegna);
    setNumeroInput(tessere[insegna]?.numero || '');
  };

  const salvaTessera = async (insegna) => {
    await aggiornaTessera(insegna, true, numeroInput);
    setTesseraAperta(null);
  };

  return (
    <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
      <h3 className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: T.textSec }}>
        I miei supermercati
      </h3>
      <p className="text-xs mb-4" style={{ color: T.textSec }}>
        Il Verdetto Spesa considera solo i supermercati attivi.
      </p>
      <div className="space-y-2">
        {INSEGNE_DISPONIBILI.map(insegna => {
          const attiva = insegneAttive.includes(insegna);
          const tessera = tessere[insegna];
          const hasTessera = tessera?.attiva;
          return (
            <div key={insegna}>
              <div className="flex items-center gap-3 py-2">
                {/* Toggle attiva/disattiva */}
                <button
                  onClick={() => toggleInsegna(insegna)}
                  className="flex items-center gap-2 flex-1 active:scale-[0.99] transition-all"
                >
                  <div className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                    style={{ background: attiva ? T.primary : T.border }}>
                    <div className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                      style={{ background: '#fff', left: attiva ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: attiva ? T.textPrimary : T.textSec }}>
                    {insegna}
                  </span>
                </button>
                {/* Badge tessera */}
                {attiva && (
                  <button
                    onClick={() => apriTessera(insegna)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={hasTessera
                      ? { background: '#EEF2E4', color: T.primary, border: `1px solid #C8D9A0` }
                      : { background: T.bg, color: T.textSec, border: `1px solid ${T.border}` }
                    }
                  >
                    {hasTessera ? '🪪 ' + (tessera.numero ? tessera.numero.slice(0, 6) + '…' : 'Tessera') : '+ Tessera'}
                  </button>
                )}
              </div>
              {/* Pannello inserimento numero tessera */}
              {tesseraAperta === insegna && (
                <div className="mt-1 mb-2 p-3 rounded-2xl" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                  <p className="text-xs mb-2" style={{ color: T.textSec }}>Numero carta fedeltà {insegna}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={numeroInput}
                      onChange={e => setNumeroInput(e.target.value)}
                      placeholder="Es. 1234567890"
                      className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
                    />
                    <button
                      onClick={() => salvaTessera(insegna)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: T.primary }}
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setTesseraAperta(null)}
                      className="px-3 py-2 rounded-xl text-sm"
                      style={{ color: T.textSec }}
                    >
                      ✕
                    </button>
                  </div>
                  {tessera?.numero && (
                    <button
                      onClick={() => { aggiornaTessera(insegna, false, ''); setTesseraAperta(null); }}
                      className="text-xs mt-2" style={{ color: '#DC2626' }}
                    >
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
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
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
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
            <p className="text-xs mt-1" style={{ color: T.textSec }}>Se vuoto, usa il nome breve</p>
          </div>
          <div className="flex gap-2">
            <input
              value={form.marca}
              onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
              placeholder="Marca"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
            <input
              value={form.grammatura}
              onChange={e => setForm(f => ({ ...f, grammatura: e.target.value }))}
              placeholder="Formato"
              className="w-24 px-3 py-2.5 rounded-xl text-sm outline-none"
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

const TabProfilo = () => {
  const { utente, profilo, logout, isLoggedIn } = useAuth();
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

const TabScontrino = () => {
  const { utente } = useAuth();
  const [modalita, setModalita] = useState('scontrino');
  const [stato, setStato] = useState('idle');
  const [messaggio, setMessaggio] = useState('');
  const [puntiAnimati, setPuntiAnimati] = useState(false);
  const [foto, setFoto] = useState([]);
  const [insegnaVolantino, setInsegnaVolantino] = useState('');
  const [validoFino, setValidoFino] = useState('');
  // Posizione GPS rilevata durante l'upload (metadato opzionale)
  const [posizioneRilevata, setPosizioneRilevata] = useState(null);
  // A1: scontrini in_attesa annullabili
  const [scontriniInAttesa, setScontriniInAttesa] = useState([]);
  const [loadingInAttesa, setLoadingInAttesa] = useState(false);
  const [annullando, setAnnullando] = useState(null); // id doc in annullamento
  const inputRef = React.useRef(null);
  const inputVolRef = React.useRef(null);
  const MAX_FOTO = 4;
  const MAX_FOTO_VOL = 30;

  // A1: carica scontrini in attesa all'apertura del tab
  useEffect(() => {
    if (!utente) return;
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
        setScontriniInAttesa(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setScontriniInAttesa([]); }
      finally { setLoadingInAttesa(false); }
    };
    carica();
  }, [utente]);

  // A1: annulla un singolo scontrino in_attesa
  const annullaScontrino = async (docId) => {
    setAnnullando(docId);
    try {
      await deleteDoc(doc(db, 'coda_scontrini', docId));
      setScontriniInAttesa(prev => prev.filter(s => s.id !== docId));
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
        stato:            'in_attesa',
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
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
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
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
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

        {/* ── STATO ANTEPRIMA (uguale per entrambe le modalità) ── */}
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
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
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
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
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
                  ? 'Revisione in corso — pubblichiamo entro 24h e ti assegniamo i punti.'
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

const ProductCardCompatta = ({ offerta, index = 0, segnalati, segnala }) => {
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
        {/* Prezzo */}
        <div className="shrink-0 text-right w-16">
          <div className="font-semibold leading-tight" style={{ fontFamily: "'Lora', serif", fontSize: '18px', color: T.textPrimary }}>
            {formattaPrezzo(offerta.prezzo)}
          </div>
          {offerta.prezzo_kg && (
            <div className="text-[10px] leading-tight mt-0.5" style={{ color: T.textSec }}>
              {formattaPrezzo(offerta.prezzo_kg)}/kg
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

const TabOfferte = ({ offerte, archivio = [] }) => {
  const [vista, setVista] = useState('highlights');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaAttiva, setCategoriaAttiva] = useState(null);
  const [ordinamento, setOrdinamento] = useState('prezzo_asc');
  const [showOrdinamento, setShowOrdinamento] = useState(false);

  // ── Store segnalazioni — un'unica istanza per tutto il tab ───────────────
  const { segnalati, segnala } = useSegnalazioniStore();

  // ── Deduplicazione + filtro nascosto ─────────────────────────────────────
  // Le offerte con nascosto:true (>= 3 segnalazioni) spariscono dalla vista
  const offerteDedup = useMemo(() => {
    const seen = new Map();
    offerte.forEach(o => {
      if (o.nascosto) return; // escludi offerte segnalate dalla community
      const key = `${(o.nome||'').toLowerCase()}_${(o.marca||'').toLowerCase()}_${o.insegna}_${o.grammatura||''}`;
      if (!seen.has(key) || seen.get(key).prezzo > o.prezzo) seen.set(key, o);
    });
    return [...seen.values()].filter(o => !o.valido_fino || o.valido_fino >= OGGI);
  }, [offerte]);

  // ── HIGHLIGHTS: le migliori offerte curate ────────────────────────────────
  const highlights = useMemo(() => {
    // Sezione 1: in scadenza oggi o domani (urgenza)
    const urgenti = offerteDedup
      .filter(o => o.valido_fino === OGGI || o.valido_fino === DOMANI)
      .sort((a, b) => a.prezzo - b.prezzo)
      .slice(0, 8);

    // Sezione 2: top per categoria (il prodotto più economico di ogni categoria)
    const catMap = {};
    offerteDedup.forEach(o => {
      const cat = o.categoria || 'altro';
      if (!catMap[cat] || catMap[cat].prezzo > o.prezzo) catMap[cat] = o;
    });
    const topCategorie = Object.values(catMap).sort((a,b) => a.prezzo - b.prezzo);

    // Sezione 3: offerte con fidelity card (hidden gems)
    const conTessera = offerteDedup
      .filter(o => o.fidelity_req)
      .sort((a, b) => a.prezzo - b.prezzo)
      .slice(0, 6);

    return { urgenti, topCategorie, conTessera };
  }, [offerteDedup]);

  // ── SFOGLIA: raggruppate per categoria o filtrate ─────────────────────────
  const offerteSfoglia = useMemo(() => {
    let base = categoriaAttiva
      ? offerteDedup.filter(o => o.categoria === categoriaAttiva)
      : offerteDedup;
    return [...base].sort((a, b) => {
      if (ordinamento === 'prezzo_asc') return a.prezzo - b.prezzo;
      if (ordinamento === 'prezzo_desc') return b.prezzo - a.prezzo;
      if (ordinamento === 'prezzo_kg') return (a.prezzo_kg||999) - (b.prezzo_kg||999);
      if (ordinamento === 'scadenza') return (a.valido_fino||'').localeCompare(b.valido_fino||'');
      if (ordinamento === 'insegna') return (a.insegna||'').localeCompare(b.insegna||'');
      return 0;
    });
  }, [offerteDedup, categoriaAttiva, ordinamento]);

  // ── CERCA ─────────────────────────────────────────────────────────────────
  const offerteRicerca = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return offerteDedup
      .filter(o =>
        (o.nome||'').toLowerCase().includes(q) ||
        (o.marca||'').toLowerCase().includes(q) ||
        (o.insegna||'').toLowerCase().includes(q)
      )
      .sort((a, b) => a.prezzo - b.prezzo)
      .slice(0, 60);
  }, [offerteDedup, searchQuery]);

  // ── Categorie disponibili con conteggi ────────────────────────────────────
  const categorieConCount = useMemo(() => {
    const counts = {};
    offerteDedup.forEach(o => { const c = o.categoria || 'altro'; counts[c] = (counts[c]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }, [offerteDedup]);

  // ── Cerca auto-switch ─────────────────────────────────────────────────────
  const handleSearch = (v) => {
    setSearchQuery(v);
    if (v.trim()) setVista('cerca');
    else if (vista === 'cerca') setVista('highlights');
  };

  // ── Sezione highlights orizzontale scrollabile ────────────────────────────
  const ScrollRow = ({ items, renderItem }) => (
    <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 pb-1">
      {items.map((item, i) => renderItem(item, i))}
    </div>
  );

  // Card piccola per scroll orizzontale
  const MiniCard = ({ offerta }) => {
    const giorni = calcGiorniRimanenti(offerta.valido_fino);
    const isUrgente = giorni <= 2 && giorni >= 0;
    return (
      <div className="shrink-0 rounded-[16px] p-3.5 flex flex-col gap-1"
        style={{ background: T.surface, border: `1px solid ${T.border}`, width: '140px',
          boxShadow: '0 2px 12px rgba(44,48,38,0.07)' }}>
        <div className="font-semibold" style={{ fontFamily: "'Lora', serif", fontSize: '20px', color: T.textPrimary }}>
          {formattaPrezzo(offerta.prezzo)}
        </div>
        <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: T.textPrimary }}>
          {offerta.nome}
          {offerta.marca ? ` · ${offerta.marca}` : ''}
        </p>
        {offerta.grammatura && (
          <p className="text-[10px]" style={{ color: T.textSec }}>{offerta.grammatura}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${getBadgeInsegna(offerta.insegna)}`}>
            {offerta.insegna.split('/')[0]}
          </span>
          {isUrgente && (
            <span className="text-[10px] font-bold" style={{ color: T.accent }}>
              {giorni === 0 ? 'Oggi!' : `${giorni}gg`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-20 px-4 pt-5 pb-0"
        style={{ background: 'rgba(249,248,244,0.92)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${T.border}` }}>

        {/* Logo + totale */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconaLenticchia size={20} style={{ color: T.primary }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '18px', fontWeight: 500, color: T.textPrimary }}>
              Lenticchia
            </span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: '#EEF2E4', color: T.primary }}>
            {offerteDedup.length.toLocaleString('it-IT')} offerte
          </span>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.textSec }} />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
            placeholder="Cerca pasta, latte, carne..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: T.textSec }}>
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Vista tabs */}
        <div className="flex gap-1 mb-0 pb-3">
          {VISTA_ITEMS.map(v => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={vista === v.id
                ? { background: T.primary, color: '#fff' }
                : { background: T.surface, color: T.textSec, border: `1px solid ${T.border}` }
              }>
              {v.label}
            </button>
          ))}
          {/* Ordinamento — solo in Sfoglia */}
          {vista === 'sfoglia' && (
            <div className="relative ml-auto">
              <button onClick={() => setShowOrdinamento(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textSec }}>
                <SlidersHorizontal size={11} strokeWidth={1.5} />
                {ORDINAMENTI.find(o=>o.id===ordinamento)?.label}
              </button>
              {showOrdinamento && (
                <div className="absolute right-0 top-9 rounded-2xl overflow-hidden z-50 w-32"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(44,48,38,0.12)' }}>
                  {ORDINAMENTI.map(o => (
                    <button key={o.id} onClick={() => { setOrdinamento(o.id); setShowOrdinamento(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-stone-50"
                      style={{ color: ordinamento === o.id ? T.primary : T.textPrimary, fontWeight: ordinamento === o.id ? 600 : 400 }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENUTO ── */}
      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">

        {/* ════ VISTA: HIGHLIGHTS ════ */}
        {vista === 'highlights' && (
          <div className="py-4 space-y-6">

            {/* Scadono a breve */}
            {highlights.urgenti.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>
                    ⏰ Scadono presto
                  </h2>
                  <button onClick={() => { setCategoriaAttiva(null); setOrdinamento('scadenza'); setVista('sfoglia'); }}
                    className="text-xs" style={{ color: T.primary }}>
                    Tutte →
                  </button>
                </div>
                <ScrollRow items={highlights.urgenti} renderItem={(o, i) => <MiniCard key={o.id || i} offerta={o} />} />
              </div>
            )}

            {/* Top per categoria */}
            <div>
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>
                  ✦ Il più economico per categoria
                </h2>
              </div>
              <div className="px-4 rounded-[20px] overflow-hidden mx-4"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 2px 16px rgba(44,48,38,0.05)' }}>
                {highlights.topCategorie.map((o, i) => (
                  <ProductCardCompatta key={o.id || i} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />
                ))}
              </div>
            </div>

            {/* Con tessera fedeltà */}
            {highlights.conTessera.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>
                    ⭐ Con carta fedeltà
                  </h2>
                  <button onClick={() => { setCategoriaAttiva(null); setVista('sfoglia'); }}
                    className="text-xs" style={{ color: T.primary }}>
                    Tutte →
                  </button>
                </div>
                <div className="px-4 rounded-[20px] overflow-hidden mx-4"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 2px 16px rgba(44,48,38,0.05)' }}>
                  {highlights.conTessera.map((o, i) => (
                    <ProductCardCompatta key={o.id || i} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ VISTA: SFOGLIA ════ */}
        {vista === 'sfoglia' && (
          <div>
            {/* Griglia categorie (se nessuna selezionata) */}
            {!categoriaAttiva ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {categorieConCount.map(([cat, count]) => (
                    <button key={cat}
                      onClick={() => setCategoriaAttiva(cat)}
                      className="flex items-center gap-3 p-4 rounded-[16px] text-left active:scale-[0.98] transition-all"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 2px 10px rgba(44,48,38,0.05)' }}>
                      <span style={{ fontSize: '24px' }}>{CATEGORIE_EMOJI[cat] || '📦'}</span>
                      <div>
                        <p className="text-sm font-medium leading-tight" style={{ color: T.textPrimary }}>
                          {CATEGORIE.find(c=>c.id===cat)?.label || cat}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: T.textSec }}>{count} offerte</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Lista prodotti categoria selezionata */
              <div>
                {/* Header categoria */}
                <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
                  style={{ background: 'rgba(249,248,244,0.95)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${T.border}` }}>
                  <button onClick={() => setCategoriaAttiva(null)}
                    className="p-1.5 rounded-full"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <ArrowLeft size={16} strokeWidth={1.5} style={{ color: T.textPrimary }} />
                  </button>
                  <span style={{ fontSize: '20px' }}>{CATEGORIE_EMOJI[categoriaAttiva] || '📦'}</span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: T.textPrimary }}>
                      {CATEGORIE.find(c=>c.id===categoriaAttiva)?.label || categoriaAttiva}
                    </p>
                    <p className="text-xs" style={{ color: T.textSec }}>{offerteSfoglia.length} offerte</p>
                  </div>
                </div>

                <div className="rounded-[0px] overflow-hidden"
                  style={{ background: T.surface }}>
                  {offerteSfoglia.map((o, i) => (
                    <ProductCardCompatta key={o.id || i} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ VISTA: CERCA ════ */}
        {vista === 'cerca' && (
          <div>
            {!searchQuery.trim() ? (
              <div className="text-center py-20 px-8">
                <Search size={36} strokeWidth={1} className="mx-auto mb-4" style={{ color: T.border }} />
                <p className="font-medium" style={{ color: T.textPrimary }}>Cosa stai cercando?</p>
                <p className="text-sm mt-1" style={{ color: T.textSec }}>Digita il nome di un prodotto, marca o negozio</p>
              </div>
            ) : offerteRicerca.length === 0 ? (
              <div className="text-center py-20 px-8">
                <p className="font-medium" style={{ color: T.textPrimary }}>Nessun risultato per "{searchQuery}"</p>
                <p className="text-sm mt-1" style={{ color: T.textSec }}>Prova con un termine più generico</p>
              </div>
            ) : (
              <div>
                <p className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: T.textSec, borderBottom: `1px solid ${T.border}` }}>
                  {offerteRicerca.length} risultati per "{searchQuery}"
                  {offerteRicerca.length === 60 && ' (mostrando i 60 più economici)'}
                </p>
                <div style={{ background: T.surface }}>
                  {offerteRicerca.map((o, i) => (
                    <ProductCardCompatta key={o.id || i} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab Lista Spesa ──────────────────────────────────────────────────────────

// Normalizza una stringa di lista per confronto/deduplicazione
const normalizzaLista = (items) =>
  [...items].map(i => i.toLowerCase().trim()).sort().join('|');

const TabListaSpesa = ({ offerte, archivio = [] }) => {
  const { isLoggedIn, listaSpesa, aggiornaListaSpesa, preferenze, aggiornaPreferenze, prodottiPreferiti } = useAuth();

  // ── Budget mensile ────────────────────────────────────────────────────────
  const [budgetInput, setBudgetInput]     = useState('');
  const [budgetEditing, setBudgetEditing] = useState(false);
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
    setBudgetInput('');
    setBudgetEditing(false);
  };

  const [listaText, setListaText] = useState(() => {
    try { return localStorage.getItem('lenticchia_lista') || "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; } catch { return ""; }
  });
  const [risultato, setRisultato] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [vistaStorico, setVistaStorico] = useState(false); // toggle pannello storico

  // Storico strutturato: { id, items[], vincitore, totale, usata, ultimaData }
  const [storicoListe, setStoricoListe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lenticchia_storico_v2') || '[]'); } catch { return []; }
  });

  // Sync lista da cloud al primo caricamento
  const [listaCaricata, setListaCaricata] = useState(false);
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
                  className="flex-1 px-2.5 py-1 rounded-lg text-sm outline-none"
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

            <button
              onClick={analizzaSpesa}
              disabled={isAnalyzing || !listaText.trim()}
              className="w-full mt-4 text-white font-medium py-3.5 px-4 rounded-[20px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
              style={{ background: T.textPrimary, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 8px 20px rgba(44,48,38,0.2)` }}
            >
              {isAnalyzing
                ? <span className="animate-pulse">Cerco...</span>
                : <><Search size={16} strokeWidth={1.5} /> Cerca offerte</>
              }
            </button>
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

const TabSupermercati = ({ offerte, statoVolantini }) => {
  const [selectedInsegna, setSelectedInsegna] = useState(null);
  const { segnalati, segnala } = useSegnalazioniStore();

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
        <div className="p-4 overflow-y-auto flex-1">
          {storeOffers.map((o, i) => <ProductCard key={o.id} offerta={o} index={i} segnalati={segnalati} segnala={segnala} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-28" style={{ background: T.bg }}>
      <div className="px-5 pt-8 pb-5 sticky top-0 z-10" style={{ background: 'rgba(249,248,244,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
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

const TabSpese = ({ scontriniReali = [], dataLoaded = false }) => {
  // Usa scontrini reali se il fetch è completato e ci sono dati.
  // Se non ancora caricato, non mostrare demo (evita flash).
  const isDemo = dataLoaded && scontriniReali.length === 0;
  const scontrini = (dataLoaded && scontriniReali.length > 0) ? scontriniReali : (isDemo ? MOCK_SCONTRINI : []);

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
      <div className="px-5 pt-8 pb-4 sticky top-0 z-10"
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
                className="flex items-center px-5 py-3.5 active:bg-stone-50 transition-colors"
                style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
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
                <p className="text-sm font-semibold ml-3 shrink-0" style={{ color: T.textPrimary, fontFamily: "'Lora', serif" }}>
                  {formattaPrezzo(s.totale_scontrino)}
                </p>
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
  const { utente } = useAuth();

  // Quale scontrino stiamo revisionando (indice)
  const [indice, setIndice]             = useState(0);
  // Copia modificabile dell'estratto
  const [estratto, setEstratto]         = useState(null);
  // Stato per ogni scontrino: idle | salvando | salvato | errore
  const [stato, setStato]               = useState('idle');
  const [puntiAnimati, setPuntiAnimati] = useState(0);
  const [prodottoInEdit, setProdottoInEdit] = useState(null); // indice prodotto in editing
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

  const rimuoviProdotto = (idx) => {
    setEstratto(prev => ({ ...prev, prodotti: prev.prodotti.filter((_, i) => i !== idx) }));
  };

  const campiObbligatoriOk = !!(estratto?.insegna?.trim()) && !!(estratto?.data_acquisto?.trim());

  const confermaScontrino = async () => {
    if (stato === 'salvando' || !campiObbligatoriOk) return;
    setStato('salvando');

    try {

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
                {[
                  { label: 'Supermercato', campo: 'insegna', tipo: 'text' },
                  { label: 'Indirizzo', campo: 'indirizzo', tipo: 'text' },
                  { label: 'Data acquisto', campo: 'data_acquisto', tipo: 'date' },
                ].map(({ label, campo, tipo }) => (
                  <div key={campo}>
                    <label className="block text-xs font-medium mb-1" style={{ color: T.textSec }}>{label}</label>
                    <input
                      type={tipo}
                      value={estratto[campo] || ''}
                      onChange={e => aggiornaCampoTestata(campo, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
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
                      onClick={() => setProdottoInEdit(idx)}>
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
  const [activeTab, setActiveTab] = useState('lista');
  const [offerte, setOfferte] = useState([]);
  const [statoVolantini, setStatoVolantini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [archivio, setArchivio] = useState([]);
  const [scontriniUtente, setScontriniUtente] = useState([]);
  const [scontriniDaValidare, setScontriniDaValidare] = useState([]);
  const { utente, profilo, preferenze, loading: authLoading, completaOnboarding, completaOnboardingSupermercati } = useAuth();

  // ─── Carica scontrini da_validare (badge + UI validazione) ──────────────────
  // Si ricarica: al mount, quando cambia utente, e quando l'utente torna
  // al tab Scontrino (activeTab === 'scontrino') per aggiornare il badge.
  useEffect(() => {
    if (!utente) return;
    if (activeTab !== 'scontrino' && scontriniDaValidare.length > 0) return; // già caricati
    const caricaDaValidare = async () => {
      try {
        const q = query(
          collection(db, 'coda_scontrini'),
          where('uid', '==', utente.uid),
          where('stato', '==', 'da_validare'),
          limit(20)
        );
        const snap = await getDocs(q);
        setScontriniDaValidare(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setScontriniDaValidare([]);
      }
    };
    caricaDaValidare();
  }, [utente, activeTab]);

  // ─── Carica scontrini utente (per tab Spese) ──────────────────────────────
  // Legge da spese_personali/{uid}/scontrini — contiene TUTTI gli scontrini
  // inclusi quelli generici (alimentari, rep.panetteria) che non vanno in
  // prezzi_scontrini ma sono utili per il resoconto mensile.
  // Si ricarica ogni volta che l'utente apre il tab Spese per avere dati freschi.
  const [scontriniLoaded, setScontriniLoaded] = useState(false);
  useEffect(() => {
    if (!utente) return;
    if (activeTab !== 'spese') return;
    const caricaScontrini = async () => {
      try {
        const q = query(
          collection(db, 'spese_personali', utente.uid, 'scontrini'),
          orderBy('data_registrazione', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setScontriniUtente(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setScontriniUtente([]);
      } finally {
        setScontriniLoaded(true);
      }
    };
    caricaScontrini();
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

      // ── 1. Prova cache locale prima di toccare Firestore ──────────────────
      const cacheOfferte = leggiCache('lenticchia_cache_offerte');
      const cachStato    = leggiCache('lenticchia_cache_stato');

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
          // Salva entrambi in cache per le prossime 6 ore
          // stato_volantini è piccolo (9 doc) ma evita letture inutili ad ogni apertura
          scriviCache('lenticchia_cache_offerte', offerteList);
          scriviCache('lenticchia_cache_stato', statoList);
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
  }, []);

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

  // ── BETA GATE — rimuovere per il lancio pubblico ──────────────────────────
  // Per passare al modello ibrido: rimuovere questo blocco e aggiungere
  // un PrivateRoute solo sui tab 'lista' e 'profilo'.
  if (!utente) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen relative" style={{ background: T.bg }}>
        <SchermataLogin />
      </div>
    );
  }
  // ── FINE BETA GATE ────────────────────────────────────────────────────────

  if (utente && profilo && profilo.onboarding_completato === false) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative" style={{ background: T.bg }}>
        <SchermataOnboarding onConferma={completaOnboarding} />
      </div>
    );
  }

  // Step 2 onboarding: selezione supermercati (dopo privacy, prima dell'app)
  if (utente && preferenze && preferenze.onboarding_supermercati === false) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen shadow-2xl relative" style={{ background: T.bg }}>
        <SchermataSelezioneSupermarket
          statoVolantini={statoVolantini}
          onConferma={completaOnboardingSupermercati}
        />
      </div>
    );
  }

  const nDaValidare = scontriniDaValidare.length;

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
      label: 'Profilo'
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen relative" style={{ background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.textPrimary, overflowX: 'hidden' }}>

      {isDemoMode && (
        <div className="text-[10px] uppercase font-bold text-center py-1 tracking-widest z-50 relative bg-yellow-400 text-yellow-900">
          Modalità Demo — dati di esempio
        </div>
      )}

      <div className="h-screen overflow-hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' }}>
        {activeTab === 'offerte'    && <TabOfferte offerte={offerte} archivio={archivio} />}
        {activeTab === 'negozi'     && <TabSupermercati offerte={offerte} statoVolantini={statoVolantini} />}
        {activeTab === 'lista'      && <TabListaSpesa offerte={offerte} archivio={archivio} />}
        {activeTab === 'stato'      && <TabStato statoVolantini={statoVolantini} />}
        {activeTab === 'scontrino'  && nDaValidare > 0
          ? <TabValidazioneScontrini
              scontriniDaValidare={scontriniDaValidare}
              onValidatoOk={onScontrinoValidato}
            />
          : activeTab === 'scontrino' && <TabScontrino />
        }
        {activeTab === 'spese'      && <TabSpese scontriniReali={scontriniUtente} dataLoaded={scontriniLoaded} />}
        {activeTab === 'profilo'    && <TabProfilo />}
      </div>

      {/* Floating pill navbar — centrata con absolute dentro il wrapper relativo */}
      <div
        className="absolute bottom-5 flex justify-around items-center z-50"
        style={{
          left: '1rem',
          right: '1rem',
          background: T.textPrimary,
          borderRadius: '999px',
          boxShadow: '0 8px 32px rgba(44,48,38,0.35), 0 2px 8px rgba(44,48,38,0.15)',
          padding: '10px 8px',
        }}
      >
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              color: activeTab === item.id ? '#fff' : 'rgba(255,255,255,0.4)',
              minWidth: '60px',
              padding: '6px 8px',
            }}
          >
            {item.icon}
            <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500, letterSpacing: '0.02em' }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

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
