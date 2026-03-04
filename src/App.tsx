import React, { useState, useEffect, useRef } from 'react';
import { 
  Rocket, 
  ShieldCheck, 
  Zap, 
  Users, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Clock, 
  ChevronRight,
  Menu,
  X,
  BrainCircuit,
  LayoutDashboard,
  Target,
  Mail,
  Linkedin,
  Globe,
  Send,
  Bot,
  User,
  Loader2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const Chatbot = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Olá! Sou o assistente da **iCARUS Soluções**. Como posso otimizar seus projetos hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chatParams = {
        model: "gemini-3-flash-preview",
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: userMessage }] }],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `Você é o assistente oficial da iCARUS Soluções.
          Seu tom deve ser: **Curto, Direto, Inteligente e Bem Formatado**.
          
          **Objetivo:** Explicar o "Project Mind Manager" e converter em agendamento de consultoria.
          
          **Contexto iCARUS:**
          - Startup de Gestão de Projetos (Certificações: PMP, ACP, SCRUM).
          - Sistema: Automatiza 80% das tarefas operacionais.
          - Funcionalidades Chave: Riscos IA, Atas Automáticas, Cronograma/Kanban Sincronizados, Elo (IA Assistente).
          
          **Regras de Agendamento:**
          - Horários: Seg-Sex, 09h às 17h.
          - Fluxo: 1. Verificar data -> 2. Listar slots (listFreeSlots) -> 3. Confirmar Nome/Email -> 4. Reservar (bookAppointment).
          
          Responda sempre de forma executiva. Evite parágrafos longos. Use tópicos para listas.`,
          tools: [{
            functionDeclarations: [
              {
                name: "listFreeSlots",
                description: "Lista horários livres para uma data específica (formato YYYY-MM-DD).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "A data para verificar (YYYY-MM-DD)" }
                  },
                  required: ["date"]
                }
              },
              {
                name: "bookAppointment",
                description: "Reserva um horário na agenda do especialista.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    startTime: { type: Type.STRING, description: "Horário de início (ISO String)" },
                    endTime: { type: Type.STRING, description: "Horário de término (ISO String)" },
                    guestEmail: { type: Type.STRING, description: "E-mail do cliente" },
                    guestName: { type: Type.STRING, description: "Nome do cliente" }
                  },
                  required: ["startTime", "endTime", "guestEmail", "guestName"]
                }
              }
            ]
          }]
        }
      };

      const response = await genAI.models.generateContent(chatParams);
      
      if (response.functionCalls) {
        const toolResponses = [];
        for (const call of response.functionCalls) {
          if (call.name === "listFreeSlots") {
            const { date } = call.args as any;
            const res = await fetch(`/api/calendar/free-slots?date=${date}`);
            const data = await res.json();
            toolResponses.push({ functionResponse: { name: "listFreeSlots", response: data } });
          } else if (call.name === "bookAppointment") {
            const args = call.args as any;
            const res = await fetch('/api/calendar/book', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args)
            });
            const data = await res.json();
            toolResponses.push({ functionResponse: { name: "bookAppointment", response: data } });
          }
        }

        if (toolResponses.length > 0) {
          // Send tool response back to Gemini, including the ORIGINAL model content to preserve thought signatures
          const toolResult = await genAI.models.generateContent({
            ...chatParams,
            contents: [
              ...chatParams.contents,
              response.candidates[0].content, // This includes the thought and the function call
              { role: 'user', parts: toolResponses }
            ]
          });
          setMessages(prev => [...prev, { role: 'model', text: toolResult.text || "Agendamento processado com sucesso." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: response.text || "Desculpe, não entendi." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao processar sua mensagem. Verifique se o calendário está conectado." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 w-[400px] h-[600px] glass-card rounded-[2rem] z-[100] flex flex-col overflow-hidden shadow-2xl border-teal-100"
        >
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-bold font-display">Especialista iCarus</h3>
                <p className="text-xs text-teal-400">Online agora</p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-teal-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none">
                  <Loader2 size={20} className="animate-spin text-teal-600" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading}
                className="bg-teal-600 text-white p-2 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ onOpenChat }: { onOpenChat: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'O Sistema', href: '#sistema' },
    { name: 'Funcionalidades', href: '#funcionalidades' },
    { name: 'Certificações', href: '#certificacoes' },
    { name: 'Sobre', href: '#sobre' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="https://ais-pre-ij27sxlv3f6nq4qtdebrsi-212115760682.us-east1.run.app/logo.png" 
            alt="iCARUS Logo" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback to icon if image fails
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
            }}
            referrerPolicy="no-referrer"
          />
          <div className="fallback-icon hidden w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Rocket size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tight text-slate-900">
            iCARUS <span className="text-teal-600">Soluções</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <button 
            onClick={onOpenChat}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-600 transition-all shadow-md active:scale-95"
          >
            Falar com Especialista
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-slate-900" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white border-t border-slate-100 p-6 flex flex-col gap-4 md:hidden shadow-xl"
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-lg font-medium text-slate-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <button 
              onClick={onOpenChat}
              className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold w-full"
            >
              Falar com Especialista
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay = 0, ...props }: { icon: any, title: string, description: string, delay?: number, [key: string]: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    {...props}
    className="p-8 rounded-3xl bg-white border border-slate-100 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-500/5 transition-all group"
  >
    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-teal-600 mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3 font-display">{title}</h3>
    <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
  </motion.div>
);

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleConnectCalendar = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.message || "Erro ao iniciar conexão com Google.");
        return;
      }

      if (data.url) {
        window.open(data.url, 'google_auth', 'width=600,height=700');
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Erro de conexão com o servidor. Verifique se o servidor está rodando.");
    }
  };

  const features = [
    { icon: LayoutDashboard, title: "Visão Geral (Overview)", description: "Centraliza dados do TAP e propostas. IA organiza premissas e restrições automaticamente." },
    { icon: BarChart3, title: "Visão do GP", description: "Painel gerencial com relatórios de saúde e criação inteligente de Termos de Abertura (TAP)." },
    { icon: Calendar, title: "Cronograma & Kanban", description: "Sincronização bidirecional em tempo real entre visão linear e ágil." },
    { icon: AlertTriangle, title: "Gestão de Riscos IA", description: "Identificação automática de riscos e sugestões de mitigação baseadas em documentos." },
    { icon: ShieldCheck, title: "Qualidade (QA)", description: "Checklist vivo de critérios de aceite atualizado dinamicamente pela IA." },
    { icon: Users, title: "Engajamento Stakeholders", description: "Mapeamento de influência x poder e sugestões táticas de gestão de expectativas." },
    { icon: MessageSquare, title: "Comunicação Estratégica", description: "Cronograma logístico automatizado de quando e como falar com cada público." },
    { icon: FileText, title: "Atas Dinâmicas", description: "Geração automática de atas a partir de áudio/vídeo com personalização total." },
    { icon: Zap, title: "Gestão de Artefatos", description: "Repositório inteligente com indexação por tags dinâmicas via IA." },
    { icon: Lightbulb, title: "Lições Aprendidas", description: "Alimenta base de sabedoria institucional e gera roteiros de PIR instantâneos." },
    { icon: BrainCircuit, title: "Elo (Assistente IA)", description: "Chat de contexto profundo alimentado pelo escopo do projeto e PMBOK." },
    { icon: Target, title: "Preparação de Kickoff", description: "Roteiros e apresentações completas para alinhamento interno e com clientes." },
    { icon: BarChart3, title: "Status Report Builder", description: "Boletins flexíveis formatados com linguagem profissional pela IA." },
  ];

  return (
    <div className="min-h-screen">
      <Navbar onOpenChat={() => setIsChatOpen(true)} />
      <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Specialist Config Button (Hidden in production, for demo setup) */}
      <button 
        onClick={() => setIsConfigOpen(!isConfigOpen)}
        className="fixed bottom-6 left-6 w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-all z-50"
        title="Configuração do Especialista"
      >
        <Settings size={20} />
      </button>

      <AnimatePresence>
        {isConfigOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed bottom-20 left-6 glass-card p-6 rounded-2xl z-50 w-80"
          >
            <h4 className="font-bold mb-2">Setup do Especialista</h4>
            <p className="text-xs text-slate-500 mb-4">Conecte seu Google Calendar para que o chatbot possa marcar reuniões.</p>
            <button 
              onClick={handleConnectCalendar}
              className="w-full bg-teal-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-teal-700 transition-all"
            >
              Conectar Google Calendar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-200 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-semibold mb-6">
              <Zap size={16} />
              <span>O Copiloto do Gestor de Projetos</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 font-display">
              Gestão de Projetos <br />
              <span className="gradient-text">Potencializada por IA</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl">
              Automatize 80% das atividades operacionais e foque no que realmente importa: extrair valor e garantir o sucesso do seu projeto.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20 flex items-center gap-2 group">
                Conhecer o Sistema
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all">
                Ver Demonstração
              </button>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 font-medium">
                <span className="text-slate-900 font-bold">+500 gestores</span> já utilizam o iCarus
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              <img 
                src="https://picsum.photos/seed/dashboard/1200/900" 
                alt="iCarus Dashboard" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-6 -right-6 glass-card p-4 rounded-2xl z-20 hidden sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status do Projeto</p>
                  <p className="text-sm font-bold text-slate-900">Saúde: Excelente</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute -bottom-6 -left-6 glass-card p-4 rounded-2xl z-20 hidden sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">IA Sugestão</p>
                  <p className="text-sm font-bold text-slate-900">Risco mitigado em 45%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Certifications Section */}
      <section id="certificacoes" className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">
            Profissionais Certificados Pelas Maiores Autoridades
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all">
            {['PMI - PMP', 'PMI - ACP', 'CPMAI', 'SCRUM MASTER', 'PMBOK 7'].map(cert => (
              <span key={cert} className="text-2xl font-display font-black text-slate-400">{cert}</span>
            ))}
          </div>
        </div>
      </section>

      {/* The System Concept */}
      <section id="sistema" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-6 font-display">O Project Mind Manager</h2>
            <p className="text-lg text-slate-600">
              Uma plataforma inovadora ancorada nas melhores práticas do PMI-PMBOK. Atua como um co-piloto vivo, utilizando a API do Google Gemini para automatizar o ciclo de vida do projeto.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Zap size={120} />
              </div>
              <h3 className="text-5xl font-bold mb-6 font-display">80%</h3>
              <p className="text-xl font-semibold mb-4">Automação Inteligente</p>
              <p className="text-slate-400 leading-relaxed">
                Nossa IA assume as tarefas repetitivas e burocráticas, permitindo que você foque na estratégia e nas pessoas.
              </p>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-teal-600 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <BrainCircuit size={120} />
              </div>
              <h3 className="text-5xl font-bold mb-6 font-display">IA</h3>
              <p className="text-xl font-semibold mb-4">Contexto Profundo</p>
              <p className="text-teal-100 leading-relaxed">
                Diferente de IAs genéricas, a Elo entende o escopo específico do seu projeto e as diretrizes do PMBOK.
              </p>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-white border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Clock size={120} />
              </div>
              <h3 className="text-5xl font-bold mb-6 font-display text-slate-900">24/7</h3>
              <p className="text-xl font-semibold mb-4 text-slate-900">Monitoramento Vivo</p>
              <p className="text-slate-600 leading-relaxed">
                Sincronização em tempo real entre Cronograma e Kanban, garantindo visibilidade total a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold text-slate-900 mb-6 font-display">Funcionalidades Principais</h2>
              <p className="text-lg text-slate-600">
                Uma suíte completa de ferramentas desenhadas para transformar a gestão de projetos em uma experiência fluida e orientada a resultados.
              </p>
            </div>
            <button className="text-teal-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Ver todos os módulos <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard 
                key={feature.title + index} 
                {...feature} 
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-square rounded-[3rem] bg-slate-200 overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/team/800/800" 
                  alt="iCarus Team" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 glass-card p-8 rounded-3xl max-w-xs">
                <p className="text-teal-600 font-bold text-4xl mb-2">100%</p>
                <p className="text-slate-900 font-bold mb-1">Foco no Sucesso</p>
                <p className="text-slate-500 text-sm">Metodologias ágeis e tradicionais integradas para máxima eficiência.</p>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-8 font-display">Por que a iCarus Soluções?</h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Expertise Certificada</h4>
                    <p className="text-slate-600">Nossa equipe possui as certificações mais respeitadas do mercado (PMP, ACP, SCRUM), garantindo conformidade com padrões globais.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Tecnologia de Ponta</h4>
                    <p className="text-slate-600">Utilizamos o que há de mais moderno em IA (Google Gemini) e desenvolvimento (React 19, Firebase) para entregar performance e segurança.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                    <Target size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Visão de Valor</h4>
                    <p className="text-slate-600">Não apenas gerimos tarefas; focamos em extrair o melhor valor estratégico de cada projeto para o seu negócio.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-500 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500 blur-[120px] rounded-full" />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 font-display relative z-10">
            Pronto para o futuro da <br /> <span className="text-teal-400">Gestão de Projetos?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto relative z-10">
            Junte-se a centenas de empresas que já transformaram seus processos com o Copiloto iCarus.
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button className="bg-teal-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-teal-400 transition-all shadow-2xl shadow-teal-500/20">
              Começar Agora Gratuitamente
            </button>
            <button className="bg-white/10 text-white border border-white/20 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/20 transition-all backdrop-blur-sm">
              Agendar Demo
            </button>
          </div>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 font-display">Nossa Expertise é Certificada</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Operamos sob os mais altos padrões globais de gestão. Nossa equipe detém as certificações mais prestigiadas do Project Management Institute (PMI).
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                title: "PMP®",
                subtitle: "Project Management Professional",
                desc: "A certificação mais importante do mundo para gerentes de projeto.",
                img: "https://images.credly.com/size/340x340/images/2d678f68-389c-444d-a332-2253b561f9d1/PMP.png"
              },
              {
                title: "PMI-ACP®",
                subtitle: "Agile Certified Practitioner",
                desc: "Especialistas em metodologias ágeis (Scrum, Kanban, Lean, XP).",
                img: "https://images.credly.com/size/340x340/images/62694936-2a78-47db-9356-27ef27039699/PMI-ACP.png"
              },
              {
                title: "CAPM®",
                subtitle: "Certified Associate in PM",
                desc: "Domínio fundamental dos processos e terminologias do PMBOK®.",
                img: "https://images.credly.com/size/340x340/images/33036668-3949-4702-8f5d-209252327702/CAPM.png"
              },
              {
                title: "DASM™",
                subtitle: "Disciplined Agile Scrum Master",
                desc: "Abordagem ágil disciplinada para otimização de fluxos de trabalho.",
                img: "https://images.credly.com/size/340x340/images/83348630-f475-4340-802c-7467771746f3/DASM.png"
              }
            ].map((cert, i) => (
              <motion.div 
                key={cert.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <img 
                  src={cert.img} 
                  alt={cert.title} 
                  className="w-32 h-32 mb-6 object-contain"
                  referrerPolicy="no-referrer"
                />
                <h4 className="text-xl font-bold text-slate-900 mb-1">{cert.title}</h4>
                <p className="text-teal-600 text-sm font-semibold mb-3">{cert.subtitle}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{cert.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src="https://ais-pre-ij27sxlv3f6nq4qtdebrsi-212115760682.us-east1.run.app/logo.png" 
                  alt="iCARUS Logo" 
                  className="w-10 h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xl font-display font-bold tracking-tight text-slate-900">
                  iCARUS <span className="text-teal-600">Soluções</span>
                </span>
              </div>
              <p className="text-slate-500 max-w-sm mb-8">
                Especialistas em gestão de projetos inteligentes. Unindo a sabedoria do PMBOK com o poder da Inteligência Artificial.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all">
                  <Linkedin size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all">
                  <Mail size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all">
                  <Globe size={20} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Links Rápidos</h4>
              <ul className="space-y-4 text-slate-500">
                <li><a href="#sistema" className="hover:text-teal-600 transition-colors">O Sistema</a></li>
                <li><a href="#funcionalidades" className="hover:text-teal-600 transition-colors">Funcionalidades</a></li>
                <li><a href="#certificacoes" className="hover:text-teal-600 transition-colors">Certificações</a></li>
                <li><a href="#sobre" className="hover:text-teal-600 transition-colors">Sobre Nós</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-500">
                <li><a href="#" className="hover:text-teal-600 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-teal-600 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-teal-600 transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-teal-600 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-sm">
              © 2024 iCARUS Soluções e Tecnologias. Todos os direitos reservados.
            </p>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              Desenvolvido com <Zap size={14} className="text-teal-500" /> para o sucesso do seu projeto.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
