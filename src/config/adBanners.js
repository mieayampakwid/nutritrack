import adBannerCateringGizi from '@/assets/ad-banner-catering-gizi.png'
import adBannerPoliGizi from '@/assets/ad-banner-poli-gizi.png'

/**
 * Dashboard landscape ad carousel slides.
 * - `imageSrc`: banner image (imported asset or URL string).
 * - `href`: optional link when the slide is clicked.
 * - `alt`: required short description for accessibility.
 */
export const AD_BANNER_SLIDES = [
  {
    id: 'poli-gizi-rsud',
    imageSrc: adBannerPoliGizi,
    alt: 'Konsultasi POLI GIZI RSUD RT Notopuro Sidoarjo — panduan gizi bersama ahli gizi profesional.',
    href: null,
  },
  {
    id: 'catering-gizi',
    imageSrc: adBannerCateringGizi,
    alt: 'Catering GIZI — makanan bergizi seimbang, kalori terkontrol, untuk kesehatan dan program diet.',
    href: null,
  },
]

/** Auto-advance interval (ms). */
export const AD_BANNER_INTERVAL_MS = 5500
