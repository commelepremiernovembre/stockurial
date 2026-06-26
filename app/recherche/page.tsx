'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Fiche } from '@/lib/types'
import { FicheCard } from '@/components/FicheCard'
import { FicheForm } from '@/components/FicheForm'
import { exportExcel, exportPDF } from '@/lib/export'
import { PhotoZone } from '@/components/PhotoZone'

export default function Recherche() {
  const [fiches,   setFiches]   = useState<Fiche[]>([])
  const [results,  setResults]  = useState<Fiche[]|null>(null)
  const [modal,    setModal]    = useState<Fiche|null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const [photoRech,setPhotoRech]= useState<string|null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)

  // Champs texte
  const [q, setQ] = useState({ lot:'', depot:'', rack:'', dateFrom:'', dateTo:'' })

  useEffect(() => {
    supabase.from('fiches').select('*').eq('archived', false)
      .then(({ data }) => setFiches(data ?? []))
  }, [])

  async function handleSearch() {
    setLoading(true)
    let query = supabase.from('fiches').select('*').eq('archived', false)

    if (q.lot)   query = query.ilike('numero_lot',   `%${q.lot}%`)
    if (q.depot) query = query.ilike('numero_depot', `%${q.depot}%`)
    if (q.rack)  query = query.ilike('numero_rack',  `%${q.rack}%`)
    if (q.dateFrom) query = query.gte('date_depot', new Date(q.dateFrom).toISOString())
    if (q.dateTo)   query = query.lte('date_depot', new Date(q.dateTo + 'T23:59:59').toISOString())

    const { data } = await query.order('created_at', { ascending: false })
    setResults(data ?? [])
    setLoading(false)
  }

  async function handlePhotoSearch(b64: string) {
    setPhotoRech(b64)
    setPhotoLoading(true)
    try {
      // 1. Décrire l'objet soumis
      const data = b64.split(',')[1]
      const mime = b64.split(';')[0].split(':')[1]
      const r = await fetch('/api/claude', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          task: 'recherche_visuelle',
          base64: data,
          mime,
          descriptions: fiches
            .filter(f => f.description)
            .map(f => `[${f.id}] ${f.description}`)
        })
      })
      const j = await r.json()
      const text: string = j.result ?? ''

      // 2. Extraire les IDs correspondants
      const ids = fiches
        .filter(f => f.description && text.toLowerCase().includes(f.description.toLowerCase()))
        .map(f => f.id)

      if (ids.length > 0) {
        const { data: found } = await supabase.from('fiches').select('*').in('id', ids)
        setResults(found ?? [])
      } else {
        setResults([])
      }
    } catch (e) {
      console.error(e)
      setResults([])
    } finally {
      setPhotoLoading(false)
    }
  }

  function handleSave(f: Fiche) {
    setFiches(prev => {
      const idx = prev.findIndex(x => x.id === f.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = f; return n }
      return prev
    })
    if (results) {
      setResults(prev => {
        if (!prev) return prev
        const idx = prev.findIndex(x => x.id === f.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = f; return n }
        return prev
      })
    }
    setModal(null)
  }

  function handleDelete(id: string) {
    setFiches(prev => prev.filter(x => x.id !== id))
    setResults(prev => prev ? prev.filter(x => x.id !== id) : prev)
    setModal(null)
  }

  const toggleSelect = (f: Fiche, checked: boolean) => {
    setSelected(prev => { const n = new Set(prev); checked ? n.add(f.id) : n.delete(f.id); return n })
  }

  const displayed     = results ?? []
  const selectedFiches = displayed.filter(f => selected.has(f.id))
  const exportTarget  = selected.size > 0 ? selectedFiches : displayed

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-brand-sub">Artcurial</div>
          <div className="nav-brand-name">Stockurial</div>
        </div>
        <Link href="/"          className="nav-link">📦 Stock</Link>
        <Link href="/recherche" className="nav-link active">🔍 Recherche</Link>
        <Link href="/archives"  className="nav-link">🗂 Archives</Link>
      </nav>

      <main className="main">
        <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:24, alignItems:'start'}}>

          {/* Panneau de recherche */}
          <div className="card card-pad">
            <div style={{fontWeight:600, fontSize:15, marginBottom:18, color:'#1b2a4a'}}>🔍 Recherche</div>

            <div className="field">
              <label className="label">N° de lot</label>
              <input className="input" value={q.lot} onChange={e=>setQ(p=>({...p,lot:e.target.value}))} placeholder="ex: 26115362"/>
            </div>
            <div className="field">
              <label className="label">N° de dépôt</label>
              <input className="input" value={q.depot} onChange={e=>setQ(p=>({...p,depot:e.target.value}))} placeholder="ex: DEP-001"/>
            </div>
            <div className="field">
              <label className="label">N° de rack</label>
              <input className="input" value={q.rack} onChange={e=>setQ(p=>({...p,rack:e.target.value}))} placeholder="ex: R-12"/>
            </div>
            <div className="field">
              <label className="label">Date dépôt — du</label>
              <input className="input" type="date" value={q.dateFrom} onChange={e=>setQ(p=>({...p,dateFrom:e.target.value}))}/>
            </div>
            <div className="field">
              <label className="label">Au</label>
              <input className="input" type="date" value={q.dateTo} onChange={e=>setQ(p=>({...p,dateTo:e.target.value}))}/>
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSearch} disabled={loading}>
              {loading ? '⏳ Recherche…' : 'Rechercher'}
            </button>

            <hr className="divider"/>

            {/* Recherche par photo */}
            <div style={{fontWeight:600, fontSize:13, marginBottom:12, color:'#1b2a4a'}}>📷 Recherche par photo</div>
            <div style={{fontSize:11, color:'#8a9ab8', marginBottom:10, lineHeight:1.5}}>
              Photographiez ou choisissez une image de l'objet — l'IA cherche les lots visuellement similaires.
            </div>
            <PhotoZone
              value={photoRech}
              onChange={handlePhotoSearch}
              label="Photo de l'objet"
              ratio="4/3"
            />
            {photoLoading && <div className="loading" style={{marginTop:8}}><div className="spin"/>Recherche visuelle…</div>}
          </div>

          {/* Résultats */}
          <div>
            {results === null ? (
              <div className="empty">
                <div className="empty-ico">🔍</div>
                <div className="empty-txt">Utilisez les filtres à gauche pour rechercher des lots.</div>
              </div>
            ) : (
              <>
                <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap'}}>
                  <div style={{fontWeight:600, color:'#1b2a4a'}}>
                    {displayed.length} résultat{displayed.length!==1?'s':''}
                  </div>
                  {displayed.length > 0 && (
                    <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                      {selected.size > 0 && (
                        <span style={{fontSize:12, color:'#5a6a8a', alignSelf:'center'}}>{selected.size} sélectionné{selected.size>1?'s':''}</span>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={()=>exportExcel(exportTarget)}>📊 Excel</button>
                      <button className="btn btn-secondary btn-sm" onClick={()=>exportPDF(exportTarget)}>📄 PDF</button>
                    </div>
                  )}
                </div>

                {displayed.length === 0 ? (
                  <div className="empty"><div className="empty-ico">🔎</div><div className="empty-txt">Aucun lot trouvé.</div></div>
                ) : (
                  <div className="grid-3">
                    {displayed.map(f => (
                      <FicheCard key={f.id} fiche={f} onEdit={setModal} onSelect={toggleSelect} selected={selected.has(f.id)}/>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {modal && (
        <div className="modal-bg" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <FicheForm fiche={modal} onSave={handleSave} onDelete={handleDelete} onClose={()=>setModal(null)}/>
          </div>
        </div>
      )}
    </div>
  )
}
