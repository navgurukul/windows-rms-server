import { relations } from "drizzle-orm/relations";
import { devices, laptopTracking, softwaresInstalled, deviceWallpapers, wallpapers } from "./schema";

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