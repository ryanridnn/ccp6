const MIN = 60 * 1000;
const ago = (mins) => new Date(Date.now() - mins * MIN).toISOString();

const HEADER = {
  flight_date: "2026-08-07",
  etd: "14:30",
};

function mkItems(list) {
  return list.map((it, i) => ({
    link_id: "LINK-" + it.sku,
    ccp5_record_id: it.rec || "CP5-" + (1000 + i * 7),
    sku: it.sku,
    item_description: it.desc,
    class: it.cls,
    quantity: it.qty,
  }));
}

let _linkIdCounter = 0;
function mkFCItem(item, opts = {}) {
  return {
    linkId: "LINK-" + item.sku + "-" + (opts.index ?? _linkIdCounter++),
    sku: item.sku,
    item_description: item.desc,
    class: item.cls,
    quantity: item.qty,
    startTemp: opts.startTemp ?? null,
    finishTemp: opts.finishTemp ?? null,
    startTime: opts.startTime ?? null,
    finishTime: opts.finishTime ?? null,
    durationMin: opts.durationMin ?? null,
    status: opts.status ?? "NotStarted",
    complianceResult: opts.compliance ?? null,
    exceptionId: opts.exceptionId ?? null,
  };
}

const JOB_1 = {
  job_id: "CCP6-260807-01",
  flight_number: "QF12",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Lunch",
  ta_group: "A",
  airline: "Qantas (QF)",
  rule_set: "QF",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(120),
  linkedItems: mkItems([
    { sku: "100100", desc: "Roasted Chicken Supreme", cls: "Economy", qty: 96, rec: "CP5-1001" },
    { sku: "100210", desc: "Grilled Sea Bass Fillet", cls: "Premium Economy", qty: 48, rec: "CP5-1002" },
    { sku: "100305", desc: "Chocolate Opera Cake", cls: "Economy", qty: 96, rec: "CP5-1003" },
  ]),
  preset: {
    status: "NotStarted",
    services: [
      {
        startTime: null,
        finishTime: null,
        startTempHorsDoeuvre: null,
        finishTempHorsDoeuvre: null,
        startTempDessert: null,
        finishTempDessert: null,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: null,
        maxSurfaceTemp: null,
        complianceResult: null,
      }
    ],
    items: [
      mkFCItem({ sku: "SQZJ19", desc: "APP TUNA BALL / CABBAGE ROLL", cls: "BC", qty: 24 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "CAMEMBERT / KUMQUAT / PROSCIUTTO", cls: "BC", qty: 24 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "DES MANGO MOUSSE", cls: "BC", qty: 48 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "BRSD CHICK W SICHUAN CHILLI SCE", cls: "EY", qty: 160 }, { status: "NotStarted" }),
    ],
    traysHandled: 256,
    staffCount: 6,
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "100100", desc: "Roasted Chicken Supreme", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
      mkFCItem({ sku: "100210", desc: "Grilled Sea Bass Fillet", cls: "Premium Economy", qty: 48 }, { status: "NotStarted" }),
      mkFCItem({ sku: "100305", desc: "Chocolate Opera Cake", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
      mkFCItem({ sku: "100410", desc: "Caesar Salad", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(120), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const JOB_2 = {
  job_id: "CCP6-260807-02",
  flight_number: "UA24",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Breakfast",
  ta_group: "B",
  airline: "United Airlines (UA)",
  rule_set: "UA",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(90),
  linkedItems: mkItems([
    { sku: "200101", desc: "Egg White Omelette", cls: "Economy", qty: 120, rec: "CP5-2001" },
    { sku: "200202", desc: "Buttermilk Pancake Stack", cls: "Business", qty: 36, rec: "CP5-2002" },
  ]),
  preset: {
    status: "NotStarted",
    services: [
      {
        startTime: null,
        finishTime: null,
        startTempHorsDoeuvre: null,
        finishTempHorsDoeuvre: null,
        startTempDessert: null,
        finishTempDessert: null,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: null,
        maxSurfaceTemp: null,
        complianceResult: null,
      }
    ],
    items: [
      mkFCItem({ sku: "SQZJ19", desc: "EGG WHITE OMELETTE / TOAST", cls: "BC", qty: 120 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "BUTTERMILK PANCAKE STACK", cls: "BC", qty: 36 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "FRESH FRUIT BOWL", cls: "BC", qty: 120 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "SMOKED SALMON BAGEL", cls: "EY", qty: 36 }, { status: "NotStarted" }),
    ],
    traysHandled: 180,
    staffCount: 5,
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "200101", desc: "Egg White Omelette", cls: "Economy", qty: 120 }, { status: "NotStarted" }),
      mkFCItem({ sku: "200202", desc: "Buttermilk Pancake Stack", cls: "Business", qty: 36 }, { status: "NotStarted" }),
      mkFCItem({ sku: "200303", desc: "Fresh Fruit Bowl", cls: "Economy", qty: 120 }, { status: "NotStarted" }),
      mkFCItem({ sku: "200404", desc: "Smoked Salmon Bagel", cls: "Business", qty: 36 }, { status: "NotStarted" }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(90), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const JOB_3 = {
  job_id: "CCP6-260807-03",
  flight_number: "SQ-ORD-31",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Dinner",
  ta_group: "C",
  airline: "Standard / Other Airline",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(150),
  linkedItems: mkItems([
    { sku: "300101", desc: "Beef Rendang with Jasmine Rice", cls: "Economy", qty: 144, rec: "CP5-3001" },
    { sku: "300202", desc: "Pan Seared Salmon", cls: "Premium Economy", qty: 60, rec: "CP5-3002" },
    { sku: "300303", desc: "Tiramisu Cup", cls: "Economy", qty: 144, rec: "CP5-3003" },
  ]),
  preset: {
    status: "NotStarted",
    services: [
      {
        startTime: null,
        finishTime: null,
        startTempHorsDoeuvre: null,
        finishTempHorsDoeuvre: null,
        startTempDessert: null,
        finishTempDessert: null,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: null,
        maxSurfaceTemp: null,
        complianceResult: null,
      }
    ],
    items: [
      mkFCItem({ sku: "SQZJ19", desc: "BEEF RENDANG / JASMINE RICE", cls: "BC", qty: 144 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "PAN SEARED SALMON", cls: "BC", qty: 60 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "TIRAMISU CUP", cls: "BC", qty: 144 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "GRILLED VEGETABLE PLATE", cls: "EY", qty: 60 }, { status: "NotStarted" }),
    ],
    traysHandled: 300,
    staffCount: 8,
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "300101", desc: "Beef Rendang with Jasmine Rice", cls: "Economy", qty: 144 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "300202", desc: "Pan Seared Salmon", cls: "Premium Economy", qty: 60 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "300303", desc: "Tiramisu Cup", cls: "Economy", qty: 144 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "300404", desc: "Garden Salad", cls: "Economy", qty: 144 }, {
        status: "NotStarted",
      }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(150), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const JOB_4 = {
  job_id: "CCP6-260807-04",
  flight_number: "BA5",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Lunch",
  ta_group: "D",
  airline: "Standard / Other Airline",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(300),
  linkedItems: mkItems([
    { sku: "400101", desc: "Chicken Tikka Masala", cls: "Economy", qty: 72, rec: "CP5-4001" },
    { sku: "400202", desc: "Vegetable Korma", cls: "Special Meal", qty: 24, rec: "CP5-4002" },
  ]),
  preset: {
    status: "NotStarted",
    startTime: null,
    finishTime: null,
    startTempHorsDoeuvre: null,
    finishTempHorsDoeuvre: null,
    startTempDessert: null,
    finishTempDessert: null,
    traysHandled: 0,
    staffCount: 0,
    exposureDurationMin: null,
    complianceResult: null,
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "400101", desc: "Chicken Tikka Masala", cls: "Economy", qty: 72 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "400202", desc: "Vegetable Korma", cls: "Special Meal", qty: 24 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "400303", desc: "Garlic Naan", cls: "Economy", qty: 72 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "400404", desc: "Mango Lassi", cls: "Special Meal", qty: 24 }, {
        status: "NotStarted",
      }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(300), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const EXC_5 = {
  exception_id: "EXC-260807-05-1",
  nc_reason_system: "Exposure duration exceeded limit",
  root_cause: "Equipment",
  other_reason: "",
  immediate_correction: "Reworked trays and returned to chilled holding",
  corrective_action: "Re-verify line throughput before next service",
  food_disposed: true,
  remarks: "Item left on bench during tray break",
  photos: ["mg-ccp6-0501"],
};

const JOB_5 = {
  job_id: "CCP6-260807-05",
  flight_number: "NH7",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Breakfast",
  ta_group: "A",
  airline: "Standard / Other Airline",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(400),
  linkedItems: mkItems([
    { sku: "500101", desc: "Japanese Chicken Teriyaki", cls: "Economy", qty: 108, rec: "CP5-5001" },
    { sku: "500202", desc: "Tamago Sushi Roll", cls: "Economy", qty: 108, rec: "CP5-5002" },
  ]),
  preset: {
    status: "NotStarted",
    startTime: null,
    finishTime: null,
    startTempHorsDoeuvre: null,
    finishTempHorsDoeuvre: null,
    startTempDessert: null,
    finishTempDessert: null,
    traysHandled: 0,
    staffCount: 0,
    exposureDurationMin: null,
    complianceResult: null,
    items: [
      mkFCItem({ sku: "SQZJ19", desc: "JAPANESE CHICKEN TERIYAKI", cls: "BC", qty: 108 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "TAMAGO SUSHI ROLL", cls: "BC", qty: 108 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "MISO SOUP", cls: "BC", qty: 108 }, { status: "NotStarted" }),
      mkFCItem({ sku: "SQZJ19", desc: "EDAMAME", cls: "EY", qty: 108 }, { status: "NotStarted" }),
    ],
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "500101", desc: "Japanese Chicken Teriyaki", cls: "Economy", qty: 108 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "500202", desc: "Tamago Sushi Roll", cls: "Economy", qty: 108 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "500303", desc: "Miso Soup", cls: "Economy", qty: 108 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "500404", desc: "Edamame", cls: "Economy", qty: 108 }, {
        status: "NotStarted",
      }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(400), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const JOB_6 = {
  job_id: "CCP6-260807-06",
  flight_number: "CX88",
  flight_date: HEADER.flight_date,
  etd: HEADER.etd,
  meal_service: "Dinner",
  ta_group: "B",
  airline: "Standard / Other Airline",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(60),
  linkedItems: mkItems([
    { sku: "600101", desc: "Char Siu Pork Noodles", cls: "Economy", qty: 84, rec: "CP5-6001" },
    { sku: "600202", desc: "Steamed Cod with Broccoli", cls: "Business", qty: 30, rec: "CP5-6002" },
  ]),
  preset: {
    status: "NotStarted",
    startTime: null,
    finishTime: null,
    startTempHorsDoeuvre: null,
    finishTempHorsDoeuvre: null,
    startTempDessert: null,
    finishTempDessert: null,
    traysHandled: 0,
    staffCount: 0,
    exposureDurationMin: null,
    complianceResult: null,
  },
  foodChecker: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "600101", desc: "Char Siu Pork Noodles", cls: "Economy", qty: 84 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "600202", desc: "Steamed Cod with Broccoli", cls: "Business", qty: 30 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "600303", desc: "Spring Rolls", cls: "Economy", qty: 84 }, {
        status: "NotStarted",
      }),
      mkFCItem({ sku: "600404", desc: "Hot & Sour Soup", cls: "Business", qty: 30 }, {
        status: "NotStarted",
      }),
    ],
  },
  dispatch: {
    beforeExitTime: null,
    beforeExitTemp: null,
    beforeExitTemps: {},
    coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(),
    coldSoakDurationMin: null,
    complianceResult: null,
    status: null,
  },
  signoffs: [],
  exceptions: [],
  history: [
    { at: ago(60), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 },
  ],
};

const STAFF = [
  { staffId: "ryan22", staffName: "Ryan", role: "FAA" },
  { staffId: "faa11", staffName: "Noor Aisyah", role: "FAA" },
  { staffId: "faa04", staffName: "Maya Tan", role: "FAA" },
  { staffId: "fc07", staffName: "Ravi Kumar", role: "Food Checker" },
  { staffId: "fc02", staffName: "Siti Rahayu", role: "Food Checker" },
  { staffId: "cts09", staffName: "Boon Seng", role: "CTS" },
];

const FLIGHTS = [
  { flight_number: "QF12", meal_service: "Lunch", airline: "Qantas (QF)", flight_date: "2026-08-07", etd: "14:30", count: 3, site: "SICC2" },
  { flight_number: "UA24", meal_service: "Breakfast", airline: "United Airlines (UA)", flight_date: "2026-08-07", etd: "14:30", count: 2, site: "SICC2" },
  { flight_number: "SQ-ORD-31", meal_service: "Dinner", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "14:30", count: 3, site: "SICC2" },
  { flight_number: "BA5", meal_service: "Lunch", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "14:30", count: 2, site: "SICC1" },
  { flight_number: "NH7", meal_service: "Breakfast", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "14:30", count: 2, site: "SICC2" },
  { flight_number: "CX88", meal_service: "Dinner", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "14:30", count: 2, site: "SICC1" },
];

export function buildSeed() {
  return [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5, JOB_6];
}

export function seedStaff() {
  return STAFF;
}

export function seedFlights() {
  return FLIGHTS;
}
