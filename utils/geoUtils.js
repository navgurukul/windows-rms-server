// server/utils/geoUtils.js

const INDIAN_CITIES_COORDINATES = {
    'delhi': { lat: 28.6139, lng: 77.2090, name: 'Delhi NCR' },
    'new delhi': { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
    'noida': { lat: 28.5355, lng: 77.3910, name: 'Noida' },
    'greater noida': { lat: 28.4744, lng: 77.5040, name: 'Greater Noida' },
    'gurgaon': { lat: 28.4595, lng: 77.0266, name: 'Gurugram' },
    'gurugram': { lat: 28.4595, lng: 77.0266, name: 'Gurugram' },
    'ghaziabad': { lat: 28.6692, lng: 77.4538, name: 'Ghaziabad' },
    'faridabad': { lat: 28.4089, lng: 77.3178, name: 'Faridabad' },
    'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune' },
    'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
    'thane': { lat: 19.2183, lng: 72.9781, name: 'Thane' },
    'navi mumbai': { lat: 19.0330, lng: 73.0297, name: 'Navi Mumbai' },
    'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur' },
    'nashik': { lat: 19.9975, lng: 73.7898, name: 'Nashik' },
    'aurangabad': { lat: 19.8762, lng: 75.3433, name: 'Chhatrapati Sambhajinagar' },
    'amravati': { lat: 20.9374, lng: 77.7796, name: 'Amravati' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
    'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
    'sarjapur': { lat: 12.8604, lng: 77.7857, name: 'Sarjapur (Bengaluru)' },
    'mysuru': { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
    'mysore': { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
    'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
    'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad' },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam' },
    'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada' },
    'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
    'coimbatore': { lat: 11.0168, lng: 76.9558, name: 'Coimbatore' },
    'madurai': { lat: 9.9252, lng: 78.1198, name: 'Madurai' },
    'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
    'howrah': { lat: 22.5958, lng: 88.2636, name: 'Howrah' },
    'siliguri': { lat: 26.7271, lng: 88.3953, name: 'Siliguri' },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
    'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat' },
    'vadodara': { lat: 22.3072, lng: 73.1812, name: 'Vadodara' },
    'rajkot': { lat: 22.3039, lng: 70.8022, name: 'Rajkot' },
    'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
    'udaipur': { lat: 24.5854, lng: 73.7125, name: 'Udaipur' },
    'jodhpur': { lat: 26.2389, lng: 73.0243, name: 'Jodhpur' },
    'kota': { lat: 25.2138, lng: 75.8648, name: 'Kota' },
    'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
    'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur' },
    'varanasi': { lat: 25.3176, lng: 82.9739, name: 'Varanasi' },
    'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra' },
    'prayagraj': { lat: 25.4358, lng: 81.8463, name: 'Prayagraj' },
    'allahabad': { lat: 25.4358, lng: 81.8463, name: 'Prayagraj' },
    'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna' },
    'kishanganj': { lat: 26.0720, lng: 87.9400, name: 'Kishanganj' },
    'gaya': { lat: 24.7914, lng: 85.0002, name: 'Gaya' },
    'muzaffarpur': { lat: 26.1209, lng: 85.3647, name: 'Muzaffarpur' },
    'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal' },
    'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore' },
    'jabalpur': { lat: 23.1815, lng: 79.9864, name: 'Jabalpur' },
    'gwalior': { lat: 26.2183, lng: 78.1828, name: 'Gwalior' },
    'chandigarh': { lat: 30.7333, lng: 76.7794, name: 'Chandigarh' },
    'ludhiana': { lat: 30.9010, lng: 75.8573, name: 'Ludhiana' },
    'amritsar': { lat: 31.6340, lng: 74.8723, name: 'Amritsar' },
    'raipur': { lat: 21.2514, lng: 81.6296, name: 'Raipur' },
    'jashpur': { lat: 22.8833, lng: 84.1500, name: 'Jashpur' },
    'durg': { lat: 21.1904, lng: 81.2849, name: 'Durg' },
    'bhilai': { lat: 21.2120, lng: 81.3733, name: 'Bhilai' },
    'ranchi': { lat: 23.3441, lng: 85.3096, name: 'Ranchi' },
    'jamshedpur': { lat: 22.8046, lng: 86.2029, name: 'Jamshedpur' },
    'dhanbad': { lat: 23.7957, lng: 86.4304, name: 'Dhanbad' },
    'bhubaneswar': { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar' },
    'cuttack': { lat: 20.4625, lng: 85.8828, name: 'Cuttack' },
    'dehradun': { lat: 30.3165, lng: 78.0322, name: 'Dehradun' },
    'haridwar': { lat: 29.9457, lng: 78.1642, name: 'Haridwar' },
    'rishikesh': { lat: 30.0869, lng: 78.2676, name: 'Rishikesh' },
    'shimla': { lat: 31.1048, lng: 77.1734, name: 'Shimla' },
    'dharamshala': { lat: 32.2190, lng: 76.3234, name: 'Dharamshala' },
    'kangra': { lat: 32.0998, lng: 76.2691, name: 'Kangra' },
    'guwahati': { lat: 26.1445, lng: 91.7362, name: 'Guwahati' },
    'agartala': { lat: 23.8315, lng: 91.2868, name: 'Agartala' },
    'tripura': { lat: 23.8315, lng: 91.2868, name: 'Tripura' },
    'imphal': { lat: 24.8170, lng: 93.9368, name: 'Imphal' },
    'shillong': { lat: 25.5788, lng: 91.8933, name: 'Shillong' },
    'aizawl': { lat: 23.7271, lng: 92.7176, name: 'Aizawl' },
    'kohima': { lat: 25.6751, lng: 94.1086, name: 'Kohima' },
    'gangtok': { lat: 27.3389, lng: 88.6065, name: 'Gangtok' },
    'itanagar': { lat: 27.0844, lng: 93.6053, name: 'Itanagar' },
    'goa': { lat: 15.2993, lng: 74.1240, name: 'Goa' },
    'panaji': { lat: 15.4909, lng: 73.8278, name: 'Panaji' },
    'jammu': { lat: 32.7266, lng: 74.8570, name: 'Jammu' },
    'srinagar': { lat: 34.0837, lng: 74.7973, name: 'Srinagar' },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
    'trivandrum': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
    'kochi': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
    'cochin': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
    'kozhikode': { lat: 11.2588, lng: 75.7804, name: 'Kozhikode' },
};

