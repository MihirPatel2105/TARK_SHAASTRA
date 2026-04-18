const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');
const { classifyImageByAllModels } = require('../services/roboflowService');
const { haversineDistanceMeters } = require('../utils/geo');
const { extractImageGps } = require('../utils/imageGps');

const GRIEVANCE_DEPARTMENT_MAP = {
  pothole: 'Roads',
  leakage: 'Water',
  'power cut': 'Electricity',
  garbage: 'Sanitation'
};

const OFFICER_TRACKED_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
const GPS_MATCH_THRESHOLD_METERS = 100;

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function buildPointFromBody(body) {
  const lat = parseNumber(body.lat);
  const lng = parseNumber(body.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}

function buildPointFromLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}

function calculateDistanceMeters(pointA, pointB) {
  return haversineDistanceMeters(pointA.coordinates, pointB.coordinates);
}

function normalizeDepartment(department) {
  if (!department || typeof department !== 'string') {
    return null;
  }

  const normalized = department.trim();
  return normalized.length ? normalized : null;
}

function inferDepartmentFromGrievanceType(grievanceType) {
  if (!grievanceType || typeof grievanceType !== 'string') {
    return null;
  }

  const mappedDepartment = GRIEVANCE_DEPARTMENT_MAP[grievanceType.trim().toLowerCase()];
  return mappedDepartment || null;
}

function resolveDepartment(departmentInput, grievanceType) {
  return normalizeDepartment(departmentInput) || inferDepartmentFromGrievanceType(grievanceType);
}

async function getNearbyComplaintsByLocation(point, radiusMeters, grievanceType) {
  const complaints = await Complaint.find({
    grievance_type: grievanceType,
    location: {
      $near: {
        $geometry: point,
        $maxDistance: radiusMeters
      }
    }
  })
    .sort({ votes: -1, created_at: -1 })
    .lean();

  return complaints;
}

async function findOfficerForDepartment(point, department) {
  return User.findOne({
    role: 'officer',
    department,
    location: {
      $near: {
        $geometry: point,
        $maxDistance: 20000
      }
    }
  }).sort({ points: -1 }).lean();
}

function serializeComplaint(complaint) {
  return {
    ...complaint,
    id: complaint._id,
    coordinates: complaint.location?.coordinates || []
  };
}

function getComplaintAssignee(complaint) {
  return complaint.assigned_to || complaint.assigned_officer;
}

