'use client'
import { Fiche } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface Props {
  fiche: Fiche
  onEdit: (f: Fiche) => void
  onSelect?: (f: Fiche, checked: boolean) => void
  selected?: boolean
}

const fmt = (ts: string) =>
  new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(ts))

export function FicheCard({ fiche, onEdit, onSelect, selected }: Props) {
  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        outline: selected ? '2px solid #1b2a4a' : 'none',
        transition: 'box-shadow .15s',
      }}
      onClick={() => onEdit(fiche)}
    >
      {/* Photos bande */}
      <div style={{ display:'flex', height:90, background:'#eae8e2' }}>
        {(['photo_objet','photo_range'] as const).map((f, i) => (
          <div key={f} style={{ flex:1, overflow:'hidden', position:'relative', borderRight: i===0 ? '2px solid #f0ede6' : 'none' }}>
            {fiche[f]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={fiche[f]!} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#c8d0dc' }}>{i===0?'📦':'🗄'}</div>
            }
          </div>
        ))}
      </div>

      {/* Infos */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
          <div>
            <div className="mono" style={{ fontSize:17, color:'#1b2a4a' }}>
              {fiche.numero_lot ?? <span style={{color:'#c8d0dc'}}>N° lot —</span>}
            </div>
            {fiche.numero_depot && (
              <div style={{ fontSize:11, color:'#8a9ab8', marginTop:2 }}>Dépôt #{fiche.numero_depot}</div>
            )}
          </div>
          <StatusBadge statut={fiche.statut}/>
        </div>

        {fiche.description && (
          <div style={{ fontSize:12, color:'#5a6a8a', fontStyle:'italic', marginBottom:6 }}>✦ {fiche.description}</div>
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          {fiche.numero_rack && (
            <div style={{ fontSize:11, color:'#8a9ab8' }}>🗄 Rack {fiche.numero_rack}</div>
          )}
          <div style={{ fontSize:10, color:'#a0acbe', marginLeft:'auto' }}>{fmt(fiche.updated_at)}</div>
        </div>

        {/* Sélection export */}
        {onSelect && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f0ede6' }}
               onClick={e => { e.stopPropagation(); onSelect(fiche, !selected); }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, color:'#5a6a8a' }}>
              <input type="checkbox" checked={selected??false} onChange={() => {}} style={{accentColor:'#1b2a4a'}}/>
              Sélectionner pour export
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
