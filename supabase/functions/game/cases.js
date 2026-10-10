/* ================= CASOS ================= */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function RNG(seed) {
  const r = mulberry32(seed);
  const o = {
    f: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: arr => arr[Math.floor(r() * arr.length)],
    shuffle: arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample: (arr, n) => o.shuffle(arr).slice(0, n),
    chance: p => r() < p
  };
  return o;
}
const FIRST = ['Ana','Bruno','Carla','Diego','Elisa','Fábio','Gabriela','Hugo','Inês','João','Karina','Leandro','Marina','Nelson','Olívia','Paulo','Renata','Sérgio','Tatiana','Ulisses','Vera','Wagner','Yasmin','Zeca','Alice','Caio','Débora','Eduardo','Flávia','Gustavo','Helena','Igor','Júlia','Lucas','Mônica','Otávio','Priscila','Rafael','Sofia','Tiago'];
const LAST = ['Almeida','Barros','Cardoso','Duarte','Esteves','Ferraz','Gomes','Henriques','Ibarra','Jardim','Klein','Lacerda','Machado','Nogueira','Oliveira','Pacheco','Queiroz','Ribeiro','Siqueira','Tavares','Uchoa','Vasconcelos','Werneck','Xavier','Zanetti','Moura','Coelho','Batista','Teles','Fontes'];
const PROF = ['Segurança','Garçom','Contador','Recepcionista','Gerente','Motorista','Cozinheiro','Eletricista','Jardineiro','Advogado','Fotógrafo','Faxineiro','Músico','Vendedor','Enfermeiro'];
const ROOMS_C = ['Cofre','Salão Principal','Corredor Leste','Depósito','Escritório','Saída dos Fundos','Sala de Controle'];
const ROOMS_M = ['Biblioteca','Jardim','Cozinha','Salão de Festas','Adega','Terraço','Quarto Azul'];
const STATIONS = ['Central','Jardim Botânico','Mercado Velho','Cais do Porto','Torre Alta','Vila Nova','Ponte Azul','Largo da Matriz','Parque Sul','Terminal Norte','Aeroporto','Rodoviária','Bairro Alto','Colina Verde','Estádio','Universidade','Hospital','Praça Dourada','Fábrica Velha','Morro do Sol'];
const REG = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'];
const TRANSP = ['taxi', 'onibus', 'metro', 'balsa'];
const roomsOf = k => k === 'morte' ? ROOMS_M : ROOMS_C;
const hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const pad2 = n => String(n).padStart(2, '0');
function mkNames(R, n) { const s = new Set(), out = []; while (out.length < n) { const nm = R.pick(FIRST) + ' ' + R.pick(LAST); if (!s.has(nm)) { s.add(nm); out.push(nm); } } return out; }
function mkPeople(R, n) { return mkNames(R, n).map((nome, i) => ({ id: i + 1, nome, profissao: R.pick(PROF), idade: R.int(22, 64) })); }
const T = (name, desc, rows) => ({ name, desc, rows, cols: Object.keys(rows[0]) });
const KIND_R = { roubo: 'ladrão', morte: 'assassino', sabot: 'sabotador', fraude: 'fraudador' };

