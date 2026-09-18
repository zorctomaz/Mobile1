import { initializeApp } from "firebase/app";
import { initializeAuth, type Auth } from "@firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// @firebase/auth's package.json lists a "types" condition before its
// "react-native" condition in its export map, so tsc always resolves the
// generic (web) declaration file and never sees this RN-only export — even
// though Metro's bundler *does* correctly resolve the real React Native
// build at runtime (confirmed against node_modules/@firebase/auth/dist/rn).
// @ts-expect-error — see comment above; remove once a firebase upgrade fixes it.
import { getReactNativePersistence } from "@firebase/auth";

// This config is not a secret — Firebase's web config is meant to be public
// (it identifies the project, nothing more). What actually protects the
// data is firestore.rules (see that file) plus Firebase Authentication.
const firebaseConfig = {
  apiKey: "AIzaSyC9tp3EA9xmfeX1PI2lLWKLnvg6Slhk74E",
  authDomain: "deljenjepridelkov.firebaseapp.com",
  projectId: "deljenjepridelkov",
  storageBucket: "deljenjepridelkov.firebasestorage.app",
  messagingSenderId: "597631903458",
  appId: "1:597631903458:web:639f8e7005b4eccdede0bb",
};

export const app = initializeApp(firebaseConfig);

// React Native needs an explicit AsyncStorage-backed persistence layer for
// the auth session to survive an app restart — the web default doesn't
// work here. (We deliberately don't use firebase/analytics: it assumes a
// browser `window` and isn't supported in React Native.)
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// React Native's networking doesn't get along with Firestore's default
// streaming transport (connections can silently hang, especially on
// Android) — long polling is the documented workaround for RN/Expo.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
