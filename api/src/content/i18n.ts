// USSD screens and SMS templates.
// Basic phones use the GSM 7-bit alphabet, so all copy is plain ASCII (no tone marks).
// Hausa, Yoruba and Igbo menus are DRAFT translations for review by native speakers.
// Danger-sign lists and SMS templates exist in English and Pidgin only: medical wording in
// other languages must come from a professional translator, so those users see English here
// (or an AI translation of the SMS when AI is enabled).

export const LANG_CODES = ["en", "pcm", "ha", "yo", "ig"] as const; // menu order 1-5
export type Lang = (typeof LANG_CODES)[number];
export const LANG_NAMES: Record<Lang, string> = { en: "English", pcm: "Nigerian Pidgin", ha: "Hausa", yo: "Yoruba", ig: "Igbo" };

type Vars = Record<string, string | number>;

export const CHOOSE_LANGUAGE =
  "Welcome to MamaLine\nChoose language / Zabi harshe / Yan ede / Horo asusu\n1. English\n2. Pidgin\n3. Hausa\n4. Yoruba\n5. Igbo";

// Danger signs from WHO pregnancy, postnatal and newborn-care guidance. Every one means "go now".
export const SIGN_GROUPS = {
  pregnant: ["bleeding", "fits", "headache", "swelling", "fever", "bellypain", "breathing", "movement", "water"],
  mother: ["heavybleeding", "fits", "headache", "fever_discharge", "bellypain", "breathing"],
  baby: ["feeding", "fits", "fastbreathing", "temperature", "sleepy", "yellow", "cord"],
} as const;
export type SignGroup = keyof typeof SIGN_GROUPS;
export type Sign = (typeof SIGN_GROUPS)[SignGroup][number];

const SIGN_LABELS: Record<"en" | "pcm", Record<Sign, string>> = {
  en: {
    bleeding: "Bleeding", fits: "Fits", headache: "Headache/blurred eyes", swelling: "Swollen face/hands",
    fever: "High fever", bellypain: "Bad belly pain", breathing: "Hard breathing", movement: "Baby moves less",
    water: "Water broke", heavybleeding: "Heavy bleeding", fever_discharge: "Fever or bad-smelling discharge",
    feeding: "Not feeding well", fastbreathing: "Fast or hard breathing", temperature: "Very hot or cold",
    sleepy: "Very sleepy, not moving", yellow: "Yellow palms or soles", cord: "Red or pus at cord",
  },
  pcm: {
    bleeding: "Blood", fits: "Fits", headache: "Headache, eye no clear", swelling: "Face/hand swell",
    fever: "Strong fever", bellypain: "Bad belly pain", breathing: "Hard breathing", movement: "Pikin no move well",
    water: "Water break", heavybleeding: "Plenty blood", fever_discharge: "Fever or bad smell discharge",
    feeding: "No dey suck breast", fastbreathing: "Breathing fast or hard", temperature: "Body too hot or cold",
    sleepy: "Sleep too much, weak", yellow: "Palm or foot yellow", cord: "Cord red or get pus",
  },
};

