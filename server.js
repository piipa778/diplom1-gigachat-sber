require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-long-random-secret';
const GIGACHAT_AUTH_KEY = String(process.env.GIGACHAT_AUTH_KEY || process.env.GIGACHAT_CREDENTIALS || '').trim();
const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL || 'GigaChat';
const GIGACHAT_AUTH_URL = process.env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const GIGACHAT_API_URL = String(process.env.GIGACHAT_API_URL || 'https://gigachat.devices.sberbank.ru/api/v1').replace(/\/+$/, '');
const GIGACHAT_TIMEOUT_MS = Number(process.env.GIGACHAT_TIMEOUT_MS) || 20000;
const GIGACHAT_REJECT_UNAUTHORIZED = process.env.GIGACHAT_REJECT_UNAUTHORIZED !== 'false';

if (!DATABASE_URL) console.warn('DATABASE_URL не указан. Создайте .env по примеру .env.example');
if (ADMIN_PASSWORD === 'admin123') console.warn('Используется стандартный пароль администратора admin123. Для диплома можно, для реального сайта замените.');
if (!GIGACHAT_AUTH_KEY) console.warn('GIGACHAT_AUTH_KEY не указан. ИИ-бот будет работать в локальном fallback-режиме.');

const pool = new Pool({ connectionString: DATABASE_URL });
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.mimetype)) return cb(new Error('Разрешены только изображения.'));
    cb(null, true);
  }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(__dirname));

function normalizeText(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
function slugify(value) { return normalizeText(value).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 160); }

function base64Url(input) { return Buffer.from(JSON.stringify(input)).toString('base64url'); }
function signToken(payload) {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url(payload);
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function readAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return verifyToken(token);
}
function requireAuth(req, res, next) {
  const payload = readAuth(req);
  if (!payload) return res.status(401).json({ message: 'Необходима авторизация.' });
  req.user = payload;
  next();
}
function requireAdmin(req, res, next) {
  const payload = readAuth(req);
  if (!payload || payload.role !== 'admin') return res.status(401).json({ message: 'Нужен вход администратора.' });
  req.user = payload;
  next();
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}
function validateReview(body) {
  const author = normalizeText(body.author);
  const text = normalizeText(body.text);
  const category = normalizeText(body.category || 'Десерты').slice(0, 80);
  const rating = Number(body.rating);
  if (author.length < 2 || author.length > 120) return { error: 'Укажите имя от 2 до 120 символов.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Поставьте оценку от 1 до 5.' };
  if (text.length < 10 || text.length > 1000) return { error: 'Отзыв должен быть от 10 до 1000 символов.' };
  return { author, rating, text, category };
}


function normalizeProduct(body) {
  const name = normalizeText(body.name);
  const description = String(body.description || '').trim();
  const category = normalizeText(body.category || 'Торты').slice(0, 80);
  const weight = normalizeText(body.weight || '').slice(0, 60);
  const imageUrl = String(body.image_url || body.imageUrl || '').trim().slice(0, 500);
  const price = Number(body.price);
  const isActive = body.is_active === undefined ? true : Boolean(body.is_active);
  if (name.length < 2 || name.length > 160) return { error: 'Название блюда должно быть от 2 до 160 символов.' };
  if (description.length < 5 || description.length > 1000) return { error: 'Описание должно быть от 5 до 1000 символов.' };
  if (!Number.isFinite(price) || price < 0 || price > 1000000) return { error: 'Укажите корректную цену.' };
  if (!imageUrl) return { error: 'Добавьте картинку блюда: путь, URL или загрузите файл.' };
  return { name, description, category, weight, price, image_url: imageUrl, is_active: isActive };
}

