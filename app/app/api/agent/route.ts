import { NextRequest, NextResponse } from 'next/server'
import { DEMO_PETS } from '@/lib/pets'

// ─── Estado del refugio (en producción: leer de Solana on-chain + DB) ────────

interface Pet {
  id: string; nombre: string; vivo: boolean; sano: boolean
  esterilizado: boolean; viejo: boolean; enfermo: boolean
  adoptado: boolean; mucho_tiempo_sin_adopcion: boolean
}

interface Donacion { fecha: string; donante: string; wallet: string; sol: number; motivo: string }
interface Gasto { fecha: string; categoria: string; descripcion: string; sol: number }
interface InventarioItem { cantidad: number; minimo: number; unidad: string; costo_sol_por_unidad: number }

// Mascotas on-chain (espejo del programa Anchor en devnet)
const mascotas: Pet[] = [
  { id: 'enola',  nombre: 'Enola',  vivo: true,  sano: true,  esterilizado: true,  viejo: false, enfermo: false, adoptado: false, mucho_tiempo_sin_adopcion: false },
  { id: 'gidbey', nombre: 'Gidbey', vivo: true,  sano: true,  esterilizado: false, viejo: false, enfermo: false, adoptado: false, mucho_tiempo_sin_adopcion: false },
  { id: 'lory',   nombre: 'Lory',   vivo: true,  sano: true,  esterilizado: true,  viejo: false, enfermo: false, adoptado: false, mucho_tiempo_sin_adopcion: false },
  { id: 'tasha',  nombre: 'Tasha',  vivo: true,  sano: true,  esterilizado: true,  viejo: false, enfermo: false, adoptado: false, mucho_tiempo_sin_adopcion: true  },
  { id: 'hilary', nombre: 'Hilary', vivo: true,  sano: false, esterilizado: false, viejo: true,  enfermo: true,  adoptado: false, mucho_tiempo_sin_adopcion: true  },
]

let inventario: Record<string, InventarioItem> = {
  croquetas:    { cantidad: 5,  minimo: 3,  unidad: 'kg',       costo_sol_por_unidad: 0.01 },
  medicamentos: { cantidad: 8,  minimo: 5,  unidad: 'unidades', costo_sol_por_unidad: 0.02 },
  juguetes:     { cantidad: 6,  minimo: 4,  unidad: 'unidades', costo_sol_por_unidad: 0.005 },
  vacunas:      { cantidad: 3,  minimo: 2,  unidad: 'dosis',    costo_sol_por_unidad: 0.03 },
  desparasitante:{ cantidad: 4, minimo: 2,  unidad: 'dosis',    costo_sol_por_unidad: 0.015 },
}

const donaciones: Donacion[] = [
  { fecha: '2026-03-20T10:00:00Z', donante: 'Anónimo', wallet: '7xKp...AbC1', sol: 0.01, motivo: 'Adopción Enola' },
  { fecha: '2026-03-21T14:30:00Z', donante: 'Anónimo', wallet: '9mRt...Xy5Z', sol: 0.01, motivo: 'Adopción Gidbey' },
]

const gastos: Gasto[] = [
  { fecha: '2026-03-20T09:00:00Z', categoria: 'croquetas',    descripcion: 'Croquetas mensual 10kg', sol: 0.1  },
  { fecha: '2026-03-21T11:00:00Z', categoria: 'medicamentos', descripcion: 'Medicamentos Hilary',   sol: 0.04 },
]

// ─── Funciones del agente ─────────────────────────────────────────────────────

function calcularEstadisticas() {
  const vivos              = mascotas.filter(m => m.vivo)
  const finados            = mascotas.filter(m => !m.vivo)
  const enfermos           = vivos.filter(m => m.enfermo)
  const sanos              = vivos.filter(m => m.sano && !m.enfermo)
  const jovenes            = vivos.filter(m => !m.viejo)
  const viejitos           = vivos.filter(m => m.viejo)
  const esterilizados      = vivos.filter(m => m.esterilizado)
  const sinEsterilizar     = vivos.filter(m => !m.esterilizado)
  const adoptados          = mascotas.filter(m => m.adoptado)
  const disponibles        = vivos.filter(m => !m.adoptado)
  const sinAdopcionMucho   = vivos.filter(m => m.mucho_tiempo_sin_adopcion && !m.adoptado)

  return { vivos: vivos.length, finados: finados.length, enfermos: enfermos.length,
    sanos: sanos.length, jovenes: jovenes.length, viejitos: viejitos.length,
    esterilizados: esterilizados.length, sinEsterilizar: sinEsterilizar.length,
    adoptados: adoptados.length, disponibles: disponibles.length,
    sinAdopcionMucho: sinAdopcionMucho.length,
    necesitan_atencion: [...enfermos, ...sinEsterilizar.filter(m => m.viejo)].map(m => m.nombre),
  }
}

