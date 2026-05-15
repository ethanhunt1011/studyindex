import React from 'react';

export const Privacy = () => {
  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '0 auto', padding: '48px 24px', color: '#1A1A1A', lineHeight: 1.75 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 40 }}>Last updated: May 2025</p>

      <p>StudyIndex ("we", "our", or "us") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>1. Information We Collect</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Account information:</strong> When you sign in with Google, we receive your name, email address, and profile picture.</li>
        <li><strong>Study content:</strong> Documents and files you upload are processed to generate your study plans. File content is sent to Google Gemini for AI analysis and is not stored permanently on our servers.</li>
        <li><strong>Usage data:</strong> We store your study sessions, progress, flashcard reviews, and settings locally on your device using browser storage.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>2. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>To generate personalised AI study plans from your uploaded content</li>
        <li>To track your study progress and display analytics</li>
        <li>To provide the spaced-repetition flashcard system</li>
        <li>To authenticate you via Google Sign-In</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>3. Data Storage</h2>
      <p>Your study plans, progress, and settings are stored locally on your device (via browser localStorage / Capacitor Preferences). We do not maintain a central database of your personal study data.</p>
      <p>Uploaded documents are temporarily processed by our server and by Google Gemini's API to extract study content. We do not retain uploaded file content after processing.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>4. Third-Party Services</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Google Sign-In:</strong> Authentication is handled by Google. See <a href="https://policies.google.com/privacy" style={{ color: '#5A5A40' }}>Google's Privacy Policy</a>.</li>
        <li><strong>Google Gemini API:</strong> Document content is sent to Gemini for AI processing. See <a href="https://ai.google.dev/gemini-api/terms" style={{ color: '#5A5A40' }}>Gemini API Terms</a>.</li>
        <li><strong>Firebase:</strong> Used for authentication services only.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>5. Data Sharing</h2>
      <p>We do not sell, trade, or share your personal information with third parties except as described above (Google Sign-In and Gemini API for core app functionality).</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>6. Your Rights</h2>
      <p>You may delete your locally stored data at any time via Settings → Clear All Data. To request deletion of your account information, contact us at the email below.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>7. Children's Privacy</h2>
      <p>StudyIndex is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>8. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>9. Contact</h2>
      <p>For privacy-related questions, email us at: <a href="mailto:support@studyindex.app" style={{ color: '#5A5A40' }}>support@studyindex.app</a></p>

      <p style={{ marginTop: 48, color: '#aaa', fontSize: 13 }}>© 2025 StudyIndex. All rights reserved.</p>
    </div>
  );
};
