# MamaLine website

The landing page for MamaLine, a free USSD and SMS health line for pregnant women and new mothers. Built with Next.js 16 and Tailwind CSS 4. The layout follows the reference design (side navigation card, curved green bands, arched photo cards, round call-to-action), with MamaLine's own copy and photos.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

## What's on the page

| Section | Content |
|---|---|
| Hero | Side navigation, language picker (changes the greeting), headline, "Try the demo" button |
| What MamaLine does | Four arched cards: antenatal reminders, vaccine reminders, danger-sign help, health workers |
| Built with health workers | What CHEWs get, an example alert, and four sourced "Why it matters" figures |
| How it works | Three steps |
| Try it / Safety | A clickable copy of the real USSD menu and the safety promise |
| Partner with us | Form that emails each enquiry to you (see below) |
| Footer | Contact, links, photo credit |

## Edit content

All text, figures and photo choices live in `src/lib/site.ts`.

- `ussdLive`: keep `false` until the code is live. The hero button then becomes "Dial \*384\*2#".
- `contactEmail` and `contactPhone`: empty values are hidden. Add real ones before launch.
- `stats`: each figure links to its source. Update both together.

## Partner form email

Enquiries from the "Partner with us" form are emailed to you through [Resend](https://resend.com). Reply to the email to answer the sender directly.

1. Create a Resend account and an API key.
2. Copy `.env.example` to `.env.local` and set `RESEND_API_KEY` and `PARTNER_INBOX`. On Vercel, add the same variables in the project settings.
3. Until you verify a domain in Resend, `PARTNER_INBOX` must be the email address that owns the Resend account, and mail comes from `onboarding@resend.dev`.
4. After verifying your domain, set `PARTNER_FROM`, for example `MamaLine <partners@yourdomain.ng>`.

Without these settings, enquiries are only logged in development. In production the form shows "not set up yet", so no enquiry is silently lost. The form also has a hidden spam trap and allows 5 messages per sender every 10 minutes.

## Before launch

1. **Partner form:** set the email variables above and send yourself a test enquiry.
2. **Photos:** they load from Unsplash's CDN through `src/lib/image-loader.ts`. All are free under the Unsplash licence. To self-host, download them into `public/images` and change the `src` values in `site.ts`.
3. **Safety wording:** the page says a clinician reviews every message before launch, so arrange that review.
4. **Privacy:** add a privacy notice covering the partner form (Nigeria Data Protection Act 2023).

## Photo credits (Unsplash)

- [Mother carrying her baby on her back](https://unsplash.com/photos/woman-carrying-baby-on-back-yrzBgqapG1I)
- [Pregnant woman](https://unsplash.com/photos/a-pregnant-woman-standing-with-her-hands-on-her-belly-f6g66MhD84s)
- [Mother holding her baby](https://unsplash.com/photos/a-mother-holds-her-baby-gently-and-tenderly-sgjI2jzC1wg)
- [Health worker caring for a mother](https://unsplash.com/photos/a-woman-in-a-pink-shirt-and-a-woman-in-a-green-and-yellow-dress-e_4u1tobpbg)
- [Health worker with a phone](https://unsplash.com/photos/person-wearing-lavatory-gown-with-green-stethoscope-on-neck-using-phone-while-standing-L8tWZT4CcVQ)
- [Mother and baby on a hospital bed](https://unsplash.com/photos/a-woman-holding-a-baby-in-a-hospital-bed-q7PY6bXbmzk)
- [Woman on the phone](https://unsplash.com/photos/a-woman-in-an-orange-shirt-talking-on-a-cell-phone-bLwHevBwxK0)
- [Smiling mother and baby](https://unsplash.com/photos/woman-in-orange-shirt-carrying-baby-in-white-and-blue-floral-shirt-3Qi0PkM_Wes)
