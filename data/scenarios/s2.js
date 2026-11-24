// Scenario S2, Arvento Drives: a fictional family-owned maker of industrial drives and gearboxes in
// Baden-Württemberg that is launching drives as a service. Its inputs are the Business Model Canvas and
// PESTEL Challengers' handoff files, written as stand-ins until the challengers export their own
// (PLAN.md §5.3). The Reader proposes four merges; the Ideator proposes six prototypes around the service
// business and customers' data rights, one kept issue left without an idea. What the scenario says about
// the world is listed in DATA_SOURCES.md, §2. Arvento Drives and its own figures are invented.

import { L, item, aiItem, kpi, source } from "./standin.js";

/** The facts S2 cites, as DATA_SOURCES.md lists them. */
export const FACTS = {
  DATA: { id: "S2-DATA", url: "https://www.ccpc.ie/enforcement-and-regulation/data-regulation/eu-data-act", title: L("Competition and Consumer Protection Commission: EU Data Act", "Competition and Consumer Protection Commission: EU-Datenverordnung"), read_on: "2026-11-23" },
  CRA: { id: "S2-CRA", url: "https://digital-strategy.ec.europa.eu/en/policies/cra-reporting", title: L("European Commission: Cyber Resilience Act reporting obligations", "Europäische Kommission: Meldepflichten des Cyber Resilience Act"), read_on: "2026-11-23" },
  MACH: { id: "S2-MACH", url: "https://single-market-economy.ec.europa.eu/sectors/mechanical-engineering/machinery_en", title: L("European Commission: Machinery", "Europäische Kommission: Maschinen"), read_on: "2026-11-23" },
  TARIFF: { id: "S2-TARIFF", url: "https://www.gtai.de/de/trade/usa/branchen/maschinenbau-1029242", title: L("Germany Trade & Invest: US machinery sector", "Germany Trade & Invest: Maschinenbau in den USA"), read_on: "2026-11-23" }
};
const S = (f) => source(f);

const COMPANY = {
  name: "Arvento Drives",
  sector: "industrial_manufacturing",
  country: "DE",
  description: L("Family-owned maker of industrial drives and gearboxes in Baden-Württemberg, launching drives as a service", "Familiengeführter Hersteller von Industrieantrieben und Getrieben in Baden-Württemberg, der Antriebe als Service einführt"),
  fictional: true
};

// ---- the Business Model Canvas Challenger's file ---------------------------------------------------------

