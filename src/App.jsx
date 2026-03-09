import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCcw, Copy, CheckCircle2, Lightbulb, Zap } from 'lucide-react';

const EXAMPLES = [
  "Preciso escrever um email pedindo aumento",
  "Quero criar um post para LinkedIn sobre liderança",
  "Preciso resumir um relatório longo para meu gestor",
  "Quero dar feedback difícil para um colega"
];

const SYSTEM_PROMPT = `Você é o MPV Prompt Architect — um especialista em engenharia de prompts
que ajuda pessoas a construir prompts precisos e eficazes.

Seu trabalho é conduzir uma conversa curta e objetiva para extrair as
informações necessárias para montar um prompt completo seguindo o
framework RTCROS + MPV.

## SEU COMPORTAMENTO

**Fase 1 — Extração (máximo 4 perguntas)**
Faça UMA pergunta por vez. Seja direto e conciso.
Colete as seguintes informações nesta ordem de prioridade:
1. ROLE: Qual especialista/perfil deve responder?
   (se não especificado, infira pelo contexto)
2. CONTEXT: Qual é a situação atual, o que já foi tentado, restrições?
3. OBJECTIVE: Qual é o resultado ideal e como saberemos que foi atingido?
4. FORMAT: Como deve ser a resposta (tamanho, tom, estrutura)?

Se o usuário já forneceu informações suficientes em respostas anteriores,
pule a pergunta correspondente.
Se o objetivo for simples e direto, faça menos perguntas — use bom senso.

**Fase 2 — Geração**
Quando tiver informações suficientes
(mínimo: objetivo claro + 1 critério + formato), diga:
"✅ Tenho o suficiente. Gerando seu MPV Prompt..."
E então gere o prompt completo no formato abaixo.

## MODO SUGESTÃO
Quando receber a mensagem iniciando com "[SUGERIR_OPCOES]", o usuário
não sabe o que responder à sua última pergunta.
Responda com exatamente 4 opções numeradas, curtas e práticas,
diretamente relacionadas à pergunta anterior.

Formato obrigatório:
Escolha uma opção ou descreva o que preferir:

1️⃣ [opção]
2️⃣ [opção]
3️⃣ [opção]
4️⃣ [opção]

## FORMATO DO MPV PROMPT GERADO

Sempre gere o prompt dentro de um bloco delimitado EXATAMENTE assim:

---MPV_PROMPT_START---
# OBJETIVO
[objetivo claro e específico]

# CRITÉRIOS DE SUCESSO
- [resultado desejado]
- [restrição: tamanho, tom, público etc.]
- [o que deve ser evitado]

# EXEMPLO DE REFERÊNCIA

❌ EXEMPLO RUIM
Input: "[pedido vago relacionado ao tema]"
Output ruim: [exemplo curto de resposta genérica ou inadequada]

✅ EXEMPLO BOM
Input: "[pedido claro com critérios]"
Output bom: [exemplo de resposta que cumpre os critérios]

# FORMATO OBRIGATÓRIO DA RESPOSTA
Tom: [tom escolhido]

ENTENDIMENTO:
[em uma frase, o que você entendeu que precisa fazer]

RACIOCÍNIO E ABORDAGEM:
[o que foi considerado e como a solução foi construída]

RESULTADO:
[resposta final]

LIMITAÇÕES OU INCERTEZAS:
[se houver, descreva. Caso contrário: "nenhuma"]

VERIFICAÇÃO FINAL:
[confirme se cada critério de sucesso foi atendido]
---MPV_PROMPT_END---

## REGRAS
- Faça perguntas curtas e diretas, sem explicações longas
- Nunca faça mais de 4 perguntas no total
- Se o usuário disser "gera logo" ou "chega de perguntas",
  gere com o que tem
- Após gerar o prompt, pergunte: "Quer ajustar algo?"
- Responda sempre em português`;

