import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2] === 'aab' ? 'aab' : 'apk';
const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');

console.log('1/3 Web derlemesi oluşturuluyor (npm run build)...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

if (!fs.existsSync(androidDir)) {
  console.log('2/3 Android projesi hazırlanıyor (node scripts/setup-android.mjs)...');
  execSync('node scripts/setup-android.mjs', { stdio: 'inherit', cwd: rootDir });
} else {
  console.log('2/3 Capacitor Android senkronize ediliyor (node scripts/setup-android.mjs)...');
  execSync('node scripts/setup-android.mjs', { stdio: 'inherit', cwd: rootDir });
}

const isWin = process.platform === 'win32';
const gradlew = isWin ? 'gradlew.bat' : './gradlew';
const gradleTask = target === 'aab' ? 'bundleRelease' : 'assembleDebug';

console.log(`3/3 Gradle çalıştırılıyor (${gradlew} ${gradleTask})...`);
execSync(`${gradlew} ${gradleTask}`, { stdio: 'inherit', cwd: androidDir });

const outputHint =
  target === 'aab'
    ? path.join('android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
    : path.join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log(`\nAndroid ${target.toUpperCase()} hazır: ${outputHint}`);
