// Mini-émulateur Apps Script pour tester Code.gs + rendu des templates hors ligne.
const fs = require('fs'), vm = require('vm');
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function renderTemplate(src, vars){
  // <?!= raw ?>, <?= escaped ?>  (pas de <? code ?> utilisé dans ce projet)
  return src.replace(/<\?(!=|=)([\s\S]*?)\?>/g, (m, kind, expr) => {
    const v = vm.runInNewContext(expr, Object.assign({}, vars));
    return kind === '!=' ? String(v) : esc(v);
  });
}
function loadCode(repo, ctx){
  ctx.Date = Date; ctx.JSON = JSON;
  const code = fs.readFileSync(repo + '/Code.gs', 'utf8');
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'Code.gs' });
  return ctx;
}
function makeProps(init){ const store = Object.assign({}, init||{}); return {
  getProperties: () => Object.assign({}, store), getProperty: k => (k in store ? store[k] : null),
  setProperty: (k,v) => { store[k] = String(v); }, setProperties: o => { for (const k in o) store[k] = String(o[k]); },
  deleteProperty: k => { delete store[k]; }, deleteAllProperties: () => { for (const k in store) delete store[k]; }, _store: store }; }
module.exports = { renderTemplate, loadCode, makeProps, esc };
