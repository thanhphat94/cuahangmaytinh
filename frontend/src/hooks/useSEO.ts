import { useEffect } from 'react'

const SITE_NAME = 'Cửa Hàng Máy Tính'
const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'https://cuahangmaytinh.vn'
const DEFAULT_DESC = 'Cửa Hàng Máy Tính — Chuyên cung cấp máy tính, máy in, camera và thiết bị công nghệ chính hãng tại TP.HCM'
const DEFAULT_IMG  = `${SITE_URL}/og-image.jpg`

/** Các giá trị SEO một trang có thể cung cấp; thiếu thì dùng mặc định bên dưới. */
export interface SEOOptions {
  title?: string
  description?: string
  image?: string
  url?: string
  /** Giá trị cho `og:type` — mặc định 'website'. */
  type?: string
}

/**
 * useSEO — cập nhật <title>, <meta description>, Open Graph, canonical
 * @param {{ title, description, image, url, type }} options
 */
export function useSEO({ title, description, image, url, type = 'website' }: SEOOptions = {}): void {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
    const desc  = description || DEFAULT_DESC
    const img   = image || DEFAULT_IMG
    const canonical = url ? `${SITE_URL}${url}` : SITE_URL

    // <title>
    document.title = fullTitle

    // Helper
    const setMeta = (selector: string, attr: string, value: string): void => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attrName, attrVal] = selector.match(/\[(.+?)="(.+?)"\]/)?.slice(1) || []
        if (attrName) el.setAttribute(attrName, attrVal)
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    const setLink = (rel: string, href: string): void => {
      const existing = document.querySelector(`link[rel="${rel}"]`)
      let el: HTMLLinkElement
      if (existing instanceof HTMLLinkElement) {
        el = existing
      } else {
        el = document.createElement('link')
        el.rel = rel
        document.head.appendChild(el)
      }
      el.href = href
    }

    // Standard meta
    setMeta('meta[name="description"]',         'content', desc)

    // Open Graph
    setMeta('meta[property="og:title"]',        'content', fullTitle)
    setMeta('meta[property="og:description"]',  'content', desc)
    setMeta('meta[property="og:image"]',        'content', img)
    setMeta('meta[property="og:url"]',          'content', canonical)
    setMeta('meta[property="og:type"]',         'content', type)
    setMeta('meta[property="og:site_name"]',    'content', SITE_NAME)
    setMeta('meta[property="og:locale"]',       'content', 'vi_VN')

    // Twitter Card
    setMeta('meta[name="twitter:card"]',        'content', 'summary_large_image')
    setMeta('meta[name="twitter:title"]',       'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', desc)
    setMeta('meta[name="twitter:image"]',       'content', img)

    // Canonical
    setLink('canonical', canonical)
  }, [title, description, image, url, type])
}
