# Data sources

Version 1.0.0; the facts are those of 0.2.0, read on the dates given. The three scenario companies are fictional, and so are their own figures. What a scenario says about the world (a law, a price, a market shift) is real: each fact below was read at its source on the date given, and its id is how a scenario cites it. `tools/check-scenarios.mjs` fails when a scenario cites a fact or an address that this file doesn't list. A scenario older than 90 days shows "Check for updates" beside its date.

The four tools of the set tell one story per company. The challengers' plans of 23 November 2026 settled the stories: S1's routes switch back to Suez rather than close, and S3 meets the heat plan its town must finish by the end of 2026 rather than "the end of gas heating", since the 2026 heating law allows gas heating again.

## 1. S1 Tidewell Lines

A container carrier based in Bremen, with about 40 ships. Fictional company, illustrative figures.

| Id | Fact | Source | Read on |
|---|---|---|---|
| S1-ETS | The EU emissions trading system has covered emissions from large ships since January 2024. Carriers surrender allowances in 2025 for 40 % of their 2024 emissions, in 2026 for 70 % of their 2025 emissions and from 2027 for all of them. It counts all emissions between two EU ports and in EU ports, and half of those on voyages that start or end outside the EU; methane and nitrous oxide count from 2026 | https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector_en | 2026-11-23 |
| S1-FUELEU | FuelEU Maritime applies in full from 1 January 2025 to ships above 5,000 gross tonnage calling at European ports. The greenhouse-gas intensity of the energy they use must fall 2 % by 2025 and up to 80 % by 2050 | https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en | 2026-11-23 |
| S1-SUEZ | 60 % of Asia–Europe container capacity uses the Suez Canal again; 57 container ships passed the canal in the week to 15 November 2026, by Drewry's count (Riviera, 19 November 2026) | https://www.rivieramm.com/news-content-hub/full-suez-return-clouds-box-ship-outlook-as-one-becomes-latest-to-resume-transits-90632 | 2026-11-23 |
| S1-WCI | Drewry's World Container Index stood at $4,176 per 40 ft container on 19 November 2026, 3 % down on the week and 126 % up on the year; Shanghai to Rotterdam $3,496 | https://www.drewry.co.uk/WCI | 2026-11-23 |
| S1-COUNT | CountEmissionsEU, political agreement of 5 November 2025: one method for counting transport emissions, based on EN ISO 14083:2023, for companies that publish their emissions | https://transport.ec.europa.eu/news-events/news/commission-welcomes-political-agreement-new-rules-harmonise-transport-emissions-calculations-eu-2025-11-06_en | 2026-11-23 |

## 2. S2 Arvento Drives

A family-owned maker of industrial drives and gearboxes in Baden-Württemberg, launching drives as a service. Fictional company, illustrative figures.

| Id | Fact | Source | Read on |
|---|---|---|---|
| S2-DATA | The EU Data Act has applied since 12 September 2025. Connected products and related services placed on the market after 12 September 2026 must be designed so that users can reach their data directly, where that is relevant and technically feasible | https://www.ccpc.ie/enforcement-and-regulation/data-regulation/eu-data-act ; https://dsc.bund.de/SharedDocs/A_Z_Glossar_DataAct_ENG/D/data-access.html | 2026-11-23 |
| S2-CRA | Since 11 September 2026, manufacturers of products with digital elements report actively exploited vulnerabilities and severe incidents through the single reporting platform ENISA runs, with an early warning within 24 hours | https://digital-strategy.ec.europa.eu/en/policies/cra-reporting | 2026-11-23 |
| S2-MACH | The Machinery Regulation (EU) 2023/1230 applies from 20 January 2027; machinery placed on the market before that date follows the Machinery Directive 2006/42/EC | https://single-market-economy.ec.europa.eu/sectors/mechanical-engineering/machinery_en | 2026-11-23 |
| S2-TARIFF | US duties on steel, aluminium and many products made from them still weigh on German machinery makers, who must document the value, origin and metal content of components (GTAI, 21 August 2026) | https://www.gtai.de/de/trade/usa/branchen/maschinenbau-1029242 | 2026-11-23 |

## 3. S3 Auental Energie

The municipal utility of a mid-sized town in Lower Saxony, a middle-order centre: power, gas, heat, water, the local grid and car charging. Fictional company, illustrative figures; its annual-report excerpt is written for the scenario.

| Id | Fact | Source | Read on |
|---|---|---|---|
| S3-GMODG | The Gebäudemodernisierungsgesetz passed the Bundestag and the Bundesrat on 10 July 2026 and its main rules apply from 29 July 2026. The rule that new heating runs on at least 65 % renewable energy is gone; new gas and oil heating must burn a rising share of climate-friendly fuel: 10 % from 2029, 15 % from 2030, 30 % from 2035 and 60 % from 2040 | https://www.bundesregierung.de/breg-de/aktuelles/neues-gebaeudemodernisierungsgesetz-2430284 ; https://www.bdew.de/energie/gebaeudemodernisierungsgesetz-ist-beschlossen/ | 2026-11-23 |
| S3-HEAT | Lower Saxony's climate law obliges its regional and middle-order centres, about 100 towns, to present a municipal heat plan by the end of 2026; the other municipalities have until 2028 (IHK Hannover, 2 April 2026) | https://www.ihk.de/hannover/hauptnavigation/innovation/energie/energiepolitik-recht/waermeplanung-6287230 | 2026-11-23 |
| S3-METER | On 30 June 2026, 5.9 % of 54.1 million metering points had a smart meter. The regulator opened proceedings against 434 companies that missed the 20 % quota for mandatory cases; 90 % of mandatory cases are due by 2032 (Bundesnetzagentur, 21 September 2026) | https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260921_Rollout.html | 2026-11-23 |
| S3-DYN | Every electricity supplier must offer a dynamic tariff from 2025 (§ 41a of the Energy Industry Act); the customer needs a smart meter for it | https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/DynStromtarife/start.html | 2026-11-23 |
| S3-ENPAL | Enpal offers heat pumps for towns in cooperation with their municipal utilities, and the first utilities use it; it says it installed about 10,000 heat pumps in 2025 (ZfK, 19 February 2026) | https://www.zfk.de/unternehmen/enpal-will-luecken-in-lokaler-waermeplanung-schliessen | 2026-11-23 |

## 4. What is not used

Facts the challengers' plans name but this tool didn't verify at a source it could read on 23 November 2026 stay out of the scenarios: market shares of digital forwarders, a count of service technicians, a tariff rate on machinery, gas exchange prices and heat-pump sales figures.
