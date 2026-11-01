// Tekster for storskjerm-mappa (bokmål). Lokal i mappa så den kan kopieres
// til andre Sunday-apper uten å dra med seg appens locale-fil.
export const tekst = {
  knapp: "Vis på storskjerm",
  tittel: "Vis på storskjerm",
  intro: "Velg hvordan velkomstskjermen skal vises på TV eller projektor. Skjermen har ingen knapper og hviler selv.",
  urlLabel: "Adressen til skjermen",
  kopier: "Kopier",
  kopiert: "Kopiert",
  kopierFeilet: "Kunne ikke kopiere – merk adressen og kopier selv.",
  lukk: "Lukk",
  anbefalt: "Anbefalt for din enhet",
  eget: {
    tittel: "Åpne skjermen i eget vindu",
    hjelp: "Du beholder admin-siden her. Skjerm-vinduet kan flyttes til projektoren eller castes. Trykk F i vinduet for fullskjerm.",
    knapp: "Åpne skjermen i eget vindu",
    flyttet: "Skjermen ble flyttet til den andre skjermen. Trykk F for fullskjerm.",
    flyttHint: "Dra vinduet til TV-en eller projektoren og trykk F for fullskjerm.",
    blokkert: "Nettleseren blokkerte det nye vinduet. Tillat popup-vinduer for denne siden og prøv igjen.",
  },
  direkte: {
    tittel: "Direkte i TV eller PC",
    hjelp: "Har TV-en en nettleser (smart-TV), eller er en PC koblet til med HDMI, åpner du bare adressen over der og trykker F for fullskjerm. Ingen innlogging trengs.",
  },
  chromecast: {
    tittel: "Chromecast / Google TV",
    steg1: "Åpne skjermen i eget vindu (knappen over).",
    steg2: "I Chrome-menyen ⋮ velger du «Cast …» (Lagre og del → Cast), og velger «Cast fane».",
    steg3: "Velg TV-en i listen. Trykk F i skjerm-vinduet for fullskjerm.",
    ikkeChromium: "Dette krever Chrome eller Edge på PC eller Chromebook. Åpne siden i en av dem for å caste.",
  },
  apple: {
    tittel: "Apple TV (AirPlay)",
    mac1: "Mac: åpne Kontrollsenter → Skjermspeiling og velg Apple TV.",
    mac2: "Velg «Bruk som separat skjerm».",
    mac3: "Åpne skjermen i eget vindu (knappen over) og dra den over til Apple TV-en. Trykk F for fullskjerm.",
    ios1: "iPad/iPhone: åpne skjerm-adressen i Safari, deretter Kontrollsenter → Skjermspeiling og velg Apple TV.",
    ios2: "Skjermen fyller bildet av seg selv.",
  },
} as const;
