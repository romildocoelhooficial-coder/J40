export interface DiagnosticItem {
  id: string;
  symbol: string;
  lines: string;
  severity: 'Crítico' | 'Alto' | 'Compatibilidade';
  cause: string;
  impact: string;
  fix: string;
}

export const DIAGNOSTICS: DiagnosticItem[] = [
  {
    id: 'singletons',
    symbol: '_sec_chamada / _sec_pergunta / _sec_em_ligacao',
    lines: 'main.py:3546–3549',
    severity: 'Crítico',
    cause: 'Todo o estado de ligações da secretária era armazenado em variáveis únicas (singletons) em vez de coleções indexadas.',
    impact: 'Quando uma segunda chamada tocava ou era atendida, sobrescrevia a primeira e apagava o registro da chamada em andamento.',
    fix: 'Substituídos por dicionários indexados por id/pid (_sec_chamadas, _sec_perguntas, _sec_em_ligacoes) protegidos por threading.RLock (_sec_lock), mantendo propriedades de leitura retrocompatíveis.',
  },
  {
    id: 'encerrada-wipe',
    symbol: '_evento_secretaria ("atendeu", "encerrada", "recusada", "perdida")',
    lines: 'main.py:3622–3737',
    severity: 'Crítico',
    cause: 'Qualquer evento de encerramento, recusa ou perda zerava todos os três estados globais e enviava "esconder" para a UI.',
    impact: 'Encerrar a ligação A apagava perguntas pendentes e chamadas ativas da ligação B e escondia o cartão da tela.',
    fix: 'Cada evento remove apenas o seu próprio cid/pid_key. Se ainda restarem perguntas, chamadas tocando ou ligações ativas, a tela reexibe o próximo chamado em vez de ocultar.',
  },
  {
    id: 'mute-leak',
    symbol: '_sec_mutou & _devolver_ouvido_da_secretaria',
    lines: 'main.py:3645–3655, 3820–3823',
    severity: 'Crítico',
    cause: 'Uma única flag booleana _sec_mutou controlava o microfone do JARVIS sem saber quantas ligações exigiam mudo.',
    impact: 'Ao encerrar a primeira ligação enquanto a segunda continuava ativa (ou transferida para o dono), o microfone era reaberto e captava o áudio da conversa.',
    fix: 'Adicionado conjunto _sec_mutou_ids (contagem por ID). O mudo só é desativado quando o último cid ativo é encerrado (ou quando a secretária é desligada).',
  },
  {
    id: 'voice-routing',
    symbol: '_rede_da_secretaria',
    lines: 'main.py:3864–3919',
    severity: 'Alto',
    cause: 'Comandos de voz ("atende", "recusa", "responde que...", "passa", "encerra") operavam apenas sobre os três ponteiros únicos.',
    impact: 'Não era possível direcionar um comando para um contato específico durante chamadas simultâneas e qualquer ação limpava o ponteiro único.',
    fix: 'Implementado _sec_casar_item(itens, texto) com casamento por ID ou nome normalizado do contato (e fallback para o mais recente), removendo apenas o item acionado.',
  },
  {
    id: 'tool-routing',
    symbol: '_ferramenta_secretaria & TOOL_DECLARATIONS',
    lines: 'main.py:2118–2137, 3967–4070',
    severity: 'Alto',
    cause: 'A ferramenta secretaria_whatsapp não aceitava parâmetros contato/id e o status não informava ligações paralelas.',
    impact: 'O cérebro (LLM) não sabia listar múltiplos chamados ativos nem especificar qual ligação atender, recusar, responder ou transferir.',
    fix: 'Adicionados parâmetros opcionais contato e id em TOOL_DECLARATIONS, resolução por _sec_casar_item e resumo completo de ativas/tocando/perguntas no status.',
  },
  {
    id: 'card-actions',
    symbol: '_acao_secretaria',
    lines: 'main.py:3921–3949',
    severity: 'Alto',
    cause: 'Cliques no cartão zeravam _sec_chamada e _sec_pergunta inteiros e até "ignorar" apagava a chamada tocando.',
    impact: 'Interagir com o cartão de um contato descartava outros chamados pendentes na fila.',
    fix: 'Pop seletivo apenas pelo id/pid recebido (preservando outras chamadas e mantendo chamadas ignoradas na lista) e atualização imediata para o próximo chamado restante.',
  },
  {
    id: 'transfer-tracking',
    symbol: 'encerrada (transferida=True)',
    lines: 'main.py:3684–3691',
    severity: 'Compatibilidade',
    cause: 'Ao transferir para o dono, _sec_em_ligacao virava None mesmo com a chamada do dono ainda ativa e o microfone mutado.',
    impact: 'Uma segunda ligação que terminasse depois podia confundir o estado de mudo ou não distinguir chamadas da secretária vs. chamadas do dono.',
    fix: 'Ligação transferida permanece em _sec_em_ligacoes com quem="dono" (mantendo cid em _sec_mutou_ids), filtrada fora de acao=passar até o encerramento final.',
  },
];

export interface ExternalModuleNote {
  module: string;
  status: string;
  role: string;
  requirement: string;
}

export const EXTERNAL_MODULES: ExternalModuleNote[] = [
  {
    module: 'main.py',
    status: 'Corrigido e testado',
    role: 'Orquestração de eventos, voz, ferramenta do modelo, mudo do microfone e ponte com a interface.',
    requirement: 'Substituir pelo arquivo corrigido (ou aplicar o patch) na pasta raiz do aplicativo.',
  },
  {
    module: 'ui.py',
    status: 'Verificado (sem bloqueio)',
    role: 'Repassa eventos e ações do cartão para core/secretaria_tela.py via mostrar_secretaria.',
    requirement: 'Não armazena estado singleton de ligação; nenhuma alteração obrigatória em ui.py.',
  },
  {
    module: 'core/secretaria_tela.py',
    status: 'Módulo externo (não anexado)',
    role: 'Renderiza o cartão PyQt6 de chamadas tocando, perguntas e resumo.',
    requirement: 'Compatibilidade garantida pelo main.py (reexibe o próximo chamado quando um termina). Para exibir múltiplos cartões ao mesmo tempo, indexar widgets por dados["id"].',
  },
  {
    module: 'core/secretaria.py e secretaria/motor.py',
    status: 'Módulos externos (não anexados)',
    role: 'Gerenciam a sessão Web/áudio no WhatsApp e disparam eventos tocando/atendeu/pergunta/encerrada.',
    requirement: 'Devem manter sessões independentes por id (sem trava global "já estou em ligação") e enviar "id" e "pid" consistentes em cada evento.',
  },
];
