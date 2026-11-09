# CoachEric

Live site for Eric O'Hair: [https://coacheric.vercel.app](https://coacheric.vercel.app)

Static page (`index.html` and `coach.jpg`) plus a Node serverless function at `api/send.js`. Deploy with the Vercel project `coacheric`. The page does not need a build step.

## Shop

Apparel links point to the Cleats & Calluses shop on Etsy: [https://www.etsy.com/shop/CleatsAndCalluses](https://www.etsy.com/shop/CleatsAndCalluses)

## Email forms

The lesson request form and the contact form POST JSON to `/api/send`. The function checks the fields, drops submissions that fill the hidden honeypot, and sends plain text through the [Resend](https://resend.com) HTTP API.

- To: ohair1203@gmail.com
- Reply-To: the email address entered on the form
- From: `onboarding@resend.dev`, or `FROM_EMAIL` when that variable is set

If `RESEND_API_KEY` is missing, or the request fails, the page keeps the mailto fallback: the visitor's email app opens with the message filled in. The direct email link stays visible under both forms.

### Environment variables

Set these on the Vercel project. Do not commit them.

| Name | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | For delivery to the inbox | Resend API key. When it is unset, `/api/send` returns an error and the forms use the mailto fallback. |
| `FROM_EMAIL` | No | Sender passed to Resend. Use a full from value such as `Coach Eric <you@yourdomain.com>` after the domain is verified. When unset, mail is sent from `onboarding@resend.dev`. |

Resend only delivers mail from `onboarding@resend.dev` to the email address on that Resend account. To receive lesson requests from families, verify a domain in Resend and set `FROM_EMAIL`.
