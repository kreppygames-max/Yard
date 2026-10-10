/* ================= MOTOR SQL (somente SELECT, sem eval) ================= */
class SqlError extends Error {}
const AGG = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
const RESERVED = new Set(['SELECT','FROM','WHERE','GROUP','ORDER','BY','HAVING','LIMIT','OFFSET','JOIN','INNER','LEFT','RIGHT','OUTER','CROSS','ON','AS','AND','OR','NOT','IN','IS','NULL','LIKE','BETWEEN','DISTINCT','ASC','DESC','CASE','WHEN','THEN','ELSE','END','EXISTS','UNION','ALL']);

function tokenize(sql) {
  sql = sql.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  const toks = []; let i = 0; const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '-' && sql[i + 1] === '-') { while (i < n && sql[i] !== '\n') i++; continue; }
    if (ch === '/' && sql[i + 1] === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    const st = i;
    if (ch === "'") {
      let s = ''; i++;
      for (;;) {
        if (i >= n) throw new SqlError('Um texto entre aspas simples não foi fechado.');
        if (sql[i] === "'") { if (sql[i + 1] === "'") { s += "'"; i += 2; continue; } i++; break; }
        s += sql[i++];
      }
      toks.push({ t: 'str', v: s, raw: sql.slice(st, i), s: st, e: i }); continue;
    }
    if (ch === '"' || ch === '`') {
      const e = sql.indexOf(ch, i + 1);
      if (e < 0) throw new SqlError('Um identificador entre aspas não foi fechado.');
      const v = sql.slice(i + 1, e); i = e + 1;
      toks.push({ t: 'id', v, l: v.toLowerCase(), u: '', raw: sql.slice(st, i), s: st, e: i }); continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] || ''))) {
      let j = i; while (j < n && /[0-9.]/.test(sql[j])) j++;
      toks.push({ t: 'num', v: parseFloat(sql.slice(i, j)), raw: sql.slice(i, j), s: i, e: j }); i = j; continue;
    }
    if (/[A-Za-z_\u00C0-\u024F]/.test(ch)) {
      let j = i; while (j < n && /[A-Za-z0-9_\u00C0-\u024F]/.test(sql[j])) j++;
      const v = sql.slice(i, j);
      toks.push({ t: 'id', v, l: v.toLowerCase(), u: v.toUpperCase(), raw: v, s: i, e: j }); i = j; continue;
    }
    const two = sql.slice(i, i + 2);
    if (['<=', '>=', '<>', '!=', '||', '=='].includes(two)) { toks.push({ t: 'op', v: two, raw: two, s: i, e: i + 2 }); i += 2; continue; }
    if ('=<>+-*/%(),.;'.includes(ch)) { toks.push({ t: 'op', v: ch, raw: ch, s: i, e: i + 1 }); i++; continue; }
    throw new SqlError(`Caractere inesperado: "${ch}"`);
  }
  toks.push({ t: 'eof', raw: '', s: n, e: n });
  return toks;
}

class Parser {
  constructor(sql) { this.sql = sql; this.t = tokenize(sql); this.i = 0; }
  peek(o = 0) { return this.t[Math.min(this.i + o, this.t.length - 1)]; }
  isKw(k, o = 0) { const x = this.peek(o); return x.t === 'id' && x.u === k; }
  eatKw(k) { if (this.isKw(k)) { this.i++; return true; } return false; }
  expectKw(k) { if (!this.eatKw(k)) this.err(`esperava ${k}`); }
  isOp(v, o = 0) { const x = this.peek(o); return x.t === 'op' && x.v === v; }
  eatOp(v) { if (this.isOp(v)) { this.i++; return true; } return false; }
  expectOp(v) { if (!this.eatOp(v)) this.err(`esperava "${v}"`); }
  err(msg) { const x = this.peek(); throw new SqlError(`Erro de sintaxe: ${msg} (perto de ${x.t === 'eof' ? 'o fim da consulta' : '"' + x.raw + '"'}).`); }
  ident() {
    const x = this.peek();
    if (x.t !== 'id') this.err('esperava um nome');
    this.i++; return x;
  }
  canAlias() { const x = this.peek(); return x.t === 'id' && (x.u === '' || !RESERVED.has(x.u)); }

