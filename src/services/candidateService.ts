import { blink } from '../blink/client'

export interface Candidate {
  id: string
  userId: string
  name: string
  email?: string
  phone?: string
  linkedinUrl?: string
  currentPosition?: string
  currentCompany?: string
  location?: string
  skills: string[]
  experienceYears?: number
  salaryExpectation?: number
  status: 'sourced' | 'contacted' | 'interviewed' | 'presented' | 'placed'
  notes?: string
  resumeUrl?: string
  createdAt: string
  updatedAt: string
}

export class CandidateService {
  static async searchCandidates(query: string, filters?: any): Promise<Candidate[]> {
    try {
      // Use AI to parse natural language search query
      const { text: parsedQuery } = await blink.ai.generateText({
        prompt: `Parse this recruiting search query into structured filters: "${query}". 
        Return a JSON object with fields like: skills, location, experience_years, current_company, etc.
        Only include fields that are mentioned in the query.`,
        model: 'gpt-4o-mini'
      })

      // Log the search for analytics
      await blink.db.searchQueries.create({
        id: `search_${Date.now()}`,
        userId: (await blink.auth.me()).id,
        query,
        filters: JSON.stringify(filters || {}),
        resultsCount: 0
      })

      // For demo purposes, return mock candidates
      // In production, this would search external databases
      const mockCandidates: Candidate[] = [
        {
          id: 'cand_1',
          userId: (await blink.auth.me()).id,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1-555-0123',
          linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
          currentPosition: 'Senior Software Engineer',
          currentCompany: 'TechCorp',
          location: 'San Francisco, CA',
          skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
          experienceYears: 5,
          salaryExpectation: 150000,
          status: 'sourced',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'cand_2',
          userId: (await blink.auth.me()).id,
          name: 'Michael Chen',
          email: 'michael.chen@email.com',
          phone: '+1-555-0124',
          linkedinUrl: 'https://linkedin.com/in/michaelchen',
          currentPosition: 'Product Manager',
          currentCompany: 'StartupXYZ',
          location: 'New York, NY',
          skills: ['Product Strategy', 'Agile', 'Analytics', 'Leadership'],
          experienceYears: 7,
          salaryExpectation: 180000,
          status: 'sourced',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      return mockCandidates
    } catch (error) {
      console.error('Error searching candidates:', error)
      return []
    }
  }

  static async createCandidate(candidateData: Omit<Candidate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Candidate> {
    const user = await blink.auth.me()
    const candidate: Candidate = {
      id: `cand_${Date.now()}`,
      userId: user.id,
      ...candidateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Store in local storage for demo (in production, use database)
    const candidates = this.getCandidatesFromStorage()
    candidates.push(candidate)
    localStorage.setItem('candidates', JSON.stringify(candidates))

    return candidate
  }

  static async updateCandidate(id: string, updates: Partial<Candidate>): Promise<Candidate | null> {
    const candidates = this.getCandidatesFromStorage()
    const index = candidates.findIndex(c => c.id === id)
    
    if (index === -1) return null

    candidates[index] = {
      ...candidates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem('candidates', JSON.stringify(candidates))
    return candidates[index]
  }

  static async getCandidates(): Promise<Candidate[]> {
    return this.getCandidatesFromStorage()
  }

  static async getCandidate(id: string): Promise<Candidate | null> {
    const candidates = this.getCandidatesFromStorage()
    return candidates.find(c => c.id === id) || null
  }

  private static getCandidatesFromStorage(): Candidate[] {
    try {
      const stored = localStorage.getItem('candidates')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}