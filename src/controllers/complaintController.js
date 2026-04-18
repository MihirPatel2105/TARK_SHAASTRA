const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');

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

async function findNearestOfficer(point) {
  return User.findOne({
    role: 'officer',
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

const createComplaint = asyncHandler(async (req, res) => {
  const {
    grievance_id,
    title,
    description,
    department,
    grievance_type,
    lat,
    lng,
    created_by,
    assign_officer_id,
    force_create
  } = req.body;

  if (!grievance_id || !title || !description || !department || !grievance_type) {
    res.status(400);
    throw new Error('grievance_id, title, description, department, and grievance_type are required');
  }

  const location = buildPointFromBody(req.body);
  if (!location) {
    res.status(400);
    throw new Error('lat and lng are required');
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

  if (req.file) {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'complaints'
    });

    imageUrl = uploadResult.secure_url;
    imagePublicId = uploadResult.public_id;
  }

  const complaint = await Complaint.create({
    grievance_id,
    title,
    description,
    department,
    grievance_type,
    location,
    image_url: imageUrl,
    image_public_id: imagePublicId,
    status: 'PENDING',
    created_by: mongoose.Types.ObjectId.isValid(created_by) ? created_by : undefined,
    assigned_officer: mongoose.Types.ObjectId.isValid(assign_officer_id)
      ? assign_officer_id
      : (await findNearestOfficer(location))?._id,
    gps_match_flag: 1,
    photo_uploaded: req.file ? 1 : 0,
    ivr_response: 0
  });

  res.status(201).json({
    message: 'Complaint created successfully',
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
  const complaint = await Complaint.findById(req.params.id).populate('assigned_officer', 'name role').lean();

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
  complaint.resolved_at = new Date();
  complaint.verified_at = complaint.status === 'VERIFIED' ? new Date() : undefined;

  await complaint.save();

  res.json({
    message: 'Complaint resolution updated',
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
  const { name, role, lat, lng, points } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('name is required');
  }

  const user = await User.create({
    name,
    role,
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
  analytics,
  registerUser
};
