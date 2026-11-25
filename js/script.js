/* FitTracker — treinos, semana em gráfico e calorias pela fórmula MET */

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const deISO = (s) => new Date(s + 'T12:00');
const num = (n) => Math.round(n).toLocaleString('pt-BR');

/* Equivalentes metabólicos aproximados (Compêndio de Atividades Físicas) */
const ATIVIDADES = {
  corrida: { nome: 'Corrida', emoji: '🏃', met: { leve: 7, moderada: 9.8, intensa: 11.5 } },
  caminhada: { nome: 'Caminhada', emoji: '🚶', met: { leve: 3, moderada: 3.8, intensa: 5 } },
  bike: { nome: 'Bicicleta', emoji: '🚴', met: { leve: 4, moderada: 6.8, intensa: 10 } },
  musculacao: { nome: 'Musculação', emoji: '🏋️', met: { leve: 3.5, moderada: 5, intensa: 6 } },
  natacao: { nome: 'Natação', emoji: '🏊', met: { leve: 5.8, moderada: 8.3, intensa: 10 } },
  futebol: { nome: 'Futebol', emoji: '⚽', met: { leve: 5, moderada: 7, intensa: 10 } },
  yoga: { nome: 'Yoga', emoji: '🧘', met: { leve: 2, moderada: 2.5, intensa: 4 } },
  hiit: { nome: 'HIIT / Funcional', emoji: '🔥', met: { leve: 6, moderada: 8, intensa: 10 } },
  danca: { nome: 'Dança', emoji: '💃', met: { leve: 4, moderada: 5.5, intensa: 7.8 } }
};
const NOMES_INT = { leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };

const perfil = { peso: 70, meta: 150, ...banco.ler('ft_perfil', {}) };

/* Primeira visita: alguns treinos nesta semana e na anterior para o gráfico não ficar vazio */
function exemplos() {
  const h = new Date(), d = (n) => { const x = new Date(h); x.setDate(x.getDate() - n); return iso(x); };
  return [
    { id: 1, ativ: 'corrida', data: d(0), dur: 35, int: 'moderada', obs: '5 km no parque' },
    { id: 2, ativ: 'musculacao', data: d(1), dur: 60, int: 'moderada', obs: 'Treino de pernas' },
    { id: 3, ativ: 'yoga', data: d(2), dur: 30, int: 'leve', obs: '' },
    { id: 4, ativ: 'bike', data: d(4), dur: 50, int: 'intensa', obs: '' },
    { id: 5, ativ: 'corrida', data: d(7), dur: 30, int: 'leve', obs: '' },
    { id: 6, ativ: 'musculacao', data: d(9), dur: 55, int: 'moderada', obs: '' }
  ];
}
let treinos = banco.ler('ft_treinos', null) ?? exemplos();
const salvar = () => banco.salvar('ft_treinos', treinos);

const kcal = (t) => (ATIVIDADES[t.ativ]?.met[t.int] || 5) * perfil.peso * (t.dur / 60);

/* Semana começa na segunda-feira */
function inicioSemana(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); const dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x; }
let semana = inicioSemana(new Date());
const diasDaSemana = (ini) => Array.from({ length: 7 }, (_, i) => { const x = new Date(ini); x.setDate(x.getDate() + i); return iso(x); });
const daSemana = (ini) => { const dias = new Set(diasDaSemana(ini)); return treinos.filter((t) => dias.has(t.data)); };

