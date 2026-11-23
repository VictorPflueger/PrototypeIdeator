// Alle sichtbaren Texte auf Deutsch. js/i18n/en.js hat dieselben Schlüssel; tests/i18n.mjs hält beide
// in Schlüsseln und Platzhaltern gleich. Platzhalter in geschweiften Klammern füllt t(); Schlüssel auf
// .one und .other sind Pluralformen für tn().

export default {
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
