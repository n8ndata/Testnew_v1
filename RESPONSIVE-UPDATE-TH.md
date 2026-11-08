# ROUTER Error Tracking — Responsive Update

ฉบับนี้ปรับ CSS สำหรับมือถือขนาดเล็ก, มือถือทั่วไป, แท็บเล็ต, โน้ตบุ๊ก, จอเดสก์ท็อป, แนวนอน, safe-area และอุปกรณ์สัมผัส โดยคง JavaScript และโครงสร้างข้อมูลเดิมไว้

## วิธีเปิด
1. แตก ZIP ทั้งหมด
2. เปิด `index.html` ผ่าน Chrome/Edge หรือแนะนำให้ใช้ VS Code + Live Server
3. หากนำขึ้น GitHub Pages ให้อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดใน ZIP ไม่ใช่อัปโหลดเฉพาะ index.html

## ขอบเขตการตรวจสอบ
การปรับนี้เป็นการเพิ่มกฎ CSS responsive ไม่ได้เปลี่ยนตรรกะการบันทึกข้อมูลหรือสิทธิ์ API และไม่ได้ยืนยันการทดสอบบนอุปกรณ์จริงทุกยี่ห้อ โปรดทดสอบบนหน้าจอ 320px, 375px, 768px, 1024px และ 1440px ก่อนเผยแพร่

## PWA ที่เพิ่มเข้ามา
- `manifest.json` + `icons/` สำหรับ Add to Home Screen บน Android/iOS/Desktop
- `js/pwa.js` แบนเนอร์ติดตั้งแอปและคำแนะนำสำหรับ iOS Safari
- `sw.js` (cache `router-app-shell-v4`) แคชหน้าเว็บ, manifest, ไอคอน, ฟอนต์ และ JS
- คู่มือละเอียดอยู่ที่ [PWA-RESPONSIVE-GUIDE-TH.md](PWA-RESPONSIVE-GUIDE-TH.md)

## ปรับกราฟประเภทข้อผิดพลาด
- กราฟ “5 อันดับประเภทข้อผิดพลาดสูงสุด” ย้ายชื่อหมวดจากแกนซ้ายมาแสดงเหนือแท่งกราฟแต่ละแท่ง
- ซ่อนแกน Y และเพิ่มระยะด้านบนของกราฟ (`layout.padding.top`) เพื่อไม่ให้ชื่อหมวดชนขอบ
- ลดความหนาแท่งเป็น `maxBarThickness: 24` พร้อมเว้นระยะระหว่างแท่ง (`categoryPercentage`, `barPercentage`) ให้ชื่ออ่านง่าย
- ชื่อที่ยาวเกินพื้นที่จะถูกตัดและเติม `…` อัตโนมัติ รองรับทั้งธีมสว่าง/มืดและจอมือถือ
- เพิ่ม fallback ด้วย `setTimeout` ในการวาดกราฟ กรณีแท็บถูกพักการทำงานและ `requestAnimationFrame` ไม่ทำงาน

## ทำความสะอาดไฟล์ (8 พฤศจิกายน 2026)
- ลบชุดซอร์สซ้ำที่ฝังใน `index.html` แล้ว: `css/`, `fonts/`, `fonts.css`, `js/api.js`, `js/store.js`, `js/charts.js`, `js/app.js`, `js/vendor/`
- ปรับ `sw.js` เป็น cache `router-app-shell-v5` และแคชเฉพาะไฟล์ที่ใช้จริง
- ไฟล์ที่ต้องอัปโหลดขึ้น hosting: `index.html`, `manifest.json`, `sw.js`, `js/pwa.js`, `icons/`

## Accessibility ที่ปรับเพิ่ม
- เพิ่มตัวแปร `--text-muted-strong` (#5b6b7f ในธีมสว่าง) ให้ข้อความสถานะซิงค์บนพื้น `--bg-subtle` มีคอนทราสต์ผ่าน WCAG AA 4.5:1
- ปรับ `aria-label` ของปุ่ม Admin ให้มีคำว่า "Admin" ตรงกับข้อความที่มองเห็น (แก้กฎ label-content-name-mismatch)
- ผลตรวจ Lighthouse ล่าสุด: Accessibility 100, Best Practices 100, SEO 100
