# استقرار رایگان روی اینترنت

هدف: هر کسی بتونه از وب استفاده کنه و مثل اپ نصبش کنه، و داده‌ها در ابر
بمونن (نه فقط روی کامپیوتر تو). همه‌ی مرحله‌ها **رایگان** و **بدون کارت
بانکی**اند.

سه تکه داریم:

1. **دیتابیس** — Neon (Postgres رایگان و ماندگار)
2. **سرور** — Render (رده‌ی رایگان)
3. **وب** — Cloudflare Pages (رایگان) — قابل نصب به‌صورت PWA

> اپ بدون این‌ها هم کامل کار می‌کنه (آفلاین). این مرحله فقط سینک ابری و
> دسترسی عمومی رو اضافه می‌کنه.

---

## ۰) کد را روی GitHub بگذار

Render و Cloudflare از روی یک ریپوی Git مستقر می‌کنن. اگر هنوز Git نداری:

```powershell
cd "C:\Users\asus iran\Desktop\planner naz"
git init
git add .
git commit -m "planner"
```

بعد یک ریپوی خالی در GitHub بساز و:

```powershell
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

> فایل `server/db.json` و `node_modules` با `.gitignore` آپلود نمی‌شن — درست همینه.

---

## ۱) دیتابیس — Neon

1. برو به <https://neon.tech> و با گوگل/گیت‌هاب رایگان ثبت‌نام کن.
2. یک پروژه‌ی جدید بساز (منطقه‌ی نزدیک، مثلاً Europe).
3. از صفحه‌ی **Connection string**، رشته‌ی اتصال را کپی کن. چیزی شبیه:
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require
   ```
   این را برای مرحله‌ی بعد نگه دار.

> جدول‌ها را لازم نیست خودت بسازی؛ سرور موقع اولین اجرا خودکار می‌سازدشان.

---

## ۲) سرور — Render

1. برو به <https://render.com> و رایگان ثبت‌نام کن، GitHub را وصل کن.
2. **New + → Blueprint** را بزن و ریپو را انتخاب کن. Render فایل
   [render.yaml](render.yaml) را می‌خواند و سرویس `planner-sync` را می‌سازد.
   (اگر Blueprint نخواستی: **New + → Web Service**، ریپو را بده،
   `Root Directory = server`، `Build = npm install`، `Start = npm start`.)
3. در تب **Environment** سرویس:
   - `DATABASE_URL` = رشته‌ی اتصال Neon از مرحله‌ی ۱.
   - `JWT_SECRET` = اگر Blueprint استفاده کردی خودکار ساخته شده؛ وگرنه یک
     عبارت تصادفی بلند بگذار.
4. Deploy کن. وقتی سبز شد، آدرس سرویس را بردار، مثل:
   ```
   https://planner-sync.onrender.com
   ```
5. تست سلامت: این آدرس + `/api/health` را در مرورگر باز کن →
   باید `{"ok":true}` ببینی.

> **نکته‌ی رده‌ی رایگان Render:** بعد از ~۱۵ دقیقه بی‌فعالیتی سرور می‌خوابه و
> اولین درخواست بعدی ~۳۰–۵۰ ثانیه طول می‌کشه تا بیدار شه. اپ این را
> هوشمندانه تحمل می‌کنه: همه‌چیز آفلاین کار می‌کنه و سینک خودکار دوباره
> تلاش می‌کنه؛ چیزی خراب نمی‌شه.

---

## ۳) وب — Cloudflare Pages

1. برو به <https://pages.cloudflare.com> و رایگان ثبت‌نام کن.
2. **Create a project → Connect to Git** و ریپو را انتخاب کن.
3. تنظیمات build:
   - **Framework preset:** Vite (یا None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. در **Environment variables** اضافه کن:
   - `VITE_API_URL` = آدرس سرور Render از مرحله‌ی ۲
     (مثلاً `https://planner-sync.onrender.com`)
5. Deploy کن. یک آدرس مثل `https://verday.pages.dev` می‌گیری —
   همین لینک عمومیه که به هر کسی می‌دی.

> فایل [public/_redirects](public/_redirects) باعث می‌شه مسیرهای داخلی اپ
> (مثل `/goals`) درست باز شن. (برای Netlify همین فایل کافیه؛ برای Vercel،
> [vercel.json](vercel.json) هست.)

---

## ۴) نصب مثل اپ (PWA)

روی همان آدرس وب:

- **اندروید/سامسونگ (Chrome):** منو → «Add to Home screen / نصب برنامه».
- **آیفون (Safari):** دکمه‌ی Share → «Add to Home Screen».
- **دسکتاپ (Chrome/Edge):** آیکن نصب در نوار آدرس.

بعد از نصب، آیکن مستقل، تمام‌صفحه و آفلاین داری — مثل اپ واقعی.

---

## استفاده

کاربر اپ را باز می‌کنه → **تنظیمات → حساب کاربری** → حساب می‌سازد و وارد
می‌شود. از آن به بعد داده‌اش در ابر سینک می‌شود و روی هر دستگاهی که وارد شود
یکی است. بدون ورود هم اپ کامل و آفلاین کار می‌کند.

## به‌روزرسانی بعدی

هر بار به GitHub `push` کنی، Render و Cloudflare خودکار دوباره مستقر می‌کنن.

## نگهداری / پشتیبان داده

داده‌ها در Neon‌اند. در داشبورد Neon می‌تونی وضعیت دیتابیس را ببینی. هر
کاربر هم از داخل اپ (تنظیمات → پشتیبان‌گیری) می‌تونه فایل پشتیبان شخصی بگیره.
