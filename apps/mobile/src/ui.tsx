import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "./theme";

const iglooLogo = require("../assets/igloo-logo.png");

export function Logo({ compact = false, centered = false }: { compact?: boolean; centered?: boolean }) {
  return (
    <View style={[styles.logoRow, centered && styles.logoCentered]}>
      <View style={compact ? styles.logoCropCompact : styles.logoCrop}>
        <Image source={iglooLogo} resizeMode="contain" style={compact ? styles.logoImageCompact : styles.logoImage} />
      </View>
      <View style={centered && styles.logoTextCentered}>
        <Text style={[styles.logo, compact && styles.logoCompact]}>IglooTrack</Text>
      </View>
    </View>
  );
}

export function Button({ title, onPress, icon, variant = "primary", loading = false, disabled = false }: {
  title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "ghost"; loading?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, styles[`${variant}Button`], pressed && { opacity: .82 }, disabled && { opacity: .5 }]}>
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.white : colors.blue} /> : <>
        {icon && <Ionicons name={icon} size={20} color={variant === "primary" ? colors.white : colors.blue} />}
        <Text style={[styles.buttonText, variant !== "primary" && { color: colors.blue }]}>{title}</Text>
      </>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={styles.label}>{label}</Text><TextInput
    placeholderTextColor="#91A0B5" {...props} style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: "top" }, props.style]} /></View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === "ACTIVE" ? colors.green : status === "REPAIR" ? colors.amber : status === "DECOMMISSIONED" ? colors.red : colors.muted;
  return <View style={[styles.badge, { backgroundColor: `${color}18` }]}><View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={{ color, fontWeight: "800", fontSize: 12 }}>{status.replace("_", " ")}</Text></View>;
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.pale },
  scroll: { padding: 20, paddingBottom: 120, gap: 16 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center" },
});

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoCentered: { flexDirection: "column", justifyContent: "center", alignSelf: "center", gap: 0 },
  logoTextCentered: { alignItems: "center" },
  logoCrop: { width: 190, height: 110, overflow: "hidden" },
  logoCropCompact: { width: 64, height: 38, overflow: "hidden" },
  logoImage: { position: "absolute", top: 0, width: 190, height: 136 },
  logoImageCompact: { position: "absolute", top: 0, width: 64, height: 46 },
  logo: { color: colors.navy, fontSize: 29, fontWeight: "900", letterSpacing: -1.2 },
  logoCompact: { fontSize: 21 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 20, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: colors.blue, ...shadow },
  secondaryButton: { backgroundColor: colors.ice, borderWidth: 1, borderColor: "#C8EAF9" },
  ghostButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  input: { minHeight: 52, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
  card: { backgroundColor: colors.white, padding: 17, borderRadius: 22, borderWidth: 1, borderColor: "#E6F1F7", ...shadow },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, alignSelf: "flex-start" },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