const STRINGS = {
  en: {
    newMain: "MamaLine: free help for mothers\n1. I am pregnant\n2. I have a baby under 1 year\n3. Danger sign - get help now\n4. Ask a health question",
    main: "MamaLine\n1. Danger sign - get help now\n2. Ask a health question\n3. My next visit\n4. Find a clinic\n5. I went for my visit\n6. Change language",
    askMonths: "How many months pregnant are you? (1-9)",
    askBabyWeeks: "How many weeks old is your baby? (0-52)",
    askLocation: "Enter your village or LGA:",
    welcomePregnant: "Welcome to MamaLine. You are about {weeks} weeks pregnant. Free tips and visit reminders will come by SMS.",
    welcomeBaby: "Welcome to MamaLine. Free vaccine reminders and baby care tips will come by SMS.",
    whoNeedsHelp: "Who needs help?\n1. Pregnant woman\n2. Mother after birth\n3. Baby",
    whoIsSick: "Who is sick?\n1. Me\n2. My baby",
    signsTitle: "Danger signs:",
    other: "Other problem",
    describe: "Describe the problem:",
    emergency: "DANGER SIGN. Go to {facility} now. Call 112 if you need help getting there.",
    alerted: "Your health worker has been alerted.",
    triageThanks: "Thank you. Advice is coming by SMS now. If it gets worse, go to a clinic.",
    askQuestion: "Type your question:",
    questionThanks: "Thank you. Your answer will come by SMS in about 1 minute.",
    nextVisit: "Next: {item}, around {date}, at {facility}.",
    noNextVisit: "Nothing is due now. We will remind you by SMS.",
    clinic: "Nearest clinic: {facility}. Details are coming by SMS.",
    didYouGo: "Did you go for: {item}?\n1. Yes\n2. Not yet",
    wentThanks: "Thank you! Well done for keeping you and your baby safe.",
    notYet: "Please go soon to {facility}.",
    langSet: "Language set to English.",
    invalid: "Invalid choice. Please dial again.",
    ancItem: "antenatal visit (week {week})",
    vaccineItem: "baby's {label} vaccines",
    // Consent: shown before anything is stored (self-registration) or sent (health worker registration).
    consentAsk: "MamaLine sends free health SMS. We keep your phone number, dates and village private, shared only with your health worker.\n1. I agree\n2. No",
    consentPending: "Your health worker registered you for free MamaLine health SMS. We keep your number, dates and village private.\n1. I agree\n2. No, delete my details\n0. Danger sign",
    consentThanks: "Thank you. You are now registered. Your first message is coming by SMS.",
    consentRefused: "OK. Your details have been deleted. You can join any time by dialling this code.",
    selfRefused: "OK. Nothing has been saved.",
  },
  pcm: {
    newMain: "MamaLine: free help for mothers\n1. I get belle\n2. I get pikin under 1 year\n3. Danger sign - help now\n4. Ask health question",
    main: "MamaLine\n1. Danger sign - help now\n2. Ask health question\n3. My next visit\n4. Find clinic\n5. I don go my visit\n6. Change language",
    askMonths: "How many months your belle be? (1-9)",
    askBabyWeeks: "How many weeks your pikin be? (0-52)",
    askLocation: "Write your village or LGA:",
    welcomePregnant: "Welcome to MamaLine. Your belle be like {weeks} weeks. Free tips and visit reminder go come by SMS.",
    welcomeBaby: "Welcome to MamaLine. Free vaccine reminder and pikin care tips go come by SMS.",
    whoNeedsHelp: "Who need help?\n1. Woman wey get belle\n2. Mother wey just born\n3. Pikin",
    whoIsSick: "Who dey sick?\n1. Me\n2. My pikin",
    signsTitle: "Danger signs:",
    other: "Other problem",
    describe: "Talk wetin happen:",
    emergency: "DANGER SIGN. Go {facility} now. Call 112 if you need help to reach there.",
    alerted: "We don tell your health worker.",
    triageThanks: "Thank you. Advice dey come by SMS now. If e worse, go clinic.",
    askQuestion: "Type your question:",
    questionThanks: "Thank you. Your answer go come by SMS for like 1 minute.",
    nextVisit: "Next: {item}, around {date}, for {facility}.",
    noNextVisit: "Nothing dey due now. We go remind you by SMS.",
    clinic: "Nearest clinic: {facility}. Details dey come by SMS.",
    didYouGo: "You don go for: {item}?\n1. Yes\n2. Not yet",
    wentThanks: "Thank you! Well done as you dey keep yourself and pikin safe.",
    notYet: "Abeg go {facility} soon.",
    langSet: "Language don change to Pidgin.",
    invalid: "Wrong choice. Abeg dial again.",
    ancItem: "antenatal visit (week {week})",
    vaccineItem: "pikin {label} vaccine",
    consentAsk: "MamaLine dey send free health SMS. We go keep your number, dates and village private, na only your health worker go see am.\n1. I agree\n2. No",
    consentPending: "Your health worker register you for free MamaLine health SMS. We go keep your number, dates and village private.\n1. I agree\n2. No, delete my details\n0. Danger sign",
    consentThanks: "Thank you. You don register. Your first message dey come by SMS.",
    consentRefused: "OK. We don delete your details. You fit join any time if you dial this code.",
    selfRefused: "OK. We no save anything.",
  },
  ha: {
    newMain: "MamaLine: taimako kyauta ga iyaye mata\n1. Ina da ciki\n2. Ina da jariri kasa da shekara 1\n3. Alamar hadari - taimako yanzu\n4. Yi tambayar lafiya",
    main: "MamaLine\n1. Alamar hadari - taimako yanzu\n2. Yi tambayar lafiya\n3. Ziyarata ta gaba\n4. Nemo asibiti\n5. Na je ziyarata\n6. Canza harshe",
    askMonths: "Watan cikinki nawa? (1-9)",
    askBabyWeeks: "Jaririnki yana da makonni nawa? (0-52)",
    askLocation: "Rubuta kauyenki ko karamar hukuma:",
    welcomePregnant: "Barka da zuwa MamaLine. Cikinki ya kai kimanin makonni {weeks}. Shawarwari da tunatarwa za su zo ta SMS kyauta.",
    welcomeBaby: "Barka da zuwa MamaLine. Tunatarwar allurar rigakafi da shawarwari za su zo ta SMS kyauta.",
    whoNeedsHelp: "Wa ke bukatar taimako?\n1. Mai ciki\n2. Uwa bayan haihuwa\n3. Jariri",
    whoIsSick: "Wa ke rashin lafiya?\n1. Ni\n2. Jaririna",
    describe: "Bayyana matsalar:",
    emergency: "ALAMAR HADARI. Je {facility} yanzu. Kira 112 idan kina bukatar taimako.",
    alerted: "An sanar da ma'aikaciyar lafiyarki.",
    triageThanks: "Na gode. Shawara na zuwa ta SMS yanzu. Idan ya tsananta, je asibiti.",
    askQuestion: "Rubuta tambayarki:",
    questionThanks: "Na gode. Amsarki za ta zo ta SMS cikin minti 1.",
    noNextVisit: "Babu abin da ya zo yanzu. Za mu tunatar da ke ta SMS.",
    clinic: "Asibiti mafi kusa: {facility}. Bayani na zuwa ta SMS.",
    wentThanks: "Na gode! Kin yi kyau wajen kare kanki da jaririnki.",
    notYet: "Don Allah ki je {facility} da wuri.",
    langSet: "An canza harshe zuwa Hausa.",
    invalid: "Zabi ba daidai ba. Sake kira.",
  },
  yo: {
    newMain: "MamaLine: iranlowo ofe fun awon iya\n1. Mo loyun\n2. Mo ni omo ti ko to odun 1\n3. Ami ewu - iranlowo bayi\n4. Beere ibeere ilera",
    main: "MamaLine\n1. Ami ewu - iranlowo bayi\n2. Beere ibeere ilera\n3. Ibewo mi to kan\n4. Wa ile iwosan\n5. Mo ti lo fun ibewo mi\n6. Yi ede pada",
    askMonths: "Osu meloo ni oyun re? (1-9)",
    askBabyWeeks: "Ose meloo ni omo re? (0-52)",
    askLocation: "Ko abule re tabi ijoba ibile re:",
    welcomePregnant: "E kaabo si MamaLine. Oyun re to bi ose {weeks}. Imoran ati iranti ibewo yoo de nipase SMS lofe.",
    welcomeBaby: "E kaabo si MamaLine. Iranti abere ajesara ati imoran yoo de nipase SMS lofe.",
    whoNeedsHelp: "Tani o nilo iranlowo?\n1. Alaboyun\n2. Iya leyin ibimo\n3. Omo",
    whoIsSick: "Tani o n saisan?\n1. Emi\n2. Omo mi",
    describe: "Se alaye isoro naa:",
    emergency: "AMI EWU. Lo si {facility} bayi. Pe 112 ti o ba nilo iranlowo.",
    alerted: "A ti so fun osise ilera re.",
    triageThanks: "E se. Imoran n bo nipase SMS bayi. Ti o ba buru si, lo si ile iwosan.",
    askQuestion: "Ko ibeere re:",
    questionThanks: "E se. Idahun re yoo de nipase SMS laarin iseju kan.",
    noNextVisit: "Ko si ohun to kan bayi. A o ran o leti nipase SMS.",
    clinic: "Ile iwosan to sunmo: {facility}. Alaye n bo nipase SMS.",
    wentThanks: "E se! O se daadaa lati daabo bo ara re ati omo re.",
    notYet: "Jowo lo si {facility} laipe.",
    langSet: "A ti yi ede pada si Yoruba.",
    invalid: "Asayan ko tona. Jowo pe lekan si.",
  },
  ig: {
    newMain: "MamaLine: enyemaka n'efu maka ndi nne\n1. Adi m ime\n2. Enwere m nwa erubeghi afo 1\n3. Ihe egwu - enyemaka ugbu a\n4. Juo ajuju ahuike",
    main: "MamaLine\n1. Ihe egwu - enyemaka ugbu a\n2. Juo ajuju ahuike\n3. Nleta m ozo\n4. Choo ulo ogwu\n5. Agara m nleta m\n6. Gbanwee asusu",
    askMonths: "Onwa ole ka i ji ime? (1-9)",
    askBabyWeeks: "Izu ole ka nwa gi di? (0-52)",
    askLocation: "Dee obodo gi ma obu LGA gi:",
    welcomePregnant: "Nnoo na MamaLine. Ime gi di ihe dika izu {weeks}. Ndumodu na ncheta ga-abia site na SMS n'efu.",
    welcomeBaby: "Nnoo na MamaLine. Ncheta ogwu mgbochi na ndumodu ga-abia site na SMS n'efu.",
    whoNeedsHelp: "Onye choro enyemaka?\n1. Nwanyi di ime\n2. Nne mgbe omumu\n3. Nwa",
    whoIsSick: "Onye na-aria oria?\n1. Mu onwe m\n2. Nwa m",
    describe: "Kowaa nsogbu ahu:",
    emergency: "IHE EGWU. Gaa {facility} ugbu a. Kpoo 112 ma i choro enyemaka.",
    alerted: "Anyi agwala onye oru ahuike gi.",
    triageThanks: "Daalu. Ndumodu na-abia site na SMS ugbu a. Oburu na o kawanye njo, gaa ulo ogwu.",
    askQuestion: "Dee ajuju gi:",
    questionThanks: "Daalu. Aziza gi ga-abia site na SMS n'ime otu nkeji.",
    noNextVisit: "Odighi ihe ruru ugbu a. Anyi ga-echetara gi site na SMS.",
    clinic: "Ulo ogwu kacha nso: {facility}. Nkowa na-abia site na SMS.",
    wentThanks: "Daalu! I mere nke oma ichedo onwe gi na nwa gi.",
    notYet: "Biko gaa {facility} ngwa ngwa.",
    langSet: "Asusu agbanweela gaa na Igbo.",
    invalid: "Nhoro ezighi ezi. Biko kpoo ozo.",
  },
} satisfies Record<Lang, Record<string, string>>;
export type StringKey = keyof typeof STRINGS.en;

