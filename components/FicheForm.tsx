'use client'
import { useState, useEffect, useCallback } from 'react'
import { Fiche, Statut, STATUTS } from '@/lib/types'
import { supabase, uploadPhoto, logHistorique } from '@/lib/supabase'
import { PhotoZone } from './PhotoZone'
import { StatusBadge, StatusSelect } from './StatusBadge'

interface Props {
  fiche?: Fiche | null
  onSave: (f: Fiche) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

type OcrField = 'numero_depot' | 'numero_lot' | 'numero_rack'
type PhotoField = 'photo_depot' | 'photo_etiq' | 'photo_objet' | 'photo_rack' | 'photo_range'

async function callClaude(task: string, base64: string, extra?: object): Promise<string> {
  const data = base64.split(',')[1]
  const mime = base64.split(';')[0].split(':')[1]
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, base64: data, mime, ...extra }),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error)
  return j.result ?? ''
}

const SECTIONS = [
  {
    key: 'depot',
    title: 'Bon de dépôt',
    emoji: '📋',
    photoField: 'photo_depot' as PhotoField,
    ocrField:   'numero_depot' as OcrField,
    ocrTask:    'ocr_depot',
    ocrLabel:   'N° de dépôt reconnu',
  },
  {
    key: 'lot',
    title: 'Étiquette lot',
    emoji: '🏷',
    photoField: 'photo_etiq' as PhotoField,
    ocrField:   'numero_lot' as OcrField,
    ocrTask:    'ocr_lot',
    ocrLabel:   'N° de lot reconnu',
  },
  {
    key: 'objet',
    title: 'Photo objet',
    emoji: '📦',
    photoField: 'photo_objet' as PhotoField,
    ocrField:   null,
    ocrTask:    null,
    ocrLabel:   null,
  },
  {
    key: 'rack',
    title: 'Numéro de rack',
    emoji: '🗄',
    photoField: 'photo_rack' as PhotoField,
    ocrField:   'numero_rack' as OcrField,
    ocrTask:    'ocr_rack',
    ocrLabel:   'N° de rack reconnu',
  },
  {
    key: 'range',
    title: 'Objet rangé',
    emoji: '✅',
    photoField: 'photo_range' as PhotoField,
    ocrField:   null,
    ocrTask:    null,
    ocrLabel:   null,
  },
]