const CRIMES = [
  // m1
  { t: 'A Maleta Vermelha', d: 'Uma maleta com contratos secretos desapareceu da suíte presidencial do Hotel Imperial durante uma recepção.', l: 'Hotel Imperial', k: 'roubo' },
  { t: 'O Disco de Ouro', d: 'O disco de ouro de um astro do rock foi levado do Estúdio Vinil Dourado durante uma festa de lançamento.', l: 'Estúdio Vinil Dourado', k: 'roubo' },
  { t: 'O Relógio do Barão', d: 'O relógio de bolso do Barão sumiu durante o leilão beneficente da Casa Sotero.', l: 'Casa Sotero', k: 'roubo' },
  // m2
  { t: 'A Coroa de Esmeraldas', d: 'A coroa de esmeraldas da Duquesa desapareceu da vitrine do Museu Aurora na noite de inauguração.', l: 'Museu Aurora', k: 'roubo' },
  { t: 'O Violino Fantasma', d: 'Um violino Stradivarius sumiu do camarim do Teatro Municipal minutos antes do concerto.', l: 'Teatro Municipal', k: 'roubo' },
  { t: 'O Troféu Roubado', d: 'A taça do campeonato sumiu do Clube Atlético Cerrado na noite da grande final.', l: 'Clube Atlético Cerrado', k: 'roubo' },
  // m3
  { t: 'O Cofre do Cassino', d: 'R$ 2 milhões em fichas evaporaram do cofre do Cassino Estrela do Sul.', l: 'Cassino Estrela do Sul', k: 'roubo' },
  { t: 'O Código-Fonte', d: 'O código-fonte do aplicativo da startup Nimbus foi copiado e vendido a uma concorrente.', l: 'Startup Nimbus', k: 'roubo' },
  { t: 'A Receita Secreta', d: 'A receita secreta do doce mais famoso da Confeitaria Imperial foi roubada da sala do chef.', l: 'Confeitaria Imperial', k: 'roubo' },
  // m4
  { t: 'O Manuscrito Perdido', d: 'Um manuscrito raro de 1822 sumiu do cofre da Biblioteca Central.', l: 'Biblioteca Central', k: 'roubo' },
  { t: 'O Quadro Falso', d: 'A obra-prima da Galeria Prisma foi trocada por uma falsificação perfeita.', l: 'Galeria Prisma', k: 'roubo' },
  { t: 'A Fórmula Vita', d: 'A fórmula de um remédio inovador desapareceu do cofre do Laboratório Vita.', l: 'Laboratório Vita', k: 'roubo' },
  // m5
  { t: 'Morte na Mansão Valverde', d: 'O magnata Augusto Valverde foi encontrado morto na biblioteca de sua mansão durante um jantar.', l: 'Mansão Valverde', k: 'morte' },
  { t: 'O Chef Envenenado', d: 'O renomado chef Lucien caiu morto na cozinha do restaurante Lumière em plena noite de estreia.', l: 'Restaurante Lumière', k: 'morte' },
  { t: 'O Juiz Silenciado', d: 'O juiz Armando foi achado sem vida em seu gabinete no Fórum Central.', l: 'Fórum Central', k: 'morte' },
  // m6
  { t: 'O Baile de Máscaras', d: 'Um convidado foi encontrado sem vida no Salão Régio durante um baile de máscaras.', l: 'Salão Régio', k: 'morte' },
  { t: 'Último Ato', d: 'O ator principal desabou morto no palco do Teatro Opala diante de uma plateia lotada.', l: 'Teatro Opala', k: 'morte' },
  { t: 'Fim de Festival', d: 'O produtor do festival foi encontrado morto nos bastidores do Festival Sol Maior.', l: 'Festival Sol Maior', k: 'morte' },
  // m7 (Scotland Yard)
  { t: 'Crime no Expresso Cerrado', d: 'Um passageiro foi achado morto na cabine do trem Expresso Cerrado. O assassino fugiu pela cidade usando vários meios de transporte.', l: 'Expresso Cerrado', k: 'morte' },
  { t: 'Maré Vermelha', d: 'Um hóspede foi encontrado morto no convés do iate Maré Alta. O culpado desembarcou e despistou a polícia pela cidade.', l: 'Iate Maré Alta', k: 'morte' },
  { t: 'O Carro-Forte', d: 'Um carro-forte do Banco Aurora foi esvaziado em plena avenida. O ladrão fugiu misturando táxi, ônibus, metrô e balsa.', l: 'Banco Aurora', k: 'roubo' },
  // m8
  { t: 'Silêncio no Observatório', d: 'O astrônomo Dr. Hélio foi encontrado morto no Observatório da Serra. A polícia suspeita que houve um mandante.', l: 'Observatório da Serra', k: 'morte' },
  { t: 'A Herdeira', d: 'A herdeira Beatriz morreu após o jantar na Fazenda Santa Clara. Alguém encomendou o crime.', l: 'Fazenda Santa Clara', k: 'morte' },
  { t: 'O Tesouro do Museu Naval', d: 'O acervo de moedas antigas do Museu Naval foi esvaziado por uma quadrilha com um cabeça por trás.', l: 'Museu Naval', k: 'roubo' },
  // m9
  { t: 'Desfalque no Banco Meridional', d: 'R$ 500 mil sumiram de contas do Banco Meridional por meio de saques picotados.', l: 'Banco Meridional', k: 'fraude' },
  { t: 'A Folha Fantasma', d: 'Salários de funcionários inexistentes foram sacados na Prefeitura de Vila Nova.', l: 'Prefeitura de Vila Nova', k: 'fraude' },
  { t: 'Golpe na Seguradora', d: 'Sinistros falsos drenaram o caixa da Seguradora Fênix.', l: 'Seguradora Fênix', k: 'fraude' },
  // m10
  { t: 'Incêndio no Armazém 7', d: 'Um incêndio criminoso destruiu o Armazém 7 do Cais Norte. É o último de uma série de ataques.', l: 'Armazém 7', k: 'sabot' },
  { t: 'A Orquídea Negra', d: 'Uma orquídea rara avaliada em fortuna foi levada do Jardim Botânico. A mesma quadrilha atacou outros alvos.', l: 'Jardim Botânico', k: 'roubo' },
  { t: 'O Piano de Cauda', d: 'Um piano histórico desapareceu do Conservatório Mozart, o terceiro roubo parecido na cidade.', l: 'Conservatório Mozart', k: 'roubo' },
  // m11 (Scotland Yard avançado)
  { t: 'Sabotagem no Genoma', d: 'O protótipo do Laboratório Genoma foi destruído horas antes da apresentação. O sabotador fugiu pelo metrô, táxis e balsas.', l: 'Laboratório Genoma', k: 'sabot' },
  { t: 'Apagão na Usina', d: 'Alguém desligou os geradores da Usina Solar Horizonte e sumiu na madrugada.', l: 'Usina Solar Horizonte', k: 'sabot' },
  { t: 'Hackers no Hospital', d: 'Os prontuários do Hospital São Lucas foram apagados por um ataque vindo de dentro, e o autor fugiu da cidade.', l: 'Hospital São Lucas', k: 'sabot' },
  // m12
  { t: 'O Caixa Dois', d: 'Um desvio de verbas foi descoberto na ONG Mãos Dadas. O cofre só abre com chave.', l: 'ONG Mãos Dadas', k: 'fraude' },
  { t: 'O Anel de Noivado', d: 'O anel de diamante do prefeito sumiu do Hotel Lago Azul durante o jantar de gala.', l: 'Hotel Lago Azul', k: 'roubo' },
  { t: 'O Carregamento Sumido', d: 'Um contêiner de eletrônicos desapareceu do Porto Seco do Cerrado.', l: 'Porto Seco do Cerrado', k: 'roubo' }
];

