// Сборка сайта: шаблоны из src/ превращаются в готовые HTML-файлы в корне репозитория.
// Корень отдаётся как есть: и GitHub Pages (превью), и хостинг получают обычные файлы, без сборки на сервере.
//   npm install        один раз
//   npm run build      пересобрать страницы после правки шаблонов
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, 'src');

// Адреса страниц. Пока шаблона страницы нет, ссылка ведёт на блок главной (второе значение).
// Сайт компактный (структура v3 от 15.11.2026): главная, Яндекс Директ, «Сайт и Карты», кейсы, «О нас и контакты».
const LINKS = {
  home: ['/', '/'],
  direct: ['/yandex-direkt/', '/#services'],
  complex: ['/kompleksnyj-marketing/', '/#services'],
  cases: ['/kejsy/', '/#examples'],
  about: ['/kontakty/', '/#team'],
  leads: ['/lidy-dlya-stomatologii/', '/yandex-direkt/'],
  sites: ['/sajt-dlya-stomatologii/', '/kompleksnyj-marketing/'],
  seo: ['/seo-dlya-stomatologii/', '/kompleksnyj-marketing/'],
  maps: ['/yandex-karty/', '/kompleksnyj-marketing/'],
  blog: ['/blog/', '/'],
  policy: ['/politika/', '#'],
  consent: ['/soglasie/', '#'],
  thanks: ['/spasibo/', '#'],
};
const exists = url => url === '/' || ['index.njk', 'index.md'].some(f => fs.existsSync(path.join(SRC, url, f))) || fs.existsSync(path.join(SRC, url.replace(/\/$/, '') + '.njk'));
const href = key => {
  if (!LINKS[key]) throw new Error(`Неизвестная ссылка: ${key}`);
  const [url, fallback] = LINKS[key];
  return exists(url) ? url : fallback;
};

// Неразрывные пробелы: цена с рублём, разряды числа, короткие предлоги и союзы не отрываются от следующего слова.
const esc = s => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const glue = s => s
  .replace(/(\d) (?=\d{3}(?!\d))/g, '$1&nbsp;')
  .replace(/(\d) (₽|%|рабоч|дн|мес|недел|минут|час|страниц|счёт|счета|этап|оффер|клиник|лет|год)/g, '$1&nbsp;$2')
  // частицы «ли», «же», «бы» держатся за предыдущее слово, остальные короткие слова за следующее
  .replace(/ (ли|же|бы|б|ж)(?=[\s,.!?:;»)]|$)/g, '&nbsp;$1')
  .replace(/(?<=^|[\s(«"„>;])(?!(?:ли|же|бы|б|ж) )([А-Яа-яЁё]{1,2}) (?=\S)/g, '$1&nbsp;')
  .replace(/ (—|–) /g, '&nbsp;$1 ');
// «All-on-4», «чего-то», «какой-нибудь» не рвутся на дефисе
// **так** в тексте страницы выделяет слова полужирным, *так* курсивом с засечками (акцент в заголовке)
const typo = s => (s == null ? '' : glue(esc(s)).replace(/All-on-\d|[А-Яа-яЁё]+-(?:то|либо|нибудь|таки)(?![А-Яа-яЁё])/g, '<span class="nw">$&</span>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>'));
// Тот же текст без разметки: для JSON-LD и атрибутов.
const plain = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/\*/g, '').replace(/&nbsp;/g, ' ').replace(/ /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Разметка schema.org внутренней страницы: сама страница, хлебные крошки, услуга и вопросы (те же, что видны в тексте).
const jsonld = (site, page, title, description, crumbs, service, faq) => {
  const url = site.url + page.url;
  const agency = { '@type': 'ProfessionalService', '@id': site.url + '/#agency', name: site.name, url: site.url + '/' };
  const graph = [];
  if (page.url === '/') graph.push({ ...agency, description: plain(description), areaServed: 'RU', knowsAbout: ['Яндекс Директ', 'Сайты для стоматологий', 'Яндекс Карты', 'SEO'], logo: site.url + '/assets/img/medvector-logo.png' });
  graph.push({ '@type': 'WebPage', '@id': url, url, name: plain(title), description: plain(description), inLanguage: 'ru', isPartOf: { '@type': 'WebSite', url: site.url + '/', name: site.name } });
  if (crumbs && crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ name: 'Главная', url: '/' }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: plain(c.name), item: site.url + c.url })) });
  if (service) graph.push({ '@type': 'Service', name: plain(service.name), serviceType: plain(service.type || service.name), description: plain(service.description || description), url, areaServed: 'RU', provider: agency, ...(service.price ? { offers: { '@type': 'Offer', price: String(service.price), priceCurrency: 'RUB', ...(service.priceNote ? { description: plain(service.priceNote) } : {}) } } : {}) });
  if (faq && faq.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })) });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
};

// Ссылки в шаблонах пишутся от корня («/assets/…», «/ceny/»), а в готовом файле становятся относительными:
// так страницы одинаково работают на medvector.pro и в превью, которое лежит в подпапке.
const relative = (url, depth) => {
  const pre = '../'.repeat(depth), rest = url.slice(1);
  if (rest === '') return pre || './';
  if (rest.startsWith('#') && depth === 0) return rest;
  return pre + rest;
};

module.exports = function (cfg) {
  cfg.setNunjucksEnvironmentOptions({ trimBlocks: true, lstripBlocks: true });
  cfg.addGlobalData('year', () => new Date().getFullYear());
  cfg.addNunjucksGlobal('href', href);
  cfg.addNunjucksGlobal('jsonld', jsonld);
  cfg.addFilter('t', typo);
  cfg.addFilter('plain', plain);
  cfg.addFilter('json', v => JSON.stringify(v));
  cfg.addFilter('pad2', n => String(n).padStart(2, '0'));

  cfg.addTransform('relative-urls', function (content) {
    if (!(this.page.outputPath || '').endsWith('.html')) return content;
    const url = this.page.url || '/';
    // страница 404 показывается по любому адресу, поэтому её ссылки считаются от корня (см. <base> в шаблоне)
    const depth = url.endsWith('/') ? url.split('/').filter(Boolean).length : 0;
    return content
      .replace(/\b(href|src|action|poster)="(\/(?!\/)[^"]*)"/g, (m, a, u) => `${a}="${relative(u, depth)}"`)
      .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (m, a, list) => `${a}="${list.split(',').map(c => { const s = c.trim(); return s.startsWith('/') && !s.startsWith('//') ? relative(s.split(/\s+/)[0], depth) + s.slice(s.split(/\s+/)[0].length) : s; }).join(', ')}"`);
  });

  // Главная собрана из готовой разметки секций (src/_includes/home), статьи блога написаны готовым HTML: фильтр t к ним не применяется.
  // Поэтому неразрывные пробелы расставляются по готовой странице: только в тексте между тегами внутри <main>.
  cfg.addTransform('home-typography', function (content) {
    if (!(this.page.url === '/' || (this.page.url || '').startsWith('/blog/')) || !(this.page.outputPath || '').endsWith('.html')) return content;
    const a = content.indexOf('<main'), b = content.indexOf('</main>');
    if (a < 0 || b < 0) return content;
    return content.slice(0, a) + content.slice(a, b).replace(/>([^<>]*[А-Яа-яЁё\d][^<>]*)</g, (m, text) => '>' + glue(text) + '<') + content.slice(b);
  });

  return {
    dir: { input: 'src', output: '.', includes: '_includes', data: '_data' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
