# Добавление блюд через администратора

В этой версии добавлен полноценный CRUD каталога блюд.

## Роли

- **Пользователь**: регистрируется, входит на сайт, оставляет отзывы.
- **Администратор**: входит по данным из `.env`, редактирует страницы, управляет отзывами, пользователями и блюдами каталога.

## Где добавлять новое блюдо

1. Запустить проект.
2. Открыть `http://localhost:3000/admin.html`.
3. Войти как администратор.
4. Открыть раздел **«Блюда / каталог»**.
5. Заполнить форму:
   - название блюда;
   - категория;
   - вес / количество;
   - цена;
   - описание;
   - картинка через путь/URL или загрузку файла.
6. Нажать **«Добавить блюдо»**.

После сохранения блюдо записывается в PostgreSQL и появляется на странице `catalog.html`.

## Таблица PostgreSQL

Данные каталога хранятся в таблице `products`:

```sql
SELECT id, name, category, weight, price, image_url, is_active, created_at, updated_at
FROM products
ORDER BY id;
```

## История действий администратора

Создание, редактирование и удаление блюд фиксируется в таблице `admin_edit_logs`:

```sql
SELECT id, admin_login, action, target, details, created_at
FROM admin_edit_logs
ORDER BY created_at DESC;
```

## API

Публичный каталог:

```http
GET /api/products
```

Админские действия:

```http
GET /api/products?all=1
POST /api/admin/products
PUT /api/admin/products/:id
DELETE /api/admin/products/:id
```

Все админские действия требуют JWT-токен администратора.
