import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

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

declare const MapView: ComponentType<MapViewProps>;
export const Marker: ComponentType<MarkerProps>;
export default MapView;
