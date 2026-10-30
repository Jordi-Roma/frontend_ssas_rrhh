import { useEffect, useState } from 'react'
import { Check, CreditCard, Crown, ExternalLink } from 'lucide-react'
import { Alert, Badge, Button, PageHeader, Panel } from '../../../shared/components'
import { suscripcionesApi, type Consumption, type Plan, type Subscription } from '../api/suscripcionesApi'

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) { const percent = Math.min(100, Math.round((used / limit) * 100)); return <div className="usage-row"><div><strong>{label}</strong><span>{used} de {limit}</span></div><progress max="100" value={percent}>{percent}%</progress></div> }

type Tier = 'basic' | 'pro' | 'premium'
const TIER_TAG: Record<Tier, string | null> = { basic: null, pro: 'Recomendado', premium: 'Premium' }
const sortByPrice = (plans: Plan[]) => [...plans].sort((a, b) => Number(a.precio_mensual) - Number(b.precio_mensual))
/** El plan más barato es el básico y el más caro el premium; los intermedios son profesionales. */
const tierOf = (index: number, total: number): Tier => index === 0 && total > 1 ? 'basic' : index === total - 1 && total > 1 ? 'premium' : 'pro'
const storage = (mb: number) => mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${mb} MB`

function PlanCard({ plan, tier, current, busy, onChoose }: { plan: Plan; tier: Tier; current: boolean; busy: boolean; onChoose: () => void }) {
  const price = Number(plan.precio_mensual)
  const tag = current ? 'Tu plan' : TIER_TAG[tier]
  return <article className={`plan-card plan-card-${tier}${current ? ' plan-card-current' : ''}`}>
    {tag && <span className="plan-tag">{tier === 'premium' && !current && <Crown size={12} aria-hidden="true" />}{tag}</span>}
    <h3>{plan.nombre}</h3>
    <p>{plan.descripcion ?? 'Lo esencial para empezar a gestionar tu reclutamiento.'}</p>
    <div className="plan-price"><strong>{price === 0 ? 'Gratis' : price.toFixed(2)}</strong>{price > 0 && <span>{plan.moneda} / mes</span>}</div>
    <ul className="plan-features">
      <li><Check size={16} aria-hidden="true" />{plan.max_usuarios} usuarios</li>
      <li><Check size={16} aria-hidden="true" />{plan.max_vacantes_activas} vacantes activas</li>
      <li><Check size={16} aria-hidden="true" />{storage(plan.max_almacenamiento_mb)} de almacenamiento</li>
      {plan.modulos.length > 0 && <li><Check size={16} aria-hidden="true" />{plan.modulos.length} módulos incluidos</li>}
    </ul>
    <Button disabled={current} loading={busy} onClick={onChoose}><CreditCard size={16} />{current ? 'Plan actual' : 'Elegir plan'}</Button>
  </article>
}

export function MiSuscripcionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null); const [usage, setUsage] = useState<Consumption | null>(null); const [plans, setPlans] = useState<Plan[]>([]); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  useEffect(() => { Promise.all([suscripcionesApi.current(), suscripcionesApi.consumption(), suscripcionesApi.plans()]).then(([s, u, p]) => { setSubscription(s); setUsage(u); setPlans(p) }).catch((e: Error) => setMessage(e.message)) }, [])
  async function redirect(action: () => Promise<{ url: string }>) { setBusy(true); try { const result = await action(); window.location.assign(result.url) } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo abrir Stripe.') } finally { setBusy(false) } }
  return <section className="page-stack"><PageHeader eyebrow="Facturación" title="Mi suscripción" description="Consulta el plan, su vigencia y el consumo actual de tu empresa." />{message && <Alert tone="error">{message}</Alert>}{subscription && <><Panel title={subscription.plan.nombre} count={<Badge tone={subscription.estado === 'ACTIVA' ? 'success' : 'warning'}>{subscription.estado}</Badge>}><div className="subscription-summary"><div><span>Precio mensual</span><strong>{subscription.plan.precio_mensual} {subscription.plan.moneda}</strong></div><div><span>Próximo cobro</span><strong>{subscription.fecha_proximo_cobro ? new Date(subscription.fecha_proximo_cobro).toLocaleDateString('es-BO') : 'Sin programar'}</strong></div><div><span>Módulos</span><strong>{subscription.plan.modulos.length}</strong></div></div><Button variant="secondary" loading={busy} disabled={!subscription.stripe_customer_id} onClick={() => void redirect(suscripcionesApi.portal)}><ExternalLink size={16} />Administrar pago</Button></Panel>{usage && <Panel title="Consumo del plan"><div className="usage-list"><Usage label="Usuarios activos" used={usage.usuarios.usado} limit={usage.usuarios.limite} /><Usage label="Vacantes activas" used={usage.vacantes_activas.usado} limit={usage.vacantes_activas.limite} /><Usage label="Almacenamiento MB" used={usage.almacenamiento_mb.usado} limit={usage.almacenamiento_mb.limite} /></div></Panel>}<Panel title="Planes disponibles"><div className="plan-grid">{sortByPrice(plans).map((plan, index, sorted) => <PlanCard key={plan.id} plan={plan} tier={tierOf(index, sorted.length)} current={plan.id === subscription.plan.id} busy={busy} onChoose={() => void redirect(() => suscripcionesApi.checkout(plan.id))} />)}</div></Panel></>}</section>
}
