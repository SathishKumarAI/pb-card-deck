import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "PB Card Deck is local-first: your data stays on your device unless you choose an optional account.",
};

/**
 * Backlog F244. Honest policy for a local-first app with an OPTIONAL account.
 *
 * Two modes means two honest paragraphs, not one reassuring one. The no-account mode
 * is still the default and still stores nothing anywhere but the device; the account
 * mode does put data on a server, and this page says which data, where, who can read
 * it, and how to delete all of it. It also has to mention the names an organiser
 * types for OTHER people, because those are other people's data.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lede">
        Short version: there is no tracking, and by default nothing you create leaves
        your device. An account is optional. If you choose one, your data is stored so
        that only you can read it, and you can delete all of it yourself in two taps.
      </p>

      <h2>The two ways to use this app</h2>
      <ul>
        <li>
          <strong>Without an account (the default).</strong> No sign-in, no server
          holding your data, nothing to leak. Everything lives in your browser.
        </li>
        <li>
          <strong>With an account (only if you choose it).</strong> Your matches,
          decks, events, favourites and counters are also stored in a database so they
          survive a cleared browser and appear on your other devices.
        </li>
      </ul>

      <h2>What we collect</h2>
      <p>
        No advertising or analytics trackers, in either mode. Without an account we
        hold nothing about you at all. With an account we hold your email address —
        because that is how you sign in — plus the game data listed below, and a
        display name if your sign-in provider gave us one.
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
        <li>
          <strong>In the account database, only if you sign in.</strong> Matches (team
          names, scores, duration, any event label), custom decks, tournaments
          (including player names and the change log), favourite cards, achievement
          counters, and your email address. It is hosted on{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a>,
          in the region chosen for the project. Every row is tagged with your account
          and protected by database rules so that no other account can read it.
        </li>
        <li>
          <strong>Other people&apos;s names.</strong> If you run a tournament you will
          type names for other players, and those travel with the event. Please only
          enter what those people would be happy to have stored — a first name or a
          nickname is usually enough.
        </li>
      </ul>

      <h2>Your control</h2>
      <ul>
        <li>Use <strong>Export backup</strong> in the menu to download all your data as a file.</li>
        <li>Use <strong>Import backup</strong> to move data to another device.</li>
        <li>
          Use <strong>Delete all data</strong> in the menu to wipe everything this
          device has stored, or clear your browser&apos;s site data for this app.
        </li>
        <li>
          <strong>If you have an account:</strong> <strong>Account &amp; sync → Delete
          my account</strong> removes the account itself and every row belonging to it —
          matches, decks, events, favourites, counters and your sign-in record — in one
          operation. It cannot be undone, and there is no backup we can restore it from.
          Signing out is separate and deletes nothing: it just stops syncing and leaves
          this device&apos;s copy in place.
        </li>
        <li>
          Without an account there is nothing on our side to delete, because we never
          receive it.
        </li>
      </ul>

      <h2>Security, in plain terms</h2>
      <ul>
        <li>
          <strong>No passwords.</strong> You sign in with Google or with a link emailed
          to you, so this app never stores a password that could leak.
        </li>
        <li>
          <strong>Your rows are yours.</strong> Access is enforced by the database
          itself, per row, against your account — not by app code that could be
          bypassed. We test that by trying to break in from a second account on every
          change to those rules.
        </li>
        <li>
          <strong>The audit log of a tournament cannot be edited</strong>, by anyone,
          including you. Correcting a score adds a line saying what it used to be.
        </li>
        <li>
          <strong>Sharing does not exist yet.</strong> Today an account is private to
          you. If shared events arrive later, this page will say so before they do.
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
