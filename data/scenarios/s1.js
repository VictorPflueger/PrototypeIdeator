// Scenario S1, Tidewell Lines: a fictional container carrier based in Bremen. Its three inputs are the
// handoff files of the Business Model Canvas, SWOT and PESTEL Challengers, written as stand-ins until the
// challengers export their own (PLAN.md §5.3). The run reads them without a model call, the Reader
// proposes three merges on their titles, the Ideator proposes eight prototypes and the Writer writes the
// summary. Every text exists in English and German, side by side; figures in the agents' prose are
// placeholders the engine fills. What the scenario says about the world is listed in DATA_SOURCES.md, §1.
// Tidewell Lines and its own figures are invented.

import { L, standin, item, aiItem, kpi, source } from "./standin.js";

/** The facts S1 cites, as DATA_SOURCES.md lists them. */
export const FACTS = {
  ETS: { id: "S1-ETS", url: "https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector_en", title: L("European Commission: Reducing emissions from the shipping sector", "Europäische Kommission: Emissionen der Schifffahrt senken"), read_on: "2026-11-23" },
  FUELEU: { id: "S1-FUELEU", url: "https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en", title: L("European Commission: FuelEU Maritime", "Europäische Kommission: FuelEU Maritime"), read_on: "2026-11-23" },
  SUEZ: { id: "S1-SUEZ", url: "https://www.rivieramm.com/news-content-hub/full-suez-return-clouds-box-ship-outlook-as-one-becomes-latest-to-resume-transits-90632", title: L("Riviera: Full Suez return clouds box ship outlook", "Riviera: Volle Rückkehr zum Suezkanal trübt den Ausblick für Containerschiffe"), read_on: "2026-11-23" },
  WCI: { id: "S1-WCI", url: "https://www.drewry.co.uk/WCI", title: L("Drewry: World Container Index", "Drewry: World Container Index"), read_on: "2026-11-23" },
  COUNT: { id: "S1-COUNT", url: "https://transport.ec.europa.eu/news-events/news/commission-welcomes-political-agreement-new-rules-harmonise-transport-emissions-calculations-eu-2025-11-06_en", title: L("European Commission: Agreement on CountEmissionsEU", "Europäische Kommission: Einigung zu CountEmissionsEU"), read_on: "2026-11-23" }
};
const S = (f) => source(f);

const COMPANY = {
  name: "Tidewell Lines",
  sector: "transport_logistics",
  country: "DE",
  description: L("Container carrier based in Bremen, with about 40 ships on Europe–Asia, transatlantic and feeder services", "Containerreederei mit Sitz in Bremen, rund 40 Schiffe in Europa–Asien-, Transatlantik- und Zubringerdiensten"),
  fictional: true
};

// ---- the Business Model Canvas Challenger's file ---------------------------------------------------------

