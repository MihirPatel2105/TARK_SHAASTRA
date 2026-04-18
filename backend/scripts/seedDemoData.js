require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

const BASE_LAT = Number(process.env.DEMO_SEED_LAT || 22.999825);
const BASE_LNG = Number(process.env.DEMO_SEED_LNG || 72.62189);

const DEMO_USERS = [
  {
    name: 'Citizen Demo Account',
    email: 'citizen.demo@vgs.gov.in',
    password: 'Citizen@123',
    role: 'citizen',
    department: null,
    points: 14,
    offset: [0.0012, 0.0009]
  },
  {
    name: 'Officer Demo Account',
    email: 'officer.demo@vgs.gov.in',
    password: 'Officer@123',
    role: 'officer',
    department: 'Roads',
    points: 88,
    offset: [0.0006, -0.0008]
  },
  {
    name: 'Admin Demo Account',
    email: 'admin.demo@vgs.gov.in',
    password: 'Admin@123',
    role: 'admin',
    department: 'Central Administration',
    points: 120,
    offset: [0.0002, 0.0001]
  }
];

const COMPLAINT_BLUEPRINTS = [
  {
    grievance_id: 'DEMO-GJ-1001',
    title: 'Deep pothole near local bus stand',
    description: 'Vehicle movement is unsafe due to a deep pothole and broken road surface.',
    grievance_type: 'pothole',
    department: 'Roads',
    district: 'Anand',
    status: 'PENDING',
    verification_status: 'PENDING',
    votes: 11,
    offset: [0.0015, 0.0011]
  },
  {
    grievance_id: 'DEMO-GJ-1002',
    title: 'Overflowing roadside garbage bin',
    description: 'Garbage is overflowing daily and spreading around the market lane.',
    grievance_type: 'garbage',
    department: 'Sanitation',
    district: 'Anand',
    status: 'IN_PROGRESS',
    verification_status: 'PENDING',
    votes: 7,
    offset: [-0.0014, 0.0012]
  },
  {
    grievance_id: 'DEMO-GJ-1003',
    title: 'Water leakage from main pipeline',
    description: 'Continuous leakage causing water loss and road damage for multiple days.',
    grievance_type: 'leakage',
    department: 'Water',
    district: 'Anand',
    status: 'RESOLVED',
    verification_status: 'PENDING',
    votes: 5,
    offset: [0.0008, -0.0015]
  },
  {
    grievance_id: 'DEMO-GJ-1004',
    title: 'Frequent night power cuts in residential area',
    description: 'Power is interrupted repeatedly at night and requires quick field review.',
    grievance_type: 'power cut',
    department: 'Electricity',
    district: 'Anand',
    status: 'VERIFIED',
    verification_status: 'VERIFIED',
    votes: 13,
    offset: [-0.0012, -0.001]
  },
  {
    grievance_id: 'DEMO-GJ-1005',
    title: 'Streetlight poles not functioning',
    description: 'Multiple streetlights are not working and road visibility is poor.',
    grievance_type: 'power cut',
    department: 'Electricity',
    district: 'Anand',
    status: 'REOPENED',
    verification_status: 'REOPENED',
    votes: 4,
    offset: [0.0019, -0.0005]
  },
  {
    grievance_id: 'DEMO-GJ-1006',
    title: 'Blocked drainage leading to waterlogging',
    description: 'Drainage line is blocked and stagnant water is causing foul smell.',
    grievance_type: 'garbage',
    department: 'Sanitation',
    district: 'Anand',
    status: 'FAILED',
    verification_status: 'FAILED',
    votes: 3,
    offset: [-0.0007, 0.0017]
  },
  {
    grievance_id: 'DEMO-GJ-1007',
    title: 'Road shoulder erosion near school turn',
    description: 'Side shoulder has eroded and creates risk for school commute.',
    grievance_type: 'pothole',
    department: 'Roads',
    district: 'Anand',
    status: 'PENDING',
    verification_status: 'PENDING',
    votes: 6,
    offset: [0.0021, 0.0003]
  },
  {
    grievance_id: 'DEMO-GJ-1008',
    title: 'Irregular water supply in apartment block',
    description: 'Residents are facing very low pressure in morning supply hours.',
    grievance_type: 'leakage',
    department: 'Water',
    district: 'Anand',
    status: 'IN_PROGRESS',
    verification_status: 'PENDING',
    votes: 8,
    offset: [-0.0019, -0.0006]
  }
];

