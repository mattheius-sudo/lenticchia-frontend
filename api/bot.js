// api/bot.js
// Webhook Telegram per il bot Lenticchia.
// Deployato su Vercel come funzione serverless — sempre attivo, costo zero.
//
// Setup (una volta sola):
//   1. Aggiungi le variabili d'ambiente su Vercel:
//      TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, FIREBASE_CREDENTIALS
//   2. Registra il webhook su Telegram:
//      https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://lenticchia.app/api/bot
//   3. Manda /help al bot per verificare

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Firebase Admin (server-side) ────────────────────────────────────────────

function getDb() {
  if (!getApps().length) {
    const creds = JSON.parse(process.env.FIREBASE_CREDENTIALS || '{}');
    initializeApp({ credential: cert(creds) });
  }
  return getFirestore();
}

// ─── Telegram helper ──────────────────────────────────────────────────────────

async function rispondi(token, chatId, testo) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: testo, parse_mode: 'HTML' }),
  });
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

function pdfKey(insegna, quartiere) {
  return (
    insegna.toLowerCase().replace(/\//g, '_').replace(/ /g, '_') +
    '_' +
    quartiere.toLowerCase().replace(/ /g, '_')
  );
}

// ─── Comandi ──────────────────────────────────────────────────────────────────

async function cmdHelp() {
  return (
    '🌿 <b>Lenticchia Bot — Comandi</b>\n\n' +
    '<b>/lista</b>\n  Tutti i supermercati configurati\n\n' +
    '<b>/status</b>\n  Stato volantini con scadenze\n\n' +
    '<b>/aggiungi Nome|Zona|tipo|url</b>\n' +
    '  Aggiunge un supermercato\n' +
    '  tipo: <code>locale</code> o <code>nazionale</code>\n\n' +
    '<b>/aggiorna chiave|url</b>\n  Aggiorna URL PDF\n\n' +
    '<b>/disattiva chiave</b>\n  Disattiva supermercato\n\n' +
    '<b>/riattiva chiave</b>\n  Riattiva supermercato\n\n' +
    '<b>/info chiave</b>\n  Dettagli supermercato\n\n' +
    '⚠️ Per lanciare lo scraper usa GitHub Actions.'
  );
}

async function cmdLista(db) {
  try {
    const snap = await db.collection('config_scraper').get();
    if (snap.empty) return '📋 Nessun supermercato configurato.\n\nUsa /aggiungi per aggiungerne uno.';

    const attivi = [], disattivi = [];
    snap.docs
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach(doc => {
        const d = doc.data();
        const tipo = d.tipo === 'nazionale' ? '🌍' : '📍';
        const riga = `${tipo} <b>${d.insegna}</b> — ${d.quartiere}\n   <code>${doc.id}</code>`;
        if (d.attivo !== false) attivi.push(riga);
        else disattivi.push(`⚫ ${riga} (disattivo)`);
      });

    let testo = '📋 <b>Supermercati configurati</b>\n\n';
    if (attivi.length) testo += '<b>Attivi:</b>\n' + attivi.join('\n\n');
    if (disattivi.length) testo += '\n\n<b>Disattivati:</b>\n' + disattivi.join('\n\n');
    return testo;
  } catch (e) {
    return `❌ Errore: ${e.message}`;
  }
}

async function cmdStatus(db) {
  try {
    const snap = await db.collection('stato_volantini').get();
    if (snap.empty) return '⚠️ Nessun dato — scraper non ancora eseguito.';

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const righe = [];

    snap.docs
      .sort((a, b) => (a.data().insegna || '').localeCompare(b.data().insegna || ''))
      .forEach(doc => {
        const d = doc.data();
        const insegna = d.insegna || doc.id;
        const quartiere = d.quartiere || '';
        const n = d.n_prodotti || 0;
        const fino = d.valido_fino;
        let stato = '❓ Data non disponibile';

        if (fino) {
          const dataFine = new Date(fino);
          const giorni = Math.ceil((dataFine - oggi) / 86400000);
          if (giorni < 0) stato = `🔴 SCADUTO (${Math.abs(giorni)}gg fa)`;
          else if (giorni <= 2) stato = `🟡 Scade tra ${giorni}gg`;
          else stato = `🟢 Valido fino al ${fino}`;
        }

        const sedi = Array.isArray(d.sedi) ? d.sedi.filter(s => s !== 'nazionale') : [];
        const sediStr = sedi.length ? `\n   Zone: ${sedi.slice(0, 3).join(', ')}${sedi.length > 3 ? '...' : ''}` : '';
        righe.push(`${stato}\n   <b>${insegna}</b> ${quartiere} · ${n} prodotti${sediStr}`);
      });

    return '📊 <b>Stato Volantini</b>\n\n' + righe.join('\n\n');
  } catch (e) {
    return `❌ Errore: ${e.message}`;
  }
}

async function cmdAggiungi(db, args) {
  const parti = args.split('|').map(p => p.trim());
  if (parti.length < 3) {
    return (
      '❌ Formato non valido.\n\n' +
      'Usa: <code>/aggiungi Nome|Zona|tipo|url</code>\n' +
      'Es: <code>/aggiungi Pewex|Centocelle|locale|https://...</code>\n\n' +
      'tipo: <code>locale</code> o <code>nazionale</code>\n' +
      'url è opzionale — aggiungilo dopo con /aggiorna'
    );
  }

  const insegna = parti[0];
  const quartiere = parti[1];
  const tipo = ['locale', 'nazionale'].includes(parti[2].toLowerCase()) ? parti[2].toLowerCase() : 'locale';
  const pdfUrl = parti[3] || '';
  const chiave = pdfKey(insegna, quartiere);
  const ora = new Date().toISOString();

  const docRef = db.collection('config_scraper').doc(chiave);
  const snap = await docRef.get();
  if (snap.exists) {
    return (
      `⚠️ <b>${insegna} — ${quartiere}</b> esiste già.\n\n` +
      `Usa /aggiorna ${chiave}|nuovo-url per cambiare l'URL.`
    );
  }

  await docRef.set({
    insegna, quartiere, tipo,
    sedi_default: tipo === 'nazionale' ? ['nazionale'] : [],
    pdf_url: pdfUrl,
    pdf_key: chiave,
    pdf_filename: `pdf_volantini/${chiave}.pdf`,
    attivo: true,
    aggiunto_il: ora,
    ultimo_aggiornamento: ora,
  });

  const urlStr = pdfUrl
    ? `\nURL: <code>${pdfUrl.slice(0, 60)}${pdfUrl.length > 60 ? '...' : ''}</code>`
    : `\n⚠️ URL non impostato — usa:\n<code>/aggiorna ${chiave}|url</code>`;

  return (
    `✅ <b>${insegna} — ${quartiere}</b> aggiunto!\n` +
    `Tipo: ${tipo}\nChiave: <code>${chiave}</code>${urlStr}\n\n` +
    `Verrà processato al prossimo run dello scraper.`
  );
}

async function cmdAggiorna(db, args) {
  const idx = args.indexOf('|');
  if (idx === -1) {
    return (
      '❌ Formato non valido.\n\n' +
      'Usa: <code>/aggiorna chiave|url</code>\n' +
      'Es: <code>/aggiorna sacoph_pietralata|https://...</code>\n\n' +
      'Usa /lista per vedere le chiavi.'
    );
  }

  const chiave = args.slice(0, idx).trim().toLowerCase();
  const nuovoUrl = args.slice(idx + 1).trim();

  const docRef = db.collection('config_scraper').doc(chiave);
  const snap = await docRef.get();
  if (!snap.exists) {
    return `❌ <code>${chiave}</code> non trovato.\n\nUsa /lista per vedere i supermercati.`;
  }

  await docRef.update({
    pdf_url: nuovoUrl,
    ultimo_aggiornamento: new Date().toISOString(),
  });

  return (
    `✅ URL aggiornato per <code>${chiave}</code>\n\n` +
    `<code>${nuovoUrl.slice(0, 80)}${nuovoUrl.length > 80 ? '...' : ''}</code>\n\n` +
    `Al prossimo run lo scraper scaricherà il nuovo PDF.`
  );
}

async function cmdDisattiva(db, chiave) {
  chiave = chiave.trim().toLowerCase();
  const docRef = db.collection('config_scraper').doc(chiave);
  const snap = await docRef.get();
  if (!snap.exists) return `❌ <code>${chiave}</code> non trovato.\n\nUsa /lista.`;

  const d = snap.data();
  await docRef.update({ attivo: false, ultimo_aggiornamento: new Date().toISOString() });
  return (
    `⚫ <b>${d.insegna} — ${d.quartiere}</b> disattivato.\n\n` +
    `Lo scraper lo salterà.\nUsa /riattiva ${chiave} per riabilitarlo.`
  );
}

async function cmdRiattiva(db, chiave) {
  chiave = chiave.trim().toLowerCase();
  const docRef = db.collection('config_scraper').doc(chiave);
  const snap = await docRef.get();
  if (!snap.exists) return `❌ <code>${chiave}</code> non trovato.\n\nUsa /lista.`;

  const d = snap.data();
  await docRef.update({ attivo: true, ultimo_aggiornamento: new Date().toISOString() });
  return (
    `✅ <b>${d.insegna} — ${d.quartiere}</b> riattivato.\n\n` +
    `Verrà processato al prossimo run dello scraper.`
  );
}

async function cmdInfo(db, chiave) {
  chiave = chiave.trim().toLowerCase();
  const snap = await db.collection('config_scraper').doc(chiave).get();
  if (!snap.exists) return `❌ <code>${chiave}</code> non trovato.\n\nUsa /lista.`;

  const d = snap.data();
  const url = d.pdf_url || '';
  const urlStr = url
    ? `<code>${url.slice(0, 70)}${url.length > 70 ? '...' : ''}</code>`
    : '⚠️ Non impostato';
  const sedi = Array.isArray(d.sedi_default) ? d.sedi_default : [];

  return (
    `📋 <b>${d.insegna} — ${d.quartiere}</b>\n\n` +
    `Chiave: <code>${chiave}</code>\n` +
    `Tipo: ${d.tipo || 'locale'}\n` +
    `Stato: ${d.attivo !== false ? '✅ Attivo' : '⚫ Disattivo'}\n` +
    `Sedi default: ${sedi.length ? sedi.join(', ') : 'estratte dalla copertina'}\n` +
    `URL PDF: ${urlStr}\n` +
    `Aggiunto: ${(d.aggiunto_il || '').slice(0, 10)}\n` +
    `Aggiornato: ${(d.ultimo_aggiornamento || '').slice(0, 10)}`
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function gestisciComando(db, testo) {
  const t = testo.trim();
  if (t === '/help' || t === '/start') return cmdHelp();
  if (t === '/lista') return cmdLista(db);
  if (t === '/status') return cmdStatus(db);
  if (t.startsWith('/aggiungi ')) return cmdAggiungi(db, t.slice(10));
  if (t.startsWith('/aggiorna ')) return cmdAggiorna(db, t.slice(10));
  if (t.startsWith('/disattiva ')) return cmdDisattiva(db, t.slice(11));
  if (t.startsWith('/riattiva ')) return cmdRiattiva(db, t.slice(10));
  if (t.startsWith('/info ')) return cmdInfo(db, t.slice(6));
  return '❓ Comando non riconosciuto.\n\nUsa /help per vedere i comandi.';
}

// ─── Handler Vercel ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel richiede risposta rapida — sempre 200 a Telegram
  // altrimenti Telegram rimanda il messaggio pensando che sia fallito
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, info: 'Lenticchia Bot webhook' });
  }

  const token = process.env.TELEGRAM_TOKEN;
  const chatIdAutorizzato = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatIdAutorizzato) {
    console.error('TELEGRAM_TOKEN o TELEGRAM_CHAT_ID non configurati');
    return res.status(200).json({ ok: false });
  }

  try {
    const update = req.body;
    const message = update?.message;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = String(message.chat?.id || '');
    const testo = (message.text || '').trim();

    // Sicurezza: risponde solo al chat_id autorizzato
    if (chatId !== String(chatIdAutorizzato)) {
      await rispondi(token, chatId, '⛔ Non autorizzato.');
      return res.status(200).json({ ok: true });
    }

    if (!testo.startsWith('/')) {
      await rispondi(token, chatId, 'Invia un comando. Usa /help per vedere cosa puoi fare.');
      return res.status(200).json({ ok: true });
    }

    const db = getDb();
    const risposta = await gestisciComando(db, testo);
    await rispondi(token, chatId, risposta);

  } catch (err) {
    console.error('Errore bot:', err);
    // Non lanciamo l'errore — Telegram deve ricevere 200
  }

  return res.status(200).json({ ok: true });
}
