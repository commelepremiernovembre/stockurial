import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { task, base64, mime } = body

    let system = ''
    let userText = ''

    if (task === 'ocr_lot') {
      system = `Tu es un lecteur OCR spécialisé dans les étiquettes manuscrites de la maison de ventes Artcurial (Paris).
Les étiquettes contiennent un numéro de lot principal au format : chiffres + séparateur (| ou /) + chiffres. Exemple : "26115362/001" ou "26115148|002".
Il peut aussi y avoir d'autres annotations manuscrites comme "3/3", "x2", "x3", des lettres isolées — IGNORE-LES complètement.
Réponds UNIQUEMENT avec le numéro de lot principal, rien d'autre.`
      userText = 'Lis le numéro de lot manuscrit sur cette étiquette Artcurial.'
    }

    else if (task === 'ocr_depot') {
      system = `Tu es un lecteur OCR spécialisé dans les bons de dépôt manuscrits de la maison de ventes Artcurial.
Lis le numéro de dépôt sur ce document. Il peut être sous forme de chiffres seuls ou avec des séparateurs.
Réponds UNIQUEMENT avec le numéro de dépôt, rien d'autre.`
      userText = 'Lis le numéro de dépôt sur ce bon.'
    }

    else if (task === 'ocr_rack') {
      system = `Tu es un lecteur OCR. Lis le numéro ou code du rack/emplacement visible sur cette photo.
Réponds UNIQUEMENT avec le numéro ou code du rack, rien d'autre.`
      userText = 'Lis le numéro de rack sur cette photo.'
    }

    else if (task === 'description') {
      system = `Assistant de stockage Artcurial Paris. Réponds UNIQUEMENT par : nature + matériau + couleur, 3-6 mots, pas d'article, pas de ponctuation finale.
Exemples : "vase céramique bleu émaillé" / "fauteuil cuir brun" / "tableau huile marine" / "pendule bronze doré XIXe".`
      userText = 'Décris cet objet.'
    }

    else if (task === 'recherche_visuelle') {
      system = `Tu es un assistant de recherche pour un stock de maison de ventes aux enchères.
On te donne une photo d'un objet à rechercher et une liste de descriptions d'objets en stock.
Réponds avec les descriptions les plus proches, dans l'ordre de similarité, séparées par des virgules.
Si aucune ne correspond, réponds "aucun".`
      const { descriptions } = body
      userText = `Voici les descriptions en stock :\n${descriptions.join('\n')}\n\nTrouve les plus proches de l'objet sur la photo.`
    }

    else {
      return NextResponse.json({ error: 'Tâche inconnue' }, { status: 400 })
    }

    const content: Anthropic.MessageParam['content'] = task === 'recherche_visuelle'
      ? [
          { type: 'image', source: { type: 'base64', media_type: (mime ?? 'image/jpeg') as 'image/jpeg', data: base64 } },
          { type: 'text', text: userText }
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: (mime ?? 'image/jpeg') as 'image/jpeg', data: base64 } },
          { type: 'text', text: userText }
        ]

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return NextResponse.json({ result: text })

  } catch (err: any) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
