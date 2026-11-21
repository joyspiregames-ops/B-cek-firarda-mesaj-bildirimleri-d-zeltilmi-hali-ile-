import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const manifestPath = path.join(
  androidDir,
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);

const DEFAULT_TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

function readEnvFile() {
  const envMap = {};
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      envMap[key] = val;
    }
  }
  return envMap;
}

function patchAndroidManifest(admobAppId) {
  if (!fs.existsSync(manifestPath)) {
    console.warn('AndroidManifest.xml bulunamadı, yama atlandı.');
    return;
  }

  let xml = fs.readFileSync(manifestPath, 'utf8');

  if (!xml.includes('android.permission.POST_NOTIFICATIONS')) {
    xml = xml.replace(
      /(<manifest\b[^>]*>)/,
      '$1\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    );
  }

  if (!xml.includes('android.permission.ACCESS_NETWORK_STATE')) {
    xml = xml.replace(
      /(<manifest\b[^>]*>)/,
      '$1\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
    );
  }

  if (xml.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    xml = xml.replace(
      /(<meta-data[^>]*android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*android:value=")[^"]*(")/,
      `$1${admobAppId}$2`,
    );
  } else {
    xml = xml.replace(
      '</application>',
      `        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${admobAppId}" />\n    </application>`,
    );
  }

  if (!xml.includes('android:largeHeap=')) {
    xml = xml.replace(
      /(<application\b[^>]*)(>)/,
      '$1\n        android:largeHeap="true"$2',
    );
  }

  if (!xml.includes('android:hardwareAccelerated=')) {
    xml = xml.replace(
      /(<application\b[^>]*)(>)/,
      '$1\n        android:hardwareAccelerated="true"$2',
    );
  }

  if (!xml.includes('android:screenOrientation=')) {
    xml = xml.replace(
      /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*)(>)/,
      '$1\n            android:screenOrientation="portrait"$2',
    );
  }

  const desiredConfigChanges =
    'orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode';
  if (/android:configChanges="[^"]*"/.test(xml)) {
    xml = xml.replace(
      /android:configChanges="[^"]*"/,
      `android:configChanges="${desiredConfigChanges}"`,
    );
  } else {
    xml = xml.replace(
      /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*)(>)/,
      `$1\n            android:configChanges="${desiredConfigChanges}"$2`,
    );
  }

  fs.writeFileSync(manifestPath, xml, 'utf8');
}

function copyNotificationDrawables() {
  const srcDrawableDir = path.join(rootDir, 'resources', 'android', 'drawable');
  const destDrawableDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'drawable');
  if (!fs.existsSync(srcDrawableDir)) return;
  fs.mkdirSync(destDrawableDir, { recursive: true });
  const files = fs.readdirSync(srcDrawableDir).filter((f) => /\.(png|xml)$/i.test(f));
  for (const file of files) {
    fs.copyFileSync(path.join(srcDrawableDir, file), path.join(destDrawableDir, file));
  }
  if (files.length > 0) {
    console.log(`Bildirim ikonları kopyalandı (${files.join(', ')}) -> res/drawable`);
  }
}

function ensureLocalizedAppNames() {
  const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');
  const defaultValuesDir = path.join(resDir, 'values');
  const defaultStringsPath = path.join(defaultValuesDir, 'strings.xml');

  if (fs.existsSync(defaultStringsPath)) {
    let xml = fs.readFileSync(defaultStringsPath, 'utf8');
    xml = xml
      .replace(/(<string\s+name="app_name">)[^<]*(<\/string>)/, '$1Bug Escape$2')
      .replace(/(<string\s+name="title_activity_main">)[^<]*(<\/string>)/, '$1Bug Escape$2');
    fs.writeFileSync(defaultStringsPath, xml, 'utf8');
  }

  const trValuesDir = path.join(resDir, 'values-tr');
  fs.mkdirSync(trValuesDir, { recursive: true });
  const trStringsXml = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Böcek Firarda</string>
    <string name="title_activity_main">Böcek Firarda</string>
</resources>
`;
  fs.writeFileSync(path.join(trValuesDir, 'strings.xml'), trStringsXml, 'utf8');
  console.log('Uygulama adı yerelleştirildi: Türkçe (Böcek Firarda) / Diğer diller (Bug Escape).');
}

const fileEnv = readEnvFile();
const admobAppId =
  process.env.VITE_ADMOB_APP_ID ||
  fileEnv.VITE_ADMOB_APP_ID ||
  DEFAULT_TEST_ADMOB_APP_ID;

if (!fs.existsSync(androidDir)) {
  console.log('Android projesi oluşturuluyor (npx cap add android)...');
  execSync('npx cap add android', { stdio: 'inherit' });
}

patchAndroidManifest(admobAppId);
console.log(`AndroidManifest.xml güncellendi (AdMob App ID: ${admobAppId}).`);
copyNotificationDrawables();

console.log('Capacitor Android senkronize ediliyor (npx cap sync android)...');
execSync('npx cap sync android', { stdio: 'inherit' });

ensureLocalizedAppNames();

console.log('\nAndroid altyapısı hazır!');
console.log('Debug APK almak için: npm run android:apk');
console.log('Release AAB almak için: npm run android:aab');