// Health-worker (CHEW) screens are in English, the working language of PHC records.
export const CHEW = {
  pinPrompt: "MamaLine Health Worker\nEnter your 4-digit PIN:",
  wrongPin: "Wrong PIN. After 3 wrong tries, access pauses for 15 minutes.",
  locked: "Too many wrong PINs. Try again in 15 minutes or ask your supervisor.",
  noPin: "Your PIN is not set yet. Ask your supervisor to set it.",
  main: "MamaLine Health Worker\n1. Register pregnant woman\n2. Register baby\n3. Send my follow-up list\n4. Change my PIN",
  phone: "Mother's phone number:",
  already: "{phone} is already on MamaLine. Nothing was changed.",
  lang: "Her language:\n1. English\n2. Pidgin\n3. Hausa\n4. Yoruba\n5. Igbo",
  months: "Months pregnant (1-9):",
  weeks: "Baby's age in weeks (0-52):",
  location: "Village or LGA:",
  registered: "Consent request sent to {phone}. Reminders start once she agrees. Please explain MamaLine to her now.",
  followups: "Your follow-up list is coming by SMS.",
  newPin: "Enter a new 4-digit PIN:",
  confirmPin: "Enter the new PIN again:",
  weakPin: "That PIN is too easy to guess. Avoid repeats or runs like 1111 or 1234.",
  pinMismatch: "The two PINs did not match. Please dial again.",
  pinChanged: "Your PIN has been changed.",
  invalid: "Invalid entry. Please dial again.",
};

