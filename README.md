# deljenjePridelkov 🌱

Mobilna aplikacija (React Native / Expo) za izmenjavo presežkov pridelkov med sosedi —
objaviš, kaj imaš preveč, kaj bi rad dobil v zameno, in se s klepetom v aplikaciji
dogovoriš za prevzem.

## Funkcionalnosti (MVP)

- Registracija in prijava (lokalna, brez zunanjega strežnika)
- Objava pridelka: slika, opis, količina, kategorija, kaj želiš v zameno, lokacija
- Brskanje po ponudbah: iskanje, filtriranje po kategoriji, razvrščanje po bližini
- Sporočila: klepet po ponudbi za dogovor o zamenjavi
- Profil: pregled lastnih objav, označevanje ponudbe kot zamenjane, odjava

## Zagon

```bash
npm install
npm start
```

Nato odpri aplikacijo v [Expo Go](https://expo.dev/go) na telefonu (skeniraj QR kodo)
ali zaženi simulator z `npm run ios` / `npm run android`.

Ob prvem zagonu se ustvari demo račun (`demo@vrt.si` / `demo1234`) z nekaj vzorčnimi
ponudbami, da aplikacija ni prazna.

## Arhitektura

- `src/data/store.ts` — vsa "backend" logika (uporabniki, ponudbe, pogovori,
  sporočila) je zbrana za enim async API-jem, trenutno shranjena lokalno v
  `AsyncStorage`. To namenoma loči podatkovni sloj od zaslonov, da ga je kasneje
  mogoče zamenjati z resničnim strežnikom (npr. Firebase ali lastni API), ne da
  bi bilo treba spreminjati zaslone.
- `src/context/AuthContext.tsx` — stanje prijavljenega uporabnika.
- `src/navigation/RootNavigator.tsx` — Auth stack (prijava/registracija) in
  glavne zavihke (Brskaj / Sporočila / Profil).
- `src/screens/*` — posamezni zasloni.

## Znane omejitve MVP-ja

- Podatki so shranjeni samo lokalno na napravi (ni sinhronizacije med napravami).
- Gesla so shranjena v čistem besedilu v lokalnem shrambnem sloju — primerno za
  demo/prototip, ne za produkcijo.
- Ni potisnih obvestil za nova sporočila.
