export const CATEGORIES = [
  {
    name: 'Καφέδες',
    items: [
      { name: 'Freddo espresso', price: 3.5 },
      { name: 'Freddo cappuccino', price: 4 },
      { name: 'Espresso', price: 3 },
      { name: 'Cappuccino', price: 3.5 },
      { name: 'Americano', price: 3.5 },
      { name: 'Ελληνικός', price: 2.5 },
      { name: 'Σοκολάτα', price: 4 },
      { name: 'Nescafe', price: 3 },
      { name: 'Nescafe φραπέ', price: 3 },
      { name: 'Καφές φίλτρου', price: 3 },
      { name: 'Macchiato', price: 3.5 },
      { name: 'Latte', price: 4.5 },
      { name: 'Σοκολάτα βιενουά', price: 4.5 },
    ],
  },
  {
    name: 'Αναψυκτικά',
    items: [
      { name: 'Fanta Πορτοκαλάδα', price: 3.5 },
      { name: 'Sprite', price: 3.5 },
      { name: 'Fanta Λεμονάδα', price: 3.5 },
      { name: 'Coca Cola', price: 3.5 },
      { name: 'Coca Cola Zero', price: 3.5 },
      { name: 'Τσάι Ροδάκινο', price: 3.5 },
      { name: 'Τσάι Λεμόνι', price: 3.5 },
      { name: 'Τσάι Πράσινο', price: 3.5 },
      { name: 'Red Bull', price: 5 },
      { name: 'Σόδα', price: 3.5 },
      { name: 'Νερό Μικρό', price: 0.5 },
      { name: 'Νερό Μεγάλο', price: 1.5 },
      { name: 'Perrier', price: 3.5 },
      { name: 'Schweppes Πορτοκάλι', price: 3.5 },
      { name: 'Schweppes Λεμόνι', price: 3.5 },
      { name: 'Schweppes Pink', price: 3.5 },
      { name: 'Tonic', price: 3.5 },
      { name: '3 cents Pink', price: 4 },
      { name: '3 cents Ginger', price: 4 },
      { name: 'Σπιτική Λεμονάδα', price: 6 },
      { name: 'Σπιτική 9 Φρούτα', price: 6 },
      { name: 'Σπιτική Κερασάδα', price: 6 },
      { name: 'Σπιτική Ροδακινάδα', price: 6 },
      { name: 'Σπιτική Ροζ Λεμονάδα', price: 6 },
      { name: 'Σπιτική Πράσινο Μήλο - Ρόδι', price: 6 },
    ],
  },
  {
    name: 'Χυμοί',
    items: [
      { name: 'Φυσικός Χυμός', price: 5 },
      { name: 'Χυμός Πορτοκάλι', price: 3.5 },
      { name: 'Χυμός Ανάμεικτος', price: 3.5 },
      { name: 'Χυμός Βύσσινο', price: 3.5 },
      { name: 'Χυμός Μπανάνα', price: 3.5 },
      { name: 'Χυμός Μήλο', price: 3.5 },
      { name: 'Χυμός Ανάνα', price: 3.5 },
      { name: 'Χυμός Βερίκοκο', price: 3.5 },
      { name: 'Χυμός Ροδάκινο', price: 3.5 },
      { name: 'Χυμός Μανταρίνι', price: 3.5 },
      { name: 'Χυμός Φράουλα', price: 3.5 },
    ],
  },
  {
    name: 'Τοστ - Κρέπες',
    items: [
      { name: 'Τοστ', price: 2, materials: true },
      { name: 'Κρέπα αλμυρή', price: 3, materials: true },
      { name: 'Κρέπα γλυκιά', price: 3.5, materialsSweet: true },
    ],
  },
  {
    name: 'Μπύρες',
    items: [
      { name: 'Βαρέλι Μικρό', price: 4 },
      { name: 'Βαρέλι Μεγάλο', price: 5 },
      { name: 'Kaiser', price: 4 },
      { name: 'Radler', price: 4 },
      { name: 'Άλφα', price: 4 },
      { name: 'Μύθος', price: 4 },
      { name: 'Heineken', price: 4 },
      { name: 'Amstel', price: 4 },
      { name: 'Corona', price: 6 },
      { name: 'Βεργίνα', price: 4 },
      { name: 'Βεργίνα Weiss', price: 6 },
      { name: 'Βεργίνα Red', price: 6 },
      { name: 'Βεργίνα 0%', price: 4 },
      { name: 'Fix dark', price: 4 },
      { name: 'Heineken 0%', price: 4 },
    ],
  },
  {
    name: 'Ποτά - Κρασιά',
    items: [
      { name: 'Ποτό Απλό', price: 7 },
      { name: 'Ποτό Σπέσιαλ', price: 8 },
      { name: 'Ποτό Πρίμιουμ', price: 10 },
      { name: 'Κρασί ποτήρι', price: 6 },
      { name: 'Σφηνάκι', price: 3 },
      { name: 'Ρετσίνα Βασιλική', price: 6 },
      { name: 'Bianco Νero λευκό', price: 6 },
      { name: 'Bianco Nero αφρώδες', price: 6 },
      { name: 'Bianco Nero αφρώδες Ροζέ', price: 6 },
      { name: 'Λειβαδιώτη μπουκαλάκι', price: 6 },
      { name: 'Gordons Space', price: 5 },
      { name: 'Παράγκα Μπουκάλι', price: 30 },
      { name: 'Σαμαρόπετρα Μπουκάλι', price: 35 },
    ],
  },
  {
    name: 'Cocktails',
    items: [
      { name: 'Sex on the beach', price: 10 },
      { name: 'Caipiroska', price: 10 },
      { name: 'Daiquiri', price: 10 },
      { name: 'Zombie', price: 10 },
      { name: 'Mojito', price: 10 },
      { name: 'Cosmopolitan', price: 10 },
      { name: 'Margarita', price: 10 },
      { name: 'Caipirinha', price: 10 },
      { name: 'Negroni', price: 10 },
      { name: 'Aperol spritz', price: 10 },
      { name: 'Mai tai', price: 10 },
      { name: 'Long island', price: 10 },
      { name: 'Pina colada', price: 10 },
      { name: 'Yuzi gun', price: 11 },
      { name: 'Cucu splash', price: 11 },
      { name: 'Passion paradise', price: 11 },
      { name: 'Green Apple Perfume', price: 11 },
      { name: "Bartender's choice", price: 10 },
    ],
  },
  {
    name: 'Πρωινό',
    items: [
      { name: 'Ομελέτα', price: 7, materials: true },
      { name: 'Αυγά σκραμπλ', price: 6 },
      { name: 'Αυγά σκραμπλ Με Σολομό', price: 7 },
      { name: 'French toast Απλό', price: 5 },
      { name: 'French toast με μελί και κανέλα', price: 6 },
      { name: 'Pan cake Πραλίνα', price: 7 },
      { name: 'Pan cake Μέλι Κανέλα', price: 7 },
      { name: 'Pan cake Πραλίνα Μπανάνα Φουντούκια', price: 9 },
      { name: '2 αυγά τηγανητά με μπέικον και φρυγανιασμένο ψωμί', price: 6 },
      { name: 'Γιαούρτι με μέλι και καρύδια', price: 5 },
      { name: 'Γιαούρτι με μέλι και καρύδια + Φρούτα', price: 6 },
    ],
  },
  {
    name: 'Club sandwich',
    items: [
      { name: 'Club sandwich', price: 9 },
      { name: 'Club Sandwich Caesar Κοτόπουλο', price: 11 },
      { name: 'Club Sandwich με Γύρο', price: 11 },
      { name: 'Club πανσέτας', price: 12 },
    ],
  },
  {
    name: 'Junior menu',
    items: [
      { name: 'Junior 1', price: 7.5 },
      { name: 'Junior 2', price: 7.5 },
    ],
  },
  {
    name: 'Ούζο-Μεζέδες',
    items: [
      { name: 'Ούζο ποτήρι', price: 3 },
      { name: 'Μεζέδες', price: 3 },
      { name: 'Μπουκάλι Ούζο', price: 6 },
      { name: 'Αποστολάκι', price: 10 },
    ],
  },
  {
    name: 'Pinsa',
    items: [
      { name: 'Pinsa απλή', price: 11 },
      { name: 'Pinsa special', price: 12 },
      { name: 'Pinsa 21', price: 12 },
    ],
  },
  {
    name: 'Ζυμαρικά',
    items: [
      { name: 'Napolitana', price: 8 },
      { name: 'Bolognesa', price: 9 },
      { name: 'Carbonara', price: 9 },
      { name: 'Pasta 21', price: 9 },
      { name: 'Γαριδομακαρονάδα', price: 18 },
      { name: 'Παπαρδέλα ραγού με μοσχαρίσια ουρά', price: 16 },
      { name: 'Λιγκουίνι χταπόδι', price: 18 },
    ],
  },
  {
    name: 'Hot dogs - Burgers',
    items: [
      { name: 'Hot dog', price: 6, materials: true },
      { name: 'Burger BBQ', price: 9 },
      { name: 'Burger Caesar', price: 9 },
      { name: 'Burger 21', price: 10 },
      { name: 'Double cheese burger', price: 10 },
      { name: 'Chicken crispy burger', price: 9 },
    ],
  },
  {
    name: 'Bao buns',
    items: [
      { name: 'Shrimp chili bao', price: 8 },
      { name: 'Nuggets bao', price: 7 },
      { name: 'Pulled pork bao', price: 7 },
    ],
  },
  {
    name: 'Σαλάτες',
    items: [
      { name: 'Σαλάτα Caesar', price: 8.5 },
      { name: 'Σαλάτα 21', price: 8 },
      { name: 'Σαλάτα Caprese', price: 7 },
      { name: 'Σαλάτα Κουκουβάγια', price: 8 },
      { name: 'Σαλάτα χωριάτικη', price: 8 },
      { name: 'Ποικιλία τυριών', price: 12 },
    ],
  },
  {
    name: 'Κυρίως πιάτα',
    items: [
      { name: 'Ριζότο μανιταριών', price: 15 },
      { name: 'Χοιρινή Πανσετομπριζόλα', price: 15 },
      { name: 'Τορτιγια με Γύρο Χοίρινο', price: 6 },
      { name: 'Κοτοπουλάκια Nuggets', price: 11 },
      { name: 'Chicken nuggets a la crème', price: 12 },
      { name: 'Καλαμαράκια τηγανητά', price: 12 },
      { name: 'Σολομός Tεριγιάκι με Λαχανικά', price: 18 },
      { name: 'Μπούτι κοτόπουλο', price: 11 },
      { name: 'Μπιφτέκι', price: 11 },
      { name: 'Γύρος χοιρινός', price: 11 },
      { name: 'Mix grill', price: 17 },
      { name: 'Μερίδα Πατάτες', price: 5 }
    ],
  },
];

