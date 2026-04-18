export const departments = [
  "Electricity",
  "Sanitation",
  "Water",
  "Roads"
];

export const departmentOptions = departments;

export const grievanceTypes = [
  "Garbage",
  "Pothole",
  "Drainage",
  "Power Cut",
  "Leakage"
];

export const statusOptions = ["Pending", "Verified", "Resolved", "Reopened", "Failed"];

export const mockComplaints = [
  {
    id: "cmp-1001",
    grievanceId: "GRV-1001",
    title: "Potholes on Ring Road",
    description: "Multiple deep potholes are causing traffic slowdowns and vehicle damage near the bus stop.",
    department: "Road Maintenance",
    grievanceType: "road_maintenance",
    status: "Pending",
    verificationStatus: "Pending",
    source: "APP_IMAGE",
    locationStatus: "AVAILABLE",
    createdAt: "2026-04-01",
    resolvedAt: null,
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.6139, lng: 77.209, area: "Connaught Place" },
    verification: { ivrResponse: "No", gpsMatch: true, photoUploaded: true },
    scoring: {
      citizenPointsDelta: 8,
      departmentPointsDelta: -4,
      scoreReason: "Verified geo-tagged complaint",
      fakeComplaintFlag: false
    },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-01" },
      { label: "Field Inspection Scheduled", date: "2026-04-02" }
    ]
  },
  {
    id: "cmp-1002",
    grievanceId: "GRV-1002",
    title: "Water leakage near market lane",
    description: "Leakage from the main pipe is flooding the lane in the evenings.",
    department: "Water Supply",
    grievanceType: "water_supply",
    status: "Verified",
    verificationStatus: "Verified",
    source: "APP_TEXT",
    locationStatus: "AVAILABLE",
    createdAt: "2026-03-28",
    resolvedAt: null,
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.628, lng: 77.216, area: "Bazar Lane" },
    verification: { ivrResponse: "Yes", gpsMatch: true, photoUploaded: false },
    scoring: {
      citizenPointsDelta: 12,
      departmentPointsDelta: -6,
      scoreReason: "Confirmed water supply issue",
      fakeComplaintFlag: false
    },
    timeline: [
      { label: "Complaint Submitted", date: "2026-03-28" },
      { label: "Final Decision: Verified", date: "2026-03-30" }
    ]
  },
  {
    id: "cmp-1003",
    grievanceId: "GRV-1003",
    title: "Broken streetlight on service road",
    description: "Streetlight has been non-functional for a week, creating safety concerns at night.",
    department: "Street Lighting",
    grievanceType: "street_lighting",
    status: "Resolved",
    verificationStatus: "Verified",
    source: "IVR_CALL",
    locationStatus: "MISSING",
    createdAt: "2026-03-21",
    resolvedAt: "2026-03-26",
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.64, lng: 77.22, area: "Service Road" },
    verification: { ivrResponse: "Yes", gpsMatch: false, photoUploaded: false },
    scoring: {
      citizenPointsDelta: 10,
      departmentPointsDelta: -3,
      scoreReason: "Resolved after officer follow-up",
      fakeComplaintFlag: false
    },
    timeline: [
      { label: "Complaint Submitted", date: "2026-03-21" },
      { label: "Marked Resolved", date: "2026-03-26" }
    ]
  },
  {
    id: "cmp-1004",
    grievanceId: "GRV-1004",
    title: "Garbage not collected for two days",
    description: "Waste collection truck skipped the street twice this week.",
    department: "Waste Management",
    grievanceType: "waste_management",
    status: "Reopened",
    verificationStatus: "Reopened",
    source: "APP_TEXT",
    locationStatus: "NEEDS_IVR_FOLLOWUP",
    createdAt: "2026-03-18",
    resolvedAt: "2026-03-22",
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.619, lng: 77.23, area: "Sector Market" },
    verification: { ivrResponse: "No", gpsMatch: true, photoUploaded: false },
    scoring: {
      citizenPointsDelta: 4,
      departmentPointsDelta: -1,
      scoreReason: "Needs additional follow-up",
      fakeComplaintFlag: false
    },
    timeline: [
      { label: "Complaint Submitted", date: "2026-03-18" },
      { label: "Marked Resolved", date: "2026-03-22" },
      { label: "Final Decision: Reopened", date: "2026-03-24" }
    ]
  },
  {
    id: "cmp-1005",
    grievanceId: "GRV-1005",
    title: "Drainage overflow after rain",
    description: "Storm water drains overflow every time it rains heavily.",
    department: "Drainage",
    grievanceType: "drainage",
    status: "Failed",
    verificationStatus: "Failed",
    source: "APP_IMAGE",
    locationStatus: "AVAILABLE",
    createdAt: "2026-03-10",
    resolvedAt: "2026-03-12",
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.6075, lng: 77.214, area: "Low-lying Block" },
    verification: { ivrResponse: "No", gpsMatch: false, photoUploaded: true },
    scoring: {
      citizenPointsDelta: -2,
      departmentPointsDelta: 0,
      scoreReason: "Complaint could not be verified",
      fakeComplaintFlag: true
    },
    timeline: [
      { label: "Complaint Submitted", date: "2026-03-10" },
      { label: "Final Decision: Failed", date: "2026-03-12" }
    ]
  },
  {
    id: "cmp-1006",
    grievanceId: "GRV-1006",
    title: "Suspicious activity near park entrance",
    description: "Loitering and unsafe activity reported near the north entrance after dark.",
    department: "Public Safety",
    grievanceType: "public_safety",
    status: "Pending",
    verificationStatus: "Pending",
    source: "IVR_CALL",
    locationStatus: "MISSING",
    createdAt: "2026-04-05",
    resolvedAt: null,
    createdById: "demo-citizen",
    citizenEmail: "citizen.demo@vgs.gov.in",
    citizenPhone: "9876543210",
    assignedOfficerId: "demo-officer",
    assignedToId: "demo-officer",
    location: { lat: 28.623, lng: 77.205, area: "Central Park" },
    verification: { ivrResponse: "No", gpsMatch: false, photoUploaded: false },
    scoring: {
      citizenPointsDelta: 6,
      departmentPointsDelta: -2,
      scoreReason: "Awaiting verification",
      fakeComplaintFlag: false
    },
    timeline: [{ label: "Complaint Submitted", date: "2026-04-05" }]
  }
];
