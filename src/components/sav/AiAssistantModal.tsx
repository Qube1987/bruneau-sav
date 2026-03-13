import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Copy, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AiAssistantModalProps {
    systemBrand?: string;
    systemModel?: string;
    systemType?: string;
    problemDesc?: string;
    onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
    systemBrand,
    systemModel,
    systemType,
    problemDesc,
    onClose,
}) => {
    const systemLabel = [systemBrand, systemModel].filter(Boolean).join(' ');
    const defaultQuestion = systemLabel
        ? `J'ai une question technique sur ${systemLabel} : `
        : "J'ai une question technique : ";

    const [question, setQuestion] = useState(defaultQuestion);
    const [answer, setAnswer] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const answerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            // Place cursor at end
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, []);

    useEffect(() => {
        if (answer && answerRef.current) {
            answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [answer]);

    const handleAsk = async () => {
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setAnswer(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-technical-assistant`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        question,
                        system_brand: systemBrand,
                        system_model: systemModel,
                        system_type: systemType,
                        problem_desc: problemDesc,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la requête');
            }

            setAnswer(data.answer);
        } catch (err: any) {
            console.error('AI Assistant error:', err);
            setError(err.message || "L'assistant IA n'a pas pu répondre. Réessayez.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    const handleCopy = async () => {
        if (answer) {
            await navigator.clipboard.writeText(answer);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleReset = () => {
        setQuestion(defaultQuestion);
        setAnswer(null);
        setError(null);
        if (textareaRef.current) {
            textareaRef.current.focus();
            const len = defaultQuestion.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    };

    // Simple markdown-like formatting for the answer
    const formatAnswer = (text: string) => {
        return text
            .split('\n')
            .map((line, i) => {
                // Bold
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // Inline code
                line = line.replace(/`(.*?)`/g, '<code class="ai-inline-code">$1</code>');
                // Headers
                if (line.startsWith('### ')) {
                    return `<h4 class="ai-h4" key="${i}">${line.slice(4)}</h4>`;
                }
                if (line.startsWith('## ')) {
                    return `<h3 class="ai-h3" key="${i}">${line.slice(3)}</h3>`;
                }
                if (line.startsWith('# ')) {
                    return `<h2 class="ai-h2" key="${i}">${line.slice(2)}</h2>`;
                }
                // List items
                if (line.match(/^[-*] /)) {
                    return `<li class="ai-li">${line.slice(2)}</li>`;
                }
                if (line.match(/^\d+\. /)) {
                    return `<li class="ai-li-num">${line.replace(/^\d+\. /, '')}</li>`;
                }
                // Empty line
                if (line.trim() === '') {
                    return '<br />';
                }
                return `<p class="ai-p">${line}</p>`;
            })
            .join('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="ai-assistant-header px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="ai-genie-icon-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Assistant IA Technique</h3>
                            <p className="text-white/70 text-xs">
                                {systemLabel ? `${systemLabel}` : 'Posez votre question'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Question input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Votre question
                        </label>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm text-gray-800 resize-none placeholder-gray-400"
                                placeholder="Décrivez votre problème technique..."
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAsk}
                                disabled={isLoading || !question.trim()}
                                className="ai-ask-button flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Réflexion en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Demander au génie</span>
                                        <Send className="h-3.5 w-3.5" />
                                    </>
                                )}
                            </button>
                            {(answer || error) && (
                                <button
                                    onClick={handleReset}
                                    className="p-2.5 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-gray-500 hover:text-purple-600"
                                    title="Nouvelle question"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Loading animation */}
                    {isLoading && (
                        <div className="ai-loading-container">
                            <div className="ai-loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <p className="text-sm text-purple-600 font-medium mt-3">Le génie réfléchit...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Answer */}
                    {answer && (
                        <div ref={answerRef} className="ai-answer-container">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Réponse du génie</span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                                    title="Copier la réponse"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                            <span className="text-green-600">Copié !</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Copier</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div
                                className="ai-answer-text"
                                dangerouslySetInnerHTML={{ __html: formatAnswer(answer) }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                    <p className="text-xs text-gray-400 text-center">
                        ⇧ Entrée pour un saut de ligne • Entrée pour envoyer • Propulsé par Claude Sonnet
                    </p>
                </div>
            </div>
        </div>
    );
};
