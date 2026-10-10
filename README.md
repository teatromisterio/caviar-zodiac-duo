# Caviar · Zodiac Duo — конфигуратор

Автономный виджет: блок внутри продуктового лендинга, работает на любом движке (Tilda, Битрикс, WordPress, свой код). Зависимостей нет; шрифт Nunito Sans подключается из Google Fonts внутри `zodiac-duo.css`.

## Состав

```
zodiac-duo/
  index.html          демо-страница (лендинг-заглушка вокруг блока)
  zodiac-duo.css      стили, всё под префиксом .zd
  zodiac-duo.js       логика виджета
  assets/
    manifest.js       позиции слоёв на холсте PSD 1792×2400
    layers/*.webp     слои: полный размер и @half (половина)
    swatches/*.webp   превью вариантов 160×160
```

## Как встроить

1. Скопировать папку `zodiac-duo/` на сервер сайта (или в CDN).
2. В месте блока на странице:

```html
<link rel="stylesheet" href="/zodiac-duo/zodiac-duo.css">
<div data-zodiac-duo></div>
<script>
  window.ZodiacDuoConfig = {
    leadEndpoint: "",   // URL обработчика заявок (отправка на email)
    bitrixWebhook: "",  // вебхук Битрикс24, напр. https://<портал>.bitrix24.ru/rest/1/<ключ>
    policyUrl: "/privacy",
    ymId: 12345678      // ID Яндекс Метрики
  };
</script>
<script src="/zodiac-duo/assets/manifest.js"></script>
<script src="/zodiac-duo/zodiac-duo.js"></script>
```

Путь к ассетам вычисляется от адреса `zodiac-duo.js`. Если ассеты лежат отдельно — задайте `assets: "https://cdn…/zodiac-duo/assets"`.

Tilda: блок T123 (HTML), тот же код; файлы — на внешний хостинг или CDN.

## Настройки `window.ZodiacDuoConfig`

| Ключ | Что делает |
|---|---|
| `lang` | `"ru"` / `"en"`. По умолчанию берётся из `<html lang>` |
| `leadEndpoint` | POST JSON: `code, link, spec, state, lang, name, phone, email, messenger, comment, page, image` (`image` — JPEG сборки в data URL). Сервер отправляет письмо |
| `bitrixWebhook` | Создаёт лид `crm.lead.add`: название `Zodiac Duo · <код>`, контакты, спецификация и ссылка в комментарии |
| `policyUrl` | Ссылка на политику конфиденциальности в форме |
| `ymId` | Цели Метрики через `ym(id, "reachGoal", …)`. GA4 подхватывается сам, если на странице есть `gtag` |

Пока `leadEndpoint` и `bitrixWebhook` пустые, форма показывает благодарность, а данные заявки уходят только в консоль браузера (TODO до запуска).

> **Безопасность.** Вебхук Битрикс24, вызванный из браузера, виден любому посетителю. Для продакшена лучше отправлять заявку на свой `leadEndpoint` и уже с сервера создавать лид в Битрикс24 и письмо. Поле `bitrixWebhook` оставить пустым.

## События аналитики

`zd_open`, `zd_sign_select`, `zd_option_change`, `zd_preset`, `zd_random`, `zd_share`, `zd_download`, `zd_zoom`, `zd_summary`, `zd_lead_open`, `zd_lead_submit`.

## Поведение

- Сборка хранится в `localStorage` и в ссылке «Поделиться» (`#zd=…`). Ссылка открывает ровно ту же сборку.
- Правило: при круге из чёрного титана камни на внешней окружности недоступны; если они были выбраны — заменяются на «Без камней» с уведомлением.
- Эмаль окружности обязательна; цвет — готовые оттенки или ползунки «Оттенок / Насыщенность / Яркость».
- Мобильная версия (≤ 860 px): блок на всю высоту экрана, телефон сверху, управление снизу; варианты листаются горизонтально, свайп по вариантам не прокручивает страницу. Страница прокручивается свайпом по телефону.
- Изображения: до 1000 физических пикселей ширины грузятся `@half`, выше — полный размер.

## Пересборка ассетов из PSD

Скрипты лежат в `../tools/` (нужны `psd-tools` и `pillow`):

```bash
python tools/export_assets.py Configurator.psd zodiac-duo/assets
python tools/make_swatches.py zodiac-duo/assets
```

Исходник PSD не меняется. Имена слоёв нормализуются только в именах файлов.

## TODO до запуска

- [ ] `leadEndpoint` (email) и Битрикс24 (лучше через сервер)
- [ ] `policyUrl`, `ymId`
- [ ] `og:image` — обложка коллекции
- [ ] Финальные названия: металлы, «Клу-де-Пари» / «Шеврон», «Лучевой гильош», камни центра
