# deljenjePridelkov 🌱

Mobilna aplikacija (React Native / Expo) za izmenjavo presežkov pridelkov med sosedi —
objaviš, kaj imaš preveč, kaj bi rad dobil v zameno, in se s klepetom v aplikaciji
dogovoriš za prevzem.

## Funkcionalnosti (MVP)

- Registracija in prijava (lokalna, brez zunanjega strežnika)
- Objava pridelka: slika, opis, količina, kategorija, kaj želiš v zameno, lokacija
- Brskanje po ponudbah: iskanje, filtriranje po kategoriji, razvrščanje po bližini,
  preklop med seznamom in **zemljevidom** (Google Maps, privzeto centriran na
  uporabnikovo lokacijo, z zoomom/premikanjem in oznakami objavljenih ponudb)
- Sporočila: klepet po ponudbi za dogovor o zamenjavi
- **Potrditev zamenjave**: ko sta se v pogovoru dogovorila, zamenjavo v klepetu
  potrdita **oba** udeleženca — šele takrat ponudba izgine iz brskanja, oba pa
  prejmeta nagrado 🫜 redkvico (prikazano v profilu)
- Profil: pregled lastnih objav, števec prejetih redkvic, odjava

## Zagon

```bash
npm install
npm start
```

Nato odpri aplikacijo v [Expo Go](https://expo.dev/go) na telefonu (skeniraj QR kodo)
ali zaženi simulator z `npm run ios` / `npm run android`.

Ob prvem zagonu se ustvari demo račun (`demo@vrt.si` / `demo1234`) z nekaj vzorčnimi
ponudbami, da aplikacija ni prazna.

### Google Maps API ključ

Zavihek "Zemljevid" na zaslonu Brskaj potrebuje Google Maps API ključ — tudi za
testiranje v **Expo Go** (znana težava pri Expo SDK 55+ / react-native-maps
1.27.2: brez lastnega ključa je zemljevid črn). Ker je ta repozitorij javen,
ključ **ni** zapisan v kodi — `app.config.js` ga prebere iz lokalne `.env`
datoteke (git-ignored).

1. Skopiraj `.env.example` v `.env`.
2. V [Google Cloud Console](https://console.cloud.google.com/) omogoči **"Maps SDK
   for Android"** (in po potrebi "Maps SDK for iOS") za svoj projekt, nato ustvari
   API ključ.
3. Ključ omeji (Application restrictions → Android apps) na:
   - Package name: `host.exp.exponent`
   - SHA-1: `AD:15:BE:F8:B5:23:99:96:7E:E7:C1:1B:37:90:D5:84:60:27:91:7E`

   (to je Expo Go-jev lasten, javno znan podpisni certifikat — omogoča, da
   ključ deluje znotraj Expo Go med razvojem, brez odpiranja za tuje aplikacije)
4. Prilepi ključ v `.env`:
   ```
   ANDROID_GOOGLE_MAPS_API_KEY=tvoj-ključ
   ```
5. Znova zaženi z `npx expo start -c`.

Za samostojen build (EAS build / APK) boš potreboval **drug** ključ, omejen na
svoj pravi `android.package` in produkcijski SHA-1 podpis — ne na Expo Go-jev.

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
