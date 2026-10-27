// Xbox PostCode Web Serial Monitor
// Powered by Web Serial API & errors.xboxresearch.com definitions

// State
let port = null;
let reader = null;
let writer = null;
let isConnected = false;
let currentLanguage = 'tr';
let autoReconnect = false;
let autoScroll = true;
let showTimestamps = true;
let selectedLogIndex = null;

let rawLogs = [];
let logEntries = [];
let filteredLogs = [];

let metadata = {
    postcodes: [],
    errormasks: [],
    oserrors: [],
    updated: ''
};

// Console Mapping
const CONSOLE_MAP = {
    'ALL': ['ALL', 'XboxOnePhat', 'XboxOneS', 'XboxOneX', 'XboxSeriesS', 'XboxSeriesX'],
    'XOP': ['XboxOnePhat'],
    'XOS': ['XboxOneS'],
    'XOX': ['XboxOneX'],
    'XSS': ['XboxSeriesS'],
    'XSX': ['XboxSeriesX']
};

// Translations
const I18N = {
    tr: {
        appTitle: 'Xbox PostCode Web Monitörü',
        appSubtitle: 'PicoDurangoPOST Tarayıcı Seri Port İzleyici & Hata Çözümleyici',
        statusDisconnected: 'Bağlı Değil',
        statusConnected: 'Bağlandı',
        btnConnect: '🔌 Porta Bağlan',
        btnDisconnect: '❌ Bağlantıyı Kes',
        lblConsole: 'Konsol Modeli:',
        lblBaud: 'Baud Hızı:',
        chkAutoReconnect: 'Otomatik Yeniden Bağlan',
        btnUpdateMeta: '🔄 Kodları Güncelle',
        btnSaveLog: '💾 Logu Kaydet',
        btnClearLog: '🗑️ Logu Temizle',
        lblFilter: 'Filtre:',
        filterAll: 'Tümü',
        filterErrors: 'Sadece Hatalar',
        filterWarnError: 'Uyarı ve Hatalar',
        searchPlaceholder: 'Kod, isim veya arıza açıklaması ara...',
        chkTimestamps: 'Zaman Damgası',
        chkAutoScroll: 'Oto Kaydır',
        btnDecoderModal: '🔍 Manuel Kod Çöz',
        colTime: 'Zaman',
        colType: 'Tür',
        colCode: 'Kod',
        colName: 'Tanım / Hata Adı',
        colDesc: 'Arıza Açıklaması & Onarım Rehberi',
        modalTitle: 'Manuel POST / Hata Kodu Çözümleyici',
        modalCodeLabel: 'Hex Kod (Örn: E001, CC01, 80070002):',
        modalTypeLabel: 'Kod Türü:',
        modalConsoleLabel: 'Konsol Modeli:',
        btnDecode: 'Çözümle',
        btnClose: 'Kapat',
        alertNoSerial: 'Tarayıcınız Web Serial API desteklemiyor. Lütfen Google Chrome, Microsoft Edge, Opera veya Brave kullanın.',
        metaUpdatedSuccess: 'Hata kodları başarıyla güncellendi!',
        metaUpdatedFail: 'Kod güncellemesi başarısız oldu. Dahili veritabanı kullanılmaya devam edecek.'
    },
    en: {
        appTitle: 'Xbox PostCode Web Monitor',
        appSubtitle: 'PicoDurangoPOST Browser Serial Monitor & Fault Decoder',
        statusDisconnected: 'Disconnected',
        statusConnected: 'Connected',
        btnConnect: '🔌 Connect to Port',
        btnDisconnect: '❌ Disconnect',
        lblConsole: 'Console Model:',
        lblBaud: 'Baud Rate:',
        chkAutoReconnect: 'Auto Reconnect',
        btnUpdateMeta: '🔄 Update Codes',
        btnSaveLog: '💾 Save Log',
        btnClearLog: '🗑️ Clear Log',
        lblFilter: 'Filter:',
        filterAll: 'All',
        filterErrors: 'Errors Only',
        filterWarnError: 'Warnings & Errors',
        searchPlaceholder: 'Search hex code, name or description...',
        chkTimestamps: 'Timestamps',
        chkAutoScroll: 'Auto-scroll',
        btnDecoderModal: '🔍 Standalone Decoder',
        colTime: 'Time',
        colType: 'Flavor',
        colCode: 'Code',
        colName: 'Fault Name',
        colDesc: 'Fault Description & Repair Guidance',
        modalTitle: 'Standalone POST / Error Code Decoder',
        modalCodeLabel: 'Hex Code (e.g. E001, CC01, 80070002):',
        modalTypeLabel: 'Code Flavor:',
        modalConsoleLabel: 'Console Model:',
        btnDecode: 'Decode',
        btnClose: 'Close',
        alertNoSerial: 'Your browser does not support the Web Serial API. Please use Google Chrome, Microsoft Edge, Opera, or Brave.',
        metaUpdatedSuccess: 'Error definitions updated successfully!',
        metaUpdatedFail: 'Metadata update failed. Falling back to bundled database.'
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMetadata();
    initUI();
    applyLanguage(currentLanguage);

    if (!('serial' in navigator)) {
        alert(I18N[currentLanguage].alertNoSerial);
    }
});