/* ---------- Mecânicas ---------- */
// m1: WHERE
function m1(R, cr) {
  const names = mkNames(R, 10), tc = 1230 + R.int(0, 6) * 15, tcs = hm(tc);
  const roles = R.shuffle(['cul', 'pres', 'pres', 'pres', 'antes', 'antes', 'antes', 'depois', 'depois', 'depois']);
  const rows = []; let cul = '';
  names.forEach((nome, i) => {
    let e, s, c; const r = roles[i];
    if (r === 'cul') { e = tc - R.int(15, 70); s = tc + R.int(10, 80); c = 'nao'; cul = nome; }
    else if (r === 'pres') { e = tc - R.int(10, 90); s = tc + R.int(5, 90); c = 'sim'; }
    else if (r === 'antes') { s = tc - R.int(5, 50); e = s - R.int(30, 90); c = R.pick(['sim', 'nao', 'nao']); }
    else { e = tc + R.int(5, 50); s = e + R.int(30, 90); c = R.pick(['sim', 'nao', 'nao']); }
    rows.push({ id: i + 1, nome, entrada: hm(e), saida: hm(s), convite: c });
  });
  return {
    tables: [T('visitantes', 'Livro de visitas da noite do crime (horários no formato HH:MM).', rows)],
    culpado: cul,
    briefing: [`O crime aconteceu exatamente às ${tcs}. A segurança jura que o culpado entrou sem convite (convite = 'nao') e ainda estava lá dentro naquele minuto.`],
    solucao: `SELECT nome\nFROM visitantes\nWHERE entrada <= '${tcs}' AND saida >= '${tcs}' AND convite = 'nao';`,
    dicas: ['Comece conhecendo a tabela: SELECT * FROM visitantes;', `Use WHERE com três condições ligadas por AND: entrada <= '${tcs}', saida >= '${tcs}' e convite = 'nao'.`]
  };
}
// m2: ORDER BY / LIMIT
function m2(R, cr) {
  const names = mkNames(R, 11), roles = R.shuffle([...Array(7).fill('convidado'), ...Array(4).fill('funcionario')]);
  const base = 1320 + R.int(0, 3) * 10;
  let sai = R.shuffle([...Array(11).keys()]).map(i => base + i * 7);
  let top = sai.indexOf(Math.max(...sai));
  if (roles[top] === 'convidado') { const f = roles.indexOf('funcionario'); [sai[top], sai[f]] = [sai[f], sai[top]]; }
  const rows = names.map((nome, i) => ({ id: i + 1, nome, categoria: roles[i], entrada: hm(sai[i] - R.int(60, 180)), saida: hm(sai[i]) }));
  const guests = rows.filter(r => r.categoria === 'convidado').sort((a, b) => b.saida.localeCompare(a.saida));
  return {
    tables: [T('portaria', 'Registro da portaria: quem entrou e saiu, e se era convidado ou funcionário.', rows)],
    culpado: guests[0].nome,
    briefing: ['Funcionários podem entrar e sair a qualquer hora, então não interessam. O culpado era um convidado e foi o último convidado a deixar o local.'],
    solucao: `SELECT nome, saida\nFROM portaria\nWHERE categoria = 'convidado'\nORDER BY saida DESC\nLIMIT 1;`,
    dicas: ['Filtre só os convidados: WHERE categoria = \'convidado\'.', 'ORDER BY saida DESC coloca quem saiu mais tarde no topo. LIMIT 1 mostra só a primeira linha.']
  };
}
// m3: JOIN
function m3(R, cr) {
  const ppl = mkPeople(R, 10), P = R.pick(['Segurança', 'Gerente', 'Motorista', 'Eletricista']);
  const rooms = R.sample(roomsOf(cr.k), 4), X = rooms[0], others = rooms.slice(1);
  const w1 = R.int(1260, 1320), w2 = w1 + 30;
  ppl.forEach(p => p.profissao = R.pick(PROF.filter(x => x !== P)));
  const idx = R.shuffle([...Array(10).keys()]);
  const cul = ppl[idx[0]]; cul.profissao = P; ppl[idx[1]].profissao = P; ppl[idx[2]].profissao = P;
  const sw = []; const add = (p, sala, m) => sw.push({ pessoa_id: p.id, sala, hora: hm(m) });
  add(cul, X, R.int(w1 + 2, w2 - 2)); add(cul, R.pick(others), R.int(1170, w1 - 10));
  add(ppl[idx[1]], X, R.int(1170, w1 - 10)); add(ppl[idx[1]], R.pick(others), R.int(w1 + 1, w2 - 1));
  add(ppl[idx[2]], X, R.int(w2 + 5, 1410)); add(ppl[idx[2]], R.pick(others), R.int(w1, w2));
  add(ppl[idx[3]], X, R.int(w1 + 1, w2 - 1)); add(ppl[idx[4]], X, R.int(w1 + 1, w2 - 1));
  for (let k = 3; k < 10; k++) { const n = R.int(1, 3); for (let q = 0; q < n; q++) add(ppl[idx[k]], R.pick(rooms), R.int(1170, 1410)); }
  sw.sort((a, b) => a.hora.localeCompare(b.hora));
  const rows = sw.map((s, i) => ({ id: i + 1, ...s }));
  return {
    tables: [T('pessoas', 'Funcionários e convidados suspeitos.', ppl), T('cracha', 'Registro de crachás: cada vez que alguém passou o crachá na porta de uma sala.', rows)],
    culpado: cul.nome,
    briefing: [`A câmera mostra que o crime foi na sala "${X}" entre ${hm(w1)} e ${hm(w2)}. O culpado é da profissão "${P}".`, 'Nomes e profissões estão em pessoas; os horários dos crachás estão em cracha. Você vai precisar de um JOIN.'],
    solucao: `SELECT p.nome\nFROM pessoas p\nJOIN cracha c ON c.pessoa_id = p.id\nWHERE c.sala = '${X}'\n  AND c.hora >= '${hm(w1)}' AND c.hora <= '${hm(w2)}'\n  AND p.profissao = '${P}';`,
    dicas: ['Una as tabelas: FROM pessoas p JOIN cracha c ON c.pessoa_id = p.id.', `Filtre sala = '${X}', a hora entre ${hm(w1)} e ${hm(w2)} e profissao = '${P}'.`]
  };
}
// m4: IN / NOT IN
function m4(R, cr) {
  const ppl = mkPeople(R, 10), idx = R.shuffle([...Array(10).keys()]), cul = ppl[idx[0]];
  const keys = [0, 1, 2, 3, 4].map(i => ppl[idx[i]]);
  const noAl = new Set([cul.id, ppl[idx[5]].id, ppl[idx[6]].id]);
  const L = R.pick(roomsOf(cr.k).slice(0, 3));
  const WHERE = ['no restaurante da esquina', 'no cinema', 'em casa com a família', 'na academia', 'no bar do Zé', 'no culto da noite', 'na farmácia 24h'];
  const al = ppl.filter(p => !noAl.has(p.id)).map(p => ({ pessoa_id: p.id, testemunha: R.pick(ppl.filter(x => x.id !== p.id)).nome, onde: R.pick(WHERE) }));
  const alibis = R.shuffle(al).map((a, i) => ({ id: i + 1, ...a }));
  const chaves = R.shuffle(keys).map(p => ({ pessoa_id: p.id, lugar: L }));
  return {
    tables: [T('pessoas', 'Todos os suspeitos.', ppl), T('chaves', `Quem possui chave de acesso (${L}).`, chaves), T('alibis', 'Álibis informados à polícia e confirmados por uma testemunha.', alibis)],
    culpado: cul.nome,
    briefing: [`O local do crime (${L}) só abre com chave. O culpado tinha uma chave e não tem álibi nenhum.`, 'Cuidado: muita gente sem álibi não tem chave, e muita gente com chave tem álibi.'],
    solucao: `SELECT nome\nFROM pessoas\nWHERE id IN (SELECT pessoa_id FROM chaves)\n  AND id NOT IN (SELECT pessoa_id FROM alibis);`,
    dicas: ['Duas listas importam: chaves (quem pode entrar) e alibis (quem tem desculpa).', 'Use id IN (SELECT pessoa_id FROM chaves) e também id NOT IN (SELECT pessoa_id FROM alibis), ligados por AND.']
  };
}
// m5: GROUP BY / HAVING
function m5(R, cr) {
  const ppl = mkPeople(R, 9), idx = R.shuffle([...Array(9).keys()]);
  const alvo = ppl[idx[0]], cul = ppl[idx[1]];
  const calls = []; const add = (o, d, dur) => calls.push({ origem_id: o.id, destino_id: d.id, hora: hm(R.int(1080, 1410)), duracao_seg: dur });
  for (let i = 0; i < 6; i++) add(cul, alvo, R.int(70, 400));
  for (let i = 0; i < 2; i++) add(cul, alvo, R.int(8, 40));
  for (let i = 0; i < 7; i++) add(ppl[idx[2]], alvo, R.int(4, 45));
  for (let i = 0; i < 3; i++) add(ppl[idx[3]], alvo, R.int(65, 300));
  for (let i = 0; i < 4; i++) add(ppl[idx[4]], alvo, R.int(65, 300));
  add(ppl[idx[5]], alvo, R.int(70, 200)); add(ppl[idx[6]], alvo, R.int(70, 200));
  for (let i = 0; i < 12; i++) { const a = R.pick(ppl), b = R.pick(ppl.filter(x => x.id !== a.id && x.id !== alvo.id)); add(a, b, R.int(5, 500)); }
  calls.sort((a, b) => a.hora.localeCompare(b.hora));
  const rows = calls.map((c, i) => ({ id: i + 1, ...c }));
  return {
    tables: [T('pessoas', 'Pessoas ligadas ao caso.', ppl), T('ligacoes', 'Registro de ligações telefônicas (duração em segundos).', rows)],
    culpado: cul.nome,
    briefing: [`${alvo.nome} (id = ${alvo.id}) recebeu uma enxurrada de ligações ameaçadoras antes do crime em ${cr.l}. O culpado é quem mais ligou para essa pessoa.`, 'Só contam chamadas atendidas, ou seja, com duracao_seg de pelo menos 60. Chamadas curtas foram perdidas.'],
    solucao: `SELECT p.nome, COUNT(*) AS total\nFROM ligacoes l\nJOIN pessoas p ON p.id = l.origem_id\nWHERE l.destino_id = ${alvo.id} AND l.duracao_seg >= 60\nGROUP BY p.nome\nORDER BY total DESC\nLIMIT 1;`,
    dicas: [`Filtre destino_id = ${alvo.id} e duracao_seg >= 60. Depois agrupe por quem ligou (origem_id).`, 'Use GROUP BY p.nome com COUNT(*) AS total e ORDER BY total DESC.']
  };
}
// m6: depoimentos
function m6(R, cr) {
  const H = ['loiro', 'castanho', 'ruivo', 'grisalho', 'preto'], A = ['chapéu', 'óculos escuros', 'cachecol', 'luvas', 'boné'];
  const hx = R.pick(H), ax = R.pick(A), nm = mkNames(R, 16);
  const nh = () => R.pick(H.filter(h => h !== hx)), na = () => R.pick(A.filter(a => a !== ax));
  const spec = [{ h: hx, a: ax, cul: true }, { h: hx, a: na() }, { h: hx, a: na() }, { h: nh(), a: ax }, { h: nh(), a: ax }];
  for (let i = 5; i < 10; i++) { let h = R.pick(H), a = R.pick(A); if (h === hx && a === ax) a = na(); spec.push({ h, a }); }
  const sh = R.shuffle(spec); let cul = '';
  const ppl = sh.map((s, i) => { if (s.cul) cul = nm[i]; return { id: i + 1, nome: nm[i], cabelo: s.h, acessorio: s.a }; });
  const w = nm.slice(10), h2 = nh(), a2 = na();
  const deps = R.shuffle([
    { testemunha: w[0], confiavel: 'sim', texto: `Vi alguém de cabelo ${hx} saindo apressado de ${cr.l}.` },
    { testemunha: w[1], confiavel: 'sim', texto: `A pessoa que fugiu usava ${ax}. Reparei porque era a única assim na festa.` },
    { testemunha: w[2], confiavel: 'sim', texto: 'Ouvi uma porta bater por volta das 22h, mas não vi ninguém.' },
    { testemunha: w[3], confiavel: 'nao', texto: `Tenho quase certeza de que o cabelo era ${h2}, mas estava muito escuro.` },
    { testemunha: w[4], confiavel: 'nao', texto: `Foi alguém com ${a2}... eu acho. Eu tinha bebido um pouco.` },
    { testemunha: w[5], confiavel: 'nao', texto: 'Foi o mordomo, sempre é o mordomo!' }
  ]).map((d, i) => ({ id: i + 1, ...d }));
  return {
    tables: [T('pessoas', 'Suspeitos e suas características físicas.', ppl), T('depoimentos', 'Depoimentos de testemunhas. Só os com confiavel = \'sim\' valem.', deps)],
    culpado: cul,
    briefing: ['Várias testemunhas descreveram o fugitivo, mas algumas estavam bêbadas, com medo ou só inventando. Leia os depoimentos e confie apenas nos marcados como confiáveis.', 'Depois, procure em pessoas quem combina com TODAS as características confiáveis.'],
    solucao: `SELECT nome\nFROM pessoas\nWHERE cabelo = '${hx}' AND acessorio = '${ax}';`,
    dicas: ["Rode SELECT * FROM depoimentos WHERE confiavel = 'sim'; e anote o que as testemunhas viram.", 'Com as duas características confiáveis, filtre pessoas com WHERE cabelo = ... AND acessorio = ...']
  };
}
// m7: Scotland Yard bilhetes
function m7(R, cr) {
  const turns = 6, est = R.sample(STATIONS, 16).map((nome, i) => ({ id: i + 1, nome, regiao: R.pick(REG) }));
  const names = mkNames(R, 7), sus = names.map((nome, i) => ({ id: i + 1, nome, profissao: R.pick(PROF) }));
  let truth; do { truth = Array.from({ length: turns }, () => R.pick(TRANSP)); } while (new Set(truth).size < 3);
  const culIdx = R.int(0, 6), dec = R.shuffle([4, 4, 3, 3, 2, 1]); let d = 0; const rastro = [];
  sus.forEach((s, si) => {
    const matches = si === culIdx ? turns : dec[d++];
    const mt = new Set(R.sample([...Array(turns).keys()], matches));
    for (let t = 0; t < turns; t++) rastro.push({ suspeito_id: s.id, turno: t + 1, estacao_id: R.int(1, 16), transporte: mt.has(t) ? truth[t] : R.pick(TRANSP.filter(x => x !== truth[t])) });
  });
  const rows = rastro.map((r, i) => ({ id: i + 1, ...r }));
  const bil = truth.map((transporte, i) => ({ turno: i + 1, transporte }));
  return {
    tables: [T('estacoes', 'Mapa da cidade: estações e regiões.', est), T('suspeitos', 'Os sete suspeitos da caçada.', sus), T('bilhetes_x', 'Bilhetes que o fugitivo (o "Mr. X") usou a cada turno. A polícia interceptou o tipo de transporte.', bil), T('rastro', 'Onde cada suspeito esteve a cada turno e qual transporte usou.', rows)],
    culpado: sus[culIdx].nome,
    briefing: ['Estilo Scotland Yard: o fugitivo não mostra onde está, mas seus bilhetes foram interceptados. Em cada turno você sabe qual transporte ele usou (taxi, onibus, metro ou balsa).', `O culpado é o único suspeito cujo rastro usa o MESMO transporte do fugitivo nos ${turns} turnos. Os outros erram pelo menos um turno.`],
    solucao: `SELECT s.nome, COUNT(*) AS acertos\nFROM rastro r\nJOIN bilhetes_x b ON b.turno = r.turno AND b.transporte = r.transporte\nJOIN suspeitos s ON s.id = r.suspeito_id\nGROUP BY s.nome\nORDER BY acertos DESC;`,
    dicas: ['Junte rastro com bilhetes_x usando DUAS condições: o mesmo turno e o mesmo transporte.', `Agrupe por suspeito e conte os acertos com COUNT(*). Quem acertou ${turns} de ${turns} é o culpado.`]
  };
}
// m8: self join
function m8(R, cr) {
  const ppl = mkPeople(R, 10), idx = R.shuffle([...Array(10).keys()]);
  const acc = ppl[idx[0]], cul = ppl[idx[1]], dCafe = ppl[idx[2]], dHora = ppl[idx[3]], dDia = ppl[idx[4]];
  const L = R.pick(['Beco da Estrela', 'Terminal Velho', 'Cais 9', 'Estacionamento Sul', 'Ponte Antiga']);
  const day = R.int(8, 20), dia = `2026-09-${pad2(day)}`, hora = R.int(1290, 1380), cafe = 'Café Central';
  const rows = []; const add = (p, lugar, d, h) => rows.push({ pessoa_id: p.id, lugar, dia: d, hora: hm(h) });
  add(acc, L, dia, hora); add(cul, L, dia, hora);
  add(acc, cafe, dia, hora - 120); add(dCafe, cafe, dia, hora - 120);
  add(dHora, L, dia, hora + R.int(20, 50));
  add(dDia, L, `2026-09-${pad2(day - R.int(2, 6))}`, hora);
  add(acc, 'Praça Dourada', `2026-09-${pad2(day + 1)}`, 600);
  const spots = [L, cafe, 'Praça Dourada', 'Mercado Velho', 'Parque Sul'];
  for (let k = 0; k < 14; k++) { const p = R.pick(ppl.filter(x => x.id !== acc.id)); if (p.id === cul.id || p.id === dCafe.id) continue; add(p, R.pick(spots), `2026-09-${pad2(R.int(day - 8, day + 3))}`, R.int(480, 1400)); }
  const clash = (a, b) => a.pessoa_id !== b.pessoa_id && a.lugar === b.lugar && a.dia === b.dia && a.hora === b.hora;
  const keep = rows.filter((r, i) => !(r.pessoa_id !== acc.id && rows.some(a => a.pessoa_id === acc.id && clash(a, r)) && !(r.pessoa_id === cul.id || r.pessoa_id === dCafe.id)));
  keep.sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
  const tab = keep.map((r, i) => ({ id: i + 1, ...r }));
  return {
    tables: [T('pessoas', 'Suspeitos e conhecidos.', ppl), T('encontros', 'Registro de onde cada pessoa foi vista (lugar, dia e hora).', tab)],
    culpado: cul.nome,
    briefing: [`O cúmplice já foi preso: é ${acc.nome} (id = ${acc.id}). Ele confessou ter recebido ordens de um mandante num encontro em "${L}", mas não lembra o nome.`, 'Descubra quem estava no mesmo lugar, no mesmo dia e na mesma hora que o cúmplice. Isso exige comparar a tabela encontros com ela mesma (self join).'],
    solucao: `SELECT p.nome\nFROM encontros a\nJOIN encontros b ON a.lugar = b.lugar AND a.dia = b.dia AND a.hora = b.hora\n                AND a.pessoa_id <> b.pessoa_id\nJOIN pessoas p ON p.id = b.pessoa_id\nWHERE a.pessoa_id = ${acc.id} AND a.lugar = '${L}';`,
    dicas: ['Use a tabela encontros duas vezes, com apelidos diferentes: encontros a e encontros b.', 'Ligue a e b por lugar, dia e hora iguais e pessoa_id diferentes. Filtre a.pessoa_id pelo cúmplice.']
  };
}
// m9: JOIN triplo + SUM
function m9(R, cr) {
  const ppl = mkPeople(R, 9), idx = R.shuffle([...Array(9).keys()]);
  const cul = ppl[idx[0]], d1 = ppl[idx[1]], d2 = ppl[idx[2]], d3 = ppl[idx[3]], d4 = ppl[idx[4]];
  const BANKS = ['Banco Meridional', 'Caixa Cerrado', 'Banco Aurora'];
  const accs = []; const accOf = {};
  ppl.forEach(p => { const n = (p.id === cul.id || p.id === d4.id) ? 2 : 1; accOf[p.id] = []; for (let i = 0; i < n; i++) { const a = { id: accs.length + 1, pessoa_id: p.id, banco: R.pick(BANKS) }; accs.push(a); accOf[p.id].push(a.id); } });
  const IN = i => `2026-08-${pad2(3 + i)}`, OUT = ['2026-07-27', '2026-07-30', '2026-08-12', '2026-08-15'];
  const tx = []; const sq = (p, v, d) => tx.push({ conta_id: R.pick(accOf[p.id]), tipo: 'saque', valor: v, dia: d });
  const dep = (p, v, d) => tx.push({ conta_id: R.pick(accOf[p.id]), tipo: 'deposito', valor: v, dia: d });
  for (let i = 0; i < 4; i++) tx.push({ conta_id: accOf[cul.id][i % 2], tipo: 'saque', valor: R.int(60, 75) * 100, dia: IN(i * 2 - (i === 3 ? 1 : 0)) });
  sq(d1, 38000, IN(R.int(0, 6)));
  for (let i = 0; i < 5; i++) sq(d2, R.int(8, 15) * 100, IN(R.int(0, 6)));
  sq(d3, 7500, IN(1)); sq(d3, 7200, IN(4)); sq(d3, 8000, R.pick(OUT));
  for (let i = 0; i < 3; i++) tx.push({ conta_id: accOf[d4.id][i % 2], tipo: 'saque', valor: R.int(30, 40) * 100, dia: IN(R.int(0, 6)) });
  ppl.forEach(p => { if (![cul.id, d1.id, d2.id, d3.id, d4.id].includes(p.id)) { dep(p, R.int(10, 50) * 100, IN(R.int(0, 6))); if (R.chance(0.6)) sq(p, R.int(5, 30) * 100, IN(R.int(0, 6))); } });
  dep(cul, 5000, IN(0)); dep(d1, 12000, IN(2));
  tx.sort((a, b) => a.dia.localeCompare(b.dia));
  const rows = tx.map((t, i) => ({ id: i + 1, ...t }));
  return {
    tables: [T('pessoas', 'Clientes e funcionários.', ppl), T('contas', 'Contas bancárias. Uma pessoa pode ter mais de uma conta!', accs), T('transacoes', 'Movimentações das contas (tipo: saque ou deposito; valor em reais).', rows)],
    culpado: cul.nome,
    briefing: [`Na semana de 03 a 09 de agosto, o fraudador fez pelo menos 3 saques somando MAIS de R$ 20.000. Ele espalhou os saques em mais de uma conta para despistar.`, 'Conte e some por pessoa, não por conta. Você vai precisar ligar transacoes, contas e pessoas.'],
    solucao: `SELECT p.nome, COUNT(*) AS saques, SUM(t.valor) AS total\nFROM transacoes t\nJOIN contas c ON c.id = t.conta_id\nJOIN pessoas p ON p.id = c.pessoa_id\nWHERE t.tipo = 'saque'\n  AND t.dia >= '2026-08-03' AND t.dia <= '2026-08-09'\nGROUP BY p.nome\nHAVING COUNT(*) >= 3 AND SUM(t.valor) > 20000;`,
    dicas: ['Caminho dos dados: transacoes → contas (conta_id) → pessoas (pessoa_id). Filtre tipo = \'saque\' e o período.', 'GROUP BY p.nome e HAVING COUNT(*) >= 3 AND SUM(t.valor) > 20000. Agrupar por conta falharia.']
  };
}
// m10: serial
function m10(R, cr) {
  const ppl = mkPeople(R, 9), idx = R.shuffle([...Array(9).keys()]);
  const LOJ = R.sample(['Joalheria Brilho', 'Loja do Relojoeiro', 'Banca de Antiguidades', 'Casa de Câmbio Sol', 'Galeria Prisma', 'Floricultura Rosa', 'Casa de Penhores Boa Sorte'], 6);
  const lojas = LOJ.map((nome, i) => ({ id: i + 1, nome }));
  const d1 = R.int(1, 6), d2 = d1 + R.int(3, 5), d3 = d2 + R.int(3, 5), days = [d1, d2, d3].map(d => `2026-09-${pad2(d)}`);
  const ls = R.sample([1, 2, 3, 4, 5, 6], 3);
  const ass = days.map((dia, i) => ({ id: i + 1, loja_id: ls[i], dia }));
  const cul = ppl[idx[0]], vis = []; const v = (p, l, d) => vis.push({ pessoa_id: p.id, loja_id: l, dia: d });
  ass.forEach(a => v(cul, a.loja_id, a.dia)); v(cul, R.pick([1, 2, 3, 4, 5, 6]), '2026-09-' + pad2(d3 + 4));
  const dA = ppl[idx[1]]; v(dA, ass[0].loja_id, ass[0].dia); v(dA, ass[1].loja_id, ass[1].dia); v(dA, ass[2].loja_id, `2026-09-${pad2(d3 + 1)}`);
  const dB = ppl[idx[2]]; ass.forEach(a => v(dB, a.loja_id, `2026-09-${pad2(+a.dia.slice(-2) + 1)}`));
  const dC = ppl[idx[3]]; v(dC, ass[1].loja_id, ass[1].dia); v(dC, ass[2].loja_id, ass[2].dia); v(dC, ass[0].loja_id, `2026-09-${pad2(d1 - 1)}`);
  const dD = ppl[idx[4]]; v(dD, ass[0].loja_id, ass[0].dia); v(dD, ass[2].loja_id, ass[2].dia);
  for (let k = 5; k < 9; k++) { const p = ppl[idx[k]]; for (let q = 0; q < R.int(2, 3); q++) { const a = R.pick(ass); const exact = R.chance(0.3); v(p, exact ? a.loja_id : R.pick([1, 2, 3, 4, 5, 6]), exact ? a.dia : `2026-09-${pad2(R.int(1, 20))}`); } }
  // evita duplicatas e garante unicidade
  const seen = new Set(); const uniq = vis.filter(x => { const key = x.pessoa_id + '|' + x.loja_id + '|' + x.dia; if (seen.has(key)) return false; seen.add(key); return true; });
  const hits = pid => ass.filter(a => uniq.some(x => x.pessoa_id === pid && x.loja_id === a.loja_id && x.dia === a.dia)).length;
  ppl.forEach(p => { if (p.id !== cul.id && hits(p.id) === 3) { const i = uniq.findIndex(x => x.pessoa_id === p.id && x.loja_id === ass[2].loja_id && x.dia === ass[2].dia); if (i >= 0) uniq.splice(i, 1); } });
  uniq.sort((a, b) => a.dia.localeCompare(b.dia));
  const rows = uniq.map((x, i) => ({ id: i + 1, ...x }));
  return {
    tables: [T('pessoas', 'Suspeitos monitorados.', ppl), T('lojas', 'Lojas e locais da região.', lojas), T('assaltos', 'Ataques já confirmados: qual local foi atingido e em que dia.', ass), T('visitas', 'Registro de câmeras: quem visitou qual loja e em que dia.', rows)],
    culpado: cul.nome,
    briefing: ['Foi uma série de ataques. Consulte a tabela assaltos: cada ataque ocorreu em uma loja e em um dia específico.', 'O culpado esteve em TODAS as lojas atacadas, exatamente no dia de cada ataque. Alguns suspeitos estiveram em duas e outros foram nas lojas certas, mas nos dias errados.'],
    solucao: `SELECT p.nome, COUNT(*) AS acertos\nFROM visitas v\nJOIN assaltos a ON a.loja_id = v.loja_id AND a.dia = v.dia\nJOIN pessoas p ON p.id = v.pessoa_id\nGROUP BY p.nome\nHAVING COUNT(*) = (SELECT COUNT(*) FROM assaltos);`,
    dicas: ['Ligue visitas a assaltos pela loja E pelo dia (duas condições no ON).', 'Agrupe por pessoa e compare COUNT(*) com o total de ataques usando uma subconsulta: HAVING COUNT(*) = (SELECT COUNT(*) FROM assaltos).']
  };
}
// m11: Scotland Yard avançado
function m11(R, cr) {
  const turns = 8, reveals = [3, 6, 8], NS = 16;
  const est = R.sample(STATIONS, NS).map((nome, i) => ({ id: i + 1, nome, regiao: R.pick(REG) }));
  const names = mkNames(R, 8), sus = names.map((nome, i) => ({ id: i + 1, nome, profissao: R.pick(PROF) }));
  const truthSt = Array.from({ length: turns }, () => R.int(1, NS));
  let truthTr; do { truthTr = Array.from({ length: turns }, () => R.pick(TRANSP)); } while (new Set(truthTr).size < 3);
  const roles = R.shuffle(['cul', 'rev', 'rev', 'tix', 'tix', 'mix', 'mix', 'mix']);
  const other = (arr, v) => R.pick(arr.filter(x => x !== v));
  const stIds = [...Array(NS).keys()].map(i => i + 1);
  const rastro = []; let cul = '';
  sus.forEach((s, si) => {
    const role = roles[si]; if (role === 'cul') cul = s.nome;
    const st = Array.from({ length: turns }, () => R.int(1, NS)), tr = truthTr.slice();
    if (role === 'cul') { for (let t = 0; t < turns; t++) st[t] = truthSt[t]; }
    if (role === 'rev') { reveals.forEach(t => st[t - 1] = truthSt[t - 1]); R.sample([...Array(turns).keys()], R.int(1, 3)).forEach(t => tr[t] = other(TRANSP, truthTr[t])); }
    if (role === 'tix') { const rv = R.sample(reveals, R.int(1, 2)); reveals.forEach(t => { st[t - 1] = rv.includes(t) ? other(stIds, truthSt[t - 1]) : truthSt[t - 1]; }); }
    if (role === 'mix') { const bad = R.pick(reveals); reveals.forEach(t => { st[t - 1] = t === bad ? other(stIds, truthSt[t - 1]) : truthSt[t - 1]; }); R.sample([...Array(turns).keys()], R.int(1, 3)).forEach(t => tr[t] = other(TRANSP, truthTr[t])); }
    for (let t = 0; t < turns; t++) rastro.push({ suspeito_id: s.id, turno: t + 1, estacao_id: st[t], transporte: tr[t] });
  });
  const rows = rastro.map((r, i) => ({ id: i + 1, ...r }));
  const bil = truthTr.map((transporte, i) => ({ turno: i + 1, transporte }));
  const rev = reveals.map(t => ({ turno: t, estacao_id: truthSt[t - 1] }));
  return {
    tables: [T('estacoes', 'Mapa da cidade.', est), T('suspeitos', 'Os oito suspeitos.', sus), T('bilhetes_x', 'Transporte usado pelo fugitivo em CADA turno (interceptado).', bil), T('revelacoes', 'Turnos em que o fugitivo foi visto de fato numa estação (como no Scotland Yard, ele se revela de tempos em tempos).', rev), T('rastro', 'Posição e transporte de cada suspeito a cada turno.', rows)],
    culpado: cul,
    briefing: ['Duas pistas independentes: (1) as revelações mostram a estação exata do fugitivo em certos turnos; (2) os bilhetes mostram o transporte usado em todos os turnos.', 'O culpado cumpre as duas pistas ao mesmo tempo. Existem suspeitos que cumprem só uma delas, e outros que cumprem parte de cada.'],
    solucao: `SELECT s.nome\nFROM suspeitos s\nWHERE s.id IN (\n    SELECT r.suspeito_id FROM rastro r\n    JOIN revelacoes v ON v.turno = r.turno AND v.estacao_id = r.estacao_id\n    GROUP BY r.suspeito_id HAVING COUNT(*) = ${reveals.length})\n  AND s.id IN (\n    SELECT r.suspeito_id FROM rastro r\n    JOIN bilhetes_x b ON b.turno = r.turno AND b.transporte = r.transporte\n    GROUP BY r.suspeito_id HAVING COUNT(*) = ${turns});`,
    dicas: ['Resolva cada pista separadamente: uma consulta cruza rastro com revelacoes (turno + estação), outra cruza rastro com bilhetes_x (turno + transporte).', `Use GROUP BY suspeito_id com HAVING COUNT(*) = ${reveals.length} (revelações) e = ${turns} (bilhetes), e combine tudo com IN ... AND ... IN.`]
  };
}
// m12: combinação final
function m12(R, cr) {
  const ppl = mkPeople(R, 12), idx = R.shuffle([...Array(12).keys()]), P = i => ppl[idx[i]];
  const rooms = R.sample(roomsOf(cr.k), 4), X = rooms[0], oth = rooms.slice(1), L = X;
  const w1 = R.int(1260, 1320), w2 = w1 + 40, inW = () => R.int(w1 + 1, w2 - 1), outW = () => R.pick([R.int(1150, w1 - 10), R.int(w2 + 10, 1410)]);
  const key = new Set(), alibi = new Set(), sw = []; const add = (p, sala, m) => sw.push({ pessoa_id: p.id, sala, hora: hm(m) });
  const cul = P(0); key.add(cul.id); add(cul, X, inW()); add(cul, R.pick(oth), outW());
  key.add(P(1).id); add(P(1), X, outW()); add(P(1), R.pick(oth), inW());          // chave, sem álibi, sala certa fora da janela
  key.add(P(2).id); alibi.add(P(2).id); add(P(2), X, inW());                     // chave, álibi
  add(P(3), X, inW());                                                           // sem chave, sem álibi, sala certa na janela
  key.add(P(4).id); add(P(4), R.pick(oth), inW()); add(P(4), R.pick(oth), outW()); // chave, sem álibi, outra sala
  alibi.add(P(5).id); alibi.add(P(6).id);
  for (let i = 5; i < 12; i++) {
    const p = P(i); if (R.chance(0.35)) key.add(p.id); if (i > 6 && R.chance(0.5)) alibi.add(p.id);
    for (let q = 0; q < R.int(1, 3); q++) add(p, R.pick(rooms), R.int(1170, 1410));
    if (key.has(p.id) && !alibi.has(p.id)) alibi.add(p.id);
  }
  ppl.forEach(p => { if (p.id !== cul.id && key.has(p.id) && !alibi.has(p.id) && sw.some(s => s.pessoa_id === p.id && s.sala === X && s.hora >= hm(w1) && s.hora <= hm(w2))) alibi.add(p.id); });
  sw.sort((a, b) => a.hora.localeCompare(b.hora));
  const WHERE = ['no cinema', 'em casa com a família', 'na academia', 'no bar do Zé', 'na farmácia 24h'];
  const alibis = ppl.filter(p => alibi.has(p.id)).map((p, i) => ({ id: i + 1, pessoa_id: p.id, onde: R.pick(WHERE) }));
  const chaves = ppl.filter(p => key.has(p.id)).map(p => ({ pessoa_id: p.id, lugar: L }));
  return {
    tables: [T('pessoas', 'Todos os suspeitos.', ppl), T('chaves', `Quem possui chave de acesso (${L}).`, chaves), T('alibis', 'Álibis confirmados.', alibis), T('cracha', 'Registro de crachás nas salas.', sw.map((s, i) => ({ id: i + 1, ...s })))],
    culpado: cul.nome,
    briefing: [`Três pistas precisam ser cruzadas. O culpado: (1) tem chave de acesso, (2) NÃO tem álibi e (3) passou o crachá na sala "${X}" entre ${hm(w1)} e ${hm(w2)}.`, 'Cada decoy cumpre duas das três condições. Só um cumpre todas.'],
    solucao: `SELECT DISTINCT p.nome\nFROM pessoas p\nJOIN cracha c ON c.pessoa_id = p.id\nWHERE c.sala = '${X}'\n  AND c.hora >= '${hm(w1)}' AND c.hora <= '${hm(w2)}'\n  AND p.id IN (SELECT pessoa_id FROM chaves)\n  AND p.id NOT IN (SELECT pessoa_id FROM alibis);`,
    dicas: ['Parta do crachá: JOIN cracha com pessoas e filtre sala e janela de horário.', 'Adicione p.id IN (SELECT pessoa_id FROM chaves) e p.id NOT IN (SELECT pessoa_id FROM alibis). Use DISTINCT se o nome aparecer repetido.']
  };
}

