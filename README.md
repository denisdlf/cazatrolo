# 📸 CAZATROLO

Juego para un grupo cerrado de amigos: ves a alguien del grupo, le sacas una foto y sumas puntos. Quien junta más puntos en el mes gana el premio.

- **App web instalable (PWA)**: se abre desde el navegador y se puede "Agregar a pantalla de inicio".
- **APK de Android**: la misma app, instalable directo (sin Play Store).
- **Costo: $0** (Supabase Free + Vercel Hobby + GitHub Actions).

**Enlaces del grupo**
- Web (iPhone o cualquier navegador): **https://cazatrolo.vercel.app**
- Repositorio: https://github.com/denisdlf/cazatrolo
- APKs compilados: https://github.com/denisdlf/cazatrolo/actions/workflows/apk.yml

> No necesitas saber programar para seguir esta guía. Haz los pasos **en orden**. Cada paso termina con un "✅ Comprueba que…".

---

## Índice

1. [Qué hay en este proyecto](#1-qué-hay-en-este-proyecto)
2. [Paso 1 · Supabase (base de datos y fotos)](#paso-1--supabase-base-de-datos-y-fotos)
3. [Paso 2 · Subir el código a GitHub](#paso-2--subir-el-código-a-github)
4. [Paso 3 · Publicar la web en Vercel](#paso-3--publicar-la-web-en-vercel)
5. [Paso 4 · Generar el APK](#paso-4--generar-el-apk-de-android)
6. [Paso 5 · Instalar en el teléfono de cada amigo](#paso-5--instalar-en-el-teléfono-de-cada-amigo)
7. [Cómo actualizar cuando haya cambios](#cómo-actualizar-cuando-haya-cambios)
8. [Espacio gratuito: cuánto alcanza](#espacio-gratuito-cuánto-alcanza)
9. [Reglas implementadas y supuestos](#reglas-implementadas-y-supuestos)
10. [Para desarrolladores](#para-desarrolladores)

---

## 1. Qué hay en este proyecto

| Carpeta / archivo | Qué es |
|---|---|
| `supabase/schema.sql` | **Toda** la base de datos: tablas, seguridad, puntaje, regla de 1 hora, impugnaciones, cierre de mes. Se pega una vez en Supabase. |
| `supabase/tests/` | Pruebas automáticas de la base de datos. |
| `src/` | La app (pantallas, cámara, marco arcoíris, compartir). |
| `android/` | Proyecto de Android (Capacitor) para generar el APK. |
| `.github/workflows/` | "Robots" de GitHub que compilan el APK gratis. |

**Cómo funciona la seguridad, en simple:** el teléfono nunca toca las tablas directamente. Todo pasa por funciones del servidor que revisan quién eres, ponen la **hora del servidor** y **calculan los puntos**. Así nadie puede inventarse puntos ni cambiar la hora del teléfono para hacer trampa.

---

## Paso 1 · Supabase (base de datos y fotos)

### 1.1 Crear la cuenta y el proyecto
1. Entra a **https://supabase.com** → **Start your project** → regístrate (puedes usar tu cuenta de GitHub).
2. Botón **New project**:
   - **Name:** `cazatrolo`
   - **Database Password:** inventa una y guárdala (casi no la usarás).
   - **Region:** elige **South America (São Paulo)** — es la más cercana a Chile.
   - Plan: **Free**.
3. Espera ~2 minutos a que termine de crearse.

### 1.2 Crear la base de datos
1. En el menú izquierdo: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** el contenido y pégalo.
3. Aprieta **Run** (abajo a la derecha).
4. ✅ Comprueba que dice **"Success. No rows returned"**. (Si lo vuelves a ejecutar más adelante no se borra nada.)

### 1.3 Activar el inicio de sesión anónimo
Cada teléfono recibe una "sesión anónima" invisible; el PIN es lo que la une a tu nombre.
1. Menú izquierdo: **Authentication** → **Sign In / Providers** (o **Providers**, según la versión).
2. Activa **"Allow anonymous sign-ins"** y guarda (**Save changes**).
3. ✅ Comprueba que el interruptor quedó en verde.

### 1.4 Copiar las dos claves
1. Menú: **Project Settings** (engranaje) → **API** (o **Data API** / **API Keys**).
2. Copia en un bloc de notas:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - **anon public key** (o **Publishable key**) → un texto largo que empieza con `eyJ…` o `sb_publishable_…`
3. ⚠️ **No** copies la `service_role` / `secret` key. Esa nunca va en la app.

> Estas dos claves son "públicas": está bien que vayan dentro de la app. La seguridad la dan las funciones del servidor.

### 1.5 (Opcional) Cierre automático de mes con reloj
No hace falta: el mes se archiva solo la primera vez que alguien abre la app después del cierre. Si igual quieres que se cierre aunque nadie la abra, en **SQL Editor** ejecuta:
```sql
create extension if not exists pg_cron;
select cron.schedule('cerrar-periodos', '15 * * * *', 'select public.cerrar_periodos()');
```

---

## Paso 2 · Subir el código a GitHub

GitHub guarda el código y compila el APK gratis.

1. Crea una cuenta en **https://github.com** si no tienes.
2. Arriba a la derecha **+** → **New repository**:
   - **Name:** `cazatrolo`
   - Marca **Private** (privado).
   - **No** marques "Add a README".
   - **Create repository**.
3. Sube el código. La forma más fácil: pídeme (a Claude) que lo suba por ti dándome el nombre del repositorio, o usa **GitHub Desktop** (https://desktop.github.com): *File → Add local repository* → elige la carpeta `cazatrolo` → *Publish repository*.
4. ✅ Comprueba que en github.com/TU_USUARIO/cazatrolo ves las carpetas `src`, `supabase`, `android`.

### 2.1 Guardar las claves como "secretos" en GitHub
En tu repositorio: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crea estos tres:

| Nombre (exacto) | Valor |
|---|---|
| `VITE_SUPABASE_URL` | La Project URL del paso 1.4 |
| `VITE_SUPABASE_ANON_KEY` | La anon/publishable key del paso 1.4 |
| `CAZATROLO_KEYSTORE_PASSWORD` | Inventa una clave (mín. 6 caracteres) y **guárdala**. Es para firmar el APK. |

---

## Paso 3 · Publicar la web en Vercel

1. Entra a **https://vercel.com** → **Sign Up** → **Continue with GitHub** → plan **Hobby** (gratis).
2. **Add New… → Project** → busca `cazatrolo` → **Import**.
3. Vercel detecta "Vite" solo. Abre **Environment Variables** y agrega:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
4. **Deploy**. En ~1 minuto queda publicada. Si el proyecto aparece con "No Production Domain", toca **Add Domain** y escribe una dirección gratuita terminada en `.vercel.app` (la nuestra es `https://cazatrolo.vercel.app`).
5. ✅ Comprueba: abre esa dirección en el celular. Debe aparecer **"👑 Configurar el grupo"**.

### 3.1 Configurar el grupo (solo tú, una vez)
1. En esa pantalla escribe el **código del grupo** (ej. `TROLOS2026`), tu nombre, tu ciudad y tu PIN. Quedas como **administrador**.
2. Ve a **Perfil → 👑 Panel de administración → Integrantes** y agrega los otros 10 nombres.
3. Define el **premio del mes**.
4. ✅ Comprueba: abre la web en otro teléfono (o en modo incógnito), pon el código, elige un nombre "(nuevo)", crea PIN y ciudad → entra al inicio.

> **Hazlo rápido después de publicar**: la pantalla de configuración solo funciona una vez, para quien llegue primero.

**Instalar la web como app (sin APK):** en Chrome Android abre la dirección → menú ⋮ → **Agregar a pantalla de inicio / Instalar app**. En iPhone: Safari → Compartir → **Agregar a inicio**.

---

## Paso 4 · Generar el APK de Android

Lo compila GitHub en sus servidores; no tienes que instalar nada.

### 4.1 Crear la llave de firma (UNA sola vez)
La llave asegura que cada APK nuevo se instale **encima** del anterior sin perder la sesión. Si la pierdes, todos tendrán que desinstalar y reinstalar.

1. En tu repositorio: pestaña **Actions** (si pregunta, aprieta "I understand my workflows, go ahead and enable them").
2. A la izquierda: **Crear llave de firma (una vez)** → **Run workflow** → **Run workflow**.
3. Espera el ✅ verde (~1 min), entra a la ejecución y abajo en **Artifacts** descarga `llave-cazatrolo-GUARDAR-Y-BORRAR`.
4. Descomprime el zip. Contiene:
   - `cazatrolo.keystore` → **guárdalo** en un lugar seguro (Drive personal, por ejemplo), junto con la clave.
   - `PEGAR-EN-CAZATROLO_KEYSTORE_BASE64.txt` → ábrelo con el Bloc de notas y copia todo el texto.
5. Crea un nuevo secreto en GitHub (como en el paso 2.1): nombre `CAZATROLO_KEYSTORE_BASE64`, valor = el texto copiado.

### 4.2 Compilar el APK
1. **Actions** → **Compilar APK** → **Run workflow** → **Run workflow**.
2. Espera ~5 minutos al ✅ verde. (Si sale ❌, abre la ejecución: el mensaje en rojo dice qué secreto falta.)
3. Entra a la ejecución → **Artifacts** → descarga `CAZATROLO-vN` (zip) → adentro está `CAZATROLO-vN.apk`.

---

## Paso 5 · Instalar en el teléfono de cada amigo

1. Manda el archivo `.apk` por **WhatsApp** (adjuntar → **Documento**, no como foto) o súbelo a **Google Drive** y comparte el link.
2. Cada amigo lo abre en su Android. La primera vez, Android pedirá permiso:
   **"Por seguridad, tu teléfono no permite instalar apps desconocidas"** → **Configuración** → activa **Permitir de esta fuente** (para WhatsApp, Drive o Archivos) → vuelve → **Instalar**.
3. Si aparece **Google Play Protect** ("App no reconocida"), toca **Más detalles → Instalar de todas formas**. Es normal en apps que no vienen de la Play Store.
4. Al abrir: código del grupo → elegir su nombre → crear PIN → ciudad. Cuando pida **permiso de cámara**, aceptar.

**Mensaje listo para mandar al grupo:**
```
📸 ¡Llegó CAZATROLO!
1) Descarga el APK adjunto y ábrelo (si pide permiso para instalar apps desconocidas, acéptalo).
2) Código del grupo: XXXXX
3) Elige tu nombre, crea tu PIN de 4 números y pon tu ciudad.
🍎 ¿iPhone? Abre https://cazatrolo.vercel.app en Safari → botón Compartir → "Agregar a inicio".
Las reglas están en el botón ❓ de la app. ¡A cazar!
```

---

## Cómo actualizar cuando haya cambios

| Qué cambió | Qué hacer |
|---|---|
| Código de la app (`src/…`) | Súbelo a GitHub. **Vercel se actualiza solo** en ~1 min. Para el APK: **Actions → Compilar APK → Run workflow**, y manda el nuevo `.apk`. Se instala encima, sin perder nada. |
| Base de datos (`supabase/schema.sql`) | Copia y pega el archivo completo de nuevo en **SQL Editor → Run**. No borra datos. |
| Premio, nombres, PINs, ciudades | Desde la app: **Perfil → 👑 Panel de administración**. No requiere APK nuevo. |

> Tip: la versión web siempre está al día. Si alguien no actualizó el APK, igual puede usar la web.

---

## Espacio gratuito: cuánto alcanza

**Límites del plan Free de Supabase** (según fuentes recientes; confírmalos en https://supabase.com/pricing porque cambian):
- Base de datos: **500 MB** · Almacenamiento de archivos: **1 GB** · Transferencia (egress): **5 GB/mes** · 50.000 usuarios/mes · **2 proyectos** gratis.
- ⚠️ **El proyecto se pausa si pasa ~7 días sin uso.** Con un juego activo no debería pasar; si pasa, entras a supabase.com y aprietas **Restore** (no se pierden datos).

**Lo que ocupa cada caza:** la app comprime la foto a 1280 px / JPEG 80 % (≈ **200–300 KB**) + una miniatura de 400 px (≈ **30 KB**) para la galería. Total ≈ **0,25 MB por caza**. La base de datos usa menos de 1 KB por caza (despreciable).

| Ritmo del grupo | Fotos al mes | Espacio al mes | El 1 GB alcanza para… |
|---|---|---|---|
| Tranquilo (3 cazas/día entre todos) | ~90 | ~23 MB | **~3,5 años** |
| Normal (8 cazas/día) | ~240 | ~60 MB | **~16 meses** |
| Intenso (20 cazas/día) | ~600 | ~150 MB | **~6–7 meses** |

**Transferencia (5 GB/mes):** la galería muestra solo miniaturas (30 KB). 11 personas mirando 50 miniaturas y 10 fotos completas al día ≈ 11 × (1,5 + 2,5 MB) × 30 ≈ **1,3 GB/mes**. Holgado.

**Para ver el uso real:** Supabase → **Project Settings → Usage** (o **Organization → Usage**).

**Cuando se esté llenando** (sin pagar): en Supabase → **Storage → cazas** borra carpetas/fotos de meses viejos (los rankings e historial se conservan; solo se pierde la imagen), o descárgalas antes a tu computador.

---

## Reglas implementadas y supuestos

Todo esto está en `supabase/schema.sql` y tiene pruebas automáticas. Los marcados **[SUPUESTO]** son decisiones mías donde el enunciado no decía nada; se pueden cambiar.

- **Acceso:** código de grupo → elegir nombre → PIN de 4 dígitos (creado la primera vez, guardado cifrado). 5 PIN incorrectos seguidos = bloqueo de 10 min **[SUPUESTO]**.
- **Foráneo:** ciudad distinta de "Concepción" (sin importar mayúsculas ni tildes: "concepcion" cuenta como local). Se guarda si era foráneo **al momento de la caza**, así cambiar la ciudad después no altera puntos pasados **[SUPUESTO]**.
- **Puntaje:** 1 pt local, 2 pts foráneo, ×1,5 si hay 2 o más cazados que suman. Lo calcula el servidor.
- **Espera de 1 hora:** por par cazador→cazado. En foto grupal, los que están en espera salen en la foto pero no suman **ni cuentan para el ×1,5** **[SUPUESTO]**. Si todos están en espera, la caza se rechaza. Una caza anulada no genera espera **[SUPUESTO]**.
- **Cámara:** solo cámara en vivo dentro de la app (trasera o frontal); no hay botón de galería. Las fotos se guardan en la carpeta de cada cazador, que solo él puede escribir.
- **Impugnación:** cualquiera de los cazados, dentro de 24 h. Se impugna la **caza completa** **[SUPUESTO]**. Votan todos menos cazador y **todos** los cazados de esa foto **[SUPUESTO]**. Se puede cambiar el voto mientras está abierta. Más "inválida" que "válida" = anulada; empate o sin votos = válida.
- **Fin de mes:** hora de Chile (America/Santiago, con horario de verano). El mes se **archiva cuando ya no queda nada impugnable** (máximo 48 h después del cierre); mientras tanto el inicio muestra "resultados por confirmar". Se archiva ranking, ganador (solo 1° lugar; en empate gana quien tiene más cazas, y luego orden alfabético **[SUPUESTO]**) y el premio vigente.
- **Admin:** agregar/quitar integrantes (quitar conserva sus cazas pasadas), resetear PIN (cierra su sesión), editar ciudad, premio, anular/restaurar cazas, cambiar código del grupo.
- **Limitación conocida:** "no subir desde la galería" se impide en la app, pero alguien muy experto podría saltárselo programando. Para un grupo de amigos es más que suficiente.

---

## Para desarrolladores

```bash
npm install
```
```bash
cp .env.example .env   # y pega URL + anon key
```
```bash
npm run dev            # servidor local en http://localhost:5173
```
```bash
npm test               # pruebas del puntaje y fechas (Vitest)
```
```bash
npm run test:sql       # pruebas de la base de datos (requiere PostgreSQL 16 local)
```
```bash
npm run iconos         # regenera íconos y splash desde public/favicon.svg (requiere Playwright)
```

**APK local (con Android Studio instalado):** `npm run android:sync` y luego abre la carpeta `android/` en Android Studio → *Build → Build APK(s)*. Para firmarlo con la llave del grupo define `CAZATROLO_KEYSTORE` (ruta al `.keystore`) y `CAZATROLO_KEYSTORE_PASSWORD` antes de `cd android && ./gradlew assembleRelease`.

**Stack:** React 19 + Vite + TypeScript · vite-plugin-pwa · Supabase (Postgres, Auth anónima, Storage privado, funciones RPC `security definer`) · Capacitor 8 (Share, Filesystem, SplashScreen, App).