  parseQuery() {
    const q = this.parseSelect();
    while (this.eatOp(';'));
    if (this.peek().t !== 'eof') this.err('texto inesperado depois da consulta');
    return q;
  }
  parseSelect() {
    this.expectKw('SELECT');
    const distinct = this.eatKw('DISTINCT'); if (!distinct) this.eatKw('ALL');
    const items = [];
    do { items.push(this.parseItem()); } while (this.eatOp(','));
    let from = null; const joins = [];
    if (this.eatKw('FROM')) {
      from = this.parseSource();
      for (;;) {
        if (this.eatOp(',')) { joins.push({ type: 'cross', src: this.parseSource() }); continue; }
        let type = null;
        if (this.isKw('JOIN')) { this.i++; type = 'inner'; }
        else if (this.isKw('INNER') && this.isKw('JOIN', 1)) { this.i += 2; type = 'inner'; }
        else if (this.isKw('LEFT')) { this.i++; this.eatKw('OUTER'); this.expectKw('JOIN'); type = 'left'; }
        else if (this.isKw('CROSS') && this.isKw('JOIN', 1)) { this.i += 2; type = 'cross'; }
        else if (this.isKw('RIGHT')) throw new SqlError('RIGHT JOIN não é suportado aqui. Troque a ordem das tabelas e use LEFT JOIN.');
        else break;
        const src = this.parseSource(); let on = null;
        if (type !== 'cross') { this.expectKw('ON'); on = this.parseExpr(); }
        joins.push({ type, src, on });
      }
    }
    let where = null, group = [], having = null, order = [], limit = null, offset = null;
    if (this.eatKw('WHERE')) where = this.parseExpr();
    if (this.isKw('GROUP')) { this.i++; this.expectKw('BY'); do { group.push(this.parseExpr()); } while (this.eatOp(',')); }
    if (this.eatKw('HAVING')) having = this.parseExpr();
    if (this.isKw('ORDER')) {
      this.i++; this.expectKw('BY');
      do { const e = this.parseExpr(); let desc = false; if (this.eatKw('DESC')) desc = true; else this.eatKw('ASC'); order.push({ e, desc }); } while (this.eatOp(','));
    }
    if (this.eatKw('LIMIT')) { limit = this.parseAdd(); if (this.eatKw('OFFSET')) offset = this.parseAdd(); else if (this.eatOp(',')) { offset = limit; limit = this.parseAdd(); } }
    else if (this.eatKw('OFFSET')) offset = this.parseAdd();
    if (this.isKw('UNION')) throw new SqlError('UNION não é suportado nesta delegacia. Tente JOIN ou subconsultas.');
    return { k: 'select', distinct, items, from, joins, where, group, having, order, limit, offset };
  }
  parseItem() {
    if (this.isOp('*')) { this.i++; return { star: true }; }
    if (this.peek().t === 'id' && this.isOp('.', 1) && this.isOp('*', 2)) { const t = this.peek().l; this.i += 3; return { star: true, table: t }; }
    const s = this.peek().s;
    const expr = this.parseExpr();
    const e = this.t[this.i - 1].e;
    let alias = null;
    if (this.eatKw('AS')) { const x = this.peek(); if (x.t === 'str') { this.i++; alias = x.v; } else alias = this.ident().v; }
    else if (this.canAlias()) alias = this.ident().v;
    const text = this.sql.slice(s, e).trim();
    let name = alias;
    if (!name) name = expr.k === 'col' ? expr.name : text;
    return { expr, alias: alias ? alias.toLowerCase() : null, name };
  }
  parseSource() {
    if (this.eatOp('(')) {
      const sub = this.parseSelect(); this.expectOp(')');
      this.eatKw('AS');
      if (!this.canAlias()) this.err('toda subconsulta no FROM precisa de um apelido');
      return { sub, alias: this.ident().l };
    }
    const name = this.ident().l; let alias = name;
    if (this.eatKw('AS')) alias = this.ident().l; else if (this.canAlias()) alias = this.ident().l;
    return { name, alias };
  }
  parseExpr() { return this.parseOr(); }
  parseOr() { let l = this.parseAnd(); while (this.eatKw('OR')) l = { k: 'or', l, r: this.parseAnd() }; return l; }
  parseAnd() { let l = this.parseNot(); while (this.eatKw('AND')) l = { k: 'and', l, r: this.parseNot() }; return l; }
  parseNot() { if (this.eatKw('NOT')) return { k: 'not', e: this.parseNot() }; return this.parseCmp(); }
  parseCmp() {
    let l = this.parseAdd();
    for (;;) {
      const x = this.peek();
      if (x.t === 'op' && ['=', '<>', '!=', '<', '>', '<=', '>=', '=='].includes(x.v)) {
        this.i++; l = { k: 'cmp', op: x.v === '!=' ? '<>' : x.v === '==' ? '=' : x.v, l, r: this.parseAdd() }; continue;
      }
      let neg = false;
      if (this.isKw('NOT') && (this.isKw('LIKE', 1) || this.isKw('IN', 1) || this.isKw('BETWEEN', 1))) { this.i++; neg = true; }
      if (this.eatKw('LIKE')) { l = { k: 'like', l, r: this.parseAdd(), neg }; continue; }
      if (this.eatKw('IN')) {
        this.expectOp('(');
        let node;
        if (this.isKw('SELECT')) node = { k: 'in', l, sub: this.parseSelect(), neg };
        else { const list = []; do { list.push(this.parseExpr()); } while (this.eatOp(',')); node = { k: 'in', l, list, neg }; }
        this.expectOp(')'); l = node; continue;
      }
      if (this.eatKw('BETWEEN')) { const a = this.parseAdd(); this.expectKw('AND'); const b = this.parseAdd(); l = { k: 'between', l, a, b, neg }; continue; }
      if (this.isKw('IS')) { this.i++; const n = this.eatKw('NOT'); this.expectKw('NULL'); l = { k: 'isnull', l, neg: n }; continue; }
      if (neg) this.err('esperava LIKE, IN ou BETWEEN');
      break;
    }
    return l;
  }
  parseAdd() {
    let l = this.parseMul();
    for (;;) {
      const x = this.peek();
      if (x.t === 'op' && (x.v === '+' || x.v === '-' || x.v === '||')) { this.i++; l = { k: 'ar', op: x.v, l, r: this.parseMul() }; } else break;
    }
    return l;
  }
  parseMul() {
    let l = this.parseUnary();
    for (;;) {
      const x = this.peek();
      if (x.t === 'op' && (x.v === '*' || x.v === '/' || x.v === '%')) { this.i++; l = { k: 'ar', op: x.v, l, r: this.parseUnary() }; } else break;
    }
    return l;
  }
  parseUnary() {
    if (this.eatOp('-')) return { k: 'neg', e: this.parseUnary() };
    if (this.eatOp('+')) return this.parseUnary();
    return this.parsePrimary();
  }
  parsePrimary() {
    const x = this.peek();
    if (x.t === 'num') { this.i++; return { k: 'lit', v: x.v }; }
    if (x.t === 'str') { this.i++; return { k: 'lit', v: x.v }; }
    if (x.t === 'op' && x.v === '(') {
      this.i++;
      if (this.isKw('SELECT')) { const sub = this.parseSelect(); this.expectOp(')'); return { k: 'scalar', sub }; }
      const e = this.parseExpr(); this.expectOp(')'); return e;
    }
    if (x.t === 'id') {
      if (x.u === 'NULL') { this.i++; return { k: 'lit', v: null }; }
      if (x.u === 'TRUE') { this.i++; return { k: 'lit', v: 1 }; }
      if (x.u === 'FALSE') { this.i++; return { k: 'lit', v: 0 }; }
      if (x.u === 'CASE') return this.parseCase();
      if (x.u === 'EXISTS') { this.i++; this.expectOp('('); const sub = this.parseSelect(); this.expectOp(')'); return { k: 'exists', sub }; }
      if (this.isOp('(', 1)) {
        this.i += 2;
        const name = x.u || x.v.toUpperCase();
        let distinct = false, star = false; const args = [];
        if (this.isOp('*')) { this.i++; star = true; }
        else if (!this.isOp(')')) { distinct = this.eatKw('DISTINCT'); do { args.push(this.parseExpr()); } while (this.eatOp(',')); }
        this.expectOp(')');
        return { k: 'fn', name, args, distinct, star };
      }
      if (x.u && RESERVED.has(x.u)) this.err('esperava um valor ou nome de coluna');
      this.i++;
      if (this.isOp('.') && this.peek(1).t === 'id') { this.i++; const c = this.ident(); return { k: 'col', table: x.l, name: c.l }; }
      return { k: 'col', table: null, name: x.l };
    }
    this.err('esperava um valor ou nome de coluna');
  }
  parseCase() {
    this.expectKw('CASE');
    let base = null;
    if (!this.isKw('WHEN')) base = this.parseExpr();
    const whens = [];
    while (this.eatKw('WHEN')) { const c = this.parseExpr(); this.expectKw('THEN'); whens.push({ c, v: this.parseExpr() }); }
    let els = null; if (this.eatKw('ELSE')) els = this.parseExpr();
    this.expectKw('END');
    return { k: 'case', base, whens, els };
  }
}

