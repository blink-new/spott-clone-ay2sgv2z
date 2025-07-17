import { blink } from '../blink/client'

export interface Interview {
  id: string
  userId: string
  candidateId: string
  jobId?: string
  interviewerName: string
  scheduledAt: string
  durationMinutes?: number
  type: 'phone' | 'video' | 'in-person'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  aiSummary?: string
  recordingUrl?: string
  score?: number // 1-10 rating
  createdAt: string
  updatedAt: string
}

export class InterviewService {
  static async createInterview(interviewData: Omit<Interview, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Interview> {
    const user = await blink.auth.me()
    const interview: Interview = {
      id: `interview_${Date.now()}`,
      userId: user.id,
      ...interviewData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const interviews = this.getInterviewsFromStorage()
    interviews.push(interview)
    localStorage.setItem('interviews', JSON.stringify(interviews))

    return interview
  }

  static async generateInterviewSummary(notes: string): Promise<string> {
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Analyze these interview notes and create a concise, professional summary for a recruiting database:

Interview Notes:
"${notes}"

Please provide:
1. Key strengths and skills demonstrated
2. Areas of concern or weakness
3. Cultural fit assessment
4. Overall recommendation (Strong Yes, Yes, Maybe, No, Strong No)
5. Next steps or follow-up actions

Format as a structured summary that a recruiter can quickly scan and understand.`,
        model: 'gpt-4o-mini'
      })

      return text
    } catch (error) {
      console.error('Error generating interview summary:', error)
      return 'Error generating summary. Please review notes manually.'
    }
  }

  static async transcribeInterviewRecording(audioFile: File): Promise<string> {
    try {
      // Convert file to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64Data = dataUrl.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioFile)
      })

      const { text } = await blink.ai.transcribeAudio({
        audio: base64Audio,
        language: 'en'
      })

      return text
    } catch (error) {
      console.error('Error transcribing audio:', error)
      return 'Error transcribing audio. Please add notes manually.'
    }
  }

  static async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview | null> {
    const interviews = this.getInterviewsFromStorage()
    const index = interviews.findIndex(i => i.id === id)
    
    if (index === -1) return null

    interviews[index] = {
      ...interviews[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    // If notes are updated, generate AI summary
    if (updates.notes && updates.notes.trim()) {
      interviews[index].aiSummary = await this.generateInterviewSummary(updates.notes)
    }

    localStorage.setItem('interviews', JSON.stringify(interviews))
    return interviews[index]
  }

  static async getInterviews(): Promise<Interview[]> {
    return this.getInterviewsFromStorage()
  }

  static async getInterview(id: string): Promise<Interview | null> {
    const interviews = this.getInterviewsFromStorage()
    return interviews.find(i => i.id === id) || null
  }

  static async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    const interviews = this.getInterviewsFromStorage()
    return interviews.filter(i => i.candidateId === candidateId)
  }

  static async generateInterviewQuestions(jobTitle: string, candidateBackground: string): Promise<string[]> {
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Generate 10 relevant interview questions for this scenario:

Job Title: ${jobTitle}
Candidate Background: ${candidateBackground}

Please provide a mix of:
- Technical/role-specific questions (40%)
- Behavioral questions (30%)
- Cultural fit questions (20%)
- Situational questions (10%)

Return as a numbered list of questions only.`,
        model: 'gpt-4o-mini'
      })

      // Parse the response into an array
      const questions = text
        .split('\n')
        .filter(line => line.trim() && /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())

      return questions
    } catch (error) {
      console.error('Error generating interview questions:', error)
      return [
        'Tell me about your background and experience.',
        'What interests you about this role?',
        'Describe a challenging project you worked on.',
        'How do you handle working under pressure?',
        'What are your career goals?'
      ]
    }
  }

  private static getInterviewsFromStorage(): Interview[] {
    try {
      const stored = localStorage.getItem('interviews')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}