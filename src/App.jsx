import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  Search, 
  ListTodo, 
  Info, 
  Tag, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Star, 
  ShoppingCart,
  MapPin,
  TrendingDown,
  TrendingUp,
  Store,
  ArrowLeft,
  BarChart2,
  Receipt,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ==========================================
// 1. CONFIGURAZIONE FIREBASE & COSTANTI
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDJOAAKn9SBWI-yEfZD4xLu3RVKEyY5aWU",
  authDomain: "roma-risparmia.firebaseapp.com",
  projectId: "roma-risparmia",
  storageBucket: "roma-risparmia.appspot.com",
  messagingSenderId: "1028350520233",
  appId: "1:1028350520233:web:26db230805559ea0f9b2b8"
};

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
  'default': 'bg-gray-600 text-white'
};

// Funzione helper per trovare il colore anche con nomi parziali
const getColorInsegna = (insegna) => {
  if (!insegna) return COLORI_INSEGNE['default'];
  // Match esatto
  if (COLORI_INSEGNE[insegna]) return COLORI_INSEGNE[insegna];
  // Match parziale (es. "Sacoph" dentro "Sacoph Garbatella")
  const key = Object.keys(COLORI_INSEGNE).find(k => 
    k !== 'default' && insegna.toLowerCase().includes(k.toLowerCase())
  );
  return key ? COLORI_INSEGNE[key] : COLORI_INSEGNE['default'];
};

// ==========================================
// 2. DATI MOCK (Fallback)
// ==========================================
// Usati se Firebase non è configurato per permettere la preview
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
// 3. UTILITIES
// ==========================================

const getOggi = () => new Date().toISOString().split('T')[0];

const getDomani = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const calcGiorniRimanenti = (dataScadenza) => {
  const oggi = new Date(getOggi());
  const scadenza = new Date(dataScadenza);
  const diffTime = scadenza - oggi;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formattaPrezzo = (prezzo) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(prezzo);
};

// ==========================================
// 4. COMPONENTI UI
// ==========================================