const BMC = {
  tool: "bmc",
  created: "2026-11-23T08:10:00Z",
  company: COMPANY,
  items: {
    partners: [item("partners-1", L("Port terminals in Bremerhaven, Rotterdam and Shanghai", "Hafenterminals in Bremerhaven, Rotterdam und Shanghai")), item("partners-2", L("Bunker suppliers for heavy fuel oil and LNG", "Bunkerlieferanten für Schweröl und LNG"))],
    activities: [item("activities-1", L("Running weekly loops with fixed call days", "Wöchentliche Dienste mit festen Anlauftagen fahren")), item("activities-2", L("Pricing contracts and spot bookings", "Verträge und Spotbuchungen bepreisen")), item("activities-3", L("Moving empty containers to where cargo waits", "Leercontainer dorthin bringen, wo Ladung wartet"))],
    resources: [item("resources-1", L("About 40 ships, the older ones on heavy fuel oil", "Rund 40 Schiffe, die älteren mit Schweröl")), item("resources-2", L("Dual-fuel newbuilds", "Dual-Fuel-Neubauten")), item("resources-3", L("An own container fleet", "Eine eigene Containerflotte"))],
    value: [item("value-1", L("Weekly Europe–Asia loops with fixed call days", "Wöchentliche Europa–Asien-Dienste mit festen Anlauftagen")), aiItem("value-2", L("Emissions statement per container", "Emissionsnachweis je Container"), L("Shippers report transport emissions to their customers", "Verlader berichten ihren Kunden die Transportemissionen"))],
    relationships: [item("relationships-1", L("Account managers for large shippers", "Kundenbetreuer für große Verlader")), item("relationships-2", L("Spot requests answered by e-mail", "Spotanfragen per E-Mail beantwortet"))],
    channels: [item("channels-1", L("Own sales offices", "Eigene Vertriebsbüros")), item("channels-2", L("Forwarders' booking platforms", "Buchungsplattformen der Spediteure"))],
    segments: [item("segments-1", L("Large shippers on annual contracts", "Große Verlader mit Jahresverträgen")), item("segments-2", L("Small and mid-sized shippers booking spot", "Kleine und mittlere Verlader, die spot buchen"))],
    costs: [item("costs-1", L("Bunker fuel", "Bunkertreibstoff")), item("costs-2", L("Emission allowances under the EU emissions trading system", "Emissionszertifikate im EU-Emissionshandel")), item("costs-3", L("Charter hire", "Chartermieten"))],
    revenue: [item("revenue-1", L("Freight on annual contracts, repriced each quarter", "Fracht aus Jahresverträgen, jedes Quartal neu bepreist")), item("revenue-2", L("Spot freight", "Spotfracht")), item("revenue-3", L("Emissions surcharge", "Emissionszuschlag"))]
  },
  issues: [
    {
      id: "I1", type: "regulation", areas: ["costs", "revenue"], items: ["costs-2", "revenue-3"], impact: 4, likelihood: 4, horizon: "now",
      title: L("Emission allowances raise the cost of every European call", "Emissionszertifikate verteuern jeden Anlauf in Europa"),
      description: L(
        "Voyages to and from EU ports need emission allowances: in 2026 for 70 % of the 2025 emissions, from 2027 for all of them. The surcharge covers only part of the cost.",
        "Fahrten von und zu EU-Häfen brauchen Emissionszertifikate: 2026 für 70 % der Emissionen von 2025, ab 2027 für alle. Der Zuschlag deckt nur einen Teil der Kosten."
      ),
      kpis: [
        kpi("transport_logistics.ets_cost_per_teu", "up", 12, 25, L("Allowance price times emissions per container", "Zertifikatspreis mal Emissionen je Container")),
        kpi("transport_logistics.cost_per_teu", "up", 3, 6, L("Allowance cost added to the cost per container", "Zertifikatskosten auf die Kosten je Container"))
      ],
      eur: [2000000, 6000000], basis: L("Containers on Europe services times the uncovered cost per container", "Container in Europadiensten mal die ungedeckten Kosten je Container"),
      evidence: [S(FACTS.ETS)], confidence: "medium"
    },
    {
      id: "I2", type: "geopolitics", areas: ["activities", "value"], items: ["activities-1", "value-1"], impact: 3, likelihood: 4, horizon: "now",
      title: L("Routes swing between Suez and the Cape", "Die Routen pendeln zwischen Suez und dem Kap"),
      description: L(
        "Carriers are moving back to the Suez Canal: 60 % of Asia–Europe capacity uses it again. Each switch changes transit times, fuel and the ships a weekly loop needs.",
        "Die Reedereien kehren zum Suezkanal zurück: 60 % der Kapazität zwischen Asien und Europa fährt wieder hindurch. Jeder Wechsel ändert Laufzeiten, Treibstoff und die Zahl der Schiffe je Wochendienst."
      ),
      kpis: [
        kpi("transport_logistics.schedule_reliability", "down", 5, 15, L("Loops that change route mid-season miss call days", "Dienste, die mitten in der Saison die Route wechseln, verfehlen Anlauftage")),
        kpi("transport_logistics.fuel_cost_per_teu", "up", 4, 10, L("Longer routes on the loops still sailing round the Cape", "Längere Wege der Dienste, die noch um das Kap fahren"))
      ],
      eur: [1000000, 3000000], basis: L("Extra fuel and charter cost per loop, times the loops that switch", "Mehrkosten für Treibstoff und Charter je Dienst, mal die wechselnden Dienste"),
      evidence: [S(FACTS.SUEZ)], confidence: "medium"
    },
    {
      id: "I3", type: "market", areas: ["revenue"], items: ["revenue-1", "revenue-2"], impact: 4, likelihood: 3, horizon: "now",
      title: L("Freight rates swing faster than contracts reprice", "Frachtraten schwanken schneller, als Verträge nachziehen"),
      description: L(
        "Drewry's World Container Index stood at $4,176 per 40 ft container on 19 November 2026, 126 % up on the year. Contract rates reprice once a quarter, so margins swing with the spot market.",
        "Drewrys World Container Index lag am 19. November 2026 bei 4.176 $ je 40-Fuß-Container, 126 % über dem Vorjahr. Vertragsraten werden einmal im Quartal angepasst, also schwanken die Margen mit dem Spotmarkt."
      ),
      kpis: [
        kpi("transport_logistics.average_freight_rate", "down", 10, 30, L("Spot rates falling from their high while contracts lag", "Spotraten fallen vom Hoch, die Verträge hinken hinterher")),
        kpi("transport_logistics.vessel_utilisation", "down", 3, 8, L("Shippers move volume to cheaper spot offers", "Verlader verlagern Mengen auf günstigere Spotangebote"))
      ],
      eur: [2000000, 7000000], basis: L("Contract volume times the gap between spot and contract rates over a quarter", "Vertragsmenge mal der Abstand zwischen Spot- und Vertragsrate über ein Quartal"),
      evidence: [S(FACTS.WCI)], confidence: "medium"
    },
    {
      id: "I4", type: "competition", areas: ["channels", "relationships", "segments"], items: ["channels-2", "relationships-2", "segments-2"], impact: 3, likelihood: 3, horizon: "1_to_3_years",
      title: L("Digital forwarders own the booking screen", "Digitale Spediteure besitzen den Buchungsbildschirm"),
      description: L(
        "Small and mid-sized shippers book on digital forwarders' platforms, which quote in minutes. Tidewell answers spot requests by e-mail, within a working day.",
        "Kleine und mittlere Verlader buchen auf den Plattformen digitaler Spediteure, die in Minuten anbieten. Tidewell beantwortet Spotanfragen per E-Mail, innerhalb eines Arbeitstags."
      ),
      kpis: [kpi("transport_logistics.online_booking_share", "down", 5, 15, L("Spot bookings that go to forwarders instead", "Spotbuchungen, die stattdessen an Spediteure gehen"))],
      eur: [800000, 2400000], basis: L("Small shippers' volume lost a year times the margin per container", "Verlorene Menge kleiner Verlader im Jahr mal die Marge je Container"),
      evidence: [], confidence: "low"
    },
    {
      id: "I5", type: "customer", areas: ["value", "relationships"], items: ["value-2", "relationships-1"], impact: 3, likelihood: 4, horizon: "1_to_3_years",
      title: L("Shippers want an emissions statement per container", "Verlader wollen einen Emissionsnachweis je Container"),
      description: L(
        "Under CountEmissionsEU, companies that publish their transport emissions count them with one method based on EN ISO 14083. Large shippers ask for emissions per container; Tidewell sends fleet averages.",
        "Mit CountEmissionsEU zählen Unternehmen, die ihre Transportemissionen veröffentlichen, nach einer Methode auf Basis von EN ISO 14083. Große Verlader fragen nach Emissionen je Container; Tidewell schickt Flottendurchschnitte."
      ),
      kpis: [kpi("transport_logistics.co2_per_teu_km", "down", 3, 8, L("Statements per voyage show where loading and routing cut emissions", "Nachweise je Fahrt zeigen, wo Beladung und Routing Emissionen senken"))],
      eur: [500000, 2500000], basis: L("Contracts of shippers that require statements, times their margin", "Verträge der Verlader, die Nachweise verlangen, mal ihre Marge"),
      evidence: [S(FACTS.COUNT)], confidence: "medium"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "mitigate", chosen: true, title: L("Charge the full allowance cost through a published surcharge", "Die vollen Zertifikatskosten über einen veröffentlichten Zuschlag weitergeben"), first_step: L("Pricing sets the surcharge formula for the next quarter", "Das Pricing legt die Zuschlagsformel für das nächste Quartal fest"), owner: L("Commercial", "Vertrieb"), changes: [{ area: "revenue", action: "change", item: "revenue-3", text: L("Emissions surcharge per container, published monthly", "Emissionszuschlag je Container, monatlich veröffentlicht") }], residual: [1000000, 3000000, 2], upside: null, effort: "M", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") },
    { id: "R2", issue: "I2", kind: "mitigate", chosen: true, title: L("Choose each Asia loop's route every week", "Die Route jedes Asiendienstes wöchentlich wählen"), first_step: L("Network planning reviews the Asia loops every Monday", "Die Netzplanung prüft die Asiendienste jeden Montag"), owner: L("Network planning", "Netzplanung"), changes: [{ area: "activities", action: "add", text: L("Weekly route review per Asia loop", "Wöchentliche Routenprüfung je Asiendienst") }], residual: [500000, 1500000, 3], upside: null, effort: "M", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R3", issue: "I3", kind: "mitigate", chosen: true, title: L("Link part of the contract rates to a published index", "Einen Teil der Vertragsraten an einen veröffentlichten Index koppeln"), first_step: L("Sales offers index-linked rates in the next tender round", "Der Vertrieb bietet in der nächsten Ausschreibungsrunde indexierte Raten an"), owner: L("Sales", "Vertrieb"), changes: [{ area: "revenue", action: "change", item: "revenue-1", text: L("Contract rates linked to a published index each month", "Vertragsraten monatlich an einen veröffentlichten Index gekoppelt") }], residual: [1000000, 3000000, 2], upside: null, effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") },
    { id: "R4", issue: "I4", kind: "advantage", chosen: true, title: L("Quote spot bookings online within minutes", "Spotbuchungen online in Minuten anbieten"), first_step: L("Sales puts the spot tariff on the website", "Der Vertrieb stellt den Spottarif auf die Website"), owner: L("Sales", "Vertrieb"), changes: [{ area: "channels", action: "add", text: L("Online spot quotes and bookings", "Spotangebote und Buchungen online") }], residual: [400000, 1200000, 2], upside: [300000, 1000000, 3], effort: "M", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") },
    { id: "R5", issue: "I5", kind: "advantage", chosen: true, title: L("Send an emissions statement per container with every invoice", "Mit jeder Rechnung einen Emissionsnachweis je Container schicken"), first_step: L("The sustainability team pilots statements with three large shippers", "Das Nachhaltigkeitsteam erprobt die Nachweise mit drei großen Verladern"), owner: L("Sustainability", "Nachhaltigkeit"), changes: [{ area: "value", action: "add", text: L("Emissions statement per container, counted by EN ISO 14083", "Emissionsnachweis je Container, gezählt nach EN ISO 14083") }], residual: null, upside: [500000, 1500000, 3], effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") }
  ],
  score: { name: "resilience", scale: "0-100", before: 64, after: 78 },
  pressure: { label: L("Blocks under pressure", "Bausteine unter Druck"), before: 5, after: 2, of: 9 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Emissionskosten und schwankende Raten setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Fünf Themen drücken auf das Geschäftsmodell von Tidewell Lines. Mit den gewählten Antworten bleiben ${m(f.left_eur_year)} im Jahr im Risiko, und ${m(f.upside_eur_year)} Chance kommen hinzu.` }
    : { headline: `Emission costs and swinging rates put ${m(f.at_stake_eur_year)} a year at risk`, text: `Five issues press on Tidewell Lines' business model. The chosen responses leave ${m(f.left_eur_year)} a year at risk and add ${m(f.upside_eur_year)} of upside.` })
};

// ---- the SWOT Challenger's file -------------------------------------------------------------------------

const SWOT = {
  tool: "swot",
  created: "2026-11-23T08:20:00Z",
  company: COMPANY,
  items: {
    strengths: [item("strengths-1", L("Weekly loops with fixed call days", "Wöchentliche Dienste mit festen Anlauftagen")), item("strengths-2", L("Dual-fuel newbuilds", "Dual-Fuel-Neubauten"))],
    weaknesses: [item("weaknesses-1", L("Older ships on heavy fuel oil", "Ältere Schiffe mit Schweröl")), item("weaknesses-2", L("Spot quotes by e-mail", "Spotangebote per E-Mail")), item("weaknesses-3", L("Empty containers pile up in Asian ports", "Leercontainer stauen sich in asiatischen Häfen"))],
    opportunities: [item("opportunities-1", L("Shippers ask for emissions per container", "Verlader fragen nach Emissionen je Container")), item("opportunities-2", L("Suez routes open again", "Die Suezroute öffnet wieder"))],
    threats: [item("threats-1", L("Emissions trading costs rise every year", "Die Kosten des Emissionshandels steigen jedes Jahr")), item("threats-2", L("Digital forwarders take small shippers", "Digitale Spediteure übernehmen kleine Verlader")), aiItem("threats-3", L("Customers dispute surcharge invoices", "Kunden beanstanden Rechnungen mit Zuschlägen"), L("New surcharges often raise invoice queries", "Neue Zuschläge lösen oft Rückfragen zu Rechnungen aus"), "low")]
  },
  issues: [
    {
      id: "I1", type: "regulation", areas: ["threats"], items: ["threats-1"], impact: 4, likelihood: 4, horizon: "now",
      title: L("Emissions trading costs press on margins", "Die Kosten des Emissionshandels drücken auf die Margen"),
      description: L("The EU emissions trading system covers shipping, and the share of emissions carriers pay for rises every year until 2027.", "Der EU-Emissionshandel gilt für die Schifffahrt, und der Anteil der Emissionen, für den Reedereien zahlen, steigt jedes Jahr bis 2027."),
      kpis: [kpi("transport_logistics.cost_per_teu", "up", 3, 8, L("Allowance cost on every European voyage", "Zertifikatskosten auf jeder Europafahrt"))],
      eur: [1500000, 4500000], basis: L("Allowance price times the fleet's emissions on EU voyages", "Zertifikatspreis mal die Emissionen der Flotte auf EU-Fahrten"),
      evidence: [S(FACTS.ETS)], confidence: "medium"
    },
    {
      id: "I2", type: "operations", areas: ["weaknesses"], items: ["weaknesses-3"], impact: 3, likelihood: 4, horizon: "now",
      title: L("Empty containers pile up in the wrong ports", "Leercontainer stehen in den falschen Häfen"),
      description: L("More boxes go from Europe to Asia full than come back full, so empty containers wait in Asian ports while European customers wait for boxes.", "Mehr Container fahren voll nach Asien als voll zurück. Leere Container warten in asiatischen Häfen, während Kunden in Europa auf Container warten."),
      kpis: [kpi("transport_logistics.empty_repositioning_cost", "up", 10, 20, L("Empties shipped back at short notice", "Leercontainer, die kurzfristig zurückgeschickt werden"))],
      eur: [1000000, 3000000], basis: L("Empty moves a year times the cost of each short-notice move", "Leerfahrten im Jahr mal die Kosten jeder kurzfristigen Fahrt"),
      evidence: [], confidence: "medium"
    },
    {
      id: "I3", type: "competition", areas: ["threats"], items: ["threats-2"], impact: 3, likelihood: 3, horizon: "1_to_3_years",
      title: L("Digital forwarders take small shippers", "Digitale Spediteure übernehmen kleine Verlader"),
      description: L("Small shippers compare quotes on forwarders' platforms and book where the answer comes first.", "Kleine Verlader vergleichen Angebote auf den Plattformen der Spediteure und buchen dort, wo die Antwort zuerst kommt."),
      kpis: [kpi("transport_logistics.online_booking_share", "down", 5, 10, L("Spot volume booked elsewhere", "Spotmenge, die anderswo gebucht wird"))],
      eur: [500000, 2000000], basis: L("Small shippers' volume times the margin per container", "Menge kleiner Verlader mal die Marge je Container"),
      evidence: [], confidence: "low"
    },
    {
      id: "I4", type: "customer", areas: ["threats"], items: ["threats-3"], impact: 2, likelihood: 4, horizon: "now",
      title: L("Customers dispute the new surcharge invoices", "Kunden beanstanden die neuen Zuschlagsrechnungen"),
      description: L("Each new surcharge line raises questions from customers' accounts teams, and disputed invoices are paid late.", "Jede neue Zuschlagszeile wirft Fragen in der Buchhaltung der Kunden auf, und beanstandete Rechnungen werden spät bezahlt."),
      kpis: [kpi("general.customer_churn", "up", 1, 3, L("Shippers who leave after repeated disputes", "Verlader, die nach wiederholten Beanstandungen gehen"))],
      eur: null, basis: L("Not priced: the dispute rate is not measured yet", "Nicht beziffert: Die Quote der Beanstandungen wird noch nicht gemessen"),
      evidence: [], confidence: "low"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "mitigate", chosen: true, title: L("Pass the allowance cost on in a monthly surcharge", "Die Zertifikatskosten über einen monatlichen Zuschlag weitergeben"), first_step: L("Pricing publishes the surcharge formula", "Das Pricing veröffentlicht die Zuschlagsformel"), owner: L("Commercial", "Vertrieb"), changes: [{ action: "rate", item: "threats-1", from: 4, to: 3 }], residual: [500000, 1500000, 2], upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R2", issue: "I2", kind: "mitigate", chosen: true, title: L("Plan empty moves a week ahead from the booking forecast", "Leerfahrten eine Woche im Voraus aus der Buchungsprognose planen"), first_step: L("Equipment control sets up a weekly forecast meeting", "Die Equipmentsteuerung richtet eine wöchentliche Prognoserunde ein"), owner: L("Equipment control", "Equipmentsteuerung"), changes: [{ action: "rate", item: "weaknesses-3", from: 3, to: 2 }], residual: [500000, 1500000, 3], upside: null, effort: "M", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") },
    { id: "R3", issue: "I3", kind: "advantage", chosen: true, title: L("Sell spot capacity on the forwarders' platforms too", "Spotkapazität auch auf den Plattformen der Spediteure verkaufen"), first_step: L("Sales lists two Asia loops on one platform", "Der Vertrieb stellt zwei Asiendienste auf eine Plattform"), owner: L("Sales", "Vertrieb"), changes: [{ action: "rate", item: "threats-2", from: 3, to: 2 }], residual: null, upside: [200000, 600000, 3], effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R4", issue: "I4", kind: "mitigate", chosen: true, title: L("Explain each surcharge line on the invoice", "Jede Zuschlagszeile auf der Rechnung erklären"), first_step: L("Billing adds the basis of each surcharge to the invoice", "Die Fakturierung ergänzt die Grundlage jedes Zuschlags auf der Rechnung"), owner: L("Billing", "Fakturierung"), changes: [{ action: "rate", item: "threats-3", from: 2, to: 1 }], residual: null, upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") }
  ],
  score: { name: "efe", scale: "1-4", before: 2.35, after: 2.9 },
  pressure: { label: L("Items challenged", "Hinterfragte Punkte"), before: 4, after: 1, of: 6 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Emissionshandel und leere Container setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Vier Themen aus Schwächen und Risiken. Mit den gewählten Strategien bleiben ${m(f.left_eur_year)} im Jahr im Risiko.` }
    : { headline: `Emissions trading and empty boxes put ${m(f.at_stake_eur_year)} a year at risk`, text: `Four issues from the weaknesses and threats. The chosen strategies leave ${m(f.left_eur_year)} a year at risk.` })
};

// ---- the PESTEL Challenger's file -----------------------------------------------------------------------

const PESTEL = {
  tool: "pestel",
  created: "2026-11-23T08:30:00Z",
  company: COMPANY,
  items: {
    political: [item("political-1", L("Shipping lanes through the Red Sea open again", "Die Schifffahrtswege durch das Rote Meer öffnen wieder"))],
    economic: [item("economic-1", L("Freight rates swing with capacity", "Frachtraten schwanken mit der Kapazität"))],
    social: [item("social-1", L("Shippers want lower-carbon transport", "Verlader wollen Transport mit weniger CO2"))],
    technological: [item("technological-1", L("Dual-fuel engines and data from on board", "Dual-Fuel-Motoren und Daten von Bord"))],
    environmental: [item("environmental-1", L("FuelEU Maritime limits the greenhouse-gas intensity of fuel", "FuelEU Maritime begrenzt die Treibhausgasintensität des Treibstoffs"))],
    legal: [item("legal-1", L("EU emissions trading covers shipping", "Der EU-Emissionshandel gilt für die Schifffahrt")), item("legal-2", L("CountEmissionsEU sets one counting method", "CountEmissionsEU legt eine Zählmethode fest"))]
  },
  issues: [
    {
      id: "I1", type: "legal", areas: ["legal", "environmental"], items: ["legal-1"], impact: 4, likelihood: 5, horizon: "now",
      title: L("Emissions trading reaches all emissions from 2027", "Der Emissionshandel erfasst ab 2027 alle Emissionen"),
      description: L("Carriers surrender allowances for 70 % of their 2025 emissions in 2026 and for all of them from 2027. Methane and nitrous oxide count from 2026.", "Reedereien geben 2026 Zertifikate für 70 % ihrer Emissionen von 2025 ab und ab 2027 für alle. Methan und Lachgas zählen ab 2026."),
      kpis: [kpi("transport_logistics.ets_cost_per_teu", "up", 30, 45, L("The share paid for rises to all emissions", "Der bezahlte Anteil steigt auf alle Emissionen"))],
      eur: [2000000, 5000000], basis: L("Allowance price times the fleet's emissions on EU voyages, at full coverage", "Zertifikatspreis mal die Emissionen der Flotte auf EU-Fahrten, bei voller Abdeckung"),
      evidence: [S(FACTS.ETS)], confidence: "high"
    },
    {
      id: "I2", type: "environmental", areas: ["environmental"], items: ["environmental-1"], impact: 3, likelihood: 4, horizon: "now",
      title: L("FuelEU Maritime limits hit the older ships", "Die Grenzwerte von FuelEU Maritime treffen die älteren Schiffe"),
      description: L("Since January 2025, ships above 5,000 gross tonnage calling at EU ports must cut the greenhouse-gas intensity of their energy, by 2 % at first and up to 80 % by 2050. A ship above the limit pays a penalty unless it pools with cleaner ships.", "Seit Januar 2025 müssen Schiffe über 5.000 BRZ, die EU-Häfen anlaufen, die Treibhausgasintensität ihrer Energie senken, zuerst um 2 %, bis 2050 um bis zu 80 %. Ein Schiff über dem Grenzwert zahlt eine Strafe, wenn es nicht mit saubereren Schiffen einen Pool bildet."),
      kpis: [
        kpi("transport_logistics.co2_per_teu_km", "down", 2, 6, L("Cleaner fuel on the ships above the limit", "Saubererer Treibstoff auf den Schiffen über dem Grenzwert")),
        kpi("transport_logistics.fuel_cost_per_teu", "up", 2, 6, L("Biofuel blends cost more than heavy fuel oil", "Biokraftstoffmischungen kosten mehr als Schweröl"))
      ],
      eur: [400000, 1600000], basis: L("Penalty for the energy above the limit, for the ships above it", "Strafe für die Energie über dem Grenzwert, für die Schiffe darüber"),
      evidence: [S(FACTS.FUELEU)], confidence: "medium"
    },
    {
      id: "I3", type: "political", areas: ["political"], items: ["political-1"], impact: 3, likelihood: 4, horizon: "now",
      title: L("Carriers move back to Suez", "Die Reedereien kehren zum Suezkanal zurück"),
      description: L("57 container ships passed the canal in the week to 15 November 2026, by Drewry's count, and 60 % of Asia–Europe capacity uses it again.", "In der Woche bis zum 15. November 2026 passierten nach Drewrys Zählung 57 Containerschiffe den Kanal, und 60 % der Kapazität zwischen Asien und Europa fährt wieder hindurch."),
      kpis: [kpi("transport_logistics.schedule_reliability", "down", 5, 10, L("Loops switch route during the season", "Dienste wechseln in der Saison die Route"))],
      eur: [800000, 2400000], basis: L("Extra cost of the loops that switch twice in a year", "Mehrkosten der Dienste, die zweimal im Jahr wechseln"),
      evidence: [S(FACTS.SUEZ)], confidence: "medium"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "monitor", chosen: true, title: L("Watch the allowance price and the phase-in every month", "Zertifikatspreis und Einführung jeden Monat beobachten"), first_step: L("Finance reports the allowance cost per container each month", "Die Finanzabteilung meldet jeden Monat die Zertifikatskosten je Container"), owner: L("Finance", "Finanzen"), changes: [{ action: "watch", item: "legal-1", signal: L("The allowance cost per container against the surcharge", "Die Zertifikatskosten je Container gegenüber dem Zuschlag"), trigger: L("Raise the surcharge when the cost outruns it", "Den Zuschlag erhöhen, wenn die Kosten ihn überholen") }], residual: [1500000, 4000000, 4], upside: null, effort: "S", time_to_impact: L("now", "sofort") },
    { id: "R2", issue: "I2", kind: "mitigate", chosen: true, title: L("Pool the older ships with the dual-fuel newbuilds", "Die älteren Schiffe mit den Dual-Fuel-Neubauten poolen"), first_step: L("Fleet management lists each ship's intensity against the limit", "Das Flottenmanagement listet die Intensität jedes Schiffs gegenüber dem Grenzwert"), owner: L("Fleet management", "Flottenmanagement"), changes: [{ action: "watch", item: "environmental-1", signal: L("Each ship's intensity against the limit", "Die Intensität jedes Schiffs gegenüber dem Grenzwert"), trigger: L("Register a pool before the reporting deadline", "Vor der Meldefrist einen Pool anmelden") }], residual: [100000, 500000, 3], upside: null, effort: "M", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") },
    { id: "R3", issue: "I3", kind: "monitor", chosen: true, title: L("Track canal transits every week", "Die Kanalpassagen jede Woche verfolgen"), first_step: L("Network planning adds the weekly transit count to its Monday review", "Die Netzplanung nimmt die wöchentlichen Passagen in ihre Montagsrunde auf"), owner: L("Network planning", "Netzplanung"), changes: [{ action: "watch", item: "political-1", signal: L("Container ships through Suez each week", "Containerschiffe durch den Suezkanal je Woche"), trigger: L("Move a loop back to Suez", "Einen Dienst zurück auf die Suezroute legen") }], residual: [400000, 1200000, 3], upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") }
  ],
  score: { name: "readiness", scale: "0-100", before: 52, after: 71 },
  pressure: { label: L("Dimensions under pressure", "Dimensionen unter Druck"), before: 3, after: 1, of: 6 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Regeln für Emissionen und Routen setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Drei Themen aus Recht, Umwelt und Politik. Mit den gewählten Antworten bleiben ${m(f.left_eur_year)} im Jahr im Risiko.` }
    : { headline: `Emission rules and routes put ${m(f.at_stake_eur_year)} a year at risk`, text: `Three issues from law, environment and politics. The chosen responses leave ${m(f.left_eur_year)} a year at risk.` })
};

