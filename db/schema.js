import { pgTable, unique, serial, varchar, boolean, timestamp, foreignKey, integer, numeric } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";
import { sql } from "drizzle-orm"

export const devices = pgTable("devices", {
    id: serial().primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull(),
    serialNumber: varchar("serial_number", { length: 50 }).notNull(),
    macAddress: varchar("mac_address", { length: 50 }).notNull(),
    location: varchar({ length: 255 }).notNull(),
    isactive: boolean().default(true),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("devices_serial_number_key").on(table.serialNumber),
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


export const laptopTrackingRelations = relations(laptopTracking, ({one}) => ({
	device: one(devices, {
		fields: [laptopTracking.deviceId],
		references: [devices.id]
	}),
}));

export const devicesRelations = relations(devices, ({many}) => ({
	laptopTrackings: many(laptopTracking),
	softwaresInstalleds: many(softwaresInstalled),
	deviceWallpapers: many(deviceWallpapers),
}));

export const softwaresInstalledRelations = relations(softwaresInstalled, ({one}) => ({
	device: one(devices, {
		fields: [softwaresInstalled.deviceId],
		references: [devices.id]
	}),
}));

export const deviceWallpapersRelations = relations(deviceWallpapers, ({one}) => ({
	device: one(devices, {
		fields: [deviceWallpapers.deviceId],
		references: [devices.id]
	}),
	wallpaper: one(wallpapers, {
		fields: [deviceWallpapers.wallpaperId],
		references: [wallpapers.id]
	}),
}));

export const wallpapersRelations = relations(wallpapers, ({many}) => ({
	deviceWallpapers: many(deviceWallpapers),
}));