// Load Metadata
function initMetadata() {
    const saved = localStorage.getItem('xbox_postcode_metadata');
    if (saved) {
        try {
            metadata = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse cached metadata', e);
        }
    }
    
    if (!metadata.postcodes || metadata.postcodes.length === 0) {
        if (window.DEFAULT_METADATA) {
            metadata = window.DEFAULT_METADATA;
        }
    }
    updateMetaInfoLabel();
}

function updateMetaInfoLabel() {
    const lbl = document.getElementById('metaInfoLabel');
    if (lbl) {
        const dateStr = metadata.updated ? new Date(metadata.updated).toLocaleDateString() : 'Dahili / Bundled';
        lbl.textContent = `Kodlar: ${metadata.postcodes.length} | Son Güncelleme: ${dateStr}`;
    }
}

// UI Initialization
function initUI() {
    document.getElementById('connectBtn').addEventListener('click', toggleConnection);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPort);
    document.getElementById('saveLogBtn').addEventListener('click', saveLogToFile);
    document.getElementById('clearLogBtn').addEventListener('click', clearLogs);
    document.getElementById('updateMetaBtn').addEventListener('click', updateMetadataFromWeb);
    
    document.getElementById('searchInput').addEventListener('input', applyFilter);
    document.getElementById('filterSelect').addEventListener('change', applyFilter);
    document.getElementById('consoleSelect').addEventListener('change', applyFilter);
    
    document.getElementById('autoScrollCheck').addEventListener('change', (e) => {
        autoScroll = e.target.checked;
    });

    document.getElementById('autoReconnectCheck').addEventListener('change', (e) => {
        autoReconnect = e.target.checked;
    });

    document.getElementById('langToggle').addEventListener('click', () => {
        currentLanguage = currentLanguage === 'tr' ? 'en' : 'tr';
        applyLanguage(currentLanguage);
    });

    // Standalone Modal
    const modal = document.getElementById('decoderModal');
    document.getElementById('openModalBtn').addEventListener('click', () => {
        modal.classList.add('active');
    });
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    document.getElementById('decodeBtn').addEventListener('click', runManualDecode);

    // Navigator Serial Disconnect Event
    if ('serial' in navigator) {
        navigator.serial.addEventListener('disconnect', () => {
            onDisconnected();
            if (autoReconnect) {
                setTimeout(tryAutoReconnect, 2500);
            }
        });
    }
}

function applyLanguage(lang) {
    const t = I18N[lang];
    document.getElementById('appTitle').textContent = t.appTitle;
    document.getElementById('appSubtitle').textContent = t.appSubtitle;
    document.getElementById('connectBtn').textContent = t.btnConnect;
    document.getElementById('disconnectBtn').textContent = t.btnDisconnect;
    document.getElementById('lblConsole').textContent = t.lblConsole;
    document.getElementById('lblBaud').textContent = t.lblBaud;
    document.getElementById('lblAutoReconnect').textContent = t.chkAutoReconnect;
    document.getElementById('updateMetaBtn').textContent = t.btnUpdateMeta;
    document.getElementById('saveLogBtn').textContent = t.btnSaveLog;
    document.getElementById('clearLogBtn').textContent = t.btnClearLog;
    document.getElementById('lblFilter').textContent = t.lblFilter;
    document.getElementById('searchInput').placeholder = t.searchPlaceholder;
    document.getElementById('lblAutoScroll').textContent = t.chkAutoScroll;
    document.getElementById('openModalBtn').textContent = t.btnDecoderModal;

    document.getElementById('colTime').textContent = t.colTime;
    document.getElementById('colType').textContent = t.colType;
    document.getElementById('colCode').textContent = t.colCode;
    document.getElementById('colName').textContent = t.colName;
    document.getElementById('colDesc').textContent = t.colDesc;

    document.getElementById('modalTitle').textContent = t.modalTitle;
    document.getElementById('modalCodeLabel').textContent = t.modalCodeLabel;
    document.getElementById('modalTypeLabel').textContent = t.modalTypeLabel;
    document.getElementById('modalConsoleLabel').textContent = t.modalConsoleLabel;
    document.getElementById('decodeBtn').textContent = t.btnDecode;
    document.getElementById('closeModalBtn').textContent = t.btnClose;

    document.getElementById('statusText').textContent = isConnected ? t.statusConnected : t.statusDisconnected;
    document.getElementById('langToggle').textContent = lang.toUpperCase();
}