let CUR_DB = {};
function toB(v) { if (v == null) return null; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; const f = parseFloat(v); return isNaN(f) ? false : f !== 0; }
function cmpv(a, b) {
  if (typeof a === 'boolean') a = +a; if (typeof b === 'boolean') b = +b;
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '' && !isNaN(+b)) b = +b;
  if (typeof b === 'number' && typeof a === 'string' && a.trim() !== '' && !isNaN(+a)) a = +a;
  if (typeof a !== typeof b) return typeof a === 'number' ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}
function likeRe(p) { return new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '[\\s\\S]*').replace(/_/g, '[\\s\\S]') + '$', 'i'); }
function hasAgg(n) {
  if (!n || typeof n !== 'object') return false;
  if (Array.isArray(n)) return n.some(hasAgg);
  if (n.k === 'select') return false;
  if (n.k === 'fn' && AGG.has(n.name)) return true;
  return Object.values(n).some(v => v && typeof v === 'object' && hasAgg(v));
}
function lookup(n, c) {
  for (let x = c; x; x = x.parent) {
    const r = x.row;
    if (r) {
      if (n.table) {
        if (r[n.table]) { if (n.name in r[n.table]) return r[n.table][n.name]; throw new SqlError(`A tabela "${n.table}" não tem a coluna "${n.name}".`); }
      } else {
        let found, cnt = 0;
        for (const a in r) if (n.name in r[a]) { cnt++; found = r[a][n.name]; }
        if (cnt > 1) throw new SqlError(`A coluna "${n.name}" é ambígua. Diga de qual tabela: tabela.${n.name}`);
        if (cnt === 1) return found;
      }
    }
    if (!n.table && x.out && n.name in x.out) return x.out[n.name];
  }
  throw new SqlError(n.table ? `Não existe a tabela/apelido "${n.table}" nesta consulta.` : `Coluna desconhecida: "${n.name}". Confira o nome na lista de tabelas.`);
}
function aggregate(n, c) {
  if (!c.group) throw new SqlError(`${n.name}() não pode ser usado no WHERE. Para filtrar resultados agregados use HAVING.`);
  const rows = c.group;
  if (n.name === 'COUNT' && n.star) return rows.length;
  if (!n.args.length) throw new SqlError(`${n.name}() precisa de um argumento.`);
  let vals = rows.map(r => ev(n.args[0], { row: r, parent: c.parent })).filter(v => v != null);
  if (n.distinct) vals = [...new Set(vals)];
  switch (n.name) {
    case 'COUNT': return vals.length;
    case 'SUM': return vals.length ? vals.reduce((a, b) => a + Number(b), 0) : null;
    case 'AVG': return vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null;
    case 'MIN': return vals.length ? vals.reduce((a, b) => cmpv(a, b) <= 0 ? a : b) : null;
    case 'MAX': return vals.length ? vals.reduce((a, b) => cmpv(a, b) >= 0 ? a : b) : null;
  }
}
function scalarFn(n, c) {
  const a = n.args.map(x => ev(x, c));
  const s = v => v == null ? null : String(v);
  switch (n.name) {
    case 'UPPER': return a[0] == null ? null : s(a[0]).toUpperCase();
    case 'LOWER': return a[0] == null ? null : s(a[0]).toLowerCase();
    case 'LENGTH': case 'LEN': return a[0] == null ? null : s(a[0]).length;
    case 'TRIM': return a[0] == null ? null : s(a[0]).trim();
    case 'ABS': return a[0] == null ? null : Math.abs(a[0]);
    case 'ROUND': return a[0] == null ? null : Number(Number(a[0]).toFixed(a[1] || 0));
    case 'COALESCE': case 'IFNULL': return a.find(v => v != null) ?? null;
    case 'REPLACE': return a[0] == null ? null : s(a[0]).split(s(a[1])).join(s(a[2]));
    case 'SUBSTR': case 'SUBSTRING': { if (a[0] == null) return null; const st = Math.max(1, a[1] || 1) - 1; return a[2] == null ? s(a[0]).slice(st) : s(a[0]).substr(st, a[2]); }
    case 'CONCAT': return a.map(x => x == null ? '' : x).join('');
  }
  throw new SqlError(`Função desconhecida: ${n.name}()`);
}
function ev(n, c) {
  switch (n.k) {
    case 'lit': return n.v;
    case 'col': return lookup(n, c);
    case 'neg': { const v = ev(n.e, c); return v == null ? null : -v; }
    case 'not': { const v = toB(ev(n.e, c)); return v == null ? null : !v; }
    case 'and': { const l = toB(ev(n.l, c)); if (l === false) return false; const r = toB(ev(n.r, c)); if (r === false) return false; return (l == null || r == null) ? null : true; }
    case 'or': { const l = toB(ev(n.l, c)); if (l === true) return true; const r = toB(ev(n.r, c)); if (r === true) return true; return (l == null || r == null) ? null : false; }
    case 'cmp': {
      const l = ev(n.l, c), r = ev(n.r, c);
      if (l == null || r == null) return null;
      const d = cmpv(l, r);
      switch (n.op) { case '=': return d === 0; case '<>': return d !== 0; case '<': return d < 0; case '>': return d > 0; case '<=': return d <= 0; case '>=': return d >= 0; }
      return null;
    }
    case 'ar': {
      const l = ev(n.l, c), r = ev(n.r, c);
      if (l == null || r == null) return null;
      if (n.op === '||') return String(l) + String(r);
      const a = Number(l), b = Number(r);
      switch (n.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b === 0 ? null : a / b; case '%': return b === 0 ? null : a % b; }
      return null;
    }
    case 'like': { const l = ev(n.l, c), r = ev(n.r, c); if (l == null || r == null) return null; const m = likeRe(r).test(String(l)); return n.neg ? !m : m; }
    case 'between': {
      const l = ev(n.l, c), a = ev(n.a, c), b = ev(n.b, c);
      if (l == null || a == null || b == null) return null;
      const m = cmpv(l, a) >= 0 && cmpv(l, b) <= 0; return n.neg ? !m : m;
    }
    case 'isnull': { const v = ev(n.l, c); return n.neg ? v != null : v == null; }
    case 'in': {
      const l = ev(n.l, c); if (l == null) return null;
      let vals;
      if (n.sub) { const r = execSelect(n.sub, c); if (r.cols.length !== 1) throw new SqlError('A subconsulta dentro de IN deve devolver apenas uma coluna.'); vals = r.rows.map(x => x[0]); }
      else vals = n.list.map(x => ev(x, c));
      const found = vals.some(v => v != null && cmpv(l, v) === 0);
      if (found) return !n.neg;
      if (vals.some(v => v == null)) return null;
      return !!n.neg;
    }
    case 'exists': return execSelect(n.sub, c).rows.length > 0;
    case 'scalar': { const r = execSelect(n.sub, c); if (r.cols.length !== 1) throw new SqlError('Uma subconsulta usada como valor deve devolver apenas uma coluna.'); return r.rows.length ? r.rows[0][0] : null; }
    case 'case': {
      const base = n.base ? ev(n.base, c) : null;
      for (const w of n.whens) {
        const cv = ev(w.c, c);
        if (n.base ? (cv != null && base != null && cmpv(base, cv) === 0) : toB(cv) === true) return ev(w.v, c);
      }
      return n.els ? ev(n.els, c) : null;
    }
    case 'fn': return AGG.has(n.name) ? aggregate(n, c) : scalarFn(n, c);
  }
  throw new SqlError('Expressão não suportada.');
}
const blank = cols => Object.fromEntries(cols.map(x => [x, null]));
function execSelect(q, parent) {
  const schema = []; let rows = [{}]; const nullRow = {};
  const srcRows = src => {
    if (src.sub) {
      const r = execSelect(src.sub, null);
      const cols = r.cols.map(x => String(x).toLowerCase());
      return { alias: src.alias, cols, objs: r.rows.map(a => Object.fromEntries(cols.map((cn, i) => [cn, a[i]]))) };
    }
    const t = CUR_DB[src.name];
    if (!t) throw new SqlError(`A tabela "${src.name}" não existe. Tabelas deste caso: ${Object.keys(CUR_DB).join(', ')}.`);
    return { alias: src.alias, cols: t.cols, objs: t.rows };
  };
  if (q.from) {
    const f = srcRows(q.from); schema.push(f); nullRow[f.alias] = blank(f.cols);
    rows = f.objs.map(o => ({ [f.alias]: o }));
    for (const j of q.joins) {
      const s = srcRows(j.src);
      if (nullRow[s.alias]) throw new SqlError(`O apelido "${s.alias}" foi usado duas vezes. Dê apelidos diferentes (ex.: ${s.alias} a, ${s.alias} b).`);
      const out = [];
      for (const r of rows) {
        let matched = false;
        for (const o of s.objs) {
          const nr = { ...r, [s.alias]: o };
          if (j.type === 'cross' || toB(ev(j.on, { row: nr, parent })) === true) { out.push(nr); matched = true; }
        }
        if (!matched && j.type === 'left') out.push({ ...r, [s.alias]: blank(s.cols) });
      }
      rows = out; schema.push(s); nullRow[s.alias] = blank(s.cols);
    }
  }
  if (q.where) rows = rows.filter(r => toB(ev(q.where, { row: r, parent })) === true);

  // colunas de saída
  const cols = [];
  for (const it of q.items) {
    if (it.star) {
      const list = it.table ? schema.filter(s => s.alias === it.table) : schema;
      if (!list.length) throw new SqlError(it.table ? `Não existe a tabela/apelido "${it.table}".` : 'SELECT * precisa de FROM.');
      for (const s of list) for (const cn of s.cols) cols.push({ name: cn, node: { k: 'col', table: s.alias, name: cn } });
    } else cols.push({ name: it.name, alias: it.alias, node: it.expr });
  }
  const aliasNode = {}; q.items.forEach(it => { if (it.alias) aliasNode[it.alias] = it.expr; });
  const resolveRef = g => {
    if (g.k === 'lit' && typeof g.v === 'number') { const c = cols[g.v - 1]; if (!c) throw new SqlError('Posição inválida em GROUP BY/ORDER BY.'); return c.node; }
    if (g.k === 'col' && !g.table && aliasNode[g.name]) {
      const inSchema = schema.some(s => s.cols.includes(g.name));
      if (!inSchema) return aliasNode[g.name];
    }
    return g;
  };
  const aggMode = q.group.length > 0 || cols.some(c => hasAgg(c.node)) || (q.having && hasAgg(q.having)) || q.order.some(o => hasAgg(o.e));
  let groups;
  if (aggMode) {
    if (q.group.length) {
      const gx = q.group.map(resolveRef); const map = new Map();
      for (const r of rows) { const key = JSON.stringify(gx.map(g => ev(g, { row: r, parent }))); if (!map.has(key)) map.set(key, []); map.get(key).push(r); }
      groups = [...map.values()];
    } else groups = [rows];
  } else groups = rows.map(r => [r]);

  let recs = [];
  for (const g of groups) {
    const ctx = aggMode ? { row: g[0] || nullRow, group: g, parent } : { row: g[0], parent };
    const vals = cols.map(c => ev(c.node, ctx));
    const out = {}; cols.forEach((c, i) => { out[(c.alias || String(c.name)).toLowerCase()] = vals[i]; });
    ctx.out = out;
    if (q.having && toB(ev(q.having, ctx)) !== true) continue;
    recs.push({ vals, ctx });
  }
  if (q.distinct) { const seen = new Set(); recs = recs.filter(r => { const k = JSON.stringify(r.vals); if (seen.has(k)) return false; seen.add(k); return true; }); }
  if (q.order.length) {
    recs.forEach(r => {
      r.keys = q.order.map(o => {
        if (o.e.k === 'lit' && typeof o.e.v === 'number') { if (!cols[o.e.v - 1]) throw new SqlError('Posição inválida em ORDER BY.'); return r.vals[o.e.v - 1]; }
        return ev(o.e, r.ctx);
      });
    });
    const idx = recs.map((r, i) => [r, i]);
    idx.sort((A, B) => {
      for (let k = 0; k < q.order.length; k++) {
        const a = A[0].keys[k], b = B[0].keys[k]; let d;
        if (a == null && b == null) d = 0; else if (a == null) d = -1; else if (b == null) d = 1; else d = cmpv(a, b);
        if (d !== 0) return q.order[k].desc ? -d : d;
      }
      return A[1] - B[1];
    });
    recs = idx.map(x => x[0]);
  }
  if (q.offset) recs = recs.slice(Number(ev(q.offset, { row: {} })) || 0);
  if (q.limit) recs = recs.slice(0, Number(ev(q.limit, { row: {} })));
  return { cols: cols.map(c => c.name), rows: recs.map(r => r.vals) };
}
function makeDB(tables) {
  const db = {};
  for (const t of tables) db[t.name.toLowerCase()] = { cols: t.cols || Object.keys(t.rows[0] || {}), rows: t.rows };
  return db;
}
function runSQL(db, sql) {
  CUR_DB = db;
  const ast = new Parser(sql.trim()).parseQuery();
  return execSelect(ast, null);
}
if (typeof module !== 'undefined') module.exports = { runSQL, makeDB, SqlError };
