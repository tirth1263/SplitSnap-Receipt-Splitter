// GitHub Pages helpers, run after `expo export -p web`:
//  - 404.html = index.html so deep links / refreshes still load the app
//  - .nojekyll so files/folders starting with "_" (Expo's _expo/) are served
import { copyFileSync, writeFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
console.log('postexport: wrote dist/404.html and dist/.nojekyll');
