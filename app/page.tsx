'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Fiche, Statut, STATUTS } from '@/lib/types'
import { FicheCard } from '@/components/FicheCard'
import { FicheForm } from '@/components/FicheForm'
import { StatusBadge } from '@/components/StatusBadge'
import { exportExcel, exportPDF } from '@/lib/export'

export default function Home() {
  const [fiches,   setFiches]   = useState<Fiche[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'new'|Fiche|null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter,   setFilter]   = useState<Statut|'tous'>('tous')
  const [search,   setSearch]   = useState('')
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)

  function showToast(msg: string, type: 'ok'|'err' = 'ok') {
    setToast({msg,type}); setTimeout(()=>setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('fiches')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false })
    setFiches(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSave(f: Fiche) {
    setFiches(prev => {
      const idx = prev.findIndex(x => x.id === f.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = f
        if (f.archived) return next.filter(x => x.id !== f.id)
        return next
      }
      return [f, ...prev]
    })
    setModal(null)
    showToast(f.archived ? `Lot #${f.numero_lot} archivé (sorti)` : 'Fiche enregistrée ✓')
  }

  function handleDelete(id: string) {
    setFiches(prev => prev.filter(x => x.id !== id))
    setModal(null)
    showToast('Fiche supprimée')
  }

  function toggleSelect(f: Fiche, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      checked ? next.add(f.id) : next.delete(f.id)
      return next
    })
  }

  const selectedFiches = fiches.filter(f => selected.has(f.id))
  const exportTarget   = selected.size > 0 ? selectedFiches : filteredFiches()

  function filteredFiches() {
    return fiches.filter(f => {
      const matchStatut = filter === 'tous' || f.statut === filter
      const q = search.toLowerCase()
      const matchSearch = !q ||
        f.numero_lot?.toLowerCase().includes(q) ||
        f.numero_depot?.toLowerCase().includes(q) ||
        f.numero_rack?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
      return matchStatut && matchSearch
    })
  }

  const displayed = filteredFiches()

  // Compteurs par statut
  const counts = fiches.reduce((acc, f) => {
    acc[f.statut] = (acc[f.statut] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="page">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-brand-sub">Artcurial</div>
          <div className="nav-brand-name">Stockurial</div>
        </div>
        <Link href="/"          className="nav-link active">📦 Stock</Link>
        <Link href="/recherche" className="nav-link">🔍 Recherche</Link>
        <Link href="/archives"  className="nav-link">🗂 Archives</Link>
        <div className="nav-badge">
          <span className="badge">{fiches.length} lot{fiches.length!==1?'s':''}</span>
        </div>
      </nav>

      <main className="main">

        {/* Toolbar */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
          <button className="btn btn-amber" onClick={() => setModal('new')}>
            ＋ Nouveau lot
          </button>

          {/* Recherche rapide */}
          <input
            className="input"
            style={{maxWidth:220, padding:'9px 14px'}}
            placeholder="N° lot, rack, dépôt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Filtre statut */}
          <select
            className="select"
            style={{maxWidth:180, padding:'9px 14px'}}
            value={filter}
            onChange={e => setFilter(e.target.value as Statut|'tous')}
          >
            <option value="tous">Tous les statuts ({fiches.length})</option>
            {(Object.keys(STATUTS) as Statut[]).map(s => (
              <option key={s} value={s}>
                {STATUTS[s].emoji} {STATUTS[s].label} ({counts[s]??0})
              </option>
            ))}
          </select>

          {/* Export */}
          <div style={{marginLeft:'auto', display:'flex', gap:8}}>
            {selected.size > 0 && (
              <span style={{fontSize:12, color:'#5a6a8a', alignSelf:'center'}}>
                {selected.size} sélectionné{selected.size>1?'s':''}
              </span>
            )}
            <button className="btn btn-secondary btn-sm"
              onClick={() => exportExcel(exportTarget, 'stockurial')}>
              📊 Excel
            </button>
            <button className="btn btn-secondary btn-sm"
              onClick={() => exportPDF(exportTarget, 'stockurial')}>
              📄 PDF
            </button>
            {selected.size > 0 && (
              <button className="btn btn-secondary btn-sm"
                onClick={() => setSelected(new Set())}>
                ✕ Tout désélectionner
              </button>
            )}
          </div>
        </div>

        {/* Statut pills */}
        <div style={{display:'flex', gap:8, marginBottom:20, flexWrap:'wrap'}}>
          {(Object.keys(STATUTS) as Statut[]).filter(s => counts[s]).map(s => (
            <button
              key={s}
              className="status-badge"
              style={{
                background: filter===s ? STATUTS[s].color+'33' : STATUTS[s].color+'15',
                color: STATUTS[s].color,
                border: filter===s ? `1.5px solid ${STATUTS[s].color}` : '1.5px solid transparent',
                cursor:'pointer', fontWeight:600
              }}
              onClick={() => setFilter(filter===s ? 'tous' : s)}
            >
              {STATUTS[s].emoji} {STATUTS[s].label} · {counts[s]??0}
            </button>
          ))}
        </div>

        {/* Grille */}
        {loading ? (
          <div className="empty"><div className="spin" style={{margin:'0 auto 12px'}}/><div>Chargement…</div></div>
        ) : displayed.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">📦</div>
            <div className="empty-txt">
              {search || filter!=='tous'
                ? 'Aucun lot ne correspond à cette recherche.'
                : 'Aucun lot en stock.\nCliquez sur « Nouveau lot » pour commencer.'}
            </div>
          </div>
        ) : (
          <div className="grid-3">
            {displayed.map(f => (
              <FicheCard
                key={f.id}
                fiche={f}
                onEdit={setModal}
                onSelect={toggleSelect}
                selected={selected.has(f.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal fiche */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <FicheForm
              fiche={modal === 'new' ? null : modal}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.type==='ok'?'✓':'✕'} {toast.msg}</div>}
    </div>
  )
}
