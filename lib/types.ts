export type Statut = 'incomplet' | 'receptionne' | 'photographie' | 'range' | 'sorti'

export interface Fiche {
  id: string
  created_at: string
  updated_at: string
  statut: Statut
  archived: boolean
  // Bon de dépôt
  photo_depot: string | null
  numero_depot: string | null
  date_depot: string | null
  // Lot
  photo_etiq: string | null
  numero_lot: string | null
  // Objet
  photo_objet: string | null
  description: string | null
  // Rack
  photo_rack: string | null
  numero_rack: string | null
  photo_range: string | null
  // Notes
  notes: string | null
}

export interface HistoriqueEntry {
  id: string
  fiche_id: string
  created_at: string
  action: string
  champ: string | null
  avant: string | null
  apres: string | null
}

export const STATUTS: Record<Statut, { label: string; emoji: string; color: string }> = {
  incomplet:    { label: 'Incomplet',    emoji: '⚠️',  color: '#e8a020' },
  receptionne:  { label: 'Réceptionné',  emoji: '📥',  color: '#5a6a8a' },
  photographie: { label: 'Photographié', emoji: '📸',  color: '#6a7fd4' },
  range:        { label: 'Rangé',        emoji: '📦',  color: '#2d8a5e' },
  sorti:        { label: 'Sorti',        emoji: '🚚',  color: '#c8a96e' },
}
