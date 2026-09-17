import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { GeoPoint } from "../types";
import { colors, radius } from "../theme";

// Fallback center (Ljubljana) used only until we have something better to
// center on (a picked point, or a hint like the user's own location).
const DEFAULT_CENTER: GeoPoint = { latitude: 46.0569, longitude: 14.5058 };

type Props = {
  /** The currently chosen pickup location, if any. */
  selectedLocation?: GeoPoint;
  /** Used only to pick a sensible initial center/zoom when nothing has been
   * selected yet (e.g. the user's current location) — never auto-selected. */
  centerHint?: GeoPoint;
  onPick: (point: GeoPoint) => void;
};

/**
 * A tappable Leaflet (OpenStreetMap) map for choosing a pickup location —
 * by tapping anywhere, not just the user's current position, so a listing
 * can be posted for a different spot (a garden, a market stall, ...).
 *
 * The WebView page is built once on mount and then only driven via
 * injectJavaScript afterwards, so a tap/drag inside the map never causes a
 * remount (which would reset zoom/pan) — only external changes (like the
 * "use current location" button) sync back in.
 */
export default function LocationPickerMap({
  selectedLocation,
  centerHint,
  onPick,
}: Props) {
  const webviewRef = useRef<WebView>(null);
  const initialCenter = selectedLocation ?? centerHint ?? DEFAULT_CENTER;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildPickerHtml(initialCenter, selectedLocation), []);

  const lastSynced = useRef(selectedLocation);
  useEffect(() => {
    if (
      selectedLocation &&
      (!lastSynced.current ||
        lastSynced.current.latitude !== selectedLocation.latitude ||
        lastSynced.current.longitude !== selectedLocation.longitude)
    ) {
      lastSynced.current = selectedLocation;
      webviewRef.current?.injectJavaScript(
        `window.setPoint && window.setPoint(${selectedLocation.latitude}, ${selectedLocation.longitude}); true;`
      );
    }
  }, [selectedLocation]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (
        data?.type === "pick" &&
        typeof data.latitude === "number" &&
        typeof data.longitude === "number"
      ) {
        lastSynced.current = { latitude: data.latitude, longitude: data.longitude };
        onPick({ latitude: data.latitude, longitude: data.longitude });
      }
    } catch {
      // ignore malformed messages
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.flex}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

function buildPickerHtml(center: GeoPoint, selected?: GeoPoint): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var hasPoint = ${selected ? "true" : "false"};
  var startLat = ${selected ? selected.latitude : center.latitude};
  var startLng = ${selected ? selected.longitude : center.longitude};

  var map = L.map('map', { zoomControl: true }).setView(
    [${center.latitude}, ${center.longitude}],
    hasPoint ? 15 : 12
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap prispevalci'
  }).addTo(map);

  var marker = null;

  function emitPick(lat, lng) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'pick', latitude: lat, longitude: lng })
      );
    }
  }

  function wireDrag() {
    marker.on('dragend', function () {
      var p = marker.getLatLng();
      emitPick(p.lat, p.lng);
    });
  }

  function placeMarker(lat, lng) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      wireDrag();
    }
  }

  if (hasPoint) {
    placeMarker(startLat, startLng);
  }

  map.on('click', function (e) {
    placeMarker(e.latlng.lat, e.latlng.lng);
    emitPick(e.latlng.lat, e.latlng.lng);
  });

  // Driven from React Native (e.g. the "use current location" button) —
  // moves/creates the marker without emitting a pick back (avoids a loop).
  window.setPoint = function (lat, lng) {
    placeMarker(lat, lng);
    map.setView([lat, lng], 15);
  };
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