/**
 * Checks if coordinate is within India bounding box (approx lat 6.0 to 37.5, lng 68.0 to 97.5)
 */
function isWithinIndia(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return false;
    }
    return lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}

/**
 * Attempt to match textual location to standard Indian city coordinates
 */
function matchCityLocation(locationText) {
    if (!locationText || typeof locationText !== 'string') return null;
    const cleanText = locationText.toLowerCase().trim();

    // Direct match
    if (INDIAN_CITIES_COORDINATES[cleanText]) {
        return INDIAN_CITIES_COORDINATES[cleanText];
    }

    // Substring / word match
    for (const [key, value] of Object.entries(INDIAN_CITIES_COORDINATES)) {
        if (cleanText.includes(key) || key.includes(cleanText)) {
            return value;
        }
    }

    return null;
}

/**
 * Finds the nearest known Indian city for a given coordinate pair
 */
function getNearestCity(lat, lng) {
    let nearest = null;
    let minDistance = Infinity;

    for (const [key, city] of Object.entries(INDIAN_CITIES_COORDINATES)) {
        const dLat = lat - city.lat;
        const dLng = lng - city.lng;
        const distSq = dLat * dLat + dLng * dLng;
        if (distSq < minDistance) {
            minDistance = distSq;
            nearest = city.name;
        }
    }

    // If within ~1.5 degrees (~160km), return the city name
    if (minDistance < 2.25 && nearest) {
        return nearest;
    }
    return null;
}

function cleanLocationName(rawName, lat, lng) {
    if (!rawName || typeof rawName !== 'string') {
        return getNearestCity(lat, lng) || 'Regional Hub';
    }
    const lower = rawName.toLowerCase().trim();
    if (lower === 'no internet connection' || lower === 'unknown' || lower === 'n/a' || lower === 'null' || lower === 'undefined' || lower === 'none') {
        return getNearestCity(lat, lng) || 'Regional Hub';
    }
    return rawName.trim();
}

/**
 * Groups devices by geographic proximity (~25km radius / grid rounding)
 */
function groupIntoClusters(devicesWithCoords) {
    const clusterMap = new Map();

    for (const dev of devicesWithCoords) {
        // Round to 1 decimal place (~11km grid) to form intuitive clusters
        const gridLat = Math.round(dev.latitude * 10) / 10;
        const gridLng = Math.round(dev.longitude * 10) / 10;
        const key = `${gridLat}_${gridLng}`;

        const devLocName = cleanLocationName(dev.location_name || dev.tracking_location || dev.registered_location, dev.latitude, dev.longitude);

        if (!clusterMap.has(key)) {
            clusterMap.set(key, {
                id: `cluster_${key}`,
                latitude: dev.latitude,
                longitude: dev.longitude,
                location_name: devLocName,
                count: 0,
                active_count: 0,
                inactive_count: 0,
                offline_count: 0,
                devices: []
            });
        }

        const cluster = clusterMap.get(key);
        // If cluster currently has a generic name and this device has a better one, upgrade it
        if (cluster.location_name === 'Regional Hub' && devLocName !== 'Regional Hub') {
            cluster.location_name = devLocName;
        }

        cluster.count += 1;
        if (!dev.isactive) {
            cluster.offline_count += 1;
        }
        if (dev.activity_status === 'active') {
            cluster.active_count += 1;
        } else {
            cluster.inactive_count += 1;
        }

        cluster.devices.push({
            id: dev.device_id,
            serial_number: dev.serial_number,
            username: dev.username,
            isactive: dev.isactive,
            activity_status: dev.activity_status,
            location_name: devLocName,
            last_sync_time: dev.last_sync_time,
            days_since_last_sync: dev.days_since_last_sync
        });
    }

    return Array.from(clusterMap.values()).sort((a, b) => b.count - a.count);
}

module.exports = {
    INDIAN_CITIES_COORDINATES,
    isWithinIndia,
    matchCityLocation,
    groupIntoClusters
};
