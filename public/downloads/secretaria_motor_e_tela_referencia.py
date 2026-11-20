"""
Referência de adaptação multi-chamados para os módulos externos não incluídos
no pacote anexado (`secretaria/motor.py` e `core/secretaria_tela.py`).

O `main.py` corrigido já:
  1. Indexa chamadas tocando (`_sec_chamadas[id]`), ligações ativas (`_sec_em_ligacoes[id]`),
     perguntas (`_sec_perguntas[pid]`) e trava de microfone (`_sec_mutou_ids`).
  2. Envia nos eventos de `_tela_secretaria` as listas completas:
     `ativas`, `tocando`, `perguntas`, `chamadas_ativas`, `chamadas_tocando`, `perguntas_pendentes`.
  3. Mantém compatibilidade com UI de 1 cartão por vez reexibindo a próxima chamada/pergunta
     ativa sempre que uma outra é encerrada ou recusada.
"""

# ---------------------------------------------------------------------------
# 1. Padrão esperado em `secretaria/motor.py` e `core/secretaria.py`
# ---------------------------------------------------------------------------
# - Cada ligação recebida no WhatsApp Web / motor deve gerar um `id` único (ex: call_id)
#   e rodar sua sessão de áudio/Gemini Live em uma task/thread própria:
#       self._ligacoes_ativas: dict[str, SessaoLigacao] = {}
# - Evitar qualquer trava global do tipo:
#       if self._em_ligacao is not None: recusar_ou_ignorar()
# - Quando `decidir(id_chamada, decisao, mensagem)` ou `responder(pid, texto)` for chamado,
#   buscar a sessão pelo `id_chamada` / `pid` no dicionário, sem limpar as demais sessões.
# - Cada evento emitido para `main.py` (`tocando`, `atendeu`, `fala`, `pergunta`,
#   `pergunta_expirou`, `encerrada`, `recusada`, `perdida`) deve incluir `"id": call_id`
#   (e `"pid": question_id` nas perguntas).

# ---------------------------------------------------------------------------
# 2. Padrão recomendado em `core/secretaria_tela.py` (múltiplos cartões/abas)
# ---------------------------------------------------------------------------
# Caso deseje exibir múltiplos cartões simultaneamente no PyQt6 (além do fallback
# automático que o `main.py` já faz para cartões únicos):
#
# def mostrar(dados: dict) -> None:
#     estado = dados.get("estado")
#     call_id = dados.get("id")
#     # Se `estado == "esconder"` e `call_id` vier preenchido, remover apenas o
#     # cartão daquele `call_id`; se `call_id` for None (desligou a secretária), limpar todos.
#     # Para `tocando`, `atendeu`, `fala`, `pergunta`, `fim`, indexar os widgets por `call_id`.
