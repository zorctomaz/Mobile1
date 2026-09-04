// Dynamic config (instead of a plain app.json) so the Google Maps API keys
// can come from environment variables instead of being committed to git —
// this repo is public. Put real keys in a local, untracked `.env` file (see
// `.env.example`); Expo CLI loads `.env` automatically, no extra package
// needed.
module.exports = {
  expo: {
    name: "deljenjePridelkov",
    slug: "deljenjePridelkov",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Lokacijo uporabljamo, da ti pokažemo ponudbe pridelkov v bližini in izračunamo razdaljo.",
        NSPhotoLibraryUsageDescription:
          "Dostop do galerije uporabljamo, da lahko objavi sliko svojega pridelka.",
      },
      config: {
        googleMapsApiKey: process.env.IOS_GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "READ_MEDIA_IMAGES",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Lokacijo uporabljamo, da ti pokažemo ponudbe pridelkov v bližini in izračunamo razdaljo.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Dostop do galerije uporabljamo, da lahko objavi sliko svojega pridelka.",
        },
      ],
    ],
  },
};
