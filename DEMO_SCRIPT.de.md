# Vorführskript: fünf Minuten

Tidewell Lines, das Standardszenario: eine fiktive Containerreederei in Bremen, gelesen aus drei
Challenger-Berichten. Jede Zahl unten stammt aus der Rechenlogik; der Vortragstext im Leitfaden nennt
dieselben. Das englische Skript steht in DEMO_SCRIPT.md.

## Vor dem Start

- Öffnen Sie die Seite in einem neuen Tab, im Vollbild, bei 1920 × 1080 oder 1280 × 720, und schalten Sie
  oben auf DE. *So funktioniert's* öffnet sich von selbst; `?lang=de&guide=present` öffnet ihn gleich beim
  Vortragstext.
- Schließen Sie den Leitfaden mit **Starten**. Drücken Sie **Abspielen**, oder blättern Sie mit der
  Pfeiltaste nach rechts oder einem Presenter: Abspielen hält, wo Sie handeln, und die Leertaste pausiert,
  während Sie sprechen.
- Ein Schlüssel ist nicht nötig. Die Simulation ruft kein Modell auf und erreicht keine andere Seite.

## Die fünf Minuten

| Zeit | Schritt | Sagen | Tun und zeigen |
| --- | --- | --- | --- |
| 1 min | Auf die Kennzahlen zeigen | „Bevor etwas läuft, sagen die Kennzahlen, was für Tidewell Lines auf dem Spiel steht: 10,8 Mio. € im Jahr.“ | Zeigen Sie auf die vier Kacheln: 10,8 Mio. € bei 7 von 8 behaltenen Themen, 8 von 8 abgedeckte Themen, ein bester Wert von 4,70 und unter 0,01 € für den Lauf. Klicken Sie **Starten**. |
| 1 min | Lesen: drei Berichte zu einer Reederei | „Drei Challenger haben dasselbe Unternehmen geprüft. Der Leser hat die Emissionskosten gebündelt, die alle drei nennen, und Sie behalten, bündeln oder parken jedes Thema.“ | Zwölf Themen. Zeigen Sie die Emissionsthemen, gebündelt unter dem ersten, jede Bündelung mit ihrem Grund in Lila. Klicken Sie **Ideen finden**. |
| 1,5 min | Ideen: eine Idee öffnen | „Jede Zelle ist ein Prototyp, gebunden an ein Thema und seine Kennzahlen. Hier ist Zertifikatslücken-Agent: was der Raum sähe und wie sein Agent arbeitet, während ein Mensch entscheidet.“ | Acht Zellen. Öffnen Sie Zertifikatslücken-Agent: ein Wert von 4,70, 8 bis 12 Personentage, 0,02 € je Live-Lauf, die fünf Schritte des Agenten und die Entscheidung des Menschen. Schließen Sie die Seite, dann **Weiter: Ideen bewerten**. |
| 1 min | Bewerten: ein Gewicht ändern | „Gewichten Sie den Nutzen höher und sehen Sie auf die Reihenfolge. Zertifikatslücken-Agent bleibt in 9 von 9 Rangfolgen vorn.“ | Klicken Sie **Gewichte ändern** und setzen Sie den geschäftlichen Nutzen auf 30 %: Spot-Sofortangebot fällt vom vierten auf den sechsten Platz, der beste Wert steigt auf 4,73, und der Titel sagt weiter 9 von 9. Klicken Sie **Weiter: die Auswahl**. |
| 0,5 min | Auswahl, Bericht und Briefing | „Sie reihen Ihre drei Favoriten, und der Bericht ist bereit zum Drucken für den Raum. Ein Klick macht aus der ersten Wahl ein Bau-Briefing für ein neues Claude-Projekt.“ | Die ersten drei sind vorgewählt; klicken Sie **Bericht schreiben**. Die Kachel sagt jetzt, dass Ihre Auswahl 63 % dessen beantwortet, was auf dem Spiel steht. Klicken Sie **Als PDF speichern** und wählen Sie *Als PDF speichern* als Drucker, dann **Bau-Briefing schreiben** und **Kopieren**. |

## Wenn etwas schiefgeht

- **Ein falscher Klick.** Behalten macht ein Bündeln oder Parken rückgängig. **Zurück** geht einen Schritt
  zurück, und **Gewichte zurücksetzen** stellt die Standardgewichte wieder her.
- **Den Faden verloren.** `?lang=de&scenario=s1&step=4` öffnet Bewerten; `step=6` öffnet den Bericht mit
  der aufgezeichneten Auswahl.
- **Ein PDF ohne durchsuchbaren Text.** Wählen Sie *Als PDF speichern* als Drucker. *Microsoft Print to
  PDF* macht aus dem Text Formen und die Datei um ein Vielfaches größer.
- **Keine Seitenzahlen.** Drucken Sie aus Chrome oder Edge. Andere Browser drucken die Fußzeile womöglich
  ohne sie.
- **Ein kleiner Beamer.** Die Seite passt auf 1280 × 720. Senken Sie lieber die Auflösung, als zu zoomen.

## Fragen, die kommen werden

**Ist das echt?** Tidewell Lines und seine eigenen Zahlen sind erfunden, und seine drei
Challenger-Berichte sind Platzhalter, für das Szenario geschrieben, und sagen das. Was sie über die Welt
sagen, ist echt und datiert: Ab 2027 geben Reedereien Emissionszertifikate für alle Emissionen ab, die
das EU-System zählt, FuelEU Maritime gilt seit dem 1. Januar 2025, und 60 % der Containerkapazität
zwischen Asien und Europa fahren wieder durch den Suezkanal. DATA_SOURCES.md nennt jede Quelle mit dem
Tag, an dem sie gelesen wurde.

**Woher kommen die Zahlen?** Aus dem Code. Der Ideenfinder bewertet jede Idee zu sieben Kriterien von
1 bis 5, jede mit ihrem Grund; die Rechenlogik gewichtet die Bewertungen, reiht die Ideen, prüft die
Rangfolge neunmal und berechnet jede Kennzahl. Eine Faktenprüfung weist jede andere Zahl in den Texten
der Agenten zurück.

**Was kostet ein Lauf?** Eine Wiedergabe kostet nichts. Ein Live-Lauf dieser drei Berichte kostet
geschätzt unter 0,01 € mit der Einstellung Ausgewogen und rund 0,09 € mit Gründlich. Mit **Live
starten** lesen die Agenten Ihre Dokumente mit Ihrem eigenen Claude-Schlüssel, bis zu einem Kostenlimit,
das Sie setzen.

**Baut er den Prototyp?** Nein: Er schlägt vor und reiht. Das Bau-Briefing macht aus der gewählten Idee
die Anweisungen und die erste Nachricht für ein neues Claude-Projekt, das sie so baut, wie dieses
Werkzeug gebaut wurde.

## Nach der Vorführung

- Schicken Sie das PDF und den Link mit `?lang=de&guide=present`: Mit dem Vortragstext kann man es allein
  nachspielen.
- Zeit für ein weiteres Unternehmen? `?scenario=s2` ist ein Hersteller von Antrieben, gelesen aus zwei
  Challenger-Berichten; `?scenario=s3` ist ein Stadtwerk, gelesen aus seinem Geschäftsbericht, einem PDF,
  das der Leser mit Seitenzahl zitiert, und einer SWOT-Analyse.
