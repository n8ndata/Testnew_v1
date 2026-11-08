# ROUTER Error Tracking — PWA & Responsive Guide (ฉบับภาษาไทย)

เอกสารนี้อธิบายสิ่งที่เพิ่มเข้ามาเพื่อทำให้แอป **ROUTER Error Tracking** เป็น
Progressive Web App (PWA) ที่ติดตั้งบนมือถือ/เดสก์ท็อปได้ และสรุปหลักการ
Responsive Design ที่ใช้อยู่จริงในโปรเจกต์นี้

> แอปหลักคือ `index.html` (standalone bundle) + `sw.js` + `manifest.json` + `icons/`
> หากต้องการให้ติดตั้งเป็น PWA และใช้งานออฟไลน์ได้ ต้องเสิร์ฟ **ทั้งโฟลเดอร์**
> ผ่าน `http://localhost` หรือ `https://` ไม่ใช่เปิดด้วย `file://`

---

## 1. สิ่งที่เพิ่มเข้ามา

| ไฟล์ | หน้าที่ |
|---|---|
| `manifest.json` | ข้อมูลแอปสำหรับ Add to Home Screen: ชื่อ, ไอคอน, สี, start URL, shortcuts |
| `icons/icon.svg` | ไอคอนหลักแบบ vector |
| `icons/icon-192.png` | ไอคอน Android/Chrome ขนาด 192×192 |
| `icons/icon-512.png` | ไอคอน Android/Chrome ขนาด 512×512 |
| `icons/icon-maskable-512.png` | ไอคอนแบบ maskable (ปลอดภัยเมื่อ OS ครอปเป็นวงกลม/สี่เหลี่ยมมน) |
| `icons/apple-touch-icon.png` | ไอคอน iOS ขนาด 180×180 |
| `icons/favicon-32.png` | Favicon ขนาด 32×32 |
| `js/pwa.js` | แบนเนอร์ติดตั้งแอป + คำแนะนำ Add to Home Screen บน iOS + ตรวจ standalone mode |
| `sw.js` | Service Worker แคช app shell, manifest, ไอคอน และไฟล์ JS/CSS/ฟอนต์ |
| `scripts/generate-icons.ps1` | สคริปต์สร้างไอคอน PNG ใหม่จาก Windows PowerShell |

### สิ่งที่แก้ใน `index.html`
- เพิ่ม `<link rel="manifest" href="manifest.json">`
- เพิ่ม `<link rel="apple-touch-icon" ...>` และ favicon แบบ PNG/SVG
- เพิ่ม `<meta name="application-name">`
- เพิ่ม `<script src="js/pwa.js" defer></script>` ก่อน `</body>`
- คง `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">`
  ไว้สำหรับ safe area ของ iPhone

### สิ่งที่แก้ใน `sw.js`
- อัปเดต cache เป็น `router-app-shell-v4`
- เพิ่ม manifest, ไอคอนทุกไฟล์ และ `js/pwa.js` เข้า app shell
- ยังคงเป็น **network-first** สำหรับหน้าเว็บ เพื่อให้ได้โค้ดใหม่ทันทีเมื่อออนไลน์
  และ fallback เป็น cache เมื่อออฟไลน์

---

## 2. วิธีรันโปรเจกต์

### 2.1 วิธีที่แนะนำ: ใช้ local web server

เปิด Terminal ที่โฟลเดอร์โปรเจกต์ (ที่มี `index.html`) แล้วเลือกวิธีใดวิธีหนึ่ง

**Node.js (ไม่ต้องติดตั้งอะไรเพิ่ม)**

```bash
npx serve . -l 8123
# เปิด http://localhost:8123
```

**Python 3**

```bash
python -m http.server 8123
# เปิด http://localhost:8123
```

**VS Code**

ติดตั้ง extension **Live Server** → คลิกขวาที่ `index.html` → **Open with Live Server**

> Service Worker ทำงานได้เฉพาะ `https://` หรือ `localhost`/`127.0.0.1`
> ถ้าเปิดด้วย `file://` แอปยังใช้งานพื้นฐานได้ แต่จะไม่มีการแคชออฟไลน์และติดตั้ง PWA ไม่ได้

### 2.2 ขึ้น Hosting จริง

อัปโหลด **ทุกไฟล์และโฟลเดอร์** ต่อไปนี้ขึ้นไปที่ root ของเว็บ:

```text
index.html
manifest.json
sw.js
js/pwa.js
icons/
```

