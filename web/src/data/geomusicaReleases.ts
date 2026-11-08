import shapesCover from "../assets/geomusica-releases/shapes-for-piano-1.jpg"
import allotrope1Cover from "../assets/geomusica-releases/allotrope-1.jpg"
import allotrope2Cover from "../assets/geomusica-releases/allotrope-2.jpg"
import passarolaStill from "../assets/geomusica-releases/passarola.jpg"
import type { LocaleCode } from "../types/content"

type GeoMusicaRelease = {
  title: string
  imageSrc: string
  date: string
  format: "album" | "single" | "study"
  description: Record<LocaleCode, string>
  credit?: Record<LocaleCode, string>
  youtube: string
  bandcamp?: string
  spotify?: string
  appleMusic?: string
  relatedWorks?: { slug: string; title: string }[]
}

export const GEOMUSICA_RELEASES: GeoMusicaRelease[] = [
  {
    title: "Shapes for Piano 1",
    imageSrc: shapesCover,
    date: "2021-12-21",
    format: "album",
    description: {
      pt: "O primeiro álbum da GeoMusica reúne nove peças para piano microtonal. As subdivisões de polígonos e formas estreladas determinam as frequências das notas. Na primeira faixa, as subdivisões de um triângulo preservam o contorno melódico à medida que a escala se transforma.",
      en: "GeoMusica’s first album brings together nine pieces for microtonal piano. The subdivisions of polygons and stellated shapes determine the pitches. In the opening track, subdivisions of a triangle preserve the melodic contour as the scale changes.",
    },
    credit: {
      pt: "Capa: pormenor de Melencolia I (1514), de Albrecht Dürer.",
      en: "Cover: detail from Melencolia I (1514) by Albrecht Dürer.",
    },
    youtube: "https://www.youtube.com/playlist?list=PLErTONIIcY3alYgDhkGIcMZWttNS2C6rG",
    bandcamp: "https://ruigato.bandcamp.com/album/shapes-for-piano-1",
    spotify: "https://open.spotify.com/album/1iAaSzoDUQbjSIfOT42EcQ",
    appleMusic: "https://music.apple.com/pt/album/shapes-for-piano-1/1663045628",
  },
  {
    title: "Allotrope 1",
    imageSrc: allotrope1Cover,
    date: "2022-09-23",
    format: "single",
    description: {
      pt: "Seis camadas de geometria comandam seis instrumentos electrónicos. Os ritmos surgem directamente da rotação das formas, sem quantização, e as proporções geométricas são traduzidas em notas de sintetizador em temperamento igual.",
      en: "Six layers of geometry drive six electronic instruments. Rhythms emerge directly from the rotation of the shapes, without quantisation, and geometric proportions are mapped to equal-tempered synth notes.",
    },
    credit: {
      pt: "Fotografia de capa: José Hipólito (2022).",
      en: "Cover photograph: José Hipólito (2022).",
    },
    youtube: "https://www.youtube.com/watch?v=D0skQOed4kg",
    bandcamp: "https://ruigato.bandcamp.com/album/allotrope-1",
    spotify: "https://open.spotify.com/album/2NzmESp317COKtoGDbUSlw",
    appleMusic: "https://music.apple.com/pt/album/allotrope-1-n8-n4-mod2-g250-single/1663914165",
  },
  {
    title: "Allotrope 2",
    imageSrc: allotrope2Cover,
    date: "2023-01-03",
    format: "single",
    description: {
      pt: "A segunda peça da série Allotrope leva a investigação rítmica para o dub techno. As subdivisões de quadrados, octaedros e formas estreladas de oito pontas servem de base a seis camadas instrumentais.",
      en: "The second piece in the Allotrope series takes its rhythmic research into dub techno. Subdivisions of squares, octahedra and eight-pointed star forms provide the basis for six instrumental layers.",
    },
    credit: {
      pt: "Fotografia de capa: José Hipólito (2022).",
      en: "Cover photograph: José Hipólito (2022).",
    },
    youtube: "https://www.youtube.com/watch?v=8jTjJgghd1A",
    bandcamp: "https://ruigato.bandcamp.com/album/allotrope-2",
    spotify: "https://open.spotify.com/album/7LRwA8bmPKjoKzF8ezwYY0",
    appleMusic: "https://music.apple.com/pt/album/allotrope-2-n8-n2-g360-g144-s1-single/1663489578",
  },
  {
    title: "Passarola",
    imageSrc: passarolaStill,
    date: "2023-03",
    format: "study",
    description: {
      pt: "Um estudo audiovisual sobre a Sonata para Piano em Si menor K. 87, de Domenico Scarlatti. Rui Gato compôs este estudo a partir da investigação para Passarola — Variations on the Past and the Future K.87, a obra ao vivo criada com Pedro Emanuel Pereira e Vítor Joaquim.",
      en: "An audiovisual study of Domenico Scarlatti’s Piano Sonata in B minor, K. 87. Rui Gato composed the study from research for Passarola — Variations on the Past and the Future K.87, the live work created with Pedro Emanuel Pereira and Vítor Joaquim.",
    },
    youtube: "https://www.youtube.com/watch?v=Yq9_0W0oFZs",
    relatedWorks: [
      { slug: "passarola", title: "Passarola #1" },
      { slug: "passarola-2", title: "Passarola #2" },
    ],
  },
]
