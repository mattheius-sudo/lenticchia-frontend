"""
Lenticchia — Benchmark Prezzi
==============================
Modulo condiviso importato da:
  - scraper_vision.py      → aggiorna_statistiche_batch()  (popola il db)
  - processa_volantini.py  → valida_prezzo_completo()      (blocca anomalie)
  - processa_scontrini.py  → valida_prezzo_completo()      (flagga per revisione)

Logica a due strati:
  Strato 1 — Range assoluti hard-coded per categoria.
             Cattura errori grossolani (bistecca €0.20/kg, pasta €50).
             Non richiede dati storici — funziona dal primo giorno.

  Strato 2 — Distribuzione statistica da statistiche_prodotti in Firestore.
             Cattura anomalie contestuali (prodotto a 5x la media storica).
             Usa media per-insegna se n >= MIN_CAMPIONI, altrimenti media globale.
             Diventa più preciso ad ogni run dello scraper.

Schema statistiche_prodotti/{nome_key}:
  nome_key = nome normalizzato (lowercase, spazi→underscore, no caratteri speciali)
  {
    nome_originale: str,
    categoria: str,
    media_globale: float,
    stddev_globale: float,
    n_globale: int,
    min_assoluto: float,
    max_assoluto: float,
    per_insegna: {
      "lidl":   { media: float, n: int, min: float, max: float },
      "eurospin": { ... },
      ...
    },
    ultimo_aggiornamento: str  (ISO timestamp)
  }
"""

import re
import math
import datetime


# ─────────────────────────────────────────────────────────────
# COSTANTI
# ─────────────────────────────────────────────────────────────

MIN_CAMPIONI_INSEGNA = 5   # sotto questa soglia usa media globale
MIN_CAMPIONI_GLOBALE = 3   # sotto questa soglia non fa confronto statistico

# Moltiplicatori rispetto alla media per classificare anomalie
FATTORE_ALTO_BLOCCANTE = 5.0   # prezzo > media * 5  → bloccante
FATTORE_ALTO_SOSPETTO  = 3.0   # prezzo > media * 3  → sospetto
FATTORE_BASSO_BLOCCANTE = 0.12 # prezzo < media * 12% → bloccante
FATTORE_BASSO_SOSPETTO  = 0.25 # prezzo < media * 25% → sospetto


# ─────────────────────────────────────────────────────────────
# STRATO 1: RANGE ASSOLUTI PER CATEGORIA
# ─────────────────────────────────────────────────────────────
# (min €, max €) per unità/confezione — mercato GDO italiano 2026.
# Aggiornare se l'inflazione supera il 20% cumulativo.

RANGE_CATEGORIA = {
    'carne':          (0.50,  80.0),
    'pesce':          (0.50,  60.0),
    'frutta_verdura': (0.10,  25.0),
    'latticini':      (0.15,  30.0),
    'dispensa':       (0.09,  40.0),
    'freschissimi':   (0.20,  25.0),
    'bevande':        (0.09,  30.0),
    'surgelati':      (0.50,  30.0),
    'casa_igiene':    (0.20,  40.0),
    'gastronomia':    (0.50,  80.0),
    'altro':          (0.05, 200.0),
}

RANGE_PREZZO_KG = {
    'carne':          (2.0,  120.0),
    'pesce':          (3.0,   80.0),
    'frutta_verdura': (0.20,  80.0),
    'latticini':      (1.0,   60.0),
    'dispensa':       (0.10,  80.0),
    'freschissimi':   (1.5,   80.0),
    'bevande':        (0.05,  30.0),
    'surgelati':      (1.0,   40.0),
    'casa_igiene':    (0.20,  30.0),
    'gastronomia':    (2.0,   80.0),
    'altro':          (0.05, 200.0),
}


# ─────────────────────────────────────────────────────────────
# UTILITÀ
# ─────────────────────────────────────────────────────────────

def normalizza_nome(nome: str) -> str:
    """
    Chiave canonica per statistiche_prodotti.
    Es: "Pasta Fusilli Barilla 500g" → "pasta_fusilli_barilla_500g"
    """
    if not nome:
        return 'sconosciuto'
    n = nome.lower().strip()
    n = re.sub(r'[^\w\s]', '', n)       # rimuovi punteggiatura
    n = re.sub(r'\s+', '_', n)          # spazi → underscore
    n = re.sub(r'_+', '_', n).strip('_')
    return n[:120]                       # max 120 char per chiave Firestore