function desenhar() {
  const hoje = iso(new Date());
  const dias = diasDaSemana(semana);
  const lista = daSemana(semana);
  const ant = new Date(semana); ant.setDate(ant.getDate() - 7);
  const listaAnt = daSemana(ant);
  const atual = inicioSemana(new Date()).getTime() === semana.getTime();

  const delta = Math.round((semana - inicioSemana(new Date())) / 6048e5);
  $('#sem-titulo').textContent = atual ? 'Esta semana' : delta === -1 ? 'Semana passada' : delta < 0 ? `Há ${-delta} semanas` : `Daqui a ${delta} semanas`;
  const fmt = (s) => deISO(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  $('#sem-datas').textContent = `${fmt(dias[0])} – ${fmt(dias[6])}`;
  $('#sem-prox').disabled = atual;

  const min = lista.reduce((s, t) => s + t.dur, 0);
  const cal = lista.reduce((s, t) => s + kcal(t), 0);
  const minAnt = listaAnt.reduce((s, t) => s + t.dur, 0);
  const pct = Math.min(100, Math.round((min / perfil.meta) * 100));
  $('#meta-pct').textContent = `${Math.round((min / perfil.meta) * 100)}%`;
  $('#anel').style.strokeDashoffset = 314.16 * (1 - pct / 100);
  $('#n-treinos').textContent = lista.length;
  $('#n-min').textContent = num(min);
  $('#n-kcal').textContent = num(cal);
  const v = $('#n-var');
  if (!minAnt) { v.textContent = min ? 'novo' : '—'; v.className = ''; }
  else { const p = Math.round(((min - minAnt) / minAnt) * 100); v.textContent = `${p > 0 ? '+' : ''}${p}%`; v.className = p >= 0 ? 'sobe' : 'desce'; }

  // Gráfico de barras: minutos e kcal por dia (kcal em outra escala)
  const porDia = dias.map((d) => { const ts = lista.filter((t) => t.data === d); return { d, min: ts.reduce((s, t) => s + t.dur, 0), kcal: ts.reduce((s, t) => s + kcal(t), 0) }; });
  const maxMin = Math.max(60, ...porDia.map((x) => x.min)), maxK = Math.max(400, ...porDia.map((x) => x.kcal));
  const NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  $('#grafico').innerHTML = porDia.map((x, i) => `<div class="dia ${x.d === hoje ? 'hoje' : ''}" title="${NOMES[i]}: ${x.min} min, ${num(x.kcal)} kcal">
      <span class="dia__valor">${x.min ? x.min + "'" : ''}</span>
      <div class="dia__barras"><i class="min" style="height:${(x.min / maxMin) * 100}%"></i><i class="kcal" style="height:${(x.kcal / maxK) * 100}%"></i></div>
      <span class="dia__nome">${NOMES[i]}</span></div>`).join('');
  $('#grafico').setAttribute('aria-label', 'Minutos por dia: ' + porDia.map((x, i) => `${NOMES[i]} ${x.min}`).join(', '));

  // Histórico da semana agrupado por dia
  const grupos = [...dias].reverse().map((d) => ({ d, ts: lista.filter((t) => t.data === d).sort((a, b) => b.id - a.id) })).filter((g) => g.ts.length);
  $('#historico').innerHTML = grupos.length ? grupos.map((g) => {
    const nome = g.d === hoje ? 'Hoje' : deISO(g.d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    return `<div class="grupo"><h3><span>${nome}</span><span>${g.ts.reduce((s, t) => s + t.dur, 0)} min</span></h3>${g.ts.map((t) => {
      const a = ATIVIDADES[t.ativ] || { nome: t.ativ, emoji: '🏅' };
      return `<div class="treino"><span class="treino__ico" aria-hidden="true">${a.emoji}</span>
        <div><b>${a.nome}<span class="tag ${t.int}">${NOMES_INT[t.int]}</span></b><small>${t.dur} min${t.obs ? ' · ' + escapar(t.obs) : ''}</small></div>
        <div class="treino__kcal">${num(kcal(t))}<small>kcal</small></div>
        <button class="excluir" data-del="${t.id}" aria-label="Excluir treino">✕</button></div>`;
    }).join('')}</div>`;
  }).join('') : `<p class="vazio">Nenhum treino nesta semana.${atual ? ' Que tal registrar o primeiro?' : ''}</p>`;

  // Atividades mais praticadas (todo o histórico)
  const cont = {};
  treinos.forEach((t) => { cont[t.ativ] = (cont[t.ativ] || 0) + t.dur; });
  const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTop = top[0]?.[1] || 1;
  $('#ranking').innerHTML = top.length ? top.map(([k, m]) => `<li><span aria-hidden="true">${ATIVIDADES[k]?.emoji || '🏅'}</span><span>${ATIVIDADES[k]?.nome || k}</span><span class="barra"><i style="width:${(m / maxTop) * 100}%"></i></span><b>${num(m)} min</b></li>`).join('')
    : '<li class="vazio">Registre treinos para ver suas atividades favoritas.</li>';

  $('#perfil-peso').textContent = `${perfil.peso.toLocaleString('pt-BR')} kg`;
  $('#perfil-meta').textContent = `${perfil.meta} min`;
}

/* Navegação entre semanas */
$('#sem-ant').addEventListener('click', () => { semana.setDate(semana.getDate() - 7); desenhar(); });
$('#sem-prox').addEventListener('click', () => { semana.setDate(semana.getDate() + 7); desenhar(); });

/* Formulário de treino */
$('#atividades').insertAdjacentHTML('beforeend', Object.entries(ATIVIDADES).map(([k, a], i) =>
  `<label><input type="radio" name="ativ" value="${k}" ${i === 0 ? 'checked' : ''}><span><em aria-hidden="true">${a.emoji}</em>${a.nome}</span></label>`).join(''));
function estimar() {
  const t = { ativ: document.querySelector('[name=ativ]:checked').value, int: document.querySelector('[name=int]:checked').value, dur: +$('#f-dur').value || 0 };
  $('#estimativa').innerHTML = `≈ ${num(kcal(t))} kcal <small>· MET ${ATIVIDADES[t.ativ].met[t.int].toLocaleString('pt-BR')} × ${perfil.peso.toLocaleString('pt-BR')} kg × ${(t.dur / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</small>`;
}
$('#form-treino').addEventListener('input', estimar);
$('#novo').addEventListener('click', () => {
  const hoje = iso(new Date()), dias = diasDaSemana(semana);
  $('#f-data').value = dias.includes(hoje) ? hoje : dias[0];
  $('#f-data').max = hoje;
  $('#f-obs').value = '';
  estimar();
  $('#dlg-treino').showModal();
});
$('#dlg-treino').addEventListener('close', () => {
  if ($('#dlg-treino').returnValue !== 'salvar') return;
  const t = {
    id: Date.now(), ativ: document.querySelector('[name=ativ]:checked').value, data: $('#f-data').value,
    dur: Math.min(600, Math.max(1, Math.round(+$('#f-dur').value))), int: document.querySelector('[name=int]:checked').value, obs: $('#f-obs').value.trim()
  };
  if (!t.data) return;
  treinos.push(t); salvar();
  semana = inicioSemana(deISO(t.data));
  desenhar();
  avisar(`${ATIVIDADES[t.ativ].nome} registrada: ${num(kcal(t))} kcal`, null);
});

/* Excluir com confirmação no próprio botão e opção de desfazer */
let ultimaExcluida = null, timerAviso;
$('#historico').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  if (!b.classList.contains('confirmar')) {
    b.classList.add('confirmar'); b.textContent = 'Excluir?';
    setTimeout(() => { if (b.isConnected) { b.classList.remove('confirmar'); b.textContent = '✕'; } }, 3000);
    return;
  }
  const i = treinos.findIndex((t) => t.id === +b.dataset.del);
  ultimaExcluida = treinos.splice(i, 1)[0];
  salvar(); desenhar();
  avisar('Treino excluído', true);
});
$('#desfazer').addEventListener('click', () => {
  if (ultimaExcluida) { treinos.push(ultimaExcluida); ultimaExcluida = null; salvar(); desenhar(); }
  $('#aviso').hidden = true;
});
function avisar(msg, desfazer) {
  $('#aviso-txt').textContent = msg;
  $('#desfazer').hidden = !desfazer;
  $('#aviso').hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { $('#aviso').hidden = true; }, 5000);
}

/* Perfil */
$('#abrir-perfil').addEventListener('click', () => { $('#p-peso').value = perfil.peso; $('#p-meta').value = perfil.meta; $('#dlg-perfil').showModal(); });
$('#dlg-perfil').addEventListener('close', () => {
  if ($('#dlg-perfil').returnValue !== 'salvar') return;
  perfil.peso = Math.min(250, Math.max(30, +$('#p-peso').value || 70));
  perfil.meta = Math.min(2000, Math.max(10, Math.round(+$('#p-meta').value || 150)));
  banco.salvar('ft_perfil', perfil); desenhar();
});
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

desenhar();