// SMS templates (English and Pidgin).
const SMS = {
  en: {
    welcomePregnant: "MamaLine: Welcome! You are about {weeks} weeks pregnant. Next: {next}. Your clinic: {facility}. For a danger sign, dial {code} and press 1. Reply STOP to leave.",
    welcomeBaby: "MamaLine: Welcome! Your baby is {weeks} weeks old. Next: {next}. Your clinic: {facility}. For a danger sign, dial {code} and press 1. Reply STOP to leave.",
    consentRequest: "MamaLine: {worker} registered you for free pregnancy and baby health SMS. We keep your number, dates and village private, shared only with your health worker. Reply YES to agree, or NO to delete your details.",
    optedOut: "MamaLine: You have left MamaLine and your details have been deleted. Dial {code} any time to join again.",
    ancPre: "MamaLine: Your antenatal visit (week {week}) is due on {date} at {facility}. Take your antenatal card.",
    ancDue: "MamaLine: Your antenatal visit (week {week}) is due now at {facility}. After you go, dial {code} and press 5 to tell us.",
    ancMissed: "MamaLine: We have not heard about your antenatal visit (week {week}). Please go to {facility} this week. Regular visits keep you and your baby safe.",
    vaccinePre: "MamaLine: Your baby's {label} vaccines ({names}) are due on {date} at {facility}. Vaccines are free and protect your baby from deadly diseases.",
    vaccineDue: "MamaLine: Your baby's {label} vaccines ({names}) are due now at {facility}. After you go, dial {code} and press 5 to tell us.",
    vaccineMissed: "MamaLine: Your baby has not had the {label} vaccines ({names}) yet. Please go to {facility} this week. It is not too late.",
    emergencyMother: "MamaLine URGENT: {sign} is a danger sign. Go to {facility} now with your card and someone to help you. Call 112 if you need help getting there. Do not wait.",
    emergencyBaby: "MamaLine URGENT: {sign} in a baby is a danger sign. Take your baby to {facility} now. Keep the baby warm and breastfeed on the way if the baby can feed. Call 112 if you need help.",
    soon: "MamaLine: Thank you for telling us. Please see a health worker at {facility} within 1 day. If you see a danger sign, go now or call 112. Your health worker will check on you.",
    noAnswer: "MamaLine: We cannot answer this one by SMS. A health worker will call you soon. If you see a danger sign, go to a clinic now.",
    clinic: "MamaLine: Your nearest clinic is {facility} ({lga}, {state}). Services: {services}. Take your antenatal or vaccination card.",
    nearestFacility: "the nearest health facility",
  },
  pcm: {
    welcomePregnant: "MamaLine: Welcome! Your belle be like {weeks} weeks. Next: {next}. Your clinic: {facility}. If danger sign show, dial {code} press 1. Reply STOP to comot.",
    welcomeBaby: "MamaLine: Welcome! Your pikin be {weeks} weeks. Next: {next}. Your clinic: {facility}. If danger sign show, dial {code} press 1. Reply STOP to comot.",
    consentRequest: "MamaLine: {worker} register you for free health SMS for you and your pikin. We go keep your number, dates and village private, na only your health worker go see am. Reply YES to agree, or NO make we delete your details.",
    optedOut: "MamaLine: You don comot for MamaLine and we don delete your details. Dial {code} any time to join again.",
    ancPre: "MamaLine: Your antenatal visit (week {week}) go be {date} for {facility}. Carry your antenatal card.",
    ancDue: "MamaLine: Your antenatal visit (week {week}) don reach now for {facility}. After you go, dial {code} press 5 tell us.",
    ancMissed: "MamaLine: We never hear about your antenatal visit (week {week}). Abeg go {facility} this week. Regular visit dey keep you and your pikin safe.",
    vaccinePre: "MamaLine: Your pikin {label} vaccine ({names}) go be {date} for {facility}. Vaccine dey free and e dey protect pikin from killer sickness.",
    vaccineDue: "MamaLine: Your pikin {label} vaccine ({names}) don reach now for {facility}. After you go, dial {code} press 5 tell us.",
    vaccineMissed: "MamaLine: Your pikin never take the {label} vaccine ({names}). Abeg go {facility} this week. E never too late.",
    emergencyMother: "MamaLine URGENT: {sign} na danger sign. Go {facility} now with your card and person wey go help you. Call 112 if you need help to reach there. No wait.",
    emergencyBaby: "MamaLine URGENT: {sign} for pikin na danger sign. Carry am go {facility} now. Keep am warm and give breast for road if e fit suck. Call 112 if you need help.",
    soon: "MamaLine: Thank you as you tell us. Abeg see health worker for {facility} within 1 day. If danger sign show, go now or call 112. Your health worker go check on you.",
    noAnswer: "MamaLine: We no fit answer this one by SMS. Health worker go call you soon. If danger sign show, go clinic now.",
    clinic: "MamaLine: Your nearest clinic na {facility} ({lga}, {state}). Services: {services}. Carry your antenatal or vaccine card.",
    nearestFacility: "the nearest clinic",
  },
};
export type SmsKey = keyof typeof SMS.en;

function fill(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

// USSD string, falling back to English when a translation is missing.
export function t(lang: Lang, key: StringKey, vars: Vars = {}): string {
  const table: Partial<Record<StringKey, string>> = STRINGS[lang];
  return fill(table[key] ?? STRINGS.en[key], vars);
}

// SMS template in English or Pidgin. Other languages get English (translated later if AI is on).
export function sms(lang: Lang, key: SmsKey, vars: Vars = {}): string {
  return fill((lang === "pcm" ? SMS.pcm : SMS.en)[key], vars);
}

export function signLabel(lang: Lang, sign: Sign): string {
  return (lang === "pcm" ? SIGN_LABELS.pcm : SIGN_LABELS.en)[sign];
}

// Signs are numbered 1-9 and "0. Other problem" so the list fits one USSD screen.
export function signMenu(lang: Lang, group: SignGroup): string {
  const lines = SIGN_GROUPS[group].map((s, i) => `${i + 1}. ${signLabel(lang, s)}`);
  return [t(lang, "signsTitle"), ...lines, `0. ${t(lang, "other")}`].join("\n");
}
