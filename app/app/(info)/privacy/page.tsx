import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "PB Card Deck is local-first: your data stays on your device.",
};

// Backlog F244. Honest policy for a no-account, no-backend, local-first app.
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lede">
        Short version: this app has no accounts, no servers storing your data, and no
        third-party tracking. Everything you create stays on your device.
      </p>

      <h2>What we collect</h2>
      <p>
        Nothing about you, personally. The app does not ask you to sign in and has no
        database. There are no advertising or analytics trackers that profile you.
      </p>

      <h2>What is stored, and where</h2>
      <ul>
        <li>
          <strong>On your device only.</strong> Your scores, match history, custom decks,
          favorites, and settings are saved in your browser&apos;s <code>localStorage</code>.
          They never leave your device unless you choose to export them.
        </li>
        <li>
          <strong>Offline cache.</strong> A service worker caches the app and its card data
          so it works without a connection. This is technical storage on your device, not
          personal data sent to us.
        </li>
      </ul>

      <h2>Your control</h2>
      <ul>
        <li>Use <strong>Export backup</strong> in the menu to download all your data as a file.</li>
        <li>Use <strong>Import backup</strong> to move data to another device.</li>
        <li>
          Clearing your browser&apos;s site data for this app permanently deletes everything.
          Because we never receive it, there is nothing on our side to delete.
        </li>
      </ul>

      <h2>Hosting</h2>
      <p>
        The app is served as a static site (Vercel). Standard server logs (such as IP
        addresses) may be processed by the host to deliver and protect the site, per the
        host&apos;s own policies. We do not combine those logs with any personal profile.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the updated version will be posted here. Questions? Use
        <strong> Send feedback</strong> in the app menu.
      </p>
    </>
  );
}
