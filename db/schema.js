import { pgTable, unique, serial, varchar, boolean, timestamp, foreignKey, integer, numeric } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";
import { sql } from "drizzle-orm"

export const devices = pgTable("devices", {
    id: serial().primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull(),
    serialNumber: varchar("serial_number", { length: 50 }).notNull(),
    macAddress: varchar("mac_address", { length: 50 }).notNull(),
    ngoId: integer("ngo_id"),
    donorId: integer("donor_id"),
    rms_version: varchar("rms_version", { length: 50 }).default('0.0.0'),
    location: varchar({ length: 255 }).notNull(),
    isactive: boolean().default(true),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("devices_serial_number_key").on(table.serialNumber),
    foreignKey({
        columns: [table.ngoId],
        foreignColumns: [NGOs.id],
        name: "devices_ngo_id_fkey"
    }),
    foreignKey({
        columns: [table.donorId],
        foreignColumns: [donors.id],
        name: "devices_donor_id_fkey"
    }),
]);

export const laptopTracking = pgTable("laptop_tracking", {
    id: serial().primaryKey().notNull(),
    deviceId: integer("device_id").notNull(),
    totalActiveTime: integer("total_active_time").notNull(),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    locationName: varchar("location_name", { length: 255 }),
    timestamp: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
    foreignKey({
        columns: [table.deviceId],
        foreignColumns: [devices.id],
        name: "laptop_tracking_device_id_fkey"
    }),
]);

export const softwares = pgTable("softwares", {
    id: serial().primaryKey().notNull(),
    softwareName: varchar("software_name", { length: 255 }).notNull(),
    wingetId: varchar("winget_id", { length: 255 }).notNull(),
    isGlobal: boolean("is_global").default(true),
    isactive: boolean().default(true),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const softwaresInstalled = pgTable("softwares_installed", {
    id: serial().primaryKey().notNull(),
    deviceId: integer("device_id").notNull(),
    softwareName: varchar("software_name", { length: 255 }).notNull(),
    issuccessful: boolean(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.deviceId],
        foreignColumns: [devices.id],
        name: "softwares_installed_device_id_fkey"
    }),
]);

export const wallpapers = pgTable("wallpapers", {
    id: serial().primaryKey().notNull(),
    wallpaperUrl: varchar("wallpaper_url", { length: 500 }).notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const deviceWallpapers = pgTable("device_wallpapers", {
    id: serial().primaryKey().notNull(),
    deviceId: integer("device_id").notNull(),
    wallpaperId: integer("wallpaper_id").notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.deviceId],
        foreignColumns: [devices.id],
        name: "device_wallpapers_device_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.wallpaperId],
        foreignColumns: [wallpapers.id],
        name: "device_wallpapers_wallpaper_id_fkey"
    }).onDelete("cascade"),
    unique("device_wallpapers_device_id_wallpaper_id_key").on(table.deviceId, table.wallpaperId),
]);

export const NGOs = pgTable("NGOs", {
    id: serial().primaryKey().notNull(),
    NGOName: varchar("NGO_name", { length: 500 }).notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const donors = pgTable("donors", {
    id: serial().primaryKey().notNull(),
    donorName: varchar("donor_name", { length: 500 }).notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const donorSoftwares = pgTable("donor_softwares", {
    id: serial().primaryKey().notNull(),
    donorId: integer("donor_id").notNull(),
    softwareId: integer("software_id").notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.donorId],
        foreignColumns: [donors.id],
        name: "donor_softwares_donor_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.softwareId],
        foreignColumns: [softwares.id],
        name: "donor_softwares_software_id_fkey"
    }).onDelete("cascade"),
    unique("donor_softwares_donor_id_software_id_key").on(table.donorId, table.softwareId),
]);

export const ngoSoftwares = pgTable("ngo_softwares", {
    id: serial().primaryKey().notNull(),
    ngoId: integer("ngo_id").notNull(),
    softwareId: integer("software_id").notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.ngoId],
        foreignColumns: [NGOs.id],
        name: "ngo_softwares_ngo_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.softwareId],
        foreignColumns: [softwares.id],
        name: "ngo_softwares_software_id_fkey"
    }).onDelete("cascade"),
    unique("ngo_softwares_ngo_id_software_id_key").on(table.ngoId, table.softwareId),
]);

