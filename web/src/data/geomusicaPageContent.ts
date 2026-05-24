import type { LocaleCode } from "../types/content"

export type GeomusicaVideoItem = {
  youtubeId: string
  title: string
  aspect?: "4/3" | "16/9"
}

export type GeomusicaVideoGroup = {
  videos: readonly GeomusicaVideoItem[]
}

/** Vídeos partilhados; títulos alinhados ao site original. */
export const GEOMUSICA_VIDEO_GROUPS: readonly GeomusicaVideoGroup[] = [
  {
    videos: [
      { youtubeId: "r48myKof8zA", title: "Cat Whiskers", aspect: "4/3" },
      { youtubeId: "X2Qv8LC-evk", title: "Seven Five" },
      { youtubeId: "ZdDT3hj7L2M", title: "Harmonic #3" },
      { youtubeId: "8Ci35ZpgQI0", title: "Hexagon #1" },
      { youtubeId: "hW9NpnWiwNE", title: "Geo Synth Improv session 210820" },
      { youtubeId: "8ZYd8SALg1g", title: "geoMusica demo 2 – ambient experimental" },
    ],
  },
  {
    videos: [
      { youtubeId: "arLOAssb8zg", title: "Piano #6" },
      { youtubeId: "EfZ6E06FNF4", title: "On Fiveness #1" },
    ],
  },
  {
    videos: [
      { youtubeId: "RPvo5cV7gvc", title: "Improv session" },
      { youtubeId: "glJpTAwNoHo", title: "Psy Tech #2" },
    ],
  },
] as const

export type GeomusicaPageStrings = {
  backHome: string
  title: string
  intro: string[]
  derivativeLead: string
  derivativeUrl: string
  sectionTitles: [string, string, string]
  dedicationTitle: string
  dedicationBody: string
  supportTitle: string
  supportUrl: string
  supportBody: string
  thanksTitle: string
  thanksFamily: string
  thanksTeacher: string
  thanksDevelopersLead: string
  thanksContributorLines: string[]
  thanksClosing: string
}

const EN: GeomusicaPageStrings = {
  backHome: "← Home",
  title: "geoMusica",
  intro: [
    "GeoMusica is a tool to make music with geometry. Compose geometries and listen to the musical translation in realtime, perform and experiment with the Sacred Geometry inspired methods and be amazed by the beauty hidden within the Mathemagics.",
    "It is structured as a multi-layer composing tool, focused on geometrical parameters that can be set with special proportions and shapes, and should be used has a MIDI note generator, connected with your favorite electronic instruments to reproduce the musical output. Therefore, should be considered as a generative MIDI sequencer in terms of families of musical software, and its aimed at musicians that use electronic tools for creation.",
    "This project started as a personal research on Sacred Geometry studies, within the scope of the 3 year introdutory course that I attended led by Prof. Luis Elye, to the amazing field of knowledge hidden inside the Traditional geometrical legacy. with roots lost in time, this knowledge proved fundamental in bringing ordered geometrical shapes that generate meaningful musical correspondance, and revealing a hidden structural connection between geometry and music that becames obvious when exploring this tool.",
    "As the research evolved, I’ve managed to do some outputs in form of talks and live concerts, that generated a surprising reaction on the interested audience, namely my fellow colleagues geometers, the TD artists community, and the Boom Festival community. that feedback gave meaning to the publication and release of this tool.",
    "The aim for publication is to support the further development of this tool, either by other developers in the open-source spirit, or by anyone that use this tool and want to help supporting via the Patreon platform.",
    "It is also a way of retribution to the fantastic TouchDesigner community, that along the years of using TD allways gave generously without asking for return.",
  ],
  derivativeLead: "Article on Derivative.ca",
  derivativeUrl: "https://derivative.ca/community-post/creating-music-geometry-geomusica/63243",
  sectionTitles: [
    "Examples without temporal or spectral quantization",
    "Examples without temporal quantization, with spectral quantization (equal temperament)",
    "Examples with temporal and spectral quantization (equal temperament)",
  ],
  dedicationTitle: "Dedication",
  dedicationBody:
    "this public release of geoMusica is dedicated to my grandfather Francisco Alves Gato. I did'nt had the luck of meeting him personally, but I know that he, has many of us before and certainly after, was one of the humans that felt the sparkle of the search for Knowledge and Beauty, which led him to research on a special tuning for the Portuguese Guitar. I know we would had good times together playing with geoMusica!",
  supportTitle: "Please support development",
  supportUrl: "https://www.patreon.com/GeoMusica",
  supportBody:
    "This Patreon page is made for supporting the research and development of the GeoMusica software. If you like to use GeoMusica, or if you just want to help, please join in!",
  thanksTitle: "Special thanks",
  thanksFamily:
    "To my wife and kids that generously agreed to share our time with this life project.",
  thanksTeacher: "Special thanks to my Sacred Geometry teacher: Luis Elye.",
  thanksDevelopersLead:
    "Special thanks to these developers from the TD Community that contributed with inspiration, code or other to this project:",
  thanksContributorLines: [
    "Fermat Spiral .toe inspiration – Calvin Zirk",
    "TDMorph – Darien Brito",
    "Line intersections python script – Vytenis Zagorskis",
    "howtoaudio (in TouchDesigner) – Owen Kirby",
    "eventCHOP usage for ultraoptimization on geoMusicaEngine – Wieland Hilker",
    "wisdom along the way – Ivan delSol, Idzard Kwadijk, Felix Larreta, Roy Gerritsen, Tim Gerritsen",
    "private beta team – Darien Brito, Roy Gerritsen, Tim Gerritsen",
  ],
  thanksClosing:
    "And last but not least, shout out to the Derivative team, without you guys this would not be possible!",
}