// ---- the recorded run -----------------------------------------------------------------------------------

/** The Reader's merge proposal on the titles (merges only: the files come from three challengers). */
const MERGES = {
  merges: [
    { keep: "bmc-I1", merged: ["swot-I1", "pestel-I1"], why: L("All three name the cost of emission allowances on European voyages.", "Alle drei nennen die Kosten der Emissionszertifikate auf Europafahrten.") },
    { keep: "bmc-I2", merged: ["pestel-I3"], why: L("Both describe the switch between the Suez and Cape routes.", "Beide beschreiben den Wechsel zwischen der Suez- und der Kaproute.") },
    { keep: "bmc-I4", merged: ["swot-I3"], why: L("Both are about digital forwarders winning small shippers' bookings.", "Beide handeln von digitalen Spediteuren, die Buchungen kleiner Verlader gewinnen.") }
  ]
};

const r = (score, en, de) => ({ score, reason: L(en, de) });
const fig = (name, demo, today = null, src = null) => ({ name, today: today || L("", ""), source: src || "", public: !!today, demo });

/** The Ideator's eight ideas, as its output schema returns them. */
const IDEAS = {
  ideas: [
    {
      name: L("Allowance Gap Agent", "Zertifikatslücken-Agent"),
      what_it_does: L("Prices the emission allowances each European voyage needs and shows where the surcharge falls short, loop by loop.", "Berechnet die Emissionszertifikate, die jede Europafahrt braucht, und zeigt Dienst für Dienst, wo der Zuschlag nicht reicht."),
      issues: ["bmc-I1"],
      audience: L("Pricing and trade management", "Pricing und Fahrtgebietsmanagement"),
      room: [
        L("Pick a Europe loop and a month", "Einen Europadienst und einen Monat wählen"),
        L("The agent prices the allowances each voyage needs", "Der Agent bepreist die Zertifikate, die jede Fahrt braucht"),
        L("It sets the cost per container beside today's surcharge", "Er stellt die Kosten je Container neben den heutigen Zuschlag"),
        L("It proposes next month's surcharge and drafts the customer notice", "Er schlägt den Zuschlag für den nächsten Monat vor und entwirft die Kundeninformation")
      ],
      how: {
        spot: L("Finds the voyages to and from EU ports in the published schedule", "Findet im veröffentlichten Fahrplan die Fahrten von und zu EU-Häfen"),
        check: L("Checks each port pair against the rules for voyages inside and into or out of the EU", "Prüft jedes Hafenpaar gegen die Regeln für Fahrten innerhalb, in die und aus der EU"),
        calculate: L("Works out the allowances per voyage and the cost per container", "Rechnet die Zertifikate je Fahrt und die Kosten je Container aus"),
        propose: L("Proposes a surcharge that closes the gap, with its basis", "Schlägt einen Zuschlag vor, der die Lücke schließt, mit seiner Grundlage"),
        prepare: L("Drafts the monthly surcharge notice for customers", "Entwirft die monatliche Zuschlagsinformation für Kunden"),
        decision: L("Pricing approves or changes the surcharge before it goes out", "Das Pricing gibt den Zuschlag frei oder ändert ihn, bevor er hinausgeht")
      },
      key_figures: [
        fig(L("Emission allowance cost per container", "Kosten für Emissionszertifikate je Container"), L("Set beside the surcharge, loop by loop, until the gap closes", "Neben dem Zuschlag, Dienst für Dienst, bis die Lücke geschlossen ist")),
        fig(L("Money at stake a year", "Geld im Jahr auf dem Spiel"), L("The uncovered allowance cost across Europe services: {{fact:issue.bmc-I1.eur}} a year", "Die ungedeckten Zertifikatskosten der Europadienste: {{fact:issue.bmc-I1.eur}} im Jahr"))
      ],
      data: [L("Published sailing schedules and port calls", "Veröffentlichte Fahrpläne und Hafenanläufe"), L("Published allowance prices", "Veröffentlichte Zertifikatspreise"), L("Synthetic container volumes per loop", "Synthetische Containermengen je Dienst")],
      risks: [L("Allowance prices change daily, so the demo fixes a date", "Zertifikatspreise ändern sich täglich, also legt die Demo ein Datum fest"), L("Emissions per ship are estimates until the company shares its own", "Die Emissionen je Schiff sind Schätzungen, bis das Unternehmen seine eigenen teilt")],
      effort_days: { low: 8, high: 12 },
      live_inputs: { model_calls: 12, web_searches: 2 },
      ratings: {
        value: r(5, "The uncovered cost per container is easy to grasp", "Die ungedeckten Kosten je Container versteht jeder"),
        evidence: r(4, "The rules and prices are public; the company's volumes are not", "Regeln und Preise sind öffentlich, die Mengen des Unternehmens nicht"),
        buildable: r(5, "Schedules and prices are public, volumes can be synthetic", "Fahrpläne und Preise sind öffentlich, Mengen können synthetisch sein"),
        agentic: r(4, "It checks each voyage, prices it and asks pricing to decide", "Er prüft jede Fahrt, bepreist sie und lässt das Pricing entscheiden"),
        relevance: r(5, "All three challengers raised this cost", "Alle drei Challenger nennen diese Kosten"),
        demo: r(5, "One loop shows the gap and the fix in minutes", "Ein Dienst zeigt die Lücke und ihre Lösung in Minuten"),
        risk: r(4, "Surcharges are touchy with large customers", "Zuschläge sind bei großen Kunden heikel")
      },
      why: L("It turns the cost all three challengers raised into a surcharge decision the room can follow.", "Er macht aus den Kosten, die alle drei Challenger nennen, eine Zuschlagsentscheidung, der der Raum folgen kann.")
    },
    {
      name: L("FuelEU Pool Planner", "FuelEU-Poolplaner"),
      what_it_does: L("Finds the ships above the FuelEU Maritime limit and proposes pools with cleaner ships that avoid the penalty.", "Findet die Schiffe über dem Grenzwert von FuelEU Maritime und schlägt Pools mit saubereren Schiffen vor, die die Strafe vermeiden."),
      issues: ["pestel-I2"],
      audience: L("Fleet management and compliance", "Flottenmanagement und Compliance"),
      room: [
        L("The fleet appears with each ship's fuel and intensity", "Die Flotte erscheint mit Treibstoff und Intensität jedes Schiffs"),
        L("The agent marks the ships above the limit", "Der Agent markiert die Schiffe über dem Grenzwert"),
        L("It proposes pools with the dual-fuel newbuilds", "Er schlägt Pools mit den Dual-Fuel-Neubauten vor"),
        L("It shows the penalty with and without each pool", "Er zeigt die Strafe mit und ohne jeden Pool")
      ],
      how: {
        spot: L("Finds the ships whose energy is above the limit for the year", "Findet die Schiffe, deren Energie im Jahr über dem Grenzwert liegt"),
        check: L("Checks which cleaner ships have room to cover them", "Prüft, welche saubereren Schiffe Spielraum haben, sie auszugleichen"),
        calculate: L("Works out the penalty each ship would pay alone and in a pool", "Rechnet die Strafe aus, die jedes Schiff allein und im Pool zahlen würde"),
        propose: L("Proposes the pools that remove the most penalty", "Schlägt die Pools vor, die die meiste Strafe vermeiden"),
        prepare: L("Prepares the pooling summary for the verifier", "Bereitet die Poolübersicht für den Prüfer vor"),
        decision: L("The fleet manager chooses which pools to register", "Der Flottenmanager wählt, welche Pools angemeldet werden")
      },
      key_figures: [
        fig(L("CO2 per container-kilometre", "CO2 je Container-Kilometer"), L("Falls for the pooled fleet against the limit", "Sinkt für die gepoolte Flotte gegenüber dem Grenzwert")),
        fig(L("Penalty avoided a year", "Vermiedene Strafe im Jahr"), L("Against {{fact:issue.pestel-I2.eur}} at stake a year", "Gegenüber {{fact:issue.pestel-I2.eur}} im Jahr auf dem Spiel"))
      ],
      data: [L("The FuelEU Maritime limits and penalty rules", "Die Grenzwerte und Strafregeln von FuelEU Maritime"), L("Synthetic fuel use per ship", "Synthetischer Treibstoffverbrauch je Schiff")],
      risks: [L("Pooling rules leave room for interpretation", "Die Poolregeln lassen Raum für Auslegung"), L("Fuel use per ship is synthetic", "Der Treibstoffverbrauch je Schiff ist synthetisch")],
      effort_days: { low: 10, high: 15 },
      live_inputs: { model_calls: 10, web_searches: 1 },
      ratings: {
        value: r(4, "A penalty avoided is a clear sum", "Eine vermiedene Strafe ist eine klare Summe"),
        evidence: r(4, "The limits and penalties are published", "Grenzwerte und Strafen sind veröffentlicht"),
        buildable: r(4, "The rules are public; ship data must be synthetic", "Die Regeln sind öffentlich, Schiffsdaten müssen synthetisch sein"),
        agentic: r(5, "It weighs many pool options and asks a person to choose", "Er wägt viele Pooloptionen ab und lässt einen Menschen wählen"),
        relevance: r(4, "The older ships still burn heavy fuel oil", "Die älteren Schiffe fahren noch mit Schweröl"),
        demo: r(3, "Pooling takes a minute to explain", "Pooling braucht eine Minute Erklärung"),
        risk: r(4, "Compliance figures need a verifier's check", "Compliance-Zahlen brauchen die Prüfung eines Verifizierers")
      },
      why: L("It shows a penalty shrink as the agent pairs old ships with new ones.", "Er zeigt, wie eine Strafe schrumpft, wenn der Agent alte und neue Schiffe paart.")
    },
    {
      name: L("Route Switch Desk", "Routenwahl-Assistent"),
      what_it_does: L("Compares the Suez and Cape routes for each Asia loop every week and proposes when to switch.", "Vergleicht jede Woche für jeden Asiendienst die Suez- und die Kaproute und schlägt vor, wann gewechselt wird."),
      issues: ["bmc-I2"],
      audience: L("Network planning", "Netzplanung"),
      room: [
        L("The Asia loops appear with their current route", "Die Asiendienste erscheinen mit ihrer aktuellen Route"),
        L("The agent reads this week's canal transits and advisories", "Der Agent liest die Kanalpassagen und Hinweise dieser Woche"),
        L("It sets fuel, transit days and ships needed side by side for both routes", "Er stellt Treibstoff, Transittage und benötigte Schiffe für beide Routen nebeneinander"),
        L("It proposes a switch date for one loop and drafts the customer notice", "Er schlägt für einen Dienst ein Wechseldatum vor und entwirft die Kundeninformation")
      ],
      how: {
        spot: L("Finds the loops whose route differs from what most carriers now sail", "Findet die Dienste, deren Route von der heute üblichen abweicht"),
        check: L("Checks transit counts, advisories and port slots for each route", "Prüft Passagezahlen, Hinweise und Hafenslots für jede Route"),
        calculate: L("Works out fuel, transit days and the ships each route needs", "Rechnet Treibstoff, Transittage und die Schiffe aus, die jede Route braucht"),
        propose: L("Proposes keep or switch per loop, with the date and the reason", "Schlägt je Dienst Bleiben oder Wechseln vor, mit Datum und Grund"),
        prepare: L("Drafts the schedule change and the customer notice", "Entwirft die Fahrplanänderung und die Kundeninformation"),
        decision: L("The head of network planning approves each switch", "Die Leitung der Netzplanung gibt jeden Wechsel frei")
      },
      key_figures: [
        fig(L("Schedule reliability", "Fahrplantreue"), L("Call days kept when a loop switches with notice", "Eingehaltene Anlauftage, wenn ein Dienst mit Vorlauf wechselt")),
        fig(L("Fuel cost per container", "Treibstoffkosten je Container"), L("Suez against the Cape for the same loop", "Suez gegen das Kap für denselben Dienst")),
        fig(L("Money at stake a year", "Geld im Jahr auf dem Spiel"), L("{{fact:issue.bmc-I2.eur}} a year for the loops that switch", "{{fact:issue.bmc-I2.eur}} im Jahr für die wechselnden Dienste"))
      ],
      data: [L("Published canal transit counts", "Veröffentlichte Passagezahlen des Kanals"), L("Published schedules of the loops", "Veröffentlichte Fahrpläne der Dienste"), L("Synthetic fuel use per route", "Synthetischer Treibstoffverbrauch je Route")],
      risks: [L("Security advice can change overnight", "Sicherheitshinweise können sich über Nacht ändern"), L("A switch needs partners in the alliance to agree", "Ein Wechsel braucht die Zustimmung der Allianzpartner")],
      effort_days: { low: 12, high: 18 },
      live_inputs: { model_calls: 14, web_searches: 4 },
      ratings: {
        value: r(4, "Each switch moves fuel and ship costs, though the sum varies by loop", "Jeder Wechsel bewegt Treibstoff- und Schiffskosten, die Summe schwankt aber je Dienst"),
        evidence: r(4, "Transit counts and rates are public", "Passagezahlen und Raten sind öffentlich"),
        buildable: r(3, "Routing needs a fair amount of synthetic data", "Das Routing braucht einiges an synthetischen Daten"),
        agentic: r(5, "It weighs security, cost and schedule and asks a person", "Er wägt Sicherheit, Kosten und Fahrplan ab und fragt einen Menschen"),
        relevance: r(5, "Every carrier on Asia–Europe faces this choice now", "Jede Reederei zwischen Asien und Europa steht jetzt vor dieser Wahl"),
        demo: r(5, "A map with two routes and a switch date lands at once", "Eine Karte mit zwei Routen und einem Wechseldatum sitzt sofort"),
        risk: r(3, "Security advice is sensitive and changes fast", "Sicherheitshinweise sind heikel und ändern sich schnell")
      },
      why: L("The weekly route debate ends in one decision, with its costs on the table.", "Die wöchentliche Routendebatte endet in einer Entscheidung, mit ihren Kosten auf dem Tisch.")
    },
    {
      name: L("Rate Index Watch", "Frachtindex-Wächter"),
      what_it_does: L("Compares contract rates with the published freight index each week and proposes which contracts to reprice first.", "Vergleicht jede Woche die Vertragsraten mit dem veröffentlichten Frachtindex und schlägt vor, welche Verträge zuerst neu bepreist werden."),
      issues: ["bmc-I3"],
      audience: L("Sales and pricing", "Vertrieb und Pricing"),
      room: [
        L("This week's index appears beside the contract book", "Der Index dieser Woche erscheint neben dem Vertragsbuch"),
        L("The agent marks the contracts furthest from the market", "Der Agent markiert die Verträge, die am weitesten vom Markt entfernt sind"),
        L("It proposes an index clause for the next tender", "Er schlägt eine Indexklausel für die nächste Ausschreibung vor")
      ],
      how: {
        spot: L("Reads the weekly index for the lanes the company sails", "Liest den Wochenindex für die Fahrtgebiete des Unternehmens"),
        check: L("Checks each contract's rate and repricing date", "Prüft Rate und Anpassungstermin jedes Vertrags"),
        calculate: L("Works out the gap per contract until its next repricing", "Rechnet die Lücke je Vertrag bis zur nächsten Anpassung aus"),
        propose: L("Proposes the order in which to reprice and an index clause", "Schlägt die Reihenfolge der Anpassungen und eine Indexklausel vor"),
        prepare: L("Drafts the offer letter for the first contracts", "Entwirft das Angebotsschreiben für die ersten Verträge"),
        decision: L("The head of sales decides which customers to approach", "Die Vertriebsleitung entscheidet, welche Kunden angesprochen werden")
      },
      key_figures: [
        fig(L("Average freight rate", "Durchschnittliche Frachtrate"), L("Contract rates against the index, lane by lane", "Vertragsraten gegen den Index, Fahrtgebiet für Fahrtgebiet"), L("$4,176 per 40 ft container on 19 November 2026 (World Container Index)", "4.176 $ je 40-Fuß-Container am 19. November 2026 (World Container Index)"), FACTS.WCI.url),
        fig(L("Vessel utilisation", "Schiffsauslastung"), L("Volume kept when offers follow the index", "Gehaltene Menge, wenn die Angebote dem Index folgen"))
      ],
      data: [L("The published World Container Index", "Der veröffentlichte World Container Index"), L("Synthetic contract book with rates and dates", "Synthetisches Vertragsbuch mit Raten und Terminen")],
      risks: [L("Index levels are published for a few lanes only", "Indexwerte gibt es nur für einige Fahrtgebiete"), L("Customers may read an index clause as a price rise", "Kunden lesen eine Indexklausel womöglich als Preiserhöhung")],
      effort_days: { low: 8, high: 12 },
      live_inputs: { model_calls: 10, web_searches: 2 },
      ratings: {
        value: r(4, "The gap per contract is plain money", "Die Lücke je Vertrag ist klares Geld"),
        evidence: r(5, "The index is public and weekly", "Der Index ist öffentlich und wöchentlich"),
        buildable: r(4, "Index public, contracts synthetic", "Index öffentlich, Verträge synthetisch"),
        agentic: r(4, "It ranks contracts and drafts offers for a person to send", "Er reiht Verträge und entwirft Angebote, die ein Mensch verschickt"),
        relevance: r(4, "Rates swing after this year's high", "Die Raten schwanken nach dem Hoch dieses Jahres"),
        demo: r(4, "A table of gaps is quick to read", "Eine Tabelle der Lücken ist schnell gelesen"),
        risk: r(4, "Pricing talks are sensitive but routine", "Preisgespräche sind heikel, aber Routine")
      },
      why: L("It puts the gap between contract and market in front of sales every week.", "Er legt dem Vertrieb jede Woche die Lücke zwischen Vertrag und Markt vor.")
    },
    {
      name: L("Instant Spot Quote", "Spot-Sofortangebot"),
      what_it_does: L("Answers a small shipper's spot request online in minutes with a price, a sailing and a booking link.", "Beantwortet die Spotanfrage eines kleinen Verladers online in Minuten, mit Preis, Abfahrt und Buchungslink."),
      issues: ["bmc-I4"],
      audience: L("Sales for small and mid-sized shippers", "Vertrieb für kleine und mittlere Verlader"),
      room: [
        L("A shipper types a request: port pair, date and container", "Ein Verlader tippt eine Anfrage: Hafenpaar, Datum und Container"),
        L("The agent finds the next sailings with space", "Der Agent findet die nächsten Abfahrten mit Platz"),
        L("It prices the request from the spot tariff and the surcharges", "Er bepreist die Anfrage aus Spottarif und Zuschlägen"),
        L("A sales agent approves the quote, which goes out with a booking link", "Ein Vertriebsmitarbeiter gibt das Angebot frei, das mit Buchungslink hinausgeht")
      ],
      how: {
        spot: L("Reads the request and finds what it lacks", "Liest die Anfrage und findet, was ihr fehlt"),
        check: L("Checks space on the next sailings and the customer's terms", "Prüft Platz auf den nächsten Abfahrten und die Bedingungen des Kunden"),
        calculate: L("Prices the move from the tariff and every surcharge", "Bepreist den Transport aus Tarif und allen Zuschlägen"),
        propose: L("Proposes the quote and an alternative sailing", "Schlägt das Angebot und eine Ausweichabfahrt vor"),
        prepare: L("Drafts the reply with the booking link", "Entwirft die Antwort mit dem Buchungslink"),
        decision: L("A sales agent approves the quote before it goes out", "Ein Vertriebsmitarbeiter gibt das Angebot frei, bevor es hinausgeht")
      },
      key_figures: [
        fig(L("Booking response time", "Antwortzeit auf Buchungsanfragen"), L("From a working day to minutes", "Von einem Arbeitstag auf Minuten")),
        fig(L("Share of bookings made online", "Anteil der Online-Buchungen"), L("Rises as spot requests come in online", "Steigt, wenn Spotanfragen online eingehen"))
      ],
      data: [L("Published schedules", "Veröffentlichte Fahrpläne"), L("A synthetic spot tariff and surcharges", "Ein synthetischer Spottarif und Zuschläge")],
      risks: [L("A wrong price on screen binds the company", "Ein falscher Preis auf dem Bildschirm bindet das Unternehmen"), L("Space per sailing is synthetic", "Der Platz je Abfahrt ist synthetisch")],
      effort_days: { low: 6, high: 10 },
      live_inputs: { model_calls: 8, web_searches: 0 },
      ratings: {
        value: r(3, "Small shippers' margin is modest", "Die Marge kleiner Verlader ist bescheiden"),
        evidence: r(3, "Forwarders' growth is visible, hard figures are not public", "Das Wachstum der Spediteure ist sichtbar, harte Zahlen sind nicht öffentlich"),
        buildable: r(5, "Schedules and a synthetic tariff are enough", "Fahrpläne und ein synthetischer Tarif reichen"),
        agentic: r(4, "It fills gaps, prices and asks a person to approve", "Er füllt Lücken, bepreist und lässt einen Menschen freigeben"),
        relevance: r(4, "Spot requests wait a working day today", "Spotanfragen warten heute einen Arbeitstag"),
        demo: r(5, "A request answered live makes the point", "Eine live beantwortete Anfrage überzeugt"),
        risk: r(5, "No sensitive data and a person approves", "Keine heiklen Daten, und ein Mensch gibt frei")
      },
      why: L("It wins back the small shippers who book where the answer comes first.", "Er gewinnt die kleinen Verlader zurück, die dort buchen, wo die Antwort zuerst kommt.")
    },
    {
      name: L("Emissions per Box", "Emissionen je Box"),
      what_it_does: L("Writes an emissions statement for each container a shipper moved, counted by EN ISO 14083, ready to attach to the invoice.", "Schreibt für jeden Container eines Verladers einen Emissionsnachweis nach EN ISO 14083, fertig für die Rechnung."),
      issues: ["bmc-I5"],
      audience: L("Sustainability and key account management", "Nachhaltigkeit und Key-Account-Management"),
      room: [
        L("Pick a shipper and a month", "Einen Verlader und einen Monat wählen"),
        L("The agent collects each container's voyages and legs", "Der Agent sammelt die Fahrten und Abschnitte jedes Containers"),
        L("It counts the emissions per container and leg", "Er zählt die Emissionen je Container und Abschnitt"),
        L("It drafts the statement for the account manager to send", "Er entwirft den Nachweis, den der Kundenbetreuer verschickt")
      ],
      how: {
        spot: L("Finds the shipper's containers and their voyages in the month", "Findet die Container des Verladers und ihre Fahrten im Monat"),
        check: L("Checks that every leg has a ship, a distance and a fuel", "Prüft, dass jeder Abschnitt Schiff, Strecke und Treibstoff hat"),
        calculate: L("Counts emissions per container with the EN ISO 14083 method", "Zählt die Emissionen je Container nach der Methode von EN ISO 14083"),
        propose: L("Proposes the statement and flags legs with estimated data", "Schlägt den Nachweis vor und markiert Abschnitte mit geschätzten Daten"),
        prepare: L("Prepares the statement as a file for the invoice", "Bereitet den Nachweis als Datei für die Rechnung vor"),
        decision: L("The account manager checks and sends the statement", "Der Kundenbetreuer prüft den Nachweis und verschickt ihn")
      },
      key_figures: [
        fig(L("CO2 per container-kilometre", "CO2 je Container-Kilometer"), L("Per shipper, against the fleet average sent today", "Je Verlader, gegen den heute verschickten Flottendurchschnitt")),
        fig(L("Contracts that ask for statements", "Verträge, die Nachweise verlangen"), L("Kept when the statement comes with the invoice", "Gehalten, wenn der Nachweis mit der Rechnung kommt"))
      ],
      data: [L("The published counting method", "Die veröffentlichte Zählmethode"), L("Synthetic voyages, distances and fuel per ship", "Synthetische Fahrten, Strecken und Treibstoff je Schiff")],
      risks: [L("Statements must match what the shipper reports", "Nachweise müssen zu dem passen, was der Verlader berichtet"), L("Fuel data per voyage is synthetic in the demo", "Die Treibstoffdaten je Fahrt sind in der Demo synthetisch")],
      effort_days: { low: 10, high: 14 },
      live_inputs: { model_calls: 9, web_searches: 1 },
      ratings: {
        value: r(4, "Statements keep contracts that require them", "Nachweise halten Verträge, die sie verlangen"),
        evidence: r(4, "The counting rules are published", "Die Zählregeln sind veröffentlicht"),
        buildable: r(4, "The method is public; voyages can be synthetic", "Die Methode ist öffentlich, Fahrten können synthetisch sein"),
        agentic: r(3, "Mostly a calculation with a check by a person", "Vor allem eine Berechnung mit Prüfung durch einen Menschen"),
        relevance: r(5, "Large shippers ask for it now", "Große Verlader fragen jetzt danach"),
        demo: r(4, "A statement per box is concrete", "Ein Nachweis je Box ist greifbar"),
        risk: r(4, "Wrong figures would reach customers' reports", "Falsche Zahlen landeten in den Berichten der Kunden")
      },
      why: L("Every invoice can carry the statement customers now ask for.", "Jede Rechnung kann den Nachweis mitbringen, nach dem Kunden jetzt fragen.")
    },
    {
      name: L("Empty Moves Planner", "Leercontainer-Planer"),
      what_it_does: L("Forecasts where empty containers will be needed next week and proposes the cheapest moves to get them there.", "Sagt voraus, wo nächste Woche Leercontainer gebraucht werden, und schlägt die günstigsten Wege dorthin vor."),
      issues: ["swot-I2"],
      audience: L("Equipment control", "Equipmentsteuerung"),
      room: [
        L("A map shows empties by port and next week's bookings", "Eine Karte zeigt Leercontainer je Hafen und die Buchungen der nächsten Woche"),
        L("The agent marks the ports that will run short", "Der Agent markiert die Häfen, denen Container fehlen werden"),
        L("It proposes moves on sailings with free space", "Er schlägt Fahrten auf Abfahrten mit freiem Platz vor")
      ],
      how: {
        spot: L("Finds the ports where bookings will outrun empties", "Findet die Häfen, in denen die Buchungen die Leercontainer überholen"),
        check: L("Checks free space on the sailings that could carry them", "Prüft freien Platz auf den Abfahrten, die sie mitnehmen könnten"),
        calculate: L("Works out the cost of each move against a short-notice one", "Rechnet die Kosten jeder Fahrt gegen eine kurzfristige aus"),
        propose: L("Proposes the week's empty moves", "Schlägt die Leerfahrten der Woche vor"),
        prepare: L("Drafts the move orders for the terminals", "Entwirft die Transportaufträge für die Terminals"),
        decision: L("Equipment control approves the moves", "Die Equipmentsteuerung gibt die Fahrten frei")
      },
      key_figures: [
        fig(L("Cost of moving empty containers", "Kosten der Leercontainer-Rückführung"), L("Planned moves against short-notice ones", "Geplante Fahrten gegen kurzfristige")),
        fig(L("Money at stake a year", "Geld im Jahr auf dem Spiel"), L("{{fact:issue.swot-I2.eur}} a year in short-notice moves", "{{fact:issue.swot-I2.eur}} im Jahr an kurzfristigen Fahrten"))
      ],
      data: [L("Published schedules", "Veröffentlichte Fahrpläne"), L("Synthetic container stocks and bookings per port", "Synthetische Containerbestände und Buchungen je Hafen")],
      risks: [L("Forecasts need the company's own booking history", "Prognosen brauchen die eigene Buchungshistorie des Unternehmens"), L("All stock figures are synthetic in the demo", "Alle Bestandszahlen sind in der Demo synthetisch")],
      effort_days: { low: 12, high: 16 },
      live_inputs: { model_calls: 14, web_searches: 0 },
      ratings: {
        value: r(4, "Short-notice moves cost real money", "Kurzfristige Leerfahrten kosten echtes Geld"),
        evidence: r(2, "No public figures for this company", "Keine öffentlichen Zahlen zu diesem Unternehmen"),
        buildable: r(3, "Needs a credible synthetic stock and booking set", "Braucht einen glaubwürdigen synthetischen Bestand und Buchungen"),
        agentic: r(4, "It plans moves and asks a person to approve", "Er plant Fahrten und lässt einen Menschen freigeben"),
        relevance: r(3, "A known cost, not this year's headline", "Bekannte Kosten, nicht das Thema des Jahres"),
        demo: r(3, "A map helps, but the logic takes time", "Eine Karte hilft, aber die Logik braucht Zeit"),
        risk: r(5, "Internal planning with no outside effect", "Interne Planung ohne Wirkung nach außen")
      },
      why: L("It shows a quiet cost the room rarely sees and how to plan it down.", "Er zeigt Kosten, die der Raum selten sieht, und wie man sie herunterplant.")
    },
    {
      name: L("Surcharge Explainer", "Zuschlags-Erklärer"),
      what_it_does: L("Answers a customer's question about a surcharge line with its basis, its calculation and the rule behind it.", "Beantwortet die Frage eines Kunden zu einer Zuschlagszeile mit Grundlage, Rechnung und der Regel dahinter."),
      issues: ["swot-I4"],
      audience: L("Customer service and billing", "Kundenservice und Fakturierung"),
      room: [
        L("A customer asks why the emissions surcharge went up", "Ein Kunde fragt, warum der Emissionszuschlag gestiegen ist"),
        L("The agent finds the invoice line and its formula", "Der Agent findet die Rechnungszeile und ihre Formel"),
        L("It drafts an answer that shows the calculation step by step", "Er entwirft eine Antwort, die die Rechnung Schritt für Schritt zeigt")
      ],
      how: {
        spot: L("Finds the invoice and the surcharge line the customer means", "Findet die Rechnung und die Zuschlagszeile, die der Kunde meint"),
        check: L("Checks the line against the published surcharge formula", "Prüft die Zeile gegen die veröffentlichte Zuschlagsformel"),
        calculate: L("Recalculates the line from its inputs", "Rechnet die Zeile aus ihren Eingaben nach"),
        propose: L("Proposes an answer, or a credit note where the line is wrong", "Schlägt eine Antwort vor oder eine Gutschrift, wo die Zeile falsch ist"),
        prepare: L("Drafts the reply in the customer's language", "Entwirft die Antwort in der Sprache des Kunden"),
        decision: L("A billing clerk approves the reply or the credit note", "Ein Sachbearbeiter der Fakturierung gibt Antwort oder Gutschrift frei")
      },
      key_figures: [
        fig(L("Disputed invoices", "Beanstandete Rechnungen"), L("Fall as answers come the same day", "Sinken, wenn die Antworten am selben Tag kommen")),
        fig(L("Time to answer a query", "Antwortzeit auf eine Rückfrage"), L("From days to the same day", "Von Tagen auf denselben Tag"))
      ],
      data: [L("A published surcharge formula", "Eine veröffentlichte Zuschlagsformel"), L("Synthetic invoices", "Synthetische Rechnungen")],
      risks: [L("Answers must match the contract's terms", "Antworten müssen zu den Vertragsbedingungen passen")],
      effort_days: { low: 5, high: 8 },
      live_inputs: { model_calls: 6, web_searches: 0 },
      ratings: {
        value: r(3, "Faster payment matters, but the sum is unclear", "Schnellere Zahlung zählt, aber die Summe ist unklar"),
        evidence: r(2, "The dispute rate is not measured yet", "Die Quote der Beanstandungen wird noch nicht gemessen"),
        buildable: r(5, "A formula and synthetic invoices are enough", "Eine Formel und synthetische Rechnungen reichen"),
        agentic: r(3, "Close to a single lookup and a reply", "Nah an einer einzigen Abfrage und Antwort"),
        relevance: r(3, "New surcharges raise questions now", "Neue Zuschläge werfen jetzt Fragen auf"),
        demo: r(4, "A question answered live is easy to follow", "Eine live beantwortete Frage ist leicht zu verfolgen"),
        risk: r(5, "A person approves every reply", "Ein Mensch gibt jede Antwort frei")
      },
      why: L("It keeps the new surcharge from turning into late payments.", "Er verhindert, dass der neue Zuschlag zu späten Zahlungen führt.")
    }
  ]
};

