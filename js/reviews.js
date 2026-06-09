(function () {
  const reviewsList = document.getElementById('reviews-list');
  const reviewsCount = document.getElementById('reviews-count');
  const form = document.getElementById('review-form');
  const formMessage = document.getElementById('review-form-message');

  if (!reviewsList || !form) return;

  const fallbackReviews = [
    {
      author: 'Алина и Руслан',
      rating: 5,
      text: 'Праздновали свадьбу — всё прошло спокойно и очень красиво. Помогли с рассадкой гостей, меню и таймингом вечера.',
      created_at: new Date().toISOString()
    },
    {
      author: 'Корпоративный отдел компании',
      rating: 5,
      text: 'Удобная площадка, приятный сервис и понятная коммуникация. Отдельно отметили качество горячих блюд и работу команды.',
      created_at: new Date().toISOString()
    },
    {
      author: 'Семья Назаровых',
      rating: 5,
      text: 'Отмечали юбилей, всё получилось именно так, как хотели: уютно, вкусно и без организационной суеты.',
      created_at: new Date().toISOString()
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function stars(rating) {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 5));
    return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
  }

  function renderReviews(reviews) {
    if (!reviews.length) {
      reviewsList.innerHTML = '<div class="reviews-empty">Пока отзывов нет. Станьте первым гостем, который оставит впечатление.</div>';
      reviewsCount.textContent = '0 отзывов';
      return;
    }

    reviewsCount.textContent = reviews.length + ' ' + declOfNum(reviews.length, ['отзыв', 'отзыва', 'отзывов']);
    reviewsList.innerHTML = reviews.map(function (review) {
      return `
        <article class="review-card review-card--dynamic">
          <div class="review-card__body">
            <div class="review-card__top">
              <strong>${escapeHtml(review.author)}</strong>
              <span class="review-card__date">${formatDate(review.created_at)}</span>
            </div>
            <div class="review-card__stars" aria-label="Оценка ${Number(review.rating)} из 5">${stars(review.rating)}</div>
            <p>${escapeHtml(review.text)}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  function declOfNum(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  }

  async function loadReviews() {
    try {
      const response = await fetch('/api/reviews');
      if (!response.ok) throw new Error('reviews api failed');
      const data = await response.json();
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      renderReviews(reviews.length ? reviews : fallbackReviews);
    } catch (error) {
      renderReviews(fallbackReviews);
      reviewsCount.textContent = 'Демо-отзывы. Запустите Node.js сервер, чтобы подключить PostgreSQL.';
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    formMessage.textContent = '';
    formMessage.className = 'review-form__message';

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Публикуем...';

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        throw new Error(data.message || 'Не удалось сохранить отзыв.');
      }

      form.reset();
      form.rating.value = '5';
      formMessage.textContent = 'Спасибо! Отзыв опубликован.';
      formMessage.classList.add('is-success');
      await loadReviews();
    } catch (error) {
      formMessage.textContent = error.message || 'Ошибка отправки. Проверьте, что Node.js сервер запущен.';
      formMessage.classList.add('is-error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Опубликовать отзыв';
    }
  });

  loadReviews();
})();