async function seedProducts() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count > 0) return;
  const defaults = [
    ['Шоколадный торт', 'Нежный шоколадный бисквит с ягодной начинкой.', 'Торты', '1 кг', 2450, 'images/disert.jpg'],
    ['Медовик классический', 'Тонкие медовые коржи со сметанным кремом.', 'Торты', '850 г', 1850, 'images/kdeserty.jpg'],
    ['Чизкейк Нью-Йорк', 'Классический сливочный чизкейк с ягодным соусом.', 'Десерты', '900 г', 2150, 'images/formfon.jpg'],
    ['Морковный торт', 'Пряные коржи с крем-чизом и орехами.', 'Торты', '1 кг', 2100, 'images/kmini.jpg'],
    ['Эклеры ванильные', 'Заварное тесто с нежным кремом.', 'Пирожные', '6 шт.', 750, 'images/vipech.jpg'],
    ['Капкейки ягодные', 'Воздушные капкейки с ягодным кремом.', 'Капкейки', '4 шт.', 890, 'images/kvipech.jpg'],
    ['Макаруны ассорти', 'Ассорти вкусов: фисташка, малина, карамель.', 'Макаруны', '8 шт.', 980, 'images/mart.webp'],
    ['Панна-котта', 'Нежная панна-котта с ягодным желе.', 'Десерты', '180 г', 490, 'images/napitki.jpg']
  ];
  for (const item of defaults) {
    await pool.query(
      'INSERT INTO products (name, description, category, weight, price, image_url) VALUES ($1,$2,$3,$4,$5,$6)',
      item
    );
  }
}
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author VARCHAR(120) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Десерты',
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text TEXT NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Миграция для старых баз: CREATE TABLE IF NOT EXISTS не добавляет новые поля
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS author VARCHAR(120);
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS category VARCHAR(80) DEFAULT 'Десерты';
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='author_name') THEN
        UPDATE reviews SET author = COALESCE(author, author_name);
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='name') THEN
        UPDATE reviews SET author = COALESCE(author, name);
      END IF;
    END $$;

    UPDATE reviews SET author = COALESCE(NULLIF(author, ''), 'Гость');
    UPDATE reviews SET category = COALESCE(NULLIF(category, ''), 'Десерты');
    UPDATE reviews SET is_published = COALESCE(is_published, TRUE);
    UPDATE reviews SET created_at = COALESCE(created_at, NOW());

    ALTER TABLE reviews ALTER COLUMN author SET NOT NULL;
    ALTER TABLE reviews ALTER COLUMN category SET NOT NULL;
    ALTER TABLE reviews ALTER COLUMN is_published SET NOT NULL;
    ALTER TABLE reviews ALTER COLUMN created_at SET NOT NULL;

    CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews (created_at DESC);

    CREATE TABLE IF NOT EXISTS page_content (
      slug VARCHAR(160) PRIMARY KEY,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by VARCHAR(160)
    );

    CREATE TABLE IF NOT EXISTS admin_edit_logs (
      id SERIAL PRIMARY KEY,
      admin_login VARCHAR(160) NOT NULL,
      action VARCHAR(120) NOT NULL,
      target VARCHAR(200) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Торты',
      weight VARCHAR(60),
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS products_active_idx ON products (is_active, created_at DESC);
  `);
  await seedProducts();
}


function supportText(value) {
  return String(value || '').toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}
function formatProductLine(product) {
  const price = Number(product.price || 0).toLocaleString('ru-RU');
  const weight = product.weight ? `, ${product.weight}` : '';
  return `• ${product.name} — ${price} ₽${weight}`;
}
async function findSupportProducts(question) {
  const q = supportText(question);
  const { rows } = await pool.query(
    `SELECT name, description, category, weight, price, image_url
     FROM products WHERE is_active = TRUE ORDER BY id ASC LIMIT 100`
  );
  if (!rows.length) return [];
  const words = q.split(' ').filter(w => w.length >= 3);
  const scored = rows.map((product) => {
    const haystack = supportText([product.name, product.description, product.category, product.weight, product.price].filter(Boolean).join(' '));
    let score = 0;
    for (const word of words) if (haystack.includes(word)) score += word.length > 4 ? 2 : 1;
    if (q.includes(supportText(product.category))) score += 3;
    return { product, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(x => x.product);
}
function buildSupportAnswer(question, products = []) {
  const q = supportText(question);
  const greetings = ['привет', 'здравствуй', 'добрый', 'hello', 'hi'];
  if (!q) return 'Напишите вопрос, а я помогу с каталогом, заказом, доставкой, оплатой или контактами.';
  if (greetings.some(w => q.includes(w))) return 'Здравствуйте! Я ИИ-бот поддержки «Вкусный дворик». Могу подсказать по десертам, ценам, доставке, оплате и оформлению заказа.';
  if (q.includes('достав') || q.includes('привез') || q.includes('курьер')) return 'Доставка обсуждается при оформлении заказа. Обычно мы уточняем адрес, дату, время и аккуратно привозим десерты к нужному сроку. Для срочного заказа лучше позвонить: +7 (495) 123-45-67.';
  if (q.includes('оплат') || q.includes('карт') || q.includes('налич')) return 'Оплату можно согласовать с менеджером при подтверждении заказа. Напишите, что хотите заказать, дату и телефон — менеджер уточнит удобный способ оплаты.';
  if (q.includes('контакт') || q.includes('телефон') || q.includes('адрес') || q.includes('почт')) return 'Контакты кондитерской: телефон +7 (495) 123-45-67, e-mail info@vkusnydvorik.ru, адрес: г. Москва, ул. Сладкая, 10.';
  if (q.includes('заказ') || q.includes('заказать') || q.includes('оформ')) return 'Чтобы оформить заказ, выберите десерт в каталоге и сообщите менеджеру: название, количество, дату, время, адрес доставки и телефон для связи. Я также могу подсказать подходящие позиции из каталога.';
  if (q.includes('свад') || q.includes('банкет') || q.includes('кейтер') || q.includes('корпоратив')) return 'Для мероприятий мы помогаем подобрать десерты под формат праздника: свадьба, банкет, корпоратив или кейтеринг. Укажите дату, число гостей и желаемый бюджет — менеджер подготовит предложение.';
  if (q.includes('цена') || q.includes('стоим') || q.includes('прайс') || q.includes('каталог') || q.includes('торт') || q.includes('капкей') || q.includes('макар') || q.includes('десерт') || products.length) {
    if (products.length) return `Нашёл подходящие позиции:\n${products.map(formatProductLine).join('\n')}\n\nМожно открыть каталог и выбрать понравившийся десерт. Для заказа сообщите название и дату.`;
    return 'Цены и актуальные позиции доступны в каталоге. Вы можете спросить меня конкретнее, например: «какие есть торты» или «сколько стоят капкейки». Какая категория вас интересует?';
  }
  if (q.includes('состав') || q.includes('ингредиент') || q.includes('аллерг')) return 'Мы используем свежие ингредиенты. По аллергенам и составу конкретного десерта лучше уточнить название позиции — я проверю каталог или подскажу, что передать менеджеру.';
  if (q.includes('спасибо') || q.includes('благодар')) return 'Пожалуйста! Обращайтесь, я помогу выбрать десерт и подскажу по заказу.';
  return 'Я могу помочь с каталогом, ценами, доставкой, оплатой, контактами и заказами для мероприятий. Напишите вопрос чуть конкретнее — например: «какие есть торты?» или «как оформить доставку?»';
}


let gigachatTokenCache = { accessToken: '', expiresAtMs: 0 };

function createRqUid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const hex = crypto.randomBytes(16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function gigachatAuthHeader() {
  const value = GIGACHAT_AUTH_KEY.trim();
  if (!value) return '';
  return value.toLowerCase().startsWith('basic ') ? value : `Basic ${value}`;
}

function httpsJsonRequest(url, { method = 'GET', headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    const requestHeaders = { ...headers };
    if (payload && !requestHeaders['Content-Length']) requestHeaders['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request({
      method,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: `${parsed.pathname}${parsed.search}`,
      headers: requestHeaders,
      timeout: GIGACHAT_TIMEOUT_MS,
      agent: new https.Agent({ rejectUnauthorized: GIGACHAT_REJECT_UNAUTHORIZED })
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        try { data = raw ? JSON.parse(raw) : {}; } catch {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const apiMessage = data && typeof data === 'object' ? (data.message || data.error_description || data.error) : raw;
          return reject(new Error(`GigaChat API вернул ${res.statusCode}: ${apiMessage || 'без текста ошибки'}`));
        }
        resolve(data);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Истекло время ожидания GigaChat API.')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getGigaChatAccessToken() {
  if (!GIGACHAT_AUTH_KEY) return null;
  if (gigachatTokenCache.accessToken && Date.now() < gigachatTokenCache.expiresAtMs - 60_000) {
    return gigachatTokenCache.accessToken;
  }

  const data = await httpsJsonRequest(GIGACHAT_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': createRqUid(),
      'Authorization': gigachatAuthHeader()
    },
    body: new URLSearchParams({ scope: GIGACHAT_SCOPE }).toString()
  });

  if (!data.access_token) throw new Error('GigaChat API не вернул access_token.');
  const expiresRaw = Number(data.expires_at);
  const expiresAtMs = Number.isFinite(expiresRaw)
    ? (expiresRaw > 1_000_000_000_000 ? expiresRaw : expiresRaw * 1000)
    : Date.now() + 29 * 60 * 1000;

  gigachatTokenCache = { accessToken: data.access_token, expiresAtMs };
  return data.access_token;
}

function buildCatalogContext(products = []) {
  if (!products.length) return 'По текущему вопросу в каталоге не найдено точных совпадений.';
  return products.map(formatProductLine).join('\n');
}

function buildGigaChatSystemPrompt(products = []) {
  return [
    'Ты — ИИ-бот поддержки кондитерской «Вкусный дворик».',
    'Отвечай вежливо, кратко и по делу на русском языке.',
    'Помогай посетителям с каталогом, ценами, оформлением заказа, доставкой, оплатой, контактами и мероприятиями.',
    'Не выдумывай цены, наличие, состав и сроки. Если данных нет, предложи уточнить детали у менеджера.',
    'Для заказа проси название десерта, количество, дату, время, адрес доставки и телефон для связи.',
    'Контакты: +7 (495) 123-45-67, info@vkusnydvorik.ru, г. Москва, ул. Сладкая, 10.',
    `Подходящие позиции из каталога:\n${buildCatalogContext(products)}`
  ].join('\n');
}

function buildGigaChatMessages(message, products = [], history = []) {
  const messages = [{ role: 'system', content: buildGigaChatSystemPrompt(products) }];
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];

  for (const item of safeHistory) {
    const role = item && item.role === 'user' ? 'user' : 'assistant';
    const text = normalizeText(item && (item.text || item.content)).slice(0, 1000);
    if (!text || text === 'Печатаю ответ…') continue;
    messages.push({ role, content: text });
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content !== message) {
    messages.push({ role: 'user', content: message });
  }
  return messages;
}

async function askGigaChat(message, products = [], history = []) {
  const accessToken = await getGigaChatAccessToken();
  if (!accessToken) return null;

  const data = await httpsJsonRequest(`${GIGACHAT_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      model: GIGACHAT_MODEL,
      messages: buildGigaChatMessages(message, products, history),
      temperature: 0.35,
      max_tokens: 700,
      stream: false
    })
  });

  const answer = normalizeText(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
  if (!answer) throw new Error('GigaChat API вернул пустой ответ.');
  return answer;
}

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = normalizeText(req.body.name);
    const email = normalizeText(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2) return res.status(400).json({ message: 'Введите имя.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Введите корректный e-mail.' });
    if (password.length < 4) return res.status(400).json({ message: 'Пароль должен быть не короче 4 символов.' });
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashPassword(password)]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, role: user.role, login: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });
    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Пользователь с таким e-mail уже есть.' });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const login = normalizeText(req.body.login || req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (login === ADMIN_LOGIN.toLowerCase() && password === ADMIN_PASSWORD) {
      const token = signToken({ role: 'admin', login: ADMIN_LOGIN, name: 'Администратор', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 });
      return res.json({ token, user: { role: 'admin', login: ADMIN_LOGIN, name: 'Администратор' } });
    }
    const { rows } = await pool.query('SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1', [login]);
    const user = rows[0];
    if (!user || !checkPassword(password, user.password_hash)) return res.status(401).json({ message: 'Неверный логин или пароль.' });
    const token = signToken({ id: user.id, role: user.role, login: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.id || null, role: req.user.role, login: req.user.login, name: req.user.name } });
});

