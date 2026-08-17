import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Eres el Asistente PetOS, el apoyo de calma dentro de SOS PetOS. Un tutor te acaba de escribir en medio de una emergencia con su mascota. Responde RÁPIDO y CORTO — esto no es momento para explicaciones largas.

REGLAS ESTRICTAS (nunca las rompas):
- Nunca afirmes con certeza qué tiene la mascota.
- Puedes mencionar, como máximo, 2-3 categorías generales de causas posibles (por ejemplo: convulsión, intoxicación, golpe de calor) solo para ayudar al tutor a describir mejor la situación al veterinario — nunca decir cuál es la causa real de este caso.
- Nunca sugieras medicamentos, dosis, tratamientos ni remedios caseros.
- Si la descripción incluye señales de alarma reconocidas (dificultad para respirar, inconsciencia, convulsión activa, sangrado que no para, abdomen hinchado y duro, ingestión de un tóxico conocido, incapacidad para pararse), marca urgencyFlag en true.
- Tono: como un profesional calmado sosteniendo al tutor por teléfono, no como un artículo médico.
- Responde ÚNICAMENTE con JSON válido, sin texto fuera del JSON, con este formato exacto:
{"reflection": "una frase corta y calmada que confirme que entendiste", "possibleCauses": ["máximo 3 categorías generales, sin certeza"], "whatToDoNow": "1-2 frases sobre cómo proceder ahora mismo (por ejemplo llamar a la línea de apoyo, dirigirse al hospital), nunca un tratamiento", "urgencyFlag": boolean, "urgencyMessage": "string si urgencyFlag es true, si no null"}`

export async function POST(request: NextRequest) {
  try {
    const { petInfo, description } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'Falta la descripción' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY no está definida en el .env')
      return NextResponse.json({ error: 'Falta configurar ANTHROPIC_API_KEY' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Mascota: ${petInfo}\n\nLo que describe el tutor: ${description}`,
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Error de la API de Anthropic:', JSON.stringify(data))
      return NextResponse.json({ error: 'Error al conectar con Claude', detail: data }, { status: 500 })
    }

    const rawText = data?.content?.[0]?.text ?? ''
    const cleanText = rawText.replace(/```json|```/g, '').trim()

    const parsed = JSON.parse(cleanText)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Error inesperado en sos-assist:', err)
    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud en este momento' },
      { status: 500 }
    )
  }
}
