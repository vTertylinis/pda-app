const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const android = path.resolve(__dirname, '..', 'android');
const env = { ...process.env };
const studioJava = 'C:\\Program Files\\Android\\Android Studio\\jbr';
if (!env.JAVA_HOME && process.platform === 'win32' && fs.existsSync(studioJava)) {
  env.JAVA_HOME = studioJava;
  env.PATH = path.join(studioJava, 'bin') + path.delimiter + env.PATH;
}
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug'], {
  cwd: android, env, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
if (result.status === 0) console.log('APK: android/app/build/outputs/apk/debug/app-debug.apk');
