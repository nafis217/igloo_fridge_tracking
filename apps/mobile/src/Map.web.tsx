import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "./theme";

type MapViewProps = {
  children?: ReactNode;
  initialRegion?: unknown;
  style?: StyleProp<ViewStyle>;
};

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  description?: string;
  pinColor?: string;
  title?: string;
};

export default function MapView({ children, style }: MapViewProps) {
  return (
    <View style={[styles.map, style]}>
      <Text style={styles.title}>Field locations</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

export function Marker({ coordinate, description, pinColor = colors.blue, title }: MarkerProps) {
  return (
    <View style={styles.marker}>
      <View style={[styles.pin, { backgroundColor: pinColor }]} />
      <View style={styles.markerText}>
        <Text style={styles.markerTitle}>{title || "Location"}</Text>
        {description ? <Text style={styles.markerDescription}>{description}</Text> : null}
        <Text style={styles.coordinates}>{coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, padding: 20, backgroundColor: colors.pale },
  title: { color: colors.navy, fontSize: 22, fontWeight: "900", marginBottom: 14 },
  list: { gap: 10 },
  marker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pin: { width: 12, height: 12, borderRadius: 6 },
  markerText: { flex: 1 },
  markerTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  markerDescription: { color: colors.muted, fontSize: 12, marginTop: 3 },
  coordinates: { color: colors.blue, fontSize: 12, fontWeight: "800", marginTop: 6 },
});
