import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react'
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
        <div><strong>Asistente RRHH</strong><small>Ayuda de la empresa</small></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente" title="Cerrar asistente"><X size={18} /></button>
      </header>
      {sourceArticle !== null && <button className="chat-back" type="button" onClick={() => setSourceArticle(null)}><ArrowLeft size={16} />Volver al chat</button>}
      {sourceArticle === null && suggestions.length > 0 && <div className="chat-suggestions" aria-label="Preguntas sugeridas">
        {suggestions.map(item => <button key={item} type="button" disabled={loading} onClick={() => void send(item)}>{item}</button>)}
      </div>}
      <div className="chat-messages" aria-live="polite">
        {sourceArticle !== null ? <article className="chat-source"><h3>{sourceArticle.titulo}</h3><p>{sourceArticle.contenido}</p></article> : <>
        {messages.length === 0 && <p className="chat-bubble assistant">Hola. Pregúntame sobre la información publicada por esta empresa. No compartas datos personales.</p>}
        {messages.map(item => <div key={item.id} className={`chat-bubble ${item.role}`}>
          <p>{item.text}</p>
          {item.sources && item.sources.length > 0 && <div className="chat-sources">Fuentes: {item.sources.map(source => <button key={source.id} type="button" onClick={() => void openSource(source.id)}>{source.titulo}</button>)}</div>}
          {item.links && item.links.length > 0 && <div className="chat-links">{item.links.map(link => <a key={link.ruta} href={link.ruta}>{link.titulo}</a>)}</div>}
        </div>)}
        {loading && <p className="chat-status">Consultando…</p>}
        {sourceLoading && <p className="chat-status">Abriendo fuente…</p>}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div ref={endRef} />
        </>}
      </div>
      {sourceArticle === null && <form className="chat-compose" onSubmit={event => { event.preventDefault(); void send() }}>
        <input ref={inputRef} aria-label="Pregunta para el asistente" placeholder="Escribe tu pregunta" value={question} maxLength={350} onChange={event => setQuestion(event.target.value)} />
        <button type="submit" disabled={question.trim().length < 3 || loading} aria-label="Enviar pregunta" title="Enviar pregunta"><Send size={18} /></button>
      </form>}
    </section>}
    <button className="chat-launcher" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} title={open ? 'Cerrar asistente' : 'Abrir asistente'}>
      {open ? <X size={22} /> : <MessageCircle size={22} />}
    </button>
  </div>
}
