const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function parseBooleanFlag(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if ([true, 'true', 1, '1'].includes(value)) {
    return 1;
  }

  if ([false, 'false', 0, '0'].includes(value)) {
    return 0;
  }

  return null;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

function normalizeDepartment(department) {
  return typeof department === 'string' && department.trim().length ? department.trim() : null;
}

function buildAdminFilter(query) {
  const filter = {};

  if (query.district) {
    filter.district = query.district;
  }

  if (query.department) {
    filter.department = query.department;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.grievance_type) {
    filter.grievance_type = query.grievance_type;
  }

  if (query.verification_status) {
    filter.verification_status = query.verification_status;
  }

  if (query.source) {
    filter.source = query.source;
  }

  if (query.location_status) {
    filter.location_status = query.location_status;
  }

  const reopenFlag = parseBooleanFlag(query.reopen_flag);
  if (reopenFlag !== null) {
    filter.reopen_flag = reopenFlag;
  }

  return filter;
}

function getMarkerAttributes(complaint) {
  if (complaint.verification_status === 'FAILED') {
    return {
      marker_status: 'FAILED',
      marker_color: 'red'
    };
  }

  if (complaint.verification_status === 'VERIFIED') {
    return {
      marker_status: 'VERIFIED',
      marker_color: 'green'
    };
  }

  if (complaint.verification_status === 'REOPENED' || complaint.reopen_flag === 1) {
    return {
      marker_status: 'REOPENED',
      marker_color: 'yellow'
    };
  }

  return {
    marker_status: complaint.status,
    marker_color: complaint.status === 'IN_PROGRESS' ? 'orange' : 'blue'
  };
}

function buildMapOverlay(complaint) {
  const complaintCoordinates = complaint.location?.coordinates || [];
  const imageCoordinates = complaint.image_location?.coordinates || complaint.resolved_image_location?.coordinates || [];

  const complaintPoint = complaintCoordinates.length === 2
    ? {
        lng: complaintCoordinates[0],
        lat: complaintCoordinates[1]
      }
    : null;

  const imagePoint = imageCoordinates.length === 2
    ? {
        lng: imageCoordinates[0],
        lat: imageCoordinates[1]
      }
    : null;

  const markerAttributes = getMarkerAttributes(complaint);

  return {
    complaint_point: complaintPoint,
    image_point: imagePoint,
    line_points: complaintPoint && imagePoint ? [complaintPoint, imagePoint] : [],
    has_overlay: Boolean(complaintPoint && imagePoint),
    gps_match_flag: complaint.gps_match_flag,
    verification_status: complaint.verification_status,
    reopen_flag: complaint.reopen_flag,
    marker_status: markerAttributes.marker_status,
    marker_color: markerAttributes.marker_color
  };
}

function toCSVRows(items) {
  const headers = [
    'grievance_id',
    'source',
    'title',
    'district',
    'department',
    'grievance_type',
    'status',
    'verification_status',
    'location_status',
    'reopen_flag',
    'gps_match_flag',
    'votes',
    'citizen_points_delta',
    'department_points_delta',
    'fake_complaint_flag',
    'created_at'
  ];

  const escapeCSV = (value) => {
    if (value === undefined || value === null) {
      return '';
    }

    const raw = String(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }

    return raw;
  };

  const rows = items.map((item) => [
    item.grievance_id,
    item.source,
    item.title,
    item.district,
    item.department,
    item.grievance_type,
    item.status,
    item.verification_status,
    item.location_status,
    item.reopen_flag,
    item.gps_match_flag,
    item.votes,
    item.scoring?.citizen_points_delta,
    item.scoring?.department_points_delta,
    item.scoring?.fake_complaint_flag,
    item.created_at
  ].map(escapeCSV).join(','));

  return [headers.join(','), ...rows].join('\n');
}

const getAdminComplaints = asyncHandler(async (req, res) => {
  const filter = buildAdminFilter(req.query);
  const limit = parseNumber(req.query.limit, 1000);

  const complaints = await Complaint.find(filter)
    .sort({ created_at: -1 })
    .limit(Math.min(Math.max(limit, 1), 5000))
    .lean();

  res.json({
    count: complaints.length,
    complaints: complaints.map((complaint) => ({
      ...complaint,
      id: complaint._id,
      coordinates: complaint.location?.coordinates || [],
      map_overlay: buildMapOverlay(complaint),
      ...getMarkerAttributes(complaint)
    }))
  });
});

const getAdminComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('assigned_to', 'name role department')
    .populate('assigned_officer', 'name role department')
    .lean();

  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  res.json({
    complaint: {
      ...complaint,
      id: complaint._id,
      coordinates: complaint.location?.coordinates || [],
      map_overlay: buildMapOverlay(complaint),
      ...getMarkerAttributes(complaint)
    }
  });
});

