import { NextRequest, NextResponse } from 'next/server'
import { Fiche, STATUTS } from '@/lib/types'

// ── Excel export ─────────────────────────────────────────────────────────────
function ficheToRow(f: Fiche) {
  return {
    'N° Lot':       f.numero_lot    ?? '—',
    'N° Dépôt':    f.numero_depot  ?? '—',
    'N° Rack':     f.numero_rack   ?? '—',
    'Description': f.description   ?? '—',
    'Statut':      STATUTS[f.statut]?.label ?? f.statut,
    'Date dépôt':  f.date_depot ? new Date(f.date_depot).toLocaleDateString('fr-FR') : '—',
    'Créé le':     new Date(f.created_at).toLocaleDateString('fr-FR'),
    'Mis à jour':  new Date(f.updated_at).toLocaleDateString('fr-FR'),
    'Notes':       f.notes ?? '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const { format, fiches }: { format: 'excel' | 'pdf'; fiches: Fiche[] } = await req.json()

    if (format === 'excel') {
      const XLSX = await import('xlsx')
      const rows = fiches.map(ficheToRow)
      const ws   = XLSX.utils.json_to_sheet(rows)
      const wb   = XLSX.utils.book_new()

      // Largeurs colonnes
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Stock')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="stockurial-${Date.now()}.xlsx"`,
        },
      })
    }

    // PDF — on retourne les données structurées, le client génère le PDF avec jsPDF
    // (les images base64 ne passent pas bien en SSR)
    return NextResponse.json({ fiches })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
