# Couple Illustrations Folder

## 📍 You Are Here
**Folder Path:** `/home/user/Lovebirdsrelationshipgameui/src/assets/illustrations/`

## 🖼️ Save Your 3 Couple Images Here

Save your three uploaded couple illustrations in this folder with these exact names:

1. **couple-lesbian.png** - Two women couple illustration (first image you uploaded)
2. **couple-hetero.png** - Heterosexual couple illustration (second image)
3. **couple-gay.png** - Two men couple illustration (third image)

## 📋 File Requirements

- **Format**: PNG (preferred) or JPG
- **Recommended size**: 800x800px or 1024x1024px
- **Quality**: High quality for retina displays

## 💡 How to Save Files Here

### If working locally:
```bash
# Copy your images to this folder
cp /path/to/your/first-image.png couple-lesbian.png
cp /path/to/your/second-image.png couple-hetero.png
cp /path/to/your/third-image.png couple-gay.png
```

### If using the web interface:
1. Upload the files to this directory through your file manager
2. Rename them to match the names above

## ✅ Once Saved

After saving your images here, you can import them in any component like this:

```tsx
import coupleLesbian from '../../assets/illustrations/couple-lesbian.png';
import coupleHetero from '../../assets/illustrations/couple-hetero.png';
import coupleGay from '../../assets/illustrations/couple-gay.png';

// Then use in your JSX:
<img src={coupleLesbian} alt="Couple" className="w-48 h-48" />
```

---

**Note**: This folder was created for you. Just save your three couple illustration images here!