// Web Serial Connection
async function toggleConnection() {
    if (isConnected) {
        await disconnectPort();
        return;
    }

    try {
        const baudRate = parseInt(document.getElementById('baudSelect').value, 10);
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: baudRate });

        isConnected = true;
        updateConnectionUI(true);

        // Handshake
        await sendSerial("\x03\r\n"); // Ctrl+C + Enter
        await delay(120);
        await sendSerial("version\r\n");
        await delay(120);
        await sendSerial("config\r\n");
        await delay(120);
        await sendSerial("post\r\n");

        readLoop();
    } catch (err) {
        console.error('Port connection failed:', err);
        updateConnectionUI(false);
    }
}

async function sendSerial(text) {
    if (!port || !port.writable) return;
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    await writer.write(encoder.encode(text));
    writer.releaseLock();
}

async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // keep last incomplete chunk
            for (const line of lines) {
                if (line.trim().length > 0) {
                    processIncomingLine(line);
                }
            }
        }
    } catch (err) {
        console.warn('Read loop terminated:', err);
    } finally {
        onDisconnected();
    }
}

async function disconnectPort() {
    autoReconnect = false;
    document.getElementById('autoReconnectCheck').checked = false;
    if (reader) {
        try { await reader.cancel(); } catch (e) {}
    }
    if (port) {
        try { await port.close(); } catch (e) {}
    }
    onDisconnected();
}

function onDisconnected() {
    isConnected = false;
    port = null;
    reader = null;
    updateConnectionUI(false);
}

function updateConnectionUI(connected) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');

    if (connected) {
        dot.classList.add('connected');
        txt.textContent = I18N[currentLanguage].statusConnected;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-flex';
    } else {
        dot.classList.remove('connected');
        txt.textContent = I18N[currentLanguage].statusDisconnected;
        connectBtn.style.display = 'inline-flex';
        disconnectBtn.style.display = 'none';
    }
}

async function tryAutoReconnect() {
    if (isConnected || !autoReconnect) return;
    try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            port = ports[0];
            const baudRate = parseInt(document.getElementById('baudSelect').value, 10);
            await port.open({ baudRate: baudRate });
            isConnected = true;
            updateConnectionUI(true);
            await sendSerial("\x03\r\npost\r\n");
            readLoop();
        }
    } catch (e) {
        console.debug('Auto-reconnect attempt failed, will retry...', e);
        if (autoReconnect && !isConnected) {
            setTimeout(tryAutoReconnect, 3000);
        }
    }
}

// Processing & Decoding
const LOG_REGEX = /^(SMC|SP|CPU|OS)\s?\:\s?([x0-9a-fA-F]{4,})/i;

function processIncomingLine(line) {
    rawLogs.push(line);

    // Check version
    if (line.startsWith("FW: ")) {
        document.getElementById('fwVersionDisplay').textContent = line;
    }

    const match = LOG_REGEX.exec(line);
    if (!match) return;

    const flavor = match[1].toUpperCase();
    const hexStr = match[2];
    const code = parseInt(hexStr.startsWith('0x') ? hexStr : '0x' + hexStr, 16);
    const selectedConsole = document.getElementById('consoleSelect').value;

    const decoded = decodeCode(flavor, code, selectedConsole);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const entry = {
        timestamp: timeStr,
        flavor: flavor,
        code: code,
        hex: '0x' + code.toString(16).toUpperCase().padStart(4, '0'),
        name: decoded.name,
        description: decoded.description,
        severity: decoded.severity, // 'info', 'warning', 'error'
        raw: line
    };

    logEntries.push(entry);
    if (matchesFilter(entry)) {
        appendLogRow(entry, logEntries.length - 1);
    }
}

function consoleMatches(entryConsoleStr, selectedConsole) {
    if (selectedConsole === 'ALL') return true;
    const tokens = (entryConsoleStr || '').split(',').map(s => s.trim());
    if (tokens.includes('ALL')) return true;

    for (const token of tokens) {
        const mappedList = CONSOLE_MAP[token] || [token];
        if (mappedList.includes(selectedConsole)) return true;
    }
    return false;
}