const createComplaint = asyncHandler(async (req, res) => {
  const {
    grievance_id,
    title,
    description,
    department: departmentInput,
    district,
    grievance_type,
    lat,
    lng,
    created_by,
    assign_officer_id,
    force_create
  } = req.body;

  if (!grievance_id || !title || !description || !grievance_type) {
    res.status(400);
    throw new Error('grievance_id, title, description, and grievance_type are required');
  }

  const fallbackDepartment = resolveDepartment(departmentInput, grievance_type);

  const location = buildPointFromBody(req.body);
  if (!location) {
    res.status(400);
    throw new Error('lat and lng are required');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Complaint image is required');
  }

  const exifGps = extractImageGps(req.file.buffer);
  const userLocation = location;

  // Many mobile/compressed uploads strip EXIF GPS metadata.
  // Fall back to user-selected location so complaints are still accepted.
  let imageLocation = userLocation;
  let userImageDistanceMeters = null;
  let gpsMatchFlag = 0;

  if (exifGps.found) {
    const exifPoint = buildPointFromLatLng(exifGps.latitude, exifGps.longitude);
    if (exifPoint) {
      imageLocation = exifPoint;
      userImageDistanceMeters = calculateDistanceMeters(userLocation, imageLocation);
      gpsMatchFlag = userImageDistanceMeters <= GPS_MATCH_THRESHOLD_METERS ? 1 : 0;
    }
  }

  const existing = await Complaint.findOne({ grievance_id }).lean();
  if (existing) {
    res.status(409);
    throw new Error('Complaint with this grievance_id already exists');
  }

  const nearbyComplaints = await getNearbyComplaintsByLocation(location, 500, grievance_type);
  if (nearbyComplaints.length > 0 && !['true', true, 1, '1'].includes(force_create)) {
    return res.status(409).json({
      message: 'A similar complaint already exists nearby. Vote on the existing complaint instead.',
      duplicate_suggestions: nearbyComplaints.map(serializeComplaint)
    });
  }

  let imageUrl;
  let imagePublicId;

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
    folder: 'complaints'
  });

  imageUrl = uploadResult.secure_url;
  imagePublicId = uploadResult.public_id;

  const classification = await classifyImageByAllModels(imageUrl);
  const aiDepartment = classification?.best?.decision === 'AUTO_ASSIGNED'
    ? classification.best.department
    : null;

  const department = aiDepartment || fallbackDepartment || classification?.best?.department || 'General';

  if (!department) {
    res.status(400);
    throw new Error('department could not be resolved from AI classification or grievance mapping');
  }

  const fallbackOfficer = mongoose.Types.ObjectId.isValid(assign_officer_id)
    ? null
    : await findOfficerForDepartment(location, department);

  const complaint = await Complaint.create({
    grievance_id,
    title,
    description,
    department,
    district: typeof district === 'string' && district.trim().length ? district.trim() : null,
    grievance_type,
    location,
    user_location: userLocation,
    image_location: imageLocation,
    image_url: imageUrl,
    image_public_id: imagePublicId,
    ai_classification: {
      detected_class: classification?.best?.label || null,
      confidence: classification?.best?.confidence || 0,
      selected_model: classification?.best?.model || null,
      department_from_ai: classification?.best?.department || null,
      decision: classification?.best?.decision || 'FAILED',
      min_confidence_threshold: classification?.threshold ?? null,
      model_results: classification?.models || []
    },
    status: 'PENDING',
    created_by: mongoose.Types.ObjectId.isValid(created_by) ? created_by : undefined,
    assigned_to: mongoose.Types.ObjectId.isValid(assign_officer_id)
      ? assign_officer_id
      : fallbackOfficer?._id,
    assigned_officer: mongoose.Types.ObjectId.isValid(assign_officer_id)
      ? assign_officer_id
      : fallbackOfficer?._id,
    verification_status: 'PENDING',
    reopen_flag: 0,
    gps_match_flag: gpsMatchFlag,
    photo_uploaded: 1,
    ivr_response: 0
  });

  res.status(201).json({
    message: 'Complaint created successfully',
    department_assignment: {
      final_department: department,
      source: aiDepartment ? 'AI' : (fallbackDepartment ? 'FALLBACK' : 'DEFAULT'),
      ai: classification
    },
    gps_validation: {
      user_image_distance_meters: Number.isFinite(userImageDistanceMeters) ? Math.round(userImageDistanceMeters) : null,
      gps_match_flag: gpsMatchFlag
    },
    complaint: serializeComplaint(complaint.toObject())
  });
});

const getNearbyComplaints = asyncHandler(async (req, res) => {
  const lat = parseNumber(req.query.lat);
  const lng = parseNumber(req.query.lng);
  const radius = parseNumber(req.query.radius, 2000);
  const grievanceType = req.query.grievance_type;

  if (lat === null || lng === null) {
    res.status(400);
    throw new Error('lat and lng query parameters are required');
  }

  const location = {
    type: 'Point',
    coordinates: [lng, lat]
  };

  const query = {
    location: {
      $near: {
        $geometry: location,
        $maxDistance: radius
      }
    }
  };

  if (grievanceType) {
    query.grievance_type = grievanceType;
  }

  const complaints = await Complaint.find(query)
    .sort({ votes: -1, created_at: -1 })
    .lean();

  res.json({
    count: complaints.length,
    radius,
    complaints: complaints.map(serializeComplaint)
  });
});