function calcularFinanzas() {
  const total_donado = donaciones.reduce((s, d) => s + d.sol, 0)
  const total_gastado = gastos.reduce((s, g) => s + g.sol, 0)
  const balance = total_donado - total_gastado
  const costo_inventario_minimo = Object.values(inventario).reduce(
    (s, item) => s + (item.minimo * item.costo_sol_por_unidad), 0
  )
  return {
    total_donado: +total_donado.toFixed(4),
    total_gastado: +total_gastado.toFixed(4),
    balance_sol: +balance.toFixed(4),
    costo_reabastecer_minimos: +costo_inventario_minimo.toFixed(4),
    alcanza_para_reabastecer: balance >= costo_inventario_minimo,
    donantes_unicos: new Set(donaciones.map(d => d.wallet)).size,
  }
}

function calcularAlertas() {
  const alertas = []
  const stats = calcularEstadisticas()

  // Alertas de inventario
  for (const [nombre, item] of Object.entries(inventario)) {
    if (item.cantidad <= item.minimo) {
      alertas.push({
        tipo: 'STOCK_BAJO', prioridad: 'ALTA',
        mensaje: `${nombre}: ${item.cantidad} ${item.unidad} (mínimo: ${item.minimo})`,
        accion: `Comprar ${item.minimo * 2} ${item.unidad} de ${nombre} — costo aprox ${(item.minimo * 2 * item.costo_sol_por_unidad).toFixed(3)} SOL`,
        responsable_humano: true,
      })
    }
  }
  // Alertas de mascotas
  if (stats.enfermos > 0) {
    alertas.push({ tipo: 'MASCOTAS_ENFERMAS', prioridad: 'ALTA',
      mensaje: `${stats.enfermos} mascota(s) enferma(s): ${calcularEstadisticas().necesitan_atencion.join(', ')}`,
      accion: 'Revisar medicamentos. Visita veterinaria requerida.', responsable_humano: true })
  }
  if (stats.sinEsterilizar > 0) {
    alertas.push({ tipo: 'PENDIENTE_ESTERILIZACION', prioridad: 'MEDIA',
      mensaje: `${stats.sinEsterilizar} mascota(s) sin esterilizar`,
      accion: 'Agendar cita veterinaria para esterilización', responsable_humano: true })
  }
  if (stats.sinAdopcionMucho > 0) {
    alertas.push({ tipo: 'SIN_ADOPCION_MUCHO_TIEMPO', prioridad: 'MEDIA',
      mensaje: `${stats.sinAdopcionMucho} mascota(s) llevan mucho tiempo sin adoptarse`,
      accion: 'Compartir Blink de adopción en redes sociales', responsable_humano: false })
  }
  return alertas
}

 
// ─── CONEXIÓN GEMMA 4 GOOGLE ─────────────────────