const ProductCard = ({ offerta }) => {
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
            {offerta.nome} {offerta.marca && <span className="text-gray-500 font-normal"> - {offerta.marca}</span>}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{offerta.grammatura}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{formattaPrezzo(offerta.prezzo)}</div>
          <div className="text-xs text-gray-500">{formattaPrezzo(offerta.prezzo_kg)}/kg</div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-50">
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${badgeColor}`}>
          {offerta.insegna}
        </span>
        
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
// 5. TAB 1: OFFERTE
// ==========================================

const TabOfferte = ({ offerte }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('tutte');

  const filteredOfferte = useMemo(() => {
    let result = offerte;
    
    if (activeCategory !== 'tutte') {
      result = result.filter(o => o.categoria === activeCategory);
    }
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        (o.nome && o.nome.toLowerCase().includes(q)) ||
        (o.marca && o.marca.toLowerCase().includes(q)) ||
        (o.insegna && o.insegna.toLowerCase().includes(q))
      );
    } else {
      // Sort by lowest price inside the category if no search
      result = [...result].sort((a, b) => a.prezzo - b.prezzo);
    }
    
    return result;
  }, [offerte, searchQuery, activeCategory]);

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Header Fissato */}
      <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-3 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-green-600" size={24} />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">RomaRisparmia</h1>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin size={12} /> Roma
          </span>
        </div>

        {/* Search Bar */}
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

        {/* Category Scroller */}
        <div className="flex overflow-x-auto hide-scrollbar pb-3 -mx-4 px-4 space-x-2">
          {CATEGORIE.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Offerte */}
      <div className="p-4 overflow-y-auto">
        <div className="mb-2 text-sm text-gray-500 flex justify-between items-center">
          <span>{filteredOfferte.length} offerte trovate</span>
          {searchQuery === '' && <span className="flex items-center gap-1"><TrendingDown size={14}/> Prezzo minore</span>}
        </div>
        
        {filteredOfferte.length > 0 ? (
          filteredOfferte.map(offerta => (
            <ProductCard key={offerta.id} offerta={offerta} />
          ))
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
// 6. TAB 2: LISTA SPESA (L'Algoritmo)
// ==========================================

const TabListaSpesa = ({ offerte }) => {
  const [listaText, setListaText] = useState(() => {
    // Carica la lista salvata in precedenza (se esiste)
    const saved = localStorage.getItem('romaRisparmia_lista');
    return saved !== null ? saved : "pane\nfusilli\nlatte parzialmente scremato\nfiletto di maiale";
  });
  const [risultato, setRisultato] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Salva automaticamente la lista ogni volta che viene modificata
  useEffect(() => {
    localStorage.setItem('romaRisparmia_lista', listaText);
  }, [listaText]);

  const analizzaSpesa = () => {
    setIsAnalyzing(true);
    
    // Simula un po' di caricamento per UX
    setTimeout(() => {
      // FIX: Sanitizzazione input più robusta (rimuove doppi spazi e caratteri speciali pericolosi)
      const items = listaText
        .split('\n')
        .map(i => i.trim().replace(/\s+/g, ' ').replace(/[^\w\sàèéìòù'.-]/gi, ''))
        .filter(i => i.length > 2);
      
      if (items.length === 0) {
        setRisultato(null);
        setIsAnalyzing(false);
        return;
      }

      // Raggruppa offerte per insegna
      const insegne = [...new Set(offerte.map(o => o.insegna))];
      let bestStore = null;
      let maxTrovati = -1;
      let minPrezzo = Infinity;

      // FIX: Pre-calcoliamo le stringhe in minuscolo una sola volta per non bloccare la CPU del dispositivo mobile
      const offerteOttimizzate = offerte.map(o => ({
        ...o,
        searchNome: o.nome ? o.nome.toLowerCase() : '',
        searchMarca: o.marca ? o.marca.toLowerCase() : '',
        searchCategoria: o.categoria ? o.categoria.toLowerCase() : ''
      }));

      const storeResults = insegne.map(insegna => {
        const storeOffers = offerteOttimizzate.filter(o => o.insegna === insegna);

        let trovati = [];
        let nonTrovati = [];
        let totalePrezzo = 0;

        items.forEach(itemStr => {
          const q = itemStr.toLowerCase();
          
          // Ricerca testuale semplice sulle stringhe pre-calcolate
          // Ricerca per parole: ogni parola della query deve matchare almeno un campo
          const parole = q.split(' ').filter(p => p.length > 1);
          const goodMatches = storeOffers.filter(o => 
            parole.every(parola =>
              o.searchNome.includes(parola) ||
              o.searchMarca.includes(parola) ||
              o.searchCategoria.includes(parola)
            )
          );

          if (goodMatches.length > 0) {
            // Prendi il miglior match (prezzo più basso tra i match accettabili)
            goodMatches.sort((a, b) => a.prezzo - b.prezzo);
            const bestMatch = goodMatches[0];
            
            // Evita duplicati se cerca due volte la stessa cosa
            if (!trovati.find(t => t.offerta.id === bestMatch.id)) {
              trovati.push({ ricerca: itemStr, offerta: bestMatch });
              totalePrezzo += bestMatch.prezzo;
            }
          } else {
            nonTrovati.push(itemStr);
          }
        });

        // Trova offerte extra (non nella lista) per lo store
        const idsTrovati = trovati.map(t => t.offerta.id);
        const extraOfferte = storeOffers
          .filter(o => !idsTrovati.includes(o.id))
          .sort((a, b) => a.prezzo - b.prezzo)
          .slice(0, 3); // Prendi 3 extra offerte convenienti

        return {
          insegna,
          trovati,
          nonTrovati,
          totalePrezzo,
          extraOfferte,
          punteggio: trovati.length // priorità principale
        };
      });

      // Ordina i risultati: prima per chi ha trovato più prodotti (decrescente), 
      // poi a parità di prodotti trovati, per prezzo totale (crescente)
      storeResults.sort((a, b) => {
        if (b.punteggio !== a.punteggio) {
          return b.punteggio - a.punteggio;
        }
        return a.totalePrezzo - b.totalePrezzo;
      });

      // Imposta il vincitore e salva le alternative per il confronto
      if (storeResults.length > 0 && storeResults[0].punteggio > 0) {
        setRisultato({
          vincitore: storeResults[0],
          // Prendi fino a 3 alternative che hanno trovato almeno un prodotto
          alternative: storeResults.slice(1).filter(r => r.punteggio > 0).slice(0, 3) 
        });
      } else {
        setRisultato({
          vincitore: storeResults[0], // Nessun match trovato
          alternative: []
        });
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cosa ti serve? (una voce per riga)
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50"
            rows="6"
            value={listaText}
            onChange={(e) => setListaText(e.target.value)}
            placeholder="es.&#10;pane&#10;latte&#10;uova"
          />
          <button
            onClick={analizzaSpesa}
            disabled={isAnalyzing || listaText.trim().length === 0}
            className="w-full mt-3 bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md"
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Ricerca in corso...</span>
            ) : (
              <>
                <Search size={18} /> Trova il supermercato migliore
              </>
            )}
          </button>
        </div>

        {risultato && (
          <div className="animate-fade-in-up">
            {risultato.vincitore && risultato.vincitore.trovati.length > 0 ? (
              <>
                {/* Card Vincitore */}
                <div className="bg-white border-2 border-green-500 rounded-2xl shadow-lg p-5 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MIGLIOR SCELTA
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Conviene andare da</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1.5 rounded-lg text-lg font-bold shadow-sm ${getColorInsegna(risultato.vincitore.insegna)}`}>
                      {risultato.vincitore.insegna}
                    </span>
                  </div>
                  
                  <p className="text-gray-800 text-base mb-4 leading-relaxed">
                    Questa settimana <strong>{risultato.vincitore.trovati.length}</strong> prodotti della tua lista sono in offerta!
                  </p>
                  
                  <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center border border-green-100">
                    <span className="text-green-800 font-medium">Totale offerte trovate:</span>
                    <span className="text-2xl font-black text-green-700">{formattaPrezzo(risultato.vincitore.totalePrezzo)}</span>
                  </div>
                </div>

                {/* Confronto Alternative */}
                {risultato.alternative.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 opacity-80 text-sm">
                      <Store size={18} className="text-gray-500" /> Confronto con altri
                    </h4>
                    <div className="space-y-2">
                      {risultato.alternative.map((alt, idx) => {
                        // Calcoliamo la differenza solo se hanno trovato lo STESSO numero di articoli
                        const diffPrezzo = alt.totalePrezzo - risultato.vincitore.totalePrezzo;
                        const sameItems = alt.punteggio === risultato.vincitore.punteggio;
                        
                        return (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                            <div>
                              <span className="font-bold text-gray-800 text-sm">{alt.insegna}</span>
                              <span className="text-gray-500 text-xs ml-1 block sm:inline">
                                ({alt.punteggio} trovati)
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="font-medium text-gray-900 text-sm">{formattaPrezzo(alt.totalePrezzo)}</span>
                              {sameItems && diffPrezzo > 0 ? (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5">
                                  + {formattaPrezzo(diffPrezzo)}
                                </span>
                              ) : !sameItems ? (
                                <span className="text-[10px] text-gray-400 mt-0.5">Mancano articoli</span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lista Trovati */}
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm">✓</span>
                  Trovati in offerta
                </h4>
                <div className="space-y-2 mb-6">
                  {risultato.vincitore.trovati.map((t, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">Cercato: "{t.ricerca}"</div>
                        <div className="font-medium text-gray-900 leading-tight">
                          {t.offerta.nome} {t.offerta.marca ? `- ${t.offerta.marca}` : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t.offerta.grammatura}</div>
                      </div>
                      <div className="font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                        {formattaPrezzo(t.offerta.prezzo)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lista NON Trovati */}
                {risultato.vincitore.nonTrovati.length > 0 && (
                  <>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 opacity-70">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">✕</span>
                      Non in offerta
                    </h4>
                    <ul className="bg-gray-100/50 p-4 rounded-xl mb-6 space-y-1">
                      {risultato.vincitore.nonTrovati.map((item, idx) => (
                        <li key={idx} className="text-gray-500 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Extra Offerte */}
                {risultato.vincitore.extraOfferte.length > 0 && (
                  <>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 mt-8">
                      <Tag size={18} className="text-blue-600" />
                      Conviene anche prendere qui:
                    </h4>
                    <div className="flex overflow-x-auto hide-scrollbar pb-4 space-x-3 -mx-4 px-4">
                      {risultato.vincitore.extraOfferte.map(offerta => (
                        <div key={offerta.id} className="min-w-[140px] bg-white border border-blue-100 shadow-sm rounded-xl p-3 flex flex-col justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{offerta.nome}</div>
                            <div className="text-xs text-gray-500 mt-1">{offerta.grammatura}</div>
                          </div>
                          <div className="mt-2 text-blue-700 font-bold">
                            {formattaPrezzo(offerta.prezzo)}
                          </div>
                        </div>
                      ))}
                    </div>
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
// 7. TAB 3: STATO (Info)
// ==========================================

const TabStato = ({ statoVolantini }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="px-4 py-6 bg-white shadow-sm border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Stato Aggiornamenti</h2>
        <p className="text-gray-500 text-sm mt-1">Monitoraggio validità volantini.</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {statoVolantini.map(stato => {
            const giorniRimasti = calcGiorniRimanenti(stato.valido_fino);
            let statusColor = "bg-green-500";
            let statusBg = "bg-green-50";
            let statusBorder = "border-green-100";
            
            if (giorniRimasti < 0) {
              statusColor = "bg-red-600";
              statusBg = "bg-red-50";
              statusBorder = "border-red-100";
            } else if (giorniRimasti <= 2) {
              statusColor = "bg-orange-500";
              statusBg = "bg-orange-50";
              statusBorder = "border-orange-100";
            }

            return (
              <div key={stato.id} className={`flex items-center justify-between p-4 rounded-xl border ${statusBorder} ${statusBg} bg-white shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shadow-sm ${statusColor}`}></div>
                  <div>
                    <h3 className="font-bold text-gray-900">{stato.insegna}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Tag size={10} /> {stato.n_prodotti} prodotti mappati
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Scadenza</div>
                  <div className={`text-sm font-medium ${giorniRimasti < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {giorniRimasti < 0 ? 'Scaduto' : stato.valido_fino}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-4 flex gap-3 border border-blue-100">
          <Info size={24} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 leading-relaxed">
            <strong>Nota Trasparenza:</strong> I prezzi mostrati nell'app sono esclusivamente quelli presenti nei volantini promozionali di questa settimana. L'app non traccia i prezzi di listino interi.
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7b. TAB 4: NEGOZI (Volantini)
// ==========================================

const TabSupermercati = ({ offerte, statoVolantini }) => {
  const [selectedInsegna, setSelectedInsegna] = useState(null);

  if (selectedInsegna) {
    const storeOffers = offerte
      .filter(o => o.insegna === selectedInsegna)
      .sort((a, b) => a.prezzo - b.prezzo);
      
    const headerColor = COLORI_INSEGNE[selectedInsegna] || COLORI_INSEGNE['default'];

    return (
      <div className="flex flex-col h-full bg-gray-50 pb-20">
        <div className={`px-4 py-4 shadow-sm flex items-center gap-3 sticky top-0 z-10 ${headerColor}`}>
          <button 
            onClick={() => setSelectedInsegna(null)} 
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold leading-tight">{selectedInsegna}</h2>
            <p className="text-xs opacity-90">{storeOffers.length} offerte disponibili</p>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {storeOffers.length > 0 ? (
            storeOffers.map(offerta => (
              <ProductCard key={offerta.id} offerta={offerta} />
            ))
          ) : (
            <div className="text-center py-10 text-gray-500">
              Nessuna offerta trovata.
            </div>
          )}
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
          {statoVolantini.map(stato => {
            const colorClasses = getColorInsegna(stato.insegna);
            return (
              <button
                key={stato.id}
                onClick={() => setSelectedInsegna(stato.insegna)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm hover:shadow-md transition-all h-32 active:scale-95 ${colorClasses}`}
              >
                <span className="text-lg font-bold text-center leading-tight mb-2">
                  {stato.insegna}
                </span>
                <span className="bg-white/25 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
                  {stato.n_prodotti} offerte
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7b. TAB RESOCONTO (Sprint D)
// ==========================================



const COLORI_CATEGORIE = {
  dispensa: { bg: '#647144', light: '#EEF2E8', label: 'Dispensa' },
  carne: { bg: '#C0392B', light: '#FDECEA', label: 'Carne' },
  bevande: { bg: '#1565C0', light: '#E8F0FE', label: 'Bevande' },
  frutta_verdura: { bg: '#2E7D32', light: '#E8F5E9', label: 'Frutta/Verdura' },
  freschissimi: { bg: '#00838F', light: '#E0F7FA', label: 'Freschissimi' },
  surgelati: { bg: '#4527A0', light: '#EDE7F6', label: 'Surgelati' },
  casa_igiene: { bg: '#D47A4A', light: '#FBF0E8', label: 'Casa & Igiene' },
  pesce: { bg: '#0277BD', light: '#E1F5FE', label: 'Pesce' },
  altro: { bg: '#78909C', light: '#ECEFF1', label: 'Altro' },
};

const MESI_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const TabResoconto = ({ uid }) => {
  const [scontrini, setScontrini] = useState([]);
  const [loadingS, setLoadingS] = useState(true);
  const [scontriniAperti, setScontriniAperti] = useState({});
  const [meseSel, setMeseSel] = useState(null); // null = ultimi 3 mesi

  useEffect(() => {
    const fetchScontrini = async () => {
      if (!uid) {
        // Nessun utente loggato: empty state
        setLoadingS(false);
        return;
      }
      try {
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const q = query(
          collection(db, 'prezzi_scontrini'),
          where('uid', '==', uid),
          orderBy('data_acquisto', 'desc')
        );
        const snap = await getDocs(q);
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setScontrini(lista);
      } catch (err) {
        console.error('Errore fetch scontrini:', err);
        setScontrini([]);
      } finally {
        setLoadingS(false);
      }
    };
    fetchScontrini();
  }, [uid]);

  // ---- Calcoli aggregati ----
  const oggi = new Date();
  const treMe = new Date(oggi);
  treMe.setMonth(oggi.getMonth() - 3);

  const scontriniRecenti = scontrini.filter(s => new Date(s.data_acquisto) >= treMe);

  // Spesa mensile
  const spesaMensile = useMemo(() => {
    const map = {};
    scontrini.forEach(s => {
      const d = new Date(s.data_acquisto);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map[key] = (map[key] || 0) + s.totale_scontrino;
    });
    // Ultimi 4 mesi
    const result = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(oggi);
      d.setMonth(oggi.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      result.push({
        label: MESI_IT[d.getMonth()],
        key,
        totale: Math.round((map[key] || 0) * 100) / 100,
      });
    }
    return result;
  }, [scontrini]);

  const maxMensile = Math.max(...spesaMensile.map(m => m.totale), 1);

  // Spesa per categoria (periodo recente)
  const spesaCategoria = useMemo(() => {
    const map = {};
    scontriniRecenti.forEach(s => {
      s.prodotti.forEach(p => {
        const cat = p.categoria || 'altro';
        map[cat] = (map[cat] || 0) + p.prezzo;
      });
    });
    return Object.entries(map)
      .map(([cat, tot]) => ({ cat, tot: Math.round(tot * 100) / 100 }))
      .sort((a, b) => b.tot - a.tot);
  }, [scontriniRecenti]);

  const totaleCat = spesaCategoria.reduce((s, c) => s + c.tot, 0) || 1;

  // Analisi prodotto "latte" nel tempo
  const analisiLatte = useMemo(() => {
    const occorrenze = [];
    scontrini.forEach(s => {
      s.prodotti.forEach(p => {
        if (p.nome.toLowerCase().includes('latte')) {
          occorrenze.push({ data: s.data_acquisto, prezzo: p.prezzo, insegna: s.insegna });
        }
      });
    });
    occorrenze.sort((a, b) => new Date(a.data) - new Date(b.data));
    return occorrenze;
  }, [scontrini]);

  const varLatte = analisiLatte.length >= 2
    ? ((analisiLatte[analisiLatte.length - 1].prezzo - analisiLatte[0].prezzo) / analisiLatte[0].prezzo * 100).toFixed(0)
    : null;

  const totaleRecente = scontriniRecenti.reduce((s, c) => s + c.totale_scontrino, 0);

  if (loadingS) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="animate-spin w-8 h-8 border-4 border-[#647144] border-t-transparent rounded-full mb-3" />
        <p className="text-sm text-[#858A7A]">Carico i tuoi scontrini…</p>
      </div>
    );
  }

  // ---- EMPTY STATE ----
  if (scontrini.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-20">
        <div className="w-20 h-20 bg-[#EEF2E8] rounded-full flex items-center justify-center mb-5">
          <Receipt size={36} className="text-[#647144]" />
        </div>
        <h2 className="text-xl font-bold text-[#2C3026] mb-2" style={{fontFamily:'Lora,Georgia,serif'}}>
          Nessuno scontrino ancora
        </h2>
        <p className="text-[#858A7A] text-sm leading-relaxed mb-6">
          Carica i tuoi scontrini dalla tab <strong>Scontrino</strong> per vedere il tuo resoconto spese personalizzato.
        </p>
        <div className="bg-[#F9F8F4] border border-[#EBE6DC] rounded-2xl p-4 text-left w-full">
          <p className="text-xs font-semibold text-[#647144] uppercase tracking-wider mb-2">Con il resoconto puoi</p>
          <ul className="space-y-2 text-sm text-[#2C3026]">
            <li className="flex gap-2"><BarChart2 size={16} className="text-[#647144] shrink-0 mt-0.5" /> Grafico spesa mensile per categoria</li>
            <li className="flex gap-2"><TrendingUp size={16} className="text-[#D47A4A] shrink-0 mt-0.5" /> Scopri se i prezzi stanno salendo</li>
            <li className="flex gap-2"><TrendingDown size={16} className="text-[#647144] shrink-0 mt-0.5" /> Trova dove spendi di più</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto hide-scrollbar bg-[#F9F8F4] pb-24">
      
      {/* Header */}
      <div className="bg-[#647144] px-5 py-6 rounded-b-[28px]">
        <h2 className="text-white text-xl font-bold mb-0.5" style={{fontFamily:'Lora,Georgia,serif'}}>Le tue spese</h2>
        <p className="text-[#C8D4B0] text-xs">Ultimi 3 mesi · {scontriniRecenti.length} scontrini</p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-white/15 rounded-2xl px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[#C8D4B0] text-[10px] uppercase tracking-wider">Totale speso</p>
            <p className="text-white text-xl font-bold mt-0.5">
              {formattaPrezzo(totaleRecente)}
            </p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[#C8D4B0] text-[10px] uppercase tracking-wider">Media mensile</p>
            <p className="text-white text-xl font-bold mt-0.5">
              {formattaPrezzo(totaleRecente / 3)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Grafico mensile */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-[#EBE6DC]">
          <p className="text-xs font-semibold text-[#858A7A] uppercase tracking-wider mb-4">Spesa per mese</p>
          <div className="flex items-end gap-2 h-28">
            {spesaMensile.map((m) => {
              const h = maxMensile > 0 ? Math.max((m.totale / maxMensile) * 100, 4) : 4;
              const isCurrent = m.label === MESI_IT[oggi.getMonth()];
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[#2C3026]">
                    {m.totale > 0 ? `€${m.totale.toFixed(0)}` : ''}
                  </span>
                  <div className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${h}%`,
                      backgroundColor: isCurrent ? '#647144' : '#C8D4B0',
                      minHeight: 4
                    }}
                  />
                  <span className={`text-[10px] font-medium ${isCurrent ? 'text-[#647144]' : 'text-[#858A7A]'}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spesa per categoria */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-[#EBE6DC]">
          <p className="text-xs font-semibold text-[#858A7A] uppercase tracking-wider mb-3">Dove spendi di più</p>
          <div className="space-y-2.5">
            {spesaCategoria.map(({ cat, tot }) => {
              const cfg = COLORI_CATEGORIE[cat] || COLORI_CATEGORIE.altro;
              const pct = Math.round((tot / totaleCat) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#2C3026]">{cfg.label}</span>
                    <span className="text-[#858A7A]">{formattaPrezzo(tot)} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-[#EBE6DC] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: cfg.bg }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analisi differenziale latte */}
        {varLatte !== null && (
          <div className={`rounded-[20px] p-4 border flex gap-3 items-start ${
            Number(varLatte) > 0
              ? 'bg-[#FBF0E8] border-[#F0C8A8]'
              : 'bg-[#EEF2E8] border-[#C8D4B0]'
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${Number(varLatte) > 0 ? 'bg-[#D47A4A]' : 'bg-[#647144]'}`}>
              {Number(varLatte) > 0
                ? <TrendingUp size={18} className="text-white" />
                : <TrendingDown size={18} className="text-white" />
              }
            </div>
            <div>
              <p className="text-sm font-bold text-[#2C3026]">
                Il latte è {Number(varLatte) > 0 ? 'salito' : 'sceso'} del {Math.abs(varLatte)}%
              </p>
              <p className="text-xs text-[#858A7A] mt-0.5">
                Da {formattaPrezzo(analisiLatte[0].prezzo)} a {formattaPrezzo(analisiLatte[analisiLatte.length - 1].prezzo)} in {analisiLatte.length} acquisti registrati
              </p>
            </div>
          </div>
        )}

        {/* Lista scontrini */}
        <div className="bg-white rounded-[20px] shadow-sm border border-[#EBE6DC] overflow-hidden">
          <p className="text-xs font-semibold text-[#858A7A] uppercase tracking-wider px-4 pt-4 pb-3">Scontrini recenti</p>
          <div className="divide-y divide-[#EBE6DC]">
            {scontrini.slice(0, 8).map(s => {
              const aperto = scontriniAperti[s.id];
              const d = new Date(s.data_acquisto);
              const dataFmt = `${d.getDate()} ${MESI_IT[d.getMonth()]} ${d.getFullYear()}`;
              const badgeColor = getColorInsegna(s.insegna);
              return (
                <div key={s.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F9F8F4]"
                    onClick={() => setScontriniAperti(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#EBE6DC] flex items-center justify-center shrink-0">
                      <Receipt size={18} className="text-[#647144]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>{s.insegna}</span>
                        <span className="text-[11px] text-[#858A7A]">{dataFmt}</span>
                      </div>
                      <p className="text-[11px] text-[#858A7A] truncate">{s.indirizzo}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="font-bold text-[#2C3026]">{formattaPrezzo(s.totale_scontrino)}</span>
                      {aperto ? <ChevronUp size={14} className="text-[#858A7A]" /> : <ChevronDown size={14} className="text-[#858A7A]" />}
                    </div>
                  </button>
                  {aperto && (
                    <div className="bg-[#F9F8F4] px-4 pb-3 space-y-1.5">
                      {s.prodotti.map((p, i) => {
                        const cfg = COLORI_CATEGORIE[p.categoria] || COLORI_CATEGORIE.altro;
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.bg }} />
                            <span className="flex-1 text-[#2C3026] text-xs">{p.nome}</span>
                            <span className="text-xs font-semibold text-[#2C3026]">{formattaPrezzo(p.prezzo)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invito a caricare più scontrini */}
        <div className="bg-[#EEF2E8] border border-[#C8D4B0] rounded-[20px] p-4 flex gap-3 items-center">
          <Camera size={28} className="text-[#647144] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#2C3026]">Aggiungi più scontrini</p>
            <p className="text-xs text-[#858A7A] mt-0.5">Più ne carichi, più precise saranno le analisi</p>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 8. APP PRINCIPALE
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState('offerte');
  const [offerte, setOfferte] = useState([]);
  const [statoVolantini, setStatoVolantini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Inizializza Firebase una sola volta e sottoscrivi auth state
  useEffect(() => {
    if (firebaseConfig.apiKey === "INSERISCI_QUI") return;
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Se c'è il placeholder o siamo in un ambiente senza credenziali, usa il Mock
        if (firebaseConfig.apiKey === "INSERISCI_QUI") {
          console.warn("Firebase non configurato. Avvio in Demo Mode con dati mock.");
          setOfferte(MOCK_OFFERTE);
          setStatoVolantini(MOCK_STATO);
          setIsDemoMode(true);
          setLoading(false);
          return;
        }

        // Setup reale Firebase (Sola lettura)
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // Fetch Offerte
        const offerteCol = collection(db, 'offerte_attive');
        const offerteSnapshot = await getDocs(offerteCol);
        const offerteList = offerteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch Stato
        const statoCol = collection(db, 'stato_volantini');
        const statoSnapshot = await getDocs(statoCol);
        const statoList = statoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (offerteList.length === 0) {
          setError("Nessuna offerta disponibile questa settimana.");
        } else {
          setOfferte(offerteList);
          setStatoVolantini(statoList);
        }
      } catch (err) {
        console.error("Errore fetch Firebase:", err);
        // Fallback a Demo se Firebase fallisce (es. regole sicurezza)
        setOfferte(MOCK_OFFERTE);
        setStatoVolantini(MOCK_STATO);
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-green-600">
        <ShoppingCart size={48} className="animate-bounce mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RomaRisparmia</h1>
        <p className="text-gray-500 flex items-center gap-2">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></span>
          Scaricando le offerte...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white shadow-2xl relative font-sans text-gray-900 overflow-hidden">
      
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-400 text-yellow-900 text-[10px] uppercase font-bold text-center py-1 tracking-widest z-50 relative">
          Modalità Demo (Dati Fittizi)
        </div>
      )}

      {/* Main Content Area */}
      <div className="h-screen overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {error && !isDemoMode ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {activeTab === 'offerte' && <TabOfferte offerte={offerte} />}
            {activeTab === 'negozi' && <TabSupermercati offerte={offerte} statoVolantini={statoVolantini} />}
            {activeTab === 'lista' && <TabListaSpesa offerte={offerte} />}
            {activeTab === 'resoconto' && <TabResoconto uid={currentUser?.uid ?? null} />}
            {activeTab === 'stato' && <TabStato statoVolantini={statoVolantini} />}
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] z-50 flex justify-around">
        <button 
          onClick={() => setActiveTab('offerte')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'offerte' ? 'text-[#647144]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Tag size={22} className={activeTab === 'offerte' ? 'fill-[#EEF2E8]' : ''} />
          <span className="text-[9px] mt-1 font-medium">Offerte</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('negozi')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'negozi' ? 'text-[#647144]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Store size={22} className={activeTab === 'negozi' ? 'fill-[#EEF2E8]' : ''} />
          <span className="text-[9px] mt-1 font-medium">Negozi</span>
        </button>

        <button 
          onClick={() => setActiveTab('lista')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'lista' ? 'text-[#647144]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <ListTodo size={22} />
          <span className="text-[9px] mt-1 font-medium">Spesa</span>
        </button>

        <button 
          onClick={() => setActiveTab('resoconto')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'resoconto' ? 'text-[#647144]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BarChart2 size={22} />
          <span className="text-[9px] mt-1 font-medium">Spese</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('stato')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${activeTab === 'stato' ? 'text-[#647144]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Info size={22} />
          <span className="text-[9px] mt-1 font-medium">Stato</span>
        </button>
      </div>
      
      {/* FIX: Rimosso dangerouslySetInnerHTML, uso del tag style di React */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}