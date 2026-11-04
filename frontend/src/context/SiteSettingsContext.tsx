import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_SITE_SETTINGS, loadSiteSettings, saveSiteSettings } from '../utils/siteSettings'
import { fetchSiteSettings, saveSiteSettingsToApi } from '../services/settingsService'
import type { SiteSettings } from '../types'

/** Giá trị mà `SiteSettingsProvider` phát cho toàn cây. */
interface SiteSettingsContextValue {
  settings: SiteSettings;
  updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings>;
  resetSettings(): void;
  isLoading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null)

export const useSiteSettings = (): SiteSettingsContextValue => {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}

type Props = { children: ReactNode }

export const SiteSettingsProvider = ({ children }: Props) => {
  const [settings, setSettings] = useState<SiteSettings>(() => loadSiteSettings())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSiteSettings()
      .then((data) => {
        setSettings(data)
        saveSiteSettings(data)
      })
      .catch(() => {
        setSettings(loadSiteSettings())
      })
      .finally(() => setIsLoading(false))
  }, [])
// frontend/src/context/SiteSettingsContext.jsx

useEffect(() => {
  if (settings.storeName) {
    document.title = `${settings.storeName} - ${settings.tagline || 'Thiết bị tin học chính hãng'}`
  }
}, [settings.storeName, settings.tagline])
  const updateSettings = useCallback(async (updates: Partial<SiteSettings>): Promise<SiteSettings> => {
    const optimistic = { ...settings, ...updates }
    setSettings(optimistic)
    saveSiteSettings(optimistic)

    try {
      const saved = await saveSiteSettingsToApi(updates)
      setSettings(saved)
      saveSiteSettings(saved)
      return saved
    } catch (error) {
      setSettings(settings)
      saveSiteSettings(settings)
      throw error
    }
  }, [settings])

  const resetSettings = (): void => {
    setSettings({ ...DEFAULT_SITE_SETTINGS })
    saveSiteSettings(DEFAULT_SITE_SETTINGS)
  }

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}
