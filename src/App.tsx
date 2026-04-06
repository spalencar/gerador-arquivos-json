/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileJson, 
  Play, 
  Settings, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Calendar,
  Sun,
  Moon,
  Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateJSONContent } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  template: string;
  content: string;
}

export default function App() {
  const [template, setTemplate] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [fields, setFields] = useState<Field[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJSON, setGeneratedJSON] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modelJSON, setModelJSON] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'custom' | 'model'>('custom');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load history and theme from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('json_maker_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    
    const savedTheme = localStorage.getItem('json_maker_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('json_maker_history', JSON.stringify(history));
  }, [history]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('json_maker_theme', theme);
  }, [theme]);

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', description: '' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof Field, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedJSON(null);

    try {
      let finalSchema = null;
      let finalPrompt = `Template: ${template}\nContexto: ${context}\n\nPor favor, gere uma lista de objetos JSON seguindo o esquema definido.`;

      if (activeTab === 'model' && modelJSON) {
        try {
          JSON.parse(modelJSON); // Validate JSON
          finalPrompt = `Baseado no modelo JSON fornecido, gere novos dados para o seguinte contexto: ${context}. 
          IMPORTANTE: Mantenha EXATAMENTE a mesma estrutura de chaves e o mesmo formato do objeto raiz (seja um array ou um objeto contendo um array). 
          Não use a estrutura de campos definida anteriormente, use APENAS o modelo fornecido como guia de estrutura.`;
          
          finalSchema = undefined; // Let Gemini infer from model
        } catch (e) {
          setError('O JSON de modelo é inválido. Por favor, corrija-o.');
          setIsGenerating(false);
          return;
        }
      } else {
        const properties: any = {};
        fields.forEach(f => {
          properties[f.name] = {
            type: f.type.toUpperCase(),
            description: f.description
          };
        });

        finalSchema = {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties,
            required: fields.map(f => f.name)
          }
        };
      }
      
      const result = await generateJSONContent(finalPrompt, finalSchema, activeTab === 'model' ? modelJSON : undefined);
      if (result) {
        const formattedJSON = JSON.stringify(JSON.parse(result), null, 2);
        setGeneratedJSON(formattedJSON);
        
        // Add to history
        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          template: template || 'Sem título',
          content: formattedJSON
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20)); // Keep last 20
      }
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o JSON. Verifique suas configurações e tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadJSON = () => {
    if (!generatedJSON) return;
    const blob = new Blob([generatedJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!generatedJSON) return;
    navigator.clipboard.writeText(generatedJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setGeneratedJSON(item.content);
    setTemplate(item.template);
    setShowHistory(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setHistory([]);
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      theme === 'dark' ? "bg-[#0F0F10] text-white selection:bg-emerald-900" : "bg-[#F5F5F5] text-[#1A1A1A] selection:bg-emerald-100"
    )}>
      {/* Header */}
      <header className={cn(
        "border-b sticky top-0 z-10 transition-colors duration-300",
        theme === 'dark' ? "bg-[#151619] border-white/5" : "bg-white border-black/5"
      )}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
              <FileJson size={24} />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-none">Gerador de Arquivos JSON</h1>
              <p className={cn(
                "text-xs mt-1",
                theme === 'dark' ? "text-white/40" : "text-black/40"
              )}>Gere dados estruturados com IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={cn(
                "p-2.5 rounded-full transition-all",
                theme === 'dark' ? "text-yellow-400 hover:bg-white/5" : "text-black/40 hover:bg-black/5"
              )}
              title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-2.5 rounded-full transition-all",
                showHistory 
                  ? (theme === 'dark' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600") 
                  : (theme === 'dark' ? "text-white/40 hover:bg-white/5" : "text-black/40 hover:bg-black/5")
              )}
              title="Histórico"
            >
              <Calendar size={20} />
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all",
                isGenerating 
                  ? (theme === 'dark' ? "bg-white/5 text-white/20" : "bg-black/5 text-black/40") 
                  : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-md hover:shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20"
              )}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
              {isGenerating ? 'Gerando...' : 'Gerar JSON'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        {/* History Drawer Overlay */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col transition-colors duration-300",
                  theme === 'dark' ? "bg-[#151619] text-white" : "bg-white text-[#1A1A1A]"
                )}
              >
                <div className={cn(
                  "p-6 border-b flex items-center justify-between",
                  theme === 'dark' ? "border-white/5" : "border-black/5"
                )}>
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-emerald-600" />
                    <h2 className="font-semibold text-lg">Histórico de Gerações</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={clearHistory}
                      className={cn(
                        "p-2 transition-colors",
                        theme === 'dark' ? "text-white/40 hover:text-red-400" : "text-black/40 hover:text-red-500"
                      )}
                      title="Limpar Histórico"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className={cn(
                        "p-2 transition-colors",
                        theme === 'dark' ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black/60"
                      )}
                    >
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className={cn(
                      "h-full flex flex-col items-center justify-center text-center space-y-4",
                      theme === 'dark' ? "text-white/20" : "text-black/20"
                    )}>
                      <FileJson size={48} />
                      <p className="text-sm">Nenhuma geração encontrada no histórico.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className={cn(
                          "group p-4 border rounded-2xl transition-all cursor-pointer relative",
                          theme === 'dark' 
                            ? "bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10" 
                            : "bg-[#F9F9F9] border-black/5 hover:border-emerald-500/30 hover:bg-emerald-50/30"
                        )}
                      >
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className={cn(
                            "absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 transition-all",
                            theme === 'dark' ? "text-white/10 hover:text-red-400" : "text-black/10 hover:text-red-500"
                          )}
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 border rounded-lg flex items-center justify-center text-emerald-600 shrink-0",
                            theme === 'dark' ? "bg-[#1A1B1E] border-white/5" : "bg-white border-black/5"
                          )}>
                            <FileJson size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate pr-6">{item.template}</h3>
                            <p className={cn(
                              "text-[10px] mt-0.5",
                              theme === 'dark' ? "text-white/40" : "text-black/40"
                            )}>
                              {new Date(item.timestamp).toLocaleString('pt-BR')}
                            </p>
                            <div className={cn(
                              "mt-2 rounded-lg p-2 overflow-hidden",
                              theme === 'dark' ? "bg-black/20" : "bg-black/5"
                            )}>
                              <p className={cn(
                                "text-[10px] font-mono line-clamp-2",
                                theme === 'dark' ? "text-white/40" : "text-black/40"
                              )}>
                                {item.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Left Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tabs for Mode */}
          <div className={cn(
            "flex p-1 rounded-2xl transition-colors duration-300",
            theme === 'dark' ? "bg-white/5" : "bg-black/5"
          )}>
            <button 
              onClick={() => setActiveTab('custom')}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                activeTab === 'custom' 
                  ? (theme === 'dark' ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-emerald-600 shadow-sm") 
                  : (theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60")
              )}
            >
              Personalizado
            </button>
            <button 
              onClick={() => setActiveTab('model')}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                activeTab === 'model' 
                  ? (theme === 'dark' ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-emerald-600 shadow-sm") 
                  : (theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60")
              )}
            >
              A partir de Modelo
            </button>
          </div>

          {/* Section: Template Info */}
          <section className={cn(
            "rounded-2xl p-6 shadow-sm border transition-colors duration-300",
            theme === 'dark' ? "bg-[#151619] border-white/5" : "bg-white border-black/5"
          )}>
            <div className={cn(
              "flex items-center gap-2 mb-4",
              theme === 'dark' ? "text-white/60" : "text-black/60"
            )}>
              <Settings size={18} />
              <h2 className="font-semibold uppercase tracking-wider text-xs">Configuração Geral</h2>
            </div>
            
            <div className="space-y-4">
              {activeTab === 'model' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={cn(
                      "block text-sm font-medium",
                      theme === 'dark' ? "text-white/70" : "text-black/70"
                    )}>Cole seu JSON de Modelo</label>
                    <button 
                      onClick={() => setModelJSON('')}
                      className="text-[10px] font-bold uppercase text-red-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <Eraser size={12} /> Limpar
                    </button>
                  </div>
                  <textarea 
                    value={modelJSON}
                    onChange={(e) => setModelJSON(e.target.value)}
                    rows={8}
                    placeholder='{"reflexoes": [{"data": "...", ...}]}'
                    className={cn(
                      "w-full px-4 py-2.5 font-mono text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none",
                      theme === 'dark' ? "bg-black/20 text-emerald-400 border-white/5" : "bg-[#151619] text-emerald-400 border-black/5"
                    )}
                  />
                  <p className={cn(
                    "text-[10px] mt-2 italic",
                    theme === 'dark' ? "text-white/40" : "text-black/40"
                  )}>A IA usará este arquivo para entender a estrutura e o estilo dos dados.</p>
                </div>
              )}

              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1.5",
                  theme === 'dark' ? "text-white/70" : "text-black/70"
                )}>Nome do Template</label>
                <input 
                  type="text" 
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Ex: Devocional Diário"
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all",
                    theme === 'dark' ? "bg-white/5 border-white/5 text-white" : "bg-[#F9F9F9] border-black/5 text-[#1A1A1A]"
                  )}
                />
              </div>
              
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1.5",
                  theme === 'dark' ? "text-white/70" : "text-black/70"
                )}>Contexto e Instruções</label>
                <textarea 
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  placeholder="Descreva o que deseja gerar, o período, o tom de voz, etc."
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none",
                    theme === 'dark' ? "bg-white/5 border-white/5 text-white" : "bg-[#F9F9F9] border-black/5 text-[#1A1A1A]"
                  )}
                />
              </div>
            </div>
          </section>

          {/* Section: Schema Fields */}
          {activeTab === 'custom' && (
            <section className={cn(
              "rounded-2xl p-6 shadow-sm border transition-colors duration-300",
              theme === 'dark' ? "bg-[#151619] border-white/5" : "bg-white border-black/5"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "flex items-center gap-2",
                  theme === 'dark' ? "text-white/60" : "text-black/60"
                )}>
                  <Plus size={18} />
                  <h2 className="font-semibold uppercase tracking-wider text-xs">Estrutura (Campos)</h2>
                </div>
                <button 
                  onClick={addField}
                  className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar Campo
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {fields.length === 0 ? (
                    <div className={cn(
                      "py-8 text-center border-2 border-dashed rounded-xl",
                      theme === 'dark' ? "border-white/5 text-white/20" : "border-black/5 text-black/20"
                    )}>
                      <p className="text-xs">Nenhum campo adicionado.</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "p-4 border rounded-xl space-y-3 relative group",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-[#F9F9F9] border-black/5"
                        )}
                      >
                        <button 
                          onClick={() => removeField(index)}
                          className={cn(
                            "absolute top-2 right-2 p-1.5 transition-colors opacity-0 group-hover:opacity-100",
                            theme === 'dark' ? "text-white/20 hover:text-red-400" : "text-black/20 hover:text-red-500"
                          )}
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={cn(
                              "block text-[10px] font-bold uppercase mb-1",
                              theme === 'dark' ? "text-white/40" : "text-black/40"
                            )}>Nome</label>
                            <input 
                              type="text" 
                              value={field.name}
                              onChange={(e) => updateField(index, 'name', e.target.value)}
                              placeholder="id, titulo..."
                              className={cn(
                                "w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-emerald-500",
                                theme === 'dark' ? "bg-black/20 border-white/5 text-white" : "bg-white border-black/5 text-[#1A1A1A]"
                              )}
                            />
                          </div>
                          <div>
                            <label className={cn(
                              "block text-[10px] font-bold uppercase mb-1",
                              theme === 'dark' ? "text-white/40" : "text-black/40"
                            )}>Tipo</label>
                            <select 
                              value={field.type}
                              onChange={(e) => updateField(index, 'type', e.target.value as any)}
                              className={cn(
                                "w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-emerald-500",
                                theme === 'dark' ? "bg-black/20 border-white/5 text-white" : "bg-white border-black/5 text-[#1A1A1A]"
                              )}
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={cn(
                            "block text-[10px] font-bold uppercase mb-1",
                            theme === 'dark' ? "text-white/40" : "text-black/40"
                          )}>Descrição</label>
                          <input 
                            type="text" 
                            value={field.description}
                            onChange={(e) => updateField(index, 'description', e.target.value)}
                            placeholder="O que este campo representa?"
                            className={cn(
                              "w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-emerald-500",
                              theme === 'dark' ? "bg-black/20 border-white/5 text-white" : "bg-white border-black/5 text-[#1A1A1A]"
                            )}
                          />
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7">
          <div className="bg-[#151619] rounded-2xl shadow-2xl border border-white/5 h-full min-h-[600px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <span className="text-xs font-mono text-white/40">preview.json</span>
              </div>
              
              <div className="flex items-center gap-2">
                {generatedJSON && (
                  <>
                    <button 
                      onClick={() => setGeneratedJSON(null)}
                      className="p-2 text-white/40 hover:text-red-400 rounded-lg transition-all"
                      title="Limpar Preview"
                    >
                      <Eraser size={18} />
                    </button>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Copiar JSON"
                    >
                      {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </button>
                    <button 
                      onClick={downloadJSON}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all"
                    >
                      <Download size={16} /> Baixar .json
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 font-mono text-sm overflow-auto custom-scrollbar">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 space-y-4">
                  <Loader2 size={48} className="animate-spin text-emerald-500" />
                  <div className="text-center">
                    <p className="text-white/80 font-medium">A IA está trabalhando...</p>
                    <p className="text-xs mt-1">Isso pode levar alguns segundos dependendo da quantidade de dados.</p>
                  </div>
                </div>
              ) : generatedJSON ? (
                <pre className="text-emerald-400/90 leading-relaxed">
                  {generatedJSON}
                </pre>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-red-400/80 space-y-3">
                  <AlertCircle size={48} />
                  <p className="font-medium">{error}</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-6 max-w-sm mx-auto text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <FileJson size={32} />
                  </div>
                  <div>
                    <h3 className="text-white/60 font-medium mb-2">Nenhum JSON gerado ainda</h3>
                    <p className="text-xs leading-relaxed">
                      Configure seu template e clique em "Gerar JSON" para ver a mágica acontecer. 
                      Ideal para atualizar apps bíblicos, catálogos ou blogs.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
                      <BookOpen size={16} className="text-emerald-500 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Exemplo 1</p>
                      <p className="text-xs text-white/60 mt-1">Devocionais Mensais</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
                      <Calendar size={16} className="text-emerald-500 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Exemplo 2</p>
                      <p className="text-xs text-white/60 mt-1">Versículos do Dia</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
        }
      `}} />
    </div>
  );
}