ตัวอย่าง:

- **GitHub Pages** — วางไฟล์ที่ root ของ repo หรือ `/docs` แล้วเปิด Pages
- **Netlify / Vercel / Cloudflare Pages** — drag & drop ทั้งโฟลเดอร์
- **Web server ขององค์กร** — ต้องเป็น HTTPS และต้องให้ path ของ `manifest.json`, `sw.js` เข้าถึงได้

`manifest.json` ใช้ path แบบ relative (`./`) จึงรองรับการ host ใน subfolder เช่น
`https://example.com/router/` โดยไม่ต้องแก้ไข

---

## 3. การติดตั้งเป็นแอป (Add to Home Screen)

### Android — Chrome / Edge
1. เปิดเว็บผ่าน HTTPS
2. รอแบนเนอร์ **“ติดตั้งแอป ROUTER”** มุมล่าง หรือเปิดเมนู ⋮
3. เลือก **ติดตั้งแอป / Add to Home screen**
4. เปิดจากไอคอนบนหน้าจอโฮมได้เลย

### iPhone / iPad — Safari
1. เปิดเว็บด้วย **Safari** (ไม่ใช่ Chrome/Facebook in-app browser)
2. แตะปุ่ม **แชร์** (สี่เหลี่ยมมีลูกศรขึ้น)
3. เลือก **เพิ่มไปที่หน้าจอโฮม / Add to Home Screen**
4. ตั้งชื่อแล้วกด **เพิ่ม**

> iOS ไม่รองรับ `beforeinstallprompt` แอปจึงแสดงคำแนะนำเป็นข้อความแทน
> และต้องใช้ Safari เท่านั้นในการเพิ่มลงหน้าจอโฮม

### Windows / macOS — Chrome / Edge
1. เปิดเว็บผ่าน HTTPS หรือ localhost
2. คลิกไอคอนติดตั้งใน address bar หรือเมนู ⋮ → **Install ROUTER Errors**
3. แอปจะเปิดในหน้าต่าง standalone

### ตรวจสอบว่าแอปติดตั้งแล้ว
เปิด DevTools → **Application** → **Manifest**
- ต้องเห็นชื่อ, ไอคอน, `start_url`, `display: standalone`
- แท็บ **Service Workers** ต้องมีสถานะ **activated and is running**

หรือรันใน Console:

```js
window.RouterPWA.isStandalone(); // true เมื่อเปิดแบบ installed app
window.RouterPWA.canInstall();   // true เมื่อ Chrome/Edge พร้อมให้ติดตั้ง
```

---

## 4. ทดสอบ Offline Mode

1. เปิดแอปออนไลน์อย่างน้อย 1 ครั้ง เพื่อให้ Service Worker แคช app shell
2. เปิด DevTools → **Application** → **Service Workers** → ติ๊ก **Offline**
3. รีเฟรชหน้า → หน้าแอปต้องยังเปิดได้จาก cache
4. ทดลองบันทึกข้อมูล → ข้อมูลจะอยู่ใน `localStorage` และคิวซิงค์ในเครื่อง
5. กลับมาออนไลน์ → กด **ซิงค์** หรือรอระบบซิงค์อัตโนมัติ

> ข้อมูลจาก Google Sheets ต้องใช้อินเทอร์เน็ตในการซิงค์
> Offline Mode ของ PWA ครอบคลุม “หน้าเว็บ + ข้อมูลในเครื่อง + คิว” ไม่ใช่การเรียก API

---

## 5. Responsive Design ที่ใช้ในโปรเจกต์นี้

### 5.1 Breakpoints ที่ใช้จริง

| ช่วงหน้าจอ | ใช้ทำอะไร |
|---|---|
| `< 380px` | มือถือเล็กมาก (320–379px) ลดฟอนต์/ระยะ padding และย่อปุ่ม header |
| `≤ 639px` | Mobile-first: ฟอร์ม 1 คอลัมน์, การ์ด/metrics 1 คอลัมน์, ตารางเลื่อนในกรอบ |
| `640–899px` (`sm`) | ฟอร์มเริ่มเป็น 2 คอลัมน์, modal จัดกึ่งกลาง |
| `≤ 900px` | Tablet/โน้ตบุ๊กเล็ก: dashboard/metrics 2 คอลัมน์, กราฟ 1 คอลัมน์ |
| `≥ 768px` (`md`) | Tablet: การ์ด/metrics หลายคอลัมน์, ตารางกว้างขึ้น |
| `≥ 1024px` (`lg`) | Desktop: bottom nav เป็น floating dock, layout กว้างสูงสุด |
| `≥ 1440px` | จอใหญ่มาก: คุมความกว้างเนื้อหาและระยะห่างการ์ด |
| `max-height: 500px` + landscape | มือถือแนวนอน: ลด header/nav และให้ modal เลื่อนได้ |
| `hover: none` / `pointer: coarse` | อุปกรณ์สัมผัส: จัดการ touch-action และ overscroll ของตาราง |
| `prefers-reduced-motion` | ปิด animation สำหรับผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว |
| `print` | ซ่อน header/nav/pุ่ม เพื่อพิมพ์รายงาน |

