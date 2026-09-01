import { pgTable, unique, serial, varchar, boolean, timestamp, foreignKey, integer, numeric, text } from "drizzle-orm/pg-core"
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
    source: varchar("source", { length: 255 }).default('winget'),
    isGlobal: boolean("is_global").default(true),
    is_portable: boolean("is_portable").default(false),
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
    uniqueKey: varchar("unique_key", { length: 30 }).notNull().unique().default(`D3F41T-K37`),
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

// AFE (Amazon Future Engineer) Learning Data Tables
export const afeDetails = pgTable("afe_details", {
    id: serial().primaryKey().notNull(),
    ngoId: integer("ngo_id").references(() => NGOs.id),
    deviceId: integer("device_id").references(() => devices.id),
    
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    avatarName: varchar("avatar_name", { length: 100 }),
    countryCode: varchar("country_code", { length: 10 }).default('IN'),
    distributionChannelHostId: varchar("distribution_channel_host_id", { length: 100 }).default('Sama Platform 1'),
    dataCollectionMethod: varchar("data_collection_method", { length: 100 }).default('Method 2 - Individual Tracking'),
    partnerName: varchar("partner_name", { length: 150 }).default('Sama Digital Foundation – 1'),
    sessionDate: varchar("session_date", { length: 10 }).notNull(),
    academicYear: varchar("academic_year", { length: 15 }),
    monthName: varchar("month_name", { length: 20 }),
    state: varchar("state", { length: 100 }),
    city: varchar("city", { length: 100 }),
    district: varchar("district", { length: 100 }),
    districtCode: varchar("district_code", { length: 50 }),
    schoolUdise: varchar("school_udise", { length: 20 }),
    schoolName: varchar("school_name", { length: 255 }),
    schoolType: varchar("school_type", { length: 100 }).default('Government School'),
    grade: integer("grade"),
    studentCount: integer("student_count").default(1),
    studentDummyId: varchar("student_dummy_id", { length: 255 }).notNull(),
    classSection: varchar("class_section", { length: 50 }),
    unitType: varchar("unit_type", { length: 100 }).default('Modular AFE'),
    tourType: varchar("tour_type", { length: 50 }).default('Virtual'),
    moduleId: varchar("module_id", { length: 100 }),
    moduleName: varchar("module_name", { length: 255 }),
    language: varchar("language", { length: 50 }).default('English'),
    deliveryModel: varchar("delivery_model", { length: 100 }).default('Self-paced'),
    sessionDurationMinutes: integer("session_duration_minutes").default(0),
    csatAvg: numeric("csat_avg", { precision: 5, scale: 2 }),
    itpAvg: numeric("itp_avg", { precision: 5, scale: 2 }),
    overallRating: numeric("overall_rating", { precision: 5, scale: 2 }),
    exploreCareerRating: numeric("explore_career_rating", { precision: 5, scale: 2 }),
    seeMoreToursRating: numeric("see_more_tours_rating", { precision: 5, scale: 2 }),
    npsScore: integer("nps_score"),
    responseRatePercentage: numeric("response_rate_percentage", { precision: 5, scale: 2 }).default('100.00'),
    videoCompletionRate: numeric("video_completion_rate", { precision: 5, scale: 2 }).default('0'),
    quizAccuracyPercentage: numeric("quiz_accuracy_percentage", { precision: 5, scale: 2 }).default('0'),
    avgWatchTimeSeconds: integer("avg_watch_time_seconds").default(0),
    videosCompletedCount: integer("videos_completed_count").default(0),
    quizzesCompletedCount: integer("quizzes_completed_count").default(0),
    totalQuestionsAnswered: integer("total_questions_answered").default(0),
    correctAnswersCount: integer("correct_answers_count").default(0),
    sessionCompletedFlag: boolean("session_completed_flag").default(false),
    completionPercentage: integer("completion_percentage").default(0),
    totalWatchTimeSeconds: integer("total_watch_time_seconds").default(0),
    avgPlaybackSpeed: numeric("avg_playback_speed", { precision: 5, scale: 2 }).default('1.00'),
    pauseCountTotal: integer("pause_count_total").default(0),
    seekCountTotal: integer("seek_count_total").default(0),
    facilitatorName: varchar("facilitator_name", { length: 255 }),
    teacherConfidenceRating: integer("teacher_confidence_rating"),
    teacherFeedbackText: text("teacher_feedback_text"),
    implementationChallenges: text("implementation_challenges"),
    deviceType: varchar("device_type", { length: 50 }).default('Laptop'),
    platformOs: varchar("platform_os", { length: 50 }),
    platformVersion: varchar("platform_version", { length: 50 }),
    appVersion: varchar("app_version", { length: 50 }),
    networkType: varchar("network_type", { length: 50 }),
    dataSource: varchar("data_source", { length: 50 }).default('Local DB'),
    submissionDate: varchar("submission_date", { length: 10 }),
    
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique("afe_details_session_id_key").on(table.sessionId),
    foreignKey({
        columns: [table.ngoId],
        foreignColumns: [NGOs.id],
        name: "afe_details_ngo_id_fkey"
    }),
    foreignKey({
        columns: [table.deviceId],
        foreignColumns: [devices.id],
        name: "afe_details_device_id_fkey"
    }),
]);

export const afeDetailsRelations = relations(afeDetails, ({ one }) => ({
    ngo: one(NGOs, {
        fields: [afeDetails.ngoId],
        references: [NGOs.id]
    }),
    device: one(devices, {
        fields: [afeDetails.deviceId],
        references: [devices.id]
    }),
}));

// AFE Device Registry (tracks all laptops running AFE, with or without RMS)
export const afeDevices = pgTable("afe_devices", {
    id: serial().primaryKey().notNull(),
    serialNumber: varchar("serial_number", { length: 255 }),
    macAddress: varchar("mac_address", { length: 50 }),
    deviceId: integer("device_id"),
    ngoId: integer("ngo_id"),
    partnerName: varchar("partner_name", { length: 100 }),
    schoolName: varchar("school_name", { length: 255 }),
    schoolUdise: varchar("school_udise", { length: 20 }),
    state: varchar("state", { length: 100 }),
    city: varchar("city", { length: 100 }),
    district: varchar("district", { length: 100 }),
    districtCode: varchar("district_code", { length: 50 }),
    schoolType: varchar("school_type", { length: 100 }),
    platformOs: varchar("platform_os", { length: 50 }),
    hasRms: boolean("has_rms").default(false),
    historicalSync: boolean("historical_sync").default(false),
    lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    foreignKey({
        columns: [table.ngoId],
        foreignColumns: [NGOs.id],
        name: "afe_devices_ngo_id_fkey"
    }),
    foreignKey({
        columns: [table.deviceId],
        foreignColumns: [devices.id],
        name: "afe_devices_device_id_fkey"
    }),
]);

export const afeDevicesRelations = relations(afeDevices, ({ one }) => ({
    ngo: one(NGOs, {
        fields: [afeDevices.ngoId],
        references: [NGOs.id]
    }),
    device: one(devices, {
        fields: [afeDevices.deviceId],
        references: [devices.id]
    }),
}));