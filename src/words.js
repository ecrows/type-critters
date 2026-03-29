// Word list: 3-5 letter common nouns kids can picture
// Each entry: [WORD, EMOJI, CATEGORY]
const WORDS = [
  // Animals
  ["CAT", "\u{1F431}", "animals"], ["DOG", "\u{1F436}", "animals"], ["FISH", "\u{1F41F}", "animals"], ["FROG", "\u{1F438}", "animals"],
  ["BIRD", "\u{1F426}", "animals"], ["BEAR", "\u{1F43B}", "animals"], ["DUCK", "\u{1F986}", "animals"], ["LION", "\u{1F981}", "animals"],
  ["DEER", "\u{1F98C}", "animals"], ["SEAL", "\u{1F43E}", "animals"], ["CRAB", "\u{1F980}", "animals"], ["BUNNY", "\u{1F430}", "animals"],
  ["HORSE", "\u{1F434}", "animals"], ["MOUSE", "\u{1F42D}", "animals"], ["SHEEP", "\u{1F411}", "animals"], ["WHALE", "\u{1F433}", "animals"],
  ["TIGER", "\u{1F42F}", "animals"], ["PANDA", "\u{1F43C}", "animals"], ["GOAT", "\u{1F410}", "animals"], ["SNAIL", "\u{1F40C}", "animals"],

  // Food
  ["CAKE", "\u{1F382}", "food"], ["CORN", "\u{1F33D}", "food"], ["PEAR", "\u{1F350}", "food"], ["PLUM", "\u{1F351}", "food"],
  ["BREAD", "\u{1F35E}", "food"], ["GRAPE", "\u{1F347}", "food"], ["PIZZA", "\u{1F355}", "food"], ["CANDY", "\u{1F36C}", "food"],
  ["APPLE", "\u{1F34E}", "food"], ["BERRY", "\u{1F353}", "food"], ["TACO", "\u{1F32E}", "food"], ["MILK", "\u{1F95B}", "food"],
  ["SOUP", "\u{1F372}", "food"], ["PIE", "\u{1F967}", "food"], ["EGG", "\u{1F95A}", "food"],

  // Nature
  ["TREE", "\u{1F333}", "nature"], ["STAR", "\u{2B50}", "nature"], ["MOON", "\u{1F319}", "nature"], ["SUN", "\u{2600}\u{FE0F}", "nature"],
  ["LEAF", "\u{1F343}", "nature"], ["RAIN", "\u{1F327}\u{FE0F}", "nature"], ["SNOW", "\u{2744}\u{FE0F}", "nature"],
  ["CLOUD", "\u{2601}\u{FE0F}", "nature"], ["HILL", "\u{26F0}\u{FE0F}", "nature"], ["ROCK", "\u{26F0}\u{FE0F}", "nature"], ["SAND", "\u{1F3D6}\u{FE0F}", "nature"],

  // Objects / Toys
  ["BALL", "\u{26BD}", "things"], ["BOAT", "\u{26F5}", "things"], ["DRUM", "\u{1F941}", "things"], ["BELL", "\u{1F514}", "things"],
  ["KITE", "\u{1FA81}", "things"], ["LAMP", "\u{1F4A1}", "things"], ["BOOK", "\u{1F4D6}", "things"], ["CROWN", "\u{1F451}", "things"],
  ["TRAIN", "\u{1F682}", "things"], ["BIKE", "\u{1F6B2}", "things"], ["DOLL", "\u{1F9F8}", "things"], ["FLAG", "\u{1F6A9}", "things"],

  // Home / Body
  ["DOOR", "\u{1F6AA}", "home"], ["SOCK", "\u{1F9E6}", "home"], ["SHOE", "\u{1F45F}", "home"], ["HAND", "\u{270B}", "home"],
  ["BATH", "\u{1F6C1}", "home"], ["BED", "\u{1F6CF}\u{FE0F}", "home"], ["CUP", "\u{2615}", "home"], ["HAT", "\u{1F3A9}", "home"],
  ["KEY", "\u{1F511}", "home"],
];

const CATEGORIES = ['animals', 'food', 'nature', 'things', 'home'];

// Boss words: 6-7 letters, shown as the 5th word of each round
const BOSS_WORDS = [
  // Animals
  ["RABBIT", "\u{1F430}", "animals"], ["PARROT", "\u{1F99C}", "animals"], ["TURTLE", "\u{1F422}", "animals"],
  ["MONKEY", "\u{1F412}", "animals"], ["KITTEN", "\u{1F431}", "animals"], ["DRAGON", "\u{1F409}", "animals"],
  ["GIRAFFE", "\u{1F992}", "animals"], ["PENGUIN", "\u{1F427}", "animals"], ["DOLPHIN", "\u{1F42C}", "animals"],
  ["CHICKEN", "\u{1F414}", "animals"], ["HAMSTER", "\u{1F439}", "animals"], ["OCTOPUS", "\u{1F419}", "animals"],
  ["LEOPARD", "\u{1F406}", "animals"], ["UNICORN", "\u{1F984}", "animals"],
  // Food
  ["COOKIE", "\u{1F36A}", "food"], ["BANANA", "\u{1F34C}", "food"], ["CHERRY", "\u{1F352}", "food"],
  ["MUFFIN", "\u{1F9C1}", "food"], ["WAFFLE", "\u{1F9C7}", "food"], ["NOODLE", "\u{1F35C}", "food"],
  ["PANCAKE", "\u{1F95E}", "food"], ["POPCORN", "\u{1F37F}", "food"],
  // Nature
  ["FLOWER", "\u{1F338}", "nature"], ["RAINBOW", "\u{1F308}", "nature"], ["VOLCANO", "\u{1F30B}", "nature"],
  ["THUNDER", "\u{26C8}\u{FE0F}", "nature"],
  // Things
  ["CASTLE", "\u{1F3F0}", "things"], ["ROCKET", "\u{1F680}", "things"], ["PUZZLE", "\u{1F9E9}", "things"],
  ["TROPHY", "\u{1F3C6}", "things"], ["BALLOON", "\u{1F388}", "things"],
  // Home
  ["MIRROR", "\u{1FA9E}", "home"], ["BASKET", "\u{1F9FA}", "home"], ["CANDLE", "\u{1F56F}\u{FE0F}", "home"],
  ["PILLOW", "\u{1FAD7}", "home"],
];
