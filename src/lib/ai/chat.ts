import 'server-only'
import { generateText, generateTextWithImages } from './gemini'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/data/audit'
import { ensureCurrentUserProvisioned } from '@/lib/data/users'

/**
 * Non-streaming chat (used for image attachments and fallback).
 */
export async function chatWithAI(
  message: string,
  history: { role: string; content: string }[],
  image?: { data: string; mimeType: string }
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    await ensureCurrentUserProvisioned()

    const context = await buildChatContext(user.id)

    const reply = image
      ? await generateTextWithImages(context.prompt(message, history), [image])
      : await generateText(context.prompt(message, history))

    await saveMessages(user.id, message, reply, !!image)

    return { ok: true, reply }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Chat failed' }
  }
}

/**
 * Build the medical context for a user once, then reuse it for prompt construction.
 */
async function buildChatContext(userId: string) {
  const supabase = await createClient()

  const [reportsResult, labsResult, medsResult, conditionsResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, title, ai_summary')
      .eq('patient_id', userId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('lab_results')
      .select('test_name, value, unit, flag, test_date')
      .eq('patient_id', userId)
      .order('test_date', { ascending: false })
      .limit(50),
    supabase
      .from('medications')
      .select('name, dose, frequency, status')
      .eq('patient_id', userId)
      .eq('status', 'active'),
    supabase
      .from('conditions')
      .select('name, status')
      .eq('patient_id', userId),
  ])

  let context = `You are CareDesk AI, an empathetic and knowledgeable personal health assistant. You have access to the patient's verified medical data below. Answer questions clearly, accurately, and compassionately.

Formatting & Visual Styling Instructions:
Use rich Markdown formatting to make your responses structured, professional, and easily readable for patients and caregivers:
- **Bold Key Terms** (\`**text**\`): Use bold for vital signs, lab test names, medication names, dosages, frequencies, and important warnings (e.g., **Fasting Glucose**, **Metformin 500mg**, **140 mg/dL**).
- *Italic Highlights* (\`*text*\`): Use italics for secondary notes, Latin medical phrases, or mild qualifiers.
- **Headings** (\`### Section Title\`): Organize explanations with clean section headings (e.g., \`### Overview\`, \`### What Your Results Mean\`, \`### Questions for Your Doctor\`).
- **Bullet Points & Lists** (\`- \` or \`1. \`): Format steps, recommendations, symptom checklists, and dietary tips as bulleted or numbered lists rather than dense paragraphs.
- **Metrics & Ranges** (\`\`\`value\`\`\`): Format specific lab reference ranges, measurements, and units using inline code (e.g., \`120/80 mmHg\`, \`70–99 mg/dL\`, \`< 5.7%\`).
- **Important Disclaimers** (\`> note\`): Use blockquotes for safety notes or critical disclaimers.
- Always maintain an encouraging, supportive tone and remind the patient that your guidance is educational and does not replace the diagnosis or treatment of a licensed physician.

User's Medical Data:
`

  const reports = reportsResult.data
  const labs = labsResult.data
  const meds = medsResult.data
  const conditions = conditionsResult.data

  if (reports && reports.length > 0) {
    context += `\nReports:\n${reports.map(r => `- ${r.title}: ${r.ai_summary || 'No summary yet'}`).join('\n')}`
  }
  if (labs && labs.length > 0) {
    context += `\n\nLab Results:\n${labs.map(l => `- ${l.test_name}: ${l.value} ${l.unit || ''} (${l.flag || 'normal'})`).join('\n')}`
  }
  if (meds && meds.length > 0) {
    context += `\n\nActive Medications:\n${meds.map(m => `- ${m.name} ${m.dose || ''} ${m.frequency || ''}`).join('\n')}`
  }
  if (conditions && conditions.length > 0) {
    context += `\n\nConditions:\n${conditions.map(c => `- ${c.name} (${c.status || 'active'})`).join('\n')}`
  }

  return {
    prompt(message: string, history: { role: string; content: string }[]): string {
      const conversationHistory = history.slice(-10).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n\n')
      return conversationHistory
        ? `${context}\n\nConversation:\n${conversationHistory}\n\nUser: ${message}\n\nAssistant:`
        : `${context}\n\nUser: ${message}\n\nAssistant:`
    },
  }
}

async function saveMessages(userId: string, userMessage: string, assistantReply: string, hasImage: boolean) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('chat_messages').insert([
      { user_id: userId, role: 'user', content: hasImage ? `${userMessage} [image attached]` : userMessage },
      { user_id: userId, role: 'assistant', content: assistantReply },
    ]).select('id')

    if (error) {
      logger.error({ userId, err: error.message }, 'Failed to persist chat messages')
      return false
    }

    // HIPAA audit trail: record chat interaction
    const insertedIds = data?.map(d => d.id).join(',') || 'unknown'
    await logAudit({
      actorId: userId,
      action: 'INSERT',
      table: 'chat_messages',
      recordId: insertedIds,
    })

    return true
  } catch (err) {
    logger.error({ userId, err: err instanceof Error ? err.message : String(err) }, 'Exception saving chat messages')
    return false
  }
}

/**
 * Streaming chat: returns a ReadableStream that yields text chunks.
 * The caller saves messages after the stream completes.
 */
export async function chatWithAIStream(
  message: string,
  history: { role: string; content: string }[],
): Promise<ReadableStream<Uint8Array> | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    await ensureCurrentUserProvisioned()

    const userId = user.id
    const context = await buildChatContext(userId)
    const fullPrompt = context.prompt(message, history)

    // Use the Gemini SDK's streaming API directly
    const { getGeminiModel } = await import('./gemini')
    const model = getGeminiModel()
    const result = await model.generateContentStream(fullPrompt)

    const encoder = new TextEncoder()
    let fullReply = ''

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              fullReply += text
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()

          // Save messages after stream completes
          await saveMessages(userId, message, fullReply, false)
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return stream
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Chat failed' }
  }
}