/** The Writer's four texts: every figure is a placeholder, so any choice reads right. */
const RECOMMENDATION = {
  headline: L("{{fact:top.name}} scores highest of {{fact:ideas.count}} prototypes for Tidewell Lines", "{{fact:top.name}} erreicht den besten Wert von {{fact:ideas.count}} Prototypen für Tidewell Lines"),
  looked_at: L("Three challenger reports on Tidewell Lines: its business model canvas, its SWOT and its PESTEL, with twelve issues between them.", "Drei Challenger-Berichte zu Tidewell Lines: Geschäftsmodell, SWOT und PESTEL, mit zusammen zwölf Themen."),
  found: L("At stake a year: {{fact:at_stake}}. The ideas answer {{fact:issues.covered}} of {{fact:issues.kept}} kept issues.", "Pro Jahr auf dem Spiel: {{fact:at_stake}}. Die Ideen beantworten {{fact:issues.covered}} von {{fact:issues.kept}} behaltenen Themen."),
  needed: L("Rank your top three, name who should be in the room, and agree which public data the first build may use.", "Reihen Sie Ihre drei Favoriten, nennen Sie, wer im Raum sein soll, und legen Sie fest, welche öffentlichen Daten der erste Bau nutzen darf.")
};

const name = (tool) => L(`${tool}-challenger-tidewell-lines-2026-11-23-en.json`, `${tool}-challenger-tidewell-lines-2026-11-23-de.json`);