### 5.2 ตัวอย่าง CSS Media Queries

**Mobile-first (แนะนำ)**

```css
/* พื้นฐาน: มือถือ 1 คอลัมน์ */
.form-grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet: 2 คอลัมน์ */
@media (min-width: 640px) {
  .form-grid-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 คอลัมน์ */
@media (min-width: 1024px) {
  .form-grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**ซ่อน/แสดงองค์ประกอบตามขนาดจอ**

```css
.hide-on-sm { display: none; }

@media (min-width: 640px) {
  .hide-on-sm { display: inline; }
}

@media (max-width: 639px) {
  .desktop-only { display: none; }
}
```

**Touch-friendly target (ขั้นต่ำ 44×44px)**

```css
button,
.nav-item,
.theme-toggle-btn,
.form-input,
.form-select {
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}
```

**Safe area สำหรับ iPhone notch / home indicator**

```css
.app-header {
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

**รูปภาพ/สื่อ Responsive**

```css
img,
video,
canvas,
svg {
  max-width: 100%;
  height: auto;
}
```

**ตารางกว้าง: ให้เลื่อนเฉพาะในกรอบ ไม่ทำให้ทั้งหน้าเลื่อน sideways**

```css
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  min-width: 760px; /* เฉพาะจอเล็ก */
}
```

**Dark Mode ตามระบบ (สำรอง)**

แอปนี้ใช้ `data-theme="light|dark"` จากปุ่มธีม (อัตโนมัติตามเวลา/สว่าง/มืด)
แต่สามารถเพิ่ม fallback ตามระบบได้ดังนี้:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-primary: #090d16;
    --bg-surface: #111827;
    --text-main: #f8fafc;
  }
}
```

### 5.3 Tailwind Breakpoints (ถ้าต้องการย้ายไป Tailwind)

| Tailwind | ความกว้าง | ใช้กับแอปนี้ |
|---|---|---|
| `sm:` | `≥ 640px` | ฟอร์ม 2 คอลัมน์, modal centered |
| `md:` | `≥ 768px` | การ์ด/metrics 4 คอลัมน์, ตารางกว้าง |
| `lg:` | `≥ 1024px` | bottom nav dock, layout เต็ม |
| `xl:` | `≥ 1280px` | container กว้างขึ้น (ถ้าเพิ่ม) |
| `2xl:` | `≥ 1536px` | จอใหญ่มาก (ถ้าเพิ่ม) |

ตัวอย่าง Tailwind:

```html
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <div class="min-h-11 rounded-xl bg-white p-4 dark:bg-slate-900">...</div>
</div>

<button class="min-h-11 min-w-11 touch-manipulation rounded-full px-4">
  บันทึก
</button>

