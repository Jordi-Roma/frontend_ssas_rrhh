import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BookOpen, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { chatbotApi, type ChatAnswer, type KnowledgeArticle } from '../api/chatbotApi'
import './chat-widget.css'

type Message = { id: number; role: 'user' | 'assistant'; text: string; sources?: ChatAnswer['fuentes']; links?: ChatAnswer['enlaces'] }

export function ChatWidget({ slug }: { slug?: string }) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sourceArticle, setSourceArticle] = useState<KnowledgeArticle | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    chatbotApi.suggestions(slug).then(items => { if (active) setSuggestions(items) })
      .catch(() => { if (active) setSuggestions([]) })
    return () => { active = false }
  }, [slug])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }) }, [messages])

  async function send(value = question) {
    const text = value.trim()
    if (text.length < 3 || loading) return
    setQuestion('')
    setError('')
    setMessages(previous => [...previous, { id: Date.now(), role: 'user', text }])
    setLoading(true)
    try {
      const answer = await chatbotApi.ask(text, slug)
      setMessages(previous => [...previous, { id: Date.now() + 1, role: 'assistant', text: answer.respuesta, sources: answer.fuentes, links: answer.enlaces }])
    } catch (cause) {
      setQuestion(text)
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar la pregunta.')
    } finally { setLoading(false) }
  }

  async function openSource(id: string) {
    setSourceLoading(true)
    setError('')
    try { setSourceArticle(await chatbotApi.article(id, slug)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la fuente.') }
    finally { setSourceLoading(false) }
  }

  return <div className="chat-widget">
    {open && <section className="chat-panel" role="dialog" aria-label="Asistente RRHH">
      <header className="chat-header">
        <div className="chat-heading-icon"><Sparkles size={20} /></div>
        <div className="chat-heading-copy"><strong>Asistente RRHH</strong><small>Guías y respuestas de tu empresa</small></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente" title="Cerrar asistente"><X size={18} /></button>
      </header>
      {sourceArticle !== null && <button className="chat-back" type="button" onClick={() => setSourceArticle(null)}><ArrowLeft size={16} />Volver al chat</button>}
      <div className="chat-messages" aria-live="polite">
        {sourceArticle !== null ? <article className="chat-source"><h3>{sourceArticle.titulo}</h3><p>{sourceArticle.contenido}</p></article> : <>
        {messages.length === 0 && <div className="chat-welcome">
          <div className="chat-welcome-icon"><Sparkles size={23} /></div>
          <h3>¿En qué te ayudo hoy?</h3>
          <p>{slug ? 'Consulta vacantes y la información pública de esta empresa.' : 'Te guío por los procesos y la información de tu empresa.'}</p>
          {suggestions.length > 0 && <div className="chat-suggestions" aria-label="Preguntas sugeridas">
            {suggestions.slice(0, 6).map(item => <button key={item} type="button" disabled={loading} onClick={() => void send(item)}>{item}<ArrowUpRight size={13} /></button>)}
          </div>}
          <small>Evita compartir datos personales en el chat.</small>
        </div>}
        {messages.map(item => <div key={item.id} className={`chat-bubble ${item.role}`}>
          {item.role === 'assistant' && <span className="chat-message-label"><Sparkles size={12} /> Asistente</span>}
          <p>{item.text}</p>
          {item.sources && item.sources.length > 0 && <div className="chat-sources"><span>Basado en</span>{item.sources.map(source => <button key={source.id} type="button" onClick={() => void openSource(source.id)}><BookOpen size={13} />{source.titulo}</button>)}</div>}
          {item.links && item.links.length > 0 && <div className="chat-links">{item.links.map(link => <a key={link.ruta} href={link.ruta}>{link.titulo}<ArrowUpRight size={13} /></a>)}</div>}
        </div>)}
        {loading && <p className="chat-status"><span className="chat-typing" />Buscando una respuesta…</p>}
        {sourceLoading && <p className="chat-status">Abriendo fuente…</p>}
        {error && <p className="chat-error" role="alert">{error}</p>}
        {messages.length > 0 && suggestions.length > 0 && <div className="chat-suggestions chat-suggestions-followup" aria-label="Más preguntas sugeridas">
          {suggestions.slice(0, 4).map(item => <button key={item} type="button" disabled={loading} onClick={() => void send(item)}>{item}</button>)}
        </div>}
        <div ref={endRef} />
        </>}
      </div>
      {sourceArticle === null && <form className="chat-compose" onSubmit={event => { event.preventDefault(); void send() }}>
        <input ref={inputRef} aria-label="Pregunta para el asistente" placeholder="Pregúntame lo que necesitas…" value={question} maxLength={350} onChange={event => setQuestion(event.target.value)} />
        <button type="submit" disabled={question.trim().length < 3 || loading} aria-label="Enviar pregunta" title="Enviar pregunta"><Send size={18} /></button>
      </form>}
    </section>}
    <button className="chat-launcher" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} title={open ? 'Cerrar asistente' : 'Abrir asistente'}>
      {open ? <X size={22} /> : <MessageCircle size={22} />}
    </button>
  </div>
}
