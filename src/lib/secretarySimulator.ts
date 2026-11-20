export interface RingingCall {
  id: string;
  nome: string;
  auto: number;
  criadaEm: number;
}

export interface ActiveCall {
  id: string;
  nome: string;
  quem: 'secretaria' | 'dono';
  voz: string | null;
  criadaEm: number;
}

export interface PendingQuestion {
  pid: string;
  id: string;
  nome: string;
  pergunta: string;
  espera: number;
  criadaEm: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  kind: 'info' | 'recado' | 'cmd' | 'warn';
  text: string;
}

export interface ScreenCardPayload {
  estado: string;
  id?: string | null;
  pid?: string | null;
  nome?: string;
  quem?: string;
  pergunta?: string;
  ativas: number;
  tocando: number;
  perguntas: number;
}

export interface SecretaryState {
  ligada: boolean;
  ouvirNoPc: boolean;
  chamadas: Record<string, RingingCall>;
  emLigacoes: Record<string, ActiveCall>;
  perguntas: Record<string, PendingQuestion>;
  mutouIds: string[];
  micMutado: boolean;
  cartaoAtual: ScreenCardPayload;
  logs: LogEntry[];
  nextCallSeq: number;
  nextPidSeq: number;
  nextLogSeq: number;
}

function normTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function casarItem<T extends { id?: string; pid?: string; nome?: string }>(
  itens: T[],
  dica: string,
  exigirMatch = false
): T | null {
  if (itens.length === 0) return null;
  const raw = dica.trim();
  if (raw) {
    for (let i = itens.length - 1; i >= 0; i--) {
      const it = itens[i];
      if (raw === it.id || raw === it.pid) return it;
    }
    const dicaNorm = normTexto(raw);
    if (dicaNorm) {
      let melhor: T | null = null;
      let melhorPontos = 0;
      const palavrasDica = new Set(dicaNorm.split(' '));
      for (const item of itens) {
        const nomeNorm = normTexto(item.nome || '');
        if (!nomeNorm) continue;
        let pontos = 0;
        if (nomeNorm === dicaNorm) {
          pontos = 100;
        } else if (` ${dicaNorm} `.includes(` ${nomeNorm} `)) {
          pontos = 80 + nomeNorm.length;
        } else {
          const partes = nomeNorm.split(' ').filter((p) => p.length >= 3);
          const hits = partes.filter((p) => palavrasDica.has(p)).length;
          if (hits > 0) pontos = 40 + hits * 10;
        }
        if (pontos > melhorPontos || (pontos > 0 && pontos === melhorPontos)) {
          melhorPontos = pontos;
          melhor = item;
        }
      }
      if (melhor) return melhor;
    }
  }
  return exigirMatch ? null : itens[itens.length - 1];
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function appendLog(
  state: SecretaryState,
  kind: LogEntry['kind'],
  text: string
): SecretaryState {
  const entry: LogEntry = {
    id: state.nextLogSeq,
    timestamp: nowTime(),
    kind,
    text,
  };
  return {
    ...state,
    nextLogSeq: state.nextLogSeq + 1,
    logs: [entry, ...state.logs].slice(0, 40),
  };
}

function buildSummary(state: SecretaryState) {
  return {
    ativas: Object.keys(state.emLigacoes).length,
    tocando: Object.keys(state.chamadas).length,
    perguntas: Object.keys(state.perguntas).length,
  };
}

function syncCardAfterRemoval(
  state: SecretaryState,
  removedId: string | null,
  hideIfEmpty = true
): SecretaryState {
  const summary = buildSummary(state);
  const perguntasList = Object.values(state.perguntas);
  const chamadasList = Object.values(state.chamadas);
  const ativasList = Object.values(state.emLigacoes);

  if (perguntasList.length > 0) {
    const q = perguntasList[perguntasList.length - 1];
    return {
      ...state,
      cartaoAtual: {
        estado: 'pergunta',
        id: q.id,
        pid: q.pid,
        nome: q.nome,
        pergunta: q.pergunta,
        ...summary,
      },
    };
  }
  if (chamadasList.length > 0) {
    const c = chamadasList[chamadasList.length - 1];
    return {
      ...state,
      cartaoAtual: {
        estado: 'tocando',
        id: c.id,
        nome: c.nome,
        ...summary,
      },
    };
  }
  if (ativasList.length > 0) {
    const e = ativasList[ativasList.length - 1];
    return {
      ...state,
      cartaoAtual: {
        estado: 'atendeu',
        id: e.id,
        nome: e.nome,
        quem: e.quem,
        ...summary,
      },
    };
  }
  if (hideIfEmpty) {
    return {
      ...state,
      cartaoAtual: {
        estado: 'esconder',
        id: removedId,
        ...summary,
      },
    };
  }
  return state;
}

export function createInitialState(): SecretaryState {
  return {
    ligada: true,
    ouvirNoPc: true,
    chamadas: {},
    emLigacoes: {},
    perguntas: {},
    mutouIds: [],
    micMutado: false,
    cartaoAtual: { estado: 'esconder', ativas: 0, tocando: 0, perguntas: 0 },
    logs: [],
    nextCallSeq: 1,
    nextPidSeq: 1,
    nextLogSeq: 1,
  };
}

export function triggerIncomingCall(state: SecretaryState, nome: string): SecretaryState {
  if (!state.ligada) {
    return appendLog(state, 'warn', `[Secretária] Ignorado chamado de ${nome}: secretária desligada.`);
  }
  const id = `c${state.nextCallSeq}`;
  const nova: RingingCall = {
    id,
    nome: nome.trim() || `Contato ${state.nextCallSeq}`,
    auto: 15,
    criadaEm: Date.now(),
  };
  const next: SecretaryState = {
    ...state,
    nextCallSeq: state.nextCallSeq + 1,
    chamadas: { ...state.chamadas, [id]: nova },
  };
  const summary = buildSummary(next);
  next.cartaoAtual = { estado: 'tocando', id, nome: nova.nome, ...summary };
  return appendLog(next, 'info', `[Secretária] ${nova.nome} está ligando no WhatsApp (id=${id}).`);
}

export function answerCall(
  state: SecretaryState,
  callId: string,
  quem: 'secretaria' | 'dono'
): SecretaryState {
  const c = state.chamadas[callId];
  if (!c) return state;

  const chamadas = { ...state.chamadas };
  delete chamadas[callId];

  const emLigacoes: Record<string, ActiveCall> = {
    ...state.emLigacoes,
    [callId]: {
      id: callId,
      nome: c.nome,
      quem,
      voz: quem === 'secretaria' ? 'Leda' : null,
      criadaEm: Date.now(),
    },
  };

  const shouldMute = quem === 'dono' || state.ouvirNoPc;
  const mutouSet = new Set(state.mutouIds);
  if (shouldMute) mutouSet.add(callId);

  const next: SecretaryState = {
    ...state,
    chamadas,
    emLigacoes,
    mutouIds: Array.from(mutouSet),
    micMutado: mutouSet.size > 0,
  };
  const summary = buildSummary(next);
  next.cartaoAtual = { estado: 'atendeu', id: callId, nome: c.nome, quem, ...summary };
  return appendLog(
    next,
    'info',
    quem === 'secretaria'
      ? `[Secretária] Atendi a ligação de ${c.nome} (id=${callId}).`
      : `[Secretária] Você está na ligação com ${c.nome} (id=${callId}).`
  );
}

export function declineCall(state: SecretaryState, callId: string): SecretaryState {
  const c = state.chamadas[callId];
  if (!c) return state;
  const chamadas = { ...state.chamadas };
  delete chamadas[callId];

  let next: SecretaryState = { ...state, chamadas };
  next = syncCardAfterRemoval(next, callId, true);
  return appendLog(next, 'info', `[Secretária] Recusei a ligação de ${c.nome} (id=${callId}).`);
}

export function askQuestion(
  state: SecretaryState,
  callId: string,
  perguntaText?: string
): SecretaryState {
  const call = state.emLigacoes[callId];
  if (!call || call.quem !== 'secretaria') return state;
  const pid = `p${state.nextPidSeq}`;
  const pergunta =
    perguntaText?.trim() ||
    (state.nextPidSeq % 2 === 1
      ? 'Posso confirmar a entrega para amanhã às 14h?'
      : 'Qual valor devo passar no orçamento?');

  const q: PendingQuestion = {
    pid,
    id: callId,
    nome: call.nome,
    pergunta,
    espera: 30,
    criadaEm: Date.now(),
  };

  const next: SecretaryState = {
    ...state,
    nextPidSeq: state.nextPidSeq + 1,
    perguntas: { ...state.perguntas, [pid]: q },
  };
  const summary = buildSummary(next);
  next.cartaoAtual = {
    estado: 'pergunta',
    id: callId,
    pid,
    nome: call.nome,
    pergunta,
    ...summary,
  };
  return appendLog(next, 'info', `[Secretária] Pergunta para você (${call.nome}, ${pid}): ${pergunta}`);
}

export function answerQuestion(
  state: SecretaryState,
  pid: string,
  resposta: string
): SecretaryState {
  const q = state.perguntas[pid];
  if (!q) return state;
  const perguntas = { ...state.perguntas };
  delete perguntas[pid];

  let next: SecretaryState = { ...state, perguntas };
  next = syncCardAfterRemoval(next, q.id, false);
  return appendLog(next, 'info', `[Secretária] Você respondeu (${q.nome}): ${resposta}`);
}

export function transferCall(state: SecretaryState, callId: string): SecretaryState {
  const call = state.emLigacoes[callId];
  if (!call || call.quem !== 'secretaria') return state;

  const perguntas = { ...state.perguntas };
  for (const [pk, q] of Object.entries(perguntas)) {
    if (q.id === callId) delete perguntas[pk];
  }

  const emLigacoes: Record<string, ActiveCall> = {
    ...state.emLigacoes,
    [callId]: { ...call, quem: 'dono', voz: null },
  };

  const mutouSet = new Set(state.mutouIds);
  mutouSet.add(callId);

  let next: SecretaryState = {
    ...state,
    emLigacoes,
    perguntas,
    mutouIds: Array.from(mutouSet),
    micMutado: true,
  };
  const summary = buildSummary(next);
  next.cartaoAtual = { estado: 'atendeu', id: callId, nome: call.nome, quem: 'dono', ...summary };
  return appendLog(
    next,
    'recado',
    `RECADO: Ligação de ${call.nome} transferida para você. Microfone segue mudo até encerrar (${callId}).`
  );
}

export function endCall(state: SecretaryState, callId: string): SecretaryState {
  const call = state.emLigacoes[callId];
  if (!call) return state;

  const emLigacoes = { ...state.emLigacoes };
  delete emLigacoes[callId];

  const perguntas = { ...state.perguntas };
  for (const [pk, q] of Object.entries(perguntas)) {
    if (q.id === callId) delete perguntas[pk];
  }

  const mutouIds = state.mutouIds.filter((x) => x !== callId);
  const micMutado = mutouIds.length > 0;

  let next: SecretaryState = {
    ...state,
    emLigacoes,
    perguntas,
    mutouIds,
    micMutado,
  };

  if (call.quem === 'secretaria') {
    const summary = buildSummary(next);
    next.cartaoAtual = { estado: 'fim', id: callId, nome: call.nome, ...summary };
    next = appendLog(
      next,
      'recado',
      `RECADO: Ligação de ${call.nome} encerrada (${callId}). ${
        micMutado
          ? `Microfone mantido mudo por causa de ${mutouIds.join(', ')}.`
          : 'Nenhuma outra chamada ativa: microfone liberado.'
      }`
    );
    return next;
  }

  next = syncCardAfterRemoval(next, callId, true);
  return appendLog(next, 'info', `[Secretária] A ligação com ${call.nome} terminou (${callId}).`);
}

export function toggleSecretary(state: SecretaryState): SecretaryState {
  if (state.ligada) {
    const next: SecretaryState = {
      ...state,
      ligada: false,
      chamadas: {},
      emLigacoes: {},
      perguntas: {},
      mutouIds: [],
      micMutado: false,
      cartaoAtual: { estado: 'esconder', ativas: 0, tocando: 0, perguntas: 0 },
    };
    return appendLog(next, 'warn', '[Secretária] Desligada. Todos os chamados encerrados e microfone liberado.');
  }
  return appendLog({ ...state, ligada: true }, 'info', '[Secretária] Ligada e pronta para múltiplos chamados.');
}

export function runVoiceOrToolCommand(state: SecretaryState, rawCmd: string): SecretaryState {
  const cmd = rawCmd.trim();
  if (!cmd) return state;
  const norm = normTexto(cmd);
  let next = appendLog(state, 'cmd', `Comando: "${cmd}"`);

  if (norm === 'status') {
    const ativas = Object.values(next.emLigacoes).map((x) => `${x.nome} (${x.quem})`);
    const tocando = Object.values(next.chamadas).map((x) => x.nome);
    const perguntas = Object.values(next.perguntas).map((x) => `${x.nome}: "${x.pergunta}"`);
    const parts = [
      ativas.length ? `Em andamento (${ativas.length}): ${ativas.join(', ')}` : 'Em andamento: 0',
      tocando.length ? `Tocando (${tocando.length}): ${tocando.join(', ')}` : 'Tocando: 0',
      perguntas.length ? `Perguntas (${perguntas.length}): ${perguntas.join('; ')}` : 'Perguntas: 0',
    ];
    return appendLog(next, 'info', `[Secretária status] ${parts.join(' · ')}`);
  }

  const perguntasList = Object.values(next.perguntas);
  const chamadasList = Object.values(next.chamadas);
  const ligacoesSec = Object.values(next.emLigacoes).filter((x) => x.quem === 'secretaria');
  const todasLigacoes = Object.values(next.emLigacoes);

  const respMatch = cmd.match(/(?:responde|fala pra ela)\s+(?:para?\s+[^q]+\s+)?que\s+(.+)/i);
  if (respMatch && perguntasList.length > 0) {
    const alvoQ = casarItem(perguntasList, cmd);
    if (alvoQ) {
      return answerQuestion(next, alvoQ.pid, respMatch[1].trim());
    }
  }

  if (/\b(passa|transfere)\b/.test(norm)) {
    const alvo = casarItem(ligacoesSec, cmd);
    if (!alvo) return appendLog(next, 'warn', '[Secretária] A secretária não está em nenhuma ligação agora.');
    return transferCall(next, alvo.id);
  }

  if (/\b(encerra|desliga)\b/.test(norm)) {
    const alvo = casarItem(ligacoesSec.length ? ligacoesSec : todasLigacoes, cmd);
    if (!alvo) return appendLog(next, 'warn', '[Secretária] Não há ligação ativa para encerrar.');
    return endCall(next, alvo.id);
  }

  if (/\b(recusa|rejeita)\b/.test(norm)) {
    const alvo = casarItem(chamadasList, cmd);
    if (!alvo) return appendLog(next, 'warn', '[Secretária] Não há ligação tocando para recusar.');
    return declineCall(next, alvo.id);
  }

  if (/\b(eu atendo|atendo eu)\b/.test(norm)) {
    const alvo = casarItem(chamadasList, cmd);
    if (!alvo) return appendLog(next, 'warn', '[Secretária] Não há ligação tocando para você atender.');
    return answerCall(next, alvo.id, 'dono');
  }

  if (/\b(atende|atender)\b/.test(norm)) {
    const alvo = casarItem(chamadasList, cmd);
    if (!alvo) return appendLog(next, 'warn', '[Secretária] Não há ligação tocando para a secretária atender.');
    return answerCall(next, alvo.id, 'secretaria');
  }

  return appendLog(
    next,
    'warn',
    '[Secretária] Comando não reconhecido. Tente "atende Maria", "recusa João", "responde que sim", "passa" ou "status".'
  );
}