const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('assigned_officer', 'name role department')
    .populate('assigned_to', 'name role department')
    .lean();

  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  res.json({ complaint: serializeComplaint(complaint) });
});

const voteOnComplaint = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error('Valid userId is required');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  if (complaint.voters.some((voterId) => voterId.toString() === userId)) {
    return res.status(200).json({
      message: 'User already voted on this complaint',
      votes: complaint.votes
    });
  }

  complaint.votes += 1;
  complaint.voters.push(userId);
  await complaint.save();

  res.json({
    message: 'Vote recorded',
    votes: complaint.votes,
    isHotIssue: complaint.votes >= 10
  });
});

const resolveComplaint = asyncHandler(async (req, res) => {
  const { officerId, ivr_response, gps_match_flag, photo_uploaded } = req.body;

  if (!mongoose.Types.ObjectId.isValid(officerId)) {
    res.status(400);
    throw new Error('Valid officerId is required');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  if (req.file) {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'complaints/resolutions'
    });
    complaint.image_url = uploadResult.secure_url;
    complaint.image_public_id = uploadResult.public_id;
  }

  complaint.assigned_officer = officerId;
  complaint.ivr_response = parseNumber(ivr_response, complaint.ivr_response);
  complaint.gps_match_flag = parseNumber(gps_match_flag, complaint.gps_match_flag);
  complaint.photo_uploaded = parseNumber(photo_uploaded, req.file ? 1 : complaint.photo_uploaded);
  complaint.status = complaint.ivr_response === 2 || complaint.gps_match_flag === 0 || complaint.photo_uploaded === 0 ? 'REOPENED' : 'VERIFIED';
  complaint.verification_status = complaint.status === 'VERIFIED' ? 'VERIFIED' : 'REOPENED';
  complaint.reopen_flag = complaint.status === 'REOPENED' ? 1 : 0;
  complaint.resolved_at = new Date();
  complaint.verified_at = complaint.status === 'VERIFIED' ? new Date() : undefined;

  await complaint.save();

  res.json({
    message: 'Complaint resolution updated',
    complaint: serializeComplaint(complaint.toObject())
  });
});

const getOfficerComplaints = asyncHandler(async (req, res) => {
  if (!req.user.department) {
    res.status(400);
    throw new Error('Officer department is required on user profile');
  }

  const query = {
    department: req.user.department,
    status: { $in: OFFICER_TRACKED_STATUSES }
  };

  if (req.query.status) {
    query.status = req.query.status;
  }

  const complaints = await Complaint.find(query)
    .sort({ created_at: -1 })
    .lean();

  res.json({
    officer: {
      id: req.user._id,
      department: req.user.department,
      role: req.user.role
    },
    count: complaints.length,
    complaints: complaints.map(serializeComplaint)
  });
});

