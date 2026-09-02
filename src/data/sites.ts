import { LaunchSite } from '../types';

/**
 * Znana slovenska vzletišča za jadralno padalstvo.
 *
 * POMEMBNO: koordinate in nadmorske višine so približne (dovolj natančne za
 * vremensko poizvedbo, saj so mreže vremenskih modelov velikosti nekaj km),
 * NISO pa mišljene za navigacijo ali natančno določanje uradnega vzletišča.
 * Pred letom vedno preveri točno lokacijo, smeri vzleta in pravila pri
 * lokalnem klubu.
 */
export const PREDEFINED_SITES: LaunchSite[] = [
  { id: 'vogel', name: 'Vogel', region: 'Julijske Alpe (Bohinj)', lat: 46.2597, lon: 13.8395, elevation: 1800 },
  { id: 'krvavec', name: 'Krvavec', region: 'Kamniško-Savinjske Alpe', lat: 46.2987, lon: 14.5345, elevation: 1970 },
  { id: 'golte', name: 'Golte', region: 'Savinjske Alpe', lat: 46.3730, lon: 14.9295, elevation: 1600 },
  { id: 'kobla', name: 'Kobla', region: 'Julijske Alpe (Bohinjska Bistrica)', lat: 46.2810, lon: 13.9330, elevation: 1490 },
  { id: 'rodica', name: 'Rodica', region: 'Kamniško-Savinjske Alpe', lat: 46.2420, lon: 14.6110, elevation: 1960 },
  { id: 'kum', name: 'Kum', region: 'Zasavje', lat: 46.0920, lon: 15.0710, elevation: 1210 },
  { id: 'kucelj', name: 'Kucelj', region: 'Zasavje (Trbovlje)', lat: 46.1495, lon: 15.0400, elevation: 900 },
  { id: 'smarna-gora', name: 'Šmarna gora', region: 'Ljubljana', lat: 46.1215, lon: 14.4645, elevation: 669 },
  { id: 'grmada', name: 'Grmada', region: 'Celje', lat: 46.2330, lon: 15.2830, elevation: 800 },
  { id: 'nanos', name: 'Nanos', region: 'Notranjska', lat: 45.7755, lon: 14.0835, elevation: 1260 },
  { id: 'crni-vrh', name: 'Črni vrh nad Idrijo', region: 'Primorska', lat: 45.9425, lon: 14.1265, elevation: 1200 },
  { id: 'planina-golica', name: 'Planina pod Golico', region: 'Karavanke (Jesenice)', lat: 46.4385, lon: 14.0185, elevation: 900 },
  { id: 'stol', name: 'Stol', region: 'Karavanke', lat: 46.4050, lon: 14.1495, elevation: 2230 },
  { id: 'slavnik', name: 'Slavnik', region: 'Kras', lat: 45.5345, lon: 13.9430, elevation: 1020 },
];