const BMC = {
  tool: "bmc",
  created: "2026-11-23T09:10:00Z",
  company: COMPANY,
  items: {
    partners: [item("partners-1", L("Distributors in Europe and the US", "Händler in Europa und den USA")), item("partners-2", L("A cloud provider for the condition data", "Ein Cloud-Anbieter für die Zustandsdaten"))],
    activities: [item("activities-1", L("Designing and assembling drives and gearboxes", "Antriebe und Getriebe entwickeln und montieren")), item("activities-2", L("Field service and repairs", "Außendienst und Reparaturen")), item("activities-3", L("Firmware updates for connected drives", "Firmware-Updates für vernetzte Antriebe"))],
    resources: [item("resources-1", L("Engineers and service technicians", "Ingenieure und Servicetechniker")), item("resources-2", L("An installed base of connected drives", "Eine installierte Basis vernetzter Antriebe")), item("resources-3", L("The plant in Baden-Württemberg", "Das Werk in Baden-Württemberg"))],
    value: [item("value-1", L("Drives that run for decades", "Antriebe, die Jahrzehnte laufen")), aiItem("value-2", L("Drives as a service, paid per operating hour", "Antriebe als Service, bezahlt je Betriebsstunde"), L("The company is launching an operating-hour model", "Das Unternehmen führt ein Modell nach Betriebsstunden ein"))],
    relationships: [item("relationships-1", L("Long-standing ties with machine builders", "Langjährige Beziehungen zu Maschinenbauern")), item("relationships-2", L("Service contracts", "Serviceverträge"))],
    channels: [item("channels-1", L("Direct sales to machine builders", "Direktvertrieb an Maschinenbauer")), item("channels-2", L("Distributors", "Händler"))],
    segments: [item("segments-1", L("Machine builders", "Maschinenbauer")), item("segments-2", L("Plant operators in food, packaging and logistics", "Anlagenbetreiber in Lebensmitteln, Verpackung und Logistik"))],
    costs: [item("costs-1", L("Steel and copper", "Stahl und Kupfer")), item("costs-2", L("Service technicians", "Servicetechniker")), item("costs-3", L("Software and security", "Software und Sicherheit"))],
    revenue: [item("revenue-1", L("Drive and gearbox sales", "Verkauf von Antrieben und Getrieben")), item("revenue-2", L("Spare parts and repairs", "Ersatzteile und Reparaturen")), item("revenue-3", L("Operating hours under drives as a service", "Betriebsstunden im Antrieb als Service"))]
  },
  issues: [
    {
      id: "I1", type: "regulation", areas: ["value", "relationships"], items: ["value-2", "relationships-2"], impact: 3, likelihood: 4, horizon: "now",
      title: L("Operators may now take their drives' data to any service firm", "Betreiber dürfen die Daten ihrer Antriebe jetzt jedem Servicebetrieb geben"),
      description: L(
        "Connected products placed on the market after 12 September 2026 must let their users reach the data they generate. Condition data no longer keeps service work with Arvento.",
        "Vernetzte Produkte, die nach dem 12. September 2026 in Verkehr kommen, müssen ihren Nutzern Zugang zu den erzeugten Daten geben. Die Zustandsdaten halten die Servicearbeit nicht mehr bei Arvento."
      ),
      kpis: [kpi("industrial_manufacturing.service_revenue_share", "down", 2, 5, L("Service work that third parties win with the shared data", "Servicearbeit, die Dritte mit den geteilten Daten gewinnen"))],
      eur: [600000, 2000000], basis: L("Service revenue on connected drives times the share at risk", "Serviceumsatz mit vernetzten Antrieben mal der gefährdete Anteil"),
      evidence: [S(FACTS.DATA)], confidence: "medium"
    },
    {
      id: "I2", type: "regulation", areas: ["activities", "costs"], items: ["activities-3", "costs-3"], impact: 4, likelihood: 3, horizon: "now",
      title: L("Exploited vulnerabilities must be reported within a day", "Ausgenutzte Schwachstellen müssen binnen eines Tages gemeldet werden"),
      description: L(
        "Since 11 September 2026, makers of products with digital elements report actively exploited vulnerabilities and severe incidents through ENISA's platform, with an early warning within 24 hours. The drive firmware has no process for it yet.",
        "Seit dem 11. September 2026 melden Hersteller von Produkten mit digitalen Elementen aktiv ausgenutzte Schwachstellen und schwere Vorfälle über die Plattform der ENISA, mit einer Frühwarnung binnen 24 Stunden. Für die Antriebsfirmware gibt es dafür noch keinen Prozess."
      ),
      kpis: [kpi("industrial_manufacturing.warranty_cost", "up", 0.1, 0.4, L("Patches and recalls booked as warranty", "Patches und Rückrufe als Gewährleistung gebucht"))],
      eur: [300000, 1500000], basis: L("Cost of a late report or a field update across the connected base", "Kosten einer verspäteten Meldung oder eines Feldupdates über die vernetzte Basis"),
      evidence: [S(FACTS.CRA)], confidence: "medium"
    },
    {
      id: "I3", type: "competition", areas: ["value", "segments", "revenue"], items: ["value-1", "segments-1", "revenue-1"], impact: 4, likelihood: 3, horizon: "1_to_3_years",
      title: L("Low-cost standard gearboxes undercut the catalogue range", "Billige Standardgetriebe unterbieten das Katalogsortiment"),
      description: L(
        "Machine builders buy standard gearboxes from low-cost makers and keep Arvento for special drives. The catalogue range loses orders on price.",
        "Maschinenbauer kaufen Standardgetriebe bei Billiganbietern und behalten Arvento für Sonderantriebe. Das Katalogsortiment verliert Aufträge über den Preis."
      ),
      kpis: [kpi("industrial_manufacturing.book_to_bill", "down", 0.05, 0.15, L("Fewer catalogue orders against the same deliveries", "Weniger Katalogaufträge bei gleichen Lieferungen"))],
      eur: [1500000, 4500000], basis: L("Catalogue revenue at risk times the margin", "Gefährdeter Katalogumsatz mal die Marge"),
      evidence: [], confidence: "medium"
    },
    {
      id: "I4", type: "capacity", areas: ["resources", "activities"], items: ["resources-1", "activities-2"], impact: 4, likelihood: 4, horizon: "now",
      title: L("Too few technicians for the service promise", "Zu wenige Techniker für das Serviceversprechen"),
      description: L(
        "Drives as a service promises a technician within a working day. Arvento has too few service technicians, and several retire in the next few years.",
        "Antriebe als Service verspricht einen Techniker binnen eines Arbeitstags. Arvento hat zu wenige Servicetechniker, und mehrere gehen in den nächsten Jahren in Rente."
      ),
      kpis: [
        kpi("industrial_manufacturing.first_time_fix_rate", "down", 5, 12, L("Visits by less experienced technicians", "Einsätze weniger erfahrener Techniker")),
        kpi("industrial_manufacturing.technician_utilisation", "up", 5, 10, L("The same team covers more contracts", "Dasselbe Team deckt mehr Verträge ab"))
      ],
      eur: [1000000, 3000000], basis: L("Penalties and lost contracts when the promise slips", "Vertragsstrafen und verlorene Verträge, wenn das Versprechen reißt"),
      evidence: [], confidence: "medium"
    },
    {
      id: "I5", type: "trade", areas: ["costs", "segments"], items: ["costs-1", "segments-2"], impact: 3, likelihood: 4, horizon: "now",
      title: L("US duties on metal content hit exports", "US-Zölle auf den Metallanteil treffen die Exporte"),
      description: L(
        "US duties on steel and aluminium also fall on products made from them. Exporters must document the value, origin and metal content of their components, and the gearboxes are mostly steel.",
        "US-Zölle auf Stahl und Aluminium treffen auch Produkte daraus. Exporteure müssen Wert, Herkunft und Metallanteil ihrer Komponenten belegen, und die Getriebe sind zum größten Teil aus Stahl."
      ),
      kpis: [kpi("general.gross_margin", "down", 1, 3, L("Duty and paperwork on US shipments", "Zoll und Aufwand auf US-Lieferungen"))],
      eur: [500000, 1500000], basis: L("US revenue times the duty on its metal content", "US-Umsatz mal der Zoll auf seinen Metallanteil"),
      evidence: [S(FACTS.TARIFF)], confidence: "medium"
    },
    {
      id: "I6", type: "opportunity", areas: ["revenue", "relationships"], items: ["revenue-3", "relationships-2"], impact: 3, likelihood: 3, horizon: "1_to_3_years",
      title: L("The installed base could pay every month", "Die installierte Basis könnte jeden Monat zahlen"),
      description: L(
        "Thousands of connected drives already run in customers' plants. Paid per operating hour, they would bring revenue every month instead of once.",
        "Tausende vernetzte Antriebe laufen bereits in den Werken der Kunden. Nach Betriebsstunden bezahlt, brächten sie jeden Monat Umsatz statt einmal."
      ),
      kpis: [kpi("industrial_manufacturing.recurring_revenue_share", "up", 5, 15, L("Operating-hour contracts on the connected base", "Betriebsstundenverträge auf der vernetzten Basis"))],
      eur: [1000000, 3000000], basis: L("Connected drives times a monthly fee, less the parts sales it replaces", "Vernetzte Antriebe mal eine Monatsgebühr, abzüglich des ersetzten Teilegeschäfts"),
      evidence: [], confidence: "low"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "advantage", chosen: true, title: L("Give operators their data in a portal and sell the analysis on top", "Betreibern ihre Daten in einem Portal geben und die Auswertung dazu verkaufen"), first_step: L("Product management defines the data export for the new drive series", "Das Produktmanagement legt den Datenexport für die neue Antriebsreihe fest"), owner: L("Product management", "Produktmanagement"), changes: [{ area: "value", action: "add", text: L("Data portal for every connected drive", "Datenportal für jeden vernetzten Antrieb") }], residual: [300000, 1000000, 3], upside: [200000, 800000, 3], effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") },
    { id: "R2", issue: "I2", kind: "mitigate", chosen: true, title: L("Set up a vulnerability desk with a 24-hour reporting drill", "Eine Schwachstellenstelle mit einer 24-Stunden-Meldeübung einrichten"), first_step: L("Engineering names an owner for each firmware component", "Die Entwicklung benennt für jede Firmwarekomponente einen Verantwortlichen"), owner: L("Engineering", "Entwicklung"), changes: [{ area: "activities", action: "add", text: L("Vulnerability handling and reporting", "Schwachstellenbehandlung und Meldung") }], residual: [100000, 500000, 2], upside: null, effort: "M", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R3", issue: "I3", kind: "mitigate", chosen: true, title: L("Move the catalogue range towards drives as a service", "Das Katalogsortiment in Richtung Antriebe als Service bewegen"), first_step: L("Sales offers operating hours instead of a sale in the next three tenders", "Der Vertrieb bietet in den nächsten drei Ausschreibungen Betriebsstunden statt eines Kaufs an"), owner: L("Sales", "Vertrieb"), changes: [{ area: "revenue", action: "add", text: L("Operating hours instead of catalogue sales for standard drives", "Betriebsstunden statt Katalogverkauf bei Standardantrieben") }], residual: [800000, 2400000, 3], upside: null, effort: "L", time_to_impact: L("12 to 24 months", "12 bis 24 Monate") },
    { id: "R4", issue: "I4", kind: "mitigate", chosen: true, title: L("Diagnose remotely before every visit", "Vor jedem Einsatz aus der Ferne diagnostizieren"), first_step: L("Service sets up a remote desk for the connected drives", "Der Service richtet einen Ferndienst für die vernetzten Antriebe ein"), owner: L("Service", "Service"), changes: [{ area: "activities", action: "add", text: L("Remote diagnosis before each service visit", "Ferndiagnose vor jedem Serviceeinsatz") }], residual: [500000, 1500000, 3], upside: null, effort: "M", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") },
    { id: "R5", issue: "I5", kind: "mitigate", chosen: true, title: L("Document metal content per part number", "Den Metallanteil je Teilenummer belegen"), first_step: L("Purchasing collects origin and metal content from suppliers", "Der Einkauf sammelt Herkunft und Metallanteil bei den Lieferanten"), owner: L("Purchasing", "Einkauf"), changes: [{ area: "activities", action: "add", text: L("Metal-content records per part number", "Nachweise zum Metallanteil je Teilenummer") }], residual: [200000, 800000, 3], upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R6", issue: "I6", kind: "advantage", chosen: true, title: L("Offer operating-hour contracts to the connected base", "Der vernetzten Basis Betriebsstundenverträge anbieten"), first_step: L("Sales picks fifty connected plants for a first offer", "Der Vertrieb wählt fünfzig vernetzte Werke für ein erstes Angebot"), owner: L("Sales", "Vertrieb"), changes: [{ area: "revenue", action: "add", text: L("Monthly fees per operating hour", "Monatliche Gebühren je Betriebsstunde") }], residual: null, upside: [600000, 1800000, 3], effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") }
  ],
  score: { name: "resilience", scale: "0-100", before: 58, after: 72 },
  pressure: { label: L("Blocks under pressure", "Bausteine unter Druck"), before: 6, after: 2, of: 9 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Datenrechte, Konkurrenz und Technikermangel setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Sechs Themen drücken auf das Geschäftsmodell von Arvento Drives. Mit den gewählten Antworten bleiben ${m(f.left_eur_year)} im Jahr im Risiko, und ${m(f.upside_eur_year)} Chance kommen hinzu.` }
    : { headline: `Data rights, rivals and too few technicians put ${m(f.at_stake_eur_year)} a year at risk`, text: `Six issues press on Arvento Drives' business model. The chosen responses leave ${m(f.left_eur_year)} a year at risk and add ${m(f.upside_eur_year)} of upside.` })
};

// ---- the PESTEL Challenger's file -----------------------------------------------------------------------

const PESTEL = {
  tool: "pestel",
  created: "2026-11-23T09:30:00Z",
  company: COMPANY,
  items: {
    political: [item("political-1", L("US trade policy on goods made of metal", "US-Handelspolitik für Waren aus Metall"))],
    economic: [item("economic-1", L("Machinery demand is weak", "Die Nachfrage nach Maschinen ist schwach"))],
    social: [item("social-1", L("Too few skilled technicians", "Zu wenige Fachkräfte im Service"))],
    technological: [item("technological-1", L("Connected drives with remote access", "Vernetzte Antriebe mit Fernzugriff"))],
    environmental: [item("environmental-1", L("Customers ask for energy-efficient drives", "Kunden fragen nach energieeffizienten Antrieben"))],
    legal: [item("legal-1", L("EU Data Act", "EU-Datenverordnung")), item("legal-2", L("Cyber Resilience Act", "Cyber Resilience Act")), item("legal-3", L("EU Machinery Regulation", "EU-Maschinenverordnung"))]
  },
  issues: [
    {
      id: "I1", type: "legal", areas: ["legal"], items: ["legal-1"], impact: 3, likelihood: 4, horizon: "now",
      title: L("The Data Act gives users access to machine data", "Die Datenverordnung gibt Nutzern Zugang zu Maschinendaten"),
      description: L("The Data Act has applied since 12 September 2025. Products placed on the market after 12 September 2026 must be designed so that users can reach their data directly.", "Die Datenverordnung gilt seit dem 12. September 2025. Produkte, die nach dem 12. September 2026 in Verkehr kommen, müssen so gebaut sein, dass Nutzer ihre Daten direkt erreichen."),
      kpis: [kpi("industrial_manufacturing.service_revenue_share", "down", 1, 4, L("Service work shared with third parties", "Servicearbeit, die mit Dritten geteilt wird"))],
      eur: [500000, 1500000], basis: L("Service revenue on drives sold since September 2026, times the share at risk", "Serviceumsatz mit seit September 2026 verkauften Antrieben, mal der gefährdete Anteil"),
      evidence: [S(FACTS.DATA)], confidence: "high"
    },
    {
      id: "I2", type: "legal", areas: ["legal", "technological"], items: ["legal-2", "technological-1"], impact: 4, likelihood: 3, horizon: "now",
      title: L("Cyber Resilience Act reporting has started", "Die Meldepflichten des Cyber Resilience Act laufen"),
      description: L("Since 11 September 2026, actively exploited vulnerabilities and severe incidents go to ENISA's single reporting platform, with an early warning within 24 hours.", "Seit dem 11. September 2026 gehen aktiv ausgenutzte Schwachstellen und schwere Vorfälle an die zentrale Meldeplattform der ENISA, mit einer Frühwarnung binnen 24 Stunden."),
      kpis: [kpi("industrial_manufacturing.warranty_cost", "up", 0.1, 0.3, L("Field updates after a reported vulnerability", "Feldupdates nach einer gemeldeten Schwachstelle"))],
      eur: [400000, 1200000], basis: L("Cost of one severe incident across the connected base", "Kosten eines schweren Vorfalls über die vernetzte Basis"),
      evidence: [S(FACTS.CRA)], confidence: "high"
    },
    {
      id: "I3", type: "legal", areas: ["legal"], items: ["legal-3"], impact: 3, likelihood: 5, horizon: "now",
      title: L("The Machinery Regulation applies from January 2027", "Die Maschinenverordnung gilt ab Januar 2027"),
      description: L("Regulation (EU) 2023/1230 applies from 20 January 2027. Machinery placed on the market before that date follows the old Machinery Directive.", "Die Verordnung (EU) 2023/1230 gilt ab dem 20. Januar 2027. Maschinen, die davor in Verkehr kommen, folgen der alten Maschinenrichtlinie."),
      kpis: [kpi("industrial_manufacturing.on_time_delivery", "down", 2, 5, L("Shipments held back for missing conformity documents", "Lieferungen, die wegen fehlender Konformitätsunterlagen warten"))],
      eur: [300000, 900000], basis: L("Delayed shipments times the margin while documents are redone", "Verzögerte Lieferungen mal die Marge, solange Unterlagen neu entstehen"),
      evidence: [S(FACTS.MACH)], confidence: "high"
    },
    {
      id: "I4", type: "political", areas: ["political"], items: ["political-1"], impact: 3, likelihood: 4, horizon: "now",
      title: L("US duties fall on the metal in every gearbox", "US-Zölle treffen das Metall in jedem Getriebe"),
      description: L("US duties on steel and aluminium still weigh on German machinery makers, who must document the value, origin and metal content of components.", "US-Zölle auf Stahl und Aluminium belasten deutsche Maschinenbauer weiter; sie müssen Wert, Herkunft und Metallanteil der Komponenten belegen."),
      kpis: [kpi("general.gross_margin", "down", 1, 2, L("Duty on the metal content of US shipments", "Zoll auf den Metallanteil der US-Lieferungen"))],
      eur: [400000, 1200000], basis: L("US revenue times the duty on its metal content", "US-Umsatz mal der Zoll auf seinen Metallanteil"),
      evidence: [S(FACTS.TARIFF)], confidence: "medium"
    },
    {
      id: "I5", type: "social", areas: ["social"], items: ["social-1"], impact: 4, likelihood: 4, horizon: "1_to_3_years",
      title: L("Skilled service technicians are hard to hire", "Servicetechniker sind schwer zu finden"),
      description: L("The company finds too few technicians for field service, and the drives-as-a-service promise needs more of them.", "Das Unternehmen findet zu wenige Techniker für den Außendienst, und das Versprechen des Antriebs als Service braucht mehr davon."),
      kpis: [kpi("industrial_manufacturing.technician_utilisation", "up", 5, 12, L("The same team covers more sites", "Dasselbe Team deckt mehr Standorte ab"))],
      eur: [800000, 2400000], basis: L("Contracts at risk when visits come late", "Gefährdete Verträge, wenn Einsätze spät kommen"),
      evidence: [], confidence: "medium"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "monitor", chosen: true, title: L("Track which operators ask for their data", "Verfolgen, welche Betreiber ihre Daten anfordern"), first_step: L("Service logs every data request", "Der Service erfasst jede Datenanfrage"), owner: L("Service", "Service"), changes: [{ action: "watch", item: "legal-1", signal: L("Data requests from operators each month", "Datenanfragen von Betreibern je Monat"), trigger: L("Open the data portal to all customers", "Das Datenportal für alle Kunden öffnen") }], residual: [400000, 1200000, 3], upside: null, effort: "S", time_to_impact: L("now", "sofort") },
    { id: "R2", issue: "I2", kind: "mitigate", chosen: true, title: L("Rehearse the 24-hour early warning", "Die 24-Stunden-Frühwarnung üben"), first_step: L("Engineering runs a reporting drill this quarter", "Die Entwicklung probt in diesem Quartal eine Meldung"), owner: L("Engineering", "Entwicklung"), changes: [{ action: "watch", item: "legal-2", signal: L("Advisories for components in the firmware", "Hinweise zu Komponenten in der Firmware"), trigger: L("Start the reporting process", "Den Meldeprozess starten") }], residual: [100000, 400000, 2], upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R3", issue: "I3", kind: "mitigate", chosen: true, title: L("Update the declarations of conformity before January 2027", "Die Konformitätserklärungen vor Januar 2027 erneuern"), first_step: L("Quality lists every drive placed on the market after 20 January 2027", "Die Qualität listet jeden Antrieb, der nach dem 20. Januar 2027 in Verkehr kommt"), owner: L("Quality", "Qualität"), changes: [{ action: "watch", item: "legal-3", signal: L("Products still without the new declaration", "Produkte, die noch keine neue Erklärung haben"), trigger: L("Hold the product's EU shipments", "Die EU-Lieferungen des Produkts anhalten") }], residual: [100000, 300000, 2], upside: null, effort: "M", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R4", issue: "I4", kind: "mitigate", chosen: true, title: L("Record the metal content of every US shipment", "Den Metallanteil jeder US-Lieferung erfassen"), first_step: L("Export control adds metal content to the shipping papers", "Die Exportkontrolle ergänzt den Metallanteil in den Versandpapieren"), owner: L("Export control", "Exportkontrolle"), changes: [{ action: "watch", item: "political-1", signal: L("Changes to US duties on metal goods", "Änderungen der US-Zölle auf Metallwaren"), trigger: L("Reprice US contracts", "US-Verträge neu bepreisen") }], residual: [200000, 600000, 3], upside: null, effort: "S", time_to_impact: L("1 to 3 months", "1 bis 3 Monate") },
    { id: "R5", issue: "I5", kind: "mitigate", chosen: true, title: L("Train mechanics from the plant for field service", "Mechaniker aus dem Werk für den Außendienst schulen"), first_step: L("Service starts a first training group in the spring", "Der Service startet im Frühjahr eine erste Schulungsgruppe"), owner: L("Service", "Service"), changes: [{ action: "watch", item: "social-1", signal: L("Open technician positions", "Offene Technikerstellen"), trigger: L("Hire through partners", "Über Partner einstellen") }], residual: [400000, 1200000, 3], upside: null, effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") }
  ],
  score: { name: "readiness", scale: "0-100", before: 49, after: 66 },
  pressure: { label: L("Dimensions under pressure", "Dimensionen unter Druck"), before: 4, after: 1, of: 6 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Neue EU-Regeln und US-Zölle setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Fünf Themen, drei davon aus dem Recht. Mit den gewählten Antworten bleiben ${m(f.left_eur_year)} im Jahr im Risiko.` }
    : { headline: `New EU rules and US duties put ${m(f.at_stake_eur_year)} a year at risk`, text: `Five issues, three of them legal. The chosen responses leave ${m(f.left_eur_year)} a year at risk.` })
};

// ---- the recorded run -----------------------------------------------------------------------------------

const MERGES = {
  merges: [
    { keep: "bmc-I1", merged: ["pestel-I1"], why: L("Both are about operators' right to their drives' data.", "Beide handeln vom Recht der Betreiber an den Daten ihrer Antriebe.") },
    { keep: "bmc-I2", merged: ["pestel-I2"], why: L("Both name the duty to report exploited vulnerabilities.", "Beide nennen die Pflicht, ausgenutzte Schwachstellen zu melden.") },
    { keep: "bmc-I4", merged: ["pestel-I5"], why: L("Both describe too few service technicians.", "Beide beschreiben zu wenige Servicetechniker.") },
    { keep: "bmc-I5", merged: ["pestel-I4"], why: L("Both are about US duties on the metal in the gearboxes.", "Beide handeln von US-Zöllen auf das Metall in den Getrieben.") }
  ]
};

const r = (score, en, de) => ({ score, reason: L(en, de) });
const fig = (name, demo, today = null, src = null) => ({ name, today: today || L("", ""), source: src || "", public: !!today, demo });

const IDEAS = {
  ideas: [
    {
      name: L("Data Access Desk", "Datenzugangs-Desk"),
      what_it_does: L("Handles an operator's request for its drives' data: checks who asks, prepares the export and offers the analysis on top.", "Bearbeitet die Anfrage eines Betreibers nach den Daten seiner Antriebe: prüft, wer fragt, bereitet den Export vor und bietet die Auswertung dazu an."),
      issues: ["bmc-I1"],
      audience: L("Service and legal", "Service und Recht"),
      room: [
        L("An operator asks for a year of data from three drives", "Ein Betreiber fragt nach einem Jahr Daten von drei Antrieben"),
        L("The agent checks the contract and who may receive the data", "Der Agent prüft den Vertrag und wer die Daten erhalten darf"),
        L("It prepares the export and a short analysis of each drive", "Er bereitet den Export und eine kurze Auswertung je Antrieb vor"),
        L("Service approves, and the operator gets the data with an offer", "Der Service gibt frei, und der Betreiber erhält die Daten mit einem Angebot")
      ],
      how: {
        spot: L("Reads the request and finds the drives it names", "Liest die Anfrage und findet die genannten Antriebe"),
        check: L("Checks the contract, the requester and what data the drives hold", "Prüft Vertrag, Anfragenden und welche Daten die Antriebe haben"),
        calculate: L("Works out the effort and the response date", "Rechnet Aufwand und Antwortdatum aus"),
        propose: L("Proposes the export and an analysis offer", "Schlägt den Export und ein Angebot zur Auswertung vor"),
        prepare: L("Prepares the export file and the cover letter", "Bereitet die Exportdatei und das Anschreiben vor"),
        decision: L("Service and legal approve the release", "Service und Recht geben die Herausgabe frei")
      },
      key_figures: [
        fig(L("Time to answer a data request", "Antwortzeit auf eine Datenanfrage"), L("From weeks of e-mail to a day", "Von Wochen E-Mail auf einen Tag")),
        fig(L("Share of service revenue", "Anteil des Serviceumsatzes"), L("Kept when the analysis comes with the data", "Gehalten, wenn die Auswertung mit den Daten kommt"))
      ],
      data: [L("The Data Act's published rules", "Die veröffentlichten Regeln der Datenverordnung"), L("Synthetic condition data from drives", "Synthetische Zustandsdaten von Antrieben")],
      risks: [L("Legal readings of the Data Act are still forming", "Die rechtliche Auslegung der Datenverordnung bildet sich noch"), L("The demo must not suggest legal advice", "Die Demo darf keine Rechtsberatung nahelegen")],
      effort_days: { low: 8, high: 12 },
      live_inputs: { model_calls: 8, web_searches: 1 },
      ratings: {
        value: r(4, "Service revenue on connected drives is at stake", "Serviceumsatz mit vernetzten Antrieben steht auf dem Spiel"),
        evidence: r(5, "The law and its dates are public", "Das Gesetz und seine Termine sind öffentlich"),
        buildable: r(4, "Synthetic drive data is enough for the demo", "Synthetische Antriebsdaten reichen für die Demo"),
        agentic: r(4, "It checks rights, prepares files and asks a person", "Er prüft Rechte, bereitet Dateien vor und fragt einen Menschen"),
        relevance: r(5, "The rule applies to drives sold since September", "Die Regel gilt für Antriebe, die seit September verkauft werden"),
        demo: r(4, "A request answered in a day is easy to show", "Eine Anfrage, die in einem Tag beantwortet ist, lässt sich leicht zeigen"),
        risk: r(4, "Legal questions need care", "Rechtsfragen brauchen Sorgfalt")
      },
      why: L("It turns a new legal duty into a service the customer pays for.", "Er macht aus einer neuen Rechtspflicht einen Service, für den der Kunde zahlt.")
    },
    {
      name: L("Remote First Fix", "Ferndiagnose zuerst"),
      what_it_does: L("Diagnoses a drive fault from its condition data before anyone drives out and prepares the parts and the visit.", "Diagnostiziert einen Antriebsfehler aus den Zustandsdaten, bevor jemand losfährt, und bereitet Teile und Einsatz vor."),
      issues: ["bmc-I4"],
      audience: L("Field service", "Außendienst"),
      room: [
        L("An alarm comes in from a drive in a packaging plant", "Ein Alarm kommt von einem Antrieb in einem Verpackungswerk"),
        L("The agent reads the drive's data and names the likely fault", "Der Agent liest die Daten des Antriebs und nennt den wahrscheinlichen Fehler"),
        L("It proposes the fix, the parts and the right technician", "Er schlägt Lösung, Teile und den passenden Techniker vor"),
        L("The dispatcher confirms, and the technician arrives with the parts", "Die Disposition bestätigt, und der Techniker kommt mit den Teilen")
      ],
      how: {
        spot: L("Picks up alarms and unusual readings from connected drives", "Nimmt Alarme und auffällige Werte vernetzter Antriebe auf"),
        check: L("Checks the drive's history and similar past faults", "Prüft die Historie des Antriebs und ähnliche frühere Fehler"),
        calculate: L("Ranks the likely causes and works out the parts needed", "Reiht die wahrscheinlichen Ursachen und rechnet die nötigen Teile aus"),
        propose: L("Proposes a remote fix or a visit with the parts", "Schlägt eine Fernlösung oder einen Einsatz mit Teilen vor"),
        prepare: L("Prepares the work order and the parts list", "Bereitet Arbeitsauftrag und Teileliste vor"),
        decision: L("The dispatcher decides between remote fix and visit", "Die Disposition entscheidet zwischen Fernlösung und Einsatz")
      },
      key_figures: [
        fig(L("First-time fix rate", "Erstlösungsquote"), L("Rises when the technician brings the right parts", "Steigt, wenn der Techniker die richtigen Teile dabeihat")),
        fig(L("Technician utilisation", "Auslastung der Servicetechniker"), L("Visits saved by remote fixes", "Durch Fernlösungen gesparte Einsätze")),
        fig(L("Money at stake a year", "Geld im Jahr auf dem Spiel"), L("{{fact:issue.bmc-I4.eur}} a year if the service promise slips", "{{fact:issue.bmc-I4.eur}} im Jahr, wenn das Serviceversprechen reißt"))
      ],
      data: [L("Synthetic condition data with planted faults", "Synthetische Zustandsdaten mit eingebauten Fehlern"), L("A synthetic parts catalogue", "Ein synthetischer Teilekatalog")],
      risks: [L("A wrong diagnosis sends the wrong parts", "Eine falsche Diagnose schickt die falschen Teile"), L("The fault patterns are synthetic in the demo", "Die Fehlermuster sind in der Demo synthetisch")],
      effort_days: { low: 10, high: 15 },
      live_inputs: { model_calls: 12, web_searches: 0 },
      ratings: {
        value: r(5, "Every saved visit is a technician's day", "Jeder gesparte Einsatz ist ein Technikertag"),
        evidence: r(3, "The shortage is the company's own, not public", "Der Mangel ist der eigene des Unternehmens, nicht öffentlich"),
        buildable: r(4, "Synthetic condition data is credible", "Synthetische Zustandsdaten sind glaubwürdig"),
        agentic: r(5, "It diagnoses, plans and hands the choice to a person", "Er diagnostiziert, plant und überlässt die Wahl einem Menschen"),
        relevance: r(5, "The service promise depends on it", "Das Serviceversprechen hängt daran"),
        demo: r(5, "An alarm turned into a ready visit lands at once", "Ein Alarm, der zum fertigen Einsatz wird, sitzt sofort"),
        risk: r(4, "A person confirms every visit", "Ein Mensch bestätigt jeden Einsatz")
      },
      why: L("It keeps the service promise with the technicians the company has.", "Er hält das Serviceversprechen mit den Technikern, die das Unternehmen hat.")
    },
    {
      name: L("Uptime Offer Builder", "Betriebsstunden-Angebot"),
      what_it_does: L("Reads each connected drive's operating hours and drafts a monthly operating-hour offer for its plant.", "Liest die Betriebsstunden jedes vernetzten Antriebs und entwirft für sein Werk ein monatliches Betriebsstunden-Angebot."),
      issues: ["bmc-I6"],
      audience: L("Sales", "Vertrieb"),
      room: [
        L("Pick a plant with connected drives", "Ein Werk mit vernetzten Antrieben wählen"),
        L("The agent shows each drive's hours and wear", "Der Agent zeigt Stunden und Verschleiß jedes Antriebs"),
        L("It prices a monthly fee against today's parts and repair spend", "Er bepreist eine Monatsgebühr gegen die heutigen Ausgaben für Teile und Reparaturen"),
        L("It drafts the offer for the account manager", "Er entwirft das Angebot für den Kundenbetreuer")
      ],
      how: {
        spot: L("Finds plants whose drives run many hours a year", "Findet Werke, deren Antriebe viele Stunden im Jahr laufen"),
        check: L("Checks wear, age and the parts the plant bought", "Prüft Verschleiß, Alter und die gekauften Teile des Werks"),
        calculate: L("Works out a monthly fee that beats today's spend", "Rechnet eine Monatsgebühr aus, die die heutigen Ausgaben schlägt"),
        propose: L("Proposes the fee and the service level", "Schlägt Gebühr und Servicelevel vor"),
        prepare: L("Drafts the offer and its contract terms", "Entwirft das Angebot und seine Vertragsbedingungen"),
        decision: L("The account manager decides whether to send it", "Der Kundenbetreuer entscheidet, ob er es verschickt")
      },
      key_figures: [
        fig(L("Share of recurring revenue", "Anteil wiederkehrender Umsätze"), L("Grows with each signed plant", "Wächst mit jedem unterschriebenen Werk")),
        fig(L("Money at stake a year", "Geld im Jahr auf dem Spiel"), L("{{fact:issue.bmc-I6.eur}} a year in monthly fees", "{{fact:issue.bmc-I6.eur}} im Jahr an Monatsgebühren"))
      ],
      data: [L("Synthetic operating hours per drive", "Synthetische Betriebsstunden je Antrieb"), L("A synthetic price list for parts and repairs", "Eine synthetische Preisliste für Teile und Reparaturen")],
      risks: [L("Pricing per hour needs the company's own cost data", "Preise je Stunde brauchen die eigenen Kostendaten des Unternehmens"), L("Customers may fear lock-in", "Kunden fürchten womöglich Abhängigkeit")],
      effort_days: { low: 10, high: 14 },
      live_inputs: { model_calls: 9, web_searches: 0 },
      ratings: {
        value: r(5, "Recurring revenue is what the service model is for", "Wiederkehrender Umsatz ist der Zweck des Servicemodells"),
        evidence: r(3, "The model is new; no public figures yet", "Das Modell ist neu, es gibt noch keine öffentlichen Zahlen"),
        buildable: r(3, "Credible pricing needs careful synthetic data", "Glaubwürdige Preise brauchen sorgfältige synthetische Daten"),
        agentic: r(4, "It reads, prices and drafts for a person to send", "Er liest, bepreist und entwirft, ein Mensch verschickt"),
        relevance: r(5, "It is the company's launch this year", "Es ist der Start des Unternehmens in diesem Jahr"),
        demo: r(4, "A plant's hours turned into an offer is clear", "Die Stunden eines Werks als Angebot sind verständlich"),
        risk: r(4, "Contract terms need a person's review", "Vertragsbedingungen brauchen die Prüfung eines Menschen")
      },
      why: L("Drives that already report their hours start to earn a monthly fee.", "Antriebe, die ihre Stunden schon melden, bringen eine monatliche Gebühr.")
    },
    {
      name: L("Vulnerability Watch", "Schwachstellen-Wächter"),
      what_it_does: L("Matches published advisories to the components in the drive firmware and drafts the early warning when one is exploited.", "Gleicht veröffentlichte Hinweise mit den Komponenten der Antriebsfirmware ab und entwirft die Frühwarnung, wenn eine ausgenutzt wird."),
      issues: ["bmc-I2"],
      audience: L("Engineering and product security", "Entwicklung und Produktsicherheit"),
      room: [
        L("An advisory for an open-source library appears", "Ein Hinweis zu einer Open-Source-Bibliothek erscheint"),
        L("The agent finds the firmware versions that contain it", "Der Agent findet die Firmwareversionen, die sie enthalten"),
        L("It counts the drives in the field on those versions", "Er zählt die Antriebe im Feld mit diesen Versionen"),
        L("It drafts the early warning and the customer notice for approval", "Er entwirft Frühwarnung und Kundeninformation zur Freigabe")
      ],
      how: {
        spot: L("Reads public vulnerability advisories every day", "Liest jeden Tag öffentliche Schwachstellenhinweise"),
        check: L("Checks them against the firmware's list of components", "Prüft sie gegen die Komponentenliste der Firmware"),
        calculate: L("Counts the affected drives and the hours left to report", "Zählt die betroffenen Antriebe und die Stunden bis zur Meldung"),
        propose: L("Proposes report or no report, with the reason", "Schlägt Meldung oder keine Meldung vor, mit Grund"),
        prepare: L("Drafts the early warning and the customer notice", "Entwirft Frühwarnung und Kundeninformation"),
        decision: L("The product security officer approves the report", "Die Produktsicherheit gibt die Meldung frei")
      },
      key_figures: [
        fig(L("Time from advisory to report", "Zeit vom Hinweis bis zur Meldung"), L("Within the day the law allows", "Innerhalb des Tages, den das Gesetz erlaubt")),
        fig(L("Drives affected", "Betroffene Antriebe"), L("Counted per advisory, by firmware version", "Je Hinweis gezählt, nach Firmwareversion"))
      ],
      data: [L("Public vulnerability advisories", "Öffentliche Schwachstellenhinweise"), L("A synthetic firmware component list", "Eine synthetische Komponentenliste der Firmware")],
      risks: [L("A missed match would be worse than none", "Ein übersehener Treffer wäre schlimmer als keiner"), L("Security topics need careful wording in front of customers", "Sicherheitsthemen brauchen vor Kunden vorsichtige Worte")],
      effort_days: { low: 6, high: 10 },
      live_inputs: { model_calls: 10, web_searches: 3 },
      ratings: {
        value: r(4, "A late report risks fines and trust", "Eine verspätete Meldung riskiert Bußgelder und Vertrauen"),
        evidence: r(5, "The reporting rules and dates are public", "Meldepflichten und Termine sind öffentlich"),
        buildable: r(5, "Advisories are public, the component list synthetic", "Hinweise sind öffentlich, die Komponentenliste synthetisch"),
        agentic: r(5, "It watches, matches, counts and drafts for a person", "Er beobachtet, gleicht ab, zählt und entwirft für einen Menschen"),
        relevance: r(4, "The duty started this autumn", "Die Pflicht gilt seit diesem Herbst"),
        demo: r(4, "Advisory to draft report in a minute is vivid", "Vom Hinweis zum Meldeentwurf in einer Minute ist anschaulich"),
        risk: r(3, "Security is a sensitive topic with customers", "Sicherheit ist bei Kunden ein heikles Thema")
      },
      why: L("It makes the new reporting duty a routine the team can meet.", "Er macht die neue Meldepflicht zu einer Routine, die das Team schafft.")
    },
    {
      name: L("Conformity Checker", "Konformitäts-Prüfer"),
      what_it_does: L("Checks each product's technical file against the Machinery Regulation and lists what is missing before 20 January 2027.", "Prüft die technischen Unterlagen jedes Produkts gegen die Maschinenverordnung und listet, was vor dem 20. Januar 2027 fehlt."),
      issues: ["pestel-I3"],
      audience: L("Quality and product compliance", "Qualität und Produktkonformität"),
      room: [
        L("The product range appears with each technical file", "Das Sortiment erscheint mit den technischen Unterlagen"),
        L("The agent checks each file against the new requirements", "Der Agent prüft jede Unterlage gegen die neuen Anforderungen"),
        L("It lists the gaps per product and the work to close them", "Er listet die Lücken je Produkt und die Arbeit, sie zu schließen")
      ],
      how: {
        spot: L("Finds the products placed on the market after the date", "Findet die Produkte, die nach dem Stichtag in Verkehr kommen"),
        check: L("Checks each technical file against the new requirements", "Prüft jede technische Unterlage gegen die neuen Anforderungen"),
        calculate: L("Works out the effort per gap and the date it must close", "Rechnet den Aufwand je Lücke und den Termin aus, bis zu dem sie zu ist"),
        propose: L("Proposes the order in which to close the gaps", "Schlägt die Reihenfolge vor, in der die Lücken geschlossen werden"),
        prepare: L("Drafts the updated declarations of conformity", "Entwirft die erneuerten Konformitätserklärungen"),
        decision: L("The quality manager signs each declaration", "Die Qualitätsleitung unterschreibt jede Erklärung")
      },
      key_figures: [
        fig(L("On-time delivery", "Liefertreue"), L("Kept when no shipment waits for a document", "Gehalten, wenn keine Lieferung auf eine Unterlage wartet")),
        fig(L("Products ready for the new rules", "Produkte bereit für die neuen Regeln"), L("Counted down to the date", "Bis zum Stichtag heruntergezählt"))
      ],
      data: [L("The published Machinery Regulation", "Die veröffentlichte Maschinenverordnung"), L("Synthetic technical files", "Synthetische technische Unterlagen")],
      risks: [L("Reading a regulation needs an expert's check", "Das Lesen einer Verordnung braucht die Prüfung eines Fachmanns")],
      effort_days: { low: 6, high: 9 },
      live_inputs: { model_calls: 8, web_searches: 1 },
      ratings: {
        value: r(3, "Delays cost margin, but the sum is moderate", "Verzögerungen kosten Marge, die Summe ist aber moderat"),
        evidence: r(5, "The regulation and its date are public", "Verordnung und Stichtag sind öffentlich"),
        buildable: r(5, "The rules are public; files can be synthetic", "Die Regeln sind öffentlich, Unterlagen können synthetisch sein"),
        agentic: r(3, "Mostly a checklist with a person signing", "Vor allem eine Checkliste, die ein Mensch unterschreibt"),
        relevance: r(4, "The date is close and fixed", "Der Termin ist nah und fest"),
        demo: r(3, "Checklists are hard to make exciting", "Checklisten sind schwer spannend zu machen"),
        risk: r(5, "A person signs every declaration", "Ein Mensch unterschreibt jede Erklärung")
      },
      why: L("It gets every product ready for a fixed date without a scramble.", "Er macht jedes Produkt ohne Hektik für einen festen Termin bereit.")
    },
    {
      name: L("Metal Content Ledger", "Metallanteil-Register"),
      what_it_does: L("Works out the metal content and origin of each part number and prepares the records US customs ask for.", "Rechnet Metallanteil und Herkunft jeder Teilenummer aus und bereitet die Nachweise vor, die der US-Zoll verlangt."),
      issues: ["bmc-I5"],
      audience: L("Export control and purchasing", "Exportkontrolle und Einkauf"),
      room: [
        L("Pick a gearbox shipped to the US", "Ein Getriebe wählen, das in die USA geht"),
        L("The agent breaks it into parts and their metal content", "Der Agent zerlegt es in Teile und ihren Metallanteil"),
        L("It flags parts without a supplier's origin record", "Er markiert Teile ohne Herkunftsnachweis des Lieferanten"),
        L("It drafts the customs record for export control", "Er entwirft den Zollnachweis für die Exportkontrolle")
      ],
      how: {
        spot: L("Finds the part numbers shipped to the US", "Findet die Teilenummern, die in die USA gehen"),
        check: L("Checks each part's material and the supplier's origin record", "Prüft Material und Herkunftsnachweis des Lieferanten je Teil"),
        calculate: L("Works out metal content and value per gearbox", "Rechnet Metallanteil und Wert je Getriebe aus"),
        propose: L("Proposes the record and the supplier requests still open", "Schlägt den Nachweis und die offenen Lieferantenanfragen vor"),
        prepare: L("Drafts the customs record and the supplier letters", "Entwirft Zollnachweis und Lieferantenschreiben"),
        decision: L("Export control approves the record", "Die Exportkontrolle gibt den Nachweis frei")
      },
      key_figures: [
        fig(L("Gross margin", "Bruttomarge"), L("Protected on US shipments when records are complete", "Bei US-Lieferungen geschützt, wenn die Nachweise vollständig sind")),
        fig(L("Parts with an origin record", "Teile mit Herkunftsnachweis"), L("Rises as supplier records come in", "Steigt, wenn Lieferantennachweise eingehen"))
      ],
      data: [L("Published US duty rules on metal goods", "Veröffentlichte US-Zollregeln für Metallwaren"), L("A synthetic bill of materials", "Eine synthetische Stückliste")],
      risks: [L("Duty rules change often", "Zollregeln ändern sich oft"), L("Political topic in front of US customers", "Politisches Thema vor US-Kunden")],
      effort_days: { low: 7, high: 10 },
      live_inputs: { model_calls: 7, web_searches: 2 },
      ratings: {
        value: r(3, "The duty is real, but the sum depends on volumes", "Der Zoll ist real, die Summe hängt aber von den Mengen ab"),
        evidence: r(4, "Trade advisers publish the duty rules", "Außenhandelsstellen veröffentlichen die Zollregeln"),
        buildable: r(4, "A synthetic bill of materials is enough", "Eine synthetische Stückliste reicht"),
        agentic: r(4, "It traces parts, asks suppliers and drafts records", "Er verfolgt Teile, fragt Lieferanten und entwirft Nachweise"),
        relevance: r(3, "US exports are a part of the business, not its core", "US-Exporte sind ein Teil des Geschäfts, nicht sein Kern"),
        demo: r(3, "Customs records take time to explain", "Zollnachweise brauchen Zeit zur Erklärung"),
        risk: r(4, "Trade policy is touchy but the task is routine", "Handelspolitik ist heikel, die Aufgabe aber Routine")
      },
      why: L("It keeps US shipments moving while duty rules shift.", "Er hält US-Lieferungen am Laufen, während sich die Zollregeln ändern.")
    }
  ]
};

const RECOMMENDATION = {
  headline: L("{{fact:top.name}} scores highest of {{fact:ideas.count}} prototypes for Arvento Drives", "{{fact:top.name}} erreicht den besten Wert von {{fact:ideas.count}} Prototypen für Arvento Drives"),
  looked_at: L("Two challenger reports on Arvento Drives: its business model canvas and its PESTEL, with eleven issues between them.", "Zwei Challenger-Berichte zu Arvento Drives: Geschäftsmodell und PESTEL, mit zusammen elf Themen."),
  found: L("At stake a year: {{fact:at_stake}}. The ideas answer {{fact:issues.covered}} of {{fact:issues.kept}} kept issues; the rivals' low-cost gearboxes are a pricing question, not one for an agent.", "Pro Jahr auf dem Spiel: {{fact:at_stake}}. Die Ideen beantworten {{fact:issues.covered}} von {{fact:issues.kept}} behaltenen Themen; die billigen Getriebe der Konkurrenz sind eine Preisfrage, keine für einen Agenten."),
  needed: L("Rank your top three, name who should see the demo, and say whether a synthetic fleet of connected drives is acceptable for the first build.", "Reihen Sie Ihre drei Favoriten, nennen Sie, wer die Demo sehen soll, und sagen Sie, ob eine synthetische Flotte vernetzter Antriebe für den ersten Bau in Ordnung ist.")
};

/** The Brief writer's part for the first shortlisted idea, Remote First Fix (P2), as recorded. */
const BRIEF = {
  builds: L(
    "A tool for field service that reads a connected drive's condition data when an alarm comes in, names the likely fault and prepares the visit: the fix, the parts and the right technician. The dispatcher decides between a remote fix and a visit, so technicians drive out less often and arrive with the right parts.",
    "Ein Werkzeug für den Außendienst, das bei einem Alarm die Zustandsdaten eines vernetzten Antriebs liest, den wahrscheinlichen Fehler nennt und den Einsatz vorbereitet: Lösung, Teile und den passenden Techniker. Die Disposition entscheidet zwischen Fernlösung und Einsatz, sodass Techniker seltener losfahren und mit den richtigen Teilen ankommen."),
  steps: [
    L("An alarm comes in from a drive in a packaging plant.", "Ein Alarm kommt von einem Antrieb in einem Verpackungswerk."),
    L("The agent reads the drive's recent condition data and its service history.", "Der Agent liest die jüngsten Zustandsdaten des Antriebs und seine Servicehistorie."),
    L("It ranks the likely causes and names the parts each would need.", "Er reiht die wahrscheinlichen Ursachen und nennt die Teile, die jede bräuchte."),
    L("It proposes a remote fix or a visit, with the technician who fits.", "Er schlägt eine Fernlösung oder einen Einsatz vor, mit dem passenden Techniker."),
    L("The dispatcher confirms, and the work order and the parts list are ready.", "Die Disposition bestätigt, und Arbeitsauftrag und Teileliste sind fertig.")
  ],
  key_figures: [
    { name: L("First-time fix rate", "Erstlösungsquote"), measures: L("Visits that fix the fault without a second trip, as a share of all visits", "Einsätze, die den Fehler ohne zweite Fahrt beheben, als Anteil an allen Einsätzen") },
    { name: L("Visits saved", "Gesparte Einsätze"), measures: L("Alarms closed with a remote fix instead of a visit", "Alarme, die mit einer Fernlösung statt eines Einsatzes erledigt sind") },
    { name: L("Money at stake a year", "Geld im Jahr auf dem Spiel"), measures: L("What a slipping service promise puts at stake, {{fact:issue.bmc-I4.eur}} a year in the simulation", "Was ein reißendes Serviceversprechen aufs Spiel setzt, in der Simulation {{fact:issue.bmc-I4.eur}} im Jahr") }
  ],
  data: [
    L("Synthetic condition data for drives, with planted faults", "Synthetische Zustandsdaten von Antrieben, mit eingebauten Fehlern"),
    L("A synthetic parts catalogue and the stock in each van", "Ein synthetischer Teilekatalog und der Bestand in jedem Servicewagen"),
    L("A synthetic roster of technicians with their skills and regions", "Ein synthetischer Einsatzplan der Techniker mit ihren Fähigkeiten und Regionen")
  ],
  tools: [
    { name: L("Alarm watch", "Alarmwache"), does: L("Spots alarms and unusual readings from connected drives", "Nimmt Alarme und auffällige Werte vernetzter Antriebe auf") },
    { name: L("History check", "Historienprüfung"), does: L("Checks the drive's service history and similar past faults", "Prüft die Servicehistorie des Antriebs und ähnliche frühere Fehler") },
    { name: L("Cause ranker", "Ursachenreihung"), does: L("Ranks the likely causes and works out the parts each needs", "Reiht die wahrscheinlichen Ursachen und rechnet die Teile für jede aus") },
    { name: L("Fix proposer", "Lösungsvorschlag"), does: L("Proposes a remote fix or a visit with the parts and the technician", "Schlägt eine Fernlösung oder einen Einsatz mit Teilen und Techniker vor") },
    { name: L("Work order writer", "Arbeitsauftrag"), does: L("Prepares the work order and the parts list for the dispatcher", "Bereitet Arbeitsauftrag und Teileliste für die Disposition vor") }
  ],
  guardrails: [
    L("Code ranks the causes from the data and shows why; the model explains the ranking in words.", "Code reiht die Ursachen aus den Daten und zeigt den Grund; das Modell erklärt die Reihung in Worten."),
    L("The dispatcher confirms every visit and every remote fix.", "Die Disposition bestätigt jeden Einsatz und jede Fernlösung."),
    L("The demo's fault patterns are synthetic, and the page says so.", "Die Fehlermuster der Demo sind synthetisch, und die Seite sagt das.")
  ],
  golden_cases: [
    { name: L("Bearing wear", "Lagerverschleiß"), given: L("vibration up 40 % over two weeks with normal temperature, on a drive with 30,000 operating hours", "Vibration in zwei Wochen um 40 % gestiegen bei normaler Temperatur, an einem Antrieb mit 30.000 Betriebsstunden"), expect: L("bearing wear ranked first, the bearing kit as the part and a visit within a week", "Lagerverschleiß an erster Stelle, der Lagersatz als Teil und ein Einsatz innerhalb einer Woche") },
    { name: L("Remote fix", "Fernlösung"), given: L("a parameter fault code right after a firmware update, with every reading normal", "ein Parameterfehler direkt nach einem Firmware-Update, bei normalen Werten"), expect: L("a remote fix ranked first, with no parts and no visit", "eine Fernlösung an erster Stelle, ohne Teile und ohne Einsatz") },
    { name: L("First-time fix rate", "Erstlösungsquote"), given: L("20 visits, 17 of them closed without a second trip", "20 Einsätze, davon 17 ohne zweite Fahrt erledigt"), expect: L("a first-time fix rate of 85 %", "eine Erstlösungsquote von 85 %") }
  ]
};

const name = (tool) => L(`${tool}-challenger-arvento-drives-2026-11-23-en.json`, `${tool}-challenger-arvento-drives-2026-11-23-de.json`);

export default {
  schema: "pi-scenario/1",
  id: "s2",
  source: "authored",
  as_of: "2026-11-23",
  company: { name: COMPANY.name, sector: COMPANY.sector, country: COMPANY.country, fictional: true },
  pitch: L("A family-owned maker of drives and gearboxes, launching drives as a service", "Ein familiengeführter Hersteller von Antrieben und Getrieben, der Antriebe als Service einführt"),
  count: 6,
  focus: L("The service business and customers' data rights", "Das Servicegeschäft und die Datenrechte der Kunden"),
  documents: [
    { id: "d1", kind: "handoff", tool: "bmc", name: name("bmc"), stand_in: true, fictional: true, spec: BMC },
    { id: "d2", kind: "handoff", tool: "pestel", name: name("pestel"), stand_in: true, fictional: true, spec: PESTEL }
  ],
  facts: Object.values(FACTS),
  answers: { reader: null, merges: MERGES, ideas: IDEAS, recommendation: RECOMMENDATION, brief: BRIEF },
  choices: {
    issues: [
      { id: "pestel-I1", action: "merge", into: "bmc-I1", reason: null },
      { id: "pestel-I2", action: "merge", into: "bmc-I2", reason: null },
      { id: "pestel-I5", action: "merge", into: "bmc-I4", reason: null },
      { id: "pestel-I4", action: "merge", into: "bmc-I5", reason: null }
    ],
    weights: null,
    shortlist: ["P2", "P4", "P1"],
    brief_idea: "P2"
  },
  // The engine's figures along the recorded choices, frozen: tools/check-scenarios.mjs fails when a change
  // to the engine, the files, the prompts or the answers moves one (--print-reference prints them anew).
  reference: {at_stake: {eur: 6500000, stated: 7, of: 7}, kept: 7, covered: {covered: 6, of: 7}, ideas: 6, order: ["P2", "P4", "P1", "P3", "P5", "P6"], top: {id: "P2", score: 4.55}, firsts: {P1: 0, P2: 8, P3: 0, P4: 1, P5: 0, P6: 0}, shortlist_share: 0.425, cost_cents: {en: {fast: [0, 0], balanced: [0, 0], thorough: [8, 8]}, de: {fast: [0, 0], balanced: [0, 0], thorough: [8, 8]}}}
};