const getAdminOverlayPoints = asyncHandler(async (req, res) => {
  const filter = buildAdminFilter(req.query);
  const limit = parseNumber(req.query.limit, 1000);

  const complaints = await Complaint.find(filter)
    .sort({ created_at: -1 })
    .limit(Math.min(Math.max(limit, 1), 5000))
    .lean();

  res.json({
    count: complaints.length,
    overlays: complaints.map((complaint) => ({
      id: complaint._id,
      grievance_id: complaint.grievance_id,
      district: complaint.district,
      department: complaint.department,
      verification_status: complaint.verification_status,
      reopen_flag: complaint.reopen_flag,
      gps_match_flag: complaint.gps_match_flag,
      marker_status: getMarkerAttributes(complaint).marker_status,
      marker_color: getMarkerAttributes(complaint).marker_color,
      complaint_point: complaint.location?.coordinates?.length === 2
        ? { lng: complaint.location.coordinates[0], lat: complaint.location.coordinates[1] }
        : null,
      image_point: (complaint.image_location?.coordinates?.length === 2
        ? { lng: complaint.image_location.coordinates[0], lat: complaint.image_location.coordinates[1] }
        : complaint.resolved_image_location?.coordinates?.length === 2
          ? { lng: complaint.resolved_image_location.coordinates[0], lat: complaint.resolved_image_location.coordinates[1] }
          : null),
      line_points: (() => {
        const complaintPoint = complaint.location?.coordinates?.length === 2
          ? { lng: complaint.location.coordinates[0], lat: complaint.location.coordinates[1] }
          : null;
        const imageCoordinates = complaint.image_location?.coordinates || complaint.resolved_image_location?.coordinates || [];
        const imagePoint = imageCoordinates.length === 2
          ? { lng: imageCoordinates[0], lat: imageCoordinates[1] }
          : null;

        return complaintPoint && imagePoint ? [complaintPoint, imagePoint] : [];
      })(),
      has_overlay: Boolean(
        complaint.location?.coordinates?.length === 2 &&
        ((complaint.image_location?.coordinates?.length === 2) || (complaint.resolved_image_location?.coordinates?.length === 2))
      )
    }))
  });
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const filter = buildAdminFilter(req.query);

  const [
    totals,
    districtBreakdown,
    departmentBreakdown,
    verificationBreakdown,
    statusBreakdown,
    monthlyTrend,
    heatmap
  ] = await Promise.all([
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: {
            $sum: {
              $cond: [{ $eq: ['$verification_status', 'VERIFIED'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$verification_status', 'FAILED'] }, 1, 0]
            }
          },
          reopened: {
            $sum: {
              $cond: [{ $eq: ['$verification_status', 'REOPENED'] }, 1, 0]
            }
          }
        }
      }
    ]),
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$district',
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$verification_status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]),
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]),
    Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Complaint.aggregate([
      { $match: { ...filter, 'location.coordinates.0': { $exists: true }, 'location.coordinates.1': { $exists: true } } },
      {
        $project: {
          lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] },
          lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] }
        }
      },
      {
        $group: {
          _id: { lng: '$lng', lat: '$lat' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ])
  ]);

  const base = totals[0] || { total: 0, verified: 0, failed: 0, reopened: 0 };
  const reopenRate = base.total === 0 ? 0 : Number(((base.reopened / base.total) * 100).toFixed(2));

  const [
    gpsMismatchCount,
    noPhotoCount,
    gpsMismatchAndFailedCount,
    noPhotoAndReopenedCount
  ] = await Promise.all([
    Complaint.countDocuments({ ...filter, gps_match_flag: 0 }),
    Complaint.countDocuments({ ...filter, photo_uploaded: 0 }),
    Complaint.countDocuments({ ...filter, gps_match_flag: 0, verification_status: 'FAILED' }),
    Complaint.countDocuments({ ...filter, photo_uploaded: 0, verification_status: 'REOPENED' })
  ]);

  const safePercent = (num, den) => (den === 0 ? 0 : Number(((num / den) * 100).toFixed(2)));

  res.json({
    kpis: {
      total_complaints: base.total,
      verified: base.verified,
      failed: base.failed,
      reopened: base.reopened,
      reopen_rate_percent: reopenRate
    },
    district_report: districtBreakdown.map((item) => ({ district: item._id || 'Unknown', total: item.total })),
    department_report: departmentBreakdown.map((item) => ({ department: item._id || 'Unknown', total: item.total })),
    department_ranking: departmentBreakdown.map((item, index) => ({ rank: index + 1, department: item._id || 'Unknown', total: item.total })),
    verification_analysis: verificationBreakdown.map((item) => ({ verification_status: item._id || 'Unknown', count: item.count })),
    status_analysis: statusBreakdown.map((item) => ({ status: item._id || 'Unknown', count: item.count })),
    trend: monthlyTrend.map((item) => ({ year: item._id.year, month: item._id.month, count: item.count })),
    heatmap: heatmap.map((item) => ({ lng: item._id.lng, lat: item._id.lat, count: item.count })),
    insights: {
      gps_mismatch: {
        count: gpsMismatchCount,
        percent_of_total: safePercent(gpsMismatchCount, base.total),
        percent_failed_with_gps_mismatch: safePercent(gpsMismatchAndFailedCount, base.failed)
      },
      no_photo_uploaded: {
        count: noPhotoCount,
        percent_of_total: safePercent(noPhotoCount, base.total),
        percent_reopened_with_no_photo: safePercent(noPhotoAndReopenedCount, base.reopened)
      }
    }
  });
});

const verifyAdminComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const requestedStatus = typeof req.body.verification_status === 'string'
    ? req.body.verification_status.toUpperCase()
    : null;

  const allowedStatuses = ['VERIFIED', 'FAILED', 'REOPENED'];

  let verificationStatus = requestedStatus;
  if (!verificationStatus) {
    if (complaint.gps_match_flag === 0 || complaint.photo_uploaded === 0) {
      verificationStatus = complaint.photo_uploaded === 0 ? 'REOPENED' : 'FAILED';
    } else {
      verificationStatus = 'VERIFIED';
    }
  }

  if (!allowedStatuses.includes(verificationStatus)) {
    res.status(400);
    throw new Error('verification_status must be VERIFIED, FAILED, or REOPENED');
  }

  complaint.verification_status = verificationStatus;
  complaint.reopen_flag = verificationStatus === 'REOPENED' ? 1 : 0;

  if (!complaint.scoring) {
    complaint.scoring = {
      citizen_points_delta: 0,
      department_points_delta: 0,
      score_reason: null,
      fake_complaint_flag: 0
    };
  }

  if (verificationStatus === 'VERIFIED') {
    complaint.status = 'VERIFIED';
    complaint.verified_at = new Date();
    complaint.scoring.citizen_points_delta = 10;
    complaint.scoring.department_points_delta = 5;
    complaint.scoring.score_reason = 'VERIFIED_RESOLUTION';
    complaint.scoring.fake_complaint_flag = 0;
  } else if (verificationStatus === 'FAILED') {
    complaint.status = 'FAILED';
    complaint.verified_at = undefined;
    complaint.scoring.citizen_points_delta = -15;
    complaint.scoring.department_points_delta = 0;
    complaint.scoring.score_reason = 'FAKE_OR_INVALID_COMPLAINT';
    complaint.scoring.fake_complaint_flag = 1;
  } else {
    complaint.status = 'REOPENED';
    complaint.verified_at = undefined;
    complaint.scoring.citizen_points_delta = -5;
    complaint.scoring.department_points_delta = -5;
    complaint.scoring.score_reason = 'REOPENED_AFTER_VERIFICATION';
    complaint.scoring.fake_complaint_flag = 0;
  }

  await complaint.save();

  res.json({
    message: 'Complaint verification updated',
    complaint: {
      ...complaint.toObject(),
      id: complaint._id,
      coordinates: complaint.location?.coordinates || [],
      ...getMarkerAttributes(complaint)
    }
  });
});

const exportAdminReport = asyncHandler(async (req, res) => {
  const filter = buildAdminFilter(req.query);
  const complaints = await Complaint.find(filter)
    .sort({ created_at: -1 })
    .lean();

  const csv = toCSVRows(complaints);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="admin-report.csv"');
  res.send(csv);
});

const getDatasetInfo = asyncHandler(async (req, res) => {
  const datasetPath = path.join(__dirname, '..', 'TS-PS2.csv');
  const stats = fs.statSync(datasetPath);
  const fd = fs.openSync(datasetPath, 'r');
  const signatureBuffer = Buffer.alloc(4);
  fs.readSync(fd, signatureBuffer, 0, 4, 0);
  fs.closeSync(fd);

  const signatureHex = signatureBuffer.toString('hex');
  const isZipContainer = signatureHex === '504b0304';

  res.json({
    dataset_file: 'TS-PS2.csv',
    size_bytes: stats.size,
    signature_hex: signatureHex,
    detected_format: isZipContainer ? 'ZIP/XLSX container (file may be misnamed)' : 'Plain text/CSV'
  });
});

const createOfficer = asyncHandler(async (req, res) => {
  const { name, email, password, department, lat, lng } = req.body;

  if (!name || !email || !password || !department) {
    res.status(400);
    throw new Error('name, email, password, and department are required');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedDepartment = normalizeDepartment(department);

  if (!normalizedEmail || !normalizedDepartment) {
    res.status(400);
    throw new Error('Valid email and department are required');
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    res.status(409);
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const officer = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'officer',
    department: normalizedDepartment,
    location: {
      type: 'Point',
      coordinates: [Number(lng) || 0, Number(lat) || 0]
    },
    points: 0
  });

  const officerObject = officer.toObject();
  delete officerObject.passwordHash;

  res.status(201).json({
    message: 'Officer created successfully',
    user: officerObject
  });
});

module.exports = {
  getAdminComplaints,
  getAdminComplaintById,
  getAdminOverlayPoints,
  getAdminDashboard,
  verifyAdminComplaint,
  createOfficer,
  exportAdminReport,
  getDatasetInfo
};
