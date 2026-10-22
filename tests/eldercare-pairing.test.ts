import test from 'node:test'
import assert from 'node:assert/strict'
import { chatMessageSchema, familyInviteSchema, familyAcceptSchema } from '../src/lib/validations.ts'

test('eldercare validations: chat accepts patientId parameter', () => {
  const validUserChat = chatMessageSchema.safeParse({
    message: 'How is my cholesterol?',
  })
  assert.equal(validUserChat.success, true)

  const testUuid = 'a0000000-0000-4000-8000-000000000001'
  const validCaregiverChat = chatMessageSchema.safeParse({
    message: "How is Mom's blood pressure trending?",
    patientId: testUuid,
  })
  assert.equal(validCaregiverChat.success, true)
  if (validCaregiverChat.success) {
    assert.equal(validCaregiverChat.data.patientId, testUuid)
  }

  const invalidChat = chatMessageSchema.safeParse({
    message: 'Test',
    patientId: 'not-a-uuid',
  })
  assert.equal(invalidChat.success, false)
})

test('eldercare validations: game-style care code invite allows empty email', () => {
  const instantGameInvite = familyInviteSchema.safeParse({
    email: '',
    relation: 'Senior Parent',
    role: 'caregiver',
  })
  assert.equal(instantGameInvite.success, true)

  const emailInvite = familyInviteSchema.safeParse({
    email: 'parent@example.com',
    relation: 'Mother',
    role: 'patient',
  })
  assert.equal(emailInvite.success, true)
})

test('eldercare validations: accept schema supports 6-character room codes', () => {
  const acceptValid = familyAcceptSchema.safeParse({
    token: 'CARE-7829',
  })
  assert.equal(acceptValid.success, true)

  const acceptEmpty = familyAcceptSchema.safeParse({
    token: '',
  })
  assert.equal(acceptEmpty.success, false)
})

test('eldercare chat partitioning: schema supports patientId nullable and UUID', () => {
  const chatWithNullPatient = chatMessageSchema.safeParse({
    message: 'General inquiry',
    patientId: undefined,
  })
  assert.equal(chatWithNullPatient.success, true)

  const elderId = 'b0000000-0000-4000-8000-000000000002'
  const chatWithElderPatient = chatMessageSchema.safeParse({
    message: 'Can she take vitamins with blood pressure meds?',
    patientId: elderId,
  })
  assert.equal(chatWithElderPatient.success, true)
  if (chatWithElderPatient.success) {
    assert.equal(chatWithElderPatient.data.patientId, elderId)
  }
})