/** Scenario S1 as authored: js/scenarios.js resolves it into the Scenario contract, one file per language. */
export default {
  schema: "pi-scenario/1",
  id: "s1",
  source: "authored",
  as_of: "2026-11-23",
  company: { name: COMPANY.name, sector: COMPANY.sector, country: COMPANY.country, fictional: true },
  pitch: L("A container carrier in Bremen with about 40 ships", "Eine Containerreederei in Bremen mit rund 40 Schiffen"),
  count: 8,
  focus: L("", ""),
  documents: [
    { id: "d1", kind: "handoff", tool: "bmc", name: name("bmc"), stand_in: true, fictional: true, spec: BMC },
    { id: "d2", kind: "handoff", tool: "swot", name: name("swot"), stand_in: true, fictional: true, spec: SWOT },
    { id: "d3", kind: "handoff", tool: "pestel", name: name("pestel"), stand_in: true, fictional: true, spec: PESTEL }
  ],
  facts: Object.values(FACTS),
  answers: { reader: null, merges: MERGES, ideas: IDEAS, recommendation: RECOMMENDATION, brief: null },
  choices: {
    issues: [
      { id: "swot-I1", action: "merge", into: "bmc-I1", reason: null },
      { id: "pestel-I1", action: "merge", into: "bmc-I1", reason: null },
      { id: "pestel-I3", action: "merge", into: "bmc-I2", reason: null },
      { id: "swot-I3", action: "merge", into: "bmc-I4", reason: null }
    ],
    weights: null,
    shortlist: ["P1", "P3", "P4"],
    brief_idea: null
  },
  // The engine's figures along the recorded choices, frozen: tools/check-scenarios.mjs fails when a change
  // to the engine, the files, the prompts or the answers moves one (--print-reference prints them anew).
  reference: {at_stake: {eur: 10750000, stated: 7, of: 8}, kept: 8, covered: {covered: 8, of: 8}, ideas: 8, order: ["P1", "P3", "P4", "P5", "P6", "P2", "P8", "P7"], top: {id: "P1", score: 4.7}, firsts: {P1: 9, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, P8: 0}, shortlist_share: 0.633, cost_cents: {en: {fast: [0, 0], balanced: [0, 0], thorough: [9, 9]}, de: {fast: [0, 0], balanced: [0, 0], thorough: [9, 9]}}}
};
