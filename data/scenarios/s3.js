// Scenario S3, Auental Energie: the fictional municipal utility of a mid-sized town in Lower Saxony. Its
// inputs are a five-page excerpt of its annual report, written for the scenario and printed to PDF from
// tools/s3-annual-report.html (one file per language), and the SWOT Challenger's handoff file, a stand-in
// until the challenger exports its own (PLAN.md §5.3). The Reader cites the PDF by page and proposes three
// merges with the SWOT issues; the Ideator proposes five prototypes. What the scenario says about the world
// is listed in DATA_SOURCES.md, §3. Auental Energie, its town and its figures are invented.

import { L, item, kpi, source } from "./standin.js";

/** The facts S3 cites, as DATA_SOURCES.md lists them. */
export const FACTS = {
  GMODG: { id: "S3-GMODG", url: "https://www.bundesregierung.de/breg-de/aktuelles/neues-gebaeudemodernisierungsgesetz-2430284", title: L("Federal Government: The new building modernisation law", "Bundesregierung: Das neue Gebäudemodernisierungsgesetz"), read_on: "2026-11-23" },
  HEAT: { id: "S3-HEAT", url: "https://www.ihk.de/hannover/hauptnavigation/innovation/energie/energiepolitik-recht/waermeplanung-6287230", title: L("IHK Hannover: Municipal heat planning", "IHK Hannover: Kommunale Wärmeplanung"), read_on: "2026-11-23" },
  METER: { id: "S3-METER", url: "https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260921_Rollout.html", title: L("Bundesnetzagentur: Smart-meter rollout", "Bundesnetzagentur: Rollout intelligenter Messsysteme"), read_on: "2026-11-23" },
  DYN: { id: "S3-DYN", url: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/DynStromtarife/start.html", title: L("Bundesnetzagentur: Dynamic electricity tariffs", "Bundesnetzagentur: Dynamische Stromtarife"), read_on: "2026-11-23" },
  ENPAL: { id: "S3-ENPAL", url: "https://www.zfk.de/unternehmen/enpal-will-luecken-in-lokaler-waermeplanung-schliessen", title: L("ZfK: Enpal wants to close gaps in local heat planning", "ZfK: Enpal will Lücken in lokaler Wärmeplanung schließen"), read_on: "2026-11-23" }
};
const S = (f) => source(f);

const COMPANY = {
  name: "Auental Energie",
  sector: "energy_utilities",
  country: "DE",
  description: L("Municipal utility of a mid-sized town in Lower Saxony: power, gas, heat, water, the local grid and car charging", "Stadtwerk einer Mittelstadt in Niedersachsen: Strom, Gas, Wärme, Wasser, das örtliche Netz und Ladesäulen"),
  fictional: true
};

/** The annual-report excerpt as the person would drop it in: one PDF per language, five pages each. */
const PDF = {
  name: L("Auental-Energie-Annual-Report-2025-excerpt.pdf", "Auental-Energie-Geschaeftsbericht-2025-Auszug.pdf"),
  href: L("data/scenarios/s3-annual-report-en.pdf", "data/scenarios/s3-annual-report-de.pdf"),
  // Frozen from tools/build-s3-pdf.mjs; tests/scenarios.mjs compares them with the files.
  bytes: L(105624, 121405),
  pages: L(5, 5)
};
const FILE = PDF.name;
const page = (n) => L(`page ${n}`, `Seite ${n}`);

// ---- the SWOT Challenger's file -------------------------------------------------------------------------

const SWOT = {
  tool: "swot",
  created: "2026-11-23T10:10:00Z",
  company: COMPANY,
  items: {
    strengths: [item("strengths-1", L("Local trust and a known name in town", "Vertrauen vor Ort und ein bekannter Name in der Stadt")), item("strengths-2", L("Owns the power, gas and heat grids", "Besitzt Strom-, Gas- und Wärmenetz")), item("strengths-3", L("Customer centre in the town centre", "Kundenzentrum in der Innenstadt"))],
    weaknesses: [item("weaknesses-1", L("Billing system from 2009", "Abrechnungssystem von 2009")), item("weaknesses-2", L("Smart-meter rollout behind plan", "Einbau intelligenter Messsysteme hinter Plan")), item("weaknesses-3", L("Few staff for digital products", "Wenig Personal für digitale Produkte"))],
    opportunities: [item("opportunities-1", L("The heat plan can grow district heat", "Die Wärmeplanung kann die Fernwärme wachsen lassen")), item("opportunities-2", L("Partnerships with heat-pump installers", "Partnerschaften mit Wärmepumpen-Installateuren")), item("opportunities-3", L("Dynamic tariffs for homes with heat pumps and electric cars", "Dynamische Tarife für Häuser mit Wärmepumpe und Elektroauto"))],
    threats: [item("threats-1", L("The heat plan could strand parts of the gas grid", "Die Wärmeplanung könnte Teile des Gasnetzes entwerten")), item("threats-2", L("Gas sales keep falling", "Der Gasabsatz sinkt weiter")), item("threats-3", L("National providers sell solar and heat pumps directly", "Überregionale Anbieter verkaufen Solar und Wärmepumpen direkt"))]
  },
  issues: [
    {
      id: "I1", type: "regulation", areas: ["threats", "opportunities"], items: ["threats-1", "opportunities-1"], impact: 4, likelihood: 4, horizon: "now",
      title: L("The heat plan due by the end of 2026 decides which streets keep gas", "Die Wärmeplanung bis Ende 2026 entscheidet, welche Straßen Gas behalten"),
      description: L(
        "Lower Saxony's middle-order centres must present a municipal heat plan by the end of 2026. The new heating law allows gas heating again, with a rising share of climate-friendly fuel from 2029, so many owners wait for the plan.",
        "Niedersachsens Mittelzentren müssen bis Ende 2026 eine kommunale Wärmeplanung vorlegen. Das neue Heizungsgesetz erlaubt Gasheizungen wieder, mit einem steigenden Anteil klimafreundlicher Brennstoffe ab 2029, also warten viele Eigentümer auf die Planung."
      ),
      kpis: [kpi("energy_utilities.gross_margin_per_mwh", "down", 2, 5, L("Fewer gas customers in streets that switch", "Weniger Gaskunden in Straßen, die wechseln"))],
      eur: [1000000, 3000000], basis: L("Gas margin in streets the plan may switch, times the share that leaves", "Gasmarge in Straßen, die die Planung umstellen könnte, mal der Anteil, der geht"),
      evidence: [S(FACTS.HEAT), S(FACTS.GMODG)], confidence: "medium"
    },
    {
      id: "I2", type: "market", areas: ["threats"], items: ["threats-2"], impact: 3, likelihood: 4, horizon: "now",
      title: L("Gas customers move to heat pumps", "Gaskunden wechseln zur Wärmepumpe"),
      description: L("Households replace old gas boilers with heat pumps, often bought from a national provider. Gas sales fall each year.", "Haushalte ersetzen alte Gaskessel durch Wärmepumpen, oft von einem überregionalen Anbieter. Der Gasabsatz sinkt jedes Jahr."),
      kpis: [kpi("energy_utilities.customer_churn", "up", 1, 3, L("Gas customers who leave each year", "Gaskunden, die jedes Jahr gehen"))],
      eur: [1000000, 3000000], basis: L("Customers leaving gas a year times the margin per customer", "Kunden, die jährlich das Gas verlassen, mal die Marge je Kunde"),
      evidence: [S(FACTS.GMODG)], confidence: "medium"
    },
    {
      id: "I3", type: "competition", areas: ["threats"], items: ["threats-3"], impact: 3, likelihood: 3, horizon: "1_to_3_years",
      title: L("National providers sell heat pumps and solar directly", "Überregionale Anbieter verkaufen Wärmepumpen und Solar direkt"),
      description: L("Enpal offers heat pumps for towns together with their municipal utilities, and the first utilities take part. It says it installed about 10,000 heat pumps in 2025.", "Enpal bietet Wärmepumpen für Städte gemeinsam mit ihren Stadtwerken an, und die ersten Stadtwerke machen mit. Nach eigenen Angaben hat Enpal 2025 rund 10.000 Wärmepumpen installiert."),
      kpis: [kpi("energy_utilities.customer_churn", "up", 0.5, 1.5, L("Customers who buy their heating elsewhere", "Kunden, die ihre Heizung anderswo kaufen"))],
      eur: [600000, 1800000], basis: L("Heat and power customers at risk times their margin", "Gefährdete Wärme- und Stromkunden mal ihre Marge"),
      evidence: [S(FACTS.ENPAL)], confidence: "medium"
    },
    {
      id: "I4", type: "regulation", areas: ["weaknesses", "opportunities"], items: ["weaknesses-2", "opportunities-3"], impact: 2, likelihood: 4, horizon: "now",
      title: L("Few households can use a dynamic tariff yet", "Wenige Haushalte können schon einen dynamischen Tarif nutzen"),
      description: L("Every supplier must offer a dynamic tariff, but the customer needs a smart meter for it. Nationwide, 5.9 % of metering points had one on 30 June 2026.", "Jeder Lieferant muss einen dynamischen Tarif anbieten, aber der Kunde braucht dafür ein intelligentes Messsystem. Bundesweit hatten am 30. Juni 2026 5,9 % der Messstellen eines."),
      kpis: [kpi("energy_utilities.smart_meter_share", "down", 2, 5, L("Fitting delays keep households off dynamic tariffs", "Verzögerungen beim Einbau halten Haushalte von dynamischen Tarifen fern"))],
      eur: [200000, 600000], basis: L("Households who would switch, times the margin of a dynamic tariff", "Haushalte, die wechseln würden, mal die Marge eines dynamischen Tarifs"),
      evidence: [S(FACTS.DYN), S(FACTS.METER)], confidence: "medium"
    }
  ],
  responses: [
    { id: "R1", issue: "I1", kind: "advantage", chosen: true, title: L("Offer district-heat contracts in the streets the plan names", "In den Straßen, die die Planung nennt, Fernwärmeverträge anbieten"), first_step: L("Heat sales prepares offers for the first two quarters", "Der Wärmevertrieb bereitet Angebote für die ersten zwei Viertel vor"), owner: L("Heat sales", "Wärmevertrieb"), changes: [{ action: "rate", item: "opportunities-1", from: 3, to: 4 }], residual: [500000, 1500000, 3], upside: [500000, 1500000, 3], effort: "L", time_to_impact: L("12 to 24 months", "12 bis 24 Monate") },
    { id: "R2", issue: "I2", kind: "advantage", chosen: true, title: L("Sell heat pumps with a partner instead of losing the customer", "Wärmepumpen mit einem Partner verkaufen, statt den Kunden zu verlieren"), first_step: L("Sales picks an installer partner for a first offer", "Der Vertrieb wählt einen Installationspartner für ein erstes Angebot"), owner: L("Sales", "Vertrieb"), changes: [{ action: "rate", item: "threats-2", from: 3, to: 2 }], residual: [500000, 1500000, 3], upside: [300000, 900000, 3], effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") },
    { id: "R3", issue: "I3", kind: "advantage", chosen: true, title: L("Partner with a national provider for installation and keep the customer", "Mit einem überregionalen Anbieter bei der Installation zusammenarbeiten und den Kunden behalten"), first_step: L("The management talks to two providers", "Die Geschäftsführung spricht mit zwei Anbietern"), owner: L("Management", "Geschäftsführung"), changes: [{ action: "rate", item: "threats-3", from: 3, to: 2 }], residual: [300000, 900000, 2], upside: null, effort: "M", time_to_impact: L("6 to 12 months", "6 bis 12 Monate") },
    { id: "R4", issue: "I4", kind: "mitigate", chosen: true, title: L("Fit smart meters first in homes with heat pumps or wallboxes", "Intelligente Messsysteme zuerst in Häuser mit Wärmepumpe oder Wallbox einbauen"), first_step: L("Metering reorders the rollout list", "Der Messstellenbetrieb ordnet die Einbauliste neu"), owner: L("Metering", "Messstellenbetrieb"), changes: [{ action: "rate", item: "weaknesses-2", from: 3, to: 2 }], residual: [100000, 300000, 2], upside: null, effort: "S", time_to_impact: L("3 to 6 months", "3 bis 6 Monate") }
  ],
  score: { name: "efe", scale: "1-4", before: 2.4, after: 2.95 },
  pressure: { label: L("Items challenged", "Hinterfragte Punkte"), before: 4, after: 2, of: 6 },
  summary: (f, lang, m) => (lang === "de"
    ? { headline: `Wärmeplanung und Wärmepumpen setzen ${m(f.at_stake_eur_year)} im Jahr aufs Spiel`, text: `Vier Themen aus Schwächen und Risiken. Mit den gewählten Strategien bleiben ${m(f.left_eur_year)} im Jahr im Risiko, und ${m(f.upside_eur_year)} Chance kommen hinzu.` }
    : { headline: `The heat plan and heat pumps put ${m(f.at_stake_eur_year)} a year at risk`, text: `Four issues from the weaknesses and threats. The chosen strategies leave ${m(f.left_eur_year)} a year at risk and add ${m(f.upside_eur_year)} of upside.` })
};

// ---- the recorded run -----------------------------------------------------------------------------------

/** The Reader's answer from the PDF, with merges proposed against the SWOT file's issues. */
const READER = {
  company: {
    name: "Auental Energie GmbH",
    sector: "energy_utilities",
    goals: [L("Present the heat plan with the town by the end of 2026", "Die Wärmeplanung bis Ende 2026 mit der Stadt vorlegen"), L("Replace the billing system by 2028", "Das Abrechnungssystem bis 2028 ersetzen"), L("Speed up the smart-meter rollout with a partner", "Den Einbau intelligenter Messsysteme mit einem Partner beschleunigen")],
    targets: [L("Revenue of about €95 million in 2026", "Umsatz von rund 95 Millionen Euro 2026"), L("EBIT of about €3.5 million in 2026", "EBIT von rund 3,5 Millionen Euro 2026")]
  },
  issues: [
    {
      id: "I1",
      title: L("Grid investment runs ahead of the revenue the regulator allows", "Die Netzinvestitionen laufen den genehmigten Erlösen voraus"),
      area: L("Grid", "Netz"),
      description: L("The power grid needs investment for heat pumps, charging points and solar panels. The approved revenue follows years later, and the utility pays to finance the gap.", "Das Stromnetz braucht Investitionen für Wärmepumpen, Ladepunkte und Solaranlagen. Die genehmigten Erlöse folgen Jahre später, und das Stadtwerk zahlt für die Finanzierung der Lücke."),
      money_as_stated: L("About €62 million of investment by 2030; financing the gap costs about €1.2 million a year", "Rund 62 Millionen Euro Investitionen bis 2030; die Finanzierung der Lücke kostet rund 1,2 Millionen Euro im Jahr"),
      eur_year_low: 1000000, eur_year_high: 1400000, eur_year_expected: 1200000,
      eur_basis: L("The report puts the cost of financing the gap at about €1.2 million a year (page 3)", "Laut Bericht kostet die Finanzierung der Lücke rund 1,2 Millionen Euro im Jahr (Seite 3)"),
      kpis: [{ name: L("Free cash flow", "Freier Cashflow"), library_id: "general.free_cash_flow", today: L("−€3.2m (2025)", "−3,2 Mio. € (2025)"), unit: "€" }],
      sources: [{ file: FILE, where: page(3), quote: L("Until it catches up, financing the gap costs us about €1.2 million a year.", "Bis sie aufholen, kostet uns die Finanzierung der Lücke rund 1,2 Millionen Euro im Jahr.") }],
      confidence: "high"
    },
    {
      id: "I2",
      title: L("Smart meters lag behind the legal quota", "Der Einbau intelligenter Messsysteme liegt hinter der Quote"),
      area: L("Metering", "Messwesen"),
      description: L("The utility has fitted smart meters in fewer mandatory cases than the quota asks for. Fitters are scarce and many appointments with households fail.", "Das Stadtwerk hat in weniger Pflichtfällen intelligente Messsysteme eingebaut, als die Quote verlangt. Monteure sind knapp, und viele Termine bei Haushalten scheitern."),
      money_as_stated: L("", ""),
      eur_year_low: null, eur_year_high: null, eur_year_expected: null,
      eur_basis: L("", ""),
      kpis: [{ name: L("Share of smart meters installed", "Anteil eingebauter intelligenter Messsysteme"), library_id: "energy_utilities.smart_meter_share", today: L("19.7 % of mandatory cases (end of 2025)", "19,7 % der Pflichtfälle (Ende 2025)"), unit: "%" }],
      sources: [{ file: FILE, where: page(3), quote: L("At the end of 2025 we had fitted smart meters in 19.7 % of the mandatory cases, just below the 20 % quota.", "Ende 2025 hatten wir in 19,7 % der Pflichtfälle intelligente Messsysteme eingebaut, knapp unter der Quote von 20 %.") }],
      confidence: "high"
    },
    {
      id: "I3",
      title: L("The old billing system cannot bill dynamic tariffs", "Das alte Abrechnungssystem kann dynamische Tarife nicht abrechnen"),
      area: L("Billing and IT", "Abrechnung und IT"),
      description: L("Dynamic tariffs need billing in quarter-hour intervals, which the billing system cannot do. Customers on a dynamic tariff are billed by hand.", "Dynamische Tarife brauchen eine Abrechnung im Viertelstundentakt, die das System nicht kann. Kunden mit dynamischem Tarif werden von Hand abgerechnet."),
      money_as_stated: L("About €0.4 million a year in staff time and corrections", "Rund 0,4 Millionen Euro im Jahr an Arbeitszeit und Korrekturen"),
      eur_year_low: 300000, eur_year_high: 500000, eur_year_expected: 400000,
      eur_basis: L("The report puts the cost of billing by hand at about €0.4 million a year (page 3)", "Laut Bericht kostet die Abrechnung von Hand rund 0,4 Millionen Euro im Jahr (Seite 3)"),
      kpis: [{ name: L("Customers on dynamic tariffs", "Kunden mit dynamischem Tarif"), library_id: "energy_utilities.dynamic_tariff_share", today: L("312 customers (2025)", "312 Kunden (2025)"), unit: L("customers", "Kunden") }],
      sources: [{ file: FILE, where: page(3), quote: L("It cannot bill dynamic tariffs in quarter-hour intervals, so the 312 customers on a dynamic tariff are billed by hand.", "Es kann dynamische Tarife nicht im Viertelstundentakt abrechnen, deshalb werden die 312 Kunden mit dynamischem Tarif von Hand abgerechnet.") }],
      confidence: "high"
    },
    {
      id: "I4",
      title: L("Gas customers leave for heat pumps", "Gaskunden wechseln zur Wärmepumpe"),
      area: L("Gas sales", "Gasvertrieb"),
      description: L("Households that switch to a heat pump take their gross margin with them. Gas sales fell in 2025.", "Haushalte, die zur Wärmepumpe wechseln, nehmen ihre Rohmarge mit. Der Gasabsatz sank 2025."),
      money_as_stated: L("About €2 million of margin lost in 2025", "Rund 2 Millionen Euro verlorene Marge im Jahr 2025"),
      eur_year_low: 1500000, eur_year_high: 2500000, eur_year_expected: 2000000,
      eur_basis: L("The report puts the margin lost in 2025 at about €2 million (page 4)", "Laut Bericht summierte sich die verlorene Marge 2025 auf rund 2 Millionen Euro (Seite 4)"),
      kpis: [
        { name: L("Gas customers", "Gaskunden"), library_id: null, today: L("11,500 (2025)", "11.500 (2025)"), unit: L("customers", "Kunden") },
        { name: L("Customer churn", "Kundenabwanderung"), library_id: "energy_utilities.customer_churn", today: L("", ""), unit: "%" }
      ],
      sources: [
        { file: FILE, where: page(4), quote: L("In 2025 the lost margin came to about €2 million.", "2025 summierte sich die verlorene Marge auf rund 2 Millionen Euro.") },
        { file: FILE, where: page(2), quote: L("Gas sales fell 6 % as customers fitted heat pumps and a mild winter cut demand.", "Der Gasabsatz sank um 6 %, weil Kundinnen und Kunden Wärmepumpen einbauten und ein milder Winter die Nachfrage senkte.") }
      ],
      confidence: "high"
    },
    {
      id: "I5",
      title: L("The heat plan decides which streets keep the gas grid", "Die Wärmeplanung entscheidet, welche Straßen das Gasnetz behalten"),
      area: L("Heat and gas grid", "Wärme und Gasnetz"),
      description: L("The town must present its heat plan by the end of 2026. Where streets switch to district heat or heat pumps, parts of the gas grid will no longer pay for themselves.", "Die Stadt muss ihre Wärmeplanung bis Ende 2026 vorlegen. Wo Straßen zu Fernwärme oder Wärmepumpen wechseln, tragen sich Teile des Gasnetzes nicht mehr."),
      money_as_stated: L("Residual book value of the gas grid: €38 million", "Restbuchwert des Gasnetzes: 38 Millionen Euro"),
      eur_year_low: null, eur_year_high: null, eur_year_expected: null,
      eur_basis: L("", ""),
      kpis: [{ name: L("Heat customers connected", "Angeschlossene Wärmekunden"), library_id: "energy_utilities.heat_customers", today: L("2,100 (2025)", "2.100 (2025)"), unit: L("customers", "Kunden") }],
      sources: [
        { file: FILE, where: page(4), quote: L("The plan will show where district heat makes sense, where heat pumps will dominate and where the gas grid stays.", "Die Planung zeigt, wo Fernwärme sinnvoll ist, wo Wärmepumpen vorherrschen werden und wo das Gasnetz bleibt.") },
        { file: FILE, where: page(5), quote: L("The residual book value of the gas grid is €38 million.", "Der Restbuchwert des Gasnetzes beträgt 38 Millionen Euro.") }
      ],
      confidence: "medium"
    }
  ],
  merges: [
    { keep: "I5", merged: ["swot-I1"], why: L("Both are about the heat plan due by the end of 2026 and what it means for the gas grid.", "Beide handeln von der Wärmeplanung bis Ende 2026 und davon, was sie für das Gasnetz bedeutet.") },
    { keep: "I4", merged: ["swot-I2"], why: L("Both describe gas customers switching to heat pumps.", "Beide beschreiben Gaskunden, die zur Wärmepumpe wechseln.") },
    { keep: "I3", merged: ["swot-I4"], why: L("Both are about dynamic tariffs the utility can't yet offer at scale.", "Beide handeln von dynamischen Tarifen, die das Stadtwerk noch nicht in der Breite anbieten kann.") }
  ]
};

const r = (score, en, de) => ({ score, reason: L(en, de) });
const fig = (name, demo, today = null, src = null) => ({ name, today: today || L("", ""), source: src || "", public: !!today, demo });
const REPORT = (n) => L(`Annual report 2025, page ${n}`, `Geschäftsbericht 2025, Seite ${n}`);

const IDEAS = {
  ideas: [
    {
      name: L("Street Heat Check", "Straßencheck Wärmeplanung"),
      what_it_does: L("Checks each street's heat demand, pipe age and buildings and proposes district heat, heat pumps or gas for the heat plan.", "Prüft für jede Straße Wärmebedarf, Leitungsalter und Gebäude und schlägt für die Wärmeplanung Fernwärme, Wärmepumpen oder Gas vor."),
      issues: ["doc-I5"],
      audience: L("Heat planning and the town's planning office", "Wärmeplanung und Stadtplanungsamt"),
      room: [
        L("A map of the town shows every street with its heat demand", "Eine Karte der Stadt zeigt jede Straße mit ihrem Wärmebedarf"),
        L("The agent marks the streets where district heat would pay", "Der Agent markiert die Straßen, in denen sich Fernwärme lohnt"),
        L("It shows what each choice means for the gas grid", "Er zeigt, was jede Wahl für das Gasnetz bedeutet"),
        L("It drafts the street list for the council's heat plan", "Er entwirft die Straßenliste für die Wärmeplanung des Rats")
      ],
      how: {
        spot: L("Finds streets with high heat demand close to the heat network", "Findet Straßen mit hohem Wärmebedarf nahe am Wärmenetz"),
        check: L("Checks the age of the gas pipes, the buildings and their heating", "Prüft das Alter der Gasleitungen, die Gebäude und ihre Heizung"),
        calculate: L("Works out the cost of each option per street", "Rechnet die Kosten jeder Option je Straße aus"),
        propose: L("Proposes district heat, heat pumps or gas street by street", "Schlägt Straße für Straße Fernwärme, Wärmepumpen oder Gas vor"),
        prepare: L("Drafts the street list and a summary for the council", "Entwirft die Straßenliste und eine Zusammenfassung für den Rat"),
        decision: L("The heat planning team and the town decide each street", "Das Team der Wärmeplanung und die Stadt entscheiden jede Straße")
      },
      key_figures: [
        fig(L("Heat customers connected", "Angeschlossene Wärmekunden"), L("Streets where district heat pays, against today's network", "Straßen, in denen sich Fernwärme lohnt, gegen das heutige Netz"), L("2,100 (2025)", "2.100 (2025)"), REPORT(2)),
        fig(L("Gas grid at risk", "Gefährdetes Gasnetz"), L("The book value in streets that switch away from gas", "Der Buchwert in Straßen, die vom Gas wechseln"), L("€38 million residual book value", "38 Millionen Euro Restbuchwert"), REPORT(5))
      ],
      data: [L("The heat-planning rules of Lower Saxony", "Die Regeln der Wärmeplanung in Niedersachsen"), L("Public maps of the town, with synthetic buildings in the demo", "Öffentliche Karten der Stadt, mit synthetischen Gebäuden in der Demo"), L("Synthetic heat demand per street", "Synthetischer Wärmebedarf je Straße")],
      risks: [L("The heat plan is a political decision: the demo proposes, the council decides", "Die Wärmeplanung ist eine politische Entscheidung: Die Demo schlägt vor, der Rat entscheidet"), L("Building data is synthetic in the demo", "Die Gebäudedaten sind in der Demo synthetisch")],
      effort_days: { low: 12, high: 18 },
      live_inputs: { model_calls: 14, web_searches: 2 },
      ratings: {
        value: r(5, "The gas grid's book value and new heat contracts are at stake", "Der Buchwert des Gasnetzes und neue Wärmeverträge stehen auf dem Spiel"),
        evidence: r(4, "The deadline and the law are public; street data is not", "Frist und Gesetz sind öffentlich, Straßendaten nicht"),
        buildable: r(4, "Maps are public and demand can be synthetic", "Karten sind öffentlich, der Bedarf kann synthetisch sein"),
        agentic: r(5, "It weighs options per street and hands the choice to people", "Er wägt je Straße Optionen ab und überlässt die Wahl den Menschen"),
        relevance: r(5, "The plan is due by the end of 2026", "Die Planung ist bis Ende 2026 fällig"),
        demo: r(5, "A town map that changes colour street by street sticks", "Eine Stadtkarte, die Straße für Straße die Farbe wechselt, bleibt hängen"),
        risk: r(3, "Heat planning is political in a small town", "Wärmeplanung ist in einer kleinen Stadt politisch")
      },
      why: L("It turns the heat plan, due this year, into street-by-street choices the council can follow.", "Er macht aus der Wärmeplanung, die dieses Jahr fällig ist, Entscheidungen Straße für Straße, denen der Rat folgen kann.")
    },
    {
      name: L("Meter Rollout Planner", "Messsystem-Planer"),
      what_it_does: L("Plans each week's smart-meter installations by route, mandatory cases first, with the appointments households are most likely to keep.", "Plant jede Woche den Einbau intelligenter Messsysteme nach Touren, Pflichtfälle zuerst, mit den Terminen, die Haushalte am ehesten einhalten."),
      issues: ["doc-I2"],
      audience: L("Metering operations", "Messstellenbetrieb"),
      room: [
        L("The week's open mandatory cases appear on a map", "Die offenen Pflichtfälle der Woche erscheinen auf einer Karte"),
        L("The agent groups them into routes for each fitter", "Der Agent fasst sie zu Touren für jeden Monteur zusammen"),
        L("It proposes appointment slots that households are likely to keep", "Er schlägt Termine vor, die Haushalte wahrscheinlich einhalten"),
        L("It drafts the appointment letters", "Er entwirft die Terminschreiben")
      ],
      how: {
        spot: L("Finds the mandatory cases still without a smart meter", "Findet die Pflichtfälle, die noch kein intelligentes Messsystem haben"),
        check: L("Checks access notes, failed visits and fitters' capacity", "Prüft Zugangshinweise, gescheiterte Termine und die Kapazität der Monteure"),
        calculate: L("Works out routes and the share of the quota reached each month", "Rechnet Touren und den erreichten Anteil der Quote je Monat aus"),
        propose: L("Proposes the week's routes and appointment slots", "Schlägt die Touren und Termine der Woche vor"),
        prepare: L("Drafts the letters and the fitters' lists", "Entwirft die Schreiben und die Listen der Monteure"),
        decision: L("The metering lead approves the week's plan", "Die Leitung des Messstellenbetriebs gibt den Wochenplan frei")
      },
      key_figures: [
        fig(L("Share of smart meters installed", "Anteil eingebauter intelligenter Messsysteme"), L("Against the quota, week by week", "Gegen die Quote, Woche für Woche"), L("19.7 % of mandatory cases (end of 2025)", "19,7 % der Pflichtfälle (Ende 2025)"), REPORT(3)),
        fig(L("Failed appointments", "Gescheiterte Termine"), L("Fall when slots follow what households keep", "Sinken, wenn Termine dem folgen, was Haushalte einhalten"))
      ],
      data: [L("Synthetic addresses and mandatory cases", "Synthetische Adressen und Pflichtfälle"), L("The rollout quotas the regulator publishes", "Die Einbauquoten, die die Bundesnetzagentur veröffentlicht")],
      risks: [L("Real addresses are personal data, so the demo uses synthetic ones", "Echte Adressen sind personenbezogene Daten, daher nutzt die Demo synthetische")],
      effort_days: { low: 8, high: 12 },
      live_inputs: { model_calls: 8, web_searches: 1 },
      ratings: {
        value: r(4, "Missing the quota brings the regulator's proceedings", "Eine verfehlte Quote bringt Verfahren der Bundesnetzagentur"),
        evidence: r(5, "The quota and the report's figure are public", "Die Quote und die Zahl im Bericht sind öffentlich"),
        buildable: r(4, "Routes and addresses can be synthetic", "Touren und Adressen können synthetisch sein"),
        agentic: r(4, "It plans, books and asks a person to approve", "Er plant, bucht und lässt einen Menschen freigeben"),
        relevance: r(4, "The report names the delay", "Der Bericht nennt den Rückstand"),
        demo: r(3, "Route plans are useful but not dramatic", "Tourenpläne sind nützlich, aber nicht spektakulär"),
        risk: r(5, "No sensitive data in the demo", "Keine heiklen Daten in der Demo")
      },
      why: L("It closes the gap to the quota with the fitters the utility has.", "Er schließt die Lücke zur Quote mit den Monteuren, die das Stadtwerk hat.")
    },
    {
      name: L("Dynamic Tariff Advisor", "Tarifberater dynamisch"),
      what_it_does: L("Compares a household's load with a dynamic tariff, shows the saving and prepares the offer with a smart-meter appointment.", "Vergleicht den Verbrauch eines Haushalts mit einem dynamischen Tarif, zeigt die Ersparnis und bereitet das Angebot mit einem Einbautermin vor."),
      issues: ["doc-I3"],
      audience: L("Sales and customer service", "Vertrieb und Kundenservice"),
      room: [
        L("A household with a heat pump and an electric car is picked", "Ein Haushalt mit Wärmepumpe und Elektroauto wird gewählt"),
        L("The agent sets its load against hourly prices", "Der Agent stellt seinen Verbrauch gegen stündliche Preise"),
        L("It shows the yearly saving on a dynamic tariff", "Er zeigt die jährliche Ersparnis mit einem dynamischen Tarif"),
        L("It drafts the offer with a smart-meter appointment", "Er entwirft das Angebot mit einem Einbautermin")
      ],
      how: {
        spot: L("Finds households with heat pumps, wallboxes or solar panels", "Findet Haushalte mit Wärmepumpe, Wallbox oder Solaranlage"),
        check: L("Checks whether a smart meter is fitted or can be", "Prüft, ob ein intelligentes Messsystem eingebaut ist oder werden kann"),
        calculate: L("Works out the bill on the current and the dynamic tariff", "Rechnet die Rechnung im heutigen und im dynamischen Tarif aus"),
        propose: L("Proposes the tariff where it saves money", "Schlägt den Tarif vor, wo er Geld spart"),
        prepare: L("Drafts the offer and the meter appointment", "Entwirft das Angebot und den Einbautermin"),
        decision: L("The customer adviser decides whether to send the offer", "Der Kundenberater entscheidet, ob das Angebot hinausgeht")
      },
      key_figures: [
        fig(L("Customers on dynamic tariffs", "Kunden mit dynamischem Tarif"), L("Grows with each offer accepted", "Wächst mit jedem angenommenen Angebot"), L("312 customers (2025)", "312 Kunden (2025)"), REPORT(3)),
        fig(L("Saving per household a year", "Ersparnis je Haushalt und Jahr"), L("Shown for each household from its load", "Für jeden Haushalt aus seinem Verbrauch gezeigt"))
      ],
      data: [L("Published exchange prices for electricity", "Veröffentlichte Börsenpreise für Strom"), L("Synthetic load profiles", "Synthetische Lastprofile")],
      risks: [L("Billing by hand limits how many customers can switch before the new system", "Die Abrechnung von Hand begrenzt, wie viele Kunden vor dem neuen System wechseln können"), L("Savings depend on prices that change", "Die Ersparnis hängt von Preisen ab, die sich ändern")],
      effort_days: { low: 6, high: 10 },
      live_inputs: { model_calls: 8, web_searches: 1 },
      ratings: {
        value: r(3, "The saving per household is modest", "Die Ersparnis je Haushalt ist bescheiden"),
        evidence: r(4, "The duty and the prices are public", "Pflicht und Preise sind öffentlich"),
        buildable: r(5, "Prices are public, load profiles synthetic", "Preise sind öffentlich, Lastprofile synthetisch"),
        agentic: r(4, "It compares, proposes and books for a person to approve", "Er vergleicht, schlägt vor und bucht, ein Mensch gibt frei"),
        relevance: r(4, "Dynamic tariffs are a duty and a growing ask", "Dynamische Tarife sind Pflicht und wachsender Wunsch"),
        demo: r(5, "A bill that shrinks on screen convinces", "Eine Rechnung, die auf dem Bildschirm schrumpft, überzeugt"),
        risk: r(4, "Tariff advice needs care", "Tarifberatung braucht Sorgfalt")
      },
      why: L("A legal duty becomes an offer customers want.", "Aus einer Pflicht wird ein Angebot, das Kunden wollen.")
    },
    {
      name: L("Switch Risk Radar", "Wechselrisiko-Radar"),
      what_it_does: L("Spots gas customers likely to switch to a heat pump and proposes a heat offer from the utility before they leave.", "Erkennt Gaskunden, die wahrscheinlich zur Wärmepumpe wechseln, und schlägt ein Wärmeangebot des Stadtwerks vor, bevor sie gehen."),
      issues: ["doc-I4"],
      audience: L("Sales for heat and gas", "Vertrieb Wärme und Gas"),
      room: [
        L("Gas customers appear by street and boiler age", "Gaskunden erscheinen nach Straße und Kesselalter"),
        L("The agent ranks them by how likely they are to switch", "Der Agent reiht sie danach, wie wahrscheinlich sie wechseln"),
        L("It proposes an offer for each: district heat, a heat pump with a partner, or gas", "Er schlägt jedem ein Angebot vor: Fernwärme, eine Wärmepumpe mit Partner oder Gas"),
        L("It drafts the letter for the adviser", "Er entwirft das Schreiben für den Berater")
      ],
      how: {
        spot: L("Finds customers with old boilers in streets the heat plan may switch", "Findet Kunden mit alten Kesseln in Straßen, die die Wärmeplanung umstellen könnte"),
        check: L("Checks contract end dates and each building's options", "Prüft Vertragsenden und die Optionen jedes Gebäudes"),
        calculate: L("Works out the margin each would take with them", "Rechnet die Marge aus, die jeder mitnehmen würde"),
        propose: L("Proposes the offer most likely to keep the customer", "Schlägt das Angebot vor, das den Kunden am ehesten hält"),
        prepare: L("Drafts the letter and the adviser's notes", "Entwirft das Schreiben und die Notizen für den Berater"),
        decision: L("The adviser decides whom to contact", "Der Berater entscheidet, wen er anspricht")
      },
      key_figures: [
        fig(L("Gas customers", "Gaskunden"), L("Kept, or moved to the utility's own heat offer", "Gehalten oder ins eigene Wärmeangebot geholt"), L("11,500 (2025)", "11.500 (2025)"), REPORT(2)),
        fig(L("Margin kept a year", "Gehaltene Marge im Jahr"), L("Against {{fact:issue.doc-I4.eur}} lost in 2025", "Gegen {{fact:issue.doc-I4.eur}}, die 2025 verloren gingen"))
      ],
      data: [L("Synthetic customer and boiler data", "Synthetische Kunden- und Kesseldaten"), L("Public building data", "Öffentliche Gebäudedaten")],
      risks: [L("Real customer data is personal, so the demo is synthetic", "Echte Kundendaten sind personenbezogen, daher ist die Demo synthetisch"), L("Customers may find targeted letters intrusive", "Kunden empfinden gezielte Schreiben womöglich als aufdringlich")],
      effort_days: { low: 10, high: 14 },
      live_inputs: { model_calls: 10, web_searches: 0 },
      ratings: {
        value: r(5, "The report names the margin lost", "Der Bericht nennt die verlorene Marge"),
        evidence: r(3, "The figure is the company's own estimate", "Die Zahl ist eine eigene Schätzung des Unternehmens"),
        buildable: r(3, "Credible boiler data takes care", "Glaubwürdige Kesseldaten brauchen Sorgfalt"),
        agentic: r(4, "It ranks, proposes and asks an adviser", "Er reiht, schlägt vor und fragt einen Berater"),
        relevance: r(5, "Gas sales fell this year", "Der Gasabsatz ist dieses Jahr gesunken"),
        demo: r(4, "A ranked list with offers is clear", "Eine gereihte Liste mit Angeboten ist klar"),
        risk: r(3, "Targeting customers needs care", "Kunden gezielt anzusprechen braucht Sorgfalt")
      },
      why: L("It keeps customers the utility would otherwise lose to a national provider.", "Er hält Kunden, die das Stadtwerk sonst an einen überregionalen Anbieter verlöre.")
    },
    {
      name: L("Grid Spend Planner", "Netzinvestitions-Planer"),
      what_it_does: L("Orders the grid investments by need and by when the approved revenue follows, and shows the financing cost of each plan.", "Ordnet die Netzinvestitionen nach Bedarf und danach, wann die genehmigten Erlöse folgen, und zeigt die Finanzierungskosten jedes Plans."),
      issues: ["doc-I1"],
      audience: L("Grid planning and finance", "Netzplanung und Finanzen"),
      room: [
        L("The grid projects up to 2030 appear on a timeline", "Die Netzprojekte bis 2030 erscheinen auf einer Zeitachse"),
        L("The agent marks those the heat plan makes urgent", "Der Agent markiert die, die die Wärmeplanung dringlich macht"),
        L("It shows the financing cost of building now or later", "Er zeigt die Finanzierungskosten, wenn jetzt oder später gebaut wird"),
        L("It proposes an order and drafts the board paper", "Er schlägt eine Reihenfolge vor und entwirft die Vorlage für den Aufsichtsrat")
      ],
      how: {
        spot: L("Finds grid sections that heat pumps and chargers will overload", "Findet Netzabschnitte, die Wärmepumpen und Ladepunkte überlasten werden"),
        check: L("Checks each project against the heat plan and the approved revenue", "Prüft jedes Projekt gegen die Wärmeplanung und die genehmigten Erlöse"),
        calculate: L("Works out the financing cost of each order of projects", "Rechnet die Finanzierungskosten jeder Reihenfolge aus"),
        propose: L("Proposes the order with the lowest cost and risk", "Schlägt die Reihenfolge mit den geringsten Kosten und Risiken vor"),
        prepare: L("Drafts the board paper", "Entwirft die Vorlage für den Aufsichtsrat"),
        decision: L("The management decides the investment plan", "Die Geschäftsführung entscheidet den Investitionsplan")
      },
      key_figures: [
        fig(L("Free cash flow", "Freier Cashflow"), L("Under each order of projects", "Unter jeder Reihenfolge der Projekte"), L("−€3.2m (2025)", "−3,2 Mio. € (2025)"), REPORT(2)),
        fig(L("Financing cost a year", "Finanzierungskosten im Jahr"), L("{{fact:issue.doc-I1.eur}} a year today, and with the proposed order", "{{fact:issue.doc-I1.eur}} im Jahr heute und mit der vorgeschlagenen Reihenfolge"))
      ],
      data: [L("Synthetic grid sections and loads", "Synthetische Netzabschnitte und Lasten"), L("The regulator's published rules for approved revenue", "Die veröffentlichten Regeln der Bundesnetzagentur für genehmigte Erlöse")],
      risks: [L("The regulation is complex and the demo simplifies it", "Die Regulierung ist komplex, und die Demo vereinfacht sie"), L("Grid data is synthetic", "Die Netzdaten sind synthetisch")],
      effort_days: { low: 12, high: 16 },
      live_inputs: { model_calls: 9, web_searches: 1 },
      ratings: {
        value: r(4, "The financing cost is plain money", "Die Finanzierungskosten sind klares Geld"),
        evidence: r(4, "The report states it", "Der Bericht nennt sie"),
        buildable: r(3, "Grid data must be synthetic", "Netzdaten müssen synthetisch sein"),
        agentic: r(4, "It weighs projects and asks the management", "Er wägt Projekte ab und fragt die Geschäftsführung"),
        relevance: r(4, "Investment is a stated priority", "Investitionen sind eine erklärte Priorität"),
        demo: r(3, "Timelines take explaining", "Zeitachsen brauchen Erklärung"),
        risk: r(4, "Internal planning", "Interne Planung")
      },
      why: L("It shows the management which grid money to spend first.", "Er zeigt der Geschäftsführung, welches Netzgeld sie zuerst ausgeben sollte.")
    }
  ]
};

const RECOMMENDATION = {
  headline: L("{{fact:top.name}} scores highest of {{fact:ideas.count}} prototypes for Auental Energie", "{{fact:top.name}} erreicht den besten Wert von {{fact:ideas.count}} Prototypen für Auental Energie"),
  looked_at: L("Auental Energie's annual report 2025, a five-page excerpt, and the SWOT Challenger's report, with nine issues between them.", "Der Geschäftsbericht 2025 von Auental Energie, ein Auszug von fünf Seiten, und der Bericht des SWOT Challengers, mit zusammen neun Themen."),
  found: L("At stake a year: {{fact:at_stake}}. The ideas answer {{fact:issues.covered}} of {{fact:issues.kept}} kept issues. The heat plan, due by the end of 2026, runs through most of them.", "Pro Jahr auf dem Spiel: {{fact:at_stake}}. Die Ideen beantworten {{fact:issues.covered}} von {{fact:issues.kept}} behaltenen Themen. Die Wärmeplanung, fällig bis Ende 2026, zieht sich durch die meisten."),
  needed: L("Rank your top three, name who from the town should be in the room, and confirm that synthetic street and customer data is fine for a first build.", "Reihen Sie Ihre drei Favoriten, nennen Sie, wer aus der Stadt im Raum sein soll, und bestätigen Sie, dass synthetische Straßen- und Kundendaten für einen ersten Bau in Ordnung sind.")
};

export default {
  schema: "pi-scenario/1",
  id: "s3",
  source: "authored",
  as_of: "2026-11-23",
  company: { name: COMPANY.name, sector: COMPANY.sector, country: COMPANY.country, fictional: true },
  pitch: L("The municipal utility of a mid-sized town in Lower Saxony", "Das Stadtwerk einer Mittelstadt in Niedersachsen"),
  count: 5,
  focus: L("", ""),
  documents: [
    { id: "d1", kind: "pdf", name: PDF.name, href: PDF.href, bytes: PDF.bytes, pages: PDF.pages, stand_in: false, fictional: true },
    { id: "d2", kind: "handoff", tool: "swot", name: L("swot-challenger-auental-energie-2026-11-23-en.json", "swot-challenger-auental-energie-2026-11-23-de.json"), stand_in: true, fictional: true, spec: SWOT }
  ],
  facts: Object.values(FACTS),
  answers: { reader: READER, merges: null, ideas: IDEAS, recommendation: RECOMMENDATION, brief: null },
  choices: {
    issues: [
      { id: "swot-I1", action: "merge", into: "doc-I5", reason: null },
      { id: "swot-I2", action: "merge", into: "doc-I4", reason: null },
      { id: "swot-I4", action: "merge", into: "doc-I3", reason: null }
    ],
    weights: null,
    shortlist: ["P1", "P3", "P4"],
    brief_idea: null
  },
  // The engine's figures along the recorded choices, frozen: tools/check-scenarios.mjs fails when a change
  // to the engine, the files, the prompts or the answers moves one (--print-reference prints them anew).
  reference: {at_stake: {eur: 5600000, stated: 5, of: 6}, kept: 6, covered: {covered: 5, of: 6}, ideas: 5, order: ["P1", "P3", "P4", "P2", "P5"], top: {id: "P1", score: 4.6}, firsts: {P1: 9, P2: 0, P3: 0, P4: 0, P5: 0}, shortlist_share: 0.679, cost_cents: {en: {fast: [0, 0], balanced: [1, 1], thorough: [11, 13]}, de: {fast: [0, 0], balanced: [1, 1], thorough: [12, 13]}}}
};