app.get('/api/reviews', async (req, res, next) => {
  try {
    const includeHidden = req.query.all === '1' && readAuth(req)?.role === 'admin';
    const { rows } = await pool.query(
      `SELECT id, user_id, author, category, rating, text, is_published, created_at FROM reviews
       ${includeHidden ? '' : 'WHERE is_published = TRUE'} ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ reviews: rows });
  } catch (error) { next(error); }
});

app.post('/api/reviews', async (req, res, next) => {
  try {
    const review = validateReview(req.body);
    if (review.error) return res.status(400).json({ message: review.error });
    const user = readAuth(req);
    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, author, category, rating, text) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, author, category, rating, text, is_published, created_at`,
      [user?.id || null, review.author, review.category, review.rating, review.text]
    );
    res.status(201).json({ review: rows[0] });
  } catch (error) { next(error); }
});

app.patch('/api/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const isPublished = Boolean(req.body.is_published);
    const { rows } = await pool.query('UPDATE reviews SET is_published=$1 WHERE id=$2 RETURNING *', [isPublished, id]);
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'review_publish_change', `review:${id}`, JSON.stringify({ is_published: isPublished })]);
    res.json({ review: rows[0] });
  } catch (error) { next(error); }
});

app.delete('/api/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM reviews WHERE id=$1', [id]);
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target) VALUES ($1,$2,$3)', [req.user.login, 'review_delete', `review:${id}`]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});


