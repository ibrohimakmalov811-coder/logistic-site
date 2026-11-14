# TransFlow Localization Glossary (`uz` / `ru` / `en`)

Consistent terminology across the public site, auth, onboarding, Company Portal, Driver Portal, and emails.

| Concept | Uzbek (`uz`) | Russian (`ru`) | English (`en`) |
|---|---|---|---|
| Order | Buyurtma | Заказ | Order |
| Dispatching | Dispetcherlik | Диспетчеризация | Dispatching |
| Company Owner | Kompaniya egasi | Владелец компании | Company owner |
| Dispatcher | Dispetcher | Диспетчер | Dispatcher |
| Driver | Haydovchi | Водитель | Driver |
| Vehicle | Transport | Транспорт | Vehicle |
| Invite code | Taklif kodi | Код приглашения | Invite code |
| Two-factor auth (2FA) | Ikki bosqichli himoya (2FA) | Двухфакторная защита (2FA) | Two-factor auth (2FA) |
| Proof of delivery | Topshirish dalili | Подтверждение доставки | Proof of delivery |
| Backhaul | Qaytish yuklari | Обратная загрузка | Backhaul |
| Status: `new` | Yangi | Новый | New |
| Status: `assigned` | Tayinlangan | Назначен | Assigned |
| Status: `en_route_pickup` | Yuklashga yo'lda | В пути на погрузку | En route to pickup |
| Status: `loaded` | Yuklandi | Загружен | Loaded |
| Status: `in_transit` | Yo'lda | В пути | In transit |
| Status: `arrived` | Yetib keldi | Прибыл | Arrived |
| Status: `delivered` | Topshirildi | Доставлен | Delivered |
| Status: `cancelled` | Bekor qilindi | Отменён | Cancelled |

## Brand Name Rule
Never hardcode the product brand name inside translation strings. Use `{brand}` placeholder injected from `src/config/site.ts`.
