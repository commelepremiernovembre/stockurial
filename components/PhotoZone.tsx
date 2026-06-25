'use client'
import { useRef } from 'react'

interface Props {
  value: string | null
  onChange: (b64: string) => void
  label?: string
  ratio?: string
}

function toB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(e.target!.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export function PhotoZone({ value, onChange, label = 'Photographier ou choisir', ratio = '4/3' }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    onChange(await toB64(f))
    e.target.value = ''
  }

  return (
    <>
      <div
        className="photo-zone"
        style={{ aspectRatio: ratio }}
        onClick={() => ref.current?.click()}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" />
            {value && <div className="photo-zone-check">✓</div>}
            <div className="photo-zone-retake">Reprendre / Changer</div>
          </>
        ) : (
          <>
            <div className="photo-zone-ico">📷</div>
            <div className="photo-zone-lbl">{label}</div>
          </>
        )}
      </div>
      {/* Pas de capture="environment" — permet photothèque ET caméra */}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </>
  )
}