const parsePrompt = (text) => {
  const start = text.indexOf("---MPV_PROMPT_START---");
  const end = text.indexOf("---MPV_PROMPT_END---");
  if (start !== -1 && end !== -1) {
    return {
      before: text.slice(0, start).trim(),
      prompt: text.slice(start + "---MPV_PROMPT_START---".length, end).trim(),
      after: text.slice(end + "---MPV_PROMPT_END---".length).trim(),
    };
  }
  return { before: text, prompt: null, after: "" };
};

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptGenerated, setPromptGenerated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Track if we just copied for button feedback
  const [copiedId, setCopiedId] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const getLastAIQuestion = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return "";
  };

  const sendMessage = async (systemContent, displayContent = null) => {
    if (!systemContent.trim()) return;

    const userMsg = { role: "user", content: systemContent, displayContent: displayContent || systemContent };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInputText("");
    setStarted(true);
    setLoading(true);

    try {
      const conversationHistory = newMessages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      const response = await fetch('/api/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: conversationHistory,
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na comunicação com o servidor.");
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

      const parsed = parsePrompt(reply);
      if (parsed.prompt !== null) {
        setPromptGenerated(true);
      }

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: `⚠️ Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestOptions = () => {
    const lastQuestion = getLastAIQuestion();
    sendMessage(
      `[SUGERIR_OPCOES] ${lastQuestion}`,
      "💡 Não sei responder — pode sugerir opções?"
    );
  };

  const handleCopy = (text, idx) => {
    const fallbackCopy = () => {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;top:-9999px;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedId(idx);
      setTimeout(() => setCopiedId(null), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(idx);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const startNew = () => {
    setStarted(false);
    setPromptGenerated(false);
    setMessages([]);
    setInputText("");
  };

  const renderMessageContent = (msg, idx) => {
    if (msg.role === 'user') {
      return msg.displayContent;
    }

    const { before, prompt, after } = parsePrompt(msg.content);

    return (
      <div className="flex flex-col gap-4">
        {before && <div className="whitespace-pre-wrap leading-relaxed">{before}</div>}

        {prompt && (
          <div className="relative mt-6 mb-4">
            <div className="absolute -top-3 left-4 bg-darkBg px-2 text-xs font-bold text-gold tracking-widest z-10">
              MPV PROMPT GERADO
            </div>
            <div className="bg-darkerBg border border-gold rounded-lg p-6 pt-8 font-mono text-sm leading-relaxed text-gray-300 relative group overflow-x-auto">
              <pre className="whitespace-pre-wrap">{prompt}</pre>

              <button
                onClick={() => handleCopy(prompt, idx)}
                className="absolute top-4 right-4 bg-darkBg/80 border border-gold/30 hover:bg-gold hover:text-darkBg text-gold transition-all duration-200 p-2 rounded flex items-center gap-2 text-xs font-bold font-sans opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                {copiedId === idx ? (
                  <>
                    <CheckCircle2 size={14} />
                    COPIADO
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    COPIAR PROMPT
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {after && <div className="whitespace-pre-wrap leading-relaxed">{after}</div>}
      </div>
    );
  };

  // Determine if we should show the "Nao sei" suggestion button
  const hasAIQuestion = messages.some(m => m.role === "assistant");
  const showSuggestButton = started && !loading && !promptGenerated && hasAIQuestion;

  return (
    <div className="flex flex-col h-screen bg-darkBg text-gray-200 font-serif">
      {/* Header */}
      {started && (
        <header className="flex-none border-b border-white/5 p-4 flex items-center justify-between sticky top-0 bg-darkBg/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <div className="bg-gold/10 p-2 rounded-lg text-gold">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MPV Prompt Builder</h1>
          </div>
          <button
            onClick={startNew}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2 rounded hover:bg-white/5"
          >
            <RefreshCcw size={16} />
            NOVO
          </button>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${started ? 'p-4 md:p-8' : 'p-4'} flex flex-col justify-between`}>
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">

          {!started ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[85vh] animate-fade-in py-10">

              {/* Logo Centralizado */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-[#c8a96e] to-[#8b6914] shadow-[0_0_20px_rgba(200,169,110,0.3)]">
                <Zap fill="currentColor" className="text-white" size={28} />
              </div>

              {/* Títulos */}
              <h1 className="text-4xl text-center font-bold text-gray-100 mb-4 font-serif">MPV Prompt Builder</h1>
              <div className="text-center font-mono text-xs tracking-[0.2em] text-gray-500 mb-2 uppercase">
                OBJETIVO → PERGUNTAS → PROMPT PRONTO
              </div>
              <div className="text-center font-mono text-xs text-gray-600 mb-10 tracking-wide">
                A IA pergunta. Você responde. O prompt se constrói.
              </div>

              {/* Bloco de Input */}
              <div className="bg-[#111111] p-6 md:p-8 rounded-xl border border-white/5 w-full max-w-2xl mx-auto mb-12 shadow-2xl">
                <label className="block text-gray-400 text-sm mb-4 font-sans text-left">
                  Descreva brevemente o que você precisa fazer:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-[#161616] border border-white/5 rounded-lg p-5 min-h-[120px] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gold/30 font-sans resize-none mb-4"
                  placeholder="Ex: Preciso escrever um e-mail pedindo home office..."
                />
                <button
                  onClick={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || loading}
                  className="w-full py-4 rounded-lg font-mono text-xs tracking-[0.15em] transition-all duration-300 bg-white/5 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed [&:not(:disabled)]:bg-[#1a1a1a] [&:not(:disabled)]:text-gray-400 [&:not(:disabled)]:hover:border-gold/20 [&:not(:disabled)]:border [&:not(:disabled)]:border-transparent [&:not(:disabled)]:hover:bg-gold/10 [&:not(:disabled)]:hover:text-gold uppercase flex items-center justify-center gap-2"
                >
                  Construir prompt →
                </button>
              </div>

              {/* Exemplos Rápidos */}
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
                <div className="text-center font-mono text-[10px] tracking-[0.15em] text-gray-600 mb-2 uppercase">
                  Ou comece com um exemplo
                </div>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(ex)}
                    className="text-left w-full p-4 rounded-lg border border-white/5 bg-transparent hover:bg-white/5 transition-all text-sm text-gray-400 hover:text-gray-300 font-sans"
                  >
                    {ex}
                  </button>
                ))}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-8 pb-32">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {msg.role === 'assistant' ? (
                      <>
                        <Zap size={16} className="text-gold" />
                        <span className="text-sm font-bold text-gold uppercase tracking-wider">MPV Architect</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-auto">Você</span>
                    )}
                  </div>

                  <div className={`p-5 rounded-2xl ${msg.role === 'user'
                    ? 'bg-gold/10 text-gray-100 rounded-tr-sm border border-gold/20'
                    : 'bg-white/5 text-gray-300 rounded-tl-sm border border-white/5'
                    }`}
                  >
                    {renderMessageContent(msg, idx)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex flex-col self-start max-w-[85%] animate-pulse">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Zap size={16} className="text-gold" />
                    <span className="text-sm font-bold text-gold uppercase tracking-wider">MPV Architect</span>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl rounded-tl-sm border border-white/5 flex gap-2 w-24 items-center justify-center">
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      {started && (
        <div className="p-4 md:p-6 border-t border-white/5 bg-darkBg/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-20">
          <div className="max-w-3xl mx-auto w-full relative">

            {/* Suggestion Button placed just above the input field on the right */}
            {showSuggestButton && (
              <div className="absolute -top-14 right-0 flex justify-end animate-fade-in-up">
                <button
                  onClick={handleSuggestOptions}
                  className="flex items-center gap-2 bg-darkBg border border-gold/50 hover:bg-gold hover:text-darkBg text-gold font-bold transition-all px-4 py-2 rounded-full shadow-lg shadow-black/50 text-sm"
                >
                  <Lightbulb size={16} />
                  Não sei — sugira opções
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputText);
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={promptGenerated ? "Quer ajustar algo no prompt?" : "Digite sua resposta..."}
                disabled={loading}
                className="w-full bg-darkerBg border border-white/10 rounded-xl py-4 pl-5 pr-14 text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="absolute right-3 p-2 bg-gold/10 text-gold hover:bg-gold hover:text-darkBg rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-gold/10 disabled:hover:text-gold"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