def normalizza_insegna(insegna: str) -> str:
    """Chiave insegna per per_insegna dict."""
    return re.sub(r'\W+', '_', (insegna or '').lower().strip()).strip('_')


# ─────────────────────────────────────────────────────────────
# STRATO 1: VALIDAZIONE RANGE ASSOLUTI
# ─────────────────────────────────────────────────────────────

def _strato1(prezzo: float, categoria: str,
             prezzo_kg: float | None) -> dict:
    """
    Controlla range assoluti. Veloce, zero Firestore.
    Ritorna { ok, severita, motivo }.
    """
    if not prezzo or prezzo <= 0:
        return {'ok': False, 'severita': 'bloccante',
                'motivo': f'Prezzo assente o zero ({prezzo})'}

    cat = (categoria or 'altro').lower().strip()
    rng = RANGE_CATEGORIA.get(cat, RANGE_CATEGORIA['altro'])
    mn, mx = rng

    if prezzo < mn:
        sev = 'bloccante' if prezzo < mn * 0.5 else 'sospetto'
        return {'ok': False, 'severita': sev,
                'motivo': f'€{prezzo:.2f} troppo basso per "{cat}" (min atteso €{mn:.2f})'}

    if prezzo > mx:
        sev = 'bloccante' if prezzo > mx * 2 else 'sospetto'
        return {'ok': False, 'severita': sev,
                'motivo': f'€{prezzo:.2f} troppo alto per "{cat}" (max atteso €{mx:.2f})'}

    # Prezzo al kg (se disponibile)
    if prezzo_kg and prezzo_kg > 0:
        rkg = RANGE_PREZZO_KG.get(cat, RANGE_PREZZO_KG['altro'])
        mnk, mxk = rkg
        if prezzo_kg < mnk:
            return {'ok': False, 'severita': 'bloccante',
                    'motivo': f'€{prezzo_kg:.2f}/kg troppo basso per "{cat}" (min €{mnk:.2f}/kg)'}
        if prezzo_kg > mxk:
            return {'ok': False, 'severita': 'sospetto',
                    'motivo': f'€{prezzo_kg:.2f}/kg molto alto per "{cat}" (max atteso €{mxk:.2f}/kg)'}

    return {'ok': True, 'severita': None, 'motivo': None}


# ─────────────────────────────────────────────────────────────
# STRATO 2: VALIDAZIONE STATISTICA
# ─────────────────────────────────────────────────────────────

def _strato2(prezzo: float, nome_key: str,
             insegna_key: str, stat: dict) -> dict:
    """
    Confronta il prezzo con la distribuzione storica.
    stat = documento da statistiche_prodotti (già letto da Firestore).
    Ritorna { ok, severita, motivo, media_usata, fonte_media }.
    """
    if not stat:
        return {'ok': True, 'severita': None, 'motivo': None,
                'media_usata': None, 'fonte_media': 'nessuna_statistica'}

    # Scegli media: per-insegna se ci sono abbastanza campioni, altrimenti globale
    per_insegna = stat.get('per_insegna', {})
    stat_insegna = per_insegna.get(insegna_key, {})
    n_insegna = stat_insegna.get('n', 0)

    if n_insegna >= MIN_CAMPIONI_INSEGNA:
        media = stat_insegna['media']
        fonte = f'per_insegna ({insegna_key}, n={n_insegna})'
    else:
        n_globale = stat.get('n_globale', 0)
        if n_globale < MIN_CAMPIONI_GLOBALE:
            return {'ok': True, 'severita': None, 'motivo': None,
                    'media_usata': None, 'fonte_media': f'campioni_insufficienti (n={n_globale})'}
        media = stat.get('media_globale', 0)
        fonte = f'globale (n={n_globale})'

    if not media or media <= 0:
        return {'ok': True, 'severita': None, 'motivo': None,
                'media_usata': None, 'fonte_media': 'media_zero'}

    rapporto = prezzo / media

    if rapporto > FATTORE_ALTO_BLOCCANTE:
        return {'ok': False, 'severita': 'bloccante',
                'motivo': f'€{prezzo:.2f} è {rapporto:.1f}x la media storica €{media:.2f} [{fonte}]',
                'media_usata': media, 'fonte_media': fonte}

    if rapporto > FATTORE_ALTO_SOSPETTO:
        return {'ok': False, 'severita': 'sospetto',
                'motivo': f'€{prezzo:.2f} è {rapporto:.1f}x la media storica €{media:.2f} [{fonte}]',
                'media_usata': media, 'fonte_media': fonte}

    if rapporto < FATTORE_BASSO_BLOCCANTE:
        return {'ok': False, 'severita': 'bloccante',
                'motivo': f'€{prezzo:.2f} è solo il {rapporto*100:.0f}% della media storica €{media:.2f} [{fonte}]',
                'media_usata': media, 'fonte_media': fonte}

    if rapporto < FATTORE_BASSO_SOSPETTO:
        return {'ok': False, 'severita': 'sospetto',
                'motivo': f'€{prezzo:.2f} è solo il {rapporto*100:.0f}% della media storica €{media:.2f} [{fonte}]',
                'media_usata': media, 'fonte_media': fonte}

    return {'ok': True, 'severita': None, 'motivo': None,
            'media_usata': media, 'fonte_media': fonte}


