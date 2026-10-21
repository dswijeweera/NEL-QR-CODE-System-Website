
script.js

100%
const $ = id => document.getElementById(id);
let mode = 'qr', history = [], currentCanvas = null, currentItem = null;
function loadScript(url) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = url; s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + url)); document.head.appendChild(s); }); }
async function loadLibraries() {
    if (!window.QRCode) { try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js') } catch (e) { await loadScript('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js') } }
    if (!window.JsBarcode) { try { await loadScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js') } catch (e) { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js') } }
    if (!window.JSZip) { try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js') } catch (e) { await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js') } }
    if (!window.QRCode || !window.JsBarcode) throw new Error('QR/barcode libraries unavailable');
}
function setMode(next) { mode = next; $('qrTab').classList.toggle('active', mode === 'qr'); $('barTab').classList.toggle('active', mode === 'bar'); $('generate').textContent = mode === 'qr' ? 'Generate QR Code' : 'Generate Barcode'; $('data').placeholder = mode === 'qr' ? 'Enter the information to encode...' : 'Enter numbers or text for the barcode...'; $('status').textContent = mode === 'qr' ? 'QR Code mode selected.' : 'Barcode mode selected.' }
$('qrTab').onclick = () => setMode('qr'); $('barTab').onclick = () => setMode('bar');
function canvasFromPreview() { const c = $('preview').querySelector('canvas'); if (c) return c; const img = $('preview').querySelector('img'); if (img && img.complete) { const out = document.createElement('canvas'); out.width = img.naturalWidth; out.height = img.naturalHeight; out.getContext('2d').drawImage(img, 0, 0); return out } return null }
function generate() {
    const data = $('data').value.trim(), label = $('labelText').value.trim(), size = 240;
    if (!data) { $('status').textContent = 'Please enter data first.'; return }
    if (mode === 'bar' && !/^[\x20-\x7E]+$/.test(data)) { $('status').textContent = 'For barcodes, use standard letters, numbers and symbols.'; return }
    if ((mode === 'qr' && !window.QRCode) || (mode === 'bar' && !window.JsBarcode)) { $('status').textContent = 'Code library is still loading. Please wait a moment and try again.'; return }
    $('preview').innerHTML = ''; const holder = document.createElement('div'); holder.id = 'codeMount'; $('preview').appendChild(holder);
    try {
        if (mode === 'qr') {
            new QRCode(holder, { text: data, width: size, height: size, colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
            setTimeout(() => finish(data, label, size), 180);
        } else {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); holder.appendChild(svg);
            JsBarcode(svg, data, { format: 'CODE128', lineColor: '#111827', background: '#ffffff', width: 2, height: Math.max(70, size * .42), displayValue: false, margin: 8 });
            const xml = new XMLSerializer().serializeToString(svg), img = new Image();
            img.onload = () => { const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height); holder.innerHTML = ''; holder.appendChild(c); finish(data, label, size) };
            img.onerror = () => { $('status').textContent = 'Could not render barcode.' }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
        }
    } catch (e) { $('status').textContent = e.message }
}
function finish(data, label, size) {
    const rawCanvas = canvasFromPreview(); if (!rawCanvas) { $('status').textContent = 'Code image is not ready. Please try again.'; return }
    rawCanvas.style.width = (mode === 'qr' ? '20mm' : '48mm'); rawCanvas.style.height = (mode === 'qr' ? '20mm' : 'auto'); rawCanvas.style.maxWidth = '100%';
    const preview = $('preview');
    let card = preview.querySelector('.code-label-card');
    if (!card) { card = document.createElement('div'); card.className = 'code-label-card'; preview.appendChild(card) }
    const holder = $('codeMount');
    if (holder && holder.parentNode !== card) card.appendChild(holder);
    let l = card.querySelector('.output-label'); if (!l) { l = document.createElement('div'); l.className = 'output-label'; card.appendChild(l) }
    l.textContent = label; l.style.fontSize = 'clamp(8px, 2.6vw, ' + $('labelSize').value + 'px)';
    currentCanvas = rawCanvas;
    const combinedData = makeLabeledCardData(rawCanvas, label, Number($('labelSize').value), size);
    currentItem = { type: mode === 'qr' ? 'QR Code' : 'Barcode', mode, data, label, imageData: combinedData, size, labelSize: $('labelSize').value };
    history.push(currentItem);
    $('download').disabled = false; $('print').disabled = false;
    $('status').textContent = (mode === 'qr' ? 'QR code' : 'Barcode') + ' generated and added to Recent generated items.';
    renderHistory();
}
function makeLabeledCardData(codeCanvas, label, fontSize, size) {
    // 20 mm at 300 dpi is approximately 236 px; use a 240 px square code canvas.
    const codeSize = 240, pad = 18, innerWidth = codeSize;
    const source = document.createElement('canvas'); source.width = codeSize; source.height = codeSize;
    const sctx = source.getContext('2d'); sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, codeSize, codeSize); sctx.imageSmoothingEnabled = false; sctx.drawImage(codeCanvas, 0, 0, codeSize, codeSize);
    const fontPx = Math.max(15, Math.round(Number(fontSize) * 2.5));
    const tmp = document.createElement('canvas'), tctx = tmp.getContext('2d'); tctx.font = `700 ${fontPx}px Arial`;
    const wrapText = (text, max) => { const words = String(text || '').split(/\s+/); const lines = []; let line = ''; for (const word of words) { let test = line ? line + ' ' + word : word; if (tctx.measureText(test).width > max && line) { lines.push(line); line = word } else line = test } if (line) lines.push(line); return lines.length ? lines : [''] };
    const lines = wrapText(label, innerWidth - 12), lineHeight = Math.round(fontPx * 1.2), textHeight = lines.length * lineHeight;
    const w = codeSize + pad * 2, h = pad + codeSize + 10 + textHeight + pad;
    const out = document.createElement('canvas'); out.width = w; out.height = h; const ctx = out.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(source, pad, pad);
    ctx.font = `700 ${fontPx}px Arial`; ctx.fillStyle = '#172033'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, w / 2, pad + codeSize + 10 + i * lineHeight, innerWidth - 8));
    ctx.strokeStyle = '#172033'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    return out.toDataURL('image/png');
}
function renderHistory() {
    const body = $('historyRows'); body.innerHTML = '';
    if (!history.length) { body.innerHTML = '<tr><td colspan="3" class="muted-cell">No items yet.</td></tr>' }
    history.forEach(item => { const tr = document.createElement('tr');[item.type, item.data, item.label].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td) }); body.appendChild(tr) });
    $('itemCount').textContent = '(' + history.length + ')';
    $('printAll').disabled = !history.length; $('downloadAll').disabled = !history.length; $('clearAll').disabled = !history.length;
}
function borderedImageData(source) { const pad = 14, border = 3, out = document.createElement('canvas'); out.width = source.width + pad * 2; out.height = source.height + pad * 2; const ctx = out.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(source, pad, pad); ctx.strokeStyle = '#172033'; ctx.lineWidth = border; ctx.strokeRect(border / 2, border / 2, out.width - border, out.height - border); return out.toDataURL('image/png') }
function downloadCurrent() { if (!currentItem) return; const a = document.createElement('a'); a.download = 'CodeStudio-' + (mode === 'qr' ? 'QR' : 'Barcode') + '.png'; a.href = currentItem.imageData; a.click() }
function printItems(items) {
    if (!items.length) return;
    const w = window.open('', '_blank'); if (!w) { $('status').textContent = 'Pop-up blocked. Allow pop-ups for this page to print.'; return }
    const cards = items.map((it, i) => `<div class="item"><img src="${it.imageData}" alt="Code and label"></div>`).join('');
    w.document.open(); w.document.write(`<!doctype html><html><head><title>CodeStudio Print</title><style>body{font-family:Arial,sans-serif;margin:10mm}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}.item{break-inside:avoid;text-align:center;border:1px solid #ddd;padding:4mm}.item img{width:23mm;height:auto;max-width:100%}@media print{.grid{gap:5mm}}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>{setTimeout(()=>window.print(),300)};<\\/script></body></html>`); w.document.close();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
async function downloadAll() {
    if (!history.length) return;
    if (!window.JSZip) { $('status').textContent = 'ZIP library is not available. Check internet and refresh.'; return }
    try {
        const zip = new JSZip(); history.forEach((it, i) => { const safe = (it.label || it.data || ('code-' + (i + 1))).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 55) || ('code-' + (i + 1)); zip.file(String(i + 1).padStart(3, '0') + '_' + safe + '.png', it.imageData.split(',')[1], { base64: true }) });
        const blob = await zip.generateAsync({ type: 'blob' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'CodeStudio_All_Codes.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); $('status').textContent = 'All generated codes downloaded as a ZIP file.';
    } catch (e) { $('status').textContent = 'Could not create ZIP: ' + e.message }
}
$('generate').onclick = generate; $('download').onclick = downloadCurrent; $('print').onclick = () => currentItem && printItems([currentItem]); $('printAll').onclick = () => printItems(history); $('downloadAll').onclick = downloadAll;
$('clearAll').onclick = () => { if (!history.length) return; history = []; currentCanvas = null; currentItem = null; $('preview').innerHTML = '<div class="empty">Your generated code will appear here.</div>'; $('download').disabled = true; $('print').disabled = true; renderHistory(); $('status').textContent = 'All generated items cleared.' };
$('labelText').addEventListener('input', () => { const l = $('preview').querySelector('.output-label'); if (l) l.textContent = $('labelText').value });
$('data').addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') generate() });
loadLibraries().then(() => { $('status').textContent = 'Ready. Enter data and generate a code.'; generate() }).catch(err => { $('status').textContent = 'Could not load QR/barcode libraries. Check internet or office firewall, then refresh (Ctrl+R).'; console.error(err) });
Displaying script.js.