'use client'
import { Statut, STATUTS } from '@/lib/types'

export function StatusBadge({ statut }: { statut: Statut }) {
  const s = STATUTS[statut]
  return (
    <span className="status-badge" style={{ background: s.color + '22', color: s.color }}>
      {s.emoji} {s.label}
    </span>
  )
}

export function StatusSelect({
  value,
  onChange,
}: {
  value: Statut
  onChange: (s: Statut) => void
}) {
  return (
    <select
      className="select"
      value={value}
      onChange={e => onChange(e.target.value as Statut)}
    >
      {(Object.keys(STATUTS) as Statut[]).map(s => (
        <option key={s} value={s}>
          {STATUTS[s].emoji} {STATUTS[s].label}
        </option>
      ))}
    </select>
  )
}
