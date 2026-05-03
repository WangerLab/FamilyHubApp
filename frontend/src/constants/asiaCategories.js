// Fixed categories for the Asia shopping list with keyword-based detection.
// Auto-categorization works analog to grocery: detectAsiaCategory(name)
// returns the matching category name (display string), or DEFAULT_ASIA_CATEGORY.

export const DEFAULT_ASIA_CATEGORY = 'Sonstiges Asia';

export const ASIA_CATEGORIES = [
  {
    id: 'sauces',
    name: 'Saucen & Pasten',
    emoji: '🍶',
    keywords: [
      'sojasauce', 'sojasoße', 'soja sauce', 'soya sauce', 'soja', 'tamari',
      'shoyu', 'kikkoman', 'mirin', 'reiswein', 'sake', 'fischsauce',
      'fish sauce', 'nuoc mam', 'nam pla', 'austernsauce', 'oyster sauce',
      'hoisin', 'hoisinsauce', 'gochujang', 'gochugaru', 'doenjang', 'miso',
      'miso-paste', 'misopaste', 'tahini', 'tahin', 'sesampaste', 'ponzu',
      'sriracha', 'sambal', 'sambal oelek', 'chilisauce', 'chilipaste',
      'currypaste', 'massaman', 'panang', 'tom yum paste', 'tamarindenpaste',
      'tamarinde', 'tamarind', 'sweet chili', 'süß-sauer-sauce', 'teriyaki',
      'teriyakisauce', 'ketjap manis', 'kecap manis', 'fischpaste',
      'garnelenpaste', 'shrimp paste', 'kapi', 'belacan', 'satay sauce',
      'erdnusssauce', 'peanut sauce', 'ssamjang', 'doubanjiang', 'xo-sauce',
      'xo sauce', 'nam jim',
    ],
  },
  {
    id: 'spices',
    name: 'Gewürze',
    emoji: '🌶️',
    keywords: [
      'sternanis', 'galgant', 'galangal', 'kaffir', 'kaffirblätter',
      'kaffir lime leaves', 'limettenblätter', 'zitronengras', 'lemongrass',
      'lemongras', 'kreuzkümmel', 'cumin', 'kurkuma', 'turmeric',
      'garam masala', 'koriandersamen', 'koriander gemahlen', 'schwarzkümmel',
      'nigella', 'fünf gewürze', 'fünf-gewürze', 'fünfgewürzpulver',
      'five spice', '5 spice', 'szechuan', 'sichuan', 'sichuanpfeffer',
      'szechuanpfeffer', 'chili gemahlen', 'chiliflocken', 'chili flakes',
      'chilipulver', 'asia pfeffer', 'langer pfeffer', 'kubeben',
      'muskatblüte', 'gelbwurz', 'bockshornklee', 'fenugreek', 'sumach',
      'sansho', 'shichimi', 'shichimi togarashi', 'togarashi', 'furikake',
      'gomashio', 'sesamsalz', 'kala namak', 'pandan', 'pandanblätter',
      'asafoetida', 'hing',
    ],
  },
  {
    id: 'rice_flours',
    name: 'Reis & Mehle',
    emoji: '🍚',
    keywords: [
      'jasminreis', 'jasmin-reis', 'jasmine rice', 'basmati', 'basmati-reis',
      'basmatireis', 'sushireis', 'sushi-reis', 'sushi rice', 'klebreis',
      'klebriger reis', 'sticky rice', 'glutinous rice', 'mochi-reis',
      'mochi reis', 'schwarzer reis', 'roter reis', 'reismehl', 'reisstärke',
      'klebreismehl', 'mochi mehl', 'glutinous rice flour', 'tapioka',
      'tapiokastärke', 'tapiokamehl', 'maniok', 'maniokstärke', 'maniokmehl',
      'maisstärke', 'kichererbsenmehl', 'besan', 'gram flour', 'urad mehl',
      'mungobohnenmehl', 'kuzu', 'kudzu', 'sago', 'sagoperlen',
    ],
  },
  {
    id: 'noodles',
    name: 'Nudeln & Teigwaren',
    emoji: '🍜',
    keywords: [
      'udon', 'udonnudeln', 'udon nudeln', 'soba', 'sobanudeln', 'soba-nudeln',
      'ramen', 'ramennudeln', 'instant ramen', 'instant nudeln', 'glasnudeln',
      'cellophane noodles', 'mungbohnennudeln', 'reisnudeln', 'reisnudel',
      'reis-nudeln', 'rice noodles', 'mie', 'mienudeln', 'mie-nudeln',
      'mienudel', 'eiernudeln asia', 'wantan', 'wantan-blätter', 'wonton',
      'wonton wrapper', 'dumpling-blätter', 'dumpling wrapper',
      'gyoza-blätter', 'gyoza wrapper', 'frühlingsrollenteig',
      'spring roll wrapper', 'reispapier', 'banh trang', 'somen', 'hokkien',
      'shirataki', 'konjak nudeln', 'konjac noodles',
    ],
  },
  {
    id: 'canned_dry',
    name: 'Konserven & Trocken',
    emoji: '🥫',
    keywords: [
      'kokosmilch', 'kokoscreme', 'coconut milk', 'coconut cream',
      'coconut water', 'kokoswasser', 'bambussprossen', 'bamboo shoots',
      'wasserkastanien', 'water chestnuts', 'getrocknete pilze',
      'dried mushrooms', 'shiitake', 'getrocknete shiitake', 'dried shiitake',
      'enoki', 'shimeji', 'maitake', 'eringi', 'king trumpet', 'holzohren',
      'mu-err', 'mu err', 'mu-err pilze', 'wood ear', 'black fungus',
      'cloud ear', 'algen', 'nori', 'noriblätter', 'nori-blätter', 'wakame',
      'kombu', 'dashi', 'dashi pulver', 'dashi-pulver', 'instant dashi',
      'hondashi', 'getrocknete garnelen', 'dried shrimp', 'getrockneter fisch',
      'bonitoflocken', 'bonito', 'katsuobushi', 'fischflocken',
      'sojabohnen getrocknet', 'mungbohnen', 'douchi', 'fermentierte bohnen',
      'getrocknete chilis', 'dried chili',
    ],
  },
  {
    id: 'fresh_frozen',
    name: 'Frisch & TK',
    emoji: '🧊',
    keywords: [
      'tofu', 'seidentofu', 'silken tofu', 'festtofu', 'fester tofu',
      'räuchertofu', 'geräucherter tofu', 'smoked tofu', 'tempeh', 'edamame',
      'edamame tk', 'sojabohnen frisch', 'mungobohnensprossen', 'sojasprossen',
      'bohnensprossen', 'bean sprouts', 'dumplings', 'dumplings tk', 'gyoza',
      'gyoza tk', 'baozi', 'mantou', 'frühlingsrollen tk', 'samosa',
      'samosas tk', 'thai-basilikum', 'thai basilikum', 'holy basil',
      'thaibasilikum', 'vietnamesischer koriander', 'koriander asia',
      'pak choi', 'pakchoi', 'bok choy', 'bokchoy', 'choi sum', 'daikon',
      'weisser rettich', 'lotuswurzel', 'taro', 'yams asia', 'mochi-eis',
      'mochi eis', 'durian',
    ],
  },
  {
    id: 'snacks',
    name: 'Snacks & Süß',
    emoji: '🍡',
    keywords: [
      'pocky', 'pretz', 'hello panda', 'mochi', 'daifuku', 'dorayaki',
      'taiyaki', 'reiscracker', 'reis-cracker', 'sembei', 'senbei',
      'prawn crackers', 'krupuk', 'kerupuk', 'krabbenchips', 'garnelenchips',
      'mango getrocknet', 'getrocknete mango', 'dried mango', 'litschi',
      'lychee', 'longan', 'jackfruit chips', 'kokoschips', 'ramune', 'calpis',
      'pocky stick', 'matcha schokolade', 'matcha kit kat', 'asia bonbons',
      'white rabbit', 'hi-chew', 'hichew', 'dango', 'anko', 'rote bohnenpaste',
      'azuki', 'sesambonbons', 'sesame brittle',
    ],
  },
  {
    id: 'other',
    name: 'Sonstiges Asia',
    emoji: '🥢',
    keywords: [],
  },
];

// Detect category from item name. Returns category name (display string)
// or DEFAULT_ASIA_CATEGORY as fallback. Matches case-insensitively,
// checks if any keyword appears as substring in name.
export function detectAsiaCategory(name) {
  if (!name || typeof name !== 'string') return DEFAULT_ASIA_CATEGORY;
  const lower = name.toLowerCase().trim();
  for (const cat of ASIA_CATEGORIES) {
    if (cat.id === 'other') continue;
    for (const kw of cat.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return cat.name;
      }
    }
  }
  return DEFAULT_ASIA_CATEGORY;
}
