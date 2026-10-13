import type { Lang } from './lib/types'

export type { Lang }

const U = (hash: string, w = 900) =>
  `https://images.unsplash.com/photo-${hash}?fm=jpg&q=75&w=${w}&auto=format&fit=crop`

// Placeholder photography (Unsplash) for collection artwork — swap for real shots.
export const IMG: Record<string, [string, string]> = {
  car: [U('1504507533977-0a4b3f61ff36'), 'Samuel Foster'],
  mobile: [U('1604160687800-f7799a525a33'), 'Martin Sanchez'],
  trending: [U('1698314440355-eaf5ff14899c'), 'Rohan Krishnan'],
}

// Hero slider photos. Put your own in src/assets/hero/ named car, mobile and trending (.jpg, .jpeg, .png,
// .webp or .avif) — the build picks up whichever exist; a missing one falls back to the placeholder photo.
const OWN_HERO = import.meta.glob<string>('./assets/hero/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' })
const ownHero = (name: string) => Object.entries(OWN_HERO).find(([path]) => path.split('/').pop()!.replace(/\.\w+$/, '') === name)?.[1]
export const HERO_IMG = [
  // Isaac Mehegan, "Smartphone turned-on in vehicle mount inside vehicle" (Unsplash).
  ownHero('car') ?? U('1536825591064-574efec257f2', 1600),
  ownHero('mobile') ?? U('1587133454235-762b65c9f5c0', 1600),
  ownHero('trending') ?? U('1492107376256-4026437926cd', 1600),
]
// Mobile crop focal points (object-position) for the narrower, portrait slider.
export const HERO_FOCUS = ['30% 50%', '50% 50%', '50% 55%']
export const PROMO_IMG = U('1748214311838-576a62d44c7d', 2000)

// Integration boundary: set to a real endpoint to enable sign-up.
export const NEWSLETTER_ENDPOINT: string | null = null

export const NAV_HREFS = ['/', '/collections/car-accessories', '/collections/mobile-accessories', '/collections/trending']
export const FOOT_HREFS = [
  ['/pages/delivery', '/pages/returns', '/pages/contact', '/pages/faq'],
  ['/pages/about', '/pages/privacy', '/pages/terms'],
]

// Collection pages built in this app, keyed by Shopify collection handle; their products come from
// collection(handle:). Other /collections/* links still show the "not built yet" toast.
export type CollectionKey = 'car' | 'mobile' | 'trending'
export const COLLECTIONS: Record<string, { key: CollectionKey; nav: number }> = {
  'car-accessories': { key: 'car', nav: 1 },
  'mobile-accessories': { key: 'mobile', nav: 2 },
  trending: { key: 'trending', nav: 3 },
}
export const COLLECTION_SLUGS = Object.keys(COLLECTIONS)
// The home page's Trending section previews the first products of the `trending` collection (two rows on desktop).
export const TRENDING_LIMIT = 8
// /pages/* routes backed by Shopify's built-in store policies (see components/PolicyPage).
export const POLICY_PAGES: Record<string, 'shipping' | 'refund' | 'privacy' | 'terms'> = { delivery: 'shipping', returns: 'refund', privacy: 'privacy', terms: 'terms' }
export const POLICY_SLUGS = Object.keys(POLICY_PAGES)

export const PRICE_BUCKETS = [
  ['u5', (p: number) => p < 5],
  ['5-10', (p: number) => p >= 5 && p <= 10],
  ['o10', (p: number) => p > 10],
] as const
export type PriceKey = (typeof PRICE_BUCKETS)[number][0]
export const SORTS = ['featured', 'price-asc', 'price-desc'] as const
export type Sort = (typeof SORTS)[number]