const startComplaintWork = asyncHandler(async (req, res) => {
  if (!req.user.department) {
    res.status(400);
    throw new Error('Officer department is required on user profile');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  if (complaint.department !== req.user.department) {
    res.status(403);
    throw new Error('You can only start complaints in your department');
  }

  if (complaint.status !== 'PENDING') {
    res.status(400);
    throw new Error('Only PENDING complaints can be started');
  }

  complaint.status = 'IN_PROGRESS';
  complaint.assigned_to = req.user._id;
  complaint.assigned_officer = req.user._id;
  await complaint.save();

  res.json({
    message: 'Complaint moved to IN_PROGRESS',
    complaint: serializeComplaint(complaint.toObject())
  });
});

const resolveOfficerComplaint = asyncHandler(async (req, res) => {
  if (!req.user.department) {
    res.status(400);
    throw new Error('Officer department is required on user profile');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  if (complaint.department !== req.user.department) {
    res.status(403);
    throw new Error('You can only resolve complaints in your department');
  }

  const assigneeId = getComplaintAssignee(complaint);
  if (assigneeId && assigneeId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Complaint is assigned to another officer');
  }

  const officerLat = parseNumber(req.body.officer_lat ?? req.body.lat);
  const officerLng = parseNumber(req.body.officer_lng ?? req.body.lng);

  if (officerLat === null || officerLng === null) {
    res.status(400);
    throw new Error('officer_lat and officer_lng are required for GPS validation');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Resolution proof image is required');
  }

  const exifGps = extractImageGps(req.file.buffer);
  if (!exifGps.found) {
    res.status(400);
    throw new Error('Resolution image must include GPS EXIF metadata');
  }

  const complaintPoint = complaint.location;
  const officerPoint = buildPointFromLatLng(officerLat, officerLng);
  const resolvedImageLocation = buildPointFromLatLng(exifGps.latitude, exifGps.longitude);

  const officerToComplaintMeters = calculateDistanceMeters(officerPoint, complaintPoint);
  const imageToComplaintMeters = calculateDistanceMeters(resolvedImageLocation, complaintPoint);

  if (officerToComplaintMeters > GPS_MATCH_THRESHOLD_METERS || imageToComplaintMeters > GPS_MATCH_THRESHOLD_METERS) {
    res.status(400);
    throw new Error('GPS validation failed: officer and image must be within 100 meters of complaint location');
  }

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
    folder: 'complaints/resolutions'
  });

  const gpsMatchFlag = 1;

  complaint.status = 'RESOLVED';
  complaint.assigned_to = req.user._id;
  complaint.assigned_officer = req.user._id;
  complaint.resolved_image = uploadResult.secure_url;
  complaint.resolved_image_public_id = uploadResult.public_id;
  complaint.resolved_user_location = officerPoint;
  complaint.resolved_image_location = resolvedImageLocation;
  complaint.photo_uploaded = 1;
  complaint.gps_match_flag = gpsMatchFlag;
  complaint.verification_status = 'PENDING';
  complaint.reopen_flag = 0;
  complaint.resolved_at = new Date();
  await complaint.save();

  await User.findByIdAndUpdate(req.user._id, {
    location: {
      type: 'Point',
      coordinates: [officerLng, officerLat]
    }
  });

  res.json({
    message: 'Complaint resolved by officer',
    gps_match_flag: gpsMatchFlag,
    distance_meters: {
      officer_to_complaint: Math.round(officerToComplaintMeters),
      image_to_complaint: Math.round(imageToComplaintMeters)
    },
    complaint: serializeComplaint(complaint.toObject())
  });
});

const analytics = asyncHandler(async (req, res) => {
  const [totals, byStatus, topVoted] = await Promise.all([
    Complaint.aggregate([
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          totalVotes: { $sum: '$votes' },
          verifiedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'VERIFIED'] }, 1, 0]
            }
          },
          reopenedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'REOPENED'] }, 1, 0]
            }
          }
        }
      }
    ]),
    Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Complaint.find().sort({ votes: -1, created_at: -1 }).limit(10).lean()
  ]);

  res.json({
    totals: totals[0] || {
      totalComplaints: 0,
      totalVotes: 0,
      verifiedCount: 0,
      reopenedCount: 0
    },
    byStatus,
    topVotedComplaints: topVoted.map(serializeComplaint)
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, role, department, lat, lng, points } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('name is required');
  }

  const user = await User.create({
    name,
    role,
    department: normalizeDepartment(department),
    location: {
      type: 'Point',
      coordinates: [parseNumber(lng, 0), parseNumber(lat, 0)]
    },
    points: parseNumber(points, 0)
  });

  res.status(201).json({ user });
});

module.exports = {
  createComplaint,
  getNearbyComplaints,
  getComplaintById,
  voteOnComplaint,
  resolveComplaint,
  getOfficerComplaints,
  startComplaintWork,
  resolveOfficerComplaint,
  analytics,
  registerUser
};
