import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { Alert, Button, PageHeader, Panel } from '../../../shared/components'
import { ayudaApi, type HelpAnswer, type HelpTopic } from '../api/ayudaApi'
import { KnowledgeManager } from '../components/KnowledgeManager'
import { useAccess } from '../../../app/access/AccessProvider'
import { useAuth } from '../../auth/hooks/useAuth'

export function AyudaPage() {
  const { can } = useAccess()
  const { user } = useAuth()
  const [topics, setTopics] = useState<HelpTopic[]>([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<HelpAnswer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ayudaApi.topics().then(items => { if (active) setTopics(items) })
      .catch(() => { if (active) setError('No se pudieron cargar las preguntas frecuentes.') })
    return () => { active = false }
  }, [])

  async function ask(value = question) {
    const text = value.trim()
    if (text.length < 3 || loading) return
    setQuestion(text)
    setLoading(true)
    setError('')
    setAnswer(null)
    try { setAnswer(await ayudaApi.ask(text)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo consultar la ayuda.') }
    finally { setLoading(false) }
  }

  async function explain(topic: HelpTopic) {
    if (loading) return
    setLoading(true)
    setError('')
    setAnswer(null)
    try { setAnswer(await ayudaApi.explain(topic.id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo explicar la guía.') }
    finally { setLoading(false) }
  }

  return <section className="page-stack">
    <PageHeader title="Ayuda" eyebrow="Cuenta" description="Consulta cómo usar las funciones disponibles para tu acceso." />
    <Alert tone="info">No incluyas contraseñas, CV ni datos personales. El asistente flotante consulta solo artículos publicados de esta empresa.</Alert>
    <Panel title="Preguntas frecuentes">
      <div className="help-topic-list">
        {topics.map(topic => <div className="help-topic-row" key={topic.id}>
          <Button variant="secondary" disabled={loading} onClick={() => void ask(topic.titulo)}>{topic.titulo}</Button>
          <Button variant="ghost" disabled={loading} onClick={() => void explain(topic)} title={`Explicar ${topic.titulo} con IA`} aria-label={`Explicar ${topic.titulo} con IA`}><Sparkles size={16} />Explicar con IA</Button>
        </div>)}
      </div>
    </Panel>
    <Panel title="Consultar">
      <form onSubmit={event => { event.preventDefault(); void ask() }}>
        <label htmlFor="ayuda-pregunta">Tu pregunta</label>
        <div className="row-actions help-question-row">
          <input id="ayuda-pregunta" value={question} maxLength={350} minLength={3} onChange={event => setQuestion(event.target.value)} placeholder="Por ejemplo: ¿cómo importo departamentos?" />
          <Button type="submit" disabled={question.trim().length < 3 || loading} loading={loading}><Send size={16} />Preguntar</Button>
        </div>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {answer && <div aria-live="polite">
        {answer.aviso && <Alert tone="info">{answer.aviso}</Alert>}
        <p>{answer.modo === 'ia' ? 'Respuesta asistida por IA' : 'Guía local'}</p>
        <p>{answer.respuesta}</p>
        {answer.fuentes.map(source => <Link key={source.ruta} to={source.ruta}>{source.titulo}</Link>)}
      </div>}
    </Panel>
    {user?.realm === 'tenant' && can('roles:gestionar') && <KnowledgeManager />}
  </section>
}
