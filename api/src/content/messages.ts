// Validated health messages: weekly tips and answers to common questions.
// DEMO CONTENT drawn from WHO antenatal, postnatal and newborn-care guidance. A clinician (midwife, nurse or doctor) must review and approve every message before any pilot with real mothers.
// Generated from service/knowledge/content.json; edit both until the prototype is retired.

export type Tip = { id: string; track: 'pregnancy' | 'baby'; week: number; keywords: string[]; sms: { en: string; pcm: string } };
export type Faq = { id: string; keywords: string[]; sms: { en: string; pcm: string } };

export const TIPS: Tip[] = [
  {
    id: "preg-08",
    track: "pregnancy",
    week: 0,
    keywords: ["first", "visit", "start", "test", "tests", "hiv", "iron", "folic", "tablet", "tablets", "anaemia", "blood"],
    sms: { en: "MamaLine: Go for your first antenatal visit before 12 weeks. You will be tested for HIV, syphilis and anaemia and given iron and folic acid tablets. Take one every day.", pcm: "MamaLine: Go for your first antenatal visit before 3 months. Dem go test you for HIV, syphilis and blood level, and give you iron and folic acid. Take am every day." },
  },
  {
    id: "preg-12",
    track: "pregnancy",
    week: 12,
    keywords: ["malaria", "net", "mosquito", "sp", "tetanus", "td", "injection", "prevent", "prevention"],
    sms: { en: "MamaLine: Sleep under a treated mosquito net every night. Malaria is dangerous for you and your baby. At your visit, ask about malaria prevention medicine (SP) and the tetanus vaccine (Td).", pcm: "MamaLine: Sleep inside treated mosquito net every night. Malaria dey dangerous for you and your pikin. For your visit, ask about malaria prevention medicine (SP) and tetanus injection (Td)." },
  },
  {
    id: "preg-16",
    track: "pregnancy",
    week: 16,
    keywords: ["eat", "food", "foods", "diet", "chop", "nutrition", "water", "drink", "beans", "egg", "eggs", "fish", "meat", "vegetable", "vegetables", "fruit"],
    sms: { en: "MamaLine: Eat a mix of foods each day: beans, eggs, fish or meat, green vegetables, fruit and grains. Drink clean water. Keep taking your iron and folic acid tablets.", pcm: "MamaLine: Chop different food every day: beans, egg, fish or meat, green vegetable, fruit and grains. Drink clean water. Continue to take your iron and folic acid." },
  },
  {
    id: "preg-20",
    track: "pregnancy",
    week: 20,
    keywords: ["move", "moving", "movement", "kick", "kicking", "feel"],
    sms: { en: "MamaLine: You may start to feel your baby move. Later in pregnancy, if the baby moves less than usual, go to the clinic the same day.", pcm: "MamaLine: You fit don dey feel your pikin dey move. Later for pregnancy, if pikin no dey move like before, go clinic that same day." },
  },
  {
    id: "preg-24",
    track: "pregnancy",
    week: 24,
    keywords: ["danger", "sign", "signs", "warning", "emergency"],
    sms: { en: "MamaLine: Danger signs: bleeding, fits, bad headache or blurred eyes, swollen face, high fever, bad belly pain, hard breathing, water breaking early. If you see one, go to the clinic now.", pcm: "MamaLine: Danger signs: blood, fits, strong headache or eye no clear, face swell, strong fever, strong belly pain, hard breathing, water break early. If you see one, go clinic now." },
  },
  {
    id: "preg-28",
    track: "pregnancy",
    week: 28,
    keywords: ["birth", "plan", "deliver", "delivery", "where", "born", "hospital", "clinic", "transport", "money"],
    sms: { en: "MamaLine: Make a birth plan now: which clinic you will give birth in, how you will get there, who will go with you, and money for transport. Giving birth with a skilled health worker saves lives.", pcm: "MamaLine: Plan your birth now: which clinic you go born for, how you go reach there, who go follow you, and transport money. To born with trained health worker dey save life." },
  },
  {
    id: "preg-32",
    track: "pregnancy",
    week: 32,
    keywords: ["items", "things", "prepare", "ready", "bag", "cloth", "cloths", "pads", "card"],
    sms: { en: "MamaLine: Get your delivery items ready: clean cloths, wrappers for the baby, soap, sanitary pads and your antenatal card. Keep phone credit and transport money ready at all times.", pcm: "MamaLine: Arrange your delivery things: clean cloth, wrapper for pikin, soap, pad and your antenatal card. Keep phone credit and transport money ready every time." },
  },
  {
    id: "preg-36",
    track: "pregnancy",
    week: 36,
    keywords: ["labour", "labor", "contraction", "contractions", "pains", "show", "mucus", "start", "starting"],
    sms: { en: "MamaLine: Labour signs: regular painful contractions, a show of blood-stained mucus, or your water breaking. When they start, go to your clinic. If you bleed heavily or have fits, go immediately.", pcm: "MamaLine: Labour signs: belly pain wey dey come regular, small blood with mucus, or water break. When e start, go your clinic. If plenty blood or fits, go immediately." },
  },
  {
    id: "preg-39",
    track: "pregnancy",
    week: 39,
    keywords: ["breastfeed", "breastfeeding", "breast", "milk", "colostrum", "after", "cord"],
    sms: { en: "MamaLine: After birth, put the baby on your bare chest and breastfeed within 1 hour. Give only breast milk for 6 months, not even water. Keep the cord clean and dry.", pcm: "MamaLine: When you born, put pikin for your chest and give am breast within 1 hour. Give only breast milk for 6 months, no water. Keep the cord clean and dry." },
  },
  {
    id: "baby-00",
    track: "baby",
    week: 0,
    keywords: ["newborn", "warm", "cord", "bcg", "birth", "first"],
    sms: { en: "MamaLine: Welcome, baby! If not yet given, take your baby for BCG, polio and hepatitis B vaccines now. Keep the baby warm, breastfeed often and keep the cord clean and dry.", pcm: "MamaLine: Welcome, pikin! If dem never give am, carry pikin go take BCG, polio and hepatitis B vaccine now. Keep pikin warm, give breast well and keep the cord clean and dry." },
  },
  {
    id: "baby-02",
    track: "baby",
    week: 2,
    keywords: ["danger", "sign", "signs", "sick", "baby", "newborn", "feeding"],
    sms: { en: "MamaLine: Baby danger signs: not feeding, fits, fast breathing, very hot or cold, very sleepy, yellow palms or soles, red or pus at the cord. If you see one, go to the clinic now.", pcm: "MamaLine: Pikin danger signs: no dey suck breast, fits, fast breathing, too hot or cold, sleep too much, yellow palm or foot, cord red or pus. If you see one, go clinic now." },
  },
  {
    id: "baby-06",
    track: "baby",
    week: 6,
    keywords: ["family", "planning", "spacing", "pregnant", "again", "contraceptive", "contraception"],
    sms: { en: "MamaLine: Talk to your health worker about family planning. Waiting at least 2 years before the next pregnancy helps you and your baby stay healthy. Services are often free at public clinics.", pcm: "MamaLine: Talk to your health worker about family planning. To wait at least 2 years before next belle go help you and your pikin stay healthy. E dey free for many government clinic." },
  },
  {
    id: "baby-26",
    track: "baby",
    week: 26,
    keywords: ["food", "foods", "eat", "pap", "solid", "complementary", "six", "months", "vitamin"],
    sms: { en: "MamaLine: From 6 months, add soft foods like pap with groundnut or egg, mashed beans and vegetables, and keep breastfeeding. Ask your clinic about vitamin A for your baby.", pcm: "MamaLine: From 6 months, add soft food like pap with groundnut or egg, mashed beans and vegetable, and continue breastfeeding. Ask your clinic about vitamin A for your pikin." },
  },
];

