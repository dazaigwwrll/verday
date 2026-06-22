# استقرار رایگان روی اینترنت (Verday)

هدف: هر کسی بتونه از وب استفاده کنه و مثل اپ نصبش کنه، و داده‌ها در ابر
بمونن (نه فقط روی کامپیوتر تو). همه‌چیز **رایگان** و **بدون کارت بانکی**.

دو تکه داریم و هر دو روی **یک** پلتفرم میزبانی می‌شن:

1. **دیتابیس** — Neon (Postgres رایگان و ماندگار)
2. **وب + سرور** — Vercel (رایگان، بدون کارت). وب به‌صورت استاتیک سرو می‌شه و
   مسیرهای `/api/*` به‌صورت توابع serverless اجرا می‌شن — یک استقرار، بدون
   تنظیم آدرس جدا، بدون CORS.

> اپ بدون این‌ها هم کامل کار می‌کنه (آفلاین). این مرحله فقط سینک ابری و
> دسترسی عمومی رو اضافه می‌کنه.

---

## ۰) کد روی GitHub

ریپو: <https://github.com/dazaigwwrll/verday>. هر `git push` به‌طور خودکار
Vercel رو دوباره مستقر می‌کنه.

## ۱) دیتابیس — Neon

1. <https://neon.tech> → ثبت‌نام رایگان.
2. یک پروژه بساز (نام دلخواه، منطقه‌ی نزدیک).
3. رشته‌ی **Connection string** (pooled) را بردار. جدول‌ها خودکار موقع اولین
   اجرا ساخته می‌شن.

   با neonctl (اگر نصب باشد) می‌توان رشته را در کلیپ‌بورد گذاشت:
   ```powershell
   neonctl connection-string --project-id <PROJECT_ID> --database-name neondb --role-name neondb_owner --pooled | Set-Clipboard
   ```

## ۲) وب + سرور — Vercel

1. <https://vercel.com> → **Sign up with GitHub** (رایگان، بدون کارت).
2. **Add New… → Project** → ریپوی **verday** را Import کن.
3. تنظیمات build خودکار تشخیص داده می‌شن (Vite):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - (دست نزن، درست‌اند.)
4. بخش **Environment Variables** یکی اضافه کن:
   - `DATABASE_URL` = رشته‌ی اتصال Neon (pooled).
   - (`JWT_SECRET` لازم نیست؛ سرور خودش می‌سازد و در دیتابیس نگه می‌دارد.)
5. **Deploy**. وقتی تمام شد یک آدرس مثل `https://verday.vercel.app` می‌گیری —
   همین لینک عمومیه.
6. تست سلامت: آدرس + `/api/health` → باید `{"ok":true}` ببینی.

> مسیریابی در [vercel.json](vercel.json) تنظیم شده: `/api/*` به سرور می‌رود و
> بقیه‌ی مسیرها به اپ تک‌صفحه‌ای (SPA). تابع serverless از
> [api/index.js](api/index.js) همان اپ Express در [server/app.js](server/app.js)
> را اجرا می‌کند.

## ۳) نصب مثل اپ (PWA)

روی همان آدرس:
- **اندروید/سامسونگ (Chrome):** منو → «Add to Home screen / نصب».
- **آیفون (Safari):** Share → «Add to Home Screen».
- **دسکتاپ (Chrome/Edge):** آیکن نصب در نوار آدرس.

## استفاده

کاربر اپ را باز می‌کند → **تنظیمات → حساب کاربری** → حساب می‌سازد و وارد
می‌شود. از آن پس داده‌اش در ابر سینک می‌شود. بدون ورود هم اپ کامل و آفلاین
کار می‌کند.

## اجرای محلی سرور (اختیاری، برای توسعه)

```bash
cd server
npm install
npm start        # http://localhost:8787، با فایل db.json محلی
```
بدون `DATABASE_URL`، سرور از یک فایل `db.json` محلی استفاده می‌کند؛ با آن،
از Postgres.

## نکته‌ی جدا کردن میزبانی (اختیاری)

اگر خواستی وب و سرور را جدا میزبانی کنی، اپ را با `VITE_API_URL` برابر آدرس
سرور build کن:
```powershell
$env:VITE_API_URL="https://your-api.example.com"; npm run build
```
اگر تنظیم نشود، اپ در تولید از همان دامنه (same-origin) برای `/api` استفاده
می‌کند.
