import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Play,
  RotateCcw,
  Send,
} from 'lucide-react';
import { DIAGNOSTICS, EXTERNAL_MODULES, type DiagnosticItem } from './data/secretaryDiagnostics';
import {
  answerCall,
  answerQuestion,
  askQuestion,
  createInitialState,
  declineCall,
  endCall,
  runVoiceOrToolCommand,
  toggleSecretary,
  transferCall,
  triggerIncomingCall,
  type SecretaryState,
} from './lib/secretarySimulator';

type SeverityFilter = 'Todos' | DiagnosticItem['severity'];
type CodeTab = 'patch' | 'externos';

export default function App() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('Todos');
  const [simState, setSimState] = useState<SecretaryState>(() => {
    let s = createInitialState();
    s = triggerIncomingCall(s, 'Maria Silva');
    s = triggerIncomingCall(s, 'João Pedro');
    s = answerCall(s, 'c1', 'secretaria');
    s = answerCall(s, 'c2', 'secretaria');
    s = askQuestion(s, 'c1', 'Posso confirmar a entrega para amanhã às 14h?');
    return s;
  });

  const [newCallerName, setNewCallerName] = useState('Carlos Mendes');
  const [commandInput, setCommandInput] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});

  const [codeTab, setCodeTab] = useState<CodeTab>('patch');
  const [patchText, setPatchText] = useState<string>('');
  const [externalRefText, setExternalRefText] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(true);
  const [codeError, setCodeError] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setCodeLoading(true);
    setCodeError('');
    Promise.all([
      fetch('/downloads/main_secretaria_multichamado.patch').then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar patch (${r.status})`);
        return r.text();
      }),
      fetch('/downloads/secretaria_motor_e_tela_referencia.py').then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar referência (${r.status})`);
        return r.text();
      }),
    ])
      .then(([patch, ext]) => {
        if (cancelled) return;
        setPatchText(patch);
        setExternalRefText(ext);
        setCodeLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCodeError(err instanceof Error ? err.message : 'Erro ao carregar arquivos de patch.');
        setCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDiagnostics = useMemo(() => {
    if (severityFilter === 'Todos') return DIAGNOSTICS;
    return DIAGNOSTICS.filter((d) => d.severity === severityFilter);
  }, [severityFilter]);

  const ringingList = useMemo(() => Object.values(simState.chamadas), [simState.chamadas]);
  const activeList = useMemo(() => Object.values(simState.emLigacoes), [simState.emLigacoes]);
  const questionList = useMemo(() => Object.values(simState.perguntas), [simState.perguntas]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? '' : prev));
      }, 1800);
    } catch {
      setCopiedKey('');
    }
  };

  const loadPresetTwoCalls = () => {
    let s = createInitialState();
    s = triggerIncomingCall(s, 'Maria Silva');
    s = triggerIncomingCall(s, 'João Pedro');
    s = answerCall(s, 'c1', 'secretaria');
    s = answerCall(s, 'c2', 'secretaria');
    s = askQuestion(s, 'c1', 'Posso confirmar a entrega para amanhã às 14h?');
    s = askQuestion(s, 'c2', 'Qual valor devo passar no orçamento?');
    setSimState(s);
    setQuestionDrafts({});
  };

  const loadPresetThirdRinging = () => {
    let s = createInitialState();
    s = triggerIncomingCall(s, 'Maria Silva');
    s = answerCall(s, 'c1', 'secretaria');
    s = triggerIncomingCall(s, 'João Pedro');
    s = answerCall(s, 'c2', 'dono');
    s = triggerIncomingCall(s, 'Carlos Mendes');
    setSimState(s);
    setQuestionDrafts({});
  };

  const submitNewCall = (e: React.FormEvent) => {
    e.preventDefault();
    setSimState((prev) => triggerIncomingCall(prev, newCallerName));
  };

  const submitCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    setSimState((prev) => runVoiceOrToolCommand(prev, commandInput));
    setCommandInput('');
  };

  const activeCodeText = codeTab === 'patch' ? patchText : externalRefText;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          <a
            href="#topo"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            JARVIS Secretária
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#diagnostico"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Diagnóstico
            </a>
            <a
              href="#simulador"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Simulador
            </a>
            <a
              href="#patch"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Patch e Código
            </a>
            <a
              href="#modulos"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Módulos Externos
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href="/downloads/main.py"
              download="main.py"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar main.py
            </a>
          </div>
        </div>
      </header>

      <main id="topo" className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-sky-700">
              JARVIS CyberBot v1.0.40 · Correção de Concorrência em main.py
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Atendimento simultâneo de múltiplos chamados na Secretária do WhatsApp
            </h1>
            <p className="text-base leading-relaxed text-slate-600">
              O pacote original mantinha apenas um ponteiro global para chamada tocando, uma pergunta pendente, uma
              ligação em andamento e uma flag booleana de microfone. A correção indexa cada chamado por{' '}
              <code className="font-mono text-sm text-slate-800">id</code> e{' '}
              <code className="font-mono text-sm text-slate-800">pid</code>, isola o controle de mudo por conjunto de IDs
              e permite roteamento por contato via voz, cartão ou ferramenta.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Gargalos corrigidos</div>
              <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">7</div>
              <div className="text-xs text-slate-500">main.py · linhas 2118–4070</div>
            </div>
            <div className="p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Estruturas concorrentes</div>
              <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">4</div>
              <div className="text-xs text-slate-500">chamadas · ligações · perguntas · mudo</div>
            </div>
            <div className="p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Cenários validados em Python</div>
              <div className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">11 / 11</div>
              <div className="text-xs text-slate-500">py_compile + AST unit suite</div>
            </div>
            <div className="p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Sincronização de threads</div>
              <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">RLock</div>
              <div className="text-xs text-slate-500">Ponte · Qt · Áudio local · Tool</div>
            </div>
          </div>
        </section>

        <section id="diagnostico" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                01. Diagnóstico das causas raiz
              </h2>
              <p className="text-sm text-slate-600">
                Cada ponto onde uma segunda chamada sobrescrevia, apagava ou desmutava uma chamada em andamento.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
              {(['Todos', 'Crítico', 'Alto', 'Compatibilidade'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverityFilter(level)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    severityFilter === level
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Função / Estado</th>
                  <th className="py-3 px-4">Severidade</th>
                  <th className="py-3 px-4">Problema original</th>
                  <th className="py-3 px-4">Correção aplicada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDiagnostics.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 min-w-[220px]">
                      <div className="font-mono text-xs font-semibold text-slate-900">{item.symbol}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">{item.lines}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          item.severity === 'Crítico'
                            ? 'text-red-700'
                            : item.severity === 'Alto'
                            ? 'text-amber-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 space-y-1 min-w-[260px]">
                      <p className="text-slate-800">{item.cause}</p>
                      <p className="text-xs text-slate-500">Impacto: {item.impact}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-700 min-w-[280px]">{item.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="simulador" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                02. Simulador interativo da máquina de estados corrigida
              </h2>
              <p className="text-sm text-slate-600">
                Execute ligações simultâneas, perguntas concorrentes, comandos de voz e encerramentos parciais com a
                lógica exata aplicada ao <code className="font-mono text-xs">main.py</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadPresetTwoCalls}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Cenário: 2 ativas + 2 perguntas
              </button>
              <button
                type="button"
                onClick={loadPresetThirdRinging}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Cenário: 3ª tocando com 2 ativas
              </button>
              <button
                type="button"
                onClick={() => setSimState((s) => toggleSecretary(s))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {simState.ligada ? 'Desligar secretária' : 'Ligar secretária'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimState(createInitialState());
                  setQuestionDrafts({});
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar tudo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7 border border-slate-200 bg-white rounded-xl divide-y divide-slate-200">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <form onSubmit={submitNewCall} className="flex flex-1 items-center gap-2">
                  <label htmlFor="caller-name" className="sr-only">
                    Nome do contato
                  </label>
                  <input
                    id="caller-name"
                    type="text"
                    value={newCallerName}
                    onChange={(e) => setNewCallerName(e.target.value)}
                    placeholder="Nome do contato (ex: Ana Souza)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <PhoneIncoming className="h-4 w-4" aria-hidden="true" />
                    Nova ligação
                  </button>
                </form>

                <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    {simState.micMutado ? (
                      <MicOff className="h-4 w-4 text-amber-700" aria-hidden="true" />
                    ) : (
                      <Mic className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    )}
                    {simState.micMutado
                      ? `Microfone mudo (${simState.mutouIds.join(', ')})`
                      : 'Microfone aberto'}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Chamadas tocando (_sec_chamadas)</span>
                  <span className="font-mono tabular-nums">{ringingList.length}</span>
                </div>
                {ringingList.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma ligação tocando no momento.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {ringingList.map((call) => (
                      <div
                        key={call.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{call.nome}</div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            id={call.id} · tocando · auto {call.auto}s
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSimState((s) => answerCall(s, call.id, 'secretaria'))}
                            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap"
                          >
                            Secretária atende
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimState((s) => answerCall(s, call.id, 'dono'))}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                          >
                            Eu atendo
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimState((s) => declineCall(s, call.id))}
                            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Ligações em andamento (_sec_em_ligacoes)</span>
                  <span className="font-mono tabular-nums">{activeList.length}</span>
                </div>
                {activeList.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma ligação ativa no momento.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {activeList.map((call) => (
                      <div
                        key={call.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Phone className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                            <span className="truncate">{call.nome}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            id={call.id} · quem={call.quem}
                            {call.voz ? ` · voz=${call.voz}` : ''}
                            {simState.mutouIds.includes(call.id) ? ' · mudo ativo' : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {call.quem === 'secretaria' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSimState((s) => askQuestion(s, call.id))}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                              >
                                Perguntar ao dono
                              </button>
                              <button
                                type="button"
                                onClick={() => setSimState((s) => transferCall(s, call.id))}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                              >
                                Passar para mim
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSimState((s) => endCall(s, call.id))}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
                            Encerrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Perguntas pendentes (_sec_perguntas)</span>
                  <span className="font-mono tabular-nums">{questionList.length}</span>
                </div>
                {questionList.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma pergunta aguardando resposta.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {questionList.map((q) => {
                      const draft = questionDrafts[q.pid] ?? 'Pode confirmar';
                      return (
                        <div key={q.pid} className="p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                            <span>
                              {q.nome} · pid={q.pid} · id={q.id}
                            </span>
                            <span className="text-amber-700 font-sans font-medium">Aguardando resposta</span>
                          </div>
                          <p className="text-sm text-slate-900">{q.pergunta}</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={draft}
                              onChange={(e) =>
                                setQuestionDrafts((prev) => ({ ...prev, [q.pid]: e.target.value }))
                              }
                              aria-label={`Resposta para ${q.nome}`}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSimState((s) => answerQuestion(s, q.pid, draft || 'Confirmado'));
                              }}
                              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3 bg-slate-50/60">
                <form onSubmit={submitCommand} className="flex items-center gap-2">
                  <label htmlFor="voice-cmd" className="sr-only">
                    Testar comando de voz ou ferramenta
                  </label>
                  <input
                    id="voice-cmd"
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder='Testar voz/ferramenta: "atende Carlos", "responde para Maria que sim", "passa João", "status"'
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Executar
                  </button>
                </form>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>Atalhos:</span>
                  {['status', 'responde para Maria que às 15h', 'atende Carlos', 'passa João', 'encerra Maria'].map(
                    (cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => setSimState((s) => runVoiceOrToolCommand(s, cmd))}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                      >
                        {cmd}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-5 border border-slate-200 bg-white rounded-xl divide-y divide-slate-200">
              <div className="p-5 space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  Último payload enviado ao cartão (_tela_secretaria)
                </div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3.5 text-xs text-slate-100 font-mono leading-relaxed">
                  {JSON.stringify(
                    {
                      ...simState.cartaoAtual,
                      mic_mutado: simState.micMutado,
                      _sec_mutou_ids: simState.mutouIds,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Registro de eventos e recados</span>
                  <span className="font-mono tabular-nums">{simState.logs.length} eventos</span>
                </div>

                {simState.logs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
                ) : (
                  <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {simState.logs.map((entry) => (
                      <li key={entry.id} className="py-2.5 flex items-start gap-3">
                        <span className="font-mono text-slate-400 tabular-nums shrink-0">{entry.timestamp}</span>
                        <span
                          className={
                            entry.kind === 'recado'
                              ? 'font-medium text-emerald-800'
                              : entry.kind === 'warn'
                              ? 'font-medium text-amber-700'
                              : entry.kind === 'cmd'
                              ? 'font-mono text-sky-800'
                              : 'text-slate-700'
                          }
                        >
                          {entry.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="patch" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                03. Patch unificado e arquivos para entrega
              </h2>
              <p className="text-sm text-slate-600">
                Baixe o <code className="font-mono text-xs">main.py</code> completo corrigido ou aplique o diff sobre o
                arquivo original.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCodeTab('patch')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    codeTab === 'patch'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Patch main.py (.patch)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('externos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    codeTab === 'externos'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Referência motor/tela (.py)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(codeTab, activeCodeText)}
                disabled={!activeCodeText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedKey === codeTab ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copiar código
                  </>
                )}
              </button>

              <a
                href="/downloads/main_secretaria_multichamado.patch"
                download="main_secretaria_multichamado.patch"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Baixar .patch
              </a>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-900 rounded-xl overflow-hidden">
            {codeLoading ? (
              <div className="p-6 space-y-2">
                <div className="h-4 w-2/3 rounded bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-slate-800" />
              </div>
            ) : codeError ? (
              <div className="p-6 text-sm text-red-300">{codeError}</div>
            ) : (
              <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-relaxed text-slate-100 font-mono">
                {activeCodeText}
              </pre>
            )}
          </div>
        </section>

        <section id="modulos" className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              04. Cobertura dos módulos do projeto
            </h2>
            <p className="text-sm text-slate-600">
              Situação dos arquivos anexados e requisitos de contrato para os módulos internos que não vieram no pacote.
            </p>
          </div>

          <div className="border border-slate-200 bg-white rounded-xl divide-y divide-slate-200">
            {EXTERNAL_MODULES.map((mod) => (
              <div
                key={mod.module}
                className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
              >
                <div className="md:col-span-3 space-y-1">
                  <div className="font-mono text-sm font-semibold text-slate-900">{mod.module}</div>
                  <div className="text-xs font-medium text-sky-700">{mod.status}</div>
                </div>
                <div className="md:col-span-4 text-sm text-slate-700">{mod.role}</div>
                <div className="md:col-span-5 text-sm text-slate-600">{mod.requirement}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
