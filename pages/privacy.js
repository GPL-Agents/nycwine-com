// pages/privacy.js

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy — NYCWine.com</title>
        <meta name="description" content="Privacy policy for NYCWine.com." />
      </Head>

      <Header />

      <main className="stores-page">
        <div className="stores-page-header">
          <h1 className="stores-page-title">Privacy Policy</h1>
          <p className="stores-page-subtitle">Last updated: March 25, 2026</p>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', lineHeight: 1.8, color: 'var(--text)' }}>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Overview</h2>
          <p>
            NYCWine.com is a directory and event listing site for wine-related events, stores, and bars
            in New York City. We are committed to being transparent about how this site works with
            respect to your data.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Information We Collect</h2>
          <p>
            NYCWine.com does not collect, store, or process any personally identifiable information (PII).
            We do not have user accounts, email subscriptions, contact forms, or any mechanism that
            collects your personal data.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Third-Party Services</h2>
          <p>
            This site uses Google Analytics to understand aggregate traffic patterns such as how many
            visitors we receive and which pages are popular. Google may set cookies in your browser as
            part of this service. We do not control Google's data practices — please refer to{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--rose)' }}>
              Google's Privacy Policy
            </a>{' '}
            for details on how they handle data.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Cookies</h2>
          <p>
            The only cookies on this site are those set by Google Analytics. We do not set any
            first-party cookies ourselves. You can disable cookies in your browser settings at any time.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Event Data</h2>
          <p>
            Event listings on this site are sourced from public listings. We do not
            collect or store any data about which events you view or click on.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Children's Privacy</h2>
          <p>
            This site is not directed at children under 13 and does not knowingly collect any
            information from children.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Changes to This Policy</h2>
          <p>
            If our data practices change in the future (for example, if we add a newsletter or user
            accounts), we will update this policy accordingly.
          </p>

          <h2 style={{ marginTop: 32, marginBottom: 8 }}>Contact</h2>
          <p>
            If you have any questions about this privacy policy, you can reach us at:{' '}
            <a href="mailto:admin@nycwine.com" style={{ color: 'var(--rose)' }}>
              admin@nycwine.com
            </a>
          </p>

        </div>
      </main>

      <Footer />
    </>
  );
}