<img class="h-auto max-w-full" src="..." alt="..." />
```

> `min-h-11` = 2.75rem = 44px, `min-w-11` = 44px

---

## 6. Checklist ทดสอบ Cross-Platform

### ขนาดจอที่ควรตรวจ
- [ ] 320px (iPhone SE รุ่นเก่า / จอเล็ก)
- [ ] 375px (iPhone 12/13/14)
- [ ] 390–430px (iPhone Pro Max / Android ใหญ่)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape / โน้ตบุ๊กเล็ก)
- [ ] 1280–1440px (เดสก์ท็อป)

### เบราว์เซอร์
- [ ] Chrome (Android + Desktop)
- [ ] Safari (iOS + macOS) — ตรวจ safe area, date input, standalone mode
- [ ] Firefox (Desktop)
- [ ] Edge (Windows)

### สิ่งที่ต้องเช็ก
- [ ] ไม่มี horizontal scroll ทั้งหน้า (เลื่อนได้เฉพาะตาราง)
- [ ] ปุ่มกดได้ง่าย ≥ 44×44px และไม่ชิดกันเกินไป
- [ ] ฟอร์มใช้งานด้วยคีย์บอร์ดได้ (Tab, Enter, Esc)
- [ ] Modal เปิด/ปิดได้ และโฟกัสไม่หลุด
- [ ] Dark/Light theme อ่านง่ายทั้งสองโหมด
- [ ] รูป/ไอคอนไม่ยืด/ไม่แตก
- [ ] Safe area บน iPhone ไม่ทับ notch หรือ home indicator
- [ ] PWA ติดตั้งได้ และเปิดแบบ standalone
- [ ] Offline แล้วรีเฟรชหน้าได้
- [ ] Landscape บนมือถือไม่ทำให้ layout พัง

### เครื่องมือ
- Chrome DevTools → **Toggle device toolbar** (Ctrl+Shift+M)
- Lighthouse → หมวด **Progressive Web App**
- DevTools → **Application** → Manifest / Service Workers / Cache Storage
- Safari บน Mac → Develop → Responsive Design Mode (ทดสอบ iOS)
- ทดสอบเครื่องจริงอย่างน้อย 1 เครื่อง โดยเฉพาะ iPhone

---

## 7. Troubleshooting

### ติดตั้ง PWA ไม่ได้
- ต้องเปิดผ่าน `https://` หรือ `localhost` เท่านั้น
- ต้องมี `manifest.json`, ไอคอน 192/512 และ Service Worker ที่ activated
- ตรวจว่า `start_url` และ `scope` ตรงกับ path ที่ host
- Chrome อาจต้องรีเฟรช 1–2 ครั้งหลังแก้ manifest

### Service Worker ยังใช้โค้ดเก่า
- DevTools → Application → Service Workers → **Update** หรือ **Unregister**
- ติ๊ก **Update on reload**
- เปลี่ยน `CACHE_NAME` ใน `sw.js` แล้ว reload
- ปิดแท็บอื่นที่เปิดแอปอยู่ (Service Worker ทำงานร่วมกันทุกแท็บ)

### เปิดจาก `file://` แล้ว PWA ไม่ทำงาน
เป็นข้อจำกัดของเบราว์เซอร์ ไม่ใช่บั๊กของแอป ให้ใช้ local server ตามข้อ 2.1

### iOS ไม่ขึ้นแบนเนอร์ติดตั้ง
- ต้องใช้ Safari และเปิดผ่าน HTTPS
- ตรวจว่าไม่ได้เปิดแบบ standalone อยู่แล้ว
- ถ้าเคยกดปิด จะไม่แสดงซ้ำภายใน 14 วัน (ล้าง key `router_pwa_install_dismissed_at` ใน localStorage)

### ไอคอนไม่ขึ้น / manifest แจ้งเตือน
- ตรวจ path ใน `manifest.json` ว่าตรงกับโฟลเดอร์ `icons/`
- ตรวจว่าไฟล์ PNG เปิดได้และมีขนาดตรงตามที่ระบุ
- ถ้าแก้ไอคอน ให้ bump `CACHE_NAME` ใน `sw.js`

### สร้างไอคอนใหม่
แก้สี/รูปใน `scripts/generate-icons.ps1` แล้วรัน:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```

---

## 8. ข้อจำกัดที่ควรทราบ

- **iOS** ไม่มี `beforeinstallprompt` และต้องติดตั้งผ่าน Safari เท่านั้น
- **Firefox Desktop** ไม่รองรับการติดตั้ง PWA แบบ Chrome/Edge (ยังใช้เว็บปกติได้)
- **Offline** ครอบคลุมเฉพาะหน้าเว็บและข้อมูลในเครื่อง ไม่รวมการเรียก Google Apps Script
- **PIN Admin** เป็นการป้องกันฝั่ง client ไม่ใช่ authentication ระดับองค์กร
  ควรเพิ่มการยืนยันตัวตนฝั่ง backend ก่อนใช้กับข้อมูลสำคัญ
- `index.html` เป็น standalone bundle ขนาดใหญ่ (ฝังฟอนต์/Chart.js/CSS/JS)
  ให้แก้สคริปต์หรือ CSS ภายใน `index.html` โดยตรง (ไม่มีชุดซอร์สแยกไฟล์แล้ว)
  และควรสำรองไฟล์ก่อนแก้ทุกครั้ง

---

## 9. อ้างอิง

- [MDN — Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev — Installability](https://web.dev/install-criteria/)
- [Apple — Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
