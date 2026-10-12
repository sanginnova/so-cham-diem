import fs from 'node:fs';
// Firebase Web config is public; deploy credentials belong only in GitHub Secrets.
const raw = process.env.FIREBASE_WEB_CONFIG || fs.readFileSync('firebase-applet-config.json', 'utf8');
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID before deploying.');
const config = JSON.parse(raw);
for (const field of ['apiKey', 'appId', 'authDomain', 'projectId']) {
  if (typeof config[field] !== 'string' || !config[field] || config[field].includes('REPLACE_')) throw new Error(`Invalid Firebase config: ${field}`);
}
if (config.projectId !== projectId) throw new Error('Firebase Web project does not match the deploy target.');
config.firestoreDatabaseId ||= '(default)';
fs.writeFileSync('firebase-applet-config.json', JSON.stringify(config, null, 2) + '\n');
const deploy = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
deploy.firestore = { database: config.firestoreDatabaseId, rules: 'firestore.rules' };
fs.writeFileSync('firebase.json', JSON.stringify(deploy, null, 2) + '\n');
