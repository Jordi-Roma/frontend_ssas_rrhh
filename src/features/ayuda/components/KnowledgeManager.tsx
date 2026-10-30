import { useEffect, useState } from 'react'
import { Alert, Button, Panel } from '../../../shared/components'
import { chatbotApi, type ArticleInput, type KnowledgeArticle } from '../api/chatbotApi'

const empty: ArticleInput = { titulo: '', contenido: '', categoria: 'General', publico: false, publicado: false }

export function KnowledgeManager() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleInput>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reload() {
    try { setArticles(await chatbotApi.articles()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los artículos.') }
  }
  useEffect(() => { void reload() }, [])

  function edit(item: KnowledgeArticle) {
    setSelected(item.id)
    setForm({ titulo: item.titulo, contenido: item.contenido, categoria: item.categoria, publico: item.publico, publicado: item.publicado })
    setError('')
  }

  async function save() {
    setBusy(true); setError(''); setNotice('')
    try {
      const saved = selected ? await chatbotApi.update(selected, form) : await chatbotApi.create(form)
      setSelected(saved.id)
      setNotice('Artículo guardado.')
      await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el artículo.') }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!selected || !window.confirm('¿Eliminar este artículo?')) return
    setBusy(true); setError(''); setNotice('')
    try { await chatbotApi.remove(selected); setSelected(null); setForm(empty); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el artículo.') }
    finally { setBusy(false) }
  }

  return <Panel title="Base de conocimiento">
    <div className="form-stack">
      <div className="row-actions">
        <select aria-label="Seleccionar artículo" value={selected ?? ''} onChange={event => {
          const item = articles.find(article => article.id === event.target.value)
          if (item) edit(item)
          else { setSelected(null); setForm(empty) }
        }}>
          <option value="">Nuevo artículo</option>
          {articles.map(item => <option value={item.id} key={item.id}>{item.titulo}{item.publicado ? ' · Publicado' : ' · Borrador'}</option>)}
        </select>
        <Button variant="secondary" onClick={() => { setSelected(null); setForm(empty) }}>Nuevo</Button>
      </div>
      <label>Título<input value={form.titulo} maxLength={160} onChange={event => setForm({ ...form, titulo: event.target.value })} /></label>
      <label>Categoría<input value={form.categoria} maxLength={80} onChange={event => setForm({ ...form, categoria: event.target.value })} /></label>
      <label>Contenido<textarea value={form.contenido} rows={8} maxLength={12000} onChange={event => setForm({ ...form, contenido: event.target.value })} /></label>
      <label><input type="checkbox" checked={form.publico} onChange={event => setForm({ ...form, publico: event.target.checked })} /> Visible en el portal público</label>
      <label><input type="checkbox" checked={form.publicado} onChange={event => setForm({ ...form, publicado: event.target.checked })} /> Publicado</label>
      <div className="row-actions">
        <Button disabled={busy || form.titulo.trim().length < 3 || form.contenido.trim().length < 15} onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar'}</Button>
        {selected && <Button variant="secondary" disabled={busy} onClick={() => void remove()}>Eliminar</Button>}
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  </Panel>
}
