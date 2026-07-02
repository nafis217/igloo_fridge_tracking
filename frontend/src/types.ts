export type Owner = {
  id: string; name: string; phone: string; shopName: string; area: string; district: string;
  fullAddress: string; latitude: number | string; longitude: number | string;
};
export type Transfer = {
  id: string; transferredAt: string; addressAtTransfer: string; notes?: string;
  fromOwner?: Owner | null; toOwner: Owner; transferredBy?: { name: string };
};
export type Fridge = {
  id: string; qrCodeValue: string; serialNumber: string; model: string; capacity: string;
  installDate: string; status: "ACTIVE" | "INACTIVE" | "REPAIR" | "DECOMMISSIONED";
  photoUrl?: string; currentOwner: Owner; version: number; transfers?: Transfer[];
  scans?: { scannedAt: string }[];
};
export type User = {
  id: string; name: string; email: string; role: "ADMIN" | "FIELD_STAFF" | "VIEWER";
  assignedArea?: string | null;
};
