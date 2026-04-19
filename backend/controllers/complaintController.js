const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');
const { classifyImageByAllModels } = require('../services/roboflowService');
const { triggerResolutionVerificationCall } = require('../services/speechIvrService');
const { haversineDistanceMeters } = require('../utils/geo');
const { extractImageGps } = require('../utils/imageGps');

const GRIEVANCE_DEPARTMENT_MAP = {
  pothole: 'Roads',
  leakage: 'Water',
  'power cut': 'Electricity',
  garbage: 'Sanitation'
};

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

function parseIvrResolutionChoice(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();

  if (['1', 'yes', 'resolved', 'resolve', 'verified'].includes(value)) {
    return 'RESOLVED';
  }

  if (['2', 'no', 'reopen', 'reopened', 'failed'].includes(value)) {
    return 'REOPENED';
  }

  return null;
}

function applyIvrOutcomeToComplaint(complaint, outcome) {
  if (outcome === 'RESOLVED') {
    complaint.status = 'VERIFIED';
    complaint.verification_status = 'VERIFIED';
    complaint.reopen_flag = 0;
    complaint.verified_at = new Date();
    complaint.scoring = {
      ...complaint.scoring,
      citizen_points_delta: 5,
      department_points_delta: 10,
      score_reason: 'Citizen confirmed resolution through IVR',
      fake_complaint_flag: 0
    };
    return;
  }

  complaint.status = 'REOPENED';
  complaint.verification_status = 'REOPENED';
  complaint.reopen_flag = 1;
  complaint.verified_at = undefined;
  complaint.scoring = {
    ...complaint.scoring,
    citizen_points_delta: 0,
    department_points_delta: -5,
    score_reason: 'Citizen requested complaint reopening through IVR',
    fake_complaint_flag: 0
  };
}

