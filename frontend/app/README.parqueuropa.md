# Parque Europa – Paquete de frontend (tenant)

Este paquete incluye **favicon**, **icono de app**, **splash**, **hero del home**, **tema** y **manifiesto de imágenes** para el slider de cada monumento.

## Estructura
```
assets/
  icons/
    adaptive-icon-background.png
    adaptive-icon-foreground.png
    favicon.png
    icon-1024.png
    splash-2048.png
  home/
    home-hero-1920x1080.jpg
  monuments/
    <se crearán subcarpetas por monumento al descargar>
config/
  slider.manifest.json
  theme.parqueuropa.ts
  tenant.parqueuropa.json
scripts/
  fetch-images.js
  fetch-images.ps1
LICENSES.md
README.md
```

## Integración rápida (Expo/React Native)
1. Copia el contenido del paquete en `frontend/app/` o donde gestiones los assets.
2. En `app.json` de Expo:
```json
{
  "expo": {
    "name": "Guía Parque Europa",
    "icon": "./assets/icons/icon-1024.png",
    "splash": {"image": "./assets/icons/splash-2048.png", "resizeMode": "contain", "backgroundColor": "#003399"},
    "android": {"adaptiveIcon": {"foregroundImage": "./assets/icons/adaptive-icon-foreground.png", "backgroundImage": "./assets/icons/adaptive-icon-background.png"}},
    "web": {"favicon": "./assets/icons/favicon.png"}
  }
}
```
3. Importa el tema:
```ts
import theme from "./config/theme.parqueuropa";
```
4. Descarga las imágenes del slider (ver abajo).

## Descarga de imágenes (Wikimedia Commons)
- Ejecuta **uno** de los scripts en `scripts/` para descargar las imágenes referenciadas en `config/slider.manifest.json`:
  - `node scripts/fetch-images.js`
  - `pwsh scripts/fetch-images.ps1`
- Las imágenes se guardarán en `assets/monuments/<slug>/` y se generará `assets/ATTRIBUTIONS.json` con los créditos y licencias.

> **Nota:** Por defecto **La Sirenita (Copenhague)** no se descarga por restricciones de copyright vigentes en Dinamarca hasta 2030. Puedes habilitarla con `--include-risky` bajo tu responsabilidad.

## Slider (ejemplo de uso)
```tsx
import { Image } from "expo-image";
import React from "react";
import { Dimensions, FlatList, View } from "react-native";
const { width } = Dimensions.get("window");

export default function ResultScreenSlider({ slug }: { slug: string }) {
  const items = (require("../assets/ATTRIBUTIONS.json"))[slug] ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.filename}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={{ width }}>
          <Image source={{ uri: item.localPath ?? item.url }} style={{ width: "100%", height: 280 }} contentFit="cover" />
        </View>
      )}
    />
  );
}
```
