import React, { useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { GeoPoint, Listing } from "../types";
import { colors, radius, spacing } from "../theme";

// Fallback center (Ljubljana) used until we know the user's location.
const DEFAULT_REGION: Region = {
  latitude: 46.0569,
  longitude: 14.5058,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const FOCUSED_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };

type Props = {
  listings: Listing[];
  myLocation?: GeoPoint;
  onSelectListing: (listingId: string) => void;
};

export default function ListingsMapView({
  listings,
  myLocation,
  onSelectListing,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const hasCenteredOnUser = useRef(false);

  // The first time we learn the user's location (it can arrive after the map
  // has already mounted, e.g. once permission is granted), animate to it.
  useEffect(() => {
    if (myLocation && !hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      mapRef.current?.animateToRegion({ ...myLocation, ...FOCUSED_DELTA }, 400);
    }
  }, [myLocation]);

  function centerOnMe() {
    if (!myLocation) return;
    mapRef.current?.animateToRegion({ ...myLocation, ...FOCUSED_DELTA }, 400);
  }

  const initialRegion: Region = myLocation
    ? { ...myLocation, ...FOCUSED_DELTA }
    : DEFAULT_REGION;

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.flex}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={!!myLocation}
        showsMyLocationButton={false}
        zoomEnabled
        zoomTapEnabled
        scrollEnabled
        pitchEnabled
        rotateEnabled
      >
        {listings
          .filter((l): l is Listing & { location: GeoPoint } => !!l.location)
          .map((l) => (
            <Marker
              key={l.id}
              coordinate={l.location}
              title={l.title}
              description={`${l.category} · ${l.quantity}`}
              pinColor={colors.primary}
              onCalloutPress={() => onSelectListing(l.id)}
            />
          ))}
      </MapView>

      {myLocation && (
        <TouchableOpacity
          style={styles.locateButton}
          onPress={centerOnMe}
          accessibilityLabel="Prikaži mojo lokacijo"
        >
          <Ionicons name="locate" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  locateButton: {
    // Bottom-left, so it never collides with the "add listing" FAB the
    // parent screen renders bottom-right on top of this map.
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
