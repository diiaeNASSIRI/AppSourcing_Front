import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// Enable Bootstrap JS components from local package
// If you rely on Bootstrap JS and need it here, prefer the ESM build.
// Otherwise, you can remove this import when using ng-bootstrap only.
import 'bootstrap/dist/js/bootstrap.esm.min.js';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
