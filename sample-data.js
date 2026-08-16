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

function completeJob(job, closedAt) {
  const staff = {
    staffId: "STF-001",
    staffName: "Alice Smith",
    role: "Operator",
    captureMethod: "staffid",
  };

  job.job_status = "Closed";
  job.closed = true;
  job.closedAt = closedAt;

  // Preset
  job.preset.status = "Submitted";
  job.preset.complianceResult = "Compliant";
  if (job.preset.services) {
    job.preset.services.forEach((s) => {
      s.complianceResult = "Compliant";
    });
  }
  if (job.preset.items) {
    job.preset.items.forEach((it) => {
      it.status = "Submitted";
      it.complianceResult = "Compliant";
    });
  }

  // Food checker
  if (job.foodChecker) {
    job.foodChecker.status = "Submitted";
    (job.foodChecker.items || []).forEach((it) => {
      it.status = "Submitted";
      it.complianceResult = "Compliant";
    });
  }

  // Dispatch
  const dispatchBase = {
    status: "Submitted",
    complianceResult: "Compliant",
    coldSoakStart: ago(140),
    beforeExitTime: ago(90),
    coldSoakDurationMin: 120,
    beforeExitTemps: {},
  };
  if (job.dispatch) Object.assign(job.dispatch, dispatchBase);
  job.dispatchPreset = { ...dispatchBase };
  job.dispatchFC = { ...dispatchBase };

  // Signoffs
  job.signoffs = [
    { stage: "preset", ...staff, submittedAt: ago(110) },
    { stage: "foodchecker", ...staff, submittedAt: ago(100) },
    { stage: "dispatch", ...staff, submittedAt: ago(90) },
  ];

  // History
  job.history = (job.history || []).concat([
    { at: ago(110), actor: staff.staffName, field: "preset", from: "NotStarted", to: "Submitted", stage: "preset", version: 1 },
    { at: ago(100), actor: staff.staffName, field: "foodchecker", from: "NotStarted", to: "Submitted", stage: "foodchecker", version: 1 },
    { at: ago(90), actor: staff.staffName, field: "dispatch", from: "ColdSoak", to: "Submitted", stage: "dispatch", version: 1 },
    { at: ago(80), actor: staff.staffName, field: "job", from: "Open", to: "Closed", stage: "header", version: 1 },
  ]);

  return job;
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
        startTime: ago(120),
        finishTime: ago(110),
        startTempHorsDoeuvre: 5,
        finishTempHorsDoeuvre: 4,
        startTempDessert: 6,
        finishTempDessert: 5,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: 45,
        maxSurfaceTemp: null,
        complianceResult: "Compliant",
      },
      {
        startTime: ago(90),
        finishTime: ago(80),
        startTempHorsDoeuvre: 6,
        finishTempHorsDoeuvre: 5,
        startTempDessert: 7,
        finishTempDessert: 6,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: 50,
        maxSurfaceTemp: null,
        complianceResult: "Compliant",
      }
    ],
    items: [
      mkFCItem({ sku: "SQZJ19", desc: "APP TUNA BALL / CABBAGE ROLL", cls: "BC", qty: 24 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
    ],
    traysHandled: 256,
    staffCount: 6,
  },
  foodChecker: {
    status: "Submitted",
    items: [
      mkFCItem({ sku: "100100", desc: "Roasted Chicken Supreme", cls: "Economy", qty: 96 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "100210", desc: "Grilled Sea Bass Fillet", cls: "Premium Economy", qty: 48 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "100305", desc: "Chocolate Opera Cake", cls: "Economy", qty: 96 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "100410", desc: "Caesar Salad", cls: "Economy", qty: 96 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
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
    services: [
      {
        startTime: ago(120),
        finishTime: ago(110),
        startTempHorsDoeuvre: 5,
        finishTempHorsDoeuvre: 4,
        startTempDessert: 6,
        finishTempDessert: 5,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: 45,
        maxSurfaceTemp: null,
        complianceResult: "Compliant",
      },
      {
        startTime: ago(90),
        finishTime: ago(80),
        startTempHorsDoeuvre: 6,
        finishTempHorsDoeuvre: 5,
        startTempDessert: 7,
        finishTempDessert: 6,
        traysHandled: 0,
        staffCount: 0,
        exposureDurationMin: 50,
        maxSurfaceTemp: null,
        complianceResult: "Compliant",
      },
    ],
    items: [
      mkFCItem({ sku: "400101", desc: "Chicken Tikka Masala", cls: "Economy", qty: 72 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400202", desc: "Vegetable Korma", cls: "Special Meal", qty: 24 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400303", desc: "Garlic Naan", cls: "Economy", qty: 72 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400404", desc: "Mango Lassi", cls: "Special Meal", qty: 24 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
    ],
  },
  foodChecker: {
    status: "Submitted",
    items: [
      mkFCItem({ sku: "400101", desc: "Chicken Tikka Masala", cls: "Economy", qty: 72 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400202", desc: "Vegetable Korma", cls: "Special Meal", qty: 24 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400303", desc: "Garlic Naan", cls: "Economy", qty: 72 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
      }),
      mkFCItem({ sku: "400404", desc: "Mango Lassi", cls: "Special Meal", qty: 24 }, {
        status: "Submitted",
        startTime: ago(120),
        finishTime: ago(110),
        startTemp: 5,
        finishTemp: 4,
        durationMin: 45,
        compliance: "Compliant",
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
    services: [{}],
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

// SICC2 Jobs
const JOB_7 = {
  job_id: "CCP6-260807-07",
  flight_number: "EK215",
  flight_date: HEADER.flight_date,
  etd: "23:10",
  meal_service: "Dinner",
  ta_group: "A",
  airline: "Emirates (EK)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(50),
  linkedItems: mkItems([
    { sku: "700101", desc: "Lamb Ouzi", cls: "Economy", qty: 120, rec: "CP5-7001" },
    { sku: "700202", desc: "Grilled Sea Bass", cls: "Business", qty: 40, rec: "CP5-7002" },
    { sku: "700303", desc: "Baklava", cls: "Economy", qty: 120, rec: "CP5-7003" },
    { sku: "700404", desc: "Fresh Fruit Platter", cls: "Business", qty: 40, rec: "CP5-7004" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "700101", desc: "LAMB OUZI / RICE", cls: "EY", qty: 120 }, { status: "NotStarted" }),
      mkFCItem({ sku: "700202", desc: "GRILLED SEA BASS", cls: "BC", qty: 40 }, { status: "NotStarted" }),
      mkFCItem({ sku: "700303", desc: "BAKLAVA", cls: "EY", qty: 120 }, { status: "NotStarted" }),
    ],
    traysHandled: 200, staffCount: 6,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "700101", desc: "Lamb Ouzi", cls: "Economy", qty: 120 }, { status: "NotStarted" }),
    mkFCItem({ sku: "700202", desc: "Grilled Sea Bass", cls: "Business", qty: 40 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(50), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_8 = {
  job_id: "CCP6-260807-08",
  flight_number: "QR908",
  flight_date: HEADER.flight_date,
  etd: "13:20",
  meal_service: "Lunch",
  ta_group: "B",
  airline: "Qatar Airways (QR)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(45),
  linkedItems: mkItems([
    { sku: "800101", desc: "Chicken Machboos", cls: "Economy", qty: 96, rec: "CP5-8001" },
    { sku: "800202", desc: "Grilled Salmon", cls: "Business", qty: 32, rec: "CP5-8002" },
    { sku: "800303", desc: "Umm Ali", cls: "Economy", qty: 96, rec: "CP5-8003" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "800101", desc: "CHICKEN MACHBOOS", cls: "EY", qty: 96 }, { status: "NotStarted" }),
      mkFCItem({ sku: "800202", desc: "GRILLED SALMON", cls: "BC", qty: 32 }, { status: "NotStarted" }),
    ],
    traysHandled: 160, staffCount: 5,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "800101", desc: "Chicken Machboos", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(45), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_9 = {
  job_id: "CCP6-260807-09",
  flight_number: "SQ12",
  flight_date: HEADER.flight_date,
  etd: "08:00",
  meal_service: "Breakfast",
  ta_group: "C",
  airline: "Singapore Airlines (SQ)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(40),
  linkedItems: mkItems([
    { sku: "900101", desc: "Kaya Toast Set", cls: "Economy", qty: 108, rec: "CP5-9001" },
    { sku: "900202", desc: "Dim Sum Platter", cls: "Business", qty: 36, rec: "CP5-9002" },
    { sku: "900303", desc: "Fresh Fruit Bowl", cls: "Economy", qty: 108, rec: "CP5-9003" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "900101", desc: "KAYA TOAST SET", cls: "EY", qty: 108 }, { status: "NotStarted" }),
      mkFCItem({ sku: "900202", desc: "DIM SUM PLATTER", cls: "BC", qty: 36 }, { status: "NotStarted" }),
    ],
    traysHandled: 180, staffCount: 5,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "900101", desc: "Kaya Toast Set", cls: "Economy", qty: 108 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(40), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_10 = {
  job_id: "CCP6-260807-10",
  flight_number: "TG476",
  flight_date: HEADER.flight_date,
  etd: "21:30",
  meal_service: "Dinner",
  ta_group: "D",
  airline: "Thai Airways (TG)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(35),
  linkedItems: mkItems([
    { sku: "100101", desc: "Pad Thai", cls: "Economy", qty: 84, rec: "CP5-1001" },
    { sku: "100202", desc: "Tom Yum Soup", cls: "Business", qty: 28, rec: "CP5-1002" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "100101", desc: "PAD THAI", cls: "EY", qty: 84 }, { status: "NotStarted" }),
      mkFCItem({ sku: "100202", desc: "TOM YUM SOUP", cls: "BC", qty: 28 }, { status: "NotStarted" }),
    ],
    traysHandled: 140, staffCount: 4,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "100101", desc: "Pad Thai", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(35), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_11 = {
  job_id: "CCP6-260807-11",
  flight_number: "MH67",
  flight_date: HEADER.flight_date,
  etd: "12:45",
  meal_service: "Lunch",
  ta_group: "A",
  airline: "Malaysia Airlines (MH)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(30),
  linkedItems: mkItems([
    { sku: "110101", desc: "Nasi Lemak", cls: "Economy", qty: 96, rec: "CP5-1101" },
    { sku: "110202", desc: "Rendang Beef", cls: "Business", qty: 32, rec: "CP5-1102" },
    { sku: "110303", desc: "Kuih Tart", cls: "Economy", qty: 96, rec: "CP5-1103" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "110101", desc: "NASI LEMAK", cls: "EY", qty: 96 }, { status: "NotStarted" }),
      mkFCItem({ sku: "110202", desc: "RENDANG BEEF", cls: "BC", qty: 32 }, { status: "NotStarted" }),
    ],
    traysHandled: 160, staffCount: 5,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "110101", desc: "Nasi Lemak", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(30), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_12 = {
  job_id: "CCP6-260807-12",
  flight_number: "CI75",
  flight_date: HEADER.flight_date,
  etd: "09:15",
  meal_service: "Breakfast",
  ta_group: "B",
  airline: "China Airlines (CI)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(25),
  linkedItems: mkItems([
    { sku: "120101", desc: "Congee Set", cls: "Economy", qty: 72, rec: "CP5-1201" },
    { sku: "120202", desc: "Xiao Long Bao", cls: "Business", qty: 24, rec: "CP5-1202" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "120101", desc: "CONGEE SET", cls: "EY", qty: 72 }, { status: "NotStarted" }),
      mkFCItem({ sku: "120202", desc: "XIAO LONG BAO", cls: "BC", qty: 24 }, { status: "NotStarted" }),
    ],
    traysHandled: 120, staffCount: 4,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "120101", desc: "Congee Set", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(25), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_13 = {
  job_id: "CCP6-260807-13",
  flight_number: "BR18",
  flight_date: HEADER.flight_date,
  etd: "20:00",
  meal_service: "Dinner",
  ta_group: "C",
  airline: "EVA Air (BR)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(20),
  linkedItems: mkItems([
    { sku: "130101", desc: "Braised Pork Rice", cls: "Economy", qty: 84, rec: "CP5-1301" },
    { sku: "130202", desc: "Steamed Fish", cls: "Business", qty: 28, rec: "CP5-1302" },
    { sku: "130303", desc: "Mango Pudding", cls: "Economy", qty: 84, rec: "CP5-1303" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "130101", desc: "BRAISED PORK RICE", cls: "EY", qty: 84 }, { status: "NotStarted" }),
      mkFCItem({ sku: "130202", desc: "STEAMED FISH", cls: "BC", qty: 28 }, { status: "NotStarted" }),
    ],
    traysHandled: 140, staffCount: 4,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "130101", desc: "Braised Pork Rice", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(20), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_14 = {
  job_id: "CCP6-260807-14",
  flight_number: "KE65",
  flight_date: HEADER.flight_date,
  etd: "11:30",
  meal_service: "Lunch",
  ta_group: "D",
  airline: "Korean Air (KE)",
  rule_set: "STANDARD",
  site: "SICC2",
  job_status: "Open",
  closed: false,
  createdAt: ago(15),
  linkedItems: mkItems([
    { sku: "140101", desc: "Bibimbap", cls: "Economy", qty: 108, rec: "CP5-1401" },
    { sku: "140202", desc: "Bulgogi", cls: "Business", qty: 36, rec: "CP5-1402" },
    { sku: "140303", desc: "Kimchi", cls: "Economy", qty: 108, rec: "CP5-1403" },
    { sku: "140404", desc: "Tteok", cls: "Business", qty: 36, rec: "CP5-1404" },
  ]),
  preset: {
    status: "NotStarted",
    items: [
      mkFCItem({ sku: "140101", desc: "BIBIMBAP", cls: "EY", qty: 108 }, { status: "NotStarted" }),
      mkFCItem({ sku: "140202", desc: "BULGOGI", cls: "BC", qty: 36 }, { status: "NotStarted" }),
    ],
    traysHandled: 180, staffCount: 5,
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "140101", desc: "Bibimbap", cls: "Economy", qty: 108 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(15), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

// SICC1 Jobs
const JOB_15 = {
  job_id: "CCP6-260807-15",
  flight_number: "QF1",
  flight_date: HEADER.flight_date,
  etd: "06:00",
  meal_service: "Breakfast",
  ta_group: "A",
  airline: "Qantas (QF)",
  rule_set: "QF",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(55),
  linkedItems: mkItems([
    { sku: "150101", desc: "Vegemite Toast", cls: "Economy", qty: 72, rec: "CP5-1501" },
    { sku: "150202", desc: "Fresh Fruit Cup", cls: "Economy", qty: 72, rec: "CP5-1502" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "150101", desc: "Vegemite Toast", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
    mkFCItem({ sku: "150202", desc: "Fresh Fruit Cup", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(55), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_16 = {
  job_id: "CCP6-260807-16",
  flight_number: "NZ5",
  flight_date: HEADER.flight_date,
  etd: "12:15",
  meal_service: "Lunch",
  ta_group: "B",
  airline: "Air New Zealand (NZ)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(50),
  linkedItems: mkItems([
    { sku: "160101", desc: "Lamb Pie", cls: "Economy", qty: 60, rec: "CP5-1601" },
    { sku: "160202", desc: "Pavlova", cls: "Economy", qty: 60, rec: "CP5-1602" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "160101", desc: "Lamb Pie", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
    mkFCItem({ sku: "160202", desc: "Pavlova", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(50), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_17 = {
  job_id: "CCP6-260807-17",
  flight_number: "VA43",
  flight_date: HEADER.flight_date,
  etd: "18:30",
  meal_service: "Dinner",
  ta_group: "C",
  airline: "Virgin Australia (VA)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(45),
  linkedItems: mkItems([
    { sku: "170101", desc: "Chicken Parmigiana", cls: "Economy", qty: 84, rec: "CP5-1701" },
    { sku: "170202", desc: "Tim Tam", cls: "Economy", qty: 84, rec: "CP5-1702" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "170101", desc: "Chicken Parmigiana", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
    mkFCItem({ sku: "170202", desc: "Tim Tam", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(45), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_18 = {
  job_id: "CCP6-260807-18",
  flight_number: "JQ7",
  flight_date: HEADER.flight_date,
  etd: "07:45",
  meal_service: "Breakfast",
  ta_group: "D",
  airline: "Jetstar (JQ)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(40),
  linkedItems: mkItems([
    { sku: "180101", desc: "Breakfast Roll", cls: "Economy", qty: 96, rec: "CP5-1801" },
    { sku: "180202", desc: "Coffee", cls: "Economy", qty: 96, rec: "CP5-1802" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "180101", desc: "Breakfast Roll", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
    mkFCItem({ sku: "180202", desc: "Coffee", cls: "Economy", qty: 96 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(40), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_19 = {
  job_id: "CCP6-260807-19",
  flight_number: "TT29",
  flight_date: HEADER.flight_date,
  etd: "13:00",
  meal_service: "Lunch",
  ta_group: "A",
  airline: "Tiger Airways (TT)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(35),
  linkedItems: mkItems([
    { sku: "190101", desc: "Chicken Rice", cls: "Economy", qty: 72, rec: "CP5-1901" },
    { sku: "190202", desc: "Spring Rolls", cls: "Economy", qty: 72, rec: "CP5-1902" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "190101", desc: "Chicken Rice", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
    mkFCItem({ sku: "190202", desc: "Spring Rolls", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(35), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_20 = {
  job_id: "CCP6-260807-20",
  flight_number: "FD31",
  flight_date: HEADER.flight_date,
  etd: "20:15",
  meal_service: "Dinner",
  ta_group: "B",
  airline: "Thai AirAsia (FD)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(30),
  linkedItems: mkItems([
    { sku: "200101", desc: "Green Curry", cls: "Economy", qty: 84, rec: "CP5-2001" },
    { sku: "200202", desc: "Mango Sticky Rice", cls: "Economy", qty: 84, rec: "CP5-2002" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "200101", desc: "Green Curry", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
    mkFCItem({ sku: "200202", desc: "Mango Sticky Rice", cls: "Economy", qty: 84 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(30), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_21 = {
  job_id: "CCP6-260807-21",
  flight_number: "AK15",
  flight_date: HEADER.flight_date,
  etd: "08:30",
  meal_service: "Breakfast",
  ta_group: "C",
  airline: "AirAsia (AK)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(25),
  linkedItems: mkItems([
    { sku: "210101", desc: "Nasi Lemak", cls: "Economy", qty: 60, rec: "CP5-2101" },
    { sku: "210202", desc: "Teh Tarik", cls: "Economy", qty: 60, rec: "CP5-2102" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "210101", desc: "Nasi Lemak", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
    mkFCItem({ sku: "210202", desc: "Teh Tarik", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(25), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_22 = {
  job_id: "CCP6-260807-22",
  flight_number: "5J12",
  flight_date: HEADER.flight_date,
  etd: "11:45",
  meal_service: "Lunch",
  ta_group: "D",
  airline: "Cebu Pacific (5J)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(20),
  linkedItems: mkItems([
    { sku: "220101", desc: "Adobo", cls: "Economy", qty: 72, rec: "CP5-2201" },
    { sku: "220202", desc: "Halo-Halo", cls: "Economy", qty: 72, rec: "CP5-2202" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "220101", desc: "Adobo", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
    mkFCItem({ sku: "220202", desc: "Halo-Halo", cls: "Economy", qty: 72 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(20), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_23 = {
  job_id: "CCP6-260807-23",
  flight_number: "PR73",
  flight_date: HEADER.flight_date,
  etd: "21:00",
  meal_service: "Dinner",
  ta_group: "A",
  airline: "Philippine Airlines (PR)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(15),
  linkedItems: mkItems([
    { sku: "230101", desc: "Sinigang", cls: "Economy", qty: 60, rec: "CP5-2301" },
    { sku: "230202", desc: "Lechon Kawali", cls: "Economy", qty: 60, rec: "CP5-2302" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "230101", desc: "Sinigang", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
    mkFCItem({ sku: "230202", desc: "Lechon Kawali", cls: "Economy", qty: 60 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(15), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
};

const JOB_24 = {
  job_id: "CCP6-260807-24",
  flight_number: "MI41",
  flight_date: HEADER.flight_date,
  etd: "09:30",
  meal_service: "Breakfast",
  ta_group: "B",
  airline: "SilkAir (MI)",
  rule_set: "STANDARD",
  site: "SICC1",
  job_status: "Open",
  closed: false,
  createdAt: ago(10),
  linkedItems: mkItems([
    { sku: "240101", desc: "Kaya Toast", cls: "Economy", qty: 48, rec: "CP5-2401" },
    { sku: "240202", desc: "Soft Boiled Eggs", cls: "Economy", qty: 48, rec: "CP5-2402" },
  ]),
  preset: {
    status: "NotStarted", startTime: null, finishTime: null,
    startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
    startTempDessert: null, finishTempDessert: null,
    traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
    services: [{}],
  },
  foodChecker: { status: "NotStarted", items: [
    mkFCItem({ sku: "240101", desc: "Kaya Toast", cls: "Economy", qty: 48 }, { status: "NotStarted" }),
    mkFCItem({ sku: "240202", desc: "Soft Boiled Eggs", cls: "Economy", qty: 48 }, { status: "NotStarted" }),
  ]},
  dispatch: { beforeExitTime: null, beforeExitTemp: null, beforeExitTemps: {}, coldSoakStart: new Date(Date.now() - 141 * 60000).toISOString(), coldSoakDurationMin: null, complianceResult: null, status: null },
  signoffs: [], exceptions: [],
  history: [{ at: ago(10), actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
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
  // SICC2 Flights (10+)
  { flight_number: "QF12", meal_service: "Lunch", airline: "Qantas (QF)", flight_date: "2026-08-07", etd: "14:30", count: 3, site: "SICC2" },
  { flight_number: "UA24", meal_service: "Breakfast", airline: "United Airlines (UA)", flight_date: "2026-08-07", etd: "06:15", count: 2, site: "SICC2" },
  { flight_number: "SQ-ORD-31", meal_service: "Dinner", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "22:45", count: 3, site: "SICC2" },
  { flight_number: "NH7", meal_service: "Breakfast", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "07:30", count: 2, site: "SICC2" },
  { flight_number: "EK215", meal_service: "Dinner", airline: "Emirates (EK)", flight_date: "2026-08-07", etd: "23:10", count: 4, site: "SICC2" },
  { flight_number: "QR908", meal_service: "Lunch", airline: "Qatar Airways (QR)", flight_date: "2026-08-07", etd: "13:20", count: 3, site: "SICC2" },
  { flight_number: "SQ12", meal_service: "Breakfast", airline: "Singapore Airlines (SQ)", flight_date: "2026-08-07", etd: "08:00", count: 3, site: "SICC2" },
  { flight_number: "TG476", meal_service: "Dinner", airline: "Thai Airways (TG)", flight_date: "2026-08-07", etd: "21:30", count: 2, site: "SICC2" },
  { flight_number: "MH67", meal_service: "Lunch", airline: "Malaysia Airlines (MH)", flight_date: "2026-08-07", etd: "12:45", count: 3, site: "SICC2" },
  { flight_number: "CI75", meal_service: "Breakfast", airline: "China Airlines (CI)", flight_date: "2026-08-07", etd: "09:15", count: 2, site: "SICC2" },
  { flight_number: "BR18", meal_service: "Dinner", airline: "EVA Air (BR)", flight_date: "2026-08-07", etd: "20:00", count: 3, site: "SICC2" },
  { flight_number: "KE65", meal_service: "Lunch", airline: "Korean Air (KE)", flight_date: "2026-08-07", etd: "11:30", count: 4, site: "SICC2" },

  // SICC1 Flights (10+)
  { flight_number: "BA5", meal_service: "Lunch", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "14:30", count: 2, site: "SICC1" },
  { flight_number: "CX88", meal_service: "Dinner", airline: "Standard / Other Airline", flight_date: "2026-08-07", etd: "19:45", count: 2, site: "SICC1" },
  { flight_number: "QF1", meal_service: "Breakfast", airline: "Qantas (QF)", flight_date: "2026-08-07", etd: "06:00", count: 3, site: "SICC1" },
  { flight_number: "NZ5", meal_service: "Lunch", airline: "Air New Zealand (NZ)", flight_date: "2026-08-07", etd: "12:15", count: 2, site: "SICC1" },
  { flight_number: "VA43", meal_service: "Dinner", airline: "Virgin Australia (VA)", flight_date: "2026-08-07", etd: "18:30", count: 3, site: "SICC1" },
  { flight_number: "JQ7", meal_service: "Breakfast", airline: "Jetstar (JQ)", flight_date: "2026-08-07", etd: "07:45", count: 2, site: "SICC1" },
  { flight_number: "TT29", meal_service: "Lunch", airline: "Tiger Airways (TT)", flight_date: "2026-08-07", etd: "13:00", count: 2, site: "SICC1" },
  { flight_number: "FD31", meal_service: "Dinner", airline: "Thai AirAsia (FD)", flight_date: "2026-08-07", etd: "20:15", count: 3, site: "SICC1" },
  { flight_number: "AK15", meal_service: "Breakfast", airline: "AirAsia (AK)", flight_date: "2026-08-07", etd: "08:30", count: 2, site: "SICC1" },
  { flight_number: "5J12", meal_service: "Lunch", airline: "Cebu Pacific (5J)", flight_date: "2026-08-07", etd: "11:45", count: 3, site: "SICC1" },
  { flight_number: "PR73", meal_service: "Dinner", airline: "Philippine Airlines (PR)", flight_date: "2026-08-07", etd: "21:00", count: 2, site: "SICC1" },
  { flight_number: "MI41", meal_service: "Breakfast", airline: "SilkAir (MI)", flight_date: "2026-08-07", etd: "09:30", count: 2, site: "SICC1" },
];

export function buildSeed() {
  const completedSICC1 = completeJob(JOB_4, ago(60));
  const completedSICC2 = completeJob(JOB_1, ago(60));
  return [
    completedSICC1,
    completedSICC2,
    JOB_2, JOB_3, JOB_5, JOB_6, JOB_7, JOB_8, JOB_9, JOB_10,
    JOB_11, JOB_12, JOB_13, JOB_14, JOB_15, JOB_16, JOB_17, JOB_18,
    JOB_19, JOB_20, JOB_21, JOB_22, JOB_23, JOB_24,
  ];
}

export function seedStaff() {
  return STAFF;
}

export function seedFlights() {
  return FLIGHTS;
}