async function applyUserPointUpdatesForIvrOutcome(complaint, outcome) {
  const updates = [];

  if (outcome === 'RESOLVED') {
    if (complaint.created_by) {
      updates.push(User.findByIdAndUpdate(complaint.created_by, { $inc: { points: 5 } }));
    }
    const assigneeId = getComplaintAssignee(complaint);
    if (assigneeId) {
      updates.push(User.findByIdAndUpdate(assigneeId, { $inc: { points: 10 } }));
    }
  } else {
    const assigneeId = getComplaintAssignee(complaint);
    if (assigneeId) {
      updates.push(User.findByIdAndUpdate(assigneeId, { $inc: { points: -5 } }));
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

async function applyUserPointUpdatesForFakeComplaint(complaint) {
  const updates = [];

  if (complaint.created_by) {
    updates.push(User.findByIdAndUpdate(complaint.created_by, { $inc: { points: -15 } }));
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
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

  // GPS EXIF is optional; fall back to user-entered location when metadata is unavailable.
  const exifPoint = exifGps.found ? buildPointFromLatLng(exifGps.latitude, exifGps.longitude) : null;
  const imageLocation = exifPoint || userLocation;
  const userImageDistanceMeters = exifPoint ? calculateDistanceMeters(userLocation, imageLocation) : null;
  const gpsMatchFlag = exifPoint
    ? (userImageDistanceMeters <= GPS_MATCH_THRESHOLD_METERS ? 1 : 0)
    : 1;

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
    created_by: mongoose.Types.ObjectId.isValid(created_by)
      ? created_by
      : req.user?._id,
    assigned_to: mongoose.Types.ObjectId.isValid(assign_officer_id)
      ? assign_officer_id
      : fallbackOfficer?._id,
    assigned_officer: mongoose.Types.ObjectId.isValid(assign_officer_id)
      ? assign_officer_id
      : fallbackOfficer?._id,
    verification_status: 'PENDING',
    reopen_flag: 0,
    gps_match_flag: gpsMatchFlag,
    photo_uploaded: 1
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

const getMyComplaints = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error('Authenticated user is required');
  }

  const query = {
    $or: [
      { created_by: req.user._id },
      req.user.email ? { citizen_email: req.user.email } : null,
      req.user.phone ? { citizen_phone: req.user.phone } : null
    ].filter(Boolean)
  };

  const complaints = await Complaint.find(query)
    .sort({ created_at: -1 })
    .lean();

  res.json({
    count: complaints.length,
    complaints: complaints.map(serializeComplaint)
  });
});

const getNeedsLocationComplaints = asyncHandler(async (_req, res) => {
  const complaints = await Complaint.find({
    location_status: { $in: ['NEEDS_LOCATION', 'MISSING'] }
  })
    .sort({ created_at: -1 })
    .lean();

  res.json({
    count: complaints.length,
    complaints: complaints.map(serializeComplaint)
  });
});

const createTextComplaint = asyncHandler(async (req, res) => {
  const {
    grievance_id,
    title,
    description,
    department: departmentInput,
    grievance_type,
    citizen_phone,
    location_text,
    created_by,
    district,
    lat,
    lng
  } = req.body;

  if (!grievance_id || !title || !description || !grievance_type) {
    res.status(400);
    throw new Error('grievance_id, title, description, and grievance_type are required');
  }

  const department = resolveDepartment(departmentInput, grievance_type) || 'General';
  const parsedLat = parseNumber(lat, 0);
  const parsedLng = parseNumber(lng, 0);
  const point = buildPointFromLatLng(parsedLat, parsedLng) || {
    type: 'Point',
    coordinates: [0, 0]
  };

  const complaint = await Complaint.create({
    grievance_id,
    title,
    description,
    department,
    district: typeof district === 'string' && district.trim().length ? district.trim() : null,
    grievance_type,
    source: 'APP_TEXT',
    location: point,
    user_location: point,
    image_location: point,
    location_status: location_text ? 'AVAILABLE' : 'NEEDS_LOCATION',
    location_text: location_text || null,
    citizen_phone: citizen_phone || null,
    created_by: mongoose.Types.ObjectId.isValid(created_by)
      ? created_by
      : req.user?._id,
    verification_status: 'PENDING',
    reopen_flag: 0,
    photo_uploaded: 0,
    gps_match_flag: 0
  });

  res.status(201).json({
    message: 'Text complaint created successfully',
    complaint: serializeComplaint(complaint.toObject())
  });
});

const ingestLocationUpdate = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const lat = parseNumber(req.body.lat);
  const lng = parseNumber(req.body.lng);

  if (lat === null || lng === null) {
    res.status(400);
    throw new Error('lat and lng are required');
  }

  complaint.location = buildPointFromLatLng(lat, lng);
  complaint.user_location = complaint.user_location || complaint.location;
  complaint.location_status = 'AVAILABLE';
  complaint.location_text = req.body.location_text || complaint.location_text;

  await complaint.save();

  res.json({
    message: 'Location updated successfully',
    complaint: serializeComplaint(complaint.toObject())
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
  const { officerId, gps_match_flag, photo_uploaded } = req.body;

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
  complaint.gps_match_flag = parseNumber(gps_match_flag, complaint.gps_match_flag);
  complaint.photo_uploaded = parseNumber(photo_uploaded, req.file ? 1 : complaint.photo_uploaded);
  complaint.status = complaint.gps_match_flag === 0 || complaint.photo_uploaded === 0 ? 'REOPENED' : 'VERIFIED';
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

  const query = {};

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

  const assigneeId = getComplaintAssignee(complaint);
  if (assigneeId && assigneeId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Complaint is assigned to another officer');
  }

  const officerLat = parseNumber(req.body.officer_lat ?? req.body.lat, complaint.location?.coordinates?.[1]);
  const officerLng = parseNumber(req.body.officer_lng ?? req.body.lng, complaint.location?.coordinates?.[0]);

  if (!req.file) {
    res.status(400);
    throw new Error('Resolution proof image is required');
  }

  const exifGps = extractImageGps(req.file.buffer);

  const complaintPoint = complaint.location;
  const officerPoint = buildPointFromLatLng(officerLat, officerLng) || complaintPoint;
  const resolvedImageLocation = exifGps.found
    ? (buildPointFromLatLng(exifGps.latitude, exifGps.longitude) || officerPoint)
    : officerPoint;

  const officerToComplaintMeters = calculateDistanceMeters(officerPoint, complaintPoint);
  const imageToComplaintMeters = calculateDistanceMeters(resolvedImageLocation, complaintPoint);

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
    folder: 'complaints/resolutions'
  });

  const markAsFake = String(req.body.fake_complaint || req.body.mark_as_fake || req.body.is_fake || '').toLowerCase() === 'true' || String(req.body.fake_complaint || req.body.mark_as_fake || req.body.is_fake || '') === '1';

  const gpsMatchFlag = 1;
  const demoIvrPhone = String(process.env.DEMO_IVR_PHONE || '+919662876737').trim();
  let citizenPhone = String(complaint.citizen_phone || '').trim();

  if (!citizenPhone && !markAsFake && complaint.created_by) {
    const citizenUser = await User.findById(complaint.created_by).select('phone').lean();
    citizenPhone = String(citizenUser?.phone || '').trim();
  }

  if (!citizenPhone && !markAsFake && complaint.citizen_email) {
    const citizenUserByEmail = await User.findOne({ email: complaint.citizen_email }).select('phone').lean();
    citizenPhone = String(citizenUserByEmail?.phone || '').trim();
  }

  complaint.status = markAsFake ? 'FAILED' : 'RESOLVED';
  complaint.assigned_to = req.user._id;
  complaint.assigned_officer = req.user._id;
  complaint.resolved_image = uploadResult.secure_url;
  complaint.resolved_image_public_id = uploadResult.public_id;
  complaint.resolved_user_location = officerPoint;
  complaint.resolved_image_location = resolvedImageLocation;
  complaint.photo_uploaded = 1;
  complaint.gps_match_flag = gpsMatchFlag;
  complaint.citizen_phone = markAsFake ? complaint.citizen_phone || null : (complaint.citizen_phone || citizenPhone);
  complaint.verification_status = markAsFake ? 'FAILED' : 'PENDING';
  complaint.reopen_flag = 0;
  complaint.resolved_at = new Date();
  complaint.verified_at = markAsFake ? undefined : complaint.verified_at;

  if (!complaint.scoring) {
    complaint.scoring = {
      citizen_points_delta: 0,
      department_points_delta: 0,
      score_reason: null,
      fake_complaint_flag: 0
    };
  }

  if (markAsFake) {
    complaint.scoring.citizen_points_delta = -15;
    complaint.scoring.department_points_delta = 0;
    complaint.scoring.score_reason = 'OFFICER_MARKED_FAKE_COMPLAINT';
    complaint.scoring.fake_complaint_flag = 1;
  }

  await complaint.save();

  await User.findByIdAndUpdate(req.user._id, {
    location: {
      type: 'Point',
      coordinates: [officerLng, officerLat]
    }
  });

  let ivrTrigger = {
    attempted: false,
    triggered: false,
    callSid: null,
    reason: null,
    error: null
  };

  if (markAsFake) {
    ivrTrigger.reason = 'Complaint marked as fake, IVR call skipped';
    await applyUserPointUpdatesForFakeComplaint(complaint);
  } else if (!citizenPhone) {
    ivrTrigger.reason = 'Demo IVR phone is unavailable, so IVR call was skipped';
  } else {
    ivrTrigger.attempted = true;
    try {
      const ivrResponse = await triggerResolutionVerificationCall({
        complaintId: complaint._id.toString(),
        citizenPhone
      });

      ivrTrigger.triggered = true;
      ivrTrigger.callSid = ivrResponse.callSid || null;
      ivrTrigger.reason = ivrResponse.message || 'IVR call triggered to demo number';

      if (ivrResponse?.fallbackMode) {
        applyIvrOutcomeToComplaint(complaint, 'RESOLVED');
        complaint.scoring = {
          ...complaint.scoring,
          score_reason: 'AUTO_VERIFIED_FALLBACK_CALL'
        };
        await complaint.save();
        await applyUserPointUpdatesForIvrOutcome(complaint, 'RESOLVED');
        ivrTrigger.reason = `${ivrTrigger.reason} Complaint auto-verified in fallback mode.`;
      }
    } catch (error) {
      ivrTrigger.error = error.response?.data?.message || error.message;
      ivrTrigger.reason = 'Failed to trigger IVR call';
    }
  }

  res.json({
    message: markAsFake ? 'Complaint marked as fake by officer' : 'Complaint resolved by officer',
    gps_match_flag: gpsMatchFlag,
    distance_meters: {
      officer_to_complaint: Math.round(officerToComplaintMeters),
      image_to_complaint: Math.round(imageToComplaintMeters)
    },
    ivr_target_phone: citizenPhone || null,
    ivr_trigger: ivrTrigger,
    complaint: serializeComplaint(complaint.toObject())
  });
});