export function FicheForm({ fiche, onSave, onDelete, onClose }: Props) {
  const isNew = !fiche

  // Local photo state (base64 preview — pas encore uploadé)
  const [photos, setPhotos] = useState<Record<PhotoField, string | null>>({
    photo_depot:  fiche?.photo_depot  ?? null,
    photo_etiq:   fiche?.photo_etiq   ?? null,
    photo_objet:  fiche?.photo_objet  ?? null,
    photo_rack:   fiche?.photo_rack   ?? null,
    photo_range:  fiche?.photo_range  ?? null,
  })

  const [form, setForm] = useState({
    statut:       (fiche?.statut ?? 'receptionne') as Statut,
    numero_depot: fiche?.numero_depot ?? '',
    numero_lot:   fiche?.numero_lot   ?? '',
    numero_rack:  fiche?.numero_rack  ?? '',
    description:  fiche?.description  ?? '',
    notes:        fiche?.notes        ?? '',
  })

  const [ocr, setOcr]         = useState<Record<string, boolean>>({})
  const [desc, setDesc]       = useState<boolean>(false)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [lb, setLb]           = useState<string|null>(null)

  function showToast(msg: string, type: 'ok'|'err' = 'ok') {
    setToast({msg,type})
    setTimeout(() => setToast(null), 2800)
  }

  // ── Photo change → OCR / description auto ──────────────────────────────────
  async function handlePhoto(field: PhotoField, b64: string) {
    setPhotos(p => ({ ...p, [field]: b64 }))

    const section = SECTIONS.find(s => s.photoField === field)

    // OCR
    if (section?.ocrTask && section.ocrField) {
      setOcr(o => ({ ...o, [field]: true }))
      try {
        const result = await callClaude(section.ocrTask, b64)
        setForm(f => ({ ...f, [section.ocrField!]: result }))
      } catch { /* laisse le champ vide */ }
      finally { setOcr(o => ({ ...o, [field]: false })) }
    }

    // Description objet
    if (field === 'photo_objet') {
      setDesc(true)
      try {
        const result = await callClaude('description', b64)
        setForm(f => ({ ...f, description: result }))
      } catch {}
      finally { setDesc(false) }
    }
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const ficheId = fiche?.id ?? crypto.randomUUID()
      const updates: Partial<Fiche> = {
        statut:       form.statut,
        numero_depot: form.numero_depot || null,
        numero_lot:   form.numero_lot   || null,
        numero_rack:  form.numero_rack  || null,
        description:  form.description  || null,
        notes:        form.notes        || null,
      }

      // Upload photos nouvelles (base64 → URL)
      for (const [field, b64] of Object.entries(photos) as [PhotoField, string|null][]) {
        if (!b64) continue
        if (b64.startsWith('http')) {
          // déjà une URL Supabase, pas besoin de ré-uploader
          (updates as any)[field] = b64
          continue
        }
        const url = await uploadPhoto(b64, ficheId, field)
        if (url) (updates as any)[field] = url
      }

      // Date dépôt auto à la création
      if (isNew) updates.date_depot = new Date().toISOString()

      let saved: Fiche

      if (isNew) {
        const { data, error } = await supabase
          .from('fiches')
          .insert({ id: ficheId, ...updates })
          .select()
          .single()
        if (error) throw error
        saved = data
        await logHistorique(ficheId, 'creation')
      } else {
        // Log les changements
        const changed = Object.entries(updates).filter(
          ([k, v]) => (fiche as any)[k] !== v
        )
        const { data, error } = await supabase
          .from('fiches')
          .update(updates)
          .eq('id', fiche!.id)
          .select()
          .single()
        if (error) throw error
        saved = data
        for (const [champ, apres] of changed) {
          await logHistorique(
            fiche!.id, 'modification', champ,
            String((fiche as any)[champ] ?? ''),
            String(apres ?? '')
          )
        }
      }

      // Si "sorti" → archiver automatiquement
      if (form.statut === 'sorti') {
        await supabase.from('fiches').update({ archived: true }).eq('id', saved.id)
        await logHistorique(saved.id, 'archivage', 'archived', 'false', 'true')
        saved.archived = true
      }

      // Si "annulé" → supprimer définitivement
      if (form.statut === 'annule') {
        await logHistorique(saved.id, 'suppression')
        await supabase.from('historique').delete().eq('fiche_id', saved.id)
        await supabase.from('fiches').delete().eq('id', saved.id)
        onDelete?.(saved.id)
        return
      }

      onSave(saved)
      showToast(isNew ? 'Fiche créée ✓' : 'Fiche mise à jour ✓')
    } catch (e: any) {
      showToast('Erreur : ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  // ── Completude ─────────────────────────────────────────────────────────────
  const hasPhoto = Object.values(photos).some(Boolean)
  const canSave  = hasPhoto || form.numero_lot || form.numero_depot

  return (
    <>
      <div className="modal-header">
        <div className="modal-title">
          {isNew ? 'Nouvelle fiche' : `Lot #${fiche?.numero_lot ?? '—'}`}
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        {/* Statut */}
        <div className="field">
          <label className="label">Statut</label>
          <StatusSelect value={form.statut} onChange={s => setForm(f => ({...f, statut: s}))} />
          {form.statut === 'sorti' && (
            <div style={{marginTop:8, padding:'8px 12px', background:'#fff3cd', borderRadius:6, fontSize:12, color:'#8a6000'}}>
              ⚠️ La fiche sera archivée automatiquement à l'enregistrement.
            </div>
          )}
          {form.statut === 'annule' && (
            <div style={{marginTop:8, padding:'8px 12px', background:'#fde8e8', borderRadius:6, fontSize:12, color:'#c0392b'}}>
              🗑 La fiche sera définitivement supprimée à l'enregistrement. Cette action est irréversible.
            </div>
          )}
        </div>

        <hr className="divider"/>

        {/* Sections photos */}
        {SECTIONS.map(section => (
          <div key={section.key} style={{marginBottom:24}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
              <span style={{fontSize:16}}>{section.emoji}</span>
              <span className="label" style={{margin:0}}>{section.title}</span>
              {photos[section.photoField] && <span style={{color:'#2d8a5e', fontSize:11, fontWeight:600}}>✓ OK</span>}
            </div>

            <PhotoZone
              value={photos[section.photoField]}
              onChange={b64 => handlePhoto(section.photoField, b64)}
              ratio={section.key === 'depot' ? '3/2' : '4/3'}
            />

            {/* OCR loading */}
            {ocr[section.photoField] && (
              <div className="loading"><div className="spin"/>Lecture en cours…</div>
            )}

            {/* Champ OCR résultat */}
            {section.ocrField && (
              <div className="field" style={{marginTop:12, marginBottom:0}}>
                <label className="label">{section.ocrLabel}</label>
                <input
                  className="input input-mono"
                  type="text"
                  value={(form as any)[section.ocrField]}
                  onChange={e => setForm(f => ({...f, [section.ocrField!]: e.target.value}))}
                  placeholder="— saisissez si non reconnu —"
                />
              </div>
            )}

            {/* Description IA pour objet */}
            {section.key === 'objet' && (
              <div className="field" style={{marginTop:12, marginBottom:0}}>
                <label className="label">
                  Description IA
                  {desc && <span style={{marginLeft:8, color:'var(--gray4)'}}>⏳ génération…</span>}
                </label>
                <input
                  className="input"
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="— générée automatiquement —"
                />
              </div>
            )}

            {/* Aperçu cliquable si photo existante */}
            {photos[section.photoField] && (
              <button
                className="btn btn-secondary btn-sm"
                style={{marginTop:8}}
                onClick={() => setLb(photos[section.photoField]!)}
              >
                🔍 Agrandir
              </button>
            )}
          </div>
        ))}

        <hr className="divider"/>

        {/* Notes */}
        <div className="field">
          <label className="label">Notes libres</label>
          <textarea
            className="textarea"
            value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            placeholder="Observations, particularités…"
          />
        </div>

        {/* Actions */}
        <div style={{display:'flex', gap:10, marginTop:8}}>
          <button className="btn btn-secondary btn-full" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? '⏳ Enregistrement…' : isNew ? 'Créer la fiche' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lb && (
        <div className="lb-bg" onClick={() => setLb(null)}>
          <button className="lb-close" onClick={() => setLb(null)}>✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lb-img" src={lb} alt="" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type==='ok'?'✓':'✕'} {toast.msg}
        </div>
      )}
    </>
  )
}
