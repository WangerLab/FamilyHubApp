export const CATEGORIES = [
  {
    id: 'obst',
    name: 'Obst & Gemüse',
    emoji: '🥦',
    defaultUnit: 'Stück',
    keywords: ['apfel', 'birne', 'banane', 'orange', 'zitrone', 'mango', 'erdbeere', 'traube', 'tomate', 'gurke',
      'paprika', 'salat', 'spinat', 'karotte', 'zwiebel', 'knoblauch', 'brokkoli', 'kartoffel', 'pilz',
      'zucchini', 'blumenkohl', 'avocado', 'kiwi', 'gemüse', 'obst', 'pfirsich', 'kirschen', 'champignon',
      'rucola', 'kohl', 'sellerie', 'lauch', 'rettich', 'rote bete', 'spargel', 'mais', 'aubergine'],
  },
  {
    id: 'fleisch',
    name: 'Frisches Fleisch & Fisch',
    emoji: '🥩',
    defaultUnit: 'g',
    keywords: ['hähnchen', 'hühnchen', 'rindfleisch', 'schweinefleisch', 'hackfleisch', 'steak', 'filet',
      'lachs', 'thunfisch', 'shrimps', 'garnelen', 'fisch', 'fleisch', 'wurst', 'bratwurst', 'schinken',
      'speck', 'salami', 'lamm', 'ente', 'pute', 'forelle', 'kabeljau', 'tilapia', 'hering'],
  },
  {
    id: 'baeckerei',
    name: 'Bäckerei & Brot',
    emoji: '🍞',
    defaultUnit: 'Stück',
    keywords: ['brot', 'brötchen', 'toast', 'baguette', 'croissant', 'semmel', 'mehl', 'backpulver',
      'hefe', 'kuchen', 'gebäck', 'laugenbrezel', 'brezel', 'waffel', 'pfannkuchen', 'hefezopf',
      'vollkornbrot', 'ciabatta', 'focaccia', 'toastbrot', 'körner'],
  },
  {
    id: 'milch',
    name: 'Milch & Alternativen',
    emoji: '🥛',
    defaultUnit: 'L',
    keywords: ['milch', 'joghurt', 'käse', 'butter', 'sahne', 'quark', 'mozzarella', 'gouda', 'cheddar',
      'frischkäse', 'schmand', 'hafermilch', 'sojamilch', 'mandelmilch', 'parmesan', 'brie', 'emmentaler',
      'kefir', 'crème fraîche', 'mascarpone', 'ricotta', 'oatly', 'alpro'],
  },
  {
    id: 'kuehl',
    name: 'Kühlregal & Tiefkühl',
    emoji: '❄️',
    defaultUnit: 'Packung',
    keywords: ['eier', 'tiefkühl', 'pizza', 'eis', 'margarine', 'gefror', 'pommes', 'nuggets',
      'tk ', 'tiefgekühl', 'fischstäbchen', 'spinat tiefkühl', 'erbsen tiefkühl'],
  },
  {
    id: 'konserven',
    name: 'Konserven & Saucen',
    emoji: '🥫',
    defaultUnit: 'Dose',
    keywords: ['ketchup', 'mayo', 'mayonnaise', 'senf', 'soße', 'sauce', 'tomatenmark', 'passata',
      'dose', 'konserve', 'bohnen', 'erbsen', 'linsen', 'kichererbsen', 'pesto', 'sambal',
      'tomatensauce', 'sojasauce', 'fischsauce', 'worcester', 'tabasco', 'chutney', 'hummus',
      'tahin', 'olivenöl dose', 'thunfischdose', 'sardinen'],
  },
  {
    id: 'gewuerze',
    name: 'Gewürze',
    emoji: '🧂',
    defaultUnit: 'Packung',
    keywords: ['salz', 'pfeffer', 'gewürz', 'oregano', 'basilikum', 'thymian', 'curry', 'paprikapulver',
      'zimt', 'muskat', 'chili', 'kreuzkümmel', 'kurkuma', 'koriander', 'vanille', 'zucker',
      'olivenöl', 'rapsöl', 'essig', 'balsamico', 'gewürzpaste', 'brühe', 'bouillon'],
  },
  {
    id: 'getraenke',
    name: 'Getränke',
    emoji: '🥤',
    defaultUnit: 'L',
    keywords: ['wasser', 'saft', 'cola', 'bier', 'wein', 'kaffee', 'tee', 'limonade', 'energie',
      'sprudel', 'nektar', 'smoothie', 'getränk', 'sprite', 'fanta', 'orangensaft', 'apfelsaft',
      'capri', 'espresso', 'nespresso', 'dolce gusto', 'red bull', 'monster'],
  },
  {
    id: 'snacks',
    name: 'Snacks & Süsses',
    emoji: '🍫',
    defaultUnit: 'Packung',
    keywords: ['schokolade', 'chips', 'kekse', 'gummibärchen', 'nüsse', 'popcorn', 'süss', 'snack',
      'riegel', 'bonbon', 'pudding', 'müsliriegel', 'pringles', 'oreo', 'haribo', 'mandeln',
      'cashews', 'erdnüsse', 'crackers', 'waffeln süss', 'schokoriegel', 'gummis'],
  },
];

export const DEFAULT_CATEGORY = 'Konserven & Saucen';

export function detectCategory(name) {
  if (!name) return DEFAULT_CATEGORY;
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.name;
  }
  return DEFAULT_CATEGORY;
}

export function suggestUnit(name, categoryName) {
  const lower = (name || '').toLowerCase();
  if (['hackfleisch', 'steak', 'lachs', 'fisch', 'fleisch', 'käse', 'schinken', 'speck'].some((w) => lower.includes(w))) return 'g';
  if (['mehl', 'zucker', 'reis', 'nudeln', 'pasta', 'linsen', 'bohnen'].some((w) => lower.includes(w))) return 'g';
  if (['milch', 'sahne', 'saft', 'essig', 'öl', 'wasser'].some((w) => lower.includes(w))) return 'L';
  const cat = CATEGORIES.find((c) => c.name === categoryName);
  return cat?.defaultUnit || 'Stück';
}
