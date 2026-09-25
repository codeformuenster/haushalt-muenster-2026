// Web Awesome: Theme-Stile und die Komponenten, die wir tatsächlich verwenden.
// Bewusst einzeln importiert statt alles auf einmal — das hält das Bundle klein.
// Wer eine weitere <wa-*>-Komponente braucht, ergänzt hier eine Zeile.
import '@awesome.me/webawesome/dist/styles/webawesome.css'
import '@awesome.me/webawesome/dist/components/accordion/accordion.js'
import '@awesome.me/webawesome/dist/components/accordion-item/accordion-item.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/callout/callout.js'
import '@awesome.me/webawesome/dist/components/card/card.js'
import '@awesome.me/webawesome/dist/components/divider/divider.js'
import '@awesome.me/webawesome/dist/components/icon/icon.js'
import '@awesome.me/webawesome/dist/components/page/page.js'
import '@awesome.me/webawesome/dist/components/tag/tag.js'
import '@awesome.me/webawesome/dist/components/spinner/spinner.js'
import '@awesome.me/webawesome/dist/components/switch/switch.js'

// Registriert Diagrammtypen und das Projekt-Theme für ECharts.
import '@/charts/echartsTheme'

import '@/assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
