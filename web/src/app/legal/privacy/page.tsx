import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — StyleSync' }

// NOTE FOR THE OWNER: this is an accurate, plain-English starting point that
// reflects what the app actually collects and which processors it uses. It is NOT
// legal advice — have it reviewed against India's DPDP Act 2023 (and any market you
// launch in) before a public launch, and fill in the bracketed company details.
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Last updated: 22 July 2026</p>

      <p>
        StyleSync (&quot;we&quot;, &quot;us&quot;) is an AI wardrobe and outfit-styling app. This
        policy explains what we collect, why, and who we share it with. We try to collect only what
        the product needs to work.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account details</b> — your email address, and a password (stored hashed by our auth
          provider; we never see it).
        </li>
        <li>
          <b>Profile</b> — the name, gender, and city you choose to provide, and your style
          preferences from onboarding. These are optional and used to personalise recommendations.
        </li>
        <li>
          <b>Wardrobe photos</b> — the clothing images you upload. We process them to remove the
          background and to tag attributes (category, colour, etc.). See &quot;AI processing&quot;
          below.
        </li>
        <li>
          <b>Activity</b> — outfits the stylist generates for you, which you save, wear, or skip
          (and any reason you give). We use this to improve your recommendations.
        </li>
        <li>
          <b>Community content</b> — if you post, the photos, captions, comments, likes, and follows
          you create.
        </li>
        <li>
          <b>Approximate location</b> — a rough, city-level location derived from your connection
          (not GPS), used only to fetch the local weather for outfit suggestions. It is not stored
          alongside your identity.
        </li>
      </ul>

      <h2>AI processing of your photos</h2>
      <p>
        To remove backgrounds and tag your clothing, your uploaded images are sent to third-party AI
        services (a background-removal/embedding service and a vision language model). They process
        the image to return the cleaned photo and tags. We do not use your photos to train our own
        models, and we ask processors not to retain them beyond what is needed to serve the request.
      </p>

      <h2>Who we share it with</h2>
      <p>We use a small set of processors to run the service:</p>
      <ul>
        <li>
          <b>Supabase</b> — hosts our database, authentication, and your photo storage (private).
        </li>
        <li>
          <b>Vercel</b> — hosts and serves the app.
        </li>
        <li>
          <b>OpenRouter and Google (Gemini)</b> — the language models that tag your clothes and
          compose outfits. They receive clothing images (for tagging) and item descriptions (for
          styling).
        </li>
        <li>
          <b>A hosted image processor</b> — removes photo backgrounds and generates the embeddings
          used to search your wardrobe.
        </li>
        <li>
          <b>Open-Meteo</b> — receives only approximate coordinates to return the weather.
        </li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account is active. When you delete a clothing item we remove its
        stored images. If you delete your account, we remove your profile, wardrobe, and activity.
      </p>

      <h2>Your rights</h2>
      <p>
        You can view and edit your profile and wardrobe in the app, delete individual items, and
        request deletion of your account and associated data by contacting us. Depending on where you
        live, you may have additional rights to access, correct, or export your data.
      </p>

      <h2>Children</h2>
      <p>StyleSync is not intended for anyone under 16, and we do not knowingly collect their data.</p>

      <h2>Contact</h2>
      <p>
        Questions or data requests: <a href="mailto:kritya.work.30@gmail.com">kritya.work.30@gmail.com</a>.
      </p>
    </>
  )
}
