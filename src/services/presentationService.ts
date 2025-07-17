import { blink } from '../blink/client'
import { Candidate } from './candidateService'

export interface Presentation {
  id: string
  userId: string
  candidateId: string
  jobId?: string
  title: string
  content: PresentationContent
  pdfUrl?: string
  status: 'draft' | 'sent' | 'viewed'
  clientEmail?: string
  sentAt?: string
  viewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PresentationContent {
  candidateName: string
  candidatePhoto?: string
  summary: string
  experience: ExperienceItem[]
  skills: SkillCategory[]
  achievements: string[]
  education: EducationItem[]
  recommendations: string[]
  salaryExpectation?: string
  availability: string
  contactInfo: ContactInfo
}

export interface ExperienceItem {
  title: string
  company: string
  duration: string
  description: string
  achievements: string[]
}

export interface SkillCategory {
  category: string
  skills: string[]
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
}

export interface EducationItem {
  degree: string
  institution: string
  year: string
  gpa?: string
}

export interface ContactInfo {
  email: string
  phone?: string
  linkedin?: string
  location: string
}

export class PresentationService {
  static async generatePresentation(candidate: Candidate, jobTitle?: string, jobDescription?: string): Promise<Presentation> {
    const user = await blink.auth.me()
    
    try {
      // Generate comprehensive presentation content using AI
      const { text } = await blink.ai.generateText({
        prompt: `Create a professional candidate presentation for recruiting purposes:

Candidate Information:
- Name: ${candidate.name}
- Current Position: ${candidate.currentPosition || 'Not specified'}
- Current Company: ${candidate.currentCompany || 'Not specified'}
- Location: ${candidate.location || 'Not specified'}
- Skills: ${candidate.skills.join(', ')}
- Experience: ${candidate.experienceYears || 'Not specified'} years
- Email: ${candidate.email || 'Not provided'}
- Phone: ${candidate.phone || 'Not provided'}
- LinkedIn: ${candidate.linkedinUrl || 'Not provided'}
- Salary Expectation: ${candidate.salaryExpectation ? `$${candidate.salaryExpectation.toLocaleString()}` : 'Not specified'}

${jobTitle ? `Target Role: ${jobTitle}` : ''}
${jobDescription ? `Job Description: ${jobDescription}` : ''}

Generate a JSON object with this structure:
{
  "summary": "2-3 sentence professional summary highlighting key strengths",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "description": "Role description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": [
    {
      "category": "Technical Skills",
      "skills": ["skill1", "skill2"],
      "level": "Advanced"
    }
  ],
  "achievements": ["Notable achievement 1", "Notable achievement 2"],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "Year",
      "gpa": "GPA if notable"
    }
  ],
  "recommendations": ["Why this candidate is a good fit"],
  "availability": "Available immediately / 2 weeks notice / etc"
}

Make it professional, compelling, and tailored to recruiting. If information is missing, create realistic professional content based on the role and experience level.`,
        model: 'gpt-4o-mini'
      })

      // Parse AI response
      let aiContent
      try {
        aiContent = JSON.parse(text)
      } catch {
        // Fallback if JSON parsing fails
        aiContent = this.createFallbackContent(candidate)
      }

      const presentationContent: PresentationContent = {
        candidateName: candidate.name,
        summary: aiContent.summary || `Experienced ${candidate.currentPosition || 'professional'} with ${candidate.experienceYears || 'several'} years of experience.`,
        experience: aiContent.experience || [{
          title: candidate.currentPosition || 'Current Role',
          company: candidate.currentCompany || 'Current Company',
          duration: 'Present',
          description: 'Professional experience in the field',
          achievements: ['Delivered high-quality results', 'Collaborated effectively with teams']
        }],
        skills: aiContent.skills || [{
          category: 'Core Skills',
          skills: candidate.skills,
          level: 'Advanced' as const
        }],
        achievements: aiContent.achievements || ['Proven track record of success', 'Strong problem-solving abilities'],
        education: aiContent.education || [{
          degree: 'Bachelor\'s Degree',
          institution: 'University',
          year: '2020'
        }],
        recommendations: aiContent.recommendations || ['Strong technical skills', 'Excellent communication', 'Team player'],
        salaryExpectation: candidate.salaryExpectation ? `$${candidate.salaryExpectation.toLocaleString()}` : undefined,
        availability: aiContent.availability || 'Available for immediate start',
        contactInfo: {
          email: candidate.email || 'Email not provided',
          phone: candidate.phone,
          linkedin: candidate.linkedinUrl,
          location: candidate.location || 'Location not specified'
        }
      }

      const presentation: Presentation = {
        id: `pres_${Date.now()}`,
        userId: user.id,
        candidateId: candidate.id,
        title: `${candidate.name} - ${jobTitle || 'Candidate Presentation'}`,
        content: presentationContent,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Store presentation
      const presentations = this.getPresentationsFromStorage()
      presentations.push(presentation)
      localStorage.setItem('presentations', JSON.stringify(presentations))

      return presentation
    } catch (error) {
      console.error('Error generating presentation:', error)
      throw new Error('Failed to generate presentation')
    }
  }

  static async sendPresentation(presentationId: string, clientEmail: string): Promise<boolean> {
    try {
      const presentation = await this.getPresentation(presentationId)
      if (!presentation) {
        throw new Error('Presentation not found')
      }

      // Generate HTML email content
      const emailContent = this.generateEmailHTML(presentation)

      // Send email using Blink notifications
      const result = await blink.notifications.email({
        to: clientEmail,
        subject: `Candidate Presentation: ${presentation.content.candidateName}`,
        html: emailContent,
        text: `Please find the candidate presentation for ${presentation.content.candidateName} attached.`
      })

      if (result.success) {
        // Update presentation status
        await this.updatePresentation(presentationId, {
          status: 'sent',
          clientEmail,
          sentAt: new Date().toISOString()
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Error sending presentation:', error)
      return false
    }
  }

  static async updatePresentation(id: string, updates: Partial<Presentation>): Promise<Presentation | null> {
    const presentations = this.getPresentationsFromStorage()
    const index = presentations.findIndex(p => p.id === id)
    
    if (index === -1) return null

    presentations[index] = {
      ...presentations[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem('presentations', JSON.stringify(presentations))
    return presentations[index]
  }

  static async getPresentations(): Promise<Presentation[]> {
    return this.getPresentationsFromStorage()
  }

  static async getPresentation(id: string): Promise<Presentation | null> {
    const presentations = this.getPresentationsFromStorage()
    return presentations.find(p => p.id === id) || null
  }

  static async getPresentationsByCandidate(candidateId: string): Promise<Presentation[]> {
    const presentations = this.getPresentationsFromStorage()
    return presentations.filter(p => p.candidateId === candidateId)
  }

  private static createFallbackContent(candidate: Candidate): any {
    return {
      summary: `Experienced ${candidate.currentPosition || 'professional'} with ${candidate.experienceYears || 'several'} years of experience in ${candidate.skills.slice(0, 3).join(', ')}.`,
      experience: [{
        title: candidate.currentPosition || 'Current Role',
        company: candidate.currentCompany || 'Current Company',
        duration: 'Present',
        description: 'Professional experience in the field',
        achievements: ['Delivered high-quality results', 'Collaborated effectively with teams']
      }],
      skills: [{
        category: 'Core Skills',
        skills: candidate.skills,
        level: 'Advanced'
      }],
      achievements: ['Proven track record of success', 'Strong problem-solving abilities'],
      education: [{
        degree: 'Bachelor\'s Degree',
        institution: 'University',
        year: '2020'
      }],
      recommendations: ['Strong technical skills', 'Excellent communication', 'Team player'],
      availability: 'Available for immediate start'
    }
  }

  private static generateEmailHTML(presentation: Presentation): string {
    const { content } = presentation
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Candidate Presentation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #2563EB; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 5px; }
          .experience-item { background: #f8f9fa; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
          .skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .skill-category { background: #e3f2fd; padding: 10px; border-radius: 5px; }
          .contact-info { background: #f0f0f0; padding: 15px; border-radius: 5px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${content.candidateName}</h1>
          <p>${presentation.title}</p>
        </div>

        <div class="section">
          <h2>Executive Summary</h2>
          <p>${content.summary}</p>
        </div>

        <div class="section">
          <h2>Professional Experience</h2>
          ${content.experience.map(exp => `
            <div class="experience-item">
              <h3>${exp.title} at ${exp.company}</h3>
              <p><strong>Duration:</strong> ${exp.duration}</p>
              <p>${exp.description}</p>
              <ul>
                ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>Skills & Expertise</h2>
          <div class="skills-grid">
            ${content.skills.map(skillCat => `
              <div class="skill-category">
                <h4>${skillCat.category} (${skillCat.level})</h4>
                <ul>
                  ${skillCat.skills.map(skill => `<li>${skill}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <h2>Key Achievements</h2>
          <ul>
            ${content.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Education</h2>
          ${content.education.map(edu => `
            <p><strong>${edu.degree}</strong> - ${edu.institution} (${edu.year})${edu.gpa ? ` - GPA: ${edu.gpa}` : ''}</p>
          `).join('')}
        </div>

        <div class="section">
          <h2>Why This Candidate?</h2>
          <ul>
            ${content.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Availability & Compensation</h2>
          <p><strong>Availability:</strong> ${content.availability}</p>
          ${content.salaryExpectation ? `<p><strong>Salary Expectation:</strong> ${content.salaryExpectation}</p>` : ''}
        </div>

        <div class="section">
          <h2>Contact Information</h2>
          <div class="contact-info">
            <p><strong>Email:</strong> ${content.contactInfo.email}</p>
            ${content.contactInfo.phone ? `<p><strong>Phone:</strong> ${content.contactInfo.phone}</p>` : ''}
            ${content.contactInfo.linkedin ? `<p><strong>LinkedIn:</strong> <a href="${content.contactInfo.linkedin}">${content.contactInfo.linkedin}</a></p>` : ''}
            <p><strong>Location:</strong> ${content.contactInfo.location}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private static getPresentationsFromStorage(): Presentation[] {
    try {
      const stored = localStorage.getItem('presentations')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}