import React, { useMemo, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { GeoPoint, Listing } from "../types";
import { colors, radius, spacing } from "../theme";

type Props = {
  listings: Listing[];
  /** Required — the caller must only mount this once the user's real
   * location is known, so the map is always centered on them, never on a
   * placeholder location. */
  myLocation: GeoPoint;
  onSelectListing: (listingId: string) => void;
};

type MarkerData = {
  id: string;
  title: string;
  category: string;
  quantity: string;
  latitude: number;
  longitude: number;
};

/**
 * Renders listing locations on a real map without any native map module or
 * API key: a Leaflet (OpenStreetMap) page loaded inside a WebView. Both
 * react-native-webview and OSM tiles work out of the box in Expo Go.
 */
export default function ListingsMapView({
  listings,
  myLocation,
  onSelectListing,
}: Props) {
  const webviewRef = useRef<WebView>(null);

  const markers: MarkerData[] = useMemo(
    () =>
      listings
        .filter((l): l is Listing & { location: GeoPoint } => !!l.location)
        .map((l) => ({
          id: l.id,
          title: l.title,
          category: l.category,
          quantity: l.quantity,
          latitude: l.location.latitude,
          longitude: l.location.longitude,
        })),
    [listings]
  );

  const html = useMemo(
    () => buildMapHtml(markers, myLocation),
    // Rebuild only when the marker set or the user's location changes.
    [markers, myLocation]
  );

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "select" && typeof data.listingId === "string") {
        onSelectListing(data.listingId);
      }
    } catch {
      // ignore malformed messages
    }
  }

  function centerOnMe() {
    webviewRef.current?.injectJavaScript(
      "window.centerOnMe && window.centerOnMe(); true;"
    );
  }

  return (
    <View style={styles.flex}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.flex}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />

      <TouchableOpacity
        style={styles.locateButton}
        onPress={centerOnMe}
        accessibilityLabel="Prikaži mojo lokacijo"
      >
        <Ionicons name="locate" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function buildMapHtml(markers: MarkerData[], myLocation: GeoPoint): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
  .listing-popup { font-family: -apple-system, Roboto, sans-serif; }
  .listing-popup .title { font-weight: 700; margin-bottom: 2px; font-size: 14px; }
  .listing-popup .meta { color: #6B7568; font-size: 12px; margin-bottom: 6px; }
  .listing-popup button {
    background: ${colors.primary}; color: #fff; border: none; border-radius: 6px;
    padding: 6px 10px; font-size: 12px; font-weight: 700;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var markers = ${JSON.stringify(markers)};
  var myLocation = ${JSON.stringify(myLocation)};

  var map = L.map('map', { zoomControl: true }).setView([myLocation.latitude, myLocation.longitude], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap prispevalci'
  }).addTo(map);

  L.circleMarker([myLocation.latitude, myLocation.longitude], {
    radius: 8, color: '${colors.primary}', fillColor: '${colors.primary}',
    fillOpacity: 0.9, weight: 2
  }).addTo(map).bindPopup('Tvoja lokacija');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  markers.forEach(function (m) {
    var marker = L.marker([m.latitude, m.longitude]).addTo(map);
    var popupHtml = '<div class="listing-popup">' +
      '<div class="title">' + escapeHtml(m.title) + '</div>' +
      '<div class="meta">' + escapeHtml(m.category) + ' · ' + escapeHtml(m.quantity) + '</div>' +
      '<button onclick="selectListing(\\'' + m.id + '\\')">Odpri ponudbo</button>' +
      '</div>';
    marker.bindPopup(popupHtml);
  });

  function selectListing(id) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', listingId: id }));
    }
  }

  window.centerOnMe = function () {
    map.setView([myLocation.latitude, myLocation.longitude], 14);
  };
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  locateButton: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
