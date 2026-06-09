# Backend отзывов на Node.js + PostgreSQL

## Запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте базу PostgreSQL, например:

```sql
CREATE DATABASE vkusny_dvorik;
```

3. Создайте файл `.env` рядом с `server.js`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vkusny_dvorik
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=diplom_reviews_site_secret_2026

# GigaChat API от Сбера
GIGACHAT_AUTH_KEY=ваш_authorization_key_из_личного_кабинета_Studio
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_API_URL=https://gigachat.devices.sberbank.ru/api/v1
GIGACHAT_REJECT_UNAUTHORIZED=true
```

4. Запустите сервер:

```bash
npm start
```

Сайт будет доступен по адресу `http://localhost:3000/otzivy.html`.
Таблица `reviews` создаётся автоматически при старте сервера. SQL также продублирован в `schema.sql`.

## API

- `GET /api/reviews` — список отзывов.
- `POST /api/reviews` — добавить отзыв.

Пример тела POST-запроса:

```json
{
  "author": "Анна",
  "rating": 5,
  "text": "Очень понравился банкет, кухня и обслуживание на высоте!"
}
```

## ИИ-бот поддержки через GigaChat Сбера

В проект добавлен чат-виджет поддержки на всех HTML-страницах:

- кнопка 💬 открывает окно чата;
- клиентский файл: `js/support-bot.js`;
- серверный API: `POST /api/support/chat`;
- сервер получает `access_token` GigaChat через `POST /api/v2/oauth`, кеширует его и отправляет вопрос в `/chat/completions`;
- бот отвечает на вопросы про каталог, цены, заказ, доставку, оплату, контакты и мероприятия;
- при вопросах о десертах бот ищет подходящие позиции в таблице `products` PostgreSQL и передаёт их в системный промпт GigaChat;
- если `GIGACHAT_AUTH_KEY` не указан или API временно недоступен, сервер автоматически использует локальные fallback-ответы, а фронтенд тоже имеет запасной режим.

### Как получить ключ GigaChat

1. Создайте проект GigaChat API в личном кабинете Sber Studio.
2. В настройках API получите `Authorization Key`.
3. Вставьте ключ в `.env` в поле `GIGACHAT_AUTH_KEY`.
4. Для физлиц оставьте `GIGACHAT_SCOPE=GIGACHAT_API_PERS`; для ИП/юрлиц используйте scope, который соответствует вашему тарифу.
5. Перезапустите сервер командой `npm start`.

Если на локальном компьютере возникает ошибка сертификата, установите сертификаты НУЦ Минцифры. Для временной локальной проверки можно поставить `GIGACHAT_REJECT_UNAUTHORIZED=false`, но для продакшена так делать не рекомендуется.

Пример запроса:

```json
POST /api/support/chat
{
  "message": "Какие есть торты?",
  "history": [
    { "role": "user", "text": "Здравствуйте" },
    { "role": "assistant", "text": "Здравствуйте! Чем помочь?" }
  ]
}
```

Пример ответа:

```json
{
  "answer": "Нашёл подходящие позиции:\n• Шоколадный торт — 2 450 ₽, 1 кг",
  "products": []
}
```