function pointByOffset(latOffset, lngOffset) {
  return {
    type: 'Point',
    coordinates: [BASE_LNG + lngOffset, BASE_LAT + latOffset]
  };
}

async function upsertUsers() {
  const createdOrUpdated = [];

  for (const userBlueprint of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(userBlueprint.password, 10);
    const location = pointByOffset(userBlueprint.offset[0], userBlueprint.offset[1]);

    const payload = {
      name: userBlueprint.name,
      email: userBlueprint.email,
      passwordHash,
      role: userBlueprint.role,
      department: userBlueprint.department,
      points: userBlueprint.points,
      location
    };

    const user = await User.findOneAndUpdate(
      { email: userBlueprint.email },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    createdOrUpdated.push(user);
  }

  return createdOrUpdated;
}

async function upsertComplaints(userMap) {
  let createdOrUpdatedCount = 0;

  for (const [index, item] of COMPLAINT_BLUEPRINTS.entries()) {
    const citizen = userMap.get('citizen.demo@vgs.gov.in');
    const officer = userMap.get('officer.demo@vgs.gov.in');

    const createdAt = new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000);
    const resolvedAt = ['RESOLVED', 'VERIFIED', 'REOPENED', 'FAILED'].includes(item.status)
      ? new Date(createdAt.getTime() + 6 * 60 * 60 * 1000)
      : null;
    const verifiedAt = item.status === 'VERIFIED'
      ? new Date(createdAt.getTime() + 8 * 60 * 60 * 1000)
      : null;

    const location = pointByOffset(item.offset[0], item.offset[1]);

    const payload = {
      grievance_id: item.grievance_id,
      title: item.title,
      description: item.description,
      department: item.department,
      district: item.district,
      grievance_type: item.grievance_type,
      location,
      user_location: location,
      image_location: location,
      status: item.status,
      verification_status: item.verification_status,
      reopen_flag: item.status === 'REOPENED' ? 1 : 0,
      votes: item.votes,
      gps_match_flag: 1,
      photo_uploaded: 1,
      ivr_response: item.status === 'VERIFIED' ? 2 : 1,
      assigned_officer: officer?._id,
      assigned_to: officer?._id,
      created_by: citizen?._id,
      created_at: createdAt,
      resolved_at: resolvedAt,
      verified_at: verifiedAt
    };

    await Complaint.findOneAndUpdate(
      { grievance_id: item.grievance_id },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    createdOrUpdatedCount += 1;
  }

  return createdOrUpdatedCount;
}

async function run() {
  await connectDB();

  const users = await upsertUsers();
  const userMap = new Map(users.map((user) => [String(user.email).toLowerCase(), user]));

  const complaintCount = await upsertComplaints(userMap);

  const nearbyCount = await Complaint.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [BASE_LNG, BASE_LAT]
        },
        $maxDistance: 3000
      }
    }
  })
    .select('_id')
    .lean()
    .then((rows) => rows.length);

  console.log('Demo seed complete');
  console.log(`Seed center: lat=${BASE_LAT}, lng=${BASE_LNG}`);
  console.log(`Users upserted: ${users.length}`);
  console.log(`Complaints upserted: ${complaintCount}`);
  console.log(`Complaints within 3km: ${nearbyCount}`);

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('Demo seed failed:', error);
  try {
    await mongoose.connection.close();
  } catch {
    // Ignore close errors during crash path.
  }
  process.exit(1);
});
