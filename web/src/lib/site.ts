// Everything the landing page says lives here, so copy and settings change in one place.

export const site = {
  name: "MamaLine",
  tagline: "Pregnancy and baby care on any phone",
  // The USSD code is a sandbox placeholder. Set `ussdLive` to true only once the
  // code is live on the networks, so nobody dials a code that is not yours yet.
  ussdCode: "*384*2#",
  ussdLive: false,
  pilotArea: "our first pilot communities",
  // Leave contact details empty until they are real; empty values are not shown.
  contactEmail: "",
  contactPhone: "",
};

export const nav = [
  { href: "#top", label: "Home" },
  { href: "#services", label: "What we do" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#health-workers", label: "Health workers" },
  { href: "#safety", label: "Safety" },
  { href: "#partner", label: "Partner with us" },
];

// "Welcome" in each language MamaLine speaks (shown in the hero when a language is picked).
export const greetings = [
  { code: "en", label: "English", greeting: "Welcome" },
  { code: "pcm", label: "Pidgin", greeting: "Welcome o" },
  { code: "ha", label: "Hausa", greeting: "Barka da zuwa" },
  { code: "yo", label: "Yoruba", greeting: "E kaabo" },
  { code: "ig", label: "Igbo", greeting: "Nnoo" },
];

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

// Free-licence photos from Unsplash. `page` is the photo's Unsplash page, for credits.
export const photos = {
  hero: {
    src: unsplash("1487546331507-fcf8a5d27ab3"),
    alt: "A mother in a patterned head wrap carries her baby on her back among green trees",
    page: "https://unsplash.com/photos/woman-carrying-baby-on-back-yrzBgqapG1I",
  },
  pregnancy: {
    src: unsplash("1710897537209-392c74a1c299"),
    alt: "A smiling pregnant woman holds her belly",
    page: "https://unsplash.com/photos/a-pregnant-woman-standing-with-her-hands-on-her-belly-f6g66MhD84s",
  },
  baby: {
    src: unsplash("1746766414005-ee349f5f12bf"),
    alt: "A mother holds her newborn baby outside her home",
    page: "https://unsplash.com/photos/a-mother-holds-her-baby-gently-and-tenderly-sgjI2jzC1wg",
  },
  clinicVisit: {
    src: unsplash("1677682693104-bc4758db3b45"),
    alt: "A health worker in a pink uniform cares for a mother lying on a patterned wrapper",
    page: "https://unsplash.com/photos/a-woman-in-a-pink-shirt-and-a-woman-in-a-green-and-yellow-dress-e_4u1tobpbg",
  },
  healthWorkerPhone: {
    src: unsplash("1576091160399-112ba8d25d1d"),
    alt: "A health worker with a stethoscope reads a message on a phone",
    page: "https://unsplash.com/photos/person-wearing-lavatory-gown-with-green-stethoscope-on-neck-using-phone-while-standing-L8tWZT4CcVQ",
  },
  ward: {
    src: unsplash("1677682693111-c7c6a60c362a"),
    alt: "A mother holds her baby on a hospital bed while a health worker sits beside her",
    page: "https://unsplash.com/photos/a-woman-holding-a-baby-in-a-hospital-bed-q7PY6bXbmzk",
  },
  onThePhone: {
    src: unsplash("1686723726446-8b881f37ce62"),
    alt: "A young woman in an orange top talks on her phone",
    page: "https://unsplash.com/photos/a-woman-in-an-orange-shirt-talking-on-a-cell-phone-bLwHevBwxK0",
  },
  motherAndChild: {
    src: unsplash("1591451855781-9eb0f9726a33"),
    alt: "A smiling mother holds her baby",
    page: "https://unsplash.com/photos/woman-in-orange-shirt-carrying-baby-in-white-and-blue-floral-shirt-3Qi0PkM_Wes",
  },
};

export const services = [
  {
    title: ["Antenatal", "reminders"],
    text: "A reminder 2 days before and on the day of all 8 antenatal visits, plus a tip for each week of pregnancy.",
    photo: photos.pregnancy,
    href: "#how-it-works",
  },
  {
    title: ["Vaccine", "reminders"],
    text: "Every vaccine on Nigeria's routine schedule, from birth to 15 months, with a nudge when one is missed.",
    photo: photos.baby,
    href: "#how-it-works",
  },
  {
    title: ["Danger-sign", "help"],
    text: "Two key presses name the nearest facility, give the emergency number 112 and alert her health worker.",
    photo: photos.clinicVisit,
    href: "#try",
  },
  {
    title: ["For health", "workers"],
    text: "Register mothers by USSD, get urgent alerts, and work from a follow-up list instead of paper.",
    photo: photos.healthWorkerPhone,
    href: "#health-workers",
    featured: true,
  },
];

export const steps = [
  {
    title: "Register in a minute",
    text: "A mother dials the code, picks her language and enters her months of pregnancy or her baby's age. Her community health worker can register her instead.",
  },
  {
    title: "Reminders arrive by SMS",
    text: "Visit and vaccine reminders, and a tip for each stage, arrive as plain SMS that work on the most basic phone.",
  },
  {
    title: "Help when it matters",
    text: "If she reports a danger sign, she is told where to go now, and her health worker gets an alert at the same moment.",
  },
];

// Checked figures with their sources; keep this list in step with the application.
export const stats = [
  {
    value: "993",
    label: "maternal deaths per 100,000 live births",
    source: "WHO estimate, via Nigeria Health Watch, 2025",
    href: "https://nigeriahealthwatch.com/articles/thought-leadership/maternal-deaths-in-nigeria-when-systemic-neglect-meets-medical-complications/",
  },
  {
    value: "2.1M",
    label: "babies under one who have had no vaccine",
    source: "UNICEF, via Premium Times, 2025",
    href: "https://www.premiumtimesng.com/health/health-news/791398-nigeria-has-the-highest-number-of-unvaccinated-children-globally-unicef.html",
  },
  {
    value: "1 : 9,083",
    label: "doctors to people, against 1 : 600 recommended",
    source: "The Lancet, via Nigeria Health Watch",
    href: "https://nigeriahealthwatch.com/articles/thought-leadership/maternal-deaths-in-nigeria-when-systemic-neglect-meets-medical-complications/",
  },
  {
    value: "28%",
    label: "of adults own a smartphone",
    source: "Research ICT Africa, via Technology Times, 2025",
    href: "https://technologytimes.ng/survey-72-of-nigerian-adults-lack-smartphones/",
  },
];

export const safety = [
  "Fixed safety rules read every message before the AI does, and the AI can only raise urgency, never lower it.",
  "Emergency messages are fixed templates that name the facility and 112, and a clinician reviews every message before launch.",
  "MamaLine never diagnoses, and never names or doses a medicine.",
];
