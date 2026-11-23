// Alle sichtbaren Texte auf Deutsch. js/i18n/en.js hat dieselben Schlüssel; tests/i18n.mjs hält beide in
// Schlüsseln und Platzhaltern gleich und prüft, dass jeder Schlüssel genutzt wird. Platzhalter in
// geschweiften Klammern füllt t(); Schlüssel auf .one und .other sind Pluralformen für tn(). Die
// Anleitungen „So funktioniert's“ stehen in index.html, eine je Sprache, wie Vicis Anleitung es verlangt.

export default {
  // ---- die Seite ---------------------------------------------------------------------------------------
  "app.name": "Prototype Ideator",
  "app.title": "Prototype Ideator: von Dokumenten zu Agentic-AI-Prototypen, die sich lohnen",
  "p.skip": "Zum Schritt auf dem Bildschirm springen",
  "p.mode.tip": "Eine Wiedergabe aufgezeichneter Agentenantworten mit den echten Bewertungsregeln. Sie ruft kein Modell auf. „Live starten“ ruft Claude mit Ihrem eigenen Schlüssel auf.",
  "p.theme": "Dunkles oder helles Design",
  "p.lang": "Sprache",
  "p.lang.now": "Die Seite ist jetzt auf Deutsch.",
  "p.kpis": "Kennzahlen",
  "p.strip": "KI-Agenten lesen Ihre Dokumente, ordnen die Geschäftsthemen und schlagen bewertete Agentic-AI-Prototypen vor, die je eine Kennzahl verbessern; Sie wählen einen zum Bauen. Die Simulation nutzt fiktive Firmen, ein Live-Lauf Ihre Dokumente und Ihren Claude-Schlüssel.",
  "p.byline.label": "Erstellt von",
  "p.byline.linkedin": " auf LinkedIn (öffnet einen neuen Tab)",
  "p.byline.website": "Website von Victor Pflüger (öffnet einen neuen Tab)",
  "p.byline.tip": "Website",
  "p.newTab": " (öffnet einen neuen Tab)",
  "p.public": "Nur öffentliche Informationen: Geben Sie nie vertrauliche, personenbezogene oder anderweitig geschützte Daten ein.",

  // ---- die Kennzahlen -----------------------------------------------------------------------------------
  "kpi.atStake.label": "Pro Jahr auf dem Spiel",
  "kpi.atStake.wait": "nach dem Lesen",
  "kpi.covered.label": "Abgedeckte Themen",
  "kpi.covered.wait": "nach den Ideen",
  "kpi.top.label": "Bester Wert",
  "kpi.top.wait": "von 5, nach den Ideen",
  "kpi.cost.label": "Sitzungskosten",
  "kpi.cost.wait": "nach einem Lauf",

  // ---- die Schrittleiste --------------------------------------------------------------------------------
  "p.steps": "Schritte",
  "p.play": "Abspielen",
  "p.back": "Zurück",
  "p.next": "Weiter",
  "p.step.start": "Start",
  "p.step.read": "Lesen",
  "p.step.ideate": "Ideen",
  "p.step.score": "Bewerten",
  "p.step.shortlist": "Auswahl",
  "p.step.report": "Bericht",
  "p.live": "Live starten",
  "p.ai": "Sie interagieren mit einem KI-System",
  "p.live.later.title": "Live-Läufe kommen mit Version 0.3.0",
  "p.live.later.message": "Es wurde nichts gesendet: Diese Version ruft kein Modell auf.",

  // ---- der erste Schritt --------------------------------------------------------------------------------
  "p.start.title": "Von Ihren Dokumenten zur gereihten Auswahl",
  "p.start.lead": "Der Leser ordnet die Geschäftsthemen und Kennzahlen Ihrer Dokumente. Der Ideenfinder schlägt Prototypen dafür vor. Code bewertet und reiht sie; Sie reihen Ihre drei Favoriten und wählen den, der gebaut wird.",
  "p.start.version": "Version 0.1.0 enthält den Rahmen, die Bewertungs-Engine und die Anleitung. Die drei fiktiven Unternehmen laufen ab Version 0.2.0, Live-Läufe ab Version 0.3.0.",
  "p.start.challengers": "Noch keine Dokumente? Prüfen Sie zuerst ein Geschäftsmodell, eine SWOT- oder eine PESTEL-Analyse.",
  "p.turn.lead": "Sie sind dran",
  "p.start.turn": "Lesen Sie, wie das Werkzeug arbeitet. Ab Version 0.2.0 startet hier die Wiedergabe.",
  "p.start.turnAction": "So funktioniert's",
  "p.figures.title": "Die vier Kennzahlen oben",
  "p.figures.atStake": "Das Geld, das die behaltenen Themen pro Jahr aufs Spiel setzen, wie die Dokumente oder die Challenger es angeben.",
  "p.figures.covered": "Behaltene Themen, auf die mindestens eine Idee antwortet, von allen behaltenen Themen.",
  "p.figures.top": "Der höchste gewichtete Wert von 5; nach Ihrer Entscheidung Ihre erste Wahl.",
  "p.figures.cost": "Was die Modellaufrufe kosten: im Live-Lauf gemessen, in der Wiedergabe geschätzt.",

  // ---- Start und Fehler ---------------------------------------------------------------------------------
  "p.boot.failed": "Die Seite konnte nicht starten. Laden Sie sie neu, um es noch einmal zu versuchen.",
  "p.boot.module": "Ein Teil der Seite wurde nicht geladen: {error}",
  "p.error.title": "Etwas ist schiefgelaufen",

  // ---- die Worte der Engine: Zahlen, Geld, der Satz zur Stabilität ------------------------------------
  "fact.noData": "keine Angabe",
  "money.perYear": "{amount} im Jahr",
  "stability.sentence": "{first}; {second}.",
  "stability.first": "{name} liegt in {count} von {of} Rangfolgen vorn",
  "stability.firstAlso": "{name} in {count}",
  "stability.holds": "die Reihenfolge hält in jeder Rangfolge",
  "stability.places": "die Plätze {from} bis {to} wechseln mit den Gewichten",
  "stability.placesMany": "die Plätze {runs} wechseln mit den Gewichten",
  "stability.run": "{from} bis {to}",
  "stability.runOne": "{at}",
  "stability.and": " und ",
  "kpi.atStake.part": "{amount} bei {stated} von {of} Themen",
  "kpi.atStake.none": "Kein Thema nennt einen Betrag"
};
