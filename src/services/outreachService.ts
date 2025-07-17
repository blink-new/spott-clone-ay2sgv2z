import { blink } from '../blink/client'
import { Candidate } from './candidateService'

export interface OutreachCampaign {
  id: string
  userId: string
  name: string
  templateSubject: string
  templateMessage: string
  channel: 'email' | 'linkedin' | 'whatsapp'
  status: 'draft' | 'active' | 'paused' | 'completed'
  totalSent: number
  totalResponses: number
  createdAt: string
  updatedAt: string
}

export interface OutreachMessage {
  id: string
  userId: string
  campaignId: string
  candidateId: string
  subject?: string
  message: string
  channel: 'email' | 'linkedin' | 'whatsapp'
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'failed'
  sentAt?: string
  responseReceivedAt?: string
  createdAt: string
}

export class OutreachService {
  static async createCampaign(campaignData: Omit<OutreachCampaign, 'id' | 'userId' | 'totalSent' | 'totalResponses' | 'createdAt' | 'updatedAt'>): Promise<OutreachCampaign> {
    const user = await blink.auth.me()
    const campaign: OutreachCampaign = {
      id: `campaign_${Date.now()}`,
      userId: user.id,
      totalSent: 0,
      totalResponses: 0,
      ...campaignData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const campaigns = this.getCampaignsFromStorage()
    campaigns.push(campaign)
    localStorage.setItem('outreach_campaigns', JSON.stringify(campaigns))

    return campaign
  }

  static async generatePersonalizedMessage(candidate: Candidate, template: string, jobTitle?: string): Promise<string> {
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Personalize this outreach message template for a recruiting campaign:

Template: "${template}"

Candidate Information:
- Name: ${candidate.name}
- Current Position: ${candidate.currentPosition || 'Unknown'}
- Current Company: ${candidate.currentCompany || 'Unknown'}
- Location: ${candidate.location || 'Unknown'}
- Skills: ${candidate.skills.join(', ')}
- Experience: ${candidate.experienceYears || 'Unknown'} years

${jobTitle ? `Job Title: ${jobTitle}` : ''}

Instructions:
1. Replace placeholders with actual candidate information
2. Make it sound natural and personalized
3. Keep the professional tone
4. Don't make up information not provided
5. Return only the personalized message, no explanations`,
        model: 'gpt-4o-mini'
      })

      return text
    } catch (error) {
      console.error('Error generating personalized message:', error)
      return template // Fallback to original template
    }
  }

  static async sendMessage(campaignId: string, candidateId: string, personalizedMessage: string, subject?: string): Promise<OutreachMessage> {
    const user = await blink.auth.me()
    const campaign = await this.getCampaign(campaignId)
    
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const message: OutreachMessage = {
      id: `msg_${Date.now()}`,
      userId: user.id,
      campaignId,
      candidateId,
      subject,
      message: personalizedMessage,
      channel: campaign.channel,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    // Simulate sending message
    setTimeout(() => {
      message.status = 'sent'
      message.sentAt = new Date().toISOString()
      this.updateMessageStatus(message.id, 'sent')
    }, 1000)

    // Store message
    const messages = this.getMessagesFromStorage()
    messages.push(message)
    localStorage.setItem('outreach_messages', JSON.stringify(messages))

    // Update campaign stats
    await this.updateCampaignStats(campaignId)

    return message
  }

  static async sendBulkMessages(campaignId: string, candidates: Candidate[], jobTitle?: string): Promise<OutreachMessage[]> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const messages: OutreachMessage[] = []

    for (const candidate of candidates) {
      try {
        const personalizedMessage = await this.generatePersonalizedMessage(
          candidate,
          campaign.templateMessage,
          jobTitle
        )

        const message = await this.sendMessage(
          campaignId,
          candidate.id,
          personalizedMessage,
          campaign.templateSubject
        )

        messages.push(message)

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error sending message to ${candidate.name}:`, error)
      }
    }

    return messages
  }

  static async getCampaigns(): Promise<OutreachCampaign[]> {
    return this.getCampaignsFromStorage()
  }

  static async getCampaign(id: string): Promise<OutreachCampaign | null> {
    const campaigns = this.getCampaignsFromStorage()
    return campaigns.find(c => c.id === id) || null
  }

  static async getMessages(campaignId?: string): Promise<OutreachMessage[]> {
    const messages = this.getMessagesFromStorage()
    return campaignId ? messages.filter(m => m.campaignId === campaignId) : messages
  }

  private static async updateCampaignStats(campaignId: string): Promise<void> {
    const campaigns = this.getCampaignsFromStorage()
    const messages = this.getMessagesFromStorage()
    
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId)
    if (campaignIndex === -1) return

    const campaignMessages = messages.filter(m => m.campaignId === campaignId)
    campaigns[campaignIndex].totalSent = campaignMessages.filter(m => m.status === 'sent').length
    campaigns[campaignIndex].totalResponses = campaignMessages.filter(m => m.status === 'replied').length
    campaigns[campaignIndex].updatedAt = new Date().toISOString()

    localStorage.setItem('outreach_campaigns', JSON.stringify(campaigns))
  }

  private static updateMessageStatus(messageId: string, status: OutreachMessage['status']): void {
    const messages = this.getMessagesFromStorage()
    const messageIndex = messages.findIndex(m => m.id === messageId)
    
    if (messageIndex !== -1) {
      messages[messageIndex].status = status
      if (status === 'sent') {
        messages[messageIndex].sentAt = new Date().toISOString()
      }
      localStorage.setItem('outreach_messages', JSON.stringify(messages))
    }
  }

  private static getCampaignsFromStorage(): OutreachCampaign[] {
    try {
      const stored = localStorage.getItem('outreach_campaigns')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private static getMessagesFromStorage(): OutreachMessage[] {
    try {
      const stored = localStorage.getItem('outreach_messages')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}