export const FAQ: Faq[] = [
  {
    id: "faq-herbs",
    keywords: ["herb", "herbs", "herbal", "agbo", "native", "medicine", "concoction", "mixture"],
    sms: { en: "MamaLine: Do not take herbal mixtures such as agbo during pregnancy or breastfeeding without asking a health worker. Some can harm you and your baby.", pcm: "MamaLine: No take agbo or any herbal mixture when you get belle or dey breastfeed if health worker never approve. Some fit harm you and your pikin." },
  },
  {
    id: "faq-vaccine-safety",
    keywords: ["vaccine", "vaccines", "injection", "immunisation", "immunization", "safe", "side", "effect", "effects", "free", "jab"],
    sms: { en: "MamaLine: Vaccines are free at government clinics and protect your baby from deadly diseases. Mild fever or a sore spot after a vaccine is common. If the baby has fits or will not feed, go to the clinic now.", pcm: "MamaLine: Vaccine dey free for government clinic and e dey protect pikin from killer sickness. Small fever or pain for the spot normal. If pikin get fits or no dey suck, go clinic now." },
  },
  {
    id: "faq-hiv",
    keywords: ["hiv", "aids", "positive", "status", "test"],
    sms: { en: "MamaLine: Every pregnant woman should test for HIV at her antenatal visit. If the test is positive, free treatment can stop the virus passing to your baby. Ask your clinic.", pcm: "MamaLine: Every pregnant woman suppose test for HIV for antenatal. If e positive, free treatment fit stop am from passing to your pikin. Ask your clinic." },
  },
  {
    id: "faq-medicine",
    keywords: ["drug", "drugs", "tablet", "paracetamol", "pill", "pills", "dose", "antibiotic", "antibiotics", "take"],
    sms: { en: "MamaLine: We cannot advise on medicines by SMS. Only take medicines a health worker gives you for this pregnancy or for your baby. Ask at your clinic before taking anything new.", pcm: "MamaLine: We no fit advise on medicine by SMS. Only take medicine wey health worker give you for this belle or for your pikin. Ask your clinic before you take any new one." },
  },
];
