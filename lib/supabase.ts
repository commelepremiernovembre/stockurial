import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Storage helpers ──────────────────────────────────────────────────────────

export async function uploadPhoto(
  base64: string,
  ficheId: string,
  champ: string
): Promise<string | null> {
  const mime = base64.split(';')[0].split(':')[1]
  const ext  = mime.split('/')[1] ?? 'jpg'
  const data = base64.split(',')[1]
  const buf  = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  const path = `${ficheId}/${champ}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('stockurial-photos')
    .upload(path, buf, { contentType: mime, upsert: true })

  if (error) { console.error('Upload error', error); return null }

  const { data: { publicUrl } } = supabase.storage
    .from('stockurial-photos')
    .getPublicUrl(path)

  return publicUrl
}

// ── Historique helper ────────────────────────────────────────────────────────

export async function logHistorique(
  ficheId: string,
  action: string,
  champ?: string,
  avant?: string,
  apres?: string
) {
  await supabase.from('historique').insert({
    fiche_id: ficheId,
    action,
    champ:  champ ?? null,
    avant:  avant ?? null,
    apres:  apres ?? null,
  })
}