const MECHS = [null,
  { f: m1, lvl: 0, tag: 'WHERE' }, { f: m2, lvl: 0, tag: 'ORDER BY · LIMIT' },
  { f: m3, lvl: 1, tag: 'JOIN' }, { f: m4, lvl: 1, tag: 'Subconsultas · NOT IN' }, { f: m5, lvl: 1, tag: 'GROUP BY · HAVING' }, { f: m6, lvl: 1, tag: 'Leitura de pistas' },
  { f: m7, lvl: 2, tag: 'Scotland Yard · JOIN + GROUP BY', yard: true }, { f: m8, lvl: 2, tag: 'Self JOIN' }, { f: m9, lvl: 2, tag: 'JOIN triplo · SUM' }, { f: m10, lvl: 2, tag: 'HAVING + subconsulta' },
  { f: m11, lvl: 3, tag: 'Scotland Yard · múltiplas pistas', yard: true }, { f: m12, lvl: 3, tag: 'JOIN + IN + NOT IN' }
];
const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado', 'Mestre'];
const LVL_BASE = [50, 150, 300, 800], LVL_FIRST = [1, 3, 7, 11];
const CASES = [];
{
  let k = 0;
  for (let m = 1; m <= 12; m++) for (let j = 0; j < 3; j++) {
    const cr = CRIMES[k], M = MECHS[m];
    CASES.push({ i: k, id: 'c' + (k + 1), num: k + 1, titulo: cr.t, d: cr.d, k: cr.k, l: cr.l, m, lvl: M.lvl, tag: M.tag, yard: !!M.yard, xp: LVL_BASE[M.lvl] + 25 * j + 40 * (m - LVL_FIRST[M.lvl]), seed: 1000 + k * 7919 });
    k++;
  }
}
function buildCase(meta, seedAdd = 0) {
  const R = RNG(meta.seed + seedAdd), cr = CRIMES[meta.i];
  const o = MECHS[meta.m].f(R, cr);
  return { ...meta, ...o, dicas: [...o.dicas, 'Solução completa:\n' + o.solucao], objetivo: `Descubra quem é ${KIND_R[cr.k] ? 'o ' + KIND_R[cr.k] : 'o culpado'} e digite o nome completo na acusação.` };
}
export { CASES, buildCase, NIVEIS };