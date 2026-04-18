export const departments = [
  "Sanitation",
  "Road Maintenance",
  "Water Supply",
  "Electricity",
  "Public Safety",
  "Health",
  "Education"
];

export const mockComplaints = [
  {
    id: "VGS-1001",
    title: "Overflowing garbage near bus stand",
    description: "Garbage has not been collected for 4 days and the street is blocked.",
    department: "Sanitation",
    status: "Pending",
    createdAt: "2026-04-10",
    resolvedAt: null,
    citizenEmail: "citizen.demo@vgs.gov.in",
    assignedOfficerEmail: "officer.demo@vgs.gov.in",
    location: { lat: 28.616, lng: 77.209, area: "Central Ward" },
    verification: { ivrResponse: "No", gpsMatch: false, photoUploaded: true },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-10" },
      { label: "Inspection Assigned", date: "2026-04-11" }
    ]
  },
  {
    id: "VGS-1002",
    title: "Streetlight not working",
    description: "Two streetlights are off in lane 3 and require immediate repair.",
    department: "Electricity",
    status: "Verified",
    createdAt: "2026-04-04",
    resolvedAt: "2026-04-08",
    citizenEmail: "citizen.demo@vgs.gov.in",
    assignedOfficerEmail: "officer.demo@vgs.gov.in",
    location: { lat: 28.612, lng: 77.214, area: "North Extension" },
    verification: { ivrResponse: "Yes", gpsMatch: true, photoUploaded: true },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-04" },
      { label: "Marked Resolved", date: "2026-04-07" },
      { label: "IVR Checked", date: "2026-04-08" },
      { label: "Final Decision: Verified", date: "2026-04-08" }
    ]
  },
  {
    id: "VGS-1003",
    title: "Pothole on market road",
    description: "Large pothole causing traffic and safety issues.",
    department: "Road Maintenance",
    status: "Reopened",
    createdAt: "2026-04-01",
    resolvedAt: "2026-04-05",
    citizenEmail: "citizen.demo@vgs.gov.in",
    assignedOfficerEmail: "officer.demo@vgs.gov.in",
    location: { lat: 28.619, lng: 77.216, area: "Market Zone" },
    verification: { ivrResponse: "No", gpsMatch: false, photoUploaded: false },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-01" },
      { label: "Marked Resolved", date: "2026-04-05" },
      { label: "IVR Checked", date: "2026-04-06" },
      { label: "Final Decision: Reopened", date: "2026-04-06" }
    ]
  },
  {
    id: "VGS-1004",
    title: "Water leak near school gate",
    description: "Continuous leak is creating slippery conditions at the gate.",
    department: "Water Supply",
    status: "Resolved",
    createdAt: "2026-04-06",
    resolvedAt: "2026-04-09",
    citizenEmail: "citizen.demo@vgs.gov.in",
    assignedOfficerEmail: "officer.demo@vgs.gov.in",
    location: { lat: 28.615, lng: 77.218, area: "Ward 8" },
    verification: { ivrResponse: "No", gpsMatch: true, photoUploaded: true },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-06" },
      { label: "Resolved by Officer", date: "2026-04-08" },
      { label: "Verification in Progress", date: "2026-04-09" }
    ]
  },
  {
    id: "VGS-1005",
    title: "Public safety camera offline",
    description: "CCTV camera at the square is not recording.",
    department: "Public Safety",
    status: "Failed",
    createdAt: "2026-04-03",
    resolvedAt: "2026-04-07",
    citizenEmail: "citizen.demo@vgs.gov.in",
    assignedOfficerEmail: "officer.demo@vgs.gov.in",
    location: { lat: 28.611, lng: 77.211, area: "City Square" },
    verification: { ivrResponse: "No", gpsMatch: false, photoUploaded: false },
    timeline: [
      { label: "Complaint Submitted", date: "2026-04-03" },
      { label: "Resolved by Officer", date: "2026-04-06" },
      { label: "IVR Failed", date: "2026-04-07" },
      { label: "Final Decision: Failed", date: "2026-04-07" }
    ]
  }
];

export const statusOptions = ["Pending", "Resolved", "Verified", "Failed", "Reopened"];

export const officerStatuses = ["Assigned", "Resolved", "Pending Verification"];
