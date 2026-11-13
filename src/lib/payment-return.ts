/**
 * გადახდიდან დაბრუნების ტოკენის საზიარო კონსტანტები — route handler-ი,
 * სტატუსის გვერდი და action-ები ერთსა და იმავეს იყენებენ.
 *
 * პრივატულობის წესი (2026-09-03): ტოკენი query-string-ში აღარ ცხოვრობს —
 * httpOnly cookie-ში გადადის, რომ მესამე მხარის სკრიპტებმა (GA/Meta)
 * page_location/dl-ით ვერასდროს წაიღონ. ძველი ?t= ბმულები fallback-ად რჩება.
 */

export const RETURN_TOKEN_COOKIE = "flitt_return";

/** randomUUID-ის ფორმატი — query-დან მოსული მნიშვნელობა ბრმად არ ინახება */
export const RETURN_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ერთდროულად ერთი შეკვეთა (ერთი cookie) — ცნობილი, მისაღები შეზღუდვა */
export const RETURN_TOKEN_MAX_AGE_S = 3600;
