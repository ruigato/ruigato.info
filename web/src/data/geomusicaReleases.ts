import catalogue from "./geomusicaReleases.json"
import type { LocaleCode } from "../types/content"

type GeoMusicaRelease = {
  title: string
  imageSrc: string
  date: string
  format: keyof typeof catalogue.formats
  description: Record<LocaleCode, string>
  credit?: Record<LocaleCode, string>
  youtube: string
  bandcamp?: string
  spotify?: string
  appleMusic?: string
  relatedWorks?: { slug: string; title: string }[]
}

export const GEOMUSICA_RELEASES = catalogue.releases as GeoMusicaRelease[]
export const GEOMUSICA_RELEASE_FORMATS = catalogue.formats
