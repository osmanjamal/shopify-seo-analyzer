# محلل SEO لمتاجر Shopify 🚀

## نظرة عامة

محلل SEO لمتاجر Shopify هو منصة متكاملة لتحليل وتحسين محركات البحث (SEO) مصممة خصيصاً لمتاجر Shopify. يوفر النظام أدوات احترافية لتتبع الكلمات المفتاحية، تحليل المنافسين، مراقبة الأداء التقني، وتحسين ترتيب المتجر في نتائج البحث.

## المحتويات

- [الميزات الرئيسية](#الميزات-الرئيسية)
- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [التثبيت والإعداد](#التثبيت-والإعداد)
- [البنية العامة للمشروع](#البنية-العامة-للمشروع)
- [آلية العمل التفصيلية](#آلية-العمل-التفصيلية)
- [واجهات برمجة التطبيقات (APIs)](#واجهات-برمجة-التطبيقات-apis)
- [قاعدة البيانات](#قاعدة-البيانات)
- [الأمان والحماية](#الأمان-والحماية)
- [النشر والتشغيل](#النشر-والتشغيل)
- [استكشاف الأخطاء](#استكشاف-الأخطاء)

## الميزات الرئيسية

### 1. تحليل SEO الشامل
- **تحليل تقني متقدم**: فحص سرعة الموقع، البنية، وقابلية الزحف
- **تحليل المحتوى**: فحص العناوين، الوصف، والكلمات المفتاحية
- **تحليل الروابط**: مراقبة الروابط الداخلية والخارجية

### 2. تتبع الكلمات المفتاحية
- تتبع ترتيب الكلمات في محركات البحث
- تحليل حجم البحث والمنافسة
- اقتراحات كلمات مفتاحية جديدة

### 3. تكامل مع خدمات Google
- **Google Analytics**: استيراد بيانات الزيارات والتحويلات
- **Google Search Console**: مراقبة الأداء في نتائج البحث
- **PageSpeed Insights**: تحليل سرعة الصفحات

### 4. تحليل المنافسين
- مقارنة الأداء مع المنافسين
- تتبع كلماتهم المفتاحية
- تحليل استراتيجياتهم

### 5. التقارير والتنبيهات
- تقارير أسبوعية/شهرية تلقائية
- تنبيهات فورية عند حدوث تغييرات مهمة
- لوحة تحكم تفاعلية

## المتطلبات الأساسية

### متطلبات النظام
- **Node.js**: الإصدار 18.0.0 أو أحدث
- **PostgreSQL**: الإصدار 14 أو أحدث
- **Redis**: الإصدار 6 أو أحدث
- **ذاكرة RAM**: 4GB كحد أدنى (8GB موصى به)
- **مساحة القرص**: 20GB كحد أدنى

### متطلبات الخدمات الخارجية
- حساب مطور Shopify
- حساب Google Cloud Platform مع تفعيل:
  - Google Analytics Data API
  - Google Search Console API
  - PageSpeed Insights API
- مفاتيح API للخدمات المستخدمة

## التثبيت والإعداد

### 1. استنساخ المشروع

```bash
# استنساخ المشروع من GitHub
git clone https://github.com/yourusername/shopify-seo-analyzer.git
cd shopify-seo-analyzer

# تثبيت التبعيات
npm install
```

### 2. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة بيانات PostgreSQL
createdb shopify_seo_analyzer

# تشغيل migrations
npm run migrate

# تعبئة البيانات الأولية (اختياري)
npm run seed
```

### 3. إعداد ملف البيئة

```bash
# نسخ ملف المثال
cp .env.example .env

# تحرير الملف وإضافة المتغيرات المطلوبة
nano .env
```

محتوى ملف `.env`:

```env
# إعدادات التطبيق
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# قاعدة البيانات
DATABASE_URL=postgresql://username:password@localhost:5432/shopify_seo_analyzer

# Redis
REDIS_URL=redis://localhost:6379

# الأمان
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Shopify API
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=read_products,read_analytics,read_content

# Google APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# البريد الإلكتروني
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. تشغيل التطبيق

```bash
# وضع التطوير (مع إعادة التشغيل التلقائي)
npm run start:dev

# وضع الإنتاج
npm run build
npm run start:prod
```

## البنية العامة للمشروع

```
shopify-seo-analyzer/
├── backend/                 # الخادم الخلفي (Node.js/Express)
│   ├── src/
│   │   ├── controllers/    # متحكمات API
│   │   ├── models/        # نماذج قاعدة البيانات (Sequelize)
│   │   ├── routes/        # مسارات API
│   │   ├── services/      # منطق الأعمال والخدمات
│   │   ├── middleware/    # وسطاء Express
│   │   ├── utils/         # أدوات مساعدة
│   │   └── jobs/          # المهام المجدولة والخلفية
│   └── server.js          # نقطة دخول الخادم
│
├── frontend/               # واجهة المستخدم (React)
│   ├── public/            # الملفات الثابتة
│   ├── src/
│   │   ├── components/    # مكونات React
│   │   ├── pages/        # صفحات التطبيق
│   │   ├── services/     # خدمات API
│   │   ├── hooks/        # React hooks مخصصة
│   │   └── utils/        # أدوات مساعدة
│   └── package.json
│
├── scripts/               # سكريبتات النظام
│   ├── setup.sh          # إعداد البيئة
│   ├── backup.sh         # النسخ الاحتياطي
│   └── deploy.sh         # النشر التلقائي
│
├── docs/                  # التوثيق
├── tests/                # الاختبارات
└── docker-compose.yml    # إعداد Docker
```

## آلية العمل التفصيلية

### 1. دورة حياة الطلب (Request Lifecycle)

```
المستخدم → متصفح → React Frontend → API Request → Express Server
                                                          ↓
قاعدة البيانات ← معالج الطلب ← وسطاء المصادقة ← مسار API
     ↓
استجابة JSON → React Frontend → تحديث الواجهة → المستخدم
```

### 2. نظام المصادقة

يستخدم التطبيق نظام JWT (JSON Web Tokens) للمصادقة:

1. **تسجيل الدخول**:
   - يرسل المستخدم بيانات الدخول
   - يتحقق الخادم من البيانات
   - يُنشئ JWT token صالح لمدة 24 ساعة
   - يُنشئ refresh token صالح لمدة 30 يوم

2. **المصادقة**:
   - يُرسل Token مع كل طلب في الـ Header
   - يتحقق الخادم من صحة التوكن
   - يُجدد التوكن تلقائياً عند الحاجة

### 3. جمع وتحليل البيانات

#### أ. جمع بيانات Shopify

```javascript
// مثال على جمع بيانات المنتجات
async function syncShopifyProducts(shop, accessToken) {
  // الاتصال بـ Shopify API
  const products = await shopify.product.list({
    limit: 250,
    fields: 'id,title,handle,body_html,images,tags'
  });
  
  // تحليل SEO لكل منتج
  for (const product of products) {
    const seoAnalysis = await analyzeProductSEO(product);
    await saveAnalysis(seoAnalysis);
  }
}
```

#### ب. جمع بيانات Google

```javascript
// مثال على جمع بيانات من Search Console
async function fetchSearchConsoleData(siteUrl, dateRange) {
  const searchConsole = await googleAuth.getSearchConsoleClient();
  
  const response = await searchConsole.searchanalytics.query({
    siteUrl,
    startDate: dateRange.start,
    endDate: dateRange.end,
    dimensions: ['query', 'page'],
    metrics: ['clicks', 'impressions', 'ctr', 'position']
  });
  
  return processSearchData(response.data);
}
```

### 4. المهام المجدولة

يستخدم النظام `node-cron` لجدولة المهام:

```javascript
// تحديث الترتيب يومياً
cron.schedule('0 3 * * *', async () => {
  await updateKeywordRankings();
});

// تحليل تقني أسبوعي
cron.schedule('0 0 * * 0', async () => {
  await runTechnicalAudit();
});

// إرسال التقارير الشهرية
cron.schedule('0 9 1 * *', async () => {
  await sendMonthlyReports();
});
```

### 5. نظام التخزين المؤقت (Caching)

يستخدم Redis لتحسين الأداء:

```javascript
// استراتيجية التخزين المؤقت
const cacheStrategy = {
  // بيانات ثابتة نسبياً (24 ساعة)
  staticData: 86400,
  
  // بيانات متغيرة (1 ساعة)
  dynamicData: 3600,
  
  // بيانات حساسة للوقت (5 دقائق)
  realtimeData: 300
};
```

## واجهات برمجة التطبيقات (APIs)

### المصادقة

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/refresh-token
POST /api/auth/logout
```

### لوحة التحكم

```http
GET /api/dashboard/overview
GET /api/dashboard/quick-stats
GET /api/dashboard/seo-score/:websiteId
GET /api/dashboard/performance/:websiteId
```

### الكلمات المفتاحية

```http
GET /api/keywords/:websiteId
POST /api/keywords/:websiteId
PUT /api/keywords/:keywordId
DELETE /api/keywords/:keywordId
POST /api/keywords/:websiteId/bulk
GET /api/keywords/:keywordId/history
```

### التحليل التقني

```http
GET /api/technical/:websiteId/overview
POST /api/technical/:websiteId/audit
POST /api/technical/:websiteId/analyze
GET /api/technical/:websiteId/issues
POST /api/technical/:websiteId/pagespeed
```

### التحليلات

```http
GET /api/analytics/:websiteId/overview
GET /api/analytics/:websiteId/traffic
GET /api/analytics/:websiteId/conversions
GET /api/analytics/:websiteId/organic
GET /api/analytics/:websiteId/realtime
```

## قاعدة البيانات

### المخطط الرئيسي

```sql
-- جدول المستخدمين
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- جدول المواقع
CREATE TABLE websites (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    domain VARCHAR(255) NOT NULL,
    shopify_store_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- جدول الكلمات المفتاحية
CREATE TABLE keywords (
    id UUID PRIMARY KEY,
    website_id UUID REFERENCES websites(id),
    keyword VARCHAR(255) NOT NULL,
    current_position INTEGER,
    search_volume INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- جدول سجل الترتيب
CREATE TABLE keyword_rankings (
    id UUID PRIMARY KEY,
    keyword_id UUID REFERENCES keywords(id),
    position INTEGER,
    url VARCHAR(500),
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### الفهارس المهمة

```sql
-- فهارس الأداء
CREATE INDEX idx_keywords_website ON keywords(website_id);
CREATE INDEX idx_rankings_keyword_date ON keyword_rankings(keyword_id, date);
CREATE INDEX idx_websites_user ON websites(user_id);
CREATE INDEX idx_analytics_website_date ON analytics_data(website_id, date);
```

## الأمان والحماية

### 1. حماية API

```javascript
// معدل الطلبات
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب
  message: 'تجاوزت الحد المسموح من الطلبات'
});

// حماية CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 2. تشفير البيانات

```javascript
// تشفير البيانات الحساسة
function encryptData(data) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}
```

### 3. التحقق من المدخلات

```javascript
// مثال على التحقق من المدخلات
const keywordValidation = [
  body('keyword')
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('كلمة مفتاحية غير صالحة'),
  
  body('target_url')
    .optional()
    .isURL()
    .withMessage('رابط غير صالح')
];
```

## النشر والتشغيل

### 1. باستخدام Docker

```bash
# بناء الصورة
docker build -t shopify-seo-analyzer .

# تشغيل مع Docker Compose
docker-compose up -d

# مراقبة السجلات
docker-compose logs -f
```

### 2. النشر على الخادم

```bash
# استخدام سكريبت النشر التلقائي
./scripts/deploy.sh production

# أو يدوياً
npm run build
pm2 start ecosystem.config.js --env production
```

### 3. إعداد Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL/HTTPS

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d yourdomain.com
```

## مراقبة الأداء

### 1. مقاييس النظام

```javascript
// مراقبة استخدام الذاكرة
setInterval(() => {
  const usage = process.memoryUsage();
  logger.info('Memory usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`
  });
}, 60000);
```

### 2. مراقبة قاعدة البيانات

```sql
-- مراقبة الاستعلامات البطيئة
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

## استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. فشل الاتصال بقاعدة البيانات

```bash
# التحقق من حالة PostgreSQL
sudo systemctl status postgresql

# التحقق من الاتصال
psql -U username -h localhost -d shopify_seo_analyzer
```

#### 2. أخطاء Redis

```bash
# التحقق من حالة Redis
redis-cli ping

# مسح الذاكرة المؤقتة
redis-cli FLUSHALL
```

#### 3. مشاكل الذاكرة

```bash
# زيادة حد الذاكرة لـ Node.js
node --max-old-space-size=4096 server.js
```

#### 4. أخطاء API الخارجية

```javascript
// إعادة المحاولة مع التراجع الأسي
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## الدعم والمساهمة

### الإبلاغ عن المشاكل

1. تحقق من [قائمة المشاكل المعروفة](https://github.com/yourusername/shopify-seo-analyzer/issues)
2. أنشئ تقرير مشكلة جديد مع:
   - وصف واضح للمشكلة
   - خطوات إعادة الإنتاج
   - سجلات الأخطاء
   - معلومات البيئة

### المساهمة في التطوير

1. قم بعمل Fork للمشروع
2. أنشئ فرع جديد: `git checkout -b feature/amazing-feature`
3. قم بالتغييرات المطلوبة
4. أضف الاختبارات اللازمة
5. تأكد من نجاح جميع الاختبارات: `npm test`
6. قم بعمل Commit: `git commit -m 'Add amazing feature'`
7. ارفع التغييرات: `git push origin feature/amazing-feature`
8. افتح Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT. راجع ملف [LICENSE](LICENSE) للمزيد من التفاصيل.

## شكر وتقدير

- فريق Shopify لتوفير API ممتازة
- مجتمع Node.js و React للأدوات الرائعة
- جميع المساهمين في تطوير هذا المشروع

---

تم التطوير بـ ❤️ بواسطة فريق Shopify SEO Analyzer