const en = {
  announceLabel: 'Announcement', announce: 'Cash on delivery available across Bahrain', announce2: 'Prices in Bahraini dinar',
  mainNav: 'Main', menu: 'Menu', close: 'Close', search: 'Search', searchPh: 'Search car & mobile accessories…',
  searchHint: 'Press Enter to see all results', searchEmpty: 'No matches in the sample catalogue. Try “charger” or “mount”.',
  account: 'Account', wishlist: 'Wishlist', cart: 'Cart', otherLang: 'العربية', switchLang: 'Switch to Arabic', currencyNote: 'Prices in BHD',
  nav: ['Home', 'Car Accessories', 'Mobile Accessories', 'Trending'],
  heroEyebrow: 'Car · Mobile · Trending', heroA: 'Everyday essentials.', heroB: 'Extraordinary finds.',
  heroSub: 'Discover smarter car upgrades, standout mobile accessories, and products worth having.',
  ctaPrimary: 'Shop Trending', ctaSecondary: 'Explore Collections', heroNote1: 'Cash on delivery', heroNote2: 'Delivering across Bahrain',
  slideAria: 'Featured collections', prevSlide: 'Previous slide', nextSlide: 'Next slide',
  slides: [
    ['Car Accessories', 'Drive calmer.', 'Mounts, chargers and organisers for every journey.'],
    ['Mobile Accessories', 'Power that keeps up.', 'Chargers, cables and power banks you can count on.'],
    ['Trending', 'Worth having.', 'The pieces everyone is reaching for this season.'],
  ],
  catEyebrow: 'Collections', catTitle: 'Three ways in.',
  cats: ['Car Accessories', 'Mobile Accessories', 'Trending'],
  trEyebrow: 'Trending right now', trTitle: 'Worth having.', filterLabel: 'Filter products', filters: ['All', 'Car', 'Mobile'], viewAll: 'View all',
  add: 'Add to cart', added: 'Added', soldOut: 'Sold out', inCart: 'in cart',
  badge_new: 'New', badge_sale: 'Offer', badge_trending: 'Trending', catCar: 'Car accessories', catMobile: 'Mobile accessories',
  wishOn: 'Remove from wishlist', wishOff: 'Save to wishlist',
  promoEyebrow: 'The drive collection', promoTitle: 'Upgrade your everyday.',
  promoText: 'Wireless charging mounts, dual-port chargers and quiet organisers — the small things your car has been missing.', promoCta: 'Shop the collection',
  scrollHint: 'Scroll to explore',
  trustEyebrow: 'Our promise', trustTitle: 'Shopping with Bahr',
  trust: [
    ['Cash on delivery', 'Pay in cash when your order arrives at your door.'],
    ['Delivery across Bahrain', 'We deliver throughout the Kingdom. Delivery details are confirmed at checkout.'],
    ['Know before you buy', 'Our returns and exchange terms are set out clearly in one place.', 'Read the returns policy'],
  ] as string[][],
  nlTitle: 'New arrivals, first.', nlText: 'Occasional emails about new products and offers. Unsubscribe any time.', nlLabel: 'Email address',
  nlBtn: 'Subscribe', nlBusy: 'Sending…', nlEmpty: 'Enter your email address.', nlInvalid: 'That email doesn’t look right — please check it.',
  nlUnavailable: 'Sign-up isn’t connected yet, so your email was not saved. Please try again later.', nlOk: 'You’re on the list. Thank you.',
  tagline: 'Everything you need, closer to you.',
  foot: [
    ['Help', ['Delivery', 'Returns & exchanges', 'Contact us', 'FAQ']],
    ['Company', ['About Bahr', 'Privacy policy', 'Terms & conditions']],
  ] as [string, string[]][],
  weAccept: 'Payment', cod: 'Cash on delivery', language: 'Language', rights: (year: number) => `© ${year} Bahr. All rights reserved.`,
  wordmark: ['Ba', 'hr'] as [string, string],
  cartTitle: 'Your cart', cartEmpty: 'Your cart is empty.', subtotal: 'Subtotal', checkout: 'Checkout',
  checkoutNote: 'Delivery and payment are confirmed at checkout.', remove: 'Remove', decrease: 'Decrease quantity', increase: 'Increase quantity',
  cartError: 'Your cart couldn’t be updated. Please try again.',
  toastAdded: 'Added to cart', toastWishOn: 'Saved to wishlist', toastWishOff: 'Removed from wishlist',
  route: (p: string) => `Links to ${p} — that page isn’t part of this build yet.`,
  items: (n: string) => `${n} items`,
  viewProduct: 'View Product', filtersTitle: 'Filters', clearAll: 'Clear all', sortBy: 'Sort by', activeFilters: (n: string) => n === '1' ? '1 filter applied' : `${n} filters applied`,
  sorts: ['Featured', 'Price: low to high', 'Price: high to low'], loading: 'Loading products',
  gCat: 'Category', gPrice: 'Price', gStock: 'Availability', gOffer: 'Offers', inStock: 'In stock only', onOffer: 'On offer',
  priceL: { u5: 'Under BHD 5', '5-10': 'BHD 5 – 10', o10: 'Over BHD 10' } as Record<PriceKey, string>,
  count: (n: string) => n === '1' ? '1 product' : `${n} products`, countOf: (n: string, m: string) => `${n} of ${m} products`,
  showResults: (n: string) => n === '1' ? 'Show 1 result' : `Show ${n} results`, removeFilter: (l: string) => `Remove filter: ${l}`,
  searchChip: (q: string) => `“${q}”`,
  trendNote: 'Products tagged Trending in our catalogue.',
  noResTitle: 'No products match these filters.', noResText: 'Try removing a filter or clearing your search.',
  emptyTitle: 'Nothing here just yet.', emptyText: 'We’re adding products to this collection. In the meantime, take a look at our other collections.',
  errTitle: 'We couldn’t load these products.', errText: 'Please check your connection and try again.', retry: 'Try again',
  backHome: 'Back to home', browseOther: 'Browse trending',
  home: 'Home', breadcrumb: 'Breadcrumb', loadingProduct: 'Loading product',
  inStockL: 'In stock', onlyLeft: (n: string) => `Only ${n} left`, save: (n: string) => `Save ${n}%`,
  wasPrice: 'Was', unavailableSr: 'unavailable', qty: 'Quantity', buyNow: 'Buy now', adding: 'Adding…', chooseOptions: 'Choose options', soldOutSr: 'sold out',
  addFailed: 'This item couldn’t be added to your cart. Please try again.',
  checkoutError: 'We couldn’t start checkout. Please try again.', goingToCheckout: 'Going to checkout…',
  wishAdd: 'Add to wishlist', wishSaved: 'Saved to wishlist',
  sku: 'SKU', category: 'Category', productType: 'Type', vendor: 'Brand',
  description: 'Description', deliveryTitle: 'Delivery & payment', returnsTitle: 'Returns & exchanges', deliveryLink: 'Delivery details',
  gallery: 'Product images', imageOf: (i: string, n: string) => `Image ${i} of ${n}`, prevImage: 'Previous image', nextImage: 'Next image',
  enlarge: 'Enlarge image', noImage: 'No photo yet',
  revEyebrow: 'Customer reviews', revTitle: 'What customers say', revSummary: 'Review summary',
  revBased: (n: string) => n === '1' ? 'Based on 1 review' : `Based on ${n} reviews`, revRecommend: 'would recommend this',
  revPhotos: 'Pictures by customers', revNoPhotos: 'Photos shared by customers will appear here.',
  revComments: 'Comments by customers', revEmptyText: 'Reviews from customers who bought this product will appear here.',
  revRated: (v: string) => `Rated ${v} out of 5`, revRow: (s: string, n: string) => `${s} stars: ${n}`,
  revPhoto: (name: string) => `Photo from ${name}`, revMore: (n: string) => `Show ${n} more photos`,
  revPrev: 'Previous reviews', revNext: 'Next reviews', showLess: 'Show less', revAnon: 'Customer',
  noReviews: 'No reviews yet', reviews: (n: string) => n === '1' ? '1 review' : `${n} reviews`,
  ratedOf: (v: string, n: string) => `Rated ${v} out of 5, ${n === '1' ? '1 review' : `${n} reviews`}`,
  relatedEyebrow: 'From the same collection', relatedTitle: 'You may also like',
  nfTitle: 'We couldn’t find that product.', nfText: 'It may have been removed, or the link may be incorrect.',
  pdpErrTitle: 'We couldn’t load this product.',
  policyTitles: { shipping: 'Delivery policy', refund: 'Returns & refunds', privacy: 'Privacy policy', terms: 'Terms of service' } as Record<'shipping' | 'refund' | 'privacy' | 'terms', string>,
  policyMissing: 'This policy hasn’t been published yet. Please check back soon.', policyErrTitle: 'We couldn’t load this page.',
  crashTitle: 'Something went wrong on this page.', crashText: 'Please reload the page. If it keeps happening, try again a little later.', reload: 'Reload page',
  pageNfTitle: 'We couldn’t find that page.', pageNfText: 'The link may be incorrect, or the page may have moved.',
  cols: {
    car: { label: 'Car Accessories', meta: 'Car accessories — mounts, chargers and organisers, delivered across Bahrain.' },
    mobile: { label: 'Mobile Accessories', meta: 'Mobile accessories — chargers, cables, power banks and stands, delivered across Bahrain.' },
    trending: { label: 'Trending', meta: 'Trending finds from Bahr — standout car and mobile essentials.' },
  } as Record<CollectionKey, { label: string; meta: string }>,
};

