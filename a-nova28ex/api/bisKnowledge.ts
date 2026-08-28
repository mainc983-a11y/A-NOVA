/**
 * SIH26107 BIS AI Assistant Knowledge Base & Domain Intelligence Engine
 * Grounded canonical reference for Indian Standards (IS), Certification Schemes,
 * Hallmarking, Testing Laboratories, Quality Control Orders (QCOs), and Compliance.
 */

export interface IndianStandardRecord {
  isCode: string;
  title: string;
  category: string;
  scheme: "Scheme I (ISI Mark)" | "Scheme II (CRS)" | "Scheme IV (CoC)" | "Hallmarking" | "Voluntary/Scheme I";
  isMandatoryQco: boolean;
  qcoDetails?: string;
  scope: string;
  keyParameters: string[];
  recognizedLabs: string[];
  portal: "manakonline.in" | "crsbis.in";
}

export const CANONICAL_INDIAN_STANDARDS: IndianStandardRecord[] = [
  // Electronics & IT (Compulsory Registration Scheme - Scheme II)
  {
    isCode: "IS 13252 (Part 1):2010 / IEC 60950-1",
    title: "Information Technology Equipment — Safety — Part 1: General Requirements",
    category: "Electronics & IT Goods",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Compulsory Registration Order (CRO)",
    scope: "Laptops, Desktops, Servers, Tablets, Power Banks, Printers, Scanners, POS Terminals, Smart Watches, Wireless Keyboards, CCTV Cameras.",
    keyParameters: ["Electric shock protection", "Dielectric strength test", "Temperature rise limit", "Flammability of enclosure", "Earth continuity", "Clearance and creepage distances"],
    recognizedLabs: ["BIS Central Laboratory (CL Sahibabad)", "ERTL (North/East/West/South)", "SAMEER", "TUV Rheinland India", "UL India", "Intertek India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16046 (Part 1 & 2):2018 / IEC 62133-1 & 2",
    title: "Secondary Cells and Batteries Containing Alkaline or Other Non-Acid Electrolytes for Portable Applications (Nickel & Lithium Systems)",
    category: "Batteries & Energy Storage",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Electronics & IT Goods (Compulsory Registration) Order",
    scope: "Lithium-ion cells, portable power bank batteries, laptop batteries, mobile phone secondary batteries.",
    keyParameters: ["Continuous charging safety", "External short circuit test", "Free fall impact", "Thermal abuse (130°C test)", "Crush resistance", "Overcharge & forced discharge"],
    recognizedLabs: ["BIS Central Laboratory", "SAMEER Chennai", "TUV India", "UL International Bangalore", "Intertek Manesar"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 15885 (Part 2/Sec 13):2012",
    title: "Lamp Controlgear — Part 2: Particular Requirements — Section 13: D.C. or A.C. Supplied Electronic Controlgear for LED Modules",
    category: "Lighting & Electronics",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Electronics & IT Goods CRO",
    scope: "LED Drivers, power supply units for indoor and outdoor LED lighting.",
    keyParameters: ["Insulation resistance & electric strength", "Thermal endurance test", "Fault condition testing", "Creepage & clearance", "Protection against moisture and dust"],
    recognizedLabs: ["BIS CL Sahibabad", "CPRI Bangalore", "ERTL Kolkata", "DEKRA India", "TUV SUD India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16102 (Part 1 & Part 2):2012",
    title: "Self-Ballasted LED Lamps for General Lighting Services — Part 1: Safety Requirements, Part 2: Performance Requirements",
    category: "Lighting & Consumer Electricals",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY CRO & Bureau of Energy Efficiency (BEE) Star Rating",
    scope: "Self-ballasted LED retrofit bulbs for domestic and commercial lighting.",
    keyParameters: ["Cap temperature rise", "Insulation resistance", "Luminous flux & efficacy (lm/W)", "Color temperature & CRI", "Harmonic current distortion (THD < 15%)"],
    recognizedLabs: ["BIS Central Lab", "ERTL Mumbai", "SAMEER", "National Test House (NTH)"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 616:2017 / IEC 60065",
    title: "Audio, Video and Similar Electronic Apparatus — Safety Requirements",
    category: "Consumer Electronics",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Compulsory Registration Order",
    scope: "Smart TVs, Home Theatres, Amplifiers, Set Top Boxes, Audio Systems.",
    keyParameters: ["Radiation hazards", "Heating under normal & fault conditions", "Electric shock hazard", "Mechanical strength", "Fire hazard prevention"],
    recognizedLabs: ["ERTL North Delhi", "TUV Rheinland", "SAMEER Mumbai", "UL India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16444 (Part 1):2015",
    title: "A.C. Static Direct Connected Watt-Hour Smart Meter Class 1 and 2",
    category: "Power & Smart Infrastructure",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Power Smart Meter QCO",
    scope: "Single-phase and three-phase smart electricity meters with bi-directional communication.",
    keyParameters: ["Accuracy limit tests", "Tamper detection tests", "Insulation & surge immunity", "Protocol compliance (IS 15959 / DLMS/COSEM)", "EMC/EMI resilience"],
    recognizedLabs: ["CPRI Bangalore/Bhopal", "ERDA Vadodara", "BIS Central Lab Sahibabad"],
    portal: "manakonline.in"
  },

  // Electrical & Household Appliances (Scheme I - ISI Mark)
  {
    isCode: "IS 302 (Part 1):2008 & Part 2 series",
    title: "Safety of Household and Similar Electrical Appliances",
    category: "Household Appliances",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Electrical Appliances (Quality Control) Order",
    scope: "Electric irons (IS 302-2-3), Electric water heaters/geysers (IS 302-2-21), Room heaters (IS 302-2-30), Food mixers/grinders (IS 302-2-14), Toasters (IS 302-2-9).",
    keyParameters: ["Leakage current & electric strength at operating temp", "Moisture resistance", "Overload protection of transformers & associated circuits", "Abnormal operation stability", "Construction & internal wiring"],
    recognizedLabs: ["BIS Regional Labs (Mumbai, Kolkata, Chennai, Chandigarh)", "NTH Kolkata", "CPRI", "MSME Testing Centres"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 1293:2019",
    title: "Plugs and Socket-Outlets for Domestic and Similar Purposes of Rated Voltage up to 250V and Rated Current up to 16A",
    category: "Electrical Accessories",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Plugs and Sockets (Quality Control) Order",
    scope: "2-pin and 3-pin plugs (6A, 10A, 16A), socket-outlets, multi-plugs, extension cords.",
    keyParameters: ["Provision for earthing", "Resistance to heat and fire (glow wire test at 850°C)", "Mechanical strength (tumbling barrel test)", "Temperature rise of contacts (< 45K)", "Withdrawal force test"],
    recognizedLabs: ["BIS Central Lab", "CPRI", "ERDA Vadodara", "NTH Ghaziabad"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 694:2010",
    title: "PVC Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductors for Working Voltages up to and Including 1100 V",
    category: "Cables & Wires",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Cables (Quality Control) Order",
    scope: "House wiring wires, industrial flexible cables, appliance cords.",
    keyParameters: ["Conductor DC resistance", "Insulation & sheath thickness", "Tensile strength & elongation at break", "High voltage spark test", "Oxygen and Temperature Index (flame retardancy)"],
    recognizedLabs: ["BIS Regional Labs", "CPRI", "ERDA", "National Test House"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 4151:2015",
    title: "Protective Helmets for Riders of Two-Wheeled Motor Vehicles",
    category: "Automotive Safety & PPE",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Road Transport & Highways (MoRTH) Mandatory Helmet Order",
    scope: "Full-face, open-face, and modular helmets for motorcycle and scooter riders.",
    keyParameters: ["Impact absorption test (ambient, hot, cold, water immersion)", "Retention system strength & dynamic displacement", "Visor optical properties & scratch/impact resistance", "Rigidity test", "Weight constraint (< 1.2 kg limit)"],
    recognizedLabs: ["ARAI Pune", "ICAT Manesar", "BIS Central Lab", "CIRT Pune"],
    portal: "manakonline.in"
  },

  // Food, Water & Beverages
  {
    isCode: "IS 10500:2012",
    title: "Drinking Water — Specification (Second Revision)",
    category: "Water & Environmental Health",
    scheme: "Voluntary/Scheme I",
    isMandatoryQco: false,
    qcoDetails: "Essential benchmark adopted by Jal Jeevan Mission, FSSAI, Municipal Corporations, and CPWD.",
    scope: "Piped drinking water, community water supplies, tube-well water, treated tap water.",
    keyParameters: [
      "pH: 6.5 – 8.5 (Acceptable Limit)",
      "Total Dissolved Solids (TDS): Max 500 mg/L (Acceptable), 2000 mg/L (Permissible in absence of alternate source)",
      "Turbidity: Max 1 NTU (Acceptable), 5 NTU (Permissible)",
      "Total Hardness (as CaCO3): Max 200 mg/L (Acceptable), 600 mg/L (Permissible)",
      "Chlorides: Max 250 mg/L (Acceptable), 1000 mg/L (Permissible)",
      "Fluoride: Max 1.0 mg/L (Acceptable), 1.5 mg/L (Permissible)",
      "Nitrate: Max 45 mg/L (No relaxation)",
      "Arsenic: Max 0.01 mg/L (Acceptable), 0.05 mg/L (Permissible)",
      "Lead: Max 0.01 mg/L (No relaxation)",
      "Bacteriological: E. coli or thermotolerant coliforms must be absent in 100 ml sample."
    ],
    recognizedLabs: ["BIS Central Laboratory", "State PHED Laboratories", "NEERI Nagpur", "NTH", "SGS India", "Eureka Forbes Lab"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 14543:2004",
    title: "Packaged Drinking Water (Other Than Packaged Natural Mineral Water) — Specification",
    category: "Food & Water",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "FSSAI & Ministry of Consumer Affairs Mandatory Certification Order",
    scope: "Sealed 20-litre jars, 1-litre/500ml bottles, water pouches.",
    keyParameters: ["Total Dissolved Solids (75 - 500 mg/L)", "Total Plate Count, Coliform, Yeast & Mould, Pseudomonas aeruginosa (Must be Absent)", "Heavy metals (Lead, Cadmium, Arsenic < 0.01 mg/L)", "Pesticide residues (Individual < 0.0001 mg/L, Total < 0.0005 mg/L)"],
    recognizedLabs: ["BIS Regional Labs", "CFTRI Mysore", "NTH", "TUV India"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 13428:2005",
    title: "Packaged Natural Mineral Water — Specification",
    category: "Food & Water",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "FSSAI & BIS Mandatory Certification",
    scope: "Natural spring and underground artesian mineral water bottled at source.",
    keyParameters: ["Origin purity & geological source integrity", "Natural mineral balance", "Zero disinfection chemicals residue", "Total absence of pathogens & parasites"],
    recognizedLabs: ["BIS Central Lab", "CFTRI Mysore", "NTH Kolkata"],
    portal: "manakonline.in"
  },

  // Building Materials, Steel & Construction
  {
    isCode: "IS 1786:2008",
    title: "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement",
    category: "Steel & Metallurgy",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Steel (Steel Quality Control Order)",
    scope: "TMT (Thermo-Mechanically Treated) re-bars in grades Fe 415, Fe 415D, Fe 500, Fe 500D, Fe 550, Fe 550D, Fe 600.",
    keyParameters: ["0.2% Proof stress / Yield stress (e.g. Fe 500D min 500 N/mm²)", "Tensile strength / Yield ratio (Fe 500D min 1.10, min TS 565 N/mm²)", "Elongation (min 16.0% for Fe 500D)", "Total Elongation at Maximum Force (Agt min 5%)", "Bend and Rebend tests without cracking", "Carbon equivalent max 0.42%"],
    recognizedLabs: ["BIS Central Lab", "National Metallurgical Laboratory (NML) Jamshedpur", "NTH", "CSIR-SERC Chennai"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 269:2015",
    title: "Ordinary Portland Cement (OPC 33, OPC 43, OPC 53 Grade) — Specification",
    category: "Cement & Construction",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Cement (Quality Control) Order",
    scope: "Ordinary Portland Cement 33, 43, and 53 grades used in structural concrete.",
    keyParameters: ["Compressive Strength: 3-day (min 27 MPa for 53G), 7-day (min 37 MPa), 28-day (min 53 MPa)", "Initial Setting Time (min 30 mins), Final Setting Time (max 600 mins)", "Soundness (Le-Chatelier expansion max 10 mm, Autoclave max 0.8%)", "Fineness (Blaine min 225 m²/kg)", "Insoluble residue max 5.0%, Loss on ignition max 5.0%"],
    recognizedLabs: ["National Council for Cement and Building Materials (NCCBM Ballabgarh/Hyderabad)", "BIS Regional Labs", "NTH"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 4984:2016",
    title: "High Density Polyethylene (HDPE) Pipes for Water Supply — Specification",
    category: "Piping & Civil Infrastructure",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Plastic Pipes (Quality Control) Order",
    scope: "HDPE pipes for potable water distribution, irrigation, and industrial conveyance.",
    keyParameters: ["Hydrostatic strength at 27°C (100h test) and 80°C (165h & 1000h test)", "Melt Flow Rate (MFR) compatibility", "Carbon black content (2.0 - 2.5%) & dispersion", "Oxidation Induction Time (OIT min 20 mins at 200°C)", "Longitudinal reversion (< 3%)"],
    recognizedLabs: ["CIPET (Central Institute of Petrochemicals Engineering & Technology)", "BIS Regional Labs", "NTH"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 456:2000",
    title: "Plain and Reinforced Concrete — Code of Practice (Fourth Revision)",
    category: "Structural Engineering Code",
    scheme: "Voluntary/Scheme I",
    isMandatoryQco: false,
    qcoDetails: "The primary structural design standard followed nationwide for all RCC buildings, bridges, and infrastructure.",
    scope: "General structural design of reinforced concrete elements, limit state design, mix proportions, durability provisions.",
    keyParameters: ["Characteristic compressive strength (M20 to M80)", "Minimum cementitious material and maximum water-cement ratio for exposure conditions", "Minimum concrete cover for reinforcement", "Deflection limits and crack width control", "Shear and torsion design formulas"],
    recognizedLabs: ["CSIR-CBRI Roorkee", "CSIR-SERC Chennai", "IIT/NIT Structural Engineering Labs"],
    portal: "manakonline.in"
  },

  // Toys & Children Safety
  {
    isCode: "IS 9873 (Part 1, 2, 3, 4, 7, 9) & IS 15644:2006",
    title: "Safety of Toys — Physical & Mechanical, Flammability, Migration of Certain Elements, Electric Toys",
    category: "Toys & Child Care",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Toys (Quality Control) Order 2020 (Mandatory ISI mark before manufacturing, importing, or selling in India)",
    scope: "All physical toys, plush toys, mechanical toys, ride-on toys, and battery/electric toys for children under 14 years.",
    keyParameters: [
      "IS 9873-1: Sharp edges, sharp points, small parts (choking hazard cylinder test), drop test, torque/tension tests",
      "IS 9873-2: Flammability rate of textiles and stuffed toys",
      "IS 9873-3: Heavy metal migration limits (Lead, Cadmium, Mercury, Chromium, Arsenic, Barium, Antimony, Selenium)",
      "IS 15644: Electrical safety, overheating, battery compartment security"
    ],
    recognizedLabs: ["BIS Central Lab Sahibabad", "NTH Mumbai/Kolkata", "TUV Rheinland Gurugram", "UL India Bangalore", "Intertek New Delhi"],
    portal: "manakonline.in"
  },

  // Personal Protective Equipment (PPE) & Medical
  {
    isCode: "IS 9473:2002",
    title: "Respiratory Protective Devices — Filtering Half Masks to Protect Against Particles (FFP1, FFP2, FFP3 / N95 class)",
    category: "PPE & Occupational Safety",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Textiles / DPIIT PPE Quality Control Order",
    scope: "Dust masks, N95/FFP2 equivalent filtering facepiece respirators for particulate filtering.",
    keyParameters: ["Sodium chloride and paraffin oil aerosol filtration efficiency (FFP2 min 94%, FFP3 min 99%)", "Total inward leakage (TIL)", "Breathing resistance (inhalation and exhalation)", "Flammability of mask material", "CO2 content of inhalation air (< 1%)"],
    recognizedLabs: ["NITRA Ghaziabad", "SITRA Coimbatore", "BIS Central Lab", "DRDE Gwalior"],
    portal: "manakonline.in"
  },

  // Hallmarking of Precious Metals
  {
    isCode: "IS 1417:2016",
    title: "Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Marking (Fifth Revision)",
    category: "Precious Metals & Jewellery",
    scheme: "Hallmarking",
    isMandatoryQco: true,
    qcoDetails: "Mandatory Gold Hallmarking Order by Ministry of Consumer Affairs across 343+ designated districts in India.",
    scope: "Gold jewellery and artefacts sold by registered jewellers in recognized karats: 24K (999/995), 23K (958), 22K (916), 20K (833), 18K (750), 14K (585).",
    keyParameters: [
      "Assaying by Fire Assay / Cupellation method (IS 1418)",
      "X-Ray Fluorescence (XRF) preliminary screening",
      "3 Mandatory Hallmark Marks: 1. BIS Logo, 2. Purity grade (e.g. 22K916), 3. 6-digit alphanumeric HUID (Hallmarking Unique Identification)",
      "Zero tolerance below declared fineness"
    ],
    recognizedLabs: ["BIS Recognized Assaying & Hallmarking Centres (AHCs)", "BIS Central Laboratory", "NTH Referral Laboratories"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 2112:2014",
    title: "Silver and Silver Alloys, Jewellery/Artefacts — Fineness and Marking",
    category: "Precious Metals & Jewellery",
    scheme: "Hallmarking",
    isMandatoryQco: false,
    qcoDetails: "Voluntary Hallmarking of silver jewellery & artefacts in grades: 990, 970, 925 (Sterling Silver), 900, 835, 800.",
    scope: "Silver jewellery, utensils, coins, and decorative articles.",
    keyParameters: ["Potentiometric titration / Fire Assay fineness check", "Hallmark marking with BIS logo, fineness, AHC mark, and jeweller mark"],
    recognizedLabs: ["BIS Recognized Silver Assaying Centres"],
    portal: "manakonline.in"
  }
];

export const BIS_SCHEMES_GUIDE = {
  scheme1: {
    name: "Scheme I — Product Certification Scheme (ISI Mark)",
    governingAct: "BIS Act 2016 & BIS (Conformity Assessment) Regulations 2018",
    target: "Domestic manufacturers producing products under mandatory QCOs or voluntary Indian Standards.",
    mark: "ISI Mark with Licence Number (CM/L - XXXXXXX)",
    portal: "https://www.manakonline.in (e-BIS Portal)",
    steps: [
      "1. Identify applicable Indian Standard (IS Code) and verify if in-house Scheme of Testing and Inspection (STI) is established.",
      "2. Register on Manakonline (e-BIS) portal and submit Form-I with factory layout, manufacturing machinery list, testing equipment calibration certificates, and QC personnel qualifications.",
      "3. Pay application fee and preliminary inspection charges.",
      "4. Preliminary Factory Inspection: BIS technical officer visits the plant to inspect manufacturing process, verify testing facilities, and independently draw representative samples.",
      "5. Sample Testing: Sealed sample is dispatched to a BIS Regional Lab or BIS-recognized NABL laboratory for full conformity testing against the IS code.",
      "6. Grant of Licence (GoL): Upon successful test report and compliance verification, BIS grants Licence to use standard ISI Mark (CM/L number).",
      "7. Surveillance: Periodic factory audits, factory sample testing, and random market sample surveillance."
    ],
    tatkalScheme: "Tatkal Option available for select product categories where applicant submits test report directly from a BIS-recognized laboratory alongside application, reducing grant timeline to ~30 days.",
    requiredDocuments: [
      "Proof of factory premises ownership / lease agreement",
      "Process flow chart from raw material to finished product",
      "List of manufacturing machinery with capacities",
      "List of in-house testing equipment with valid calibration certificates",
      "Scheme of Testing and Inspection (STI) acceptance letter",
      "Quality Control personnel appointment letters & degree/diploma certificates",
      "Trademark / Brand registration certificate or authorization from brand owner"
    ]
  },
  scheme2: {
    name: "Scheme II — Compulsory Registration Scheme (CRS)",
    governingAct: "Notified by MeitY, MNRE, and Ministry of Power under BIS CRS framework",
    target: "Manufacturers (Domestic & Global) of Electronics, IT Goods, Solar PV Modules, and Smart Meters.",
    mark: "Standard Mark with Registration Number (R-XXXXXXXX) and words 'Self Declaration - Conforming to IS XXXXX'",
    portal: "https://www.crsbis.in",
    steps: [
      "1. Select product and test standard (e.g. IS 13252 for IT goods, IS 16046 for Li-ion batteries, IS 15885 for LED drivers).",
      "2. Submit product sample to a BIS-recognized NABL testing lab in India.",
      "3. Obtain valid, passing BIS Test Report (must be issued within 90 days of registration submission).",
      "4. Create profile on CRS Portal (crsbis.in) and assign an Authorized Indian Representative (AIR) if foreign manufacturer.",
      "5. Upload test report, brand authorization letter, Form-I declaration, and pay government registration fee.",
      "6. BIS scrutiny and digital Grant of Registration (R-number assigned within 15-20 working days).",
      "7. Affix CRS standard mark on product label and retail packaging before import/sale."
    ],
    requiredDocuments: [
      "Valid Test Report from BIS-recognized Indian laboratory (issued within 90 days)",
      "Form-I (Self-Declaration Undertaking of Conformity)",
      "Brand Authorization / Trademark Certificate",
      "Factory Business License / Manufacturing Registration (Apostilled/Legalized for foreign plants)",
      "Authorized Indian Representative (AIR) nomination agreement and Indian ID proof (for foreign manufacturers)",
      "Critical Components List (CCL) with safety ratings"
    ]
  },
  fmcs: {
    name: "Foreign Manufacturers Certification Scheme (FMCS — Scheme I)",
    governingAct: "BIS Act 2016 for overseas manufacturing locations exporting goods under mandatory ISI certification to India",
    target: "Overseas factories manufacturing steel, cement, tires, chemical products, toys, electrical appliances, etc.",
    mark: "ISI Mark with CM/L number",
    portal: "https://www.manakonline.in (FMCS Wing)",
    steps: [
      "1. Appoint an Authorized Indian Representative (AIR) resident in India who assumes legal responsibility under BIS Act 2016.",
      "2. Submit Form-I on Manakonline with plant machinery, testing infrastructure, and quality control systems.",
      "3. Pay application fee and inspection travel/per-diem fees for BIS inspecting officers.",
      "4. Physical factory audit at foreign manufacturing facility by BIS audit delegation.",
      "5. Drawing of production samples and testing in BIS-recognized laboratory in India or designated lab.",
      "6. Submission of Performance Bank Guarantee (PBG) of USD 10,000 and payment of annual marking fees.",
      "7. Issuance of CM/L licence for 1 to 2 years with periodic surveillance audits."
    ]
  }
};

export const HALLMARKING_GUIDE = {
  title: "Hallmarking of Gold & Silver Jewellery in India",
  governingStandard: "IS 1417:2016 (Gold) & IS 2112:2014 (Silver)",
  mandatoryDistricts: "Mandatory in 343+ designated districts across all Indian States & UTs (expanded continuously in phases).",
  theThreeMarksOnGold: [
    {
      name: "1. BIS Standard Mark",
      description: "The authentic triangular Bureau of Indian Standards logo embossed on the piece."
    },
    {
      name: "2. Purity / Fineness Grade",
      description: "Denotes pure gold content in Karats (K) and Parts per thousand (e.g. 24K995, 23K958, 22K916, 20K833, 18K750, 14K585)."
    },
    {
      name: "3. 6-Digit Alphanumeric HUID",
      description: "Hallmarking Unique Identification — a unique 6-character laser-etched code (e.g. `AB1234`) assigned exclusively to that individual jewellery piece at the Assaying & Hallmarking Centre (AHC)."
    }
  ],
  consumerProtectionAndRights: {
    verificationApp: "BIS Care App (available free on Android Google Play Store & iOS App Store). Consumers tap 'Verify HUID' and enter the 6-digit code to instantly view Jeweller Name, Registration No., AHC Name, Hallmarking Date, and Article Type.",
    referralTesting: "Any consumer can get their hallmarked jewellery tested at any BIS-recognized Assaying & Hallmarking Centre (AHC) for a nominal statutory fee (~₹45 per article).",
    compensationRule: "If a hallmarked jewellery piece is tested and found to have lower purity than marked, the jeweller is legally bound to: 1. Refund the purity difference, 2. Pay compensation equal to TWO TIMES the cost of the shortfall, and 3. Reimburse testing charges."
  },
  jewellerRegistrationProcess: {
    portal: "manakonline.in",
    fee: "Zero government fee for micro-enterprises with annual turnover up to ₹5 Crore.",
    validity: "Lifetime registration (no recurring renewal hassles)."
  }
};

export const BIS_LABORATORIES_GUIDE = {
  centralAndRegionalLabs: [
    {
      name: "BIS Central Laboratory (CL Sahibabad)",
      location: "Plot No. 20/9, Site IV, Sahibabad Industrial Area, Ghaziabad, UP / NCR Delhi",
      capabilities: "Complete testing for Electrical appliances, Electronics, Chemical, Mechanical, Food & Microbiological, Metallurgy, Textiles, and Toy safety."
    },
    {
      name: "BIS Eastern Regional Laboratory (EROL Kolkata)",
      location: "Kolkata, West Bengal",
      capabilities: "Chemical, Metallurgy, Steel, Cement, Food, Mechanical, Electrical."
    },
    {
      name: "BIS Western Regional Laboratory (WROL Mumbai)",
      location: "Andheri (East), Mumbai, Maharashtra",
      capabilities: "Electrical safety, Chemical, Mechanical, Plastics, Pressure cookers, Packaging."
    },
    {
      name: "BIS Southern Regional Laboratory (SROL Chennai)",
      location: "CIT Campus, Taramani, Chennai, Tamil Nadu",
      capabilities: "Electrical accessories, Electronics, Chemical, Pumps, Cables, Water testing."
    },
    {
      name: "BIS Northern Regional Laboratory (NROL Chandigarh)",
      location: "Mohali / Chandigarh",
      capabilities: "Mechanical, Steel, Cement, Agricultural equipment, Electricals."
    }
  ],
  laboratoryRecognitionScheme: {
    description: "Under Section 13 of the BIS Act 2016, BIS recognizes NABL-accredited (ISO/IEC 17025) private, state, and central government laboratories across India for conformity testing when regional labs are at capacity.",
    portal: "LIMS on manakonline.in",
    keyPartnerLabs: ["Central Power Research Institute (CPRI)", "National Test House (NTH)", "SAMEER", "ARAI Pune", "CIPET", "NCCBM", "NITRA", "ERDA Vadodara", "UL India", "TUV Rheinland", "Intertek", "SGS India"]
  }
};

/**
 * Searches the canonical Indian Standards & BIS knowledge base for relevant matches
 * to supply grounded context into the prompt.
 */
export function getRelevantBisGrounding(query: string): string {
  if (!query) return "";
  const q = query.toLowerCase();

  const matchedStandards: IndianStandardRecord[] = [];
  for (const std of CANONICAL_INDIAN_STANDARDS) {
    const isCodeClean = std.isCode.toLowerCase();
    const titleClean = std.title.toLowerCase();
    const categoryClean = std.category.toLowerCase();
    const scopeClean = std.scope.toLowerCase();

    if (
      q.includes(isCodeClean.split(" ")[1] || "") ||
      q.includes(isCodeClean) ||
      titleClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      categoryClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      scopeClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      (q.includes("water") && isCodeClean.includes("10500")) ||
      (q.includes("led") && (isCodeClean.includes("16102") || isCodeClean.includes("15885"))) ||
      (q.includes("battery") && isCodeClean.includes("16046")) ||
      (q.includes("it") && isCodeClean.includes("13252")) ||
      (q.includes("plug") && isCodeClean.includes("1293")) ||
      (q.includes("wire") && isCodeClean.includes("694")) ||
      (q.includes("cable") && isCodeClean.includes("694")) ||
      (q.includes("steel") && isCodeClean.includes("1786")) ||
      (q.includes("tmt") && isCodeClean.includes("1786")) ||
      (q.includes("cement") && isCodeClean.includes("269")) ||
      (q.includes("pipe") && isCodeClean.includes("4984")) ||
      (q.includes("toy") && isCodeClean.includes("9873")) ||
      (q.includes("mask") && isCodeClean.includes("9473")) ||
      (q.includes("helmet") && isCodeClean.includes("4151")) ||
      (q.includes("gold") && isCodeClean.includes("1417")) ||
      (q.includes("silver") && isCodeClean.includes("2112")) ||
      (q.includes("hallmark") && (isCodeClean.includes("1417") || isCodeClean.includes("2112"))) ||
      (q.includes("huid") && isCodeClean.includes("1417"))
    ) {
      if (!matchedStandards.some(s => s.isCode === std.isCode)) {
        matchedStandards.push(std);
      }
    }
  }

  let grounding = "\n\n[AUTHENTIC BIS CANONICAL GROUNDING DATA]:\n";

  if (matchedStandards.length > 0) {
    grounding += "MATCHED CANONICAL INDIAN STANDARDS (IS):\n";
    matchedStandards.slice(0, 5).forEach((std, i) => {
      grounding += `\nStandard #${i + 1}: ${std.isCode} — ${std.title}\n` +
        `• Category: ${std.category}\n` +
        `• Certification Scheme: ${std.scheme} (Application Portal: ${std.portal === "crsbis.in" ? "https://www.crsbis.in" : "https://www.manakonline.in"})\n` +
        `• Regulatory Classification: ${std.isMandatoryQco ? "[Mandatory QCO]" : "[Voluntary Certification]"}\n` +
        (std.qcoDetails ? `• Notifying Order / Authority: ${std.qcoDetails}\n` : "") +
        `• Scope / Product Application: ${std.scope}\n` +
        `• Key Test Parameters & Technical Criteria: ${std.keyParameters.join("; ")}\n` +
        `• Current Recognized Laboratories: ${std.recognizedLabs.join(", ")}\n` +
        `• Official Standards Reference: https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails\n`;
    });
  } else {
    grounding += "NO DIRECT CANONICAL STANDARD MATCH FOUND IN STATIC INDEX.\n" +
      "• MANDATORY INSTRUCTION: If the product or standard is not definitively verified in official records, state clearly: 'This product/standard requires verification on the official BIS portal (services.bis.gov.in / manakonline.in) as standard requirements are subject to gazette revisions.' Do NOT guess or invent an IS number or QCO date.\n";
  }

  if (q.includes("hallmark") || q.includes("gold") || q.includes("silver") || q.includes("huid") || q.includes("jewel") || q.includes("karat") || q.includes("carat") || q.includes("हॉलमार्क")) {
    grounding += "\nHALLMARKING REGULATORY FRAMEWORK (IS 1417 / IS 2112):\n" +
      "• 3 Mandatory Signs on Gold: 1. BIS Triangular Logo, 2. Purity (24K999, 23K958, 22K916, 20K833, 18K750, 14K585), 3. 6-digit alphanumeric HUID.\n" +
      "• BIS Care App: Free mobile app for iOS/Android to verify HUID, view jeweller name, registration number, AHC, and hallmarking date.\n" +
      "• Consumer Rights: Referral testing at any recognized AHC for ₹45/article. If purity is lower than marked, jeweller must refund difference + pay 2x shortfall compensation + testing fee.\n" +
      "• Jeweller Registration: Online via Manakonline, lifetime validity, ZERO registration fee for micro-jewellers (turnover <= 5 Cr).\n";
  }

  if (q.includes("scheme") || q.includes("isi mark") || q.includes("crs") || q.includes("manakonline") || q.includes("licence") || q.includes("license") || q.includes("certificate") || q.includes("certification") || q.includes("fmcs") || q.includes("tatkal")) {
    grounding += "\nBIS CONFORMITY ASSESSMENT SCHEMES OVERVIEW:\n" +
      "• Scheme I (ISI Mark): Domestic product certification (manakonline.in / e-BIS) — factory audit + STI + sample test + CM/L grant.\n" +
      "• Scheme II (CRS): Compulsory Registration Scheme for electronics/IT (crsbis.in) — lab test report within 90 days + online self-declaration + R-number.\n" +
      "• FMCS: Foreign Manufacturers Certification Scheme (ISI Mark with CM/L for overseas plants exporting to India) — AIR appointment + factory audit in foreign plant + test in India.\n" +
      "• Management Systems (Scheme IV / ISO): ISO 9001 (QMS), ISO 14001 (EMS), ISO 22000 (FSMS), ISO 27001 (ISMS), ISO 45001 (OH&S).\n";
  }

  if (q.includes("lab") || q.includes("test") || q.includes("lims") || q.includes("sahibabad") || q.includes("sample")) {
    grounding += "\nBIS LABORATORIES NETWORK & LRS:\n" +
      "• Central Laboratory: CL Sahibabad (Ghaziabad/NCR) — Full capability (electrical, electronics, food, chemical, mechanical, toys, microbiology).\n" +
      "• Regional Labs: Kolkata (EROL), Mumbai (WROL), Chennai (SROL), Chandigarh/Mohali (NROL).\n" +
      "• Laboratory Recognition Scheme (LRS): Over 200+ NABL accredited labs empannelled (e.g. CPRI, NTH, SAMEER, ARAI, CIPET, NCCBM, NITRA, TUV, UL, Intertek, SGS).\n";
  }

  return grounding;
}