export const donorWallpapers = pgTable("donor_wallpapers", {
    id: serial().primaryKey().notNull(),
    donorId: integer("donor_id").notNull(),
    wallpaperId: integer("wallpaper_id").notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.donorId],
        foreignColumns: [donors.id],
        name: "donor_wallpapers_donor_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.wallpaperId],
        foreignColumns: [wallpapers.id],
        name: "donor_wallpapers_wallpaper_id_fkey"
    }).onDelete("cascade"),
    unique("donor_wallpapers_donor_id_wallpaper_id_key").on(table.donorId, table.wallpaperId),
]);

export const ngoWallpapers = pgTable("ngo_wallpapers", {
    id: serial().primaryKey().notNull(),
    ngoId: integer("ngo_id").notNull(),
    wallpaperId: integer("wallpaper_id").notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.ngoId],
        foreignColumns: [NGOs.id],
        name: "ngo_wallpapers_ngo_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.wallpaperId],
        foreignColumns: [wallpapers.id],
        name: "ngo_wallpapers_wallpaper_id_fkey"
    }).onDelete("cascade"),
    unique("ngo_wallpapers_ngo_id_wallpaper_id_key").on(table.ngoId, table.wallpaperId),
]);

export const laptopTrackingRelations = relations(laptopTracking, ({ one }) => ({
    device: one(devices, {
        fields: [laptopTracking.deviceId],
        references: [devices.id]
    }),
}));

export const devicesRelations = relations(devices, ({ many }) => ({
    laptopTrackings: many(laptopTracking),
    softwaresInstalleds: many(softwaresInstalled),
    deviceWallpapers: many(deviceWallpapers),
}));

export const softwaresInstalledRelations = relations(softwaresInstalled, ({ one }) => ({
    device: one(devices, {
        fields: [softwaresInstalled.deviceId],
        references: [devices.id]
    }),
}));

export const deviceWallpapersRelations = relations(deviceWallpapers, ({ one }) => ({
    device: one(devices, {
        fields: [deviceWallpapers.deviceId],
        references: [devices.id]
    }),
    wallpaper: one(wallpapers, {
        fields: [deviceWallpapers.wallpaperId],
        references: [wallpapers.id]
    }),
}));

export const NGOsRelations = relations(NGOs, ({ many }) => ({
    devices: many(devices),
    ngoSoftwares: many(ngoSoftwares),
    ngoWallpapers: many(ngoWallpapers),
}));

export const donorsRelations = relations(donors, ({ many }) => ({
    devices: many(devices),
    donorSoftwares: many(donorSoftwares),
    donorWallpapers: many(donorWallpapers),
}));

export const donorSoftwaresRelations = relations(donorSoftwares, ({ one }) => ({
    donor: one(donors, {
        fields: [donorSoftwares.donorId],
        references: [donors.id]
    }),
    software: one(softwares, {
        fields: [donorSoftwares.softwareId],
        references: [softwares.id]
    }),
}));

export const ngoSoftwaresRelations = relations(ngoSoftwares, ({ one }) => ({
    ngo: one(NGOs, {
        fields: [ngoSoftwares.ngoId],
        references: [NGOs.id]
    }),
    software: one(softwares, {
        fields: [ngoSoftwares.softwareId],
        references: [softwares.id]
    }),
}));

export const donorWallpapersRelations = relations(donorWallpapers, ({ one }) => ({
    donor: one(donors, {
        fields: [donorWallpapers.donorId],
        references: [donors.id]
    }),
    wallpaper: one(wallpapers, {
        fields: [donorWallpapers.wallpaperId],
        references: [wallpapers.id]
    }),
}));

export const ngoWallpapersRelations = relations(ngoWallpapers, ({ one }) => ({
    ngo: one(NGOs, {
        fields: [ngoWallpapers.ngoId],
        references: [NGOs.id]
    }),
    wallpaper: one(wallpapers, {
        fields: [ngoWallpapers.wallpaperId],
        references: [wallpapers.id]
    }),
}));

export const wallpapersRelations = relations(wallpapers, ({ many }) => ({
    deviceWallpapers: many(deviceWallpapers),
}));