app.get('/api/products', async (req, res, next) => {
  try {
    const includeHidden = req.query.all === '1' && readAuth(req)?.role === 'admin';
    const { rows } = await pool.query(
      `SELECT id, name, description, category, weight, price, image_url, is_active, created_at, updated_at
       FROM products ${includeHidden ? '' : 'WHERE is_active = TRUE'} ORDER BY id ASC`
    );
    res.json({ products: rows });
  } catch (error) { next(error); }
});

app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const product = normalizeProduct(req.body);
    if (product.error) return res.status(400).json({ message: product.error });
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, category, weight, price, image_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, description, category, weight, price, image_url, is_active, created_at, updated_at`,
      [product.name, product.description, product.category, product.weight, product.price, product.image_url, product.is_active]
    );
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'product_create', `product:${rows[0].id}`, JSON.stringify(rows[0])]);
    res.status(201).json({ product: rows[0] });
  } catch (error) { next(error); }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = normalizeProduct(req.body);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Некорректный ID блюда.' });
    if (product.error) return res.status(400).json({ message: product.error });
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, description=$2, category=$3, weight=$4, price=$5, image_url=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8
       RETURNING id, name, description, category, weight, price, image_url, is_active, created_at, updated_at`,
      [product.name, product.description, product.category, product.weight, product.price, product.image_url, product.is_active, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Блюдо не найдено.' });
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'product_update', `product:${id}`, JSON.stringify(rows[0])]);
    res.json({ product: rows[0] });
  } catch (error) { next(error); }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Некорректный ID блюда.' });
    const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id, name', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Блюдо не найдено.' });
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'product_delete', `product:${id}`, JSON.stringify(rows[0])]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/content/:slug', async (req, res, next) => {
  try {
    const slug = slugify(req.params.slug);
    const { rows } = await pool.query('SELECT slug, content, updated_at, updated_by FROM page_content WHERE slug = $1', [slug]);
    res.json(rows[0] || { slug, content: { texts: {}, images: {} }, updated_at: null, updated_by: null });
  } catch (error) { next(error); }
});

