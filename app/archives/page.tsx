'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Fiche, HistoriqueEntry } from '@/lib/types'
import { FicheCard } from '@/components/FicheCard'
import { FicheForm } from '@/components/FicheForm'
import { exportExcel, exportPDF } from '@/lib/export'

export default function Archives() {
  const [fiches,    setFiches]   = useState<Fiche[]>([])
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [selected,  setSelected] = useState<Set<string>>(new Set())
  const [modal,     setModal]    = useState<Fiche|null>(null)
  const [historique,setHistorique]=useState<{fiche:Fiche, entries:HistoriqueEntry[]}|null>(null)

  useEffect(() => {
    supabase.from('fiches').select('*').eq('archived', true)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { setFiches(data ?? []); setLoading(false) })
  }, [])

  async function showHistorique(f: Fiche) {
    const { data } = await supabase
      .from('historique')
      .select('*')
      .eq('fiche_id', f.id)
      .order('created_at', { ascending: false })
    setHistorique({ fiche: f, entries: data ?? [] })
  }

  const toggleSelect = (f: Fiche, checked: boolean) => {
    setSelected(prev => { const n = new Set(prev); checked ? n.add(f.id) : n.delete(f.id); return n })
  }

  const displayed = fiches.filter(f => {
    const q = search.toLowerCase()
    return !q || f.numero_lot?.toLowerCase().includes(q) || f.numero_depot?.toLowerCase().includes(q)
  })
  const selectedFiches = displayed.filter(f => selected.has(f.id))
  const exportTarget   = selected.size > 0 ? selectedFiches : displayed

  const fmt = (ts: string) =>
    new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(ts))

  const ACTION_LABELS: Record<string, string> = {
    creation:     '📋 Fiche créée',
    modification: '✏️ Modification',
    statut:       '🔄 Changement de statut',
    archivage:    '🗂 Archivage',
  }

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-brand-sub">Artcurial</div>
          <div className="nav-brand-name">Stockurial</div>
        </div>
        <Link href="/"          className="nav-link">📦 Stock</Link>
        <Link href="/recherche" className="nav-link">🔍 Recherche</Link>
        <Link href="/archives"  className="nav-link active">🗂 Archives</Link>
        <div className="nav-badge">
          <span className="badge">{fiches.length} archivé{fiches.length!==1?'s':''}</span>
        </div>
      </nav>

      <main className="main">
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
          <div style={{fontSize:14, color:'#5a6a8a'}}>
            Lots sortis — consultables, non éditables
          </div>
          <input
            className="input"
            style={{maxWidth:220, padding:'9px 14px', marginLeft:'auto'}}
            placeholder="N° lot ou dépôt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={()=>exportExcel(exportTarget)}>📊 Excel</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>exportPDF(exportTarget)}>📄 PDF</button>
        </div>

        {loading ? (
          <div className="empty"><div className="spin" style={{margin:'0 auto 12px'}}/><div>Chargement…</div></div>
        ) : displayed.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🗂</div>
            <div className="empty-txt">{search ? 'Aucun lot archivé ne correspond.' : 'Aucun lot archivé pour l\'instant.'}</div>
          </div>
        ) : (
          <div>
            {/* Historique global (dernières actions) */}
            <div style={{marginBottom:24}}>
              <div style={{fontWeight:600, fontSize:13, color:'#1b2a4a', marginBottom:12}}>
                📋 Historique récent
              </div>
              <div className="card card-pad" style={{maxHeight:200, overflowY:'auto'}}>
                {displayed.slice(0,10).map(f => (
                  <div key={f.id}
                    style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid #f0ede6', cursor:'pointer'}}
                    onClick={()=>showHistorique(f)}
                  >
                    <span style={{fontFamily:'monospace', fontWeight:600, color:'#1b2a4a', fontSize:13}}>#{f.numero_lot ?? '—'}</span>
                    <span style={{fontSize:11, color:'#8a9ab8'}}>sorti le {fmt(f.updated_at)}</span>
                    <span style={{marginLeft:'auto', fontSize:11, color:'#c8a96e', fontWeight:600}}>voir historique →</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid-3">
              {displayed.map(f => (
                <div key={f.id}>
                  <FicheCard fiche={f} onEdit={()=>showHistorique(f)} onSelect={toggleSelect} selected={selected.has(f.id)}/>
                  <button className="btn btn-secondary btn-sm btn-full" style={{marginTop:6}}
                    onClick={()=>showHistorique(f)}>
                    📋 Voir l'historique
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal historique */}
      {historique && (
        <div className="modal-bg" onClick={()=>setHistorique(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Historique — Lot #{historique.fiche.numero_lot ?? '—'}</div>
              <button className="modal-close" onClick={()=>setHistorique(null)}>✕</button>
            </div>
            <div className="modal-body">
              {historique.entries.length === 0 ? (
                <div style={{color:'#8a9ab8', textAlign:'center', padding:'20px 0'}}>Aucun historique enregistré.</div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {historique.entries.map(e => (
                    <div key={e.id} style={{padding:'10px 14px', background:'#f5f3ee', borderRadius:8, borderLeft:'3px solid #c8a96e'}}>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
                        <span style={{fontWeight:600, fontSize:13, color:'#1b2a4a'}}>
                          {ACTION_LABELS[e.action] ?? e.action}
                        </span>
                        <span style={{fontSize:10, color:'#a0acbe', marginLeft:'auto'}}>{fmt(e.created_at)}</span>
                      </div>
                      {e.champ && (
                        <div style={{fontSize:12, color:'#5a6a8a'}}>
                          <span style={{fontWeight:600}}>{e.champ}</span>
                          {e.avant && <> · <span style={{textDecoration:'line-through', color:'#a0acbe'}}>{e.avant}</span></>}
                          {e.apres && <> → <span style={{color:'#1b2a4a'}}>{e.apres}</span></>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