async function consultarGemma(mensaje: string) {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('Falta GOOGLE_API_KEY en .env.local')
  }

  const contexto = {
    mascotas: calcularEstadisticas(),
    lista_mascotas: mascotas,
    inventario,
    finanzas: calcularFinanzas(),
    alertas: calcularAlertas(),
    donaciones,
    gastos,
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `
Eres el agente de inteligencia artificial de Refugio Animal Solana.

Analiza los datos del refugio y ayuda a administrar:
- Mascotas y adopciones.
- Enfermedades y atención veterinaria.
- Inventario y alimentos.
- Donaciones y gastos.
- Alertas y prioridades.

Nunca inventes información ni tomes decisiones veterinarias.

DATOS DEL REFUGIO:
${JSON.stringify(contexto, null, 2)}

CONSULTA:
${mensaje}

Responde en español, con claridad y recomendaciones concretas.
`
          }]
        }]
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Error Google API: ${await response.text()}`)
  }

  const data = await response.json()

  return data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('') || 'Sin respuesta de Gemma 4.'
}

 // ─── Endpoints ────────────────────────────────────────────────────────────────

export async function GET() {
  const stats = calcularEstadisticas()
  const finanzas = calcularFinanzas()
  const alertas = calcularAlertas()

  return NextResponse.json({
    agente: 'Refugio Animal Solana — Sistema de Gestión Autónoma v1.0',
    programa_id: '56XMjeUnV1vDsEwuCVZMv5g9NNBjXxkZTfH3DyvCs351',
    red: 'devnet',
    consultado_en: new Date().toISOString(),

    estado_general: alertas.filter(a => a.prioridad === 'ALTA').length > 0
      ? '🔴 REQUIERE_ATENCION_URGENTE'
      : alertas.length > 0 ? '🟡 HAY_ALERTAS' : '🟢 TODO_OK',

    mascotas: {
      ...stats,
      lista_completa: mascotas.map(m => ({
        nombre: m.nombre,
        estado: m.vivo ? (m.adoptado ? '✅ adoptado' : m.enfermo ? '🔴 enfermo' : '🟢 disponible') : '⚫ finado',
        esterilizado: m.esterilizado ? 'sí' : 'pendiente',
        edad: m.viejo ? 'adulto mayor' : 'joven',
        blink_adopcion: m.adoptado ? null : `/api/actions/adopt?pet=${m.id}`,
      }))
    },

    inventario: Object.entries(inventario).reduce((acc, [nombre, item]) => {
      acc[nombre] = {
        ...item,
        estado: item.cantidad <= item.minimo ? '⚠️ BAJO' : '✅ OK',
      }
      return acc
    }, {} as Record<string, unknown>),

    finanzas,
    donaciones: {
      total: donaciones.length,
      historial: donaciones,
    },
    gastos: {
      total: gastos.length,
      historial: gastos,
    },

    alertas,
    acciones_autonomas_del_agente: [
      'Monitorear inventario cada hora',
      'Registrar donaciones on-chain via Blinks',
      'Detectar mascotas enfermas y alertar',
      'Generar reporte financiero automático',
      'Compartir Blinks de mascotas sin adopción',
    ],
    requiere_intervencion_humana: [
      'Surtir croquetas y medicamentos físicamente',
      'Llevar mascotas al veterinario',
      'Esterilizaciones programadas',
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    const {
      accion, item, cantidad, donante,
      wallet, sol, motivo, mensaje
    } = await req.json()

    // CONSULTA REAL A GEMMA 4
    if (typeof mensaje === 'string' && mensaje.trim()) {
      const respuesta = await consultarGemma(mensaje)

      return NextResponse.json({
        exito: true,
        modelo: 'gemma-4-26b-a4b-it',
        respuesta
      })
    }

    if (accion === 'registrar_donacion') {
      donaciones.push({
        fecha: new Date().toISOString(),
        donante: donante || 'Anónimo',
        wallet: wallet || 'desconocida',
        sol: sol || 0.01,
        motivo: motivo || 'Donación general'
      })

      return NextResponse.json({
        exito: true,
        finanzas: calcularFinanzas()
      })
    }

    if (accion === 'reabastecer') {
      if (!inventario[item]) {
        return NextResponse.json(
          { error: 'Item desconocido' },
          { status: 400 }
        )
      }

      const costo = cantidad * inventario[item].costo_sol_por_unidad
      inventario[item].cantidad += cantidad

      gastos.push({
        fecha: new Date().toISOString(),
        categoria: item,
        descripcion: `Reabastecimiento: ${cantidad} ${item}`,
        sol: costo
      })

      return NextResponse.json({
        exito: true,
        inventario_actualizado: inventario[item]
      })
    }

    if (accion === 'marcar_adoptado') {
      const mascota = mascotas.find(m => m.id === item)

      if (!mascota) {
        return NextResponse.json(
          { error: 'Mascota no encontrada' },
          { status: 404 }
        )
      }

      mascota.adoptado = true

      return NextResponse.json({
        exito: true,
        mensaje: `${mascota.nombre} marcada como adoptada`
      })
    }

    return NextResponse.json(
      { error: 'Acción desconocida o mensaje vacío' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error en agente:', error)

    return NextResponse.json({
      error: error instanceof Error
        ? error.message
        : 'Error procesando solicitud'
    }, { status: 500 })
  }
}