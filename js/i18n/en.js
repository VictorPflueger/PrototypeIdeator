// Every visible string in English (British). js/i18n/de.js has the same keys; tests/i18n.mjs holds the
// two equal in keys and placeholders. Placeholders in braces are filled by t(); keys ending in .one and
// .other are plural forms for tn().

export default {
  // ---- the engine's words: figures, money, the stability sentence -------------------------------------
  "fact.noData": "no figure",
  "money.perYear": "{amount} a year",
  "stability.sentence": "{first}; {second}.",
  "stability.first": "{name} is first in {count} of {of} rankings",
  "stability.firstAlso": "{name} in {count}",
  "stability.holds": "the order holds in every ranking",
  "stability.places": "places {from} to {to} change with the weights",
  "stability.placesMany": "places {runs} change with the weights",
  "stability.run": "{from} to {to}",
  "stability.runOne": "{at}",
  "stability.and": " and ",
  "kpi.atStake.part": "{amount} on {stated} of {of} issues",
  "kpi.atStake.none": "No issue states an amount"
};
