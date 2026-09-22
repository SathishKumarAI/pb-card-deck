import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for PB Card Deck.",
};

// Backlog F245. Plain-language terms for a free, no-account web app.
export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="lede">
        This is a free pickleball game played at your own discretion. By using it you agree
        to the points below.
      </p>

      <h2>The app is provided as-is</h2>
      <p>
        PB Card Deck is offered free of charge, without warranty of any kind. We do
        our best to keep it working and fair, but we can&apos;t guarantee it is error-free or
        always available.
      </p>

      <h2>Play safely</h2>
      <p>
        Some cards suggest physical challenges or social dares. Use common sense. Only attempt
        what is safe for you and everyone on the court, and follow your venue&apos;s rules. You
        are responsible for your own safety and conduct during play.
      </p>

      <h2>Your data is yours</h2>
      <p>
        Your scores, decks, and history live on your device. Keep your own backups (use Export
        in the menu) - we cannot recover data we never receive.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use the app for anything unlawful, and don&apos;t try to break, abuse, or
        misrepresent it. Custom content you create is your responsibility.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, the makers of this app are not liable for any injury,
        loss, or damages arising from its use.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms? Use <strong>Send feedback</strong> in the app menu.</p>
    </>
  );
}
