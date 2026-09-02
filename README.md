# Termika – vremenska aplikacija za jadralno padalstvo

Mobilna aplikacija (React Native / Expo) za pridobivanje vremenskih podatkov,
relevantnih za jadralno padalstvo v Sloveniji: veter po višinah, baza
oblakov, CAPE (konvekcija/termika), padavine – za znana slovenska vzletišča
ali poljubno lokacijo.

## ⚠️ Varnostno opozorilo

Aplikacija je informativni pripomoček in **ne nadomešča** lastne presoje
pilota, preverjanja uradnih virov (ARSO, NOTAM) ali pravil lokalnega kluba.
"Semafor" ocena letnosti temelji na poenostavljenih pragovih (hitrost/sunki
vetra, verjetnost padavin, CAPE) in ni varnostna certifikacija.

## Viri podatkov

- **[Open-Meteo](https://open-meteo.com/)** – glavni vir napovedi: veter
  (smer/hitrost) pri tleh in na tlačnih nivojih 900/850/800/700/600 hPa
  (pretvorjeno v približno nadmorsko višino prek `geopotential_height`),
  oblačnost, CAPE, padavine, sončni vzhod/zahod. Brezplačno, brez API
  ključa, do 10.000 klicev/dan – kliče se neposredno iz aplikacije (brez
  lastnega strežnika).
- Baza oblakov (LCL) se izračuna iz temperature in temperature rosišča pri
  tleh po standardni približni formuli `125 m na °C razlike`.
- V aplikaciji so dodane povezave na **[meteo-parapente.com](https://www.meteo-parapente.com/)**,
  **[burnair.cloud](https://burnair.cloud/)** in **[ARSO](https://meteo.arso.gov.si/met/sl/weather/observ/surface/)**
  za navzkrižno primerjavo s specializiranimi modeli za jadralno
  padalstvo – ti trije nimajo javno dostopnega API-ja za napovedi, zato so
  vključeni kot povezave, ne kot vgrajeni podatki.

## Funkcionalnosti

- Seznam znanih slovenskih vzletišč (Vogel, Krvavec, Golte, Kobla, Rodica,
  Kum, Kucelj, Šmarna gora, Grmada, Nanos, Črni vrh nad Idrijo, Planina pod
  Golico, Stol, Slavnik) + iskanje.
- Dodajanje lastne lokacije (GPS ali ročni vnos), shranjeno lokalno na
  napravi (AsyncStorage).
- Na zaslonu vzletišča: 7-dnevna napoved z izbirnikom dni, "semafor" ocena
  (Leti / Previdno / Odsvetujem) z razlogi, osnovni trenutni podatki in
  podroben urni meteogram (veter po višinah, oblačnost, verjetnost
  padavin).

## Zagon

```bash
npm install
npm run start   # nato v Expo Go odpri QR kodo, ali `npm run android` / `npm run ios`
```

## Znana omejitev tega razvoja

Koda je bila napisana v izolirani sandbox seji brez dostopa do interneta do
`api.open-meteo.com` in brez emulatorja, zato API klic ni bil testiran v
živo. Imena parametrov temeljijo na stabilni, dolgoletni Open-Meteo
specifikaciji (pressure-level API). Če se ob zagonu pojavi napaka
"Open-Meteo je vrnil napako …" na zaslonu vzletišča, to pomeni, da je treba
prilagoditi seznam parametrov v `src/services/openMeteo.ts` (sporočilo
napake iz odgovora API-ja pove točno, kateri parameter ni veljaven).

## Struktura

```
App.tsx                        – navigacija (React Navigation, 3 zasloni)
src/types.ts                   – skupni TypeScript tipi
src/data/sites.ts               – seznam znanih slovenskih vzletišč
src/services/openMeteo.ts       – klic in parsanje Open-Meteo API
src/services/flyability.ts      – "semafor" logika (pragovi za veter/padavine/CAPE)
src/storage/customSites.ts      – shranjevanje lastnih lokacij (AsyncStorage)
src/components/                 – FlyabilityBadge, DaySelector, Meteogram (SVG graf)
src/screens/                    – SiteListScreen, SiteDetailScreen, AddSiteScreen
```