export type Strings = typeof en

const ar: Strings = {
  announceLabel: 'إعلان', announce: 'الدفع عند الاستلام متاح في جميع أنحاء البحرين', announce2: 'الأسعار بالدينار البحريني',
  mainNav: 'القائمة الرئيسية', menu: 'القائمة', close: 'إغلاق', search: 'بحث', searchPh: 'ابحث عن إكسسوارات السيارة والجوال…',
  searchHint: 'اضغط Enter لعرض كل النتائج', searchEmpty: 'لا توجد نتائج في الكتالوج التجريبي. جرّب «شاحن» أو «حامل».',
  account: 'حسابي', wishlist: 'المفضلة', cart: 'السلة', otherLang: 'English', switchLang: 'Switch to English', currencyNote: 'الأسعار بالدينار البحريني',
  nav: ['الرئيسية', 'إكسسوارات السيارة', 'إكسسوارات الجوال', 'الأكثر رواجًا'],
  heroEyebrow: 'السيارة · الجوال · الأكثر رواجًا', heroA: 'تفاصيل صغيرة،', heroB: 'فرق كبير.',
  heroSub: 'اكتشف إكسسوارات السيارة والجوال وأحدث المنتجات المختارة لك.',
  ctaPrimary: 'تسوّق الأكثر رواجًا', ctaSecondary: 'استكشف المجموعات', heroNote1: 'الدفع عند الاستلام', heroNote2: 'توصيل في جميع أنحاء البحرين',
  slideAria: 'العروض المميزة', prevSlide: 'الشريحة السابقة', nextSlide: 'الشريحة التالية',
  slides: [
    ['إكسسوارات السيارة', 'قيادة أكثر راحة.', 'حوامل وشواحن ومنظّمات لكل مشوار.'],
    ['إكسسوارات الجوال', 'طاقة تواكب يومك.', 'شواحن وكابلات وباور بانك تعتمد عليها.'],
    ['الأكثر رواجًا', 'تستحق الاقتناء.', 'مختارات يقبل عليها الجميع هذا الموسم.'],
  ],
  catEyebrow: 'المجموعات', catTitle: 'ثلاث وجهات للتسوّق.',
  cats: ['إكسسوارات السيارة', 'إكسسوارات الجوال', 'الأكثر رواجًا'],
  trEyebrow: 'الأكثر رواجًا الآن', trTitle: 'تستحق الاقتناء.', filterLabel: 'تصفية المنتجات', filters: ['الكل', 'السيارة', 'الجوال'], viewAll: 'عرض الكل',
  add: 'أضف إلى السلة', added: 'تمت الإضافة', soldOut: 'نفدت الكمية', inCart: 'في السلة',
  badge_new: 'جديد', badge_sale: 'عرض', badge_trending: 'رائج', catCar: 'إكسسوارات السيارة', catMobile: 'إكسسوارات الجوال',
  wishOn: 'إزالة من المفضلة', wishOff: 'أضف إلى المفضلة',
  promoEyebrow: 'مجموعة القيادة', promoTitle: 'ارتقِ بيومك.',
  promoText: 'حوامل بشحن لاسلكي، وشواحن بمنفذين، ومنظّمات أنيقة — التفاصيل التي كانت تنقص سيارتك.', promoCta: 'تسوّق المجموعة',
  scrollHint: 'مرّر للاكتشاف',
  trustEyebrow: 'وعدنا لك', trustTitle: 'التسوّق مع بحر',
  trust: [
    ['الدفع عند الاستلام', 'ادفع نقدًا عند وصول طلبك إلى باب منزلك.'],
    ['توصيل في جميع أنحاء البحرين', 'نوصل إلى جميع مناطق المملكة، وتُؤكَّد تفاصيل التوصيل عند إتمام الطلب.'],
    ['اعرف قبل أن تشتري', 'شروط الإرجاع والاستبدال موضّحة بالكامل في مكان واحد.', 'اقرأ سياسة الإرجاع'],
  ],
  nlTitle: 'كن أول من يعرف بالجديد.', nlText: 'رسائل متباعدة عن المنتجات الجديدة والعروض. يمكنك إلغاء الاشتراك في أي وقت.', nlLabel: 'البريد الإلكتروني',
  nlBtn: 'اشترك', nlBusy: 'جارٍ الإرسال…', nlEmpty: 'أدخل بريدك الإلكتروني.', nlInvalid: 'يبدو أن البريد الإلكتروني غير صحيح، يُرجى التحقق منه.',
  nlUnavailable: 'خدمة الاشتراك غير مفعّلة بعد، لذلك لم يتم حفظ بريدك. يُرجى المحاولة لاحقًا.', nlOk: 'تم اشتراكك. شكرًا لك.',
  tagline: 'كل ما تحتاجه… أقرب إليك.',
  foot: [
    ['المساعدة', ['التوصيل', 'الإرجاع والاستبدال', 'تواصل معنا', 'الأسئلة الشائعة']],
    ['الشركة', ['عن بحر', 'سياسة الخصوصية', 'الشروط والأحكام']],
  ],
  weAccept: 'الدفع', cod: 'الدفع عند الاستلام', language: 'اللغة', rights: (year: number) => `© ${year} بحر. جميع الحقوق محفوظة.`,
  wordmark: ['بحـ', 'ـر'],
  cartTitle: 'سلة التسوق', cartEmpty: 'سلتك فارغة.', subtotal: 'المجموع الفرعي', checkout: 'إتمام الطلب',
  checkoutNote: 'تُؤكَّد تفاصيل التوصيل والدفع عند إتمام الطلب.', remove: 'إزالة', decrease: 'تقليل الكمية', increase: 'زيادة الكمية',
  cartError: 'تعذّر تحديث سلتك. يُرجى المحاولة مرة أخرى.',
  toastAdded: 'تمت الإضافة إلى السلة', toastWishOn: 'تم الحفظ في المفضلة', toastWishOff: 'تمت الإزالة من المفضلة',
  route: (p: string) => `يؤدي هذا الرابط إلى ${p} — هذه الصفحة ليست ضمن هذه النسخة بعد.`,
  items: (n: string) => `${n} منتجات`,
  viewProduct: 'عرض المنتج', filtersTitle: 'التصفية', clearAll: 'مسح الكل', sortBy: 'ترتيب حسب', activeFilters: (n: string) => `التصفيات المفعّلة: ${n}`,
  sorts: ['المميّزة', 'السعر: من الأقل إلى الأعلى', 'السعر: من الأعلى إلى الأقل'], loading: 'جارٍ تحميل المنتجات',
  gCat: 'الفئة', gPrice: 'السعر', gStock: 'التوفّر', gOffer: 'العروض', inStock: 'المتوفّر فقط', onOffer: 'عليه عرض',
  priceL: { u5: 'أقل من 5 د.ب', '5-10': '5 – 10 د.ب', o10: 'أكثر من 10 د.ب' },
  count: (n: string) => `${n} منتجات`, countOf: (n: string, m: string) => `${n} من ${m} منتجات`,
  showResults: (n: string) => `عرض ${n} نتائج`, removeFilter: (l: string) => `إزالة التصفية: ${l}`,
  searchChip: (q: string) => `«${q}»`,
  trendNote: 'منتجات موسومة بـ«رائج» في الكتالوج.',
  noResTitle: 'لا توجد منتجات تطابق هذه التصفية.', noResText: 'جرّب إزالة أحد الخيارات أو مسح البحث.',
  emptyTitle: 'لا توجد منتجات بعد.', emptyText: 'نعمل على إضافة منتجات إلى هذه المجموعة. في هذه الأثناء، تصفّح مجموعاتنا الأخرى.',
  errTitle: 'تعذّر تحميل المنتجات.', errText: 'يُرجى التحقق من الاتصال والمحاولة مرة أخرى.', retry: 'أعد المحاولة',
  backHome: 'العودة إلى الرئيسية', browseOther: 'تصفّح الأكثر رواجًا',
  home: 'الرئيسية', breadcrumb: 'مسار التنقل', loadingProduct: 'جارٍ تحميل المنتج',
  inStockL: 'متوفّر', onlyLeft: (n: string) => `متبقٍّ ${n} فقط`, save: (n: string) => `وفّر ${n}٪`,
  wasPrice: 'السعر السابق', unavailableSr: 'غير متاح', qty: 'الكمية', buyNow: 'اشترِ الآن', adding: 'جارٍ الإضافة…', chooseOptions: 'اختر الخيارات', soldOutSr: 'نفدت الكمية',
  addFailed: 'تعذّرت إضافة المنتج إلى سلتك. يُرجى المحاولة مرة أخرى.',
  checkoutError: 'تعذّر بدء إتمام الطلب. يُرجى المحاولة مرة أخرى.', goingToCheckout: 'جارٍ الانتقال إلى الدفع…',
  wishAdd: 'أضف إلى المفضلة', wishSaved: 'محفوظ في المفضلة',
  sku: 'رمز المنتج', category: 'الفئة', productType: 'النوع', vendor: 'العلامة التجارية',
  description: 'الوصف', deliveryTitle: 'التوصيل والدفع', returnsTitle: 'الإرجاع والاستبدال', deliveryLink: 'تفاصيل التوصيل',
  gallery: 'صور المنتج', imageOf: (i: string, n: string) => `الصورة ${i} من ${n}`, prevImage: 'الصورة السابقة', nextImage: 'الصورة التالية',
  enlarge: 'تكبير الصورة', noImage: 'لا توجد صورة بعد',
  revEyebrow: 'آراء العملاء', revTitle: 'ماذا يقول عملاؤنا', revSummary: 'ملخص التقييمات',
  revBased: (n: string) => `بناءً على ${n} تقييمات`, revRecommend: 'يوصون بهذا المنتج',
  revPhotos: 'صور العملاء', revNoPhotos: 'ستظهر هنا الصور التي يشاركها العملاء.',
  revComments: 'تعليقات العملاء', revEmptyText: 'ستظهر هنا تقييمات العملاء الذين اشتروا هذا المنتج.',
  revRated: (v: string) => `التقييم ${v} من 5`, revRow: (s: string, n: string) => `${s} نجوم: ${n}`,
  revPhoto: (name: string) => `صورة من ${name}`, revMore: (n: string) => `عرض ${n} صور أخرى`,
  revPrev: 'التقييمات السابقة', revNext: 'التقييمات التالية', showLess: 'عرض أقل', revAnon: 'عميل',
  noReviews: 'لا توجد تقييمات بعد', reviews: (n: string) => `${n} تقييمات`,
  ratedOf: (v: string, n: string) => `التقييم ${v} من 5، ${n} تقييمات`,
  relatedEyebrow: 'من المجموعة نفسها', relatedTitle: 'قد يعجبك أيضًا',
  nfTitle: 'لم نعثر على هذا المنتج.', nfText: 'ربما أُزيل المنتج، أو أن الرابط غير صحيح.',
  pdpErrTitle: 'تعذّر تحميل هذا المنتج.',
  policyTitles: { shipping: 'سياسة التوصيل', refund: 'الإرجاع والاسترداد', privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة' },
  policyMissing: 'لم تُنشر هذه السياسة بعد. يُرجى العودة لاحقًا.', policyErrTitle: 'تعذّر تحميل هذه الصفحة.',
  crashTitle: 'حدث خطأ في هذه الصفحة.', crashText: 'يُرجى إعادة تحميل الصفحة. إذا تكرر الأمر، حاول مرة أخرى بعد قليل.', reload: 'إعادة تحميل الصفحة',
  pageNfTitle: 'لم نعثر على هذه الصفحة.', pageNfText: 'ربما يكون الرابط غير صحيح، أو نُقلت الصفحة.',
  cols: {
    car: { label: 'إكسسوارات السيارة', meta: 'إكسسوارات السيارة من بحر.' },
    mobile: { label: 'إكسسوارات الجوال', meta: 'إكسسوارات الجوال من بحر.' },
    trending: { label: 'الأكثر رواجًا', meta: 'المختارات الرائجة من بحر.' },
  },
};

export const T: Record<Lang, Strings> = { en, ar }
