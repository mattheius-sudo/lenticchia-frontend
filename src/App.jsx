import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './AuthContext';
import {
  Search,
  ListTodo,
  Info,
  Tag,
  Clock,
  AlertCircle,
  Star,
  ShoppingCart,
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
  X
} from 'lucide-react';

// ==========================================
// 1. COSTANTI (invariate)
// ==========================================

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

const COLORI_INSEGNE = {
  'Lidl': 'bg-[#FFD700] text-black',
  'PIM/Agora': 'bg-[#2E7D32] text-white',
  'PIM/Agorà': 'bg-[#2E7D32] text-white',
  'Agora': 'bg-[#2E7D32] text-white',
  'Agorà': 'bg-[#2E7D32] text-white',
  'PIM': 'bg-[#2E7D32] text-white',
  'CTS': 'bg-[#1565C0] text-white',
  'Eurospin': 'bg-[#C62828] text-white',
  'Todis': 'bg-[#E65100] text-white',
  'MD Discount': 'bg-[#6A1B9A] text-white',
  'MD': 'bg-[#6A1B9A] text-white',
  'Sacoph': 'bg-[#00695C] text-white',
  'Elite': 'bg-[#B8860B] text-white',
  'default': 'bg-gray-600 text-white'
};

const getColorInsegna = (insegna) => {
  if (!insegna) return COLORI_INSEGNE['default'];
  if (COLORI_INSEGNE[insegna]) return COLORI_INSEGNE[insegna];
  const key = Object.keys(COLORI_INSEGNE).find(k =>
    k !== 'default' && insegna.toLowerCase().includes(k.toLowerCase())
  );
  return key ? COLORI_INSEGNE[key] : COLORI_INSEGNE['default'];
};

// ==========================================
// 2. DATI MOCK (invariati)
// ==========================================