export const EXTRALIST = [
  { name: 'κασέρι', price: 0.5 },
  { name: 'ζαμπόν', price: 0.5 },
  { name: 'γαλοπούλα', price: 0.5 },
  { name: 'κοτομπουκιές', price: 1 },
  { name: 'κασεροκροκέτα', price: 1 },
  { name: 'μπέικον', price: 0.5 },
  { name: 'ντομάτα', price: 0.5 },
  { name: 'αυγό', price: 0.5 },
  { name: 'φέτα', price: 0.5 },
  { name: 'μανιτάρια', price: 0.5 },
  { name: 'χτυπητή', price: 0.5 },
  { name: 'μαγιονέζα', price: 0.5 },
  { name: 'πατατάκια', price: 0.5 },
  { name: 'sauce μουστάρδας', price: 0.5 },
  { name: 'καπνιστή μπριζόλα', price: 0.5 },
  { name: 'πεπερόνι', price: 0.5 },
  { name: 'σαλάμι μπύρας', price: 0.5 },
  { name: 'μορταδέλα', price: 0.5 },
  { name: 'philadelphia', price: 0.5 },
  { name: 'πάριζα', price: 0.5 },
  { name: 'κοτόπουλο', price: 1 },
  { name: 'πιπεριά', price: 0.5 },
  { name: 'καλαμπόκι', price: 0.5 },
  { name: 'ελιές', price: 0.5 },
  { name: 'ρωσική', price: 0.5 },
  { name: 'πατάτες τηγανητές', price: 1 },
  { name: 'ουγγαρέζα', price: 0.5 },
  { name: 'κηπουρού', price: 0.5 },
  { name: 'πάπρικα', price: 0.5 },
  { name: 'μανούρι', price: 0.5 },
  { name: 'λουκάνικο', price: 1 },
  { name: 'σαλάμι αέρος', price: 0.5 },
].map((extra) => ({ ...extra, selected: false }));

export const EXTRALISTSWEET = [
  { name: 'μερέντα', price: 0.5 },
  { name: 'nutella', price: 1 },
  { name: 'μπισκότο', price: 0.5 },
  { name: 'μπανάνα', price: 0.5 },
  { name: 'λευκή σοκολάτα', price: 0.5 },
  { name: 'παγωτό', price: 2.5 },
  { name: 'μπισκότο oreo', price: 1 },
  { name: 'φράουλα', price: 0.5 },
  { name: 'bueno', price: 0.5 },
  { name: 'καρύδι', price: 0.5 },
  { name: 'φουντούκι', price: 0.5 },
  { name: 'αμύγδαλο', price: 0.5 },
  { name: 'lila pause', price: 0.5 },
  { name: 'μαρμελάδα φράουλα', price: 0.5 },
  { name: 'μαρμελάδα ροδάκινο', price: 0.5 },
  { name: 'caprice', price: 0.5 },
].map((extra) => ({ ...extra, selected: false }));