function decodeCode(flavor, code, consoleType) {
    const result = {
        name: '',
        description: '',
        severity: 'info'
    };

    // 1. Distinct PostCode
    const distinct = metadata.postcodes.find(x => 
        x.t === flavor && 
        parseInt(x.code, 16) === code && 
        (!x.m || x.m === '0xFFFF') &&
        consoleMatches(x.c, consoleType)
    );

    if (distinct) {
        result.name = `${flavor}_${distinct.n}`;
        result.description = distinct.d;
        result.severity = distinct.e ? 'error' : 'info';
        return result;
    }

    // 2. OSError
    const osErr = metadata.oserrors.find(x => 
        x.t === flavor && 
        parseInt(x.code, 16) === code &&
        consoleMatches(x.c, consoleType)
    );

    if (osErr) {
        result.name = `${flavor}_${osErr.n}`;
        result.description = osErr.d;
        result.severity = 'error';
        return result;
    }

    // 3. Bitmask PostCodes
    const bitmaskMatches = metadata.postcodes.filter(x => 
        x.t === flavor &&
        x.m && x.m !== '0xFFFF' &&
        consoleMatches(x.c, consoleType) &&
        (BigInt(code) & BigInt(x.m)) === BigInt(x.code)
    );

    if (bitmaskMatches.length > 0) {
        bitmaskMatches.sort((a, b) => parseInt(b.m, 16) - parseInt(a.m, 16));
        result.name = `${flavor}_` + bitmaskMatches.map(m => m.n).join('_');
        result.description = bitmaskMatches.map(m => m.d).join('\n');
        result.severity = bitmaskMatches.some(m => m.e) ? 'error' : 'info';
        return result;
    }

    // 4. Generic ErrorMasks
    const mask = metadata.errormasks.find(x => 
        x.t === flavor &&
        consoleMatches(x.c, consoleType) &&
        (BigInt(code) & BigInt(x.m)) === BigInt(x.code)
    );

    if (mask) {
        result.name = `${flavor}_${mask.n}_0x${code.toString(16).toUpperCase()}`;
        result.description = mask.d;
        result.severity = 'error';
        return result;
    }

    // Fallback unknown
    result.name = `${flavor}_UNKNOWN_0x${code.toString(16).toUpperCase()}`;
    result.description = '';
    return result;
}

// Log View & Filtering
function matchesFilter(entry) {
    const filterMode = document.getElementById('filterSelect').value;
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();

    // Mode check
    if (filterMode === 'ErrorsOnly' && entry.severity !== 'error') return false;
    if (filterMode === 'WarningsAndErrors' && entry.severity !== 'error' && entry.severity !== 'warning') return false;
    if (['SMC', 'SP', 'CPU', 'OS'].includes(filterMode) && entry.flavor !== filterMode) return false;

    // Search check
    if (searchTerm) {
        const textToSearch = `${entry.hex} ${entry.name} ${entry.description} ${entry.flavor}`.toLowerCase();
        if (!textToSearch.includes(searchTerm)) return false;
    }

    return true;
}

function applyFilter() {
    const logList = document.getElementById('logList');
    logList.innerHTML = '';
    logEntries.forEach((entry, idx) => {
        if (matchesFilter(entry)) {
            appendLogRow(entry, idx);
        }
    });
}

function appendLogRow(entry, index) {
    const logList = document.getElementById('logList');
    const row = document.createElement('div');
    row.className = `log-row severity-${entry.severity}`;
    if (selectedLogIndex === index) {
        row.classList.add('selected');
    }

    row.innerHTML = `
        <div class="col-ts">${entry.timestamp}</div>
        <div class="col-flavor">${entry.flavor}</div>
        <div class="col-code">${entry.hex}</div>
        <div class="col-name" title="${entry.name}">${entry.name}</div>
        <div class="col-desc">${entry.description || '-'}</div>
    `;

    row.addEventListener('click', () => {
        document.querySelectorAll('.log-row.selected').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        selectedLogIndex = index;
        showDetail(entry);
    });

    logList.appendChild(row);

    if (autoScroll) {
        logList.scrollTop = logList.scrollHeight;
    }
}

function showDetail(entry) {
    const panel = document.getElementById('detailPanel');
    const title = document.getElementById('detailTitle');
    const desc = document.getElementById('detailDesc');

    panel.classList.add('active');
    title.textContent = `${entry.timestamp} [${entry.flavor}] ${entry.hex} - ${entry.name}`;
    desc.textContent = entry.description || 'Bu kod için ek açıklama bulunamadı.';
}

