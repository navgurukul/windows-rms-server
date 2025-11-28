# Quick Start Guide: Server-Hosted Wallpaper System

## You Already Have Wallpapers Ready!

Your server already has **2 wallpapers** in the `wallpapers` folder:
- `afe_device_wallpapers-dark.jpg` (298KB)
- `afe_device_wallpapers-light.jpg` (307KB)

## Set Wallpaper in 3 Simple Steps

### Option 1: Use Existing Wallpapers

**Step 1: List available wallpapers**
```bash
curl https://rms-api.thesama.in/api/wallpapers/list
```

**Step 2: Set one as active** (using dark wallpaper as example)
```bash
curl -X POST https://rms-api.thesama.in/api/wallpaper \
  -H "Content-Type: application/json" \
  -d "{\"wallpaper\": \"https://rms-api.thesama.in/wallpapers/afe_device_wallpapers-dark.jpg\"}"
```

**Step 3: Restart RMS clients**
- Clients will download and apply the wallpaper on next startup

---

### Option 2: Upload Your Own Wallpaper

**Step 1: Upload wallpaper**
```bash
curl -X POST https://rms-api.thesama.in/api/wallpapers/upload \
  -F "wallpaper=@C:\path\to\your\image.jpg"
```

Copy the URL from the response, then:

**Step 2: Set as active**
```bash
curl -X POST https://rms-api.thesama.in/api/wallpaper \
  -H "Content-Type: application/json" \
  -d "{\"wallpaper\": \"<PASTE_URL_HERE>\"}"
```

**Step 3: Restart RMS clients**

---

## What Changed?

✅ **Before**: Could only use external URLs (like Unsplash)  
✅ **After**: Can upload and host wallpapers on your own server

✅ **New Endpoints**:
- `POST /api/wallpapers/upload` - Upload wallpaper files
- `GET /api/wallpapers/list` - List available wallpapers
- `GET /wallpapers/<filename>` - Download wallpaper files

✅ **File Validation**: Only JPG, JPEG, PNG, WEBP (max 10MB)

---

## Need to Test?

After deploying the server, run these commands to verify:

```bash
# Test listing
curl https://rms-api.thesama.in/api/wallpapers/list

# Test setting wallpaper
curl -X POST https://rms-api.thesama.in/api/wallpaper \
  -H "Content-Type: application/json" \
  -d "{\"wallpaper\": \"https://rms-api.thesama.in/wallpapers/afe_device_wallpapers-dark.jpg\"}"

# Verify it's set
curl https://rms-api.thesama.in/api/wallpaper
```

That's it! 🎉
