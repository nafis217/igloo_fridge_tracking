import { useEffect, useState } from "react";
import {
  Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import MapView, { Marker } from "./src/Map";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, useNavigation, usePreventRemove } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, clearSession, getSession, loginWithCompanyAuth, pendingCount, queueAction, saveSession, syncQueue } from "./src/api";
import type { Fridge, Owner, User } from "./src/types";
import { colors, shadow } from "./src/theme";
import { Button, Card, Field, Logo, StatusBadge, ui } from "./src/ui";

type RootParams = {
  Login: undefined; Main: undefined; Scanner: undefined; Fridge: { id: string };
  Transfer: { fridge: Fridge }; History: { fridge: Fridge }; Register: undefined;
};
const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator();

function Page({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={["top"]} style={ui.screen}>{children}</SafeAreaView>;
}

function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const nav = useNavigation<any>();
  return <View style={styles.pageHeader}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Go back from ${title}`}
      onPress={onBack || (() => nav.goBack())}
      style={styles.pageBack}
    >
      <Ionicons name="arrow-back" size={24} color={colors.navy} />
    </Pressable>
    <Text style={styles.pageHeaderTitle}>{title}</Text>
    <View style={styles.pageHeaderSpacer} />
  </View>;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const trimmedUsername = username.trim();
    setSignInError(null);
    if (!trimmedUsername || !password) {
      setSignInError("Username and password are required.");
      return;
    }
    setLoading(true);
    try {
      await loginWithCompanyAuth(trimmedUsername, password);
      const user: User = {
        id: trimmedUsername,
        name: trimmedUsername,
        email: trimmedUsername,
        role: "VIEWER",
      };
      await saveSession(null, user); onLogin(user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Try again";
      const friendlyMessage = /failed to fetch|network request failed|could not reach the api/i.test(message)
        ? "Could not reach the API from the browser. Check that the backend is running on http://localhost:5047 and that the frontend is reloaded."
        : message;
      setSignInError(friendlyMessage);
      if (Platform.OS !== "web") Alert.alert("Could not sign in", friendlyMessage);
    }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.login}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.loginInner}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.loginContent}>
        <View style={styles.loginPanel}>
          <View style={styles.loginBrand}><Logo centered /></View>
          <View style={styles.loginForm}>
            <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <View style={styles.passwordField}>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                onPress={() => setShowPassword(value => !value)}
                style={styles.passwordToggle}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={colors.blue} />
              </Pressable>
            </View>
            {signInError && <View style={styles.loginError}>
              <Ionicons name="alert-circle" size={18} color={colors.red} />
              <Text style={styles.loginErrorText}>{signInError}</Text>
            </View>}
            <Button title="Sign in" icon="arrow-forward" onPress={submit} loading={loading} />
          </View>
          <Text style={styles.help}>Use the username and password configured on the company server.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Dashboard({ user }: { user: User }) {
  const nav = useNavigation<any>();
  const [report, setReport] = useState<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = async () => {
    try {
      setLoadError(null);
      const payload = await api("/reports/summary");
      setReport(payload);
    } catch (error) {
      setReport(null);
      setLoadError(error instanceof Error ? error.message : "Unable to load dashboard data.");
    }
  };
  useEffect(() => { load(); }, []);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const active = report?.byStatus?.ACTIVE ?? 0;
  const districtEntries = Object.entries(report?.byDistrict ?? {}).map(([district, count]: [string, any]) => ({ district, count }));
  return <Page><ScrollView contentContainerStyle={ui.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <Text style={styles.overviewTitle}>Igloo Fridge Overview</Text>
    <Pressable onPress={() => nav.navigate("Scanner")} style={styles.scanHero}>
      <View style={styles.scanIcon}><Ionicons name="qr-code" size={40} color={colors.white} /></View>
      <View style={{ flex: 1 }}><Text style={styles.scanTitle}>Scan a fridge</Text><Text style={styles.scanCopy}>Point, verify and update in seconds</Text></View>
      <Ionicons name="arrow-forward-circle" size={35} color={colors.white} />
    </Pressable>
    <View style={styles.stats}>
      <Card style={styles.stat}><Text style={styles.statNum}>{report?.total ?? "—"}</Text><Text style={styles.statLabel}>Total assets</Text></Card>
      <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.green }]}>{active || "—"}</Text><Text style={styles.statLabel}>Active</Text></Card>
      <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.amber }]}>{report?.unscannedIn90Days ?? "—"}</Text><Text style={styles.statLabel}>Need visit</Text></Card>
    </View>
    <Text style={ui.section}>Quick actions</Text>
    <View style={styles.actionGrid}>
      <Quick icon="search" label="Find fridge" color={colors.blue} onPress={() => nav.navigate("Search")} />
      {user.role === "ADMIN" && <Quick icon="add-circle" label="Register new" color={colors.navy} onPress={() => nav.navigate("Register")} />}
      <Quick icon="map" label="Route map" color={colors.green} onPress={() => nav.navigate("Map")} />
      <Quick icon="time" label="Recent moves" color={colors.cyan} onPress={() => nav.navigate("Search")} />
    </View>
    <Text style={ui.section}>By district</Text>
    <Card>
      {loadError ? <Text style={ui.subtitle}>{loadError}</Text> : null}
      {!loadError && districtEntries.length === 0 ? <Text style={ui.subtitle}>No district data yet.</Text> : null}
      {districtEntries.slice(0, 5).map((x: any, i: number) =>
        <View key={x.district} style={[styles.district, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Text style={styles.districtName}>{x.district}</Text><Text style={styles.districtCount}>{x.count} fridges</Text>
        </View>)}
    </Card>
  </ScrollView></Page>;
}

function Quick({ icon, label, color, onPress }: any) {
  return <Pressable onPress={onPress} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={24} color={color} /></View><Text style={styles.quickText}>{label}</Text></Pressable>;
}

function Scanner() {
  const nav = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scannerSession, setScannerSession] = useState(0);
  const resetScanner = () => {
    setScannedValue(null);
    setScannerSession(session => session + 1);
    setTimeout(() => setScanned(false), 400);
  };
  if (!permission) return <Page><PageHeader title="Scan fridge" /><View style={styles.center}><Text>Loading camera…</Text></View></Page>;
  if (!permission.granted) return <Page><PageHeader title="Scan fridge" /><View style={styles.permission}><Ionicons name="camera" size={50} color={colors.blue} /><Text style={ui.title}>Camera access</Text><Text style={[ui.subtitle, { textAlign: "center" }]}>IglooTrack uses the camera only to read fridge QR labels.</Text><Button title="Allow camera" onPress={requestPermission} /></View></Page>;
  const scan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScannedValue(data || "Code detected");
  };
  return <View style={styles.cameraPage}><CameraView key={scannerSession} style={StyleSheet.absoluteFill} barcodeScannerSettings={{
    barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "codabar", "itf14", "datamatrix", "pdf417", "aztec"],
  }} onBarcodeScanned={scanned ? undefined : scan} />
    <SafeAreaView style={styles.cameraOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.close} onPress={() => nav.goBack()}><Ionicons name="arrow-back" size={26} color={colors.white} /></Pressable>
      <View style={styles.scannerText}><Text style={styles.cameraTitle}>Scan fridge label</Text><Text style={styles.cameraCopy}>Align the QR code inside the frame</Text></View>
      <View style={styles.scanFrame}><View style={styles.corner1} /><View style={styles.corner2} /><View style={styles.corner3} /><View style={styles.corner4} /></View>
      <View style={styles.cameraTip}><Ionicons name="flashlight" size={20} color={colors.white} /><Text style={styles.cameraCopy}>Keep the label steady and well lit</Text></View>
    </SafeAreaView>
    <Modal
      visible={scannedValue !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={resetScanner}
    >
      <View style={styles.scanResultBackdrop}>
        <View style={styles.scanResultCard}>
          <View style={styles.scanResultIcon}><Ionicons name="checkmark" size={32} color={colors.white} /></View>
          <Text style={styles.scanResultTitle}>Scan successful</Text>
          <Text selectable style={styles.scanResultValue}>{scannedValue}</Text>
          <View style={styles.scanResultActions}>
            <Button title="Scan another" icon="scan" variant="secondary" onPress={resetScanner} />
            <Button title="Done" icon="checkmark-circle" onPress={() => nav.goBack()} />
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

function Search() {
  const nav = useNavigation<any>(); const [query, setQuery] = useState(""); const [status, setStatus] = useState("");
  const [items, setItems] = useState<Fridge[]>([]); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const r = await api<{ items: Fridge[] }>(`/fridges?search=${encodeURIComponent(query)}&status=${status}`); setItems(r.items); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, [status]);
  return <Page><PageHeader title="Find a fridge" onBack={() => nav.navigate("Home")} /><View style={[ui.scroll, { flex: 1, paddingBottom: 20 }]}>
    <View style={styles.searchRow}><View style={{ flex: 1 }}><Field label="Serial, model, shop or owner" value={query} onChangeText={setQuery} onSubmitEditing={load} /></View><Pressable onPress={load} style={styles.searchButton}><Ionicons name="search" size={23} color={colors.white} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {["", "ACTIVE", "REPAIR", "INACTIVE", "DECOMMISSIONED"].map(x => <Pressable key={x || "ALL"} onPress={() => setStatus(x)} style={[styles.chip, status === x && styles.chipActive]}><Text style={[styles.chipText, status === x && { color: colors.white }]}>{x || "ALL"}</Text></Pressable>)}
    </ScrollView>
    <FlatList data={items} refreshing={loading} onRefresh={load} contentContainerStyle={{ gap: 11, paddingBottom: 90 }} keyExtractor={x => x.id}
      ListEmptyComponent={<Card><Text style={ui.subtitle}>No fridges loaded. Search once the API is running.</Text></Card>}
      renderItem={({ item }) => <Pressable onPress={() => nav.navigate("Fridge", { id: item.id })}><Card style={styles.fridgeRow}>
        <View style={styles.fridgeIcon}><Ionicons name="cube-outline" size={27} color={colors.blue} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.serial}>{item.serialNumber}</Text><Text style={styles.shop}>{item.currentOwner.shopName}</Text><Text style={styles.address}>{item.currentOwner.area}, {item.currentOwner.district}</Text></View>
        <StatusBadge status={item.status} />
      </Card></Pressable>} />
  </View></Page>;
}

function FridgeProfile({ route }: any) {
  const nav = useNavigation<any>(); const [fridge, setFridge] = useState<Fridge>(); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setFridge(await api(`/fridges/${encodeURIComponent(route.params.id)}`)); } catch (e) { Alert.alert("Could not load fridge", e instanceof Error ? e.message : "Try again"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [route.params.id]);
  if (loading || !fridge) return <Page><PageHeader title="Fridge profile" /><View style={styles.center}><Text style={ui.subtitle}>Loading fridge profile…</Text></View></Page>;
  return <Page><PageHeader title="Fridge profile" /><ScrollView contentContainerStyle={ui.scroll}>
    <View style={[ui.row, { justifyContent: "flex-end" }]}><StatusBadge status={fridge.status} /></View>
    <View style={styles.fridgeHero}>{fridge.photoUrl ? <Image source={{ uri: fridge.photoUrl }} style={styles.heroImage} /> : <Ionicons name="cube" size={74} color={colors.cyan} />}
      <View style={styles.serialPill}><Text style={styles.serialPillText}>{fridge.serialNumber}</Text></View></View>
    <Card><Text style={styles.ownerEyebrow}>CURRENT CUSTODIAN</Text><Text style={styles.ownerShop}>{fridge.currentOwner.shopName}</Text><Text style={styles.ownerName}>{fridge.currentOwner.name} · {fridge.currentOwner.phone}</Text>
      <View style={styles.locationRow}><Ionicons name="location" size={21} color={colors.blue} /><Text style={[ui.subtitle, { flex: 1 }]}>{fridge.currentOwner.fullAddress}</Text></View></Card>
    <View style={styles.detailGrid}><Detail label="Model" value={fridge.model} /><Detail label="Capacity" value={fridge.capacity} /><Detail label="Installed" value={new Date(fridge.installDate).toLocaleDateString()} /><Detail label="Last verified" value={fridge.scans?.[0] ? new Date(fridge.scans[0].scannedAt).toLocaleDateString() : "Never"} /></View>
    <Button title="Transfer custody" icon="swap-horizontal" onPress={() => nav.navigate("Transfer", { fridge })} />
    <Button title="View full history" icon="time" variant="secondary" onPress={() => nav.navigate("History", { fridge })} />
    <Button title="Refresh profile" icon="refresh" variant="ghost" onPress={load} />
  </ScrollView></Page>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <Card style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></Card>;
}

function History({ route }: any) {
  const nav = useNavigation<any>();
  const fridge: Fridge = route.params.fridge;
  return <Page><PageHeader title="Ownership history" onBack={() => nav.goBack()} /><ScrollView contentContainerStyle={ui.scroll}><Text style={ui.subtitle}>{fridge.serialNumber} · permanent custody trail</Text>
    {(fridge.transfers || []).map((item, i) => <View key={item.id} style={styles.timeline}>
      <View style={styles.timelineRail}><View style={[styles.timelineDot, i === 0 && { backgroundColor: colors.navy }]} />{i < (fridge.transfers?.length || 0) - 1 && <View style={styles.timelineLine} />}</View>
      <Card style={{ flex: 1 }}><View style={[ui.row, { justifyContent: "space-between" }]}><Text style={styles.ownerShop}>{item.toOwner.shopName}</Text>{i === 0 && <Text style={styles.currentLabel}>CURRENT</Text>}</View>
        <Text style={styles.ownerName}>{item.toOwner.name}</Text><Text style={styles.address}>{item.addressAtTransfer}</Text>
        <Text style={styles.historyMeta}>{new Date(item.transferredAt).toLocaleString()} · {item.transferredBy?.name || "System"}</Text>{item.notes && <Text style={styles.notes}>{item.notes}</Text>}</Card>
    </View>)}
  </ScrollView></Page>;
}

function TransferScreen({ route }: any) {
  const nav = useNavigation<any>(); const fridge: Fridge = route.params.fridge;
  const [search, setSearch] = useState(""); const [owners, setOwners] = useState<Owner[]>([]); const [selected, setSelected] = useState<Owner>();
  const [createMode, setCreateMode] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState({ name: "", phone: "", shopName: "", area: "", district: "" });
  const [address, setAddress] = useState(""); const [notes, setNotes] = useState(""); const [loc, setLoc] = useState<{ latitude: number; longitude: number }>(); const [saving, setSaving] = useState(false);
  const find = async () => { try { setOwners(await api(`/shop-owners?search=${encodeURIComponent(search)}`)); } catch {} };
  const gps = async () => { const p = await Location.requestForegroundPermissionsAsync(); if (!p.granted) return Alert.alert("Location permission needed"); const x = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); setLoc(x.coords); };
  const submit = async () => {
    if ((!selected && !createMode) || !loc || !address) return Alert.alert("Complete the transfer", "Select or create an owner, confirm the address and capture GPS.");
    setSaving(true);
    try {
      let target = selected;
      if (!target && createMode) {
        target = await api<Owner>("/shop-owners", {
          method: "POST",
          body: JSON.stringify({ ...ownerDraft, fullAddress: address, ...loc }),
        });
      }
      if (!target) throw new Error("Choose a shop owner");
      const options = { method: "POST", body: JSON.stringify({ toOwnerId: target.id, expectedVersion: fridge.version, addressAtTransfer: address, ...loc, notes }) };
      await api(`/fridges/${fridge.id}/transfer`, options); Alert.alert("Custody transferred", "The audit trail has been updated."); nav.popTo("Fridge", { id: fridge.id });
    }
    catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("changed since")) Alert.alert("Transfer conflict", message);
      else if (selected) {
        await queueAction(`/fridges/${fridge.id}/transfer`, {
          method: "POST",
          body: JSON.stringify({ toOwnerId: selected.id, expectedVersion: fridge.version, addressAtTransfer: address, ...loc, notes }),
        });
        Alert.alert("Saved offline", "This transfer will sync when connectivity returns."); nav.goBack();
      } else Alert.alert("Could not create owner", message || "Try again when online.");
    } finally { setSaving(false); }
  };
  return <Page><PageHeader title="Transfer fridge" /><ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled"><Text style={ui.subtitle}>{fridge.serialNumber} is currently at {fridge.currentOwner.shopName}</Text>
    <Card><Text style={ui.section}>1. New custodian</Text><View style={{ gap: 12, marginTop: 12 }}><Field label="Search owner or shop" value={search} onChangeText={setSearch} onSubmitEditing={find} /><Button title="Search records" variant="secondary" icon="search" onPress={find} />
      {owners.map(owner => <Pressable key={owner.id} onPress={() => { setSelected(owner); setAddress(owner.fullAddress); setLoc({ latitude: Number(owner.latitude), longitude: Number(owner.longitude) }); }} style={[styles.ownerOption, selected?.id === owner.id && styles.ownerSelected]}><View style={{ flex: 1 }}><Text style={styles.shop}>{owner.shopName}</Text><Text style={styles.address}>{owner.name} · {owner.phone}</Text></View>{selected?.id === owner.id && <Ionicons name="checkmark-circle" size={24} color={colors.green} />}</Pressable>)}</View></Card>
    <Button title={createMode ? "Use an existing owner" : "Create a new owner"} variant="ghost" icon={createMode ? "people" : "person-add"} onPress={() => { setCreateMode(!createMode); setSelected(undefined); }} />
    {createMode && <Card style={{ gap: 12 }}><Text style={ui.section}>New owner record</Text>
      <Field label="Owner name" value={ownerDraft.name} onChangeText={name => setOwnerDraft(x => ({ ...x, name }))} />
      <Field label="Phone" value={ownerDraft.phone} onChangeText={phone => setOwnerDraft(x => ({ ...x, phone }))} keyboardType="phone-pad" />
      <Field label="Shop name" value={ownerDraft.shopName} onChangeText={shopName => setOwnerDraft(x => ({ ...x, shopName }))} />
      <Field label="Area" value={ownerDraft.area} onChangeText={area => setOwnerDraft(x => ({ ...x, area }))} />
      <Field label="District" value={ownerDraft.district} onChangeText={district => setOwnerDraft(x => ({ ...x, district }))} />
    </Card>}
    <Card><Text style={ui.section}>2. Verify location</Text><View style={{ gap: 12, marginTop: 12 }}><Field label="Address at transfer" value={address} onChangeText={setAddress} multiline /><Button title={loc ? "GPS captured" : "Capture current GPS"} variant="secondary" icon={loc ? "checkmark-circle" : "locate"} onPress={gps} />{loc && <Text style={styles.gps}>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</Text>}</View></Card>
    <Field label="Transfer notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Reason, condition, contact notes…" />
    <Button title="Confirm custody transfer" icon="shield-checkmark" onPress={submit} loading={saving} />
  </ScrollView></Page>;
}

function Register() {
  const nav = useNavigation<any>(); const [form, setForm] = useState({ serialNumber: "", model: "", capacity: "", name: "", phone: "", shopName: "", area: "", district: "", fullAddress: "" }); const [loc, setLoc] = useState<any>(); const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const set = (key: string) => (value: string) => setForm(x => ({ ...x, [key]: value }));
  const isDirty = Object.values(form).some(value => value.trim().length > 0) || Boolean(loc);
  const hasRequiredFields = Object.values(form).every(value => value.trim().length > 0);
  const canSubmit = hasRequiredFields && Boolean(loc) && !saving;
  usePreventRemove(isDirty && !completed, ({ data }) => {
    Alert.alert(
      "Discard registration?",
      "Your entered fridge and owner information will be lost.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => nav.dispatch(data.action) },
      ],
    );
  });
  const gps = async () => { const p = await Location.requestForegroundPermissionsAsync(); if (p.granted) setLoc((await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords); };
  const submit = async () => {
    if (!canSubmit || !loc) return;
    setSaving(true); try {
      const result = await api<Fridge & { qrCodeDataUrl: string }>("/fridges", { method: "POST", body: JSON.stringify({
        serialNumber: form.serialNumber, model: form.model, capacity: form.capacity, installDate: new Date(),
        owner: { name: form.name, phone: form.phone, shopName: form.shopName, area: form.area, district: form.district, fullAddress: form.fullAddress, latitude: loc.latitude, longitude: loc.longitude },
      }) });
      setCompleted(true);
      Alert.alert(
        "Registration successful",
        "The fridge was registered and its QR code was generated.",
        [{ text: "View fridge", onPress: () => nav.replace("Fridge", { id: result.id }) }],
      );
    } catch (e) { Alert.alert("Registration failed", e instanceof Error ? e.message : "Check the form"); } finally { setSaving(false); }
  };
  return <Page><KeyboardAvoidingView style={styles.registerPage} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <PageHeader title="Register new fridge" />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.registerScroll} keyboardShouldPersistTaps="handled">
      <Text style={ui.subtitle}>Create the asset and its first custody record together.</Text>
      <Card style={{ gap: 13 }}><Text style={ui.section}>Fridge details</Text><Field label="Serial number" value={form.serialNumber} onChangeText={set("serialNumber")} /><Field label="Model" value={form.model} onChangeText={set("model")} /><Field label="Capacity" value={form.capacity} onChangeText={set("capacity")} placeholder="e.g. 350 L" /></Card>
      <Card style={{ gap: 13 }}><Text style={ui.section}>Initial custodian</Text><Field label="Owner name" value={form.name} onChangeText={set("name")} /><Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" /><Field label="Shop name" value={form.shopName} onChangeText={set("shopName")} /><Field label="Area" value={form.area} onChangeText={set("area")} /><Field label="District" value={form.district} onChangeText={set("district")} /><Field label="Full address" value={form.fullAddress} onChangeText={set("fullAddress")} multiline /><Button title={loc ? "GPS captured" : "Capture shop GPS"} variant="secondary" icon={loc ? "checkmark-circle" : "locate"} onPress={gps} /></Card>
      {!canSubmit && <Text style={styles.registerHint}>Complete every field and capture GPS to continue.</Text>}
      <Button title="Register & generate QR" icon="qr-code" onPress={submit} loading={saving} disabled={!canSubmit} />
    </ScrollView>
  </KeyboardAvoidingView></Page>;
}

function MapScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Fridge[]>([]);
  useEffect(() => { api<{ items: Fridge[] }>("/fridges?pageSize=100").then(x => setItems(x.items)).catch(() => {}); }, []);
  return <Page><PageHeader title="Field map" onBack={() => nav.navigate("Home")} /><View style={styles.mapSubtitle}><Text style={ui.subtitle}>Last known custodian locations</Text></View><MapView style={{ flex: 1 }} initialRegion={{ latitude: 23.8103, longitude: 90.4125, latitudeDelta: .35, longitudeDelta: .35 }}>
    {items.map(x => <Marker key={x.id} coordinate={{ latitude: Number(x.currentOwner.latitude), longitude: Number(x.currentOwner.longitude) }} title={x.serialNumber} description={x.currentOwner.shopName} pinColor={x.status === "ACTIVE" ? colors.blue : colors.coral} />)}
  </MapView></Page>;
}

function Settings({ user, onLogout }: { user: User; onLogout: () => void }) {
  const nav = useNavigation<any>();
  const [pending, setPending] = useState(0); const [syncing, setSyncing] = useState(false);
  useEffect(() => { pendingCount().then(setPending); }, []);
  const sync = async () => { setSyncing(true); const result = await syncQueue(); setPending(result.pending); setSyncing(false); Alert.alert("Sync complete", `${result.synced} sent, ${result.pending} still pending.`); };
  return <Page><PageHeader title="Profile & sync" onBack={() => nav.navigate("Home")} /><ScrollView contentContainerStyle={ui.scroll}><Card><View style={styles.profileAvatar}><Text style={styles.profileInitials}>{user.name.split(" ").map(x => x[0]).join("")}</Text></View><Text style={[styles.ownerShop, { textAlign: "center", marginTop: 12 }]}>{user.name}</Text><Text style={[ui.subtitle, { textAlign: "center" }]}>{user.email}</Text><View style={styles.role}><Text style={styles.roleText}>{user.role.replace("_", " ")}</Text></View></Card>
    <Card><View style={[ui.row, { justifyContent: "space-between" }]}><View><Text style={ui.section}>Offline queue</Text><Text style={ui.subtitle}>{pending} pending field updates</Text></View><Ionicons name={pending ? "cloud-offline" : "cloud-done"} size={34} color={pending ? colors.amber : colors.green} /></View><View style={{ marginTop: 14 }}><Button title="Sync now" variant="secondary" icon="sync" onPress={sync} loading={syncing} /></View></Card>
    <Card><Text style={ui.section}>Assigned territory</Text><Text style={[ui.subtitle, { marginTop: 7 }]}>{user.assignedArea || "All Bangladesh"}</Text></Card>
    <Button title="Sign out" variant="ghost" icon="log-out" onPress={onLogout} />
  </ScrollView></Page>;
}

function MainTabs({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <Tabs.Navigator screenOptions={({ route }: { route: { name: string } }) => ({
    headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: "#8A9BB1",
    tabBarStyle: styles.tabBar, tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={({ Home: "home", Search: "search", Map: "map", Profile: "person" } as any)[route.name]} size={size} color={color} />,
  })}>
    <Tabs.Screen name="Home">{() => <Dashboard user={user} />}</Tabs.Screen>
    <Tabs.Screen name="Search" component={Search} />
    <Tabs.Screen name="Map" component={MapScreen} />
    <Tabs.Screen name="Profile">{() => <Settings user={user} onLogout={onLogout} />}</Tabs.Screen>
  </Tabs.Navigator>;
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => { getSession().then(x => setUser(x?.user || null)); }, []);
  const logout = async () => { await clearSession(); setUser(null); };
  if (user === undefined) return <View style={styles.splash}><Logo /><Text style={ui.subtitle}>Preparing your field workspace…</Text></View>;
  return <SafeAreaProvider><StatusBar style="dark" /><NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {!user ? <Stack.Screen name="Login">{() => <Login onLogin={setUser} />}</Stack.Screen> : <>
        <Stack.Screen name="Main">{() => <MainTabs user={user} onLogout={logout} />}</Stack.Screen>
        <Stack.Screen name="Scanner" component={Scanner} options={{ animation: "fade" }} />
        <Stack.Screen name="Fridge" component={FridgeProfile} />
        <Stack.Screen name="Transfer" component={TransferScreen} />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="Register" component={Register} />
      </>}
    </Stack.Navigator>
  </NavigationContainer></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, backgroundColor: colors.pale },
  login: { flex: 1, backgroundColor: colors.white },
  loginInner: { flex: 1 },
  loginContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  loginPanel: { width: "100%", maxWidth: 440, alignSelf: "center" },
  loginBrand: { alignItems: "center", marginBottom: 32 },
  loginForm: { width: "100%", gap: 16 },
  passwordField: { position: "relative" },
  passwordInput: { paddingRight: 58 },
  passwordToggle: { position: "absolute", right: 8, bottom: 5, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  loginError: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#FFD1D6", backgroundColor: "#FFF1F3" },
  loginErrorText: { flex: 1, color: colors.red, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  help: { color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: 16 },
  pageHeader: { minHeight: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  pageBack: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.ice },
  pageHeaderTitle: { flex: 1, color: colors.navy, fontSize: 20, fontWeight: "900", textAlign: "center" },
  pageHeaderSpacer: { width: 44 },
  overviewTitle: { color: colors.navy, fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  scanHero: { minHeight: 112, borderRadius: 28, padding: 18, flexDirection: "row", alignItems: "center", gap: 15, backgroundColor: colors.blue, ...shadow },
  scanIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  scanTitle: { color: colors.white, fontSize: 22, fontWeight: "900" }, scanCopy: { color: "#EAF8FF", fontSize: 13, marginTop: 4 },
  stats: { flexDirection: "row", gap: 9 }, stat: { flex: 1, padding: 13 }, statNum: { color: colors.blue, fontSize: 24, fontWeight: "900" }, statLabel: { color: colors.muted, fontSize: 11, marginTop: 4, fontWeight: "700" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, quick: { width: "48%", minHeight: 86, borderRadius: 21, padding: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 11 },
  quickIcon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center" }, quickText: { flex: 1, color: colors.ink, fontWeight: "800" },
  district: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 }, districtName: { color: colors.ink, fontWeight: "700" }, districtCount: { color: colors.blue, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pale }, permission: { flex: 1, padding: 30, alignItems: "center", justifyContent: "center", gap: 18, backgroundColor: colors.pale },
  cameraPage: { flex: 1, backgroundColor: "#07101C" }, cameraOverlay: { flex: 1, padding: 22, alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,15,32,.35)" },
  close: { alignSelf: "flex-start", width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,.4)", alignItems: "center", justifyContent: "center" },
  scannerText: { alignItems: "center" }, cameraTitle: { color: colors.white, fontSize: 25, fontWeight: "900" }, cameraCopy: { color: "#E5F6FF", fontSize: 14, marginTop: 7 },
  scanFrame: { width: 260, height: 260 }, corner1: { position: "absolute", left: 0, top: 0, width: 55, height: 55, borderLeftWidth: 5, borderTopWidth: 5, borderColor: colors.cyan, borderTopLeftRadius: 22 },
  corner2: { position: "absolute", right: 0, top: 0, width: 55, height: 55, borderRightWidth: 5, borderTopWidth: 5, borderColor: colors.cyan, borderTopRightRadius: 22 },
  corner3: { position: "absolute", left: 0, bottom: 0, width: 55, height: 55, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: colors.cyan, borderBottomLeftRadius: 22 },
  corner4: { position: "absolute", right: 0, bottom: 0, width: 55, height: 55, borderRightWidth: 5, borderBottomWidth: 5, borderColor: colors.cyan, borderBottomRightRadius: 22 },
  cameraTip: { marginBottom: 30, flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 18, backgroundColor: "rgba(0,0,0,.45)" },
  scanResultBackdrop: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(7,16,28,.72)" },
  scanResultCard: { width: "100%", maxWidth: 420, padding: 24, borderRadius: 24, alignItems: "center", backgroundColor: colors.white, ...shadow },
  scanResultIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  scanResultTitle: { color: colors.navy, fontSize: 23, fontWeight: "900", marginTop: 16 },
  scanResultValue: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 10 },
  scanResultActions: { width: "100%", gap: 12, marginTop: 24 },
  searchRow: { flexDirection: "row", alignItems: "flex-end", gap: 9 }, searchButton: { width: 53, height: 53, borderRadius: 17, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, chipActive: { backgroundColor: colors.blue, borderColor: colors.blue }, chipText: { fontSize: 12, color: colors.muted, fontWeight: "800" },
  fridgeRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 }, fridgeIcon: { width: 49, height: 49, borderRadius: 16, backgroundColor: colors.ice, alignItems: "center", justifyContent: "center" },
  serial: { color: colors.ink, fontSize: 16, fontWeight: "900" }, shop: { color: colors.ink, fontWeight: "800" }, address: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  fridgeHero: { height: 190, borderRadius: 28, backgroundColor: colors.ice, alignItems: "center", justifyContent: "center", overflow: "hidden" }, heroImage: { width: "100%", height: "100%" },
  serialPill: { position: "absolute", bottom: 13, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 16, backgroundColor: colors.navy }, serialPillText: { color: colors.white, fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  ownerEyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1 }, ownerShop: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 6 }, ownerName: { color: colors.muted, marginTop: 3 },
  locationRow: { flexDirection: "row", gap: 8, marginTop: 15, alignItems: "flex-start" }, detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, detail: { width: "48%", padding: 14 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" }, detailValue: { color: colors.ink, fontSize: 15, fontWeight: "900", marginTop: 5 },
  timeline: { flexDirection: "row", alignItems: "stretch", gap: 11 }, timelineRail: { width: 20, alignItems: "center" }, timelineDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.blue, marginTop: 22, zIndex: 1 }, timelineLine: { position: "absolute", width: 3, top: 35, bottom: -22, backgroundColor: "#CBEAF8" },
  currentLabel: { color: colors.blue, fontSize: 10, fontWeight: "900" }, historyMeta: { color: colors.blue, fontSize: 11, fontWeight: "700", marginTop: 12 }, notes: { color: colors.ink, marginTop: 9, padding: 10, backgroundColor: colors.ice, borderRadius: 12, fontSize: 13 },
  ownerOption: { padding: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center" }, ownerSelected: { borderColor: colors.green, backgroundColor: "#EEFBF6" }, gps: { color: colors.green, textAlign: "center", fontWeight: "800" },
  registerPage: { flex: 1 },
  registerScroll: { padding: 20, paddingBottom: 40, gap: 16 },
  registerHint: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  mapSubtitle: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.white },
  profileAvatar: { alignSelf: "center", width: 80, height: 80, borderRadius: 27, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, profileInitials: { color: colors.white, fontSize: 27, fontWeight: "900" },
  role: { alignSelf: "center", marginTop: 12, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: colors.ice, borderRadius: 15 }, roleText: { color: colors.blue, fontSize: 11, fontWeight: "900" },
  tabBar: { height: 72, paddingTop: 8, paddingBottom: 10, borderTopWidth: 0, backgroundColor: colors.white, ...shadow },
});