app.put('/api/content/:slug', requireAdmin, async (req, res, next) => {
  try {
    const slug = slugify(req.params.slug);
    const content = req.body && typeof req.body.content === 'object' ? req.body.content : null;
    if (!slug || !content) return res.status(400).json({ message: 'Некорректные данные страницы.' });
    content.texts = content.texts && typeof content.texts === 'object' ? content.texts : {};
    content.images = content.images && typeof content.images === 'object' ? content.images : {};
    const { rows } = await pool.query(
      `INSERT INTO page_content (slug, content, updated_at, updated_by)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING slug, content, updated_at, updated_by`,
      [slug, JSON.stringify(content), req.user.login]
    );
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'page_content_update', slug, JSON.stringify({ texts: Object.keys(content.texts).length, images: Object.keys(content.images).length })]);
    res.json(rows[0]);
  } catch (error) { next(error); }
});

app.post('/api/upload', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не получен.' });
    const url = `/uploads/${req.file.filename}`;
    await pool.query('INSERT INTO admin_edit_logs (admin_login, action, target, details) VALUES ($1,$2,$3,$4::jsonb)', [req.user.login, 'image_upload', url, JSON.stringify({ originalname: req.file.originalname, size: req.file.size })]);
    res.status(201).json({ url });
  } catch (error) { next(error); }
});

app.get('/api/admin/users', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 200');
    res.json({ users: rows });
  } catch (error) { next(error); }
});
app.get('/api/admin/edits', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, admin_login, action, target, details, created_at FROM admin_edit_logs ORDER BY created_at DESC LIMIT 200');
    res.json({ edits: rows });
  } catch (error) { next(error); }
});


app.post('/api/support/chat', async (req, res, next) => {
  try {
    const message = normalizeText(req.body.message).slice(0, 600);
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ message: 'Введите сообщение для бота.' });

    const products = await findSupportProducts(message);
    let answer = null;
    let source = 'local';

    try {
      answer = await askGigaChat(message, products, history);
      if (answer) source = 'gigachat';
    } catch (error) {
      console.warn('GigaChat API недоступен, используется локальный fallback:', error.message);
    }

    if (!answer) answer = buildSupportAnswer(message, products);
    res.json({
      answer,
      source,
      products: products.map((p) => ({ name: p.name, category: p.category, weight: p.weight, price: p.price, image_url: p.image_url }))
    });
  } catch (error) { next(error); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Ошибка сервера. Проверьте подключение к PostgreSQL.' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`)))
  .catch((error) => { console.error('Не удалось подключиться к PostgreSQL:', error.message); process.exit(1); });
