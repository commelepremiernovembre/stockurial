import { Fiche, STATUTS } from './types'

const fmt = (ts: string) =>
  new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(ts))

// ── Excel ────────────────────────────────────────────────────────────────────
export async function exportExcel(fiches: Fiche[], filename = 'stockurial') {
  const XLSX = await import('xlsx')
  const rows = fiches.map(f => ({
    'N° Lot':       f.numero_lot    ?? '—',
    'N° Dépôt':    f.numero_depot  ?? '—',
    'N° Rack':     f.numero_rack   ?? '—',
    'Description': f.description   ?? '—',
    'Statut':      STATUTS[f.statut]?.label ?? f.statut,
    'Date dépôt':  f.date_depot ? fmt(f.date_depot) : '—',
    'Créé le':     fmt(f.created_at),
    'Mis à jour':  fmt(f.updated_at),
    'Notes':       f.notes ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [14,12,12,30,14,14,14,14,30].map(wch => ({ wch }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock')
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── PDF ─────────────────────────────────────────────────────────────────────
async function loadImg(url: string): Promise<string> {
  try {
    const r = await fetch(url)
    const blob = await r.blob()
    return new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = e => res(e.target!.result as string)
      reader.onerror = rej
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

export async function exportPDF(fiches: Fiche[], filename = 'stockurial') {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit:'mm', format:'a4' })
  const W = 210, MARGIN = 15

  for (let i = 0; i < fiches.length; i++) {
    const f = fiches[i]
    if (i > 0) doc.addPage()

    let y = MARGIN

    // Header bleu
    doc.setFillColor(27, 42, 74)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(240, 237, 230)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('ARTCURIAL — STOCKURIAL', MARGIN, 9)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`Lot #${f.numero_lot ?? '—'}`, MARGIN, 17)

    // Statut
    const statut = STATUTS[f.statut]
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(statut.label.toUpperCase(), W - MARGIN, 17, { align:'right' })

    y = 30

    // Infos texte
    doc.setTextColor(27, 42, 74)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')

    const infos = [
      ['N° Lot',       f.numero_lot    ?? '—'],
      ['N° Dépôt',    f.numero_depot  ?? '—'],
      ['N° Rack',     f.numero_rack   ?? '—'],
      ['Description', f.description   ?? '—'],
      ['Date dépôt',  f.date_depot ? fmt(f.date_depot) : '—'],
      ['Créé le',     fmt(f.created_at)],
      ['Notes',       f.notes ?? '—'],
    ]

    for (const [label, value] of infos) {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ' :', MARGIN, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value), MARGIN + 28, y)
      y += 6
    }

    y += 4

    // Photos (2 colonnes x 2 rangées)
    const photoFields: (keyof Fiche)[] = ['photo_depot','photo_etiq','photo_objet','photo_rack','photo_range']
    const photoLabels = ['Bon de dépôt','Étiquette','Objet','Rack','Rangé']
    const imgW = (W - MARGIN*2 - 8) / 2
    const imgH = imgW * 0.75

    let col = 0, row = 0
    for (let pi = 0; pi < photoFields.length; pi++) {
      const url = f[photoFields[pi]] as string | null
      if (!url) continue

      const x = MARGIN + col * (imgW + 8)
      const yImg = y + row * (imgH + 10)

      try {
        const b64 = await loadImg(url)
        if (b64) {
          doc.addImage(b64, 'JPEG', x, yImg, imgW, imgH, undefined, 'FAST')
        }
      } catch {}

      doc.setFontSize(7)
      doc.setTextColor(130)
      doc.setFont('helvetica', 'normal')
      doc.text(photoLabels[pi], x, yImg + imgH + 4)

      col++
      if (col >= 2) { col = 0; row++ }
    }
  }

  doc.save(`${filename}-${new Date().toISOString().slice(0,10)}.pdf`)
}