# ─────────────────────────────────────────────────────────────
# FUNZIONE PRINCIPALE: VALIDAZIONE COMPLETA
# ─────────────────────────────────────────────────────────────

def valida_prezzo_completo(nome: str, prezzo: float, categoria: str,
                           insegna: str, prezzo_kg: float | None,
                           db=None) -> dict:
    """
    Valida un prezzo su entrambi gli strati.

    Args:
        nome:       nome prodotto (usato per lookup statistiche)
        prezzo:     prezzo unitario
        categoria:  categoria prodotto
        insegna:    nome insegna (per lookup per-insegna)
        prezzo_kg:  prezzo al kg/litro (opzionale)
        db:         client Firestore (opzionale — senza db salta strato 2)

    Returns:
        {
          'ok': bool,                   # False se anomalia bloccante o sospetta
          'severita': None|'sospetto'|'bloccante',
          'motivo': str|None,
          'strato': '1_range'|'2_statistica'|None,
          'media_di_riferimento': float|None
        }
    """
    # Strato 1
    r1 = _strato1(prezzo, categoria, prezzo_kg)
    if not r1['ok']:
        return {
            'ok': False,
            'severita': r1['severita'],
            'motivo': r1['motivo'],
            'strato': '1_range',
            'media_di_riferimento': None,
        }

    # Strato 2 (solo se db disponibile)
    if db:
        nome_key = normalizza_nome(nome)
        insegna_key = normalizza_insegna(insegna)
        try:
            stat_doc = db.collection('statistiche_prodotti').document(nome_key).get()
            stat = stat_doc.to_dict() if stat_doc.exists else None
        except Exception:
            stat = None

        r2 = _strato2(prezzo, nome_key, insegna_key, stat)
        if not r2['ok']:
            return {
                'ok': False,
                'severita': r2['severita'],
                'motivo': r2['motivo'],
                'strato': '2_statistica',
                'media_di_riferimento': r2.get('media_usata'),
            }

    return {
        'ok': True,
        'severita': None,
        'motivo': None,
        'strato': None,
        'media_di_riferimento': None,
    }


# ─────────────────────────────────────────────────────────────
# AGGIORNAMENTO STATISTICHE (chiamato dallo scraper)
# ─────────────────────────────────────────────────────────────

