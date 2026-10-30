import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

/**
 * El fallo que estas pruebas impiden repetir: el efecto del diálogo dependía de
 * `onClose`, que llega como función anónima y por tanto cambia de identidad en cada
 * render. Cada tecla provocaba un render, el efecto se limpiaba y se volvía a
 * ejecutar, y el foco saltaba al primer campo. Resultado: solo se podía escribir
 * un carácter por campo en TODOS los formularios en ventana modal del producto.
 */

/** Formulario mínimo con el patrón real de la aplicación: estado controlado en el
 *  padre y `onClose` como función anónima creada en cada render. */
function FormularioEnModal({ onClose = () => {} }: { onClose?: () => void }) {
  const [nombre, setNombre] = useState('')
  const [clave, setClave] = useState('')
  return (
    <Modal title="Nuevo usuario" onClose={() => onClose()}>
      <label>
        Nombre
        <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
      </label>
      <label>
        Contraseña
        <input value={clave} onChange={(evento) => setClave(evento.target.value)} />
      </label>
    </Modal>
  )
}

describe('Modal', () => {
  it('Escape y Tab actuan solo en el dialogo superior de una evaluacion anidada', async () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    function Nested() {
      const [inner, setInner] = useState(false)
      return <Modal title="Candidato" onClose={outerClose}>
        <button onClick={() => setInner(true)}>Registrar evaluacion</button>
        {inner && <Modal title="Evaluacion" onClose={() => { innerClose(); setInner(false) }}>
          <button>Guardar evaluacion</button>
        </Modal>}
      </Modal>
    }
    const usuario = userEvent.setup()
    render(<Nested />)
    await usuario.click(screen.getByRole('button', { name: 'Registrar evaluacion' }))
    const inner = screen.getByRole('dialog', { name: 'Evaluacion' })
    await usuario.click(within(inner).getByRole('button', { name: 'Guardar evaluacion' }))
    await usuario.tab()
    expect(within(inner).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await usuario.keyboard('{Escape}')
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Candidato' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar evaluacion' })).toHaveFocus()
  })
  it('permite escribir un texto completo sin perder el foco', async () => {
    const usuario = userEvent.setup()
    render(<FormularioEnModal />)

    const nombre = screen.getByLabelText('Nombre')
    await usuario.click(nombre)
    await usuario.keyboard('Ana Pérez')

    // Si el foco saltara en cada tecla, solo quedaría el primer carácter.
    expect(nombre).toHaveValue('Ana Pérez')
    expect(nombre).toHaveFocus()
  })

  it('mantiene el foco en el segundo campo mientras se escribe', async () => {
    const usuario = userEvent.setup()
    render(<FormularioEnModal />)

    const clave = screen.getByLabelText('Contraseña')
    await usuario.click(clave)
    await usuario.keyboard('Clave.Segura.2026')

    expect(clave).toHaveValue('Clave.Segura.2026')
    expect(clave).toHaveFocus()
  })

  it('lleva el foco al primer control al abrirse', () => {
    render(<FormularioEnModal />)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
  })

  it('cierra con la tecla Escape', async () => {
    const usuario = userEvent.setup()
    const onClose = vi.fn()
    render(<FormularioEnModal onClose={onClose} />)

    await usuario.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('marca el diálogo, y no el fondo, con los atributos de accesibilidad', () => {
    render(<FormularioEnModal />)
    const dialogo = screen.getByRole('dialog')

    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveClass('modal')
    expect(dialogo.parentElement).toHaveClass('modal-backdrop')
    expect(dialogo).toHaveAccessibleName('Nuevo usuario')
  })

  it('devuelve el foco al elemento que lo abrió al cerrarse', async () => {
    function Anfitrion() {
      const [abierto, setAbierto] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setAbierto(true)}>
            Nuevo usuario
          </button>
          {abierto && <FormularioEnModal onClose={() => setAbierto(false)} />}
        </>
      )
    }

    const usuario = userEvent.setup()
    render(<Anfitrion />)
    const abrir = screen.getByRole('button', { name: 'Nuevo usuario' })
    await usuario.click(abrir)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })
})
