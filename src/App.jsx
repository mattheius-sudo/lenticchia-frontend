import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
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
  Wallet
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

const LIVELLI = [
  { nome: 'Osservatore', min: 0,    colore: 'bg-stone-100 text-stone-600' },
  { nome: 'Esploratore', min: 50,   colore: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { nome: 'Cacciatore',  min: 150,  colore: 'bg-[#EEF2E4] text-[#525E36] border border-[#C8D9A0]' },
  { nome: 'Stratega',    min: 400,  colore: 'bg-purple-50 text-purple-700 border border-purple-200' },
  { nome: 'Guru',        min: 1000, colore: 'bg-amber-50 text-amber-700 border border-amber-200' },
];

const getLivello = (p = 0) => [...LIVELLI].reverse().find(l => p >= l.min) || LIVELLI[0];
const getProssimoLivello = (p = 0) => { const i = LIVELLI.findIndex(l => p < l.min); return i === -1 ? null : LIVELLI[i]; };

// ─── ProductCard (design Gemini) ──────────────────────────────────────────────

const ProductCard = ({ offerta, storico = null, archivio = [], index = 0 }) => {
  const oggi = getOggi();
  const domani = getDomani();
  const isScadenzaOggi = offerta.valido_fino === oggi;
  const isScadenzaDomani = offerta.valido_fino === domani;

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
      {archivio && (() => {
        const storici = archivio
          .filter(a => a.insegna === offerta.insegna && a.nome?.toLowerCase() === offerta.nome?.toLowerCase() && a.prezzo)
          .sort((a, b) => (a.valido_fino || '').localeCompare(b.valido_fino || '')).slice(-6);
        if (storici.length < 2) return null;
        const prezzi = [...storici.map(s => s.prezzo), offerta.prezzo];
        const min = Math.min(...prezzi), max = Math.max(...prezzi), range = max - min || 1;
        const W = 72, H = 20;
        const pts = prezzi.map((p, i) => `${(i / (prezzi.length - 1)) * W},${H - ((p - min) / range) * (H - 4) - 2}`).join(' ');
        const trend = prezzi[prezzi.length - 1] <= prezzi[0];
        return (
          <div className="flex items-center gap-2 pt-1">
            <svg width={W} height={H} className="overflow-visible">
              <polyline fill="none" stroke={trend ? T.primary : '#dc2626'} strokeWidth="1.5" points={pts} />
              {prezzi.map((p, i) => (
                <circle key={i} cx={(i / (prezzi.length - 1)) * W} cy={H - ((p - min) / range) * (H - 4) - 2} r="2" fill={trend ? T.primary : '#dc2626'} />
              ))}
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: T.textSec }}>
              {storici.length + 1} sett.
            </span>
          </div>
        );
      })()}

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
  const [sezione, setSezione] = useState('account'); // 'account' | 'supermercati' | 'prodotti'
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
                        {l.min === 0 && 'Accesso base'}
                        {l.min === 50 && 'Storico spesa 6 mesi'}
                        {l.min === 150 && 'Notifiche offerte sui tuoi prodotti'}
                        {l.min === 400 && 'Offerte 24h in anticipo'}
                        {l.min === 1000 && 'Insights predittivi + badge speciale'}
                      </span>
                      {sbloccato && <span className="ml-auto text-xs" style={{ color: T.primary }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Piano */}
            <div className="rounded-[20px] p-5" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(44,48,38,0.05)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium" style={{ color: T.textPrimary }}>Piano attuale</h3>
                  <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                    {profilo?.piano === 'premium' ? 'Premium attivo' : 'Gratuito'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${profilo?.piano === 'premium' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-stone-100 text-stone-600'}`}>
                  {profilo?.piano === 'premium' ? 'PREMIUM' : 'FREE'}
                </span>
              </div>
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
      </div>
    </div>
  );
};

// ─── Tab Invia Scontrino ─────────────────────────────────────────────────────

const TabScontrino = () => {
  const { utente } = useAuth();
  const [modalita, setModalita] = useState('scontrino'); // 'scontrino' | 'volantino'
  const [stato, setStato] = useState('idle'); // idle | anteprima | caricando | successo | errore
  const [messaggio, setMessaggio] = useState('');
  const [puntiAnimati, setPuntiAnimati] = useState(false);
  const [foto, setFoto] = useState([]); // array di { file, preview, base64 }
  const [insegnaVolantino, setInsegnaVolantino] = useState('');
  const [validoFino, setValidoFino] = useState('');
  const inputRef = React.useRef(null);
  const inputVolRef = React.useRef(null);
  const MAX_FOTO = 4;
  const MAX_FOTO_VOL = 8; // volantini possono essere più lunghi

  const cambiaModalita = (m) => {
    setModalita(m);
    setStato('idle');
    setFoto([]);
    setMessaggio('');
    setInsegnaVolantino('');
    setValidoFino('');
  };

  // Comprime immagine a max 1200px, qualità 70%
  const comprimiImmagine = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 1200;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.70));
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
    setStato('caricando');

    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      await addDoc(collection(db, 'coda_scontrini'), {
        uid: utente.uid,
        immagini_b64: foto.map(f => f.base64),
        n_foto: foto.length,
        stato: 'in_attesa',
        data_caricamento: serverTimestamp(),
        note_utente: '',
      });

      setFoto([]);
      setStato('successo');
      setTimeout(() => setPuntiAnimati(true), 600);
      setTimeout(() => { setStato('idle'); setPuntiAnimati(false); }, 5000);

    } catch (err) {
      console.error('Errore invio scontrino:', err);
      setStato('errore');
      setMessaggio('Errore nel caricamento. Riprova.');
    }
  };

  const inviaVolantino = async () => {
    if (!foto.length) return;
    if (!insegnaVolantino.trim()) {
      setMessaggio('Inserisci il nome del supermercato.');
      setStato('errore');
      return;
    }
    setStato('caricando');

    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      await addDoc(collection(db, 'coda_volantini'), {
        uid: utente.uid,
        immagini_b64: foto.map(f => f.base64),
        n_foto: foto.length,
        insegna: insegnaVolantino.trim(),
        valido_fino: validoFino || null,
        stato: 'in_attesa',
        data_caricamento: serverTimestamp(),
      });

      setFoto([]);
      setStato('successo');
      setTimeout(() => setPuntiAnimati(true), 600);
      setTimeout(() => { setStato('idle'); setPuntiAnimati(false); setInsegnaVolantino(''); setValidoFino(''); }, 5000);

    } catch (err) {
      console.error('Errore invio volantino:', err);
      setStato('errore');
      setMessaggio('Errore nel caricamento. Riprova.');
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
          <div className="rounded-[24px] p-6 mb-4 animate-fade-in-up"
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

// ─── Tab Offerte ──────────────────────────────────────────────────────────────

const ORDINAMENTI = [
  { id: 'prezzo_asc', label: 'Prezzo ↑' },
  { id: 'prezzo_desc', label: 'Prezzo ↓' },
  { id: 'prezzo_kg', label: '€/Kg ↑' },
  { id: 'scadenza', label: 'Scadenza' },
  { id: 'insegna', label: 'Negozio' },
];

const TabOfferte = ({ offerte, archivio = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('tutte');
  const [soloAttivi, setSoloAttivi] = useState(false);
  const [ordinamento, setOrdinamento] = useState('prezzo_asc');
  const [showOrdinamento, setShowOrdinamento] = useState(false);
  const oggi = getOggi();

  const filteredOfferte = useMemo(() => {
    let result = offerte;
    if (soloAttivi) result = result.filter(o => o.valido_fino === oggi);
    if (activeCategory !== 'tutte') result = result.filter(o => o.categoria === activeCategory);
    const seen = new Map();
    result.forEach(o => {
      const key = `${(o.nome||'').toLowerCase()}_${(o.marca||'').toLowerCase()}_${o.insegna}_${o.grammatura||''}`;
      if (!seen.has(key) || seen.get(key).prezzo > o.prezzo) seen.set(key, o);
    });
    result = [...seen.values()];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => (o.nome||'').toLowerCase().includes(q) || (o.marca||'').toLowerCase().includes(q) || (o.insegna||'').toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (ordinamento === 'prezzo_asc') return a.prezzo - b.prezzo;
      if (ordinamento === 'prezzo_desc') return b.prezzo - a.prezzo;
      if (ordinamento === 'prezzo_kg') return (a.prezzo_kg||999) - (b.prezzo_kg||999);
      if (ordinamento === 'scadenza') return (a.valido_fino||'').localeCompare(b.valido_fino||'');
      if (ordinamento === 'insegna') return (a.insegna||'').localeCompare(b.insegna||'');
      return 0;
    });
  }, [offerte, searchQuery, activeCategory, soloAttivi, ordinamento, oggi]);

  return (
    <div className="flex flex-col h-full pb-28" style={{ background: T.bg }}>
      {/* Header sticky traslucido */}
      <div className="sticky top-0 z-10 px-5 pt-6 pb-0" style={{ background: 'rgba(249,248,244,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconaLenticchia size={22} style={{ color: T.primary }} />
            <h1 style={{ fontFamily: "'Lora', serif", fontSize: '20px', fontWeight: 500, color: T.textPrimary }}>
              Lenticchia
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoloAttivi(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={soloAttivi
                ? { background: '#FFF0E8', color: T.accent, border: `1px solid #F4C5A8` }
                : { background: T.surface, color: T.textSec, border: `1px solid ${T.border}` }
              }
            >
              <Clock size={11} strokeWidth={1.5} /> Scade oggi
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOrdinamento(v => !v)}
                className="p-1.5 rounded-full transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textSec }}
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} />
              </button>
              {showOrdinamento && (
                <div className="absolute right-0 top-9 rounded-2xl overflow-hidden z-50 w-36"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(44,48,38,0.12)' }}>
                  {ORDINAMENTI.map(o => (
                    <button key={o.id} onClick={() => { setOrdinamento(o.id); setShowOrdinamento(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-stone-50"
                      style={{ color: ordinamento === o.id ? T.primary : T.textPrimary, fontWeight: ordinamento === o.id ? 600 : 400 }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.textSec }} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
            placeholder="Cerca pasta, latte, carne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categorie */}
        <div className="flex overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5 gap-2">
          {CATEGORIE.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0"
              style={activeCategory === cat.id
                ? { background: T.primary, color: '#fff', fontFamily: "'DM Sans', sans-serif" }
                : { background: T.surface, color: T.textSec, border: `1px solid ${T.border}`, fontFamily: "'DM Sans', sans-serif" }
              }>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pt-2 overflow-y-auto flex-1">
        <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: T.textSec }}>
          {filteredOfferte.length} offerte trovate
        </p>
        {filteredOfferte.length > 0
          ? filteredOfferte.map((offerta, i) => {
              const storicoMatch = archivio.filter(a => a.insegna === offerta.insegna && a.nome?.toLowerCase() === offerta.nome?.toLowerCase()).sort((a, b) => (b.valido_fino||'').localeCompare(a.valido_fino||''))[0] || null;
              return <ProductCard key={offerta.id} offerta={offerta} storico={storicoMatch} archivio={archivio} index={i} />;
            })
          : (
            <div className="text-center py-16">
              <Search size={32} strokeWidth={1} className="mx-auto mb-4" style={{ color: T.textSec }} />
              <p className="font-medium" style={{ color: T.textPrimary }}>Nessuna offerta trovata</p>
              <p className="text-sm mt-1" style={{ color: T.textSec }}>Prova un altro prodotto o categoria.</p>
            </div>
          )
        }
      </div>
    </div>
  );
};

// ─── Tab Lista Spesa ──────────────────────────────────────────────────────────

const TabListaSpesa = ({ offerte, archivio = [] }) => {
  const { isLoggedIn, listaSpesa, aggiornaListaSpesa, preferenze, prodottiPreferiti } = useAuth();

  // Lista come testo — sincronizzata con Firestore se loggato, localStorage se no
  const [listaText, setListaText] = useState(() => {
    try { return localStorage.getItem('lenticchia_lista') || "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; } catch { return "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; }
  });
  const [risultato, setRisultato] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStorico, setShowStorico] = useState(false);
  const [storicoListe, setStoricoListe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lenticchia_storico') || '[]'); } catch { return []; }
  });

  // Sincronizza lista da cloud SOLO al primo caricamento
  // Non reagire ai cambiamenti successivi — causerebbero sovrascrittura
  // mentre l'utente sta scrivendo
  const [listaCaricata, setListaCaricata] = useState(false);
  useEffect(() => {
    if (isLoggedIn && listaSpesa?.items?.length && !listaCaricata) {
      const testoCloud = listaSpesa.items.join('\n');
      setListaText(testoCloud);
      setListaCaricata(true);
    }
  }, [listaSpesa, isLoggedIn, listaCaricata]);

  const handleListaChange = (nuovoTesto) => {
    setListaText(nuovoTesto);
    // Salva su localStorage sempre (fallback offline)
    try { localStorage.setItem('lenticchia_lista', nuovoTesto); } catch {}
    // Salva su Firestore se loggato (con debounce interno all'AuthContext)
    if (isLoggedIn) {
      const items = nuovoTesto.split('\n').map(i => i.trim()).filter(Boolean);
      aggiornaListaSpesa(items);
    }
  };

  const salvaInStorico = (lista, vincitore, totale) => {
    const nuova = { data: new Date().toLocaleDateString('it-IT'), lista, vincitore, totale: totale.toFixed(2) };
    const aggiornato = [nuova, ...storicoListe].slice(0, 10);
    setStoricoListe(aggiornato);
    try { localStorage.setItem('lenticchia_storico', JSON.stringify(aggiornato)); } catch {}
  };

  const analizzaSpesa = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      // Costruisci items: lista spesa + prodotti preferiti con nome_ricerca estesa
      const itemsLista = listaText.split('\n').map(i => i.trim().replace(/\s+/g, ' ').replace(/[^\w\sàèéìòù'.-]/gi, '')).filter(i => i.length > 2);
      const itemsProdottiPreferiti = (prodottiPreferiti?.items || []).map(p => p.nome_ricerca || p.label);
      // Unisci senza duplicati
      const tuttiItems = [...new Set([...itemsLista, ...itemsProdottiPreferiti])];
      const items = tuttiItems;

      if (!items.length) { setRisultato(null); setIsAnalyzing(false); return; }

      // Filtra per insegne attive nelle preferenze utente
      // Se null (primo accesso prima dell'onboarding) → usa tutte le insegne
      const insegneAttivePref = preferenze?.insegne_attive;
      const tutteLeInsegne = [...new Set(offerte.map(o => o.insegna))];
      const insegne = insegneAttivePref
        ? tutteLeInsegne.filter(i => insegneAttivePref.includes(i))
        : tutteLeInsegne;
      const offerteOtt = offerte.map(o => ({ ...o, sN: (o.nome||'').toLowerCase(), sM: (o.marca||'').toLowerCase(), sC: (o.categoria||'').toLowerCase() }));
      const storeResults = insegne.map(insegna => {
        const storeOffers = offerteOtt.filter(o => o.insegna === insegna);
        let trovati = [], nonTrovati = [], totalePrezzo = 0;
        items.forEach(itemStr => {
          const parole = itemStr.toLowerCase().split(' ').filter(p => p.length > 1);

          // Word boundary regex — evita che "latte" trovi "Valcolatte"
          // o "caffè" trovi prodotti che contengono "caffe" come sottostringa
          const matchaParola = (testo, parola) => {
            // Escape caratteri speciali regex
            const escaped = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // \b non funziona con caratteri accentati italiani (à,è,ì,ò,ù)
            // usiamo lookahead/lookbehind su spazio o inizio/fine stringa
            const re = new RegExp(`(^|[\\s,./\\-])${escaped}([\\s,./\\-]|$)`, 'i');
            return re.test(' ' + testo + ' '); // padding per gestire inizio/fine
          };

          const goodMatches = storeOffers.filter(o =>
            parole.every(p =>
              matchaParola(o.sN, p) ||   // nome — match esatto per parola
              matchaParola(o.sM, p) ||   // marca — match esatto per parola
              o.sC.includes(p)           // categoria — includes ok (parole brevi tipo "carne")
            )
          );
          if (goodMatches.length > 0) {
            goodMatches.sort((a, b) => a.prezzo - b.prezzo);
            const best = goodMatches[0];
            if (!trovati.find(t => t.offerta.id === best.id)) { trovati.push({ ricerca: itemStr, offerta: best }); totalePrezzo += best.prezzo; }
          } else { nonTrovati.push(itemStr); }
        });
        const idsTrovati = trovati.map(t => t.offerta.id);
        const extraOfferte = storeOffers.filter(o => !idsTrovati.includes(o.id)).sort((a, b) => a.prezzo - b.prezzo).slice(0, 3);
        return { insegna, trovati, nonTrovati, totalePrezzo, extraOfferte, punteggio: trovati.length };
      });
      storeResults.sort((a, b) => b.punteggio !== a.punteggio ? b.punteggio - a.punteggio : a.totalePrezzo - b.totalePrezzo);
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

  return (
    <div className="flex flex-col h-full pb-28 overflow-y-auto" style={{ background: T.bg }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-6" style={{ background: T.primary }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>
          Verdetto Spesa
        </h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Dove conviene fare la spesa questa settimana.</p>
      </div>

      <div className="px-4 -mt-4 relative z-10">
        {/* Card input */}
        <div className="rounded-[20px] p-5 mb-4" style={{ background: T.surface, boxShadow: '0 8px 30px rgba(44,48,38,0.1)', border: `1px solid ${T.border}` }}>
          <label className="block text-xs uppercase tracking-wider font-medium mb-2" style={{ color: T.textSec }}>
            Cosa ti serve? (una voce per riga)
          </label>
          {/* Tip ricerca */}
          <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2"
            style={{ background: '#EEF2E4', border: `1px solid #C8D9A0` }}>
            <span style={{ color: T.primary, fontSize: '15px', lineHeight: 1, marginTop: '1px' }}>🌿</span>
            <p className="text-xs leading-relaxed" style={{ color: T.primary }}>
              Più sei specifico, migliori i risultati. Scrivi <strong>"latte parzialmente scremato"</strong> invece di solo "latte", <strong>"pasta fusilli"</strong> invece di "pasta".
            </p>
          </div>
          <textarea
            className="w-full p-4 rounded-2xl text-sm resize-none outline-none transition-all"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif", minHeight: '140px' }}
            value={listaText}
            onChange={(e) => handleListaChange(e.target.value)}
            placeholder={"pane\nlatte\nuova\n..."}
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={analizzaSpesa}
              disabled={isAnalyzing || !listaText.trim()}
              className="flex-1 text-white font-medium py-3.5 px-4 rounded-[20px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
              style={{ background: T.textPrimary, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 8px 20px rgba(44,48,38,0.2)` }}
            >
              {isAnalyzing ? <span className="animate-pulse">Cerco...</span> : <><Search size={16} strokeWidth={1.5} /> Trova il migliore</>}
            </button>
            {storicoListe.length > 0 && (
              <button onClick={() => setShowStorico(v => !v)}
                className="px-3.5 py-3 rounded-[20px] border transition-all"
                style={showStorico ? { background: '#EEF2E4', borderColor: '#C8D9A0', color: T.primary } : { background: T.surface, borderColor: T.border, color: T.textSec }}>
                <History size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Storico */}
        {showStorico && storicoListe.length > 0 && (
          <div className="rounded-[20px] p-4 mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <h3 className="text-xs uppercase tracking-wider font-medium mb-3 flex items-center gap-2" style={{ color: T.textSec }}>
              <History size={13} strokeWidth={1.5} /> Ultime liste
            </h3>
            <div className="space-y-2">
              {storicoListe.map((voce, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl cursor-pointer active:scale-[0.99] transition-all"
                  style={{ background: T.bg }} onClick={() => { setListaText(voce.lista.join('\n')); setShowStorico(false); }}>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: T.textSec }}>{voce.data}</div>
                    <div className="text-sm font-medium" style={{ color: T.textPrimary }}>
                      {voce.lista.slice(0, 3).join(', ')}{voce.lista.length > 3 ? '...' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: T.primary }}>{voce.vincitore}</div>
                    <div className="text-xs" style={{ color: T.textSec }}>€{voce.totale}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risultato */}
        {risultato && (
          <div className="animate-fade-in-up">
            {risultato.vincitore?.trovati.length > 0 ? (
              <>
                {/* Verdetto vincitore con prodotti trovati inline */}
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

                  {/* Prodotti trovati — inline nella card verde */}
                  <div className="space-y-2 mb-4">
                    {risultato.vincitore.trovati.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2.5 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {t.offerta.nome}{t.offerta.marca ? ` · ${t.offerta.marca}` : ''}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            cercato: "{t.ricerca}"{t.offerta.grammatura ? ` · ${t.offerta.grammatura}` : ''}
                          </div>
                        </div>
                        <div className="font-semibold ml-3 shrink-0 px-2.5 py-1 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Lora', serif", fontSize: '16px' }}>
                          {formattaPrezzo(t.offerta.prezzo)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Non trovati — inline più discreti */}
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

                  {/* Totale */}
                  <div className="rounded-2xl p-3 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Totale offerte trovate</span>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, color: '#fff' }}>
                      {formattaPrezzo(risultato.vincitore.totalePrezzo)}
                    </span>
                  </div>
                </div>

                {/* Alternative */}
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
                            {alt.punteggio === risultato.vincitore.punteggio && (
                              <span className="block text-xs font-semibold mt-0.5" style={{ color: '#DC2626' }}>
                                + {formattaPrezzo(alt.totalePrezzo - risultato.vincitore.totalePrezzo)}
                              </span>
                            )}
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

  if (selectedInsegna) {
    const storeOffers = offerte.filter(o => o.insegna === selectedInsegna).sort((a, b) => a.prezzo - b.prezzo);
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
          {storeOffers.map((o, i) => <ProductCard key={o.id} offerta={o} index={i} />)}
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

const TabSpese = ({ scontriniReali = [] }) => {
  // Usa scontrini reali se ci sono, altrimenti demo
  const isDemo = scontriniReali.length === 0;
  const scontrini = isDemo ? MOCK_SCONTRINI : scontriniReali;

  const oggi = new Date();
  const meseCorrente = oggi.getMonth();
  const annoCorrente = oggi.getFullYear();

  // ── Calcoli per mese corrente e precedente ──────────────────────────────
  const getMeseAnno = (dateStr) => {
    const d = new Date(dateStr);
    return { mese: d.getMonth(), anno: d.getFullYear() };
  };

  const scontriniMeseCorrente = scontrini.filter(s => {
    const { mese, anno } = getMeseAnno(s.data_acquisto);
    return mese === meseCorrente && anno === annoCorrente;
  });

  const scontriniMesePrecedente = scontrini.filter(s => {
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
      const spesa = (p.prezzo || 0) * (p.quantita || 1);
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
        const key = p.nome.toLowerCase().replace(/\s+/g, '_');
        if (!prezziPerProdotto[key]) prezziPerProdotto[key] = { nome: p.nome, prezzi: [] };
        prezziPerProdotto[key].prezzi.push({ mese, anno, prezzo: p.prezzo });
      });
    });
    const alert = [];
    Object.values(prezziPerProdotto).forEach(({ nome, prezzi }) => {
      if (prezzi.length < 2) return;
      const ordinati = prezzi.sort((a, b) => (a.anno * 12 + a.mese) - (b.anno * 12 + b.mese));
      const primo = ordinati[0];
      const ultimo = ordinati[ordinati.length - 1];
      if (primo.prezzo === ultimo.prezzo) return;
      const perc = Math.round(((ultimo.prezzo - primo.prezzo) / primo.prezzo) * 100);
      if (Math.abs(perc) >= 10) {
        alert.push({ nome, perc, prezzoVecchio: primo.prezzo, prezzoNuovo: ultimo.prezzo });
      }
    });
    return alert.sort((a, b) => Math.abs(b.perc) - Math.abs(a.perc)).slice(0, 3);
  };
  const alertTrend = trovaTrend();

  // ── Mesi nomi ────────────────────────────────────────────────────────────
  const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                     'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  return (
    <div className="flex flex-col h-full pb-32 overflow-y-auto hide-scrollbar" style={{ background: T.bg }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-6 sticky top-0 z-10"
        style={{ background: 'rgba(249,248,244,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, color: T.textPrimary }}>
              Le mie spese
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.textSec }}>
              {MESI_NOMI[meseCorrente]} {annoCorrente}
            </p>
          </div>
          {isDemo && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              Demo
            </span>
          )}
        </div>
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

// ─── App principale ───────────────────────────────────────────────────────────

function AppInterna() {
  const [activeTab, setActiveTab] = useState('lista');
  const [offerte, setOfferte] = useState([]);
  const [statoVolantini, setStatoVolantini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [archivio, setArchivio] = useState([]);
  const [scontriniUtente, setScontriniUtente] = useState([]);
  const { utente, profilo, preferenze, loading: authLoading, completaOnboarding, completaOnboardingSupermercati } = useAuth();

  // ─── Carica scontrini utente (per tab Spese) ──────────────────────────────
  useEffect(() => {
    if (!utente) return;
    const caricaScontrini = async () => {
      try {
        const q = query(
          collection(db, 'prezzi_scontrini'),
          where('uid', '==', utente.uid),
          orderBy('data_acquisto', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setScontriniUtente(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setScontriniUtente([]);
      }
    };
    caricaScontrini();
  }, [utente]);

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
        const offerteValide = cacheOfferte.filter(o => !o.valido_fino || o.valido_fino >= oggi);
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
          .filter(o => !o.valido_fino || o.valido_fino >= oggi);

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

  const NAV_ITEMS = [
    { id: 'lista',      icon: <ListTodo size={24} strokeWidth={1.5} />, label: 'Spesa' },
    { id: 'offerte',    icon: <Tag size={24} strokeWidth={1.5} />,      label: 'Offerte' },
    { id: 'scontrino',  icon: <Camera size={24} strokeWidth={1.5} />,   label: 'Scontrino' },
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
        {activeTab === 'scontrino'  && <TabScontrino />}
        {activeTab === 'spese'      && <TabSpese scontriniReali={scontriniUtente} />}
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
