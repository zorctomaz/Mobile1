# deljenjePridelkov 🌱

Mobilna aplikacija (React Native / Expo) za izmenjavo presežkov pridelkov med sosedi —
objaviš, kaj imaš preveč, kaj bi rad dobil v zameno, in se s klepetom v aplikaciji
dogovoriš za prevzem.

## Funkcionalnosti (MVP)

- Registracija in prijava (Firebase Authentication — podatki so **skupni
  vsem napravam**, ne le lokalni)
- Objava pridelka: slika, opis, količina, kategorija, kaj želiš v zameno,
  lokacija prevzema — izbereš jo s tapom na zemljevid (ni nujno tvoja trenutna
  lokacija) ali z gumbom "Uporabi trenutno lokacijo"
- Brskanje po ponudbah: iskanje, filtriranje po kategoriji, razvrščanje po bližini,
  preklop med seznamom in **zemljevidom** (OpenStreetMap prek WebView — brez API
  ključa, deluje takoj v Expo Go — privzeto centriran na uporabnikovo lokacijo,
  z zoomom/premikanjem in oznakami objavljenih ponudb)
- Sporočila: klepet po ponudbi za dogovor o zamenjavi
- **Potrditev zamenjave**: ko sta se v pogovoru dogovorila, zamenjavo v klepetu
  potrdita **oba** udeleženca — šele takrat ponudba izgine iz brskanja, oba pa
  prejmeta nagrado 🫜 redkvico (prikazano v profilu)
- Moji oglasi: ločen zavihek s pregledom lastnih objav (in gumbom za novo objavo)
- Profil: identiteta, števec prejetih redkvic, odjava

## Zagon

```bash
npm install
npm start
```

Nato odpri aplikacijo v [Expo Go](https://expo.dev/go) na telefonu (skeniraj QR kodo)
ali zaženi simulator z `npm run ios` / `npm run android`.

Ob prvem zagonu (na prvi napravi kadarkoli) se v skupni Firebase bazi ustvari demo
račun (`demo@vrt.si` / `demo1234`) z nekaj vzorčnimi ponudbami, da aplikacija ni prazna
— ta korak se samodejno preskoči na vseh naslednjih napravah/zagonih.

### Enkratna nastavitev Firebase projekta

Ta app uporablja skupen Firebase projekt (Firestore + Authentication) — konfiguracija
v `src/firebase.ts` ni tajna (Firebase web config je namenoma javen), a projekt sam
je treba enkrat nastaviti v [Firebase konzoli](https://console.firebase.google.com/):

1. **Authentication → Sign-in method** → omogoči ponudnika **Email/Password**
2. **Firestore Database** → ustvari bazo (poljubna regija)
3. **Firestore Database → Rules** → prilepi vsebino datoteke [`firestore.rules`](./firestore.rules)
   iz tega repozitorija → **Publish**. Brez tega koraka Firestore privzeto zavrne
   vsako branje/pisanje.

## Arhitektura

- `src/firebase.ts` — inicializacija Firebase (app/auth/firestore). Auth uporablja
  `getReactNativePersistence(AsyncStorage)`, da seja preživi ponoven zagon aplikacije;
  Firestore uporablja `experimentalForceLongPolling`, ker se privzeti pretočni
  transport v React Native lahko tiho obesi (posebej na Androidu).
- `firestore.rules` — varnostna pravila (kdo lahko bere/piše kaj). Glej opombo o
  namernih poenostavitvah spodaj.
- `src/data/store.ts` — vsa "backend" logika (uporabniki, ponudbe, pogovori,
  sporočila) je zbrana za enim async API-jem, zdaj podprtim s Firestore/Firebase
  Authentication namesto lokalnega `AsyncStorage`. To namenoma loči podatkovni sloj
  od zaslonov — zamenjava je bila mogoča, ne da bi bilo treba spreminjati en sam zaslon.
- `src/context/AuthContext.tsx` — stanje prijavljenega uporabnika (prek
  `onAuthStateChanged`).
- `src/navigation/RootNavigator.tsx` — Auth stack (prijava/registracija) in
  glavne zavihke (Brskaj / Sporočila / Moji oglasi / Profil).
- `src/screens/*` — posamezni zasloni.
- `src/components/ListingsMapView.tsx` — zemljevid je Leaflet (OpenStreetMap)
  stran, naložena v `react-native-webview`, ne nativni zemljevid. Namenoma —
  izogne se potrebi po Google Maps API ključu in dev buildu, obenem pa deluje
  identično v Expo Go na Androidu in iOS-u.

## Znane omejitve MVP-ja

- **Poenostavljena Firestore pravila za potrditev zamenjave**: ko oba udeleženca
  potrdita zamenjavo, mora ena stran posodobiti tuj oglas (status → "traded") in
  tujo redkvico (+1). Da to deluje brez lastnega strežnika (Cloud Functions bi
  zahteval Firebase Blaze/plačljiv nivo), pravila dovolijo **kateremukoli**
  prijavljenemu uporabniku spremeniti **samo** polje `status` na oglasu ali
  **samo** polje `radishCount` na profilu — nič drugega. Sprejemljivo tveganje za
  MVP (najslabši izid: nekdo lahko ponaredi "zamenjano" na tujem oglasu ali si
  pripiše redkvico), a za produkcijo bi to raje preneslo na Cloud Function.
- Ni potisnih obvestil za nova sporočila (zaslon se osveži ob ponovnem odprtju/
  potegu navzdol, ne v živo).
