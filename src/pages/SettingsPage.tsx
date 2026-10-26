import { useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '../components/Icon'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { PageHeader } from '../components/ui'
import { parseInventory, serializeInventory } from '../domain/storage'
import type { InventoryData } from '../domain/types'
import { useLoadSample } from '../hooks/useLoadSample'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'

type Pending = { kind: 'import'; data: InventoryData } | { kind: 'sample' } | { kind: 'reset' } | null

export function SettingsPage() {
  const { t } = useI18n()
  const { products, movements, replaceAll } = useInventory()
  const { notify } = useToast()
  const loadSample = useLoadSample()
  const fileInput = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const hasData = products.length > 0 || movements.length > 0

  const exportBackup = () => {
    const blob = new Blob([serializeInventory({ products, movements })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockmate-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify('success', { key: 'settings.exported' })
  }

  const applyImport = (data: InventoryData) => {
    replaceAll(data)
    notify('success', { key: 'settings.imported', params: { products: data.products.length, movements: data.movements.length } })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      let data: InventoryData | null = null
      try {
        data = parseInventory(JSON.parse(text))
      } catch {
        data = null
      }
      if (!data) notify('error', { key: 'errors.importInvalid' })
      else if (hasData) setPending({ kind: 'import', data })
      else applyImport(data)
    } catch {
      notify('error', { key: 'errors.importRead' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="settings-grid">
        <section className="card setting">
          <h2>{t('settings.storageTitle')}</h2>
          <p className="muted">{t('settings.storageBody', { products: products.length, movements: movements.length })}</p>
          <p className="muted small">{t('settings.currencyNote')}</p>
        </section>

        <section className="card setting">
          <h2>{t('settings.exportTitle')}</h2>
          <p className="muted">{t('settings.exportBody')}</p>
          <button type="button" className="btn btn--secondary" onClick={exportBackup} disabled={!hasData}>
            <Icon name="download" />
            {t('settings.exportButton')}
          </button>
        </section>

        <section className="card setting">
          <h2>{t('settings.importTitle')}</h2>
          <p className="muted">{t('settings.importBody')}</p>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={onFile} hidden />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            aria-busy={importing}
          >
            {importing ? <span className="spinner" aria-hidden="true" /> : <Icon name="upload" />}
            {importing ? t('settings.importing') : t('settings.importButton')}
          </button>
        </section>

        <section className="card setting">
          <h2>{t('settings.sampleTitle')}</h2>
          <p className="muted">{t('settings.sampleBody')}</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => (hasData ? setPending({ kind: 'sample' }) : loadSample())}
          >
            <Icon name="sparkles" />
            {t('settings.sampleButton')}
          </button>
        </section>

        <section className="card setting setting--danger">
          <h2>{t('settings.resetTitle')}</h2>
          <p className="muted">{t('settings.resetBody')}</p>
          <button type="button" className="btn btn--danger" onClick={() => setPending({ kind: 'reset' })} disabled={!hasData}>
            <Icon name="trash" />
            {t('settings.resetButton')}
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={pending?.kind === 'import'}
        title={t('settings.importConfirmTitle')}
        body={t('settings.importConfirmBody')}
        confirmLabel={t('common.confirm')}
        onClose={() => setPending(null)}
        onConfirm={() => pending?.kind === 'import' && applyImport(pending.data)}
      />
      <ConfirmDialog
        open={pending?.kind === 'sample'}
        title={t('settings.sampleConfirmTitle')}
        body={t('settings.sampleConfirmBody')}
        confirmLabel={t('settings.sampleButton')}
        onClose={() => setPending(null)}
        onConfirm={loadSample}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title={t('settings.resetConfirmTitle')}
        body={t('settings.resetConfirmBody')}
        confirmLabel={t('settings.resetButton')}
        onClose={() => setPending(null)}
        onConfirm={() => {
          replaceAll({ products: [], movements: [] })
          notify('success', { key: 'settings.resetDone' })
        }}
      />
    </>
  )
}