def aggiorna_statistiche_batch(db, prodotti: list, dry_run: bool = False):
    """
    Aggiorna statistiche_prodotti con i dati appena scrappati.
    Usa upsert per accumulare campioni nel tempo, non sovrascrivere.

    Chiamato in scraper_vision.py dopo il batch.commit() finale.

    prodotti: lista di dict con campi nome, prezzo, categoria, insegna, prezzo_kg
    """
    if not prodotti:
        return

    timestamp = datetime.datetime.now().isoformat()
    print(f"\n📊 Aggiornamento statistiche_prodotti ({len(prodotti)} prodotti)...")

    # Raggruppa per nome_key per minimizzare le letture Firestore
    per_nome: dict[str, list] = {}
    for p in prodotti:
        nome = p.get('nome') or p.get('nome_normalizzato') or ''
        prezzo = p.get('prezzo') or p.get('prezzo_unitario')
        if not nome or not prezzo or prezzo <= 0:
            continue
        key = normalizza_nome(nome)
        if key not in per_nome:
            per_nome[key] = []
        per_nome[key].append(p)

    if dry_run:
        print(f"  [DRY RUN] Aggiornerei {len(per_nome)} voci in statistiche_prodotti")
        return

    coll = db.collection('statistiche_prodotti')
    ok_count = 0
    err_count = 0

    for nome_key, ps in per_nome.items():
        try:
            doc_ref = coll.document(nome_key)
            doc_snap = doc_ref.get()
            esistente = doc_snap.to_dict() if doc_snap.exists else {}

            # ── Costruisci aggiornamento incrementale ────────────────
            # Leggi valori esistenti
            prezzi_globali_old = []
            # Non possiamo ricostruire la lista dal solo mean/stddev
            # ma possiamo fare Welford online update:
            # new_mean = (old_mean * old_n + nuovi_prezzi) / (old_n + len(nuovi))
            n_old = esistente.get('n_globale', 0)
            media_old = esistente.get('media_globale', 0.0)
            min_old = esistente.get('min_assoluto', float('inf'))
            max_old = esistente.get('max_assoluto', 0.0)
            per_insegna_old = esistente.get('per_insegna', {})

            # Nuovi prezzi da questo batch
            nuovi_prezzi = [p.get('prezzo') or p.get('prezzo_unitario')
                           for p in ps if (p.get('prezzo') or p.get('prezzo_unitario', 0)) > 0]
            if not nuovi_prezzi:
                continue

            n_nuovi = len(nuovi_prezzi)

            # Welford update per media globale
            n_new = n_old + n_nuovi
            if n_old == 0:
                media_new = sum(nuovi_prezzi) / n_nuovi
            else:
                media_new = (media_old * n_old + sum(nuovi_prezzi)) / n_new

            min_new = min(min_old, min(nuovi_prezzi))
            max_new = max(max_old, max(nuovi_prezzi))

            # Stddev approssimata (solo sui nuovi campioni se non abbiamo storico)
            if n_nuovi >= 2:
                mean_n = sum(nuovi_prezzi) / n_nuovi
                variance = sum((x - mean_n) ** 2 for x in nuovi_prezzi) / (n_nuovi - 1)
                stddev_new = variance ** 0.5
            else:
                stddev_new = esistente.get('stddev_globale', 0.0)

            # Aggiorna per_insegna con Welford per ogni insegna
            per_insegna_new = dict(per_insegna_old)
            # Raggruppa nuovi prezzi per insegna
            per_insegna_nuovi: dict[str, list] = {}
            for p in ps:
                ins_key = normalizza_insegna(p.get('insegna', ''))
                pr = p.get('prezzo') or p.get('prezzo_unitario', 0)
                if ins_key and pr > 0:
                    per_insegna_nuovi.setdefault(ins_key, []).append(pr)

            for ins_key, prezzi_ins in per_insegna_nuovi.items():
                old_ins = per_insegna_new.get(ins_key, {})
                n_ins_old = old_ins.get('n', 0)
                media_ins_old = old_ins.get('media', 0.0)
                n_ins_new = n_ins_old + len(prezzi_ins)
                if n_ins_old == 0:
                    media_ins_new = sum(prezzi_ins) / len(prezzi_ins)
                else:
                    media_ins_new = (media_ins_old * n_ins_old + sum(prezzi_ins)) / n_ins_new

                per_insegna_new[ins_key] = {
                    'media': round(media_ins_new, 4),
                    'n':     n_ins_new,
                    'min':   min(old_ins.get('min', float('inf')), min(prezzi_ins)),
                    'max':   max(old_ins.get('max', 0.0), max(prezzi_ins)),
                }

            # Scrittura upsert
            doc_ref.set({
                'nome_originale':      ps[0].get('nome') or ps[0].get('nome_normalizzato', nome_key),
                'categoria':           (ps[0].get('categoria') or 'altro').lower(),
                'n_globale':           n_new,
                'media_globale':       round(media_new, 4),
                'stddev_globale':      round(stddev_new, 4),
                'min_assoluto':        round(min_new, 4),
                'max_assoluto':        round(max_new, 4),
                'per_insegna':         per_insegna_new,
                'ultimo_aggiornamento': timestamp,
            }, merge=False)  # sovrascriviamo — i valori sono già incrementali

            ok_count += 1

        except Exception as e:
            print(f"  ⚠️  Errore statistiche per '{nome_key}': {e}")
            err_count += 1

    print(f"  ✅ Statistiche aggiornate: {ok_count} prodotti | {err_count} errori")