const PT: GeomusicaPageStrings = {
  backHome: "← Início",
  title: "geoMusica",
  intro: [
    "GeoMusica é uma ferramenta que permite fazer música a partir de geometria. Permite compor formas geométricas e ouvir a tradução musical em tempo real, usando métodos inspirados em Geometria Sagrada. Tenta revelar a beleza escondida dentro das matemágicas.",
    "Está estruturada como uma ferramenta de composição multi-camadas, focada em parâmetros que podem ser definidos com proporções e formas especiais, e é usada como um gerador de notas musicais MIDI, ligada a instrumentos musicais electrónicos para reproduzir o resultado musical. Assim sendo, deve ser considerada como um sequenciador MIDI generativo em termos das famílias de software musical, e está destinada a ser usada por músicos que usem ferramentas electrónicas para criação.",
    "Este projecto começou como pesquisa pessoal nos estudos de Geometria Sagrada, dentro do âmbito de um curso de 3 anos de introdução ao campo de conhecimento pertencente ao legado dos métodos tradicionais, dado pelo prof. Luis Elye. Com as suas raízes perdidas no tempo, este conhecimento provou-se fundamental para revelar formas geométricas ordenadas que produzem correspondência musical significante, e para revelar também uma ligação estrutural oculta entre a geometria e a música que se torna óbvia quando se explora esta ferramenta.",
    "À medida que a investigação avançou, consegui apresentar o trabalho em palestras e concertos ao vivo, com uma reacção surpreendente por parte do público interessado — colegas geometers, a comunidade de artistas TouchDesigner e a comunidade do Boom Festival. Esse feedback deu sentido à publicação e à disponibilização desta ferramenta.",
    "O objectivo da publicação é apoiar o desenvolvimento contínuo desta ferramenta, quer por outros programadores no espírito open source, quer por quem a utilize e queira apoiar através da plataforma Patreon.",
    "É também uma forma de retribuir à fantástica comunidade TouchDesigner que, ao longo dos anos de utilização do TD, sempre deu generosamente sem pedir nada em troca.",
  ],
  derivativeLead: "Artigo em Derivative.ca",
  derivativeUrl: "https://derivative.ca/community-post/creating-music-geometry-geomusica/63243",
  sectionTitles: [
    "Exemplos sem quantização temporal nem espectral",
    "Exemplos sem quantização temporal, com quantização espectral (temperamento igual)",
    "Exemplos com quantização temporal e espectral (temperamento igual)",
  ],
  dedicationTitle: "Dedicação",
  dedicationBody:
    "Esta versão pública do geoMusica é dedicada ao meu avô Francisco Alves Gato. Não tive a sorte de o conhecer pessoalmente, mas sei que ele, como muitos de nós antes e certamente depois, foi uma das pessoas que sentiu o fascínio da busca pelo Conhecimento e pela Beleza, o que o levou a investigar uma afinação especial para a Guitarra Portuguesa. Sei que teríamos bons momentos a brincar com o geoMusica!",
  supportTitle: "Apoia o desenvolvimento",
  supportUrl: "https://www.patreon.com/GeoMusica",
  supportBody:
    "Esta página no Patreon serve para apoiar a investigação e o desenvolvimento do software GeoMusica. Se gostas de usar o GeoMusica, ou se apenas queres ajudar, junta-te!",
  thanksTitle: "Agradecimentos especiais",
  thanksFamily:
    "À minha mulher e aos meus filhos, que aceitaram partilhar o nosso tempo com este projecto de vida.",
  thanksTeacher: "Um obrigado especial ao meu professor de Geometria Sagrada: Luis Elye.",
  thanksDevelopersLead:
    "Um obrigado especial a estes programadores da comunidade TD que contribuíram com inspiração, código ou outro apoio para este projecto:",
  thanksContributorLines: EN.thanksContributorLines,
  thanksClosing:
    "E por último, mas não menos importante, um viva à equipa Derivative — sem vocês isto não seria possível!",
}

export const GEOMUSICA_PAGE_COPY: Record<LocaleCode, GeomusicaPageStrings> = {
  en: EN,
  pt: PT,
}

export function getGeomusicaPageCopy(locale: LocaleCode): GeomusicaPageStrings {
  return GEOMUSICA_PAGE_COPY[locale]
}