function clearLogs() {
    rawLogs = [];
    logEntries = [];
    document.getElementById('logList').innerHTML = '';
    document.getElementById('detailPanel').classList.remove('active');
    selectedLogIndex = null;
}

function saveLogToFile() {
    const consoleType = document.getElementById('consoleSelect').value;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `XboxPOST_${consoleType}_${dateStr}.log`;

    let content = `=== Metadata ===\n`;
    content += `Console: ${consoleType}\n`;
    content += `Tool: Xbox PostCode Web Serial Monitor\n`;
    content += `Date: ${new Date().toLocaleString()}\n\n`;

    content += `=== Raw Log ===\n`;
    rawLogs.forEach(line => content += line + '\n');
    content += `\n=== Decoded Log ===\n`;
    logEntries.forEach(e => {
        content += `${e.timestamp} [${e.flavor}] ${e.hex} ${e.name} - ${e.description}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Standalone Manual Decoder
function runManualDecode() {
    const codeInput = document.getElementById('modalCodeInput').value.trim();
    const flavor = document.getElementById('modalFlavorSelect').value;
    const consoleType = document.getElementById('modalConsoleSelect').value;
    const resultBox = document.getElementById('modalDecodeResult');

    if (!codeInput) {
        resultBox.textContent = 'Lütfen bir hex kod girin (Örn: E001).';
        return;
    }

    try {
        const hex = codeInput.startsWith('0x') ? codeInput : '0x' + codeInput;
        const codeNum = parseInt(hex, 16);
        if (isNaN(codeNum)) {
            resultBox.textContent = 'Geçersiz Hex kod formatı!';
            return;
        }

        const decoded = decodeCode(flavor, codeNum, consoleType);
        resultBox.textContent = `[${flavor}] ${hex.toUpperCase()}\nİsim: ${decoded.name}\nSeviye: ${decoded.severity.toUpperCase()}\nAçıklama:\n${decoded.description || '(Açıklama yok)'}`;
    } catch (e) {
        resultBox.textContent = 'Çözümleme hatası: ' + e.message;
    }
}

// Online Metadata Updater
async function updateMetadataFromWeb() {
    const btn = document.getElementById('updateMetaBtn');
    btn.disabled = true;
    btn.textContent = '⏳ İndiriliyor...';

    try {
        const metaRes = await fetch('https://errors.xboxresearch.com/meta.json');
        if (!metaRes.ok) throw new Error('Failed to fetch meta.json');
        const metaJson = await metaRes.json();

        const postcodesRes = await fetch('https://errors.xboxresearch.com/postcodes.csv');
        const postcodesText = await postcodesRes.text();

        const errorMasksRes = await fetch('https://errors.xboxresearch.com/errormasks.csv');
        const errorMasksText = await errorMasksRes.text();

        const osErrorsRes = await fetch('https://errors.xboxresearch.com/oserrors.csv');
        const osErrorsText = await osErrorsRes.text();

        metadata = {
            updated: metaJson.updated,
            postcodes: parseCsv(postcodesText).map(r => ({
                c: r.Console, t: r.Type, code: r.Code, m: r.Bitmask, e: r.IsError === '1' ? 1 : 0, n: r.Name, d: r.Description
            })),
            errormasks: parseCsv(errorMasksText).map(r => ({
                c: r.Console, t: r.Type, code: r.Code, m: r.Bitmask, n: r.Name, d: r.Description
            })),
            oserrors: parseCsv(osErrorsText).map(r => ({
                c: r.Console, t: r.Type, code: r.Code, n: r.Name, d: r.Description
            }))
        };

        localStorage.setItem('xbox_postcode_metadata', JSON.stringify(metadata));
        updateMetaInfoLabel();
        alert(I18N[currentLanguage].metaUpdatedSuccess);
    } catch (err) {
        console.error('Update failed:', err);
        alert(I18N[currentLanguage].metaUpdatedFail);
    } finally {
        btn.disabled = false;
        btn.textContent = I18N[currentLanguage].btnUpdateMeta;
    }
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length === headers.length) {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = row[idx]);
            results.push(obj);
        }
    }
    return results;
}

function parseCsvLine(line) {
    const result = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            insideQuotes = !insideQuotes;
        } else if (c === ',' && !insideQuotes) {
            result.push(entry.trim());
            entry = '';
        } else {
            entry += c;
        }
    }
    result.push(entry.trim());
    return result;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