const MOCK_OFFERTE = [
  { id: '1', nome: 'Pasta Fusilli', marca: 'Barilla', grammatura: '500g', categoria: 'dispensa', prezzo: 0.79, prezzo_kg: 1.58, insegna: 'Lidl', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-18', data_scansione: '2026-04-10' },
  { id: '2', nome: 'Pasta Penne Rigate', marca: 'De Cecco', grammatura: '500g', categoria: 'dispensa', prezzo: 0.99, prezzo_kg: 1.98, insegna: 'PIM/Agora', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-12', valido_fino: '2026-04-16', data_scansione: '2026-04-12' },
  { id: '3', nome: 'Latte Parzialmente Scremato', marca: 'Granarolo', grammatura: '1L', categoria: 'bevande', prezzo: 0.89, prezzo_kg: 0.89, insegna: 'Todis', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-14', valido_fino: '2026-04-20', data_scansione: '2026-04-14' },
  { id: '4', nome: 'Filetto di Maiale', marca: null, grammatura: 'al kg', categoria: 'carne', prezzo: 6.90, prezzo_kg: 6.90, insegna: 'Eurospin', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-17', data_scansione: '2026-04-10' },
  { id: '5', nome: 'Mele Fuji', marca: 'Melinda', grammatura: 'al kg', categoria: 'frutta_verdura', prezzo: 1.49, prezzo_kg: 1.49, insegna: 'CTS', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-15', valido_fino: '2026-04-25', data_scansione: '2026-04-15' },
  { id: '6', nome: 'Passata di Pomodoro', marca: 'Mutti', grammatura: '700g', categoria: 'dispensa', prezzo: 0.85, prezzo_kg: 1.21, insegna: 'MD Discount', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-16', data_scansione: '2026-04-10' },
  { id: '7', nome: 'Pane Bauletto', marca: 'Mulino Bianco', grammatura: '400g', categoria: 'dispensa', prezzo: 1.10, prezzo_kg: 2.75, insegna: 'Lidl', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-10', valido_fino: '2026-04-18', data_scansione: '2026-04-10' },
  { id: '8', nome: 'Orata Fresca', marca: null, grammatura: 'al kg', categoria: 'pesce', prezzo: 9.90, prezzo_kg: 9.90, insegna: 'PIM/Agora', quartiere: 'Roma', fidelity_req: false, valido_dal: '2026-04-12', valido_fino: '2026-04-16', data_scansione: '2026-04-12' },
  { id: '9', nome: 'Detersivo Piatti', marca: 'Svelto', grammatura: '1L', categoria: 'casa_igiene', prezzo: 1.25, prezzo_kg: 1.25, insegna: 'Sacoph', quartiere: 'Roma', fidelity_req: true, valido_dal: '2026-04-15', valido_fino: '2026-04-30', data_scansione: '2026-04-15' },
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

// ==========================================
// 3. UTILITIES (invariate)
// ==========================================

const getOggi = () => new Date().toISOString().split('T')[0];
const getDomani = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().split('T')[0];
};
const calcGiorniRimanenti = (d) => Math.ceil((new Date(d) - new Date(getOggi())) / 86400000);
const formattaPrezzo = (p) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p);

const LIVELLI = [
  { nome: 'Osservatore',  min: 0,    colore: 'bg-gray-100 text-gray-600' },
  { nome: 'Esploratore',  min: 50,   colore: 'bg-blue-100 text-blue-700' },
  { nome: 'Cacciatore',   min: 150,  colore: 'bg-green-100 text-green-700' },
  { nome: 'Stratega',     min: 400,  colore: 'bg-purple-100 text-purple-700' },
  { nome: 'Guru',         min: 1000, colore: 'bg-amber-100 text-amber-700' },
];

const getLivello = (punti = 0) =>
  [...LIVELLI].reverse().find(l => punti >= l.min) || LIVELLI[0];

const getProssimoLivello = (punti = 0) => {
  const idx = LIVELLI.findIndex(l => punti < l.min);
  return idx === -1 ? null : LIVELLI[idx];
};

// ==========================================
// 4. COMPONENTI CONDIVISI (invariati)
// ==========================================

const ProductCard = ({ offerta, storico = null, archivio = [] }) => {
  const oggi = getOggi();
  const domani = getDomani();
  const isScadenzaOggi = offerta.valido_fino === oggi;
  const isScadenzaDomani = offerta.valido_fino === domani;
  const badgeColor = getColorInsegna(offerta.insegna);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2">
          <h3 className="font-semibold text-gray-900 leading-tight">
            {offerta.nome}{offerta.marca && <span className="text-gray-500 font-normal"> - {offerta.marca}</span>}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{offerta.grammatura}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{formattaPrezzo(offerta.prezzo)}</div>
          {offerta.prezzo_kg && <div className="text-xs text-gray-500">{formattaPrezzo(offerta.prezzo_kg)}/kg</div>}
          {storico && storico.prezzo !== offerta.prezzo && (
            <div className={`text-xs font-bold mt-0.5 ${storico.prezzo > offerta.prezzo ? 'text-green-600' : 'text-red-500'}`}>
              {storico.prezzo > offerta.prezzo ? '▼ sceso' : '▲ salito'} da {formattaPrezzo(storico.prezzo)}
            </div>
          )}
        </div>
      </div>

      {archivio && (() => {
        const storici = archivio
          .filter(a => a.insegna === offerta.insegna && a.nome && offerta.nome &&
            a.nome.toLowerCase() === offerta.nome.toLowerCase() && a.prezzo)
          .sort((a, b) => (a.valido_fino || '').localeCompare(b.valido_fino || ''))
          .slice(-6);
        if (storici.length < 2) return null;
        const prezzi = [...storici.map(s => s.prezzo), offerta.prezzo];
        const min = Math.min(...prezzi), max = Math.max(...prezzi);
        const range = max - min || 1;
        const W = 80, H = 24;
        const pts = prezzi.map((p, i) => {
          const x = (i / (prezzi.length - 1)) * W;
          const y = H - ((p - min) / range) * (H - 4) - 2;
          return `${x},${y}`;
        }).join(' ');
        const trend = prezzi[prezzi.length - 1] <= prezzi[0];
        return (
          <div className="mt-2 flex items-center gap-2">
            <svg width={W} height={H} className="overflow-visible">
              <polyline fill="none" stroke={trend ? '#16a34a' : '#dc2626'} strokeWidth="1.5" points={pts} />
              {prezzi.map((p, i) => {
                const x = (i / (prezzi.length - 1)) * W;
                const y = H - ((p - min) / range) * (H - 4) - 2;
                return <circle key={i} cx={x} cy={y} r="2" fill={trend ? '#16a34a' : '#dc2626'} />;
              })}
            </svg>
            <span className={`text-[10px] font-medium ${trend ? 'text-green-600' : 'text-red-500'}`}>
              {storici.length + 1} sett.
            </span>
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-50">
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${badgeColor}`}>{offerta.insegna}</span>
        {offerta.fidelity_req && (
          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100">
            <Star size={12} className="fill-blue-700" /> Fedeltà
          </span>
        )}
        {isScadenzaOggi && (
          <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs font-medium border border-red-100">
            <Clock size={12} /> Scade oggi
          </span>
        )}
        {isScadenzaDomani && (
          <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-xs font-medium border border-orange-100">
            <Clock size={12} /> Scade domani
          </span>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. SCHERMATA ONBOARDING (prima del login)
// ==========================================
// Mostrata UNA SOLA VOLTA al primo accesso dopo il login Google.
// Spiega in modo trasparente cosa fa l'app con i dati.

const SchermataOnboarding = ({ onConferma }) => (
  <div className="flex flex-col h-full bg-white px-6 py-10 overflow-y-auto pb-20">
    <div className="flex items-center justify-center mb-8">
      <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
        <ShoppingCart size={32} className="text-white" />
      </div>
    </div>

    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
      Benvenuto in RomaRisparmia
    </h1>
    <p className="text-gray-500 text-center text-sm mb-10">
      Prima di iniziare, vogliamo essere trasparenti su come funziona.
    </p>

    <div className="space-y-6 mb-10">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
          <Receipt size={20} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Cosa raccogliamo</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Solo gli scontrini che carichi tu, volontariamente. Estraiamo prodotti e prezzi — mai codici fiscali, nomi o dati personali dallo scontrino.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
          <Shield size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Chi li vede</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Solo tu. I confronti con altri utenti usano medie anonime aggregate — nessuno vede i tuoi scontrini, mai.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
          <TrendingDown size={20} className="text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Come li usiamo</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Per dirti dove conviene fare la spesa sulla base di cosa compri davvero tu — non consigli generici.
          </p>
        </div>
      </div>
    </div>

    <div className="bg-gray-50 rounded-xl p-4 mb-8">
      <p className="text-xs text-gray-400 leading-relaxed text-center">
        Puoi cancellare tutti i tuoi dati in qualsiasi momento da Profilo → Impostazioni → Cancella i miei dati. I dati sono conservati su server europei (GDPR).
      </p>
    </div>

    <button
      onClick={onConferma}
      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl transition-colors"
    >
      Ho capito, inizia
    </button>
  </div>
);

// ==========================================
// 6. SCHERMATA LOGIN
// ==========================================

const SchermataLogin = () => {
  const { loginGoogle, erroreAuth } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white px-6 py-16 items-center justify-center">
      <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mb-6">
        <ShoppingCart size={40} className="text-white" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">RomaRisparmia</h1>
      <p className="text-gray-500 text-center text-sm mb-12 leading-relaxed max-w-xs">
        Accedi per tenere traccia della tua spesa e scoprire dove risparmiare davvero.
      </p>

      <button
        onClick={loginGoogle}
        className="flex items-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3.5 px-6 rounded-2xl transition-all w-full max-w-xs justify-center shadow-sm hover:shadow-md active:scale-95"
      >
        {/* SVG Google logo */}
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-2.9-11.3-7l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Continua con Google
      </button>

      {erroreAuth && (
        <p className="mt-4 text-sm text-red-600 text-center">{erroreAuth}</p>
      )}

      <p className="mt-10 text-xs text-gray-400 text-center max-w-xs leading-relaxed">
        Continuando accetti che i tuoi scontrini vengano usati in forma anonima per migliorare i suggerimenti per tutti gli utenti.
      </p>
    </div>
  );
};

// ==========================================
// 7. TAB PROFILO (nuovo)
// ==========================================

const TabProfilo = () => {
  const { utente, profilo, logout, isLoggedIn, loginGoogle } = useAuth();

  if (!isLoggedIn) {
    return <SchermataLogin />;
  }

  const livello = getLivello(profilo?.punti || 0);
  const prossimoLivello = getProssimoLivello(profilo?.punti || 0);
  const puntiAttuali = profilo?.punti || 0;
  const puntiProssimo = prossimoLivello?.min || puntiAttuali;
  const progressoPerc = prossimoLivello
    ? Math.round(((puntiAttuali - (LIVELLI[LIVELLI.indexOf(getLivello(puntiAttuali))]?.min || 0)) /
        (puntiProssimo - (LIVELLI[LIVELLI.indexOf(getLivello(puntiAttuali))]?.min || 0))) * 100)
    : 100;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      {/* Header profilo */}
      <div className="bg-white px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {utente.photoURL ? (
            <img src={utente.photoURL} alt="avatar" className="w-16 h-16 rounded-full border-2 border-green-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
              {utente.displayName?.[0] || utente.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{utente.displayName || 'Utente'}</h2>
            <p className="text-sm text-gray-500">{utente.email}</p>
            <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${livello.colore}`}>
              {livello.nome}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Card punti e progressione */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">I tuoi punti</span>
            <span className="text-2xl font-bold text-green-600">{puntiAttuali}</span>
          </div>
          {prossimoLivello && (
            <>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{livello.nome}</span>
                <span>{prossimoLivello.nome} ({puntiProssimo} pt)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progressoPerc}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {puntiProssimo - puntiAttuali} punti al prossimo livello
              </p>
            </>
          )}
          {!prossimoLivello && (
            <p className="text-xs text-gray-400 text-center">Hai raggiunto il livello massimo!</p>
          )}
        </div>

        {/* Come guadagnare punti */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Come guadagnare punti</h3>
          <div className="space-y-2">
            {[
              { azione: 'Scontrino caricato e verificato', punti: '+15' },
              { azione: 'Scontrino con più di 10 prodotti', punti: '+5' },
              { azione: 'Insegna poco coperta (CTS, Elite...)', punti: '+10' },
              { azione: 'Primo scontrino della settimana', punti: '+5' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item.azione}</span>
                <span className="font-semibold text-green-600 shrink-0 ml-2">{item.punti}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sblocchi per livello */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sblocchi per livello</h3>
          <div className="space-y-2">
            {LIVELLI.map((l) => {
              const sbloccato = puntiAttuali >= l.min;
              return (
                <div key={l.nome} className={`flex items-center gap-3 ${sbloccato ? '' : 'opacity-40'}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${l.colore}`}>
                    {l.nome}
                  </span>
                  <span className="text-xs text-gray-500">
                    {l.min === 0 && 'Accesso base'}
                    {l.min === 50 && 'Storico spesa 6 mesi'}
                    {l.min === 150 && 'Notifiche offerte sui prodotti tuoi'}
                    {l.min === 400 && 'Offerte 24h in anticipo'}
                    {l.min === 1000 && 'Insights predittivi + badge speciale'}
                  </span>
                  {sbloccato && <span className="ml-auto text-green-500 text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Piano */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Piano attuale</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {profilo?.piano === 'premium' ? 'Piano Premium attivo' : 'Piano gratuito'}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              profilo?.piano === 'premium'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {profilo?.piano === 'premium' ? 'PREMIUM' : 'FREE'}
            </span>
          </div>
        </div>

        {/* Azioni */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-4 text-red-600 hover:bg-red-50 transition-colors border-b border-gray-50"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Esci dall'account</span>
            <ChevronRight size={16} className="ml-auto text-gray-300" />
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Funzione in arrivo nel prossimo sprint.')}
          >
            <X size={18} />
            <span className="text-sm font-medium">Cancella i miei dati</span>
            <ChevronRight size={16} className="ml-auto text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. TAB OFFERTE (invariato)
// ==========================================

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
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        (o.nome && o.nome.toLowerCase().includes(q)) ||
        (o.marca && o.marca.toLowerCase().includes(q)) ||
        (o.insegna && o.insegna.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      if (ordinamento === 'prezzo_asc') return a.prezzo - b.prezzo;
      if (ordinamento === 'prezzo_desc') return b.prezzo - a.prezzo;
      if (ordinamento === 'prezzo_kg') return (a.prezzo_kg || 999) - (b.prezzo_kg || 999);
      if (ordinamento === 'scadenza') return (a.valido_fino || '').localeCompare(b.valido_fino || '');
      if (ordinamento === 'insegna') return (a.insegna || '').localeCompare(b.insegna || '');
      return 0;
    });
  }, [offerte, searchQuery, activeCategory, soloAttivi, ordinamento, oggi]);

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-green-600" size={24} />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">RomaRisparmia</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoloAttivi(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${soloAttivi ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
              <Clock size={12} /> Scade oggi
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOrdinamento(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200"
              >
                <SlidersHorizontal size={12} />
              </button>
              {showOrdinamento && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden w-36">
                  {ORDINAMENTI.map(o => (
                    <button
                      key={o.id}
                      onClick={() => { setOrdinamento(o.id); setShowOrdinamento(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${ordinamento === o.id ? 'text-green-600 font-semibold' : 'text-gray-700'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors sm:text-sm"
            placeholder="Cerca pasta, latte, carne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex overflow-x-auto hide-scrollbar pb-3 -mx-4 px-4 space-x-2">
          {CATEGORIE.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="mb-2 text-sm text-gray-500 flex justify-between items-center">
          <span>{filteredOfferte.length} offerte trovate</span>
          <span className="text-xs">{ORDINAMENTI.find(o => o.id === ordinamento)?.label}</span>
        </div>
        {filteredOfferte.length > 0 ? (
          filteredOfferte.map(offerta => {
            const storicoMatch = archivio
              .filter(a => a.insegna === offerta.insegna && a.nome?.toLowerCase() === offerta.nome?.toLowerCase())
              .sort((a, b) => (b.valido_fino || '').localeCompare(a.valido_fino || ''))[0] || null;
            return <ProductCard key={offerta.id} offerta={offerta} storico={storicoMatch} archivio={archivio} />;
          })
        ) : (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nessuna offerta trovata</h3>
            <p className="mt-1 text-sm text-gray-500">Prova a cercare un altro prodotto o cambia categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 9. TAB LISTA SPESA (invariata)
// ==========================================

const TabListaSpesa = ({ offerte, archivio = [] }) => {
  const [listaText, setListaText] = useState(() => {
    try { return localStorage.getItem('romaRisparmia_lista') || "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; }
    catch { return "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale"; }
  });
  const [risultato, setRisultato] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStorico, setShowStorico] = useState(false);
  const [storicoListe, setStoricoListe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('romaRisparmia_storico') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('romaRisparmia_lista', listaText); } catch {}
  }, [listaText]);

  const salvaInStorico = (lista, vincitore, totale) => {
    const nuova = { data: new Date().toLocaleDateString('it-IT'), lista, vincitore, totale: totale.toFixed(2) };
    const aggiornato = [nuova, ...storicoListe].slice(0, 10);
    setStoricoListe(aggiornato);
    try { localStorage.setItem('romaRisparmia_storico', JSON.stringify(aggiornato)); } catch {}
  };

  const analizzaSpesa = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const items = listaText.split('\n').map(i => i.trim().replace(/\s+/g, ' ').replace(/[^\w\sàèéìòù'.-]/gi, '')).filter(i => i.length > 2);
      if (!items.length) { setRisultato(null); setIsAnalyzing(false); return; }

      const insegne = [...new Set(offerte.map(o => o.insegna))];
      const offerteOtt = offerte.map(o => ({ ...o, searchNome: (o.nome||'').toLowerCase(), searchMarca: (o.marca||'').toLowerCase(), searchCategoria: (o.categoria||'').toLowerCase() }));

      const storeResults = insegne.map(insegna => {
        const storeOffers = offerteOtt.filter(o => o.insegna === insegna);
        let trovati = [], nonTrovati = [], totalePrezzo = 0;
        items.forEach(itemStr => {
          const parole = itemStr.toLowerCase().split(' ').filter(p => p.length > 1);
          const goodMatches = storeOffers.filter(o => parole.every(p => o.searchNome.includes(p) || o.searchMarca.includes(p) || o.searchCategoria.includes(p)));
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
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="bg-green-600 px-4 py-6 shadow-md text-white rounded-b-3xl">
        <h2 className="text-2xl font-bold mb-1">Verdetto Spesa</h2>
        <p className="text-green-100 text-sm">Trova il supermercato più conveniente per la tua lista.</p>
      </div>

      <div className="px-4 -mt-4 relative z-10 flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cosa ti serve? (una voce per riga)</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50"
            rows="6"
            value={listaText}
            onChange={(e) => setListaText(e.target.value)}
            placeholder={"es.\npane\nlatte\nuova"}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={analizzaSpesa}
              disabled={isAnalyzing || !listaText.trim()}
              className="flex-1 bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isAnalyzing ? <span className="animate-pulse">Ricerca in corso...</span> : <><Search size={18} /> Trova il migliore</>}
            </button>
            {storicoListe.length > 0 && (
              <button onClick={() => setShowStorico(v => !v)} className={`px-3 py-3 rounded-xl border transition-colors ${showStorico ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <History size={18} />
              </button>
            )}
          </div>
        </div>

        {showStorico && storicoListe.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><History size={16} className="text-gray-500" /> Ultime liste</h3>
            <div className="space-y-2">
              {storicoListe.map((voce, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => { setListaText(voce.lista.join('\n')); setShowStorico(false); }}>
                  <div>
                    <div className="text-xs text-gray-400">{voce.data}</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{voce.lista.slice(0, 3).join(', ')}{voce.lista.length > 3 ? '...' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-green-700">{voce.vincitore}</div>
                    <div className="text-xs text-gray-500">€{voce.totale}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {risultato && (
          <div className="animate-fade-in-up">
            {risultato.vincitore?.trovati.length > 0 ? (
              <>
                <div className="bg-white border-2 border-green-500 rounded-2xl shadow-lg p-5 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">MIGLIOR SCELTA</div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Conviene andare da</h3>
                  <span className={`px-3 py-1.5 rounded-lg text-lg font-bold shadow-sm ${getColorInsegna(risultato.vincitore.insegna)}`}>{risultato.vincitore.insegna}</span>
                  <p className="text-gray-800 text-base my-4"><strong>{risultato.vincitore.trovati.length}</strong> prodotti della tua lista sono in offerta!</p>
                  <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center border border-green-100">
                    <span className="text-green-800 font-medium">Totale offerte trovate:</span>
                    <span className="text-2xl font-black text-green-700">{formattaPrezzo(risultato.vincitore.totalePrezzo)}</span>
                  </div>
                </div>
                {risultato.alternative.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2"><Store size={18} className="text-gray-500" /> Confronto con altri</h4>
                    <div className="space-y-2">
                      {risultato.alternative.map((alt, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-800 text-sm">{alt.insegna}</span>
                            <span className="text-gray-500 text-xs ml-1 block sm:inline">({alt.punteggio} trovati)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-gray-900 text-sm">{formattaPrezzo(alt.totalePrezzo)}</span>
                            {alt.punteggio === risultato.vincitore.punteggio && (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 block">+ {formattaPrezzo(alt.totalePrezzo - risultato.vincitore.totalePrezzo)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm">✓</span> Trovati in offerta</h4>
                <div className="space-y-2 mb-6">
                  {risultato.vincitore.trovati.map((t, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">Cercato: "{t.ricerca}"</div>
                        <div className="font-medium text-gray-900 leading-tight">{t.offerta.nome}{t.offerta.marca ? ` - ${t.offerta.marca}` : ''}</div>
                        <div className="text-xs text-gray-500 mt-1">{t.offerta.grammatura}</div>
                      </div>
                      <div className="font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">{formattaPrezzo(t.offerta.prezzo)}</div>
                    </div>
                  ))}
                </div>
                {risultato.vincitore.nonTrovati.length > 0 && (
                  <>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 opacity-70"><span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">✕</span> Non in offerta</h4>
                    <ul className="bg-gray-100/50 p-4 rounded-xl mb-6 space-y-1">
                      {risultato.vincitore.nonTrovati.map((item, idx) => (
                        <li key={idx} className="text-gray-500 text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> {item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
                <AlertCircle size={32} className="text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-orange-800 mb-1">Nessun affare questa settimana</h3>
                <p className="text-orange-700 text-sm">I prodotti che hai inserito non sono in promozione in nessun supermercato al momento.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 10. TAB STATO (invariato)
// ==========================================

const TabStato = ({ statoVolantini }) => (
  <div className="flex flex-col h-full bg-gray-50 pb-20">
    <div className="px-4 py-6 bg-white shadow-sm border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900">Stato Aggiornamenti</h2>
      <p className="text-gray-500 text-sm mt-1">Monitoraggio validità volantini.</p>
    </div>
    <div className="p-4 flex-1 overflow-y-auto">
      <div className="space-y-3">
        {statoVolantini.map(stato => {
          const g = calcGiorniRimanenti(stato.valido_fino);
          const statusColor = g < 0 ? 'bg-red-600' : g <= 2 ? 'bg-orange-500' : 'bg-green-500';
          const statusBg = g < 0 ? 'bg-red-50 border-red-100' : g <= 2 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100';
          return (
            <div key={stato.id} className={`flex items-center justify-between p-4 rounded-xl border ${statusBg} bg-white shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                <div>
                  <h3 className="font-bold text-gray-900">{stato.insegna}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Tag size={10} /> {stato.n_prodotti} prodotti</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Scadenza</div>
                <div className={`text-sm font-medium ${g < 0 ? 'text-red-700' : 'text-gray-900'}`}>{g < 0 ? 'Scaduto' : stato.valido_fino}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 bg-blue-50 rounded-xl p-4 flex gap-3 border border-blue-100">
        <Info size={24} className="text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800 leading-relaxed"><strong>Nota Trasparenza:</strong> I prezzi mostrati sono esclusivamente quelli presenti nei volantini promozionali di questa settimana.</p>
      </div>
    </div>
  </div>
);

// ==========================================
// 11. TAB SUPERMERCATI (invariato)
// ==========================================

const TabSupermercati = ({ offerte, statoVolantini }) => {
  const [selectedInsegna, setSelectedInsegna] = useState(null);
  if (selectedInsegna) {
    const storeOffers = offerte.filter(o => o.insegna === selectedInsegna).sort((a, b) => a.prezzo - b.prezzo);
    const headerColor = getColorInsegna(selectedInsegna);
    return (
      <div className="flex flex-col h-full bg-gray-50 pb-20">
        <div className={`px-4 py-4 shadow-sm flex items-center gap-3 sticky top-0 z-10 ${headerColor}`}>
          <button onClick={() => setSelectedInsegna(null)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><ArrowLeft size={24} /></button>
          <div>
            <h2 className="text-xl font-bold leading-tight">{selectedInsegna}</h2>
            <p className="text-xs opacity-90">{storeOffers.length} offerte disponibili</p>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {storeOffers.length > 0 ? storeOffers.map(o => <ProductCard key={o.id} offerta={o} />) : <div className="text-center py-10 text-gray-500">Nessuna offerta trovata.</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="px-4 py-6 bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-gray-900">Sfoglia per Negozio</h2>
        <p className="text-gray-500 text-sm mt-1">Scegli un'insegna per vedere tutti i suoi prodotti.</p>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {statoVolantini.map(stato => (
            <button key={stato.id} onClick={() => setSelectedInsegna(stato.insegna)} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm hover:shadow-md transition-all h-32 active:scale-95 ${getColorInsegna(stato.insegna)}`}>
              <span className="text-lg font-bold text-center leading-tight mb-2">{stato.insegna}</span>
              <span className="bg-white/25 px-2.5 py-1 rounded-lg text-xs font-medium">{stato.n_prodotti} offerte</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 12. APP PRINCIPALE (con Auth)
// ==========================================

function AppInterna() {
  const [activeTab, setActiveTab] = useState('lista');
  const [offerte, setOfferte] = useState([]);
  const [statoVolantini, setStatoVolantini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [archivio, setArchivio] = useState([]);

  const { utente, profilo, loading: authLoading, completaOnboarding } = useAuth();

  // Fetch dati pubblici (invariato, non dipende dal login)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const offerteCol = collection(db, 'offerte_attive');
        const offerteSnapshot = await getDocs(offerteCol);
        const oggi = new Date().toISOString().split('T')[0];
        const offerteList = offerteSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(o => !o.valido_fino || o.valido_fino >= oggi);

        const statoCol = collection(db, 'stato_volantini');
        const statoSnapshot = await getDocs(statoCol);
        const statoList = statoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let archivioList = [];
        try {
          const archivioCol = collection(db, 'archivio_offerte');
          const archivioSnapshot = await getDocs(archivioCol);
          const archivioPromises = archivioSnapshot.docs.slice(0, 20).map(async (archDoc) => {
            const prodCol = collection(db, 'archivio_offerte', archDoc.id, 'prodotti');
            const prodSnap = await getDocs(prodCol);
            return prodSnap.docs.map(d => ({ ...d.data(), _archivio_id: archDoc.id }));
          });
          archivioList = (await Promise.all(archivioPromises)).flat();
        } catch {}

        if (offerteList.length === 0) {
          setOfferte(MOCK_OFFERTE);
          setStatoVolantini(MOCK_STATO);
          setIsDemoMode(true);
        } else {
          setOfferte(offerteList);
          setStatoVolantini(statoList);
          setArchivio(archivioList);
        }
      } catch {
        setOfferte(MOCK_OFFERTE);
        setStatoVolantini(MOCK_STATO);
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Schermata di caricamento iniziale (Auth + dati)
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-green-600">
        <ShoppingCart size={48} className="animate-bounce mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RomaRisparmia</h1>
        <p className="text-gray-500 flex items-center gap-2">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></span>
          Caricamento...
        </p>
      </div>
    );
  }

  // Onboarding: mostrato solo se loggato e non ancora completato
  if (utente && profilo && profilo.onboarding_completato === false) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white shadow-2xl relative font-sans text-gray-900">
        <SchermataOnboarding onConferma={completaOnboarding} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white shadow-2xl relative font-sans text-gray-900 overflow-hidden">
      {isDemoMode && (
        <div className="bg-yellow-400 text-yellow-900 text-[10px] uppercase font-bold text-center py-1 tracking-widest z-50 relative">
          Modalità Demo (Dati Fittizi)
        </div>
      )}

      <div className="h-screen overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {activeTab === 'offerte'  && <TabOfferte offerte={offerte} archivio={archivio} />}
        {activeTab === 'negozi'   && <TabSupermercati offerte={offerte} statoVolantini={statoVolantini} />}
        {activeTab === 'lista'    && <TabListaSpesa offerte={offerte} archivio={archivio} />}
        {activeTab === 'stato'    && <TabStato statoVolantini={statoVolantini} />}
        {activeTab === 'profilo'  && <TabProfilo />}
      </div>

      {/* Bottom Navigation — ora con tab Profilo */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] z-50 flex justify-around">
        <button onClick={() => setActiveTab('lista')} className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'lista' ? 'text-green-600' : 'text-gray-400'}`}>
          <ListTodo size={22} />
          <span className="text-[10px] mt-1 font-medium">Spesa</span>
        </button>
        <button onClick={() => setActiveTab('offerte')} className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'offerte' ? 'text-green-600' : 'text-gray-400'}`}>
          <Tag size={22} />
          <span className="text-[10px] mt-1 font-medium">Offerte</span>
        </button>
        <button onClick={() => setActiveTab('negozi')} className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'negozi' ? 'text-green-600' : 'text-gray-400'}`}>
          <Store size={22} />
          <span className="text-[10px] mt-1 font-medium">Negozi</span>
        </button>
        <button onClick={() => setActiveTab('stato')} className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'stato' ? 'text-green-600' : 'text-gray-400'}`}>
          <Info size={22} />
          <span className="text-[10px] mt-1 font-medium">Stato</span>
        </button>
        {/* Tab Profilo: mostra avatar se loggato, icona generica se no */}
        <button onClick={() => setActiveTab('profilo')} className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'profilo' ? 'text-green-600' : 'text-gray-400'}`}>
          {utente?.photoURL ? (
            <img src={utente.photoURL} alt="avatar" className={`w-6 h-6 rounded-full border-2 ${activeTab === 'profilo' ? 'border-green-500' : 'border-gray-300'}`} />
          ) : (
            <User size={22} />
          )}
          <span className="text-[10px] mt-1 font-medium">Profilo</span>
        </button>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

// AuthProvider wrappa tutto — è il punto di ingresso unico
export default function App() {
  return (
    <AuthProvider>
      <AppInterna />
    </AuthProvider>
  );
}