const triggerOfficerVerificationCall = asyncHandler(async (req, res) => {
  if (!req.user.department) {
    res.status(400);
    throw new Error('Officer department is required on user profile');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const assigneeId = getComplaintAssignee(complaint);
  if (assigneeId && assigneeId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Complaint is assigned to another officer');
  }

  if (complaint.verification_status !== 'PENDING') {
    res.status(409);
    throw new Error('IVR can only be triggered for complaints pending verification');
  }

  const demoIvrPhone = String(process.env.DEMO_IVR_PHONE || '+919662876737').trim();
  const citizenPhone = String(complaint.citizen_phone || demoIvrPhone).trim();

  let ivrTrigger = {
    attempted: false,
    triggered: false,
    callSid: null,
    reason: null,
    error: null
  };

  if (!citizenPhone) {
    ivrTrigger.reason = 'Demo IVR phone is unavailable, so IVR call was skipped';
  } else {
    ivrTrigger.attempted = true;
    try {
      const ivrResponse = await triggerResolutionVerificationCall({
        complaintId: complaint._id.toString(),
        citizenPhone
      });

      ivrTrigger.triggered = true;
      ivrTrigger.callSid = ivrResponse.callSid || null;
      ivrTrigger.reason = ivrResponse.message || 'IVR call triggered to demo number';

      if (ivrResponse?.fallbackMode) {
        applyIvrOutcomeToComplaint(complaint, 'RESOLVED');
        complaint.scoring = {
          ...complaint.scoring,
          score_reason: 'AUTO_VERIFIED_FALLBACK_CALL'
        };
        await complaint.save();
        await applyUserPointUpdatesForIvrOutcome(complaint, 'RESOLVED');
        ivrTrigger.reason = `${ivrTrigger.reason} Complaint auto-verified in fallback mode.`;
      }
    } catch (error) {
      ivrTrigger.error = error.response?.data?.message || error.message;
      ivrTrigger.reason = 'Failed to trigger IVR call';
    }
  }

  res.json({
    message: 'Verification IVR re-triggered',
    ivr_target_phone: citizenPhone || null,
    ivr_trigger: ivrTrigger,
    complaint: serializeComplaint(complaint.toObject())
  });
});

const ingestIvrVerificationResponse = asyncHandler(async (req, res) => {
  const configuredSecret = process.env.IVR_CALLBACK_SECRET;
  if (configuredSecret) {
    const receivedSecret = req.headers['x-ivr-secret'];
    if (receivedSecret !== configuredSecret) {
      res.status(401);
      throw new Error('Invalid IVR callback secret');
    }
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const outcome = parseIvrResolutionChoice(req.body.ivrResponse || req.body.response || req.body.Digits || req.query.Digits);
  if (!outcome) {
    res.status(400);
    throw new Error('IVR response must be 1/2 or equivalent resolved/reopened values');
  }

  if (complaint.verification_status !== 'PENDING') {
    res.status(409);
    throw new Error('Complaint verification has already been finalized');
  }

  applyIvrOutcomeToComplaint(complaint, outcome);
  await complaint.save();
  await applyUserPointUpdatesForIvrOutcome(complaint, outcome);

  res.json({
    message: 'IVR response ingested successfully',
    outcome,
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

const predictDepartment = asyncHandler(async (req, res) => {
  const { imageUrl, text } = req.body;

  if (!imageUrl && !text) {
    res.status(400);
    throw new Error('Either imageUrl or text is required for department prediction');
  }

  // Dynamically import groqService
  const { predictDepartmentFromImage, predictDepartmentFromText } = await import('../services/groqService.js');

  let predictedDepartment = null;

  if (imageUrl) {
    predictedDepartment = await predictDepartmentFromImage(imageUrl);
  } else if (text) {
    predictedDepartment = await predictDepartmentFromText(text);
  }

  res.json({
    predictedDepartment,
    message: predictedDepartment ? `Department predicted: ${predictedDepartment}` : 'Unable to predict department'
  });
});

const translateText = asyncHandler(async (req, res) => {
  const { text, targetLanguage = "gu" } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('text is required for translation');
  }

  if (targetLanguage === "en") {
    return res.json({ translatedText: text });
  }

  // For Gujarati, we'll use Groq AI if available, otherwise return original
  if (targetLanguage === "gu") {
    try {
      if (!process.env.GROQ_API_KEY) {
        // Return original text if Groq not configured
        return res.json({ translatedText: text });
      }

      const axios = require('axios');
      const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'user',
              content: `Translate the following English text to Gujarati. Respond with ONLY the translated text, nothing else.\n\nEnglish: "${text}"\n\nGujarati:`
            }
          ],
          max_tokens: 200
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const translatedText = response.data.choices?.[0]?.message?.content?.trim() || text;
      res.json({ translatedText });
    } catch (error) {
      console.error('Translation error:', error.message);
      // Fallback to original text
      res.json({ translatedText: text });
    }
  } else {
    res.status(400);
    throw new Error(`Unsupported language: ${targetLanguage}`);
  }
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

const predictComplaintDetails = asyncHandler(async (req, res) => {
  const { imageUrl, description } = req.body;

  if (!imageUrl) {
    res.status(400);
    throw new Error('imageUrl is required for complaint detail prediction');
  }

  if (!description || description.trim().length === 0) {
    res.status(400);
    throw new Error('Description is required for complaint detail prediction');
  }

  // Dynamically import groqService functions
  const { predictGrievanceType, predictComplaintTitle } = await import('../services/groqService.js');

  try {
    const [predictedTitle, predictedGrievanceType] = await Promise.all([
      predictComplaintTitle(imageUrl, description),
      predictGrievanceType(imageUrl, description)
    ]);

    res.json({
      predictedTitle: predictedTitle || null,
      predictedGrievanceType: predictedGrievanceType || null,
      message: 'Complaint details predicted from image and description'
    });
  } catch (error) {
    console.error('Error predicting complaint details:', error);
    res.status(500);
    throw new Error('Unable to predict complaint details. Please fill in the form manually.');
  }
});

module.exports = {
  createComplaint,
  createTextComplaint,
  getNearbyComplaints,
  getMyComplaints,
  getNeedsLocationComplaints,
  getComplaintById,
  voteOnComplaint,
  ingestLocationUpdate,
  resolveComplaint,
  ingestIvrVerificationResponse,
  getOfficerComplaints,
  startComplaintWork,
  resolveOfficerComplaint,
  triggerOfficerVerificationCall,
  analytics,
  predictDepartment,
  predictComplaintDetails,
  translateText,
  registerUser
};
