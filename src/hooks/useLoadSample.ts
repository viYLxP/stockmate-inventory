import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { createSampleData } from '../domain/sampleData'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'

/** Replace all data with the sample catalogue, written in the active language. */
export function useLoadSample() {
  const { lang } = useI18n()
  const { replaceAll } = useInventory()
  const { notify } = useToast()
  return useCallback(() => {
    replaceAll(createSampleData(lang))
    notify('success', { key: 'settings.sampleLoaded' })
  }, [lang, replaceAll, notify])
}
