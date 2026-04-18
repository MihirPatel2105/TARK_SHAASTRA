process.env.DISABLE_TWILIO_SIGNATURE = 'true';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const Complaint = require('../src/models/Complaint');

jest.mock('../src/models/Complaint', () => ({
  findById: jest.fn()
}));

jest.mock('../src/services/twilioClient', () => ({
  getTwilioClient: () => ({
    calls: {
      create: jest.fn().mockResolvedValue({ sid: 'CA1234567890' })
    }
  })
}));

describe('IVR endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns TwiML prompt for voice route', async () => {
    const response = await request(app)
      .post('/api/ivr/voice?complaintId=abc123')
      .type('form')
      .send({});

    expect(response.status).toBe(200);
    expect(response.text).toContain('Press 1 if your complaint is resolved');
    expect(response.text).toContain('/api/ivr/handle-key?complaintId=abc123');
  });

  test('marks complaint verified when digit 1 is pressed', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    Complaint.findById.mockResolvedValue({
      _id: 'complaint-1',
      citizen_phone: '+919999999999',
      call_logs: [],
      save
    });

    const response = await request(app)
      .post('/api/ivr/handle-key?complaintId=complaint-1')
      .type('form')
      .send({ Digits: '1', CallSid: 'CA111' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Complaint marked as verified');
    expect(save).toHaveBeenCalled();
  });

  test('marks complaint reopened when digit 2 is pressed', async () => {
    const complaint = {
      _id: 'complaint-2',
      citizen_phone: '+919999999999',
      call_logs: [],
      save: jest.fn().mockResolvedValue(undefined)
    };
    Complaint.findById.mockResolvedValue(complaint);

    const response = await request(app)
      .post('/api/ivr/handle-key?complaintId=complaint-2')
      .type('form')
      .send({ Digits: '2', CallSid: 'CA222' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('reopened');
    expect(complaint.reopen_flag).toBe(1);
